import { supabase } from '@/integrations/supabase/client';

export interface ProformaFixOptions {
  regenerateNumbers?: boolean;
  fixDuplicates?: boolean;
  validateData?: boolean;
  repairRelationships?: boolean;
}

export interface ProformaFixResult {
  success: boolean;
  message: string;
  fixed: number;
  errors: string[];
  warnings: string[];
}

export interface ProformaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  duplicateNumbers: string[];
  missingCustomers: number[];
  invalidAmounts: number[];
}

/**
 * Validates proforma data integrity
 */
export async function validateProformaData(): Promise<ProformaValidationResult> {
  const result: ProformaValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    duplicateNumbers: [],
    missingCustomers: [],
    invalidAmounts: []
  };

  try {
    // Check for duplicate proforma numbers
    const { data: duplicates, error: duplicatesError } = await supabase
      .from('proforma_invoices')
      .select('proforma_number')
      .not('proforma_number', 'is', null);

    if (duplicatesError) {
      result.errors.push(`Failed to check duplicates: ${duplicatesError.message}`);
      result.isValid = false;
    } else if (duplicates) {
      const numbers = duplicates.map(d => d.proforma_number);
      const uniqueNumbers = new Set(numbers);
      if (numbers.length !== uniqueNumbers.size) {
        const duplicateSet = new Set();
        const seen = new Set();
        numbers.forEach(num => {
          if (seen.has(num)) {
            duplicateSet.add(num);
          }
          seen.add(num);
        });
        result.duplicateNumbers = Array.from(duplicateSet) as string[];
        result.warnings.push(`Found ${result.duplicateNumbers.length} duplicate proforma numbers`);
      }
    }

    // Check for missing customer relationships
    const { data: orphaned, error: orphanedError } = await supabase
      .from('proforma_invoices')
      .select('id, customer_id')
      .is('customer_id', null);

    if (orphanedError) {
      result.errors.push(`Failed to check customer relationships: ${orphanedError.message}`);
      result.isValid = false;
    } else if (orphaned && orphaned.length > 0) {
      result.missingCustomers = orphaned.map(p => p.id);
      result.warnings.push(`Found ${orphaned.length} proformas without customer relationships`);
    }

    // Check for invalid amounts
    const { data: invalidAmounts, error: amountsError } = await supabase
      .from('proforma_invoices')
      .select('id, total_amount')
      .or('total_amount.is.null,total_amount.lt.0');

    if (amountsError) {
      result.errors.push(`Failed to check amounts: ${amountsError.message}`);
      result.isValid = false;
    } else if (invalidAmounts && invalidAmounts.length > 0) {
      result.invalidAmounts = invalidAmounts.map(p => p.id);
      result.warnings.push(`Found ${invalidAmounts.length} proformas with invalid amounts`);
    }

    result.isValid = result.errors.length === 0 && result.warnings.length === 0;
  } catch (error) {
    result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.isValid = false;
  }

  return result;
}

/**
 * Generates the next proforma number in sequence
 */
export async function generateNextProformaNumber(): Promise<string> {
  try {
    const { data: lastProforma, error } = await supabase
      .from('proforma_invoices')
      .select('proforma_number')
      .not('proforma_number', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Failed to get last proforma number: ${error.message}`);
    }

    let nextNumber = 1;
    if (lastProforma && lastProforma.length > 0) {
      const lastNumber = lastProforma[0].proforma_number;
      // Extract number from format like PF-2024-001
      const match = lastNumber.match(/PF-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const year = new Date().getFullYear();
    return `PF-${year}-${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    throw new Error(`Failed to generate proforma number: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fixes duplicate proforma numbers by regenerating them
 */
export async function fixDuplicateNumbers(): Promise<ProformaFixResult> {
  const result: ProformaFixResult = {
    success: false,
    message: '',
    fixed: 0,
    errors: [],
    warnings: []
  };

  try {
    const validation = await validateProformaData();
    
    if (validation.duplicateNumbers.length === 0) {
      result.success = true;
      result.message = 'No duplicate numbers found';
      return result;
    }

    // Get all proformas with duplicate numbers
    const { data: duplicateProformas, error } = await supabase
      .from('proforma_invoices')
      .select('id, proforma_number, created_at')
      .in('proforma_number', validation.duplicateNumbers)
      .order('created_at', { ascending: true });

    if (error) {
      result.errors.push(`Failed to fetch duplicate proformas: ${error.message}`);
      return result;
    }

    if (!duplicateProformas) {
      result.warnings.push('No duplicate proformas found to fix');
      return result;
    }

    // Keep the first occurrence of each duplicate, renumber the rest
    const seen = new Set<string>();
    const toUpdate: Array<{ id: string; newNumber: string }> = [];

    for (const proforma of duplicateProformas) {
      if (seen.has(proforma.proforma_number)) {
        // This is a duplicate, needs new number
        const newNumber = await generateNextProformaNumber();
        toUpdate.push({ id: proforma.id, newNumber });
      } else {
        seen.add(proforma.proforma_number);
      }
    }

    // Update proformas with new numbers
    for (const update of toUpdate) {
      const { error: updateError } = await supabase
        .from('proforma_invoices')
        .update({ proforma_number: update.newNumber })
        .eq('id', update.id);

      if (updateError) {
        result.errors.push(`Failed to update proforma ${update.id}: ${updateError.message}`);
      } else {
        result.fixed++;
      }
    }

    result.success = result.errors.length === 0;
    result.message = `Fixed ${result.fixed} duplicate proforma numbers`;
  } catch (error) {
    result.errors.push(`Fix operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Comprehensive proforma fix utility
 */
export async function improvedProformaFix(options: ProformaFixOptions = {}): Promise<ProformaFixResult> {
  const {
    regenerateNumbers = false,
    fixDuplicates = true,
    validateData = true,
    repairRelationships = false
  } = options;

  const result: ProformaFixResult = {
    success: false,
    message: '',
    fixed: 0,
    errors: [],
    warnings: []
  };

  try {
    // Step 1: Validate data if requested
    if (validateData) {
      const validation = await validateProformaData();
      result.warnings.push(...validation.warnings);
      result.errors.push(...validation.errors);
      
      if (!validation.isValid && validation.errors.length > 0) {
        result.message = 'Validation failed with errors';
        return result;
      }
    }

    // Step 2: Fix duplicates if requested
    if (fixDuplicates) {
      const duplicateResult = await fixDuplicateNumbers();
      result.fixed += duplicateResult.fixed;
      result.errors.push(...duplicateResult.errors);
      result.warnings.push(...duplicateResult.warnings);
    }

    // Step 3: Regenerate all numbers if requested
    if (regenerateNumbers) {
      // This would involve regenerating all proforma numbers
      // Implementation would depend on specific business requirements
      result.warnings.push('Full number regeneration not implemented in this version');
    }

    // Step 4: Repair relationships if requested
    if (repairRelationships) {
      // This would involve fixing orphaned relationships
      // Implementation would depend on specific business requirements
      result.warnings.push('Relationship repair not implemented in this version');
    }

    result.success = result.errors.length === 0;
    if (result.success) {
      result.message = `Proforma fix completed successfully. Fixed ${result.fixed} issues.`;
    } else {
      result.message = `Proforma fix completed with ${result.errors.length} errors.`;
    }
  } catch (error) {
    result.errors.push(`Proforma fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.message = 'Proforma fix operation failed';
  }

  return result;
}

/**
 * Quick fix for common proforma issues
 */
export async function quickProformaFix(): Promise<ProformaFixResult> {
  return improvedProformaFix({
    fixDuplicates: true,
    validateData: true,
    regenerateNumbers: false,
    repairRelationships: false
  });
}

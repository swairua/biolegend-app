import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper function to serialize errors properly
const serializeError = (error: any): string => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.details) return error.details;
  if (error.hint) return error.hint;
  if (error.code) return `Database error (code: ${error.code})`;
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
};

export interface DuplicateItemGroup {
  product_id: string;
  product_name: string;
  count: number;
  total_quantity: number;
  items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    tax_percentage: number;
    tax_inclusive: boolean;
  }>;
}

export interface DeduplicationResult {
  success: boolean;
  message: string;
  duplicates_found: number;
  duplicates_fixed: number;
  affected_proformas: string[];
  errors: string[];
}

/**
 * Find all duplicate items in a proforma
 */
export async function findProformaDuplicates(proformaId: string): Promise<DuplicateItemGroup[]> {
  const { data: items, error } = await supabase
    .from('proforma_items')
    .select(`
      id,
      product_id,
      quantity,
      unit_price,
      tax_percentage,
      tax_inclusive,
      products (name)
    `)
    .eq('proforma_id', proformaId)
    .order('product_id', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    const errorMessage = serializeError(error);
    console.error('Error finding duplicates:', errorMessage);
    return [];
  }

  if (!items || items.length === 0) {
    return [];
  }

  // Group by product_id and find duplicates
  const grouped = new Map<string, DuplicateItemGroup>();

  items.forEach((item: any) => {
    const key = item.product_id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        product_id: key,
        product_name: item.products?.name || 'Unknown',
        count: 0,
        total_quantity: 0,
        items: []
      });
    }

    const group = grouped.get(key)!;
    group.count += 1;
    group.total_quantity += item.quantity;
    group.items.push({
      id: item.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_percentage: item.tax_percentage,
      tax_inclusive: item.tax_inclusive,
      created_at: item.created_at
    });
  });

  // Return only groups with duplicates (count > 1)
  return Array.from(grouped.values()).filter(group => group.count > 1);
}

/**
 * Deduplicate items in a proforma by keeping the first item and merging quantities
 * This function assumes all duplicate items have the same price/tax configuration
 */
export async function deduplicateProformaItems(proformaId: string): Promise<DeduplicationResult> {
  const result: DeduplicationResult = {
    success: false,
    message: '',
    duplicates_found: 0,
    duplicates_fixed: 0,
    affected_proformas: [proformaId],
    errors: []
  };

  try {
    // Find duplicates
    const duplicates = await findProformaDuplicates(proformaId);

    if (duplicates.length === 0) {
      result.success = true;
      result.message = 'No duplicate items found';
      return result;
    }

    result.duplicates_found = duplicates.length;

    // For each duplicate group, keep the first item and delete the rest
    for (const group of duplicates) {
      try {
        const itemsToKeep = group.items[0];
        const itemsToDelete = group.items.slice(1);

        // Update the first item with merged quantity
        const mergedQuantity = group.total_quantity;

        const { error: updateError } = await supabase
          .from('proforma_items')
          .update({ quantity: mergedQuantity })
          .eq('id', itemsToKeep.id);

        if (updateError) {
          const errorMsg = `Failed to update item ${itemsToKeep.id}: ${serializeError(updateError)}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
          continue;
        }

        // Delete duplicate items
        const idsToDelete = itemsToDelete.map(item => item.id);

        const { error: deleteError } = await supabase
          .from('proforma_items')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          const errorMsg = `Failed to delete duplicate items for product ${group.product_id}: ${serializeError(deleteError)}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
          continue;
        }

        result.duplicates_fixed += 1;
        console.log(`✅ Deduplicated ${group.product_name}: merged ${group.count} items into quantity ${mergedQuantity}`);
      } catch (error) {
        const errorMsg = `Error deduplicating product ${group.product_id}: ${serializeError(error)}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    result.success = result.errors.length === 0;
    result.message = result.success
      ? `Successfully deduplicated ${result.duplicates_fixed} product(s)`
      : `Deduplicated with ${result.errors.length} error(s)`;

    return result;
  } catch (error) {
    result.success = false;
    result.message = `Deduplication failed: ${serializeError(error)}`;
    result.errors.push(result.message);
    return result;
  }
}

/**
 * Find all proformas with duplicate items
 */
export async function findAllProformasWithDuplicates(companyId: string): Promise<{
  proforma_id: string;
  proforma_number: string;
  duplicate_count: number;
}[]> {
  // Get all proformas with their items
  const { data: proformas, error: fetchError } = await supabase
    .from('proforma_invoices')
    .select(`
      id,
      proforma_number,
      proforma_items (product_id)
    `)
    .eq('company_id', companyId);

  if (fetchError) {
    console.error('Error fetching proformas:', fetchError);
    return [];
  }

  if (!proformas) {
    return [];
  }

  const proformasWithDuplicates = [];

  try {
    for (const proforma of proformas) {
      const items = (proforma as any).proforma_items || [];

      if (items.length === 0) continue;

      // Count occurrences of each product_id
      const productCounts = new Map<string, number>();
      items.forEach((item: any) => {
        const count = productCounts.get(item.product_id) || 0;
        productCounts.set(item.product_id, count + 1);
      });

      // Check if there are duplicates
      const hasDuplicates = Array.from(productCounts.values()).some(count => count > 1);

      if (hasDuplicates) {
        const duplicateCount = Array.from(productCounts.values()).filter(count => count > 1).length;
        proformasWithDuplicates.push({
          proforma_id: proforma.id,
          proforma_number: proforma.proforma_number,
          duplicate_count: duplicateCount
        });
      }
    }
  } catch (error) {
    console.error('Error processing proformas:', serializeError(error));
  }

  return proformasWithDuplicates;
}

/**
 * Fix all duplicate items in all proformas for a company
 */
export async function fixAllProformaDuplicates(companyId: string): Promise<DeduplicationResult> {
  const result: DeduplicationResult = {
    success: false,
    message: '',
    duplicates_found: 0,
    duplicates_fixed: 0,
    affected_proformas: [],
    errors: []
  };

  try {
    // Find all proformas with duplicates
    const proformasWithDuplicates = await findAllProformasWithDuplicates(companyId);

    if (proformasWithDuplicates.length === 0) {
      result.success = true;
      result.message = 'No duplicate items found in any proformas';
      return result;
    }

    result.duplicates_found = proformasWithDuplicates.length;

    // Fix each proforma
    for (const pf of proformasWithDuplicates) {
      try {
        const deduplicateResult = await deduplicateProformaItems(pf.proforma_id);

        if (deduplicateResult.success) {
          result.duplicates_fixed += deduplicateResult.duplicates_fixed;
          result.affected_proformas.push(pf.proforma_number);
        }

        result.errors.push(...deduplicateResult.errors);
      } catch (error) {
        const errorMsg = `Error fixing proforma ${pf.proforma_number}: ${serializeError(error)}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    result.success = result.errors.length === 0;
    result.message = result.success
      ? `Fixed ${result.duplicates_fixed} duplicate(s) in ${result.affected_proformas.length} proforma(s)`
      : `Fixed with errors: ${result.errors.join('; ')}`;

    return result;
  } catch (error) {
    result.success = false;
    result.message = `Failed to fix duplicates: ${serializeError(error)}`;
    result.errors.push(result.message);
    return result;
  }
}

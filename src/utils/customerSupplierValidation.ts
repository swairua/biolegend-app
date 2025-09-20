import { supabase } from '@/integrations/supabase/client';

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  conflictData?: {
    entityId: string;
    entityName: string;
    customerInvoiceCount: number;
    supplierLPOCount: number;
  };
}

/**
 * Validates if a supplier selection creates a customer/supplier conflict
 */
export const validateSupplierSelection = async (
  supplierId: string,
  companyId: string,
  supplierName?: string,
  isNewlyCreated?: boolean
): Promise<ValidationResult> => {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Check if this entity has any invoices as a customer
    const { data: customerInvoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('customer_id', supplierId)
      .eq('company_id', companyId);

    if (invoiceError) {
      console.error('Error checking customer invoices:', invoiceError);
      errors.push('Unable to validate supplier selection due to database error');
      return { isValid: false, warnings, errors };
    }

    // Check existing LPOs with this supplier
    const { data: existingLPOs, error: lpoError } = await supabase
      .from('lpos')
      .select('id, lpo_number')
      .eq('supplier_id', supplierId)
      .eq('company_id', companyId);

    if (lpoError) {
      console.error('Error checking existing LPOs:', lpoError);
      errors.push('Unable to validate supplier selection due to database error');
      return { isValid: false, warnings, errors };
    }

    const customerInvoiceCount = customerInvoices?.length || 0;
    const supplierLPOCount = existingLPOs?.length || 0;

    // If this entity has invoices as customer, flag as potential conflict
    // Skip warnings for newly created suppliers in the same session
    if (customerInvoiceCount > 0 && !isNewlyCreated) {
      if (customerInvoiceCount >= 25) {
        // Critical conflict - block the operation
        errors.push(
          `🚫 CRITICAL CONFLICT: "${supplierName || 'This entity'}" has ${customerInvoiceCount} invoices as a customer. ` +
          `This high level of customer activity creates significant business relationship conflicts. ` +
          `Please create a separate supplier record or contact your administrator.`
        );
      } else if (customerInvoiceCount >= 5) {
        // Moderate conflict - show warning but allow
        warnings.push(
          `⚠️ MODERATE CONFLICT: "${supplierName || 'This entity'}" has ${customerInvoiceCount} invoice(s) as a customer. ` +
          `Consider creating a separate supplier record to avoid confusion.`
        );
      } else {
        // Minor conflict - just inform
        warnings.push(
          `ℹ️ MINOR CONFLICT: "${supplierName || 'This entity'}" has ${customerInvoiceCount} invoice(s) as a customer. ` +
          `This is generally acceptable but consider separating records for better organization.`
        );
      }

      // Add helpful recommendations based on conflict severity
      if (customerInvoiceCount >= 5) {
        warnings.push(
          `💡 TIP: You can create a supplier record with a name like "${supplierName} (Supplier)" to keep relationships separate.`
        );
      }
    }

    // Only show data model notice if there are actual conflicts or it's not a new supplier
    if ((customerInvoiceCount > 0 && !isNewlyCreated) || supplierLPOCount > 0) {
      warnings.push(
        `ℹ️ DATA MODEL NOTICE: Currently, suppliers are stored in the same table as customers. ` +
        `Consider implementing a separate suppliers table for better data organization.`
      );
    }

    const conflictData = {
      entityId: supplierId,
      entityName: supplierName || 'Unknown',
      customerInvoiceCount,
      supplierLPOCount
    };

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      conflictData
    };

  } catch (error) {
    console.error('Error in validateSupplierSelection:', error);
    errors.push('Unexpected error during validation');
    return { isValid: false, warnings, errors };
  }
};

/**
 * Get summary of customer/supplier conflicts for an entity
 */
export const getEntityConflictSummary = async (
  entityId: string,
  companyId: string
): Promise<{
  asCustomer: { invoiceCount: number; lastInvoiceDate?: string };
  asSupplier: { lpoCount: number; lastLPODate?: string };
  hasConflict: boolean;
}> => {
  try {
    // Get customer data
    const { data: customerInvoices } = await supabase
      .from('invoices')
      .select('invoice_date')
      .eq('customer_id', entityId)
      .eq('company_id', companyId)
      .order('invoice_date', { ascending: false })
      .limit(1);

    // Get supplier data
    const { data: supplierLPOs } = await supabase
      .from('lpos')
      .select('lpo_date')
      .eq('supplier_id', entityId)
      .eq('company_id', companyId)
      .order('lpo_date', { ascending: false })
      .limit(1);

    // Get counts
    const { count: invoiceCount } = await supabase
      .from('invoices')
      .select('id', { count: 'exact' })
      .eq('customer_id', entityId)
      .eq('company_id', companyId);

    const { count: lpoCount } = await supabase
      .from('lpos')
      .select('id', { count: 'exact' })
      .eq('supplier_id', entityId)
      .eq('company_id', companyId);

    return {
      asCustomer: {
        invoiceCount: invoiceCount || 0,
        lastInvoiceDate: customerInvoices?.[0]?.invoice_date
      },
      asSupplier: {
        lpoCount: lpoCount || 0,
        lastLPODate: supplierLPOs?.[0]?.lpo_date
      },
      hasConflict: (invoiceCount || 0) > 0 && (lpoCount || 0) > 0
    };

  } catch (error) {
    console.error('Error getting entity conflict summary:', error);
    return {
      asCustomer: { invoiceCount: 0 },
      asSupplier: { lpoCount: 0 },
      hasConflict: false
    };
  }
};

/**
 * Suggests solutions for customer/supplier conflicts
 */
export const getConflictResolutionSuggestions = (conflictData: ValidationResult['conflictData']) => {
  if (!conflictData) return [];

  const suggestions: string[] = [];

  if (conflictData.customerInvoiceCount > 0) {
    suggestions.push(
      `🔧 Create a separate supplier record for "${conflictData.entityName}" with a suffix like "${conflictData.entityName} (Supplier)"`
    );
    
    suggestions.push(
      `📝 Update existing customer record to have a clear role designation`
    );
    
    suggestions.push(
      `🏗️ Consider implementing a proper supplier management system separate from customer records`
    );

    if (conflictData.customerInvoiceCount >= 5) {
      suggestions.push(
        `⚠️ Given the high number of customer transactions (${conflictData.customerInvoiceCount}), consider reviewing the business relationship with this entity`
      );
    }
  }

  suggestions.push(
    `📊 Run the Customer/Supplier Audit tool regularly to monitor and resolve conflicts`
  );

  return suggestions;
};

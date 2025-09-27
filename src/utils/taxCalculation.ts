/**
 * Tax calculation utilities for proforma invoices, quotations, and invoices
 * 
 * Key concepts:
 * - Tax Exclusive: Tax is added ON TOP of the base amount
 * - Tax Inclusive: Tax is INCLUDED in the total, base amount = total / (1 + tax_rate)
 * - Unit prices are always tax-exclusive unless explicitly marked otherwise
 */

export interface TaxableItem {
  quantity: number;
  unit_price: number;
  tax_percentage: number;
  tax_inclusive?: boolean;
  discount_percentage?: number;
  discount_amount?: number;
}

export interface CalculatedItem extends TaxableItem {
  base_amount: number;
  discount_total: number;
  taxable_amount: number;
  tax_amount: number;
  line_total: number;
}

export interface DocumentTotals {
  subtotal: number;       // Sum of all base amounts (before tax)
  discount_total: number; // Total discounts applied
  taxable_amount: number; // Amount subject to tax (after discounts)
  tax_total: number;      // Total tax amount
  total_amount: number;   // Final total including tax
}

/**
 * Calculate tax for a single item
 */
export function calculateItemTax(item: TaxableItem): CalculatedItem {
  const gross = item.quantity * item.unit_price;
  const rate = Math.max(0, item.tax_percentage || 0) / 100;

  // Determine base amounts and apply discounts correctly
  let baseAmountForSubtotal = gross; // amount to treat as 'base_amount' in returned structure
  let taxableAmount = 0;
  let taxAmount = 0;
  let lineTotal = 0;
  let discountApplied = 0;

  if (rate > 0 && item.tax_inclusive) {
    // gross is tax-inclusive. Get exclusive gross.
    const exclusiveGross = gross / (1 + rate);

    // Compute discount (percentage or fixed) on the exclusive amount
    if (item.discount_percentage && item.discount_percentage > 0) {
      discountApplied = exclusiveGross * (item.discount_percentage / 100);
    } else if (item.discount_amount && item.discount_amount > 0) {
      // ensure discount doesn't exceed exclusiveGross
      discountApplied = Math.min(item.discount_amount, exclusiveGross);
    }

    const exclusiveAfterDiscount = exclusiveGross - discountApplied;
    taxableAmount = parseFloat(exclusiveAfterDiscount.toFixed(2));
    taxAmount = parseFloat((taxableAmount * rate).toFixed(2));
    lineTotal = parseFloat((taxableAmount + taxAmount).toFixed(2));
    baseAmountForSubtotal = parseFloat(exclusiveGross.toFixed(2));
  } else {
    // Tax is applied on top (tax-exclusive prices) or tax rate is 0
    // Compute discount on gross
    if (item.discount_percentage && item.discount_percentage > 0) {
      discountApplied = gross * (item.discount_percentage / 100);
    } else if (item.discount_amount && item.discount_amount > 0) {
      discountApplied = Math.min(item.discount_amount, gross);
    }

    taxableAmount = parseFloat((gross - discountApplied).toFixed(2));
    taxAmount = parseFloat((taxableAmount * rate).toFixed(2));
    lineTotal = parseFloat((taxableAmount + taxAmount).toFixed(2));
    baseAmountForSubtotal = parseFloat(gross.toFixed(2));
  }

  return {
    ...item,
    base_amount: baseAmountForSubtotal,
    discount_total: parseFloat(discountApplied.toFixed(2)),
    taxable_amount: parseFloat(taxableAmount.toFixed(2)),
    tax_amount: parseFloat(taxAmount.toFixed(2)),
    line_total: parseFloat(lineTotal.toFixed(2))
  };
}

/**
 * Calculate totals for a document (proforma, quotation, invoice)
 */
export function calculateDocumentTotals(items: TaxableItem[]): DocumentTotals {
  const calculatedItems = items.map(calculateItemTax);
  
  const subtotal = calculatedItems.reduce((sum, item) => sum + item.base_amount, 0);
  const discountTotal = calculatedItems.reduce((sum, item) => sum + item.discount_total, 0);
  const taxableAmount = calculatedItems.reduce((sum, item) => sum + item.taxable_amount, 0);
  const taxTotal = calculatedItems.reduce((sum, item) => sum + item.tax_amount, 0);
  const totalAmount = calculatedItems.reduce((sum, item) => sum + item.line_total, 0);
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount_total: parseFloat(discountTotal.toFixed(2)),
    taxable_amount: parseFloat(taxableAmount.toFixed(2)),
    tax_total: parseFloat(taxTotal.toFixed(2)),
    total_amount: parseFloat(totalAmount.toFixed(2))
  };
}

/**
 * Validate tax calculation results
 */
export function validateTaxCalculation(totals: DocumentTotals): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Basic validation
  if (totals.subtotal < 0) {
    errors.push('Subtotal cannot be negative');
  }
  
  if (totals.tax_total < 0) {
    errors.push('Tax total cannot be negative');
  }
  
  if (totals.total_amount < 0) {
    errors.push('Total amount cannot be negative');
  }
  
  // Check if totals add up correctly
  const calculatedTotal = totals.taxable_amount + totals.tax_total;
  const tolerance = 0.01; // Allow 1 cent tolerance for rounding
  
  if (Math.abs(calculatedTotal - totals.total_amount) > tolerance) {
    errors.push(`Total amount mismatch: calculated ${calculatedTotal}, got ${totals.total_amount}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to get tax display information
 */
export function getTaxDisplayInfo(item: CalculatedItem): {
  displayPrice: string;
  taxInfo: string;
  breakdown: string;
} {
  const displayPrice = formatCurrency(item.unit_price);
  
  let taxInfo = '';
  if (item.tax_percentage > 0) {
    if (item.tax_inclusive) {
      taxInfo = `(incl. ${item.tax_percentage}% tax)`;
    } else {
      taxInfo = `(+ ${item.tax_percentage}% tax)`;
    }
  } else {
    taxInfo = '(tax-free)';
  }
  
  const breakdown = `${item.quantity} × ${formatCurrency(item.unit_price)} = ${formatCurrency(item.base_amount)}`;
  
  return {
    displayPrice,
    taxInfo,
    breakdown
  };
}

/**
 * Convert tax-inclusive price to tax-exclusive price
 */
export function convertToTaxExclusive(inclusivePrice: number, taxPercentage: number): number {
  if (taxPercentage <= 0) return inclusivePrice;
  
  const taxRate = taxPercentage / 100;
  const exclusivePrice = inclusivePrice / (1 + taxRate);
  return parseFloat(exclusivePrice.toFixed(2));
}

/**
 * Convert tax-exclusive price to tax-inclusive price
 */
export function convertToTaxInclusive(exclusivePrice: number, taxPercentage: number): number {
  if (taxPercentage <= 0) return exclusivePrice;
  
  const taxRate = taxPercentage / 100;
  const inclusivePrice = exclusivePrice * (1 + taxRate);
  return parseFloat(inclusivePrice.toFixed(2));
}

/**
 * Format currency with proper decimals
 */
export function formatCurrency(amount: number, locale: string = 'en-KE', currency: string = 'KES'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `KSh ${amount.toFixed(2)}`;
  }
}

/**
 * Parse currency string to number
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbols and parse
  const cleaned = currencyString.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

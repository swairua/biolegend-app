import { supabase } from '@/integrations/supabase/client';

interface RecalculationResult {
  success: boolean;
  message: string;
  proformas_updated: number;
  errors: string[];
}

/**
 * Recalculate totals for all proformas in a company based on their items
 */
export async function recalculateAllProformaTotals(companyId: string): Promise<RecalculationResult> {
  const result: RecalculationResult = {
    success: false,
    message: '',
    proformas_updated: 0,
    errors: []
  };

  try {
    console.log('🧮 Starting proforma totals recalculation for company:', companyId);

    // Get all proformas for this company
    const { data: proformas, error: fetchError } = await supabase
      .from('proforma_invoices')
      .select(`
        id,
        proforma_number,
        proforma_items (
          quantity,
          unit_price,
          discount_percentage,
          discount_amount,
          tax_percentage,
          tax_amount,
          tax_inclusive,
          line_total
        )
      `)
      .eq('company_id', companyId);

    if (fetchError) {
      result.message = `Failed to fetch proformas: ${fetchError.message}`;
      result.errors.push(result.message);
      console.error('❌', result.message);
      return result;
    }

    if (!proformas || proformas.length === 0) {
      result.success = true;
      result.message = 'No proformas found to recalculate';
      console.log('ℹ️', result.message);
      return result;
    }

    console.log(`📊 Found ${proformas.length} proformas to recalculate`);

    // Recalculate totals for each proforma
    for (const proforma of proformas) {
      try {
        const items = (proforma as any).proforma_items || [];

        if (items.length === 0) {
          console.log(`⏭️ Skipping ${proforma.proforma_number} - no items`);
          continue;
        }

        // Calculate totals from items
        let subtotal = 0;
        let totalTaxAmount = 0;

        for (const item of items) {
          const qty = Number(item.quantity) || 0;
          const unitPrice = Number(item.unit_price) || 0;
          const discount = Number(item.discount_percentage) || 0;
          const taxPct = Number(item.tax_percentage) || 0;
          const taxInclusive = Boolean(item.tax_inclusive);

          // Calculate line subtotal before tax
          let lineSubtotal = qty * unitPrice;

          // Apply discount
          const discountAmount = (lineSubtotal * discount) / 100;
          lineSubtotal -= discountAmount;

          // Calculate tax
          const lineTax = taxInclusive 
            ? (lineSubtotal * taxPct) / (100 + taxPct)
            : (lineSubtotal * taxPct) / 100;

          subtotal += lineSubtotal;
          totalTaxAmount += lineTax;
        }

        const totalAmount = subtotal + totalTaxAmount;

        console.log(`📝 ${proforma.proforma_number}: Subtotal=${subtotal.toFixed(2)}, Tax=${totalTaxAmount.toFixed(2)}, Total=${totalAmount.toFixed(2)}`);

        // Update the proforma with calculated totals
        const { error: updateError } = await supabase
          .from('proforma_invoices')
          .update({
            subtotal: Math.round(subtotal * 100) / 100,
            tax_amount: Math.round(totalTaxAmount * 100) / 100,
            total_amount: Math.round(totalAmount * 100) / 100
          })
          .eq('id', proforma.id);

        if (updateError) {
          const errorMsg = `Failed to update ${proforma.proforma_number}: ${updateError.message}`;
          result.errors.push(errorMsg);
          console.error('❌', errorMsg);
          continue;
        }

        result.proformas_updated += 1;
        console.log(`✅ Updated ${proforma.proforma_number}`);
      } catch (error) {
        const errorMsg = `Error processing ${proforma.proforma_number}: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    result.success = result.errors.length === 0;
    result.message = result.success
      ? `Successfully recalculated totals for ${result.proformas_updated} proforma(s)`
      : `Recalculated ${result.proformas_updated} proforma(s) with ${result.errors.length} error(s)`;

    console.log('✅ Recalculation complete:', result);
    return result;
  } catch (error) {
    result.success = false;
    result.message = `Recalculation failed: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(result.message);
    console.error('❌', result.message);
    return result;
  }
}

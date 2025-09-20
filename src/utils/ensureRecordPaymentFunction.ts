import { executeSQL } from '@/utils/execSQL';

/**
 * Ensures the record_payment_with_allocation function exists with correct enum casts.
 */
export async function ensureRecordPaymentFunction(): Promise<{ ok: boolean; manual?: boolean; message?: string }> {
  const functionSQL = `
CREATE OR REPLACE FUNCTION record_payment_with_allocation(
    p_company_id UUID,
    p_customer_id UUID,
    p_invoice_id UUID,
    p_payment_number VARCHAR(50),
    p_payment_date DATE,
    p_amount DECIMAL(15,2),
    p_payment_method payment_method,
    p_reference_number VARCHAR(100),
    p_notes TEXT
) RETURNS JSON AS $$
DECLARE
    v_payment_id UUID;
    v_invoice_record RECORD;
BEGIN
    -- Validate invoice
    SELECT id, total_amount, paid_amount, balance_due
      INTO v_invoice_record
      FROM invoices
     WHERE id = p_invoice_id AND company_id = p_company_id;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Invoice not found or does not belong to this company');
    END IF;

    IF p_amount = 0 THEN
      RETURN json_build_object('success', false, 'error', 'Payment amount cannot be zero');
    END IF;

    -- Insert payment
    INSERT INTO payments (
      company_id, customer_id, payment_number, payment_date, amount, payment_method, reference_number, notes
    ) VALUES (
      p_company_id, p_customer_id, p_payment_number, p_payment_date, p_amount, p_payment_method, p_reference_number, p_notes
    ) RETURNING id INTO v_payment_id;

    -- Create allocation
    INSERT INTO payment_allocations (payment_id, invoice_id, amount_allocated)
    VALUES (v_payment_id, p_invoice_id, p_amount);

    -- Update invoice amounts
    UPDATE invoices
       SET paid_amount = COALESCE(paid_amount, 0) + p_amount,
           balance_due = total_amount - (COALESCE(paid_amount, 0) + p_amount),
           updated_at = NOW()
     WHERE id = p_invoice_id;

    -- Update invoice status using proper enum casts
    UPDATE invoices
       SET status = CASE
           WHEN balance_due <= 0 THEN 'paid'::document_status
           WHEN paid_amount > 0 THEN 'partial'::document_status
           ELSE status
         END
     WHERE id = p_invoice_id;

    -- Read back
    SELECT id, invoice_number, total_amount, paid_amount, balance_due,
           CASE 
             WHEN balance_due <= 0 THEN 'paid'::document_status
             WHEN paid_amount > 0 THEN 'partial'::document_status
             ELSE status
           END AS new_status
      INTO v_invoice_record
      FROM invoices
     WHERE id = p_invoice_id;

    RETURN json_build_object(
      'success', true,
      'payment_id', v_payment_id,
      'invoice_id', p_invoice_id,
      'amount_allocated', p_amount,
      'new_paid_amount', v_invoice_record.paid_amount,
      'new_balance_due', v_invoice_record.balance_due,
      'invoice_status', v_invoice_record.new_status
    );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;`;

  const result = await executeSQL(functionSQL);
  if ((result as any)?.error) {
    return { ok: false, manual: !!(result as any).manual_execution_required, message: (result as any).message || 'Manual SQL execution required' };
  }
  return { ok: true };
}

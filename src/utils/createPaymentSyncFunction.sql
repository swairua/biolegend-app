-- Manual database function creation for payment-invoice synchronization
-- Run this SQL in your database admin panel (Supabase SQL Editor, pgAdmin, etc.)

CREATE OR REPLACE FUNCTION record_payment_with_allocation(
    p_company_id UUID,
    p_customer_id UUID,
    p_invoice_id UUID,
    p_payment_number VARCHAR(50),
    p_payment_date DATE,
    p_amount DECIMAL(15,2),
    p_payment_method payment_method_enum,
    p_reference_number VARCHAR(100),
    p_notes TEXT
) RETURNS JSON AS $$
DECLARE
    v_payment_id UUID;
    v_invoice_record RECORD;
BEGIN
    -- 1. Validate invoice exists and get current balance
    SELECT id, total_amount, paid_amount, balance_due 
    INTO v_invoice_record
    FROM invoices 
    WHERE id = p_invoice_id AND company_id = p_company_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Invoice not found or does not belong to this company'
        );
    END IF;
    
    -- 2. Validate payment amount (allow negative for refunds/adjustments)
    IF p_amount = 0 THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Payment amount cannot be zero'
        );
    END IF;
    
    -- 3. Insert payment record
    INSERT INTO payments (
        company_id,
        customer_id,
        payment_number,
        payment_date,
        amount,
        payment_method,
        reference_number,
        notes
    ) VALUES (
        p_company_id,
        p_customer_id,
        p_payment_number,
        p_payment_date,
        p_amount,
        p_payment_method,
        p_reference_number,
        p_notes
    ) RETURNING id INTO v_payment_id;
    
    -- 4. Create payment allocation
    INSERT INTO payment_allocations (
        payment_id,
        invoice_id,
        amount_allocated
    ) VALUES (
        v_payment_id,
        p_invoice_id,
        p_amount
    );
    
    -- 5. Update invoice balance
    UPDATE invoices SET
        paid_amount = COALESCE(paid_amount, 0) + p_amount,
        balance_due = total_amount - (COALESCE(paid_amount, 0) + p_amount),
        updated_at = NOW()
    WHERE id = p_invoice_id;
    
    -- 6. Update invoice status based on balance
    UPDATE invoices SET
        status = CASE 
            WHEN balance_due <= 0 THEN 'paid'
            WHEN paid_amount > 0 THEN 'partial'
            ELSE status
        END
    WHERE id = p_invoice_id;
    
    -- 7. Get updated invoice data
    SELECT id, total_amount, paid_amount, balance_due, status
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
        'invoice_status', v_invoice_record.status
    );
    
EXCEPTION 
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- Test the function (should return success: false with "Invoice not found")
SELECT record_payment_with_allocation(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID,
    'TEST-FUNCTION',
    '2024-01-01'::DATE,
    100.00,
    'cash'::payment_method_enum,
    'TEST-REF',
    'Test function creation'
);

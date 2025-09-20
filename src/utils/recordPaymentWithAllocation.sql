-- Database function to record payment and update invoice balance atomically
-- This ensures data consistency and prevents race conditions

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
    v_result JSON;
BEGIN
    -- Start transaction (implicit in function)
    
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
    
    -- 6. Return success with updated values
    SELECT 
        id, invoice_number, total_amount, paid_amount, balance_due,
        CASE 
            WHEN balance_due <= 0 THEN 'paid'
            WHEN paid_amount > 0 THEN 'partial'
            ELSE status
        END as new_status
    INTO v_invoice_record
    FROM invoices 
    WHERE id = p_invoice_id;
    
    -- Update status if fully paid
    IF v_invoice_record.balance_due <= 0 THEN
        UPDATE invoices SET status = 'paid' WHERE id = p_invoice_id;
    ELSIF v_invoice_record.paid_amount > 0 AND v_invoice_record.balance_due > 0 THEN
        UPDATE invoices SET status = 'partial' WHERE id = p_invoice_id;
    END IF;
    
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
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

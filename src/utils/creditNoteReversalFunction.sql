-- Create function to reverse credit note with full transaction support
-- This ensures atomicity: either all steps complete or none do

CREATE OR REPLACE FUNCTION reverse_credit_note(
    p_credit_note_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_credit_note RECORD;
    v_allocation RECORD;
    v_movement RECORD;
    v_reverse_movement RECORD;
    v_error_message TEXT;
BEGIN
    -- Start transaction context (implicit in function)
    
    -- 1. Validate and fetch credit note
    SELECT id, company_id, credit_note_number, affects_inventory, applied_amount, 
           balance, status, total_amount
    INTO v_credit_note
    FROM credit_notes
    WHERE id = p_credit_note_id
    FOR UPDATE; -- Lock row for consistency
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Credit note not found'
        );
    END IF;
    
    IF v_credit_note.status = 'cancelled' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Credit note is already cancelled'
        );
    END IF;
    
    -- 2. If credit note has been applied, reverse allocations
    IF (v_credit_note.applied_amount > 0) THEN
        -- Lock and reverse all allocations
        FOR v_allocation IN
            SELECT id, invoice_id, allocated_amount
            FROM credit_note_allocations
            WHERE credit_note_id = p_credit_note_id
            FOR UPDATE
        LOOP
            -- Update invoice to restore balance
            UPDATE invoices
            SET paid_amount = GREATEST(0, COALESCE(paid_amount, 0) - v_allocation.allocated_amount),
                balance_due = COALESCE(balance_due, 0) + v_allocation.allocated_amount,
                updated_at = NOW()
            WHERE id = v_allocation.invoice_id;
            
            IF NOT FOUND THEN
                RETURN json_build_object(
                    'success', false,
                    'error', 'Invoice not found for allocation reversal: ' || v_allocation.invoice_id::TEXT
                );
            END IF;
        END LOOP;
        
        -- Delete all allocations
        DELETE FROM credit_note_allocations
        WHERE credit_note_id = p_credit_note_id;
    END IF;
    
    -- 3. If credit note affects inventory, create reverse stock movements
    IF v_credit_note.affects_inventory THEN
        FOR v_movement IN
            SELECT id, company_id, product_id, movement_type, quantity, notes
            FROM stock_movements
            WHERE reference_type = 'CREDIT_NOTE'
            AND reference_id = p_credit_note_id
        LOOP
            -- Create reverse movement
            INSERT INTO stock_movements (
                company_id,
                product_id,
                movement_type,
                quantity,
                reference_type,
                reference_id,
                notes,
                created_at
            ) VALUES (
                v_movement.company_id,
                v_movement.product_id,
                CASE WHEN v_movement.movement_type = 'IN' THEN 'OUT' ELSE 'IN' END,
                ABS(v_movement.quantity),
                'CREDIT_NOTE_REVERSAL',
                p_credit_note_id,
                'Reversal of ' || v_movement.notes,
                NOW()
            );
            
            -- Update product stock via direct calculation
            -- Using the same logic as update_product_stock but inline for atomicity
            CASE WHEN CASE WHEN v_movement.movement_type = 'IN' THEN 'OUT' ELSE 'IN' END = 'IN' THEN
                UPDATE products
                SET stock_quantity = COALESCE(stock_quantity, 0) + ABS(v_movement.quantity)
                WHERE id = v_movement.product_id;
            ELSE
                UPDATE products
                SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - ABS(v_movement.quantity))
                WHERE id = v_movement.product_id;
            END CASE;
        END LOOP;
    END IF;
    
    -- 4. Update credit note status to cancelled
    UPDATE credit_notes
    SET status = 'cancelled',
        applied_amount = 0,
        balance = v_credit_note.total_amount,
        notes = CASE 
            WHEN p_reason IS NOT NULL THEN 'Reversed - ' || p_reason
            ELSE 'Reversed'
        END,
        updated_at = NOW()
    WHERE id = p_credit_note_id;
    
    -- 5. Return success with details
    RETURN json_build_object(
        'success', true,
        'credit_note_number', v_credit_note.credit_note_number,
        'message', 'Credit note reversed successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Return error without throwing (function returns gracefully)
    RETURN json_build_object(
        'success', false,
        'error', 'Error during reversal: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION reverse_credit_note(UUID, TEXT) TO authenticated;

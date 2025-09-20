import { supabase } from '@/integrations/supabase/client';

/**
 * Automated setup for payment-invoice synchronization
 * Creates the database function that handles payment recording with automatic invoice updates
 */
export async function setupPaymentSync(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    console.log('Setting up payment synchronization system...');

    // Step 1: Create the database function
    const functionSQL = `
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
    `;

    // Try to create the function using a direct SQL execution
    // Note: This might not work in all environments due to security restrictions
    const { error: functionError } = await supabase.rpc('sql', { query: functionSQL });
    
    if (functionError) {
      // If direct SQL doesn't work, try using the existing exec_sql function
      const { error: execError } = await supabase.rpc('exec_sql', { sql: functionSQL });
      
      if (execError) {
        console.error('Function creation failed:', execError);
        throw new Error(`Failed to create database function: ${execError.message}`);
      }
    }

    console.log('Database function created successfully');

    // Step 2: Test the function with a dummy call
    const testResult = await supabase.rpc('record_payment_with_allocation', {
      p_company_id: '00000000-0000-0000-0000-000000000000',
      p_customer_id: '00000000-0000-0000-0000-000000000000',
      p_invoice_id: '00000000-0000-0000-0000-000000000000',
      p_payment_number: 'TEST-SYNC',
      p_payment_date: '2024-01-01',
      p_amount: 100,
      p_payment_method: 'cash',
      p_reference_number: 'TEST-REF',
      p_notes: 'Test sync setup'
    });

    if (testResult.error) {
      // Check if the error is expected (invoice not found) which means function is working
      if (testResult.error.message?.includes('Invoice not found')) {
        console.log('Function test passed - expected error received');
      } else {
        throw new Error(`Function test failed: ${testResult.error.message}`);
      }
    } else if (testResult.data && !testResult.data.success) {
      // Expected behavior - function returns success:false for non-existent invoice
      console.log('Function test passed - function returned expected failure');
    }

    return {
      success: true,
      message: 'Payment synchronization system has been successfully set up!',
      details: {
        functionCreated: true,
        testPassed: true,
        description: 'Payments will now automatically update invoice balances and create proper allocations'
      }
    };

  } catch (error: any) {
    console.error('Payment sync setup failed:', error);

    let errorMessage = 'Unknown error occurred';
    let errorDetails = {};

    if (error && typeof error === 'object') {
      if (error.message) {
        errorMessage = error.message;
      } else if (error.details) {
        errorMessage = error.details;
      } else if (error.code) {
        errorMessage = `Database error (${error.code}): ${error.message || 'Unknown'}`;
        errorDetails = { code: error.code, details: error.details, hint: error.hint };
      } else {
        errorMessage = JSON.stringify(error);
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return {
      success: false,
      message: `Failed to set up payment synchronization: ${errorMessage}`,
      details: {
        error: errorMessage,
        fullError: errorDetails,
        suggestion: 'You may need to run the SQL manually in your database admin panel'
      }
    };
  }
}

/**
 * Test if payment sync is already set up
 */
export async function testPaymentSync(): Promise<{ isSetup: boolean; message: string }> {
  try {
    const { error } = await supabase.rpc('record_payment_with_allocation', {
      p_company_id: '00000000-0000-0000-0000-000000000000',
      p_customer_id: '00000000-0000-0000-0000-000000000000',
      p_invoice_id: '00000000-0000-0000-0000-000000000000',
      p_payment_number: 'TEST',
      p_payment_date: '2024-01-01',
      p_amount: 1,
      p_payment_method: 'cash',
      p_reference_number: 'TEST',
      p_notes: 'Test'
    });

    if (error && error.message?.includes('function record_payment_with_allocation')) {
      return {
        isSetup: false,
        message: 'Payment sync function not found - setup required'
      };
    }

    return {
      isSetup: true,
      message: 'Payment sync system is already configured'
    };
  } catch (error: any) {
    let errorMessage = 'Unknown error';

    if (error && typeof error === 'object') {
      if (error.message) {
        errorMessage = error.message;
      } else if (error.details) {
        errorMessage = error.details;
      } else if (error.code) {
        errorMessage = `Database error (${error.code})`;
      } else {
        errorMessage = JSON.stringify(error);
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return {
      isSetup: false,
      message: `Unable to test payment sync: ${errorMessage}`
    };
  }
}

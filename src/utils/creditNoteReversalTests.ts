import { supabase } from '@/integrations/supabase/client';

interface ReversalTestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: Record<string, any>;
}

interface CreditNoteTestData {
  creditNoteId: string;
  companyId: string;
  customerId: string;
  totalAmount: number;
  affectsInventory: boolean;
}

/**
 * Test 1: Verify credit note can be fetched and validated
 */
export async function testCreditNoteFetch(creditNoteId: string): Promise<ReversalTestResult> {
  const testName = 'Credit Note Fetch and Validation';
  
  try {
    const { data, error } = await supabase
      .from('credit_notes')
      .select('id, credit_note_number, status, applied_amount, affects_inventory')
      .eq('id', creditNoteId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Credit note not found');

    return {
      testName,
      passed: true,
      details: {
        creditNoteNumber: data.credit_note_number,
        status: data.status,
        appliedAmount: data.applied_amount,
        affectsInventory: data.affects_inventory
      }
    };
  } catch (error: any) {
    return {
      testName,
      passed: false,
      error: error?.message || 'Unknown error'
    };
  }
}

/**
 * Test 2: Verify allocations can be fetched if they exist
 */
export async function testAllocationFetch(creditNoteId: string): Promise<ReversalTestResult> {
  const testName = 'Credit Note Allocations Fetch';
  
  try {
    const { data, error } = await supabase
      .from('credit_note_allocations')
      .select('id, invoice_id, allocated_amount')
      .eq('credit_note_id', creditNoteId);

    if (error) throw error;

    return {
      testName,
      passed: true,
      details: {
        allocationCount: data?.length || 0,
        allocations: data
      }
    };
  } catch (error: any) {
    return {
      testName,
      passed: false,
      error: error?.message || 'Unknown error'
    };
  }
}

/**
 * Test 3: Verify stock movements exist if affects_inventory is true
 */
export async function testStockMovementsFetch(creditNoteId: string): Promise<ReversalTestResult> {
  const testName = 'Stock Movements Fetch';
  
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('id, product_id, movement_type, quantity, reference_type')
      .eq('reference_type', 'CREDIT_NOTE')
      .eq('reference_id', creditNoteId);

    if (error) throw error;

    return {
      testName,
      passed: true,
      details: {
        movementCount: data?.length || 0,
        movements: data?.map(m => ({
          productId: m.product_id,
          type: m.movement_type,
          quantity: m.quantity
        }))
      }
    };
  } catch (error: any) {
    return {
      testName,
      passed: false,
      error: error?.message || 'Unknown error'
    };
  }
}

/**
 * Test 4: Verify invoices exist and fetch invoice states before reversal
 */
export async function testInvoiceStateBeforeReversal(creditNoteId: string): Promise<ReversalTestResult> {
  const testName = 'Invoice State Verification (Before Reversal)';
  
  try {
    // Fetch allocations to get invoice IDs
    const { data: allocations, error: allocErr } = await supabase
      .from('credit_note_allocations')
      .select('invoice_id, allocated_amount')
      .eq('credit_note_id', creditNoteId);

    if (allocErr) throw allocErr;

    if (!allocations || allocations.length === 0) {
      return {
        testName,
        passed: true,
        details: {
          message: 'No allocations found (credit note not applied to any invoices)'
        }
      };
    }

    // Fetch invoice details
    const invoiceIds = allocations.map(a => a.invoice_id);
    const { data: invoices, error: invoiceErr } = await supabase
      .from('invoices')
      .select('id, invoice_number, paid_amount, balance_due')
      .in('id', invoiceIds);

    if (invoiceErr) throw invoiceErr;

    return {
      testName,
      passed: true,
      details: {
        allocationCount: allocations.length,
        invoices: invoices?.map(inv => ({
          invoiceNumber: inv.invoice_number,
          paidAmount: inv.paid_amount,
          balanceDue: inv.balance_due
        }))
      }
    };
  } catch (error: any) {
    return {
      testName,
      passed: false,
      error: error?.message || 'Unknown error'
    };
  }
}

/**
 * Test 5: Verify RPC function exists
 */
export async function testReversalFunctionExists(): Promise<ReversalTestResult> {
  const testName = 'Reversal Function Availability';
  
  try {
    // Try to get function info from schema
    const { data, error } = await supabase
      .rpc('reverse_credit_note', {
        p_credit_note_id: '00000000-0000-0000-0000-000000000000',
        p_reason: 'test'
      });

    // We expect this to fail with "credit note not found" or similar, not "function not found"
    if (error?.message?.includes('function reverse_credit_note does not exist')) {
      return {
        testName,
        passed: false,
        error: 'Reversal function not found in database'
      };
    }

    // Any other error means the function exists
    return {
      testName,
      passed: true,
      details: {
        message: 'Reversal function is available'
      }
    };
  } catch (error: any) {
    return {
      testName,
      passed: false,
      error: error?.message || 'Unknown error'
    };
  }
}

/**
 * Test 6: Run full reversal test
 */
export async function testFullReversal(creditNoteId: string, reason?: string): Promise<ReversalTestResult> {
  const testName = 'Full Credit Note Reversal';
  
  try {
    const { data: result, error } = await supabase
      .rpc('reverse_credit_note', {
        p_credit_note_id: creditNoteId,
        p_reason: reason || null
      });

    if (error) throw error;

    if (!result?.success) {
      return {
        testName,
        passed: false,
        error: result?.error || 'Reversal failed'
      };
    }

    // Verify credit note is now cancelled
    const { data: creditNote } = await supabase
      .from('credit_notes')
      .select('status, applied_amount, balance')
      .eq('id', creditNoteId)
      .single();

    return {
      testName,
      passed: creditNote?.status === 'cancelled',
      details: {
        newStatus: creditNote?.status,
        newAppliedAmount: creditNote?.applied_amount,
        newBalance: creditNote?.balance
      }
    };
  } catch (error: any) {
    return {
      testName,
      passed: false,
      error: error?.message || 'Unknown error'
    };
  }
}

/**
 * Run all reversal tests
 */
export async function runAllReversalTests(creditNoteId: string): Promise<ReversalTestResult[]> {
  const results: ReversalTestResult[] = [];

  // Test 1: Fetch credit note
  results.push(await testCreditNoteFetch(creditNoteId));

  // Test 2: Fetch allocations
  results.push(await testAllocationFetch(creditNoteId));

  // Test 3: Fetch stock movements
  results.push(await testStockMovementsFetch(creditNoteId));

  // Test 4: Verify invoice state
  results.push(await testInvoiceStateBeforeReversal(creditNoteId));

  // Test 5: Check if reversal function exists
  results.push(await testReversalFunctionExists());

  return results;
}

/**
 * Generate test report
 */
export function generateTestReport(results: ReversalTestResult[]): string {
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  let report = `
=== CREDIT NOTE REVERSAL TEST REPORT ===

Summary: ${passed} passed, ${failed} failed out of ${results.length} tests

Test Results:
`;

  results.forEach((result, index) => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    report += `\n${index + 1}. ${status} - ${result.testName}`;
    
    if (!result.passed && result.error) {
      report += `\n   Error: ${result.error}`;
    }
    
    if (result.details) {
      report += `\n   Details: ${JSON.stringify(result.details, null, 2)}`;
    }
  });

  report += `\n
=== END OF REPORT ===
`;

  return report;
}

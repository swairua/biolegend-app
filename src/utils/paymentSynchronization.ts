import { supabase } from '@/integrations/supabase/client';

export interface PaymentSyncAnalysis {
  totalPayments: number;
  paymentsWithAllocations: number;
  paymentsWithoutAllocations: number;
  unallocatedPayments: any[];
  invoicesNeedingRecalculation: any[];
  potentialMatches: Array<{
    payment: any;
    invoice: any;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  }>;
}

export interface SyncResult {
  success: boolean;
  allocationsCreated: number;
  invoicesUpdated: number;
  errors: string[];
  details: any[];
}

/**
 * Analyze the current state of payments and allocations
 */
export async function analyzePaymentSyncStatus(): Promise<PaymentSyncAnalysis> {
  try {
    // First check if payment_allocations table exists
    const { data: allocationsTest, error: allocationsTestError } = await supabase
      .from('payment_allocations')
      .select('id')
      .limit(1);

    let payments: any[] = [];
    let paymentsError: any = null;

    // If payment_allocations table exists, use the join query
    if (!allocationsTestError) {
      const result = await supabase
        .from('payments')
        .select(`
          *,
          payment_allocations(
            id,
            invoice_id,
            amount_allocated
          )
        `)
        .order('created_at', { ascending: false });

      payments = result.data || [];
      paymentsError = result.error;
    } else {
      // If payment_allocations table doesn't exist, just get payments
      console.warn('payment_allocations table not found, treating all payments as unallocated');
      const result = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      payments = (result.data || []).map(payment => ({
        ...payment,
        payment_allocations: []
      }));
      paymentsError = result.error;
    }

    if (paymentsError) throw paymentsError;

    // Get all invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (invoicesError) throw invoicesError;

    // Analyze payments
    const paymentsWithAllocations = payments?.filter(p => p.payment_allocations?.length > 0) || [];
    const paymentsWithoutAllocations = payments?.filter(p => !p.payment_allocations || p.payment_allocations.length === 0) || [];

    // Find potential matches for unallocated payments
    const potentialMatches = [];
    
    for (const payment of paymentsWithoutAllocations) {
      // Try to match by customer and date range
      const candidateInvoices = invoices?.filter(invoice => {
        // Same customer
        if (invoice.customer_id !== payment.customer_id) return false;
        
        // Payment date should be after invoice date
        const invoiceDate = new Date(invoice.invoice_date);
        const paymentDate = new Date(payment.payment_date);
        
        if (paymentDate < invoiceDate) return false;
        
        // Payment date should be within reasonable time (e.g., 6 months)
        const timeDiff = paymentDate.getTime() - invoiceDate.getTime();
        const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000;
        
        return timeDiff <= sixMonths;
      }) || [];

      // Score matches
      for (const invoice of candidateInvoices) {
        let confidence: 'high' | 'medium' | 'low' = 'low';
        let reason = '';

        const invoiceBalance = invoice.balance_due || (invoice.total_amount - (invoice.paid_amount || 0));
        
        // High confidence: exact amount match
        if (Math.abs(payment.amount - invoiceBalance) < 0.01) {
          confidence = 'high';
          reason = 'Exact amount match with invoice balance';
        }
        // Medium confidence: amount matches total invoice
        else if (Math.abs(payment.amount - invoice.total_amount) < 0.01) {
          confidence = 'medium';
          reason = 'Exact amount match with invoice total';
        }
        // Low confidence: partial payment or close amount
        else if (payment.amount <= invoice.total_amount && payment.amount > 0) {
          confidence = 'low';
          reason = 'Partial payment amount';
        }

        if (confidence !== 'low' || payment.amount > 0) {
          potentialMatches.push({
            payment,
            invoice,
            confidence,
            reason
          });
        }
      }
    }

    // Sort matches by confidence
    potentialMatches.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });

    // Find invoices that might need recalculation
    const invoicesNeedingRecalculation = invoices?.filter(invoice => {
      // Find payments for this invoice
      const invoicePayments = payments?.filter(p => 
        p.payment_allocations?.some(alloc => alloc.invoice_id === invoice.id)
      ) || [];
      
      const totalAllocated = invoicePayments.reduce((sum, payment) => {
        const allocationsForInvoice = payment.payment_allocations?.filter(alloc => alloc.invoice_id === invoice.id) || [];
        return sum + allocationsForInvoice.reduce((allocSum, alloc) => allocSum + (alloc.amount_allocated || 0), 0);
      }, 0);
      
      const expectedPaidAmount = totalAllocated;
      const currentPaidAmount = invoice.paid_amount || 0;
      
      // Invoice needs recalculation if paid amounts don't match
      return Math.abs(expectedPaidAmount - currentPaidAmount) > 0.01;
    }) || [];

    return {
      totalPayments: payments?.length || 0,
      paymentsWithAllocations: paymentsWithAllocations.length,
      paymentsWithoutAllocations: paymentsWithoutAllocations.length,
      unallocatedPayments: paymentsWithoutAllocations,
      invoicesNeedingRecalculation,
      potentialMatches: potentialMatches.slice(0, 50) // Limit for performance
    };
  } catch (error) {
    console.error('Error analyzing payment sync status:', error);
    throw error;
  }
}

/**
 * Synchronize payments with invoices based on analysis
 */
export async function synchronizePayments(
  matches: Array<{ payment: any; invoice: any; confidence: string; reason: string }>,
  recalculateAll: boolean = false
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    allocationsCreated: 0,
    invoicesUpdated: 0,
    errors: [],
    details: []
  };

  try {
    // Process each match
    for (const match of matches) {
      try {
        const { payment, invoice } = match;
        
        // Create payment allocation
        const { error: allocationError } = await supabase
          .from('payment_allocations')
          .insert([{
            payment_id: payment.id,
            invoice_id: invoice.id,
            amount_allocated: payment.amount
          }]);

        if (allocationError) {
          result.errors.push(`Failed to create allocation for payment ${payment.payment_number}: ${allocationError.message}`);
          continue;
        }

        result.allocationsCreated++;
        
        // Update invoice balance
        const newPaidAmount = (invoice.paid_amount || 0) + payment.amount;
        const newBalanceDue = invoice.total_amount - newPaidAmount;
        let newStatus = invoice.status;
        
        if (newBalanceDue <= 0) {
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }

        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            paid_amount: newPaidAmount,
            balance_due: newBalanceDue,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice.id);

        if (invoiceError) {
          result.errors.push(`Failed to update invoice ${invoice.invoice_number}: ${invoiceError.message}`);
        } else {
          result.invoicesUpdated++;
          result.details.push({
            type: 'allocation_created',
            payment: payment.payment_number,
            invoice: invoice.invoice_number,
            amount: payment.amount,
            confidence: match.confidence
          });
        }
      } catch (error: any) {
        result.errors.push(`Error processing match: ${error.message}`);
      }
    }

    // Recalculate all invoice balances if requested
    if (recalculateAll) {
      await recalculateAllInvoiceBalances();
    }

    result.success = result.errors.length === 0 || result.allocationsCreated > 0;
    
    return result;
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Synchronization failed: ${error.message}`);
    return result;
  }
}

/**
 * Recalculate all invoice balances based on payment allocations
 */
export async function recalculateAllInvoiceBalances(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  try {
    // Get all invoices with their payment allocations
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        paid_amount,
        balance_due,
        status,
        payment_allocations!invoice_id(
          amount_allocated
        )
      `);

    if (error) throw error;

    for (const invoice of invoices || []) {
      const totalAllocated = invoice.payment_allocations?.reduce(
        (sum: number, alloc: any) => sum + (alloc.amount_allocated || 0), 
        0
      ) || 0;

      const newBalanceDue = invoice.total_amount - totalAllocated;
      let newStatus = invoice.status;

      if (newBalanceDue <= 0 && totalAllocated > 0) {
        newStatus = 'paid';
      } else if (totalAllocated > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'draft';
      }

      // Update if values changed
      if (
        Math.abs((invoice.paid_amount || 0) - totalAllocated) > 0.01 ||
        Math.abs((invoice.balance_due || 0) - newBalanceDue) > 0.01 ||
        invoice.status !== newStatus
      ) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            paid_amount: totalAllocated,
            balance_due: newBalanceDue,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice.id);

        if (updateError) {
          errors.push(`Failed to update invoice ${invoice.invoice_number}: ${updateError.message}`);
        } else {
          updated++;
        }
      }
    }

    return { updated, errors };
  } catch (error: any) {
    errors.push(`Recalculation failed: ${error.message}`);
    return { updated, errors };
  }
}

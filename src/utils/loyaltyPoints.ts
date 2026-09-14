import { supabase } from '@/integrations/supabase/client';

export const calculateInvoicePoints = (totalKes: number): number =>
  Math.max(0, Math.floor((Number(totalKes) || 0) / 100));

export const refreshCustomerPointSnapshots = async (customerId: string) => {
  const [{ data: invoices, error: invoicesError }, { data: transactions, error: transactionsError }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, earned_points, invoice_date, created_at')
      .eq('customer_id', customerId)
      .order('invoice_date', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('loyalty_point_transactions')
      .select('invoice_id, points_delta')
      .eq('customer_id', customerId),
  ]);

  if (invoicesError) throw invoicesError;
  if (transactionsError) throw transactionsError;

  const pointsByInvoice = new Map<string, number>();
  (transactions || []).forEach((transaction: any) => {
    if (transaction.invoice_id) {
      pointsByInvoice.set(
        transaction.invoice_id,
        (pointsByInvoice.get(transaction.invoice_id) || 0) + Number(transaction.points_delta || 0)
      );
    }
  });

  let runningTotal = 0;
  for (const invoice of invoices || []) {
    const earnedPoints = pointsByInvoice.get(invoice.id) || 0;
    runningTotal += earnedPoints;
    const { error } = await supabase
      .from('invoices')
      .update({ earned_points: earnedPoints, total_points: runningTotal })
      .eq('id', invoice.id);
    if (error) throw error;
  }
};

export const syncInvoicePoints = async ({
  invoiceId,
  customerId,
  companyId,
  totalKes,
}: {
  invoiceId: string;
  customerId: string;
  companyId: string;
  totalKes: number;
}) => {
  const { error } = await supabase.rpc('loyalty_sync_invoice_points', {
    p_invoice_id: invoiceId,
    p_company_id: companyId,
    p_customer_id: customerId,
    p_total_kes: Number(totalKes) || 0,
  });
  if (error) throw error;
};

export const removeInvoicePoints = async (invoiceId: string, _customerId: string) => {
  const { error } = await supabase.rpc('loyalty_remove_invoice_points', {
    p_invoice_id: invoiceId,
  });
  if (error) throw error;
};

export const reverseInvoiceRedemptions = async (invoiceId: string) => {
  const { error } = await supabase.rpc('loyalty_reverse_invoice_redemptions', {
    p_invoice_id: invoiceId,
  });
  if (error) throw error;
};

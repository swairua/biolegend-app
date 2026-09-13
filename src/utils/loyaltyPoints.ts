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
  const earnedPoints = calculateInvoicePoints(totalKes);

  const { error: deleteError } = await supabase
    .from('loyalty_point_transactions')
    .delete()
    .eq('invoice_id', invoiceId)
    .eq('event_type', 'invoice_award');
  if (deleteError) throw deleteError;

  if (earnedPoints > 0) {
    const { error: insertError } = await supabase
      .from('loyalty_point_transactions')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        invoice_id: invoiceId,
        points_delta: earnedPoints,
        event_type: 'invoice_award',
        calculation_kes: Number(totalKes) || 0,
      });
    if (insertError) throw insertError;
  }

  await refreshCustomerPointSnapshots(customerId);
};

export const removeInvoicePoints = async (invoiceId: string, customerId: string) => {
  const { error } = await supabase
    .from('loyalty_point_transactions')
    .delete()
    .eq('invoice_id', invoiceId);
  if (error) throw error;
  await refreshCustomerPointSnapshots(customerId);
};

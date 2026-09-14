import { supabase } from '@/integrations/supabase/client';

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

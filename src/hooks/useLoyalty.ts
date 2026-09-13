import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentCompany } from '@/contexts/CompanyContext';

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  points_delta: number;
  event_type: string;
  reason?: string;
  created_at: string;
}

export interface LoyaltyRedemption {
  id: string;
  customer_id: string;
  invoice_id?: string | null;
  points_redeemed: number;
  kes_value: number;
  kes_per_point: number;
  status: string;
  reason: string;
  created_at: string;
}

const loyaltyKeys = {
  settings: (companyId?: string) => ['loyalty-settings', companyId] as const,
  customer: (customerId?: string) => ['loyalty-customer', customerId] as const,
  activity: (companyId?: string) => ['loyalty-activity', companyId] as const,
};

export function useLoyaltySettings() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  return useQuery({
    queryKey: loyaltyKeys.settings(companyId),
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from('loyalty_settings').select('*').eq('company_id', companyId!).maybeSingle();
      if (error) throw error;
      return data || { company_id: companyId, kes_per_point: 1 };
    },
  });
}

export function useLoyaltyCustomer(customerId?: string) {
  const { data: settings } = useLoyaltySettings();
  return useQuery({
    queryKey: loyaltyKeys.customer(customerId),
    enabled: !!customerId,
    queryFn: async () => {
      const [{ data: transactions, error: transactionError }, { data: redemptions, error: redemptionError }] = await Promise.all([
        supabase.from('loyalty_point_transactions').select('*').eq('customer_id', customerId!).order('created_at', { ascending: false }),
        supabase.from('loyalty_redemptions').select('*').eq('customer_id', customerId!).order('created_at', { ascending: false }),
      ]);
      if (transactionError) throw transactionError;
      if (redemptionError) throw redemptionError;
      const rows = (transactions || []) as LoyaltyTransaction[];
      const earned = rows.filter(row => row.points_delta > 0).reduce((sum, row) => sum + row.points_delta, 0);
      const redeemed = (redemptions || []).filter((row: LoyaltyRedemption) => row.status === 'completed').reduce((sum, row) => sum + row.points_redeemed, 0);
      return { available: rows.reduce((sum, row) => sum + row.points_delta, 0), earned, redeemed, value: rows.reduce((sum, row) => sum + row.points_delta, 0) * Number(settings?.kes_per_point || 1), transactions: rows, redemptions: (redemptions || []) as LoyaltyRedemption[] };
    },
  });
}

export function useLoyaltyAdminMutations() {
  const { profile, isAdmin } = useAuth();
  const { currentCompany } = useCurrentCompany();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id || currentCompany?.id;
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['loyalty-settings'] });
    queryClient.invalidateQueries({ queryKey: ['loyalty-customer'] });
    queryClient.invalidateQueries({ queryKey: ['loyalty-activity'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };
  const settings = useMutation({
    mutationFn: async (kesPerPoint: number) => {
      if (!isAdmin || !companyId || kesPerPoint <= 0) throw new Error('Administrator access and a positive conversion rate are required');
      const { error } = await supabase.from('loyalty_settings').upsert({ company_id: companyId, kes_per_point: kesPerPoint, updated_by: profile?.id, updated_at: new Date().toISOString() });
      if (error) throw error;
    }, onSuccess: invalidate,
  });
  const adjust = useMutation({
    mutationFn: async ({ customerId, points, reason }: { customerId: string; points: number; reason: string }) => {
      if (!companyId) throw new Error('Company is required');
      const { data, error } = await supabase.rpc('loyalty_adjust_points', { p_company_id: companyId, p_customer_id: customerId, p_points: points, p_reason: reason });
      if (error) throw error;
      return data;
    }, onSuccess: invalidate,
  });
  const redeem = useMutation({
    mutationFn: async ({ customerId, points, invoiceId, reason }: { customerId: string; points: number; invoiceId?: string; reason: string }) => {
      if (!companyId) throw new Error('Company is required');
      const { data, error } = await supabase.rpc('loyalty_redeem_points', { p_company_id: companyId, p_customer_id: customerId, p_points: points, p_invoice_id: invoiceId || null, p_reason: reason });
      if (error) throw error;
      return data as LoyaltyRedemption;
    }, onSuccess: invalidate,
  });
  return { settings, adjust, redeem };
}

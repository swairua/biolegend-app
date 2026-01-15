import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OptimizedProforma {
  id?: string;
  company_id: string;
  customer_id: string;
  proforma_number: string;
  proforma_date: string;
  valid_until: string;
  subtotal: number;
  tax_percentage?: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'expired' | 'converted';
  notes?: string;
  terms_and_conditions?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  currency_code?: 'KES' | 'USD';
  exchange_rate?: number;
  customers?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  proforma_items?: Array<{
    id?: string;
    proforma_id?: string;
    product_id: string;
    product_name?: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percentage?: number;
    discount_amount?: number;
    tax_percentage: number;
    tax_amount: number;
    tax_inclusive: boolean;
    line_total: number;
  }>;
}

interface UseOptimizedProformasOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  statusFilter?: 'all' | 'draft' | 'sent' | 'accepted' | 'expired' | 'converted';
}

export const useOptimizedProformas = (
  companyId?: string,
  options: UseOptimizedProformasOptions = {}
) => {
  const { page = 1, pageSize = 20, searchTerm = '', statusFilter = 'all' } = options;

  return useQuery({
    queryKey: ['proforma_invoices-optimized', companyId, page, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      console.log('🔍 Loading proformas with optimization...');
      const startTime = performance.now();

      let query = supabase
        .from('proforma_invoices')
        .select(
          `
          id,
          company_id,
          customer_id,
          proforma_number,
          proforma_date,
          valid_until,
          subtotal,
          tax_percentage,
          tax_amount,
          total_amount,
          status,
          notes,
          terms_and_conditions,
          currency_code,
          exchange_rate,
          created_by,
          created_at,
          updated_at
        `,
          { count: 'exact' }
        );

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (searchTerm) {
        query = query.ilike('proforma_number', `%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      query = query.order('created_at', { ascending: false });

      const { data: proformas, error, count } = await query;

      if (error) {
        console.error('❌ Proformas query failed:', error);
        throw error;
      }

      if (!proformas || proformas.length === 0) {
        return {
          proformas: [],
          totalCount: count || 0,
          hasMore: false,
          currentPage: page
        };
      }

      // Fetch customers
      const customerIds = [
        ...new Set(
          proformas
            .map((p) => p.customer_id)
            .filter((id) => id && typeof id === 'string' && id.length === 36)
        )
      ];

      const { data: customers } =
        customerIds.length > 0
          ? await supabase
              .from('customers')
              .select('id, name, email, phone, address')
              .in('id', customerIds)
          : { data: [] };

      // Fetch proforma items
      const { data: proformaItems } = await supabase
        .from('proforma_items')
        .select(
          `id, proforma_id, product_id, description, quantity, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, tax_inclusive, line_total`
        )
        .in('proforma_id', proformas.map((p) => p.id));

      // Create maps
      const customerMap = new Map();
      (customers || []).forEach((customer) => {
        customerMap.set(customer.id, customer);
      });

      const itemsMap = new Map();
      (proformaItems || []).forEach((item) => {
        if (!itemsMap.has(item.proforma_id)) {
          itemsMap.set(item.proforma_id, []);
        }
        itemsMap.get(item.proforma_id).push(item);
      });

      // Combine data
      const enrichedProformas = proformas.map((proforma) => ({
        ...proforma,
        customers: customerMap.get(proforma.customer_id) || {
          id: proforma.customer_id,
          name: 'Unknown Customer'
        },
        proforma_items: itemsMap.get(proforma.id) || []
      })) as OptimizedProforma[];

      const endTime = performance.now();
      console.log(`✅ Proformas loaded in ${(endTime - startTime).toFixed(2)}ms`);

      return {
        proformas: enrichedProformas,
        totalCount: count || 0,
        hasMore: count ? (page * pageSize) < count : false,
        currentPage: page
      };
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: !!companyId
  });
};

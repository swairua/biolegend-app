import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OptimizedQuotation {
  id: string;
  company_id: string;
  customer_id: string;
  quotation_number: string;
  quotation_date: string;
  valid_until?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  notes?: string;
  terms_and_conditions?: string;
  currency_code?: 'KES' | 'USD';
  exchange_rate?: number;
  created_at?: string;
  updated_at?: string;
  customers?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  quotation_items?: Array<{
    id: string;
    quotation_id: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_percentage: number;
    tax_amount: number;
    line_total: number;
  }>;
}

interface UseOptimizedQuotationsOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  statusFilter?: 'all' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
}

export const useOptimizedQuotations = (
  companyId?: string,
  options: UseOptimizedQuotationsOptions = {}
) => {
  const { page = 1, pageSize = 20, searchTerm = '', statusFilter = 'all' } = options;

  return useQuery({
    queryKey: ['quotations-optimized', companyId, page, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      console.log('🔍 Loading quotations with optimization...');
      const startTime = performance.now();

      let query = supabase
        .from('quotations')
        .select(
          `
          id,
          company_id,
          customer_id,
          quotation_number,
          quotation_date,
          valid_until,
          subtotal,
          tax_amount,
          total_amount,
          status,
          notes,
          terms_and_conditions,
          currency_code,
          exchange_rate,
          created_at,
          updated_at
        `,
          { count: 'exact' }
        );

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (searchTerm) {
        query = query.ilike('quotation_number', `%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      query = query.order('created_at', { ascending: false });

      const { data: quotations, error, count } = await query;

      if (error) {
        console.error('❌ Quotations query failed:', error);
        throw error;
      }

      if (!quotations || quotations.length === 0) {
        return {
          quotations: [],
          totalCount: count || 0,
          hasMore: false,
          currentPage: page
        };
      }

      // Fetch customers
      const customerIds = [
        ...new Set(
          quotations
            .map((q) => q.customer_id)
            .filter((id) => id && typeof id === 'string' && id.length === 36)
        )
      ];

      const { data: customers } =
        customerIds.length > 0
          ? await supabase
              .from('customers')
              .select('id, name, email, phone, address, city, country')
              .in('id', customerIds)
          : { data: [] };

      // Fetch quotation items
      const { data: quotationItems } = await supabase
        .from('quotation_items')
        .select('id, quotation_id, product_id, description, quantity, unit_price, tax_percentage, tax_amount, line_total')
        .in('quotation_id', quotations.map((q) => q.id));

      // Create maps
      const customerMap = new Map();
      (customers || []).forEach((customer) => {
        customerMap.set(customer.id, customer);
      });

      const itemsMap = new Map();
      (quotationItems || []).forEach((item) => {
        if (!itemsMap.has(item.quotation_id)) {
          itemsMap.set(item.quotation_id, []);
        }
        itemsMap.get(item.quotation_id).push(item);
      });

      // Combine data
      const enrichedQuotations = quotations.map((quotation) => ({
        ...quotation,
        customers: customerMap.get(quotation.customer_id) || {
          id: quotation.customer_id,
          name: 'Unknown Customer'
        },
        quotation_items: itemsMap.get(quotation.id) || []
      })) as OptimizedQuotation[];

      const endTime = performance.now();
      console.log(`✅ Quotations loaded in ${(endTime - startTime).toFixed(2)}ms`);

      return {
        quotations: enrichedQuotations,
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

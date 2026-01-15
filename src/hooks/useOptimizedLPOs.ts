import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OptimizedLPO {
  id: string;
  company_id: string;
  supplier_id: string;
  lpo_number: string;
  lpo_date: string;
  delivery_date?: string;
  status: 'draft' | 'sent' | 'approved' | 'received' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  terms_and_conditions?: string;
  delivery_address?: string;
  contact_person?: string;
  contact_phone?: string;
  currency_code?: 'KES' | 'USD';
  exchange_rate?: number;
  fx_date?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  suppliers?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  lpo_items?: Array<{
    id: string;
    lpo_id: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    tax_amount: number;
    line_total: number;
    notes?: string;
    sort_order: number;
  }>;
}

interface UseOptimizedLPOsOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  statusFilter?: 'all' | 'draft' | 'sent' | 'approved' | 'received' | 'cancelled';
}

export const useOptimizedLPOs = (
  companyId?: string,
  options: UseOptimizedLPOsOptions = {}
) => {
  const { page = 1, pageSize = 20, searchTerm = '', statusFilter = 'all' } = options;

  return useQuery({
    queryKey: ['lpos-optimized', companyId, page, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      console.log('🔍 Loading LPOs with optimization...');
      const startTime = performance.now();

      let query = supabase
        .from('lpos')
        .select(
          `
          id,
          company_id,
          supplier_id,
          lpo_number,
          lpo_date,
          delivery_date,
          status,
          subtotal,
          tax_amount,
          total_amount,
          notes,
          terms_and_conditions,
          delivery_address,
          contact_person,
          contact_phone,
          currency_code,
          exchange_rate,
          fx_date,
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
        query = query.ilike('lpo_number', `%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      query = query.order('created_at', { ascending: false });

      const { data: lpos, error, count } = await query;

      if (error) {
        console.error('❌ LPOs query failed:', error);
        throw error;
      }

      if (!lpos || lpos.length === 0) {
        return {
          lpos: [],
          totalCount: count || 0,
          hasMore: false,
          currentPage: page
        };
      }

      // Fetch suppliers
      const supplierIds = [
        ...new Set(
          lpos
            .map((l) => l.supplier_id)
            .filter((id) => id && typeof id === 'string' && id.length === 36)
        )
      ];

      const { data: suppliers } =
        supplierIds.length > 0
          ? await supabase
              .from('suppliers')
              .select('id, name, email, phone, address')
              .in('id', supplierIds)
          : { data: [] };

      // Fetch LPO items
      const { data: lpoItems } = await supabase
        .from('lpo_items')
        .select('id, lpo_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, line_total, notes, sort_order')
        .in('lpo_id', lpos.map((l) => l.id));

      // Create maps
      const supplierMap = new Map();
      (suppliers || []).forEach((supplier) => {
        supplierMap.set(supplier.id, supplier);
      });

      const itemsMap = new Map();
      (lpoItems || []).forEach((item) => {
        if (!itemsMap.has(item.lpo_id)) {
          itemsMap.set(item.lpo_id, []);
        }
        itemsMap.get(item.lpo_id).push(item);
      });

      // Combine data
      const enrichedLPOs = lpos.map((lpo) => ({
        ...lpo,
        suppliers: supplierMap.get(lpo.supplier_id) || {
          id: lpo.supplier_id,
          name: 'Unknown Supplier'
        },
        lpo_items: itemsMap.get(lpo.id) || []
      })) as OptimizedLPO[];

      const endTime = performance.now();
      console.log(`✅ LPOs loaded in ${(endTime - startTime).toFixed(2)}ms`);

      return {
        lpos: enrichedLPOs,
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

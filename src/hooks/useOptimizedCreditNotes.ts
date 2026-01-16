import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OptimizedCreditNote {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_id?: string;
  credit_note_number: string;
  credit_note_date: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  applied_amount?: number;
  balance?: number;
  affects_inventory?: boolean;
  status: 'draft' | 'sent' | 'applied' | 'cancelled';
  reason?: string;
  notes?: string;
  terms_and_conditions?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  customers?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    customer_code?: string;
  };
  credit_note_items?: Array<{
    id: string;
    credit_note_id: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_percentage: number;
    tax_amount: number;
    line_total: number;
  }>;
}

interface UseOptimizedCreditNotesOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  statusFilter?: 'all' | 'draft' | 'issued' | 'applied' | 'reversed';
}

export const useOptimizedCreditNotes = (
  companyId?: string,
  options: UseOptimizedCreditNotesOptions = {}
) => {
  const { page = 1, pageSize = 20, searchTerm = '', statusFilter = 'all' } = options;

  return useQuery({
    queryKey: ['credit_notes-optimized', companyId, page, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      console.log('🔍 Loading credit notes with optimization...');
      const startTime = performance.now();

      let query = supabase
        .from('credit_notes')
        .select(
          `
          id,
          company_id,
          customer_id,
          credit_note_number,
          credit_note_date,
          subtotal,
          tax_amount,
          total_amount,
          applied_amount,
          remaining_amount,
          status,
          reason,
          notes,
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
        query = query.ilike('credit_note_number', `%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      query = query.order('created_at', { ascending: false });

      const { data: creditNotes, error, count } = await query;

      if (error) {
        console.error('❌ Credit notes query failed:', error?.message || JSON.stringify(error));
        throw new Error(error?.message || 'Failed to fetch credit notes');
      }

      if (!creditNotes || creditNotes.length === 0) {
        return {
          creditNotes: [],
          totalCount: count || 0,
          hasMore: false,
          currentPage: page
        };
      }

      // Fetch customers
      const customerIds = [
        ...new Set(
          creditNotes
            .map((cn) => cn.customer_id)
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

      // Fetch credit note items
      const { data: creditNoteItems } = await supabase
        .from('credit_note_items')
        .select('id, credit_note_id, product_id, description, quantity, unit_price, tax_percentage, tax_amount, line_total')
        .in('credit_note_id', creditNotes.map((cn) => cn.id));

      // Create maps
      const customerMap = new Map();
      (customers || []).forEach((customer) => {
        customerMap.set(customer.id, customer);
      });

      const itemsMap = new Map();
      (creditNoteItems || []).forEach((item) => {
        if (!itemsMap.has(item.credit_note_id)) {
          itemsMap.set(item.credit_note_id, []);
        }
        itemsMap.get(item.credit_note_id).push(item);
      });

      // Combine data
      const enrichedCreditNotes = creditNotes.map((creditNote) => ({
        ...creditNote,
        customers: customerMap.get(creditNote.customer_id) || {
          id: creditNote.customer_id,
          name: 'Unknown Customer'
        },
        credit_note_items: itemsMap.get(creditNote.id) || []
      })) as OptimizedCreditNote[];

      const endTime = performance.now();
      console.log(`✅ Credit notes loaded in ${(endTime - startTime).toFixed(2)}ms`);

      return {
        creditNotes: enrichedCreditNotes,
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

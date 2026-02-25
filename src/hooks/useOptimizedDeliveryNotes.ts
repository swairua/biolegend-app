import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OptimizedDeliveryNote {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_id?: string;
  delivery_number: string;
  delivery_note_number?: string;
  delivery_date: string;
  delivery_address: string;
  delivery_method: string;
  tracking_number?: string;
  carrier?: string;
  status: string;
  notes?: string;
  delivered_by?: string;
  received_by?: string;
  invoice_number?: string;
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
  invoices?: {
    invoice_number: string;
    total_amount: number;
  };
  delivery_note_items?: Array<{
    id: string;
    delivery_note_id: string;
    product_id?: string;
    description: string;
    quantity_ordered: number;
    quantity_delivered: number;
    unit_price?: number;
    sort_order?: number;
    products?: {
      name: string;
      unit_of_measure?: string;
    };
  }>;
}

interface UseOptimizedDeliveryNotesOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  statusFilter?: string;
}

export const useOptimizedDeliveryNotes = (
  companyId?: string,
  options: UseOptimizedDeliveryNotesOptions = {}
) => {
  const { page = 1, pageSize = 20, searchTerm = '', statusFilter = 'all' } = options;

  return useQuery({
    queryKey: ['delivery_notes-optimized', companyId, page, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      console.log('🔍 Loading delivery notes with optimization...');
      const startTime = performance.now();

      let query = supabase
        .from('delivery_notes')
        .select(
          `
          id,
          company_id,
          customer_id,
          invoice_id,
          delivery_number,
          delivery_note_number,
          delivery_date,
          delivery_address,
          delivery_method,
          tracking_number,
          carrier,
          status,
          notes,
          delivered_by,
          received_by,
          created_at,
          updated_at
        `,
          { count: 'exact' }
        );

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (searchTerm) {
        query = query.or(`delivery_number.ilike.%${searchTerm}%,delivery_note_number.ilike.%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      query = query.order('created_at', { ascending: false });

      const { data: deliveryNotes, error, count } = await query;

      if (error) {
        console.error('❌ Delivery notes query failed:', error);
        throw error;
      }

      if (!deliveryNotes || deliveryNotes.length === 0) {
        return {
          deliveryNotes: [],
          totalCount: count || 0,
          hasMore: false,
          currentPage: page
        };
      }

      // Fetch customers
      const customerIds = [
        ...new Set(
          deliveryNotes
            .map((dn) => dn.customer_id)
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

      // Fetch invoices
      const invoiceIds = [
        ...new Set(
          deliveryNotes
            .map((dn) => dn.invoice_id)
            .filter((id) => id && typeof id === 'string' && id.length === 36)
        )
      ];

      const { data: invoices } =
        invoiceIds.length > 0
          ? await supabase
              .from('invoices')
              .select('id, invoice_number, total_amount')
              .in('id', invoiceIds)
          : { data: [] };

      // Fetch delivery note items
      const { data: deliveryNoteItems } = await supabase
        .from('delivery_note_items')
        .select('id, delivery_note_id, product_id, description, quantity_ordered, quantity_delivered, unit_price, sort_order, products(name, unit_of_measure)')
        .in('delivery_note_id', deliveryNotes.map((dn) => dn.id));

      // Create maps
      const customerMap = new Map();
      (customers || []).forEach((customer) => {
        customerMap.set(customer.id, customer);
      });

      const invoiceMap = new Map();
      (invoices || []).forEach((invoice) => {
        invoiceMap.set(invoice.id, invoice);
      });

      const itemsMap = new Map();
      (deliveryNoteItems || []).forEach((item) => {
        if (!itemsMap.has(item.delivery_note_id)) {
          itemsMap.set(item.delivery_note_id, []);
        }
        itemsMap.get(item.delivery_note_id).push(item);
      });

      // Combine data
      const enrichedDeliveryNotes = deliveryNotes.map((deliveryNote) => ({
        ...deliveryNote,
        customers: customerMap.get(deliveryNote.customer_id) || {
          id: deliveryNote.customer_id,
          name: 'Unknown Customer'
        },
        invoices: deliveryNote.invoice_id ? invoiceMap.get(deliveryNote.invoice_id) : undefined,
        delivery_note_items: itemsMap.get(deliveryNote.id) || []
      })) as OptimizedDeliveryNote[];

      const endTime = performance.now();
      console.log(`✅ Delivery notes loaded in ${(endTime - startTime).toFixed(2)}ms`);

      return {
        deliveryNotes: enrichedDeliveryNotes,
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

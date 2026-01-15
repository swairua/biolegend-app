import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface OptimizedInvoice {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue';
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  notes?: string;
  terms_and_conditions?: string;
  currency_code?: 'KES' | 'USD';
  exchange_rate?: number;
  lpo_number?: string;
  created_at?: string;
  updated_at?: string;
  // Related data
  customers?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  invoice_items?: Array<{
    id: string;
    invoice_id: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount_before_vat?: number;
    tax_percentage: number;
    tax_amount: number;
    tax_inclusive: boolean;
    line_total: number;
    sort_order?: number;
    products?: {
      id: string;
      name: string;
      description?: string;
      product_code: string;
      unit_of_measure?: string;
    };
  }>;
}

interface UseOptimizedInvoicesOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  statusFilter?: 'all' | 'draft' | 'sent' | 'paid' | 'partial' | 'overdue';
  dateFromFilter?: string;
  dateToFilter?: string;
  amountFromFilter?: number;
  amountToFilter?: number;
  currencyCode?: 'KES' | 'USD';
  exchangeRate?: number;
}

export const useOptimizedInvoices = (
  companyId?: string,
  options: UseOptimizedInvoicesOptions = {}
) => {
  const {
    page = 1,
    pageSize = 20,
    searchTerm = '',
    statusFilter = 'all',
    dateFromFilter = '',
    dateToFilter = '',
    amountFromFilter,
    amountToFilter,
    currencyCode = 'KES',
    exchangeRate = 1
  } = options;

  return useQuery({
    queryKey: [
      'invoices-optimized',
      companyId,
      page,
      pageSize,
      searchTerm,
      statusFilter,
      dateFromFilter,
      dateToFilter,
      amountFromFilter,
      amountToFilter,
      currencyCode,
      exchangeRate
    ],
    queryFn: async () => {
      console.log('🔍 Loading invoices with optimization...');
      const startTime = performance.now();

      // Step 1: Build base query for invoices
      let query = supabase
        .from('invoices')
        .select(
          `
          id,
          company_id,
          customer_id,
          invoice_number,
          invoice_date,
          due_date,
          status,
          subtotal,
          tax_amount,
          total_amount,
          paid_amount,
          balance_due,
          notes,
          terms_and_conditions,
          currency_code,
          exchange_rate,
          lpo_number,
          created_at,
          updated_at
        `,
          { count: 'exact' }
        );

      // Apply company filter
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      // Apply search filter (server-side) - search invoice_number and customer info
      if (searchTerm) {
        query = query.ilike('invoice_number', `%${searchTerm}%`);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply date filters
      if (dateFromFilter) {
        query = query.gte('invoice_date', dateFromFilter);
      }
      if (dateToFilter) {
        query = query.lte('invoice_date', dateToFilter);
      }

      // Apply amount filters (will normalize client-side due to currency complexity)
      if (amountFromFilter !== undefined) {
        query = query.gte('total_amount', amountFromFilter);
      }
      if (amountToFilter !== undefined) {
        query = query.lte('total_amount', amountToFilter);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Order by created_at for consistent pagination
      query = query.order('created_at', { ascending: false });

      const { data: invoices, error, count } = await query;

      if (error) {
        console.error('❌ Invoices query failed:', error);
        throw error;
      }

      if (!invoices || invoices.length === 0) {
        const endTime = performance.now();
        console.log(`✅ No invoices found in ${(endTime - startTime).toFixed(2)}ms`);
        return {
          invoices: [],
          totalCount: count || 0,
          hasMore: false,
          currentPage: page
        };
      }

      // Step 2: Fetch customers for all invoices on this page
      const customerIds = [
        ...new Set(
          invoices
            .map((inv) => inv.customer_id)
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

      // Step 3: Fetch invoice items for all invoices on this page
      const { data: invoiceItems } = await supabase
        .from('invoice_items')
        .select(
          `
          id,
          invoice_id,
          product_id,
          description,
          quantity,
          unit_price,
          discount_before_vat,
          tax_percentage,
          tax_amount,
          tax_inclusive,
          line_total,
          sort_order,
          products(id, name, description, product_code, unit_of_measure)
        `
        )
        .in('invoice_id', invoices.map((inv) => inv.id));

      // Step 4: Create lookup maps
      const customerMap = new Map();
      (customers || []).forEach((customer) => {
        customerMap.set(customer.id, customer);
      });

      const itemsMap = new Map();
      (invoiceItems || []).forEach((item) => {
        if (!itemsMap.has(item.invoice_id)) {
          itemsMap.set(item.invoice_id, []);
        }
        itemsMap.get(item.invoice_id).push(item);
      });

      // Step 5: Combine data
      const enrichedInvoices = invoices.map((invoice) => ({
        ...invoice,
        customers: customerMap.get(invoice.customer_id) || {
          id: invoice.customer_id,
          name: 'Unknown Customer',
          email: null,
          phone: null,
          address: null,
          city: null,
          country: null
        },
        invoice_items: itemsMap.get(invoice.id) || []
      })) as OptimizedInvoice[];

      const endTime = performance.now();
      console.log(`✅ Invoices loaded in ${(endTime - startTime).toFixed(2)}ms`);

      return {
        invoices: enrichedInvoices,
        totalCount: count || 0,
        hasMore: count ? (page * pageSize) < count : false,
        currentPage: page
      };
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: !!companyId
  });
};

// Hook for invoice statistics
export const useInvoiceStats = (companyId?: string) => {
  return useQuery({
    queryKey: ['invoice-stats', companyId],
    queryFn: async () => {
      console.log('📊 Loading invoice statistics...');

      let query = supabase
        .from('invoices')
        .select(`
          status,
          total_amount,
          paid_amount,
          balance_due
        `);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = (data || []).reduce(
        (acc, invoice) => {
          acc.totalInvoices++;
          acc.totalAmount += invoice.total_amount || 0;
          acc.totalPaid += invoice.paid_amount || 0;
          acc.totalBalance += invoice.balance_due || 0;

          // Count by status
          if (invoice.status === 'draft') acc.draftCount++;
          else if (invoice.status === 'sent') acc.sentCount++;
          else if (invoice.status === 'paid') acc.paidCount++;
          else if (invoice.status === 'partial') acc.partialCount++;
          else if (invoice.status === 'overdue') acc.overdueCount++;

          return acc;
        },
        {
          totalInvoices: 0,
          draftCount: 0,
          sentCount: 0,
          paidCount: 0,
          partialCount: 0,
          overdueCount: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalBalance: 0
        }
      );

      return stats;
    },
    staleTime: 60000, // Cache stats for 1 minute
    refetchOnWindowFocus: false,
    enabled: !!companyId
  });
};

// Helper for invoice status color
export const getInvoiceStatusColor = (status: string) => {
  switch (status) {
    case 'draft':
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
    case 'sent':
      return 'bg-warning-light text-warning border-warning/20';
    case 'paid':
      return 'bg-success-light text-success border-success/20';
    case 'partial':
      return 'bg-primary-light text-primary border-primary/20';
    case 'overdue':
      return 'bg-destructive-light text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
  }
};

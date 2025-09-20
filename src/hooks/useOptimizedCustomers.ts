import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface OptimizedCustomer {
  id: string;
  company_id: string;
  customer_code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  credit_limit?: number;
  payment_terms?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface UseOptimizedCustomersOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  statusFilter?: 'all' | 'active' | 'inactive';
  cityFilter?: string;
  creditLimitFilter?: 'all' | 'with_limit' | 'no_limit';
}

export const useOptimizedCustomers = (
  companyId?: string, 
  options: UseOptimizedCustomersOptions = {}
) => {
  const { 
    page = 1, 
    pageSize = 20, 
    searchTerm = '', 
    statusFilter = 'all',
    cityFilter = 'all',
    creditLimitFilter = 'all'
  } = options;

  return useQuery({
    queryKey: ['customers-optimized', companyId, page, pageSize, searchTerm, statusFilter, cityFilter, creditLimitFilter],
    queryFn: async () => {
      console.log('🔍 Loading customers with optimization...');
      const startTime = performance.now();

      // Start with base query
      let query = supabase
        .from('customers')
        .select(`
          id,
          company_id,
          customer_code,
          name,
          email,
          phone,
          address,
          city,
          state,
          postal_code,
          country,
          credit_limit,
          payment_terms,
          is_active,
          created_at,
          updated_at
        `, { count: 'exact' });

      // Apply company filter
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      // Apply search filter (server-side)
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      // Apply status filter
      if (statusFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false);
      }

      // Apply city filter
      if (cityFilter && cityFilter !== 'all') {
        query = query.eq('city', cityFilter);
      }

      // Apply credit limit filter
      if (creditLimitFilter === 'with_limit') {
        query = query.not('credit_limit', 'is', null);
      } else if (creditLimitFilter === 'no_limit') {
        query = query.is('credit_limit', null);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Order by created_at for consistent pagination
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Customers query failed:', error);
        throw error;
      }

      const endTime = performance.now();
      console.log(`✅ Customers loaded in ${(endTime - startTime).toFixed(2)}ms`);

      return {
        customers: data || [],
        totalCount: count || 0,
        hasMore: count ? (page * pageSize) < count : false,
        currentPage: page
      };
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
    retry: 2
  });
};

// Hook for customer statistics (separate query for better caching)
export const useCustomerStats = (companyId?: string) => {
  return useQuery({
    queryKey: ['customer-stats', companyId],
    queryFn: async () => {
      console.log('📊 Loading customer statistics...');
      
      let query = supabase
        .from('customers')
        .select(`
          credit_limit,
          is_active,
          city
        `);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = (data || []).reduce((acc, customer) => {
        acc.totalCustomers++;
        
        if (customer.is_active !== false) {
          acc.activeCustomers++;
        } else {
          acc.inactiveCustomers++;
        }

        if (customer.credit_limit) {
          acc.customersWithCreditLimit++;
          acc.totalCreditLimit += customer.credit_limit;
        }

        // Track unique cities
        if (customer.city && !acc.cities.includes(customer.city)) {
          acc.cities.push(customer.city);
        }

        return acc;
      }, {
        totalCustomers: 0,
        activeCustomers: 0,
        inactiveCustomers: 0,
        customersWithCreditLimit: 0,
        totalCreditLimit: 0,
        cities: [] as string[]
      });

      return stats;
    },
    staleTime: 60000, // Cache stats for 1 minute
    refetchOnWindowFocus: false
  });
};

// Hook for customer cities (for filter dropdown)
export const useCustomerCities = (companyId?: string) => {
  return useQuery({
    queryKey: ['customer-cities', companyId],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('city')
        .not('city', 'is', null)
        .order('city');

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Get unique cities
      const cities = Array.from(new Set((data || []).map(c => c.city).filter(Boolean))) as string[];
      return cities;
    },
    staleTime: 300000, // Cache cities for 5 minutes
    refetchOnWindowFocus: false
  });
};

// Memoized currency formatter
export const useCurrencyFormatter = () => {
  return useMemo(() => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }, []);
};

// Helper for customer status
export const getCustomerStatusColor = (isActive: boolean) => {
  return isActive 
    ? 'bg-success-light text-success border-success/20'
    : 'bg-muted text-muted-foreground border-muted-foreground/20';
};

// Helper for customer initials
export const getCustomerInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

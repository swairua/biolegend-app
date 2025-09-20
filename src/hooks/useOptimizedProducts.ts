import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useMemo } from 'react';

export interface ProductSearchResult {
  id: string;
  name: string;
  product_code: string;
  unit_of_measure: string;
  unit_price: number;
  selling_price?: number; // For compatibility with invoice creation
  stock_quantity: number;
  category_name?: string;
}

/**
 * Optimized hook for searching products with server-side filtering
 * Uses separate queries to avoid relationship issues
 */
export const useOptimizedProductSearch = (companyId?: string, enabled: boolean = true) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const query = useQuery({
    queryKey: ['products_search', companyId, debouncedSearchTerm],
    queryFn: async () => {
      if (!companyId) return [];

      try {
        // First get products without embedded relationships
        let productsQuery = supabase
          .from('products')
          .select(`
            id,
            name,
            product_code,
            unit_of_measure,
            unit_price,
            selling_price,
            stock_quantity,
            category_id
          `)
          .eq('company_id', companyId)
          .eq('is_active', true);

        // Add search filter if search term exists
        if (debouncedSearchTerm.trim()) {
          const searchPattern = `%${debouncedSearchTerm.trim()}%`;
          productsQuery = productsQuery.or(`name.ilike.${searchPattern},product_code.ilike.${searchPattern}`);
        }

        // Limit results for performance
        productsQuery = productsQuery.limit(50).order('name');

        const { data: products, error: productsError } = await productsQuery;

        if (productsError) {
          console.error('Error searching products:', productsError);
          throw new Error(`Failed to search products: ${productsError.message}`);
        }

        // Get categories separately to avoid relationship issues
        const { data: categories, error: categoriesError } = await supabase
          .from('product_categories')
          .select('id, name')
          .eq('company_id', companyId);

        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError);
          // Don't throw here, just log and continue without categories
        }

        // Create category lookup map
        const categoryMap = new Map();
        (categories || []).forEach(cat => {
          categoryMap.set(cat.id, cat.name);
        });

        // Transform data to include category name and normalize price fields
        const transformedData: ProductSearchResult[] = (products || []).map(product => ({
          id: product.id,
          name: product.name,
          product_code: product.product_code,
          unit_of_measure: product.unit_of_measure || 'pieces',
          unit_price: product.selling_price || product.unit_price || 0,
          // Ensure both price fields are available for compatibility
          selling_price: product.selling_price || product.unit_price || 0,
          stock_quantity: product.stock_quantity || 0,
          category_name: categoryMap.get(product.category_id) || 'Uncategorized'
        }));

        return transformedData;
      } catch (error) {
        console.error('Error in useOptimizedProductSearch:', error);
        throw error;
      }
    },
    enabled: enabled && !!companyId,
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    ...query,
    searchTerm,
    setSearchTerm,
    isSearching: query.isFetching && debouncedSearchTerm.length > 0,
  };
};

/**
 * Optimized hook for loading popular/recent products without search
 * Uses separate queries to avoid relationship issues
 */
export const usePopularProducts = (companyId?: string, limit: number = 20) => {
  return useQuery({
    queryKey: ['popular_products', companyId, limit],
    queryFn: async () => {
      if (!companyId) return [];

      try {
        console.log('Fetching popular products for company:', companyId);

        // Check authentication first
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error('Authentication error:', authError);
          throw new Error(`Authentication failed: ${authError.message}`);
        }
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Get products without embedded relationships first
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            product_code,
            unit_of_measure,
            unit_price,
            selling_price,
            stock_quantity,
            category_id
          `)
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('stock_quantity', { ascending: false })
          .order('name')
          .limit(limit);

        if (productsError) {
          console.error('Error fetching products:', productsError);
          throw new Error(`Failed to fetch products: ${productsError.message || productsError.code || 'Unknown error'}`);
        }

        console.log('Products fetched successfully:', products?.length || 0);

        // Get categories separately
        const { data: categories, error: categoriesError } = await supabase
          .from('product_categories')
          .select('id, name')
          .eq('company_id', companyId);

        if (categoriesError) {
          console.error('Error fetching categories (non-fatal):', categoriesError);
          // Don't throw here, just continue without categories
        }

        console.log('Categories fetched:', categories?.length || 0);

        // Create category lookup map
        const categoryMap = new Map();
        (categories || []).forEach(cat => {
          categoryMap.set(cat.id, cat.name);
        });

        // Transform data
        const transformedData: ProductSearchResult[] = (products || []).map(product => ({
          id: product.id,
          name: product.name,
          product_code: product.product_code,
          unit_of_measure: product.unit_of_measure || 'pieces',
          unit_price: product.selling_price || product.unit_price || 0,
          // Ensure both price fields are available for compatibility
          selling_price: product.selling_price || product.unit_price || 0,
          stock_quantity: product.stock_quantity || 0,
          category_name: categoryMap.get(product.category_id) || 'Uncategorized'
        }));

        console.log('Popular products transformed successfully:', transformedData.length);
        return transformedData;
      } catch (error) {
        console.error('Error in usePopularProducts:', error);
        throw error;
      }
    },
    enabled: !!companyId,
    staleTime: 60000, // Cache for 1 minute
    retry: 3,
    retryDelay: 1000,
  });
};

/**
 * Hook for getting a single product by ID efficiently
 */
export const useProductById = (productId?: string) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;

      try {
        // Get product without embedded relationship
        const { data: product, error: productError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            product_code,
            unit_of_measure,
            unit_price,
            stock_quantity,
            category_id,
            company_id
          `)
          .eq('id', productId)
          .single();

        if (productError) {
          console.error('Error fetching product:', productError);
          throw new Error(`Failed to fetch product: ${productError.message}`);
        }

        // Get category separately if needed
        let categoryName = 'Uncategorized';
        if (product.category_id) {
          const { data: category } = await supabase
            .from('product_categories')
            .select('name')
            .eq('id', product.category_id)
            .single();
          
          if (category) {
            categoryName = category.name;
          }
        }

        return {
          id: product.id,
          name: product.name,
          product_code: product.product_code,
          unit_of_measure: product.unit_of_measure || 'pieces',
          unit_price: product.unit_price || 0,
          // Ensure both price fields are available for compatibility
          selling_price: product.unit_price || 0,
          stock_quantity: product.stock_quantity || 0,
          category_name: categoryName
        } as ProductSearchResult;
      } catch (error) {
        console.error('Error in useProductById:', error);
        throw error;
      }
    },
    enabled: !!productId,
    staleTime: 300000, // Cache for 5 minutes since individual products don't change often
  });
};

// Additional exports needed by OptimizedInventory component
export interface OptimizedProduct {
  id: string;
  name: string;
  product_code: string;
  unit_of_measure: string;
  unit_price: number;
  stock_quantity: number;
  minimum_stock_level?: number;
  selling_price?: number;
  category_name?: string;
  product_categories?: {
    name: string;
  };
}

// Currency formatter hook
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

// Stock status utility hook
export const useStockStatus = (stockQuantity: number, minimumStock: number) => {
  return useMemo(() => {
    if (stockQuantity <= 0) return 'out_of_stock';
    if (stockQuantity <= minimumStock) return 'low_stock';
    return 'in_stock';
  }, [stockQuantity, minimumStock]);
};

// Product categories hook (separate, simple query)
export const useProductCategories = (companyId?: string) => {
  return useQuery({
    queryKey: ['product_categories', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      try {
        const { data, error } = await supabase
          .from('product_categories')
          .select('id, name')
          .eq('company_id', companyId)
          .order('name');

        if (error) {
          console.error('Error fetching categories:', error);
          throw new Error(`Failed to fetch categories: ${error.message}`);
        }

        return data || [];
      } catch (error) {
        console.error('Error in useProductCategories:', error);
        throw error;
      }
    },
    enabled: !!companyId,
    staleTime: 300000, // Cache for 5 minutes
  });
};

// Optimized products hook (alias for useOptimizedProductSearch)
export const useOptimizedProducts = (companyId?: string, options?: any) => {
  const { data: searchResults } = useOptimizedProductSearch(companyId, true);
  const { data: popularProducts } = usePopularProducts(companyId, 50);

  // Return all products (search + popular) for the inventory page
  const allProducts = useMemo(() => {
    const products = searchResults || popularProducts || [];
    return {
      data: products,
      total: products.length,
      page: options?.page || 1,
      pageSize: options?.pageSize || 20
    };
  }, [searchResults, popularProducts, options]);

  return {
    data: allProducts,
    isLoading: false,
    error: null,
    refetch: () => {}
  };
};

// Inventory stats hook
export const useInventoryStats = (companyId?: string) => {
  return useQuery({
    queryKey: ['inventory_stats', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      try {
        const { data, error } = await supabase
          .from('products')
          .select('stock_quantity, minimum_stock_level, unit_price')
          .eq('company_id', companyId)
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching inventory stats:', error);
          throw new Error(`Failed to fetch inventory stats: ${error.message}`);
        }

        const stats = {
          totalItems: data.length,
          lowStockItems: 0,
          outOfStockItems: 0,
          totalValue: 0
        };

        data.forEach(product => {
          const stock = product.stock_quantity || 0;
          const minStock = product.minimum_stock_level || 0;
          const price = product.unit_price || 0;

          if (stock <= 0) stats.outOfStockItems++;
          else if (stock <= minStock) stats.lowStockItems++;

          stats.totalValue += stock * price;
        });

        return stats;
      } catch (error) {
        console.error('Error in useInventoryStats:', error);
        throw error;
      }
    },
    enabled: !!companyId,
    staleTime: 60000, // Cache for 1 minute
  });
};

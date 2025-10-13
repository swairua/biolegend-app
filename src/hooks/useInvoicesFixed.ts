import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fixed hook for fetching invoices with customer data
 * Uses separate queries to avoid relationship ambiguity
 */
export const useInvoicesFixed = (companyId?: string) => {
  return useQuery({
    queryKey: ['invoices_fixed', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      try {
        console.log('Fetching invoices for company:', companyId);

        // Step 1: Get invoices without embedded relationships
        // Try selecting with currency fields; if schema lacks them, fall back
        let { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select(`
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
            lpo_number,
            created_at,
            updated_at,
            currency_code,
            exchange_rate,
            fx_date
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (invoicesError) {
          const msg = (invoicesError.message || '').toLowerCase();
          const missingCurrencyCols = msg.includes('currency_code') || msg.includes('exchange_rate') || msg.includes('fx_date');
          if (missingCurrencyCols) {
            const fallback = await supabase
              .from('invoices')
              .select(`
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
                lpo_number,
                created_at,
                updated_at
              `)
              .eq('company_id', companyId)
              .order('created_at', { ascending: false });
            invoices = fallback.data as any;
            invoicesError = fallback.error as any;
          }
        }

        if (invoicesError) {
          console.error('Error fetching invoices:', invoicesError);
          throw new Error(`Failed to fetch invoices: ${invoicesError.message || String(invoicesError)}`);
        }

        console.log('Invoices fetched successfully:', invoices?.length || 0);

        if (!invoices || invoices.length === 0) {
          return [];
        }

        // Step 2: Get unique customer IDs (filter out invalid UUIDs)
        const customerIds = [...new Set(invoices.map(invoice => invoice.customer_id).filter(id => id && typeof id === 'string' && id.length === 36))];
        console.log('Fetching customer data for IDs:', customerIds.length);

        // Step 3: Get customers separately
        const { data: customers, error: customersError } = customerIds.length > 0 ? await supabase
          .from('customers')
          .select('id, name, email, phone, address, city, country')
          .in('id', customerIds) : { data: [], error: null };

        if (customersError) {
          console.error('Error fetching customers (non-fatal):', customersError);
          // Don't throw here, just continue without customer data
        }

        console.log('Customers fetched:', customers?.length || 0);

        // Step 4: Create customer lookup map
        const customerMap = new Map();
        (customers || []).forEach(customer => {
          customerMap.set(customer.id, customer);
        });

        // Step 5: Get invoice items for each invoice
        // Step 5: Get invoice items for each invoice. Try including product relationship first, then fallback to flat items if that fails.
        let invoiceItems = [];
        let itemsError = null;
        try {
          const resp = await supabase
            .from('invoice_items')
            .select(`
              id,
              invoice_id,
              product_id,
              product_name,
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
            `)
            .in('invoice_id', invoices.map(inv => inv.id));

          invoiceItems = resp.data || [];
          itemsError = resp.error;

          if (itemsError) {
            // Log structured error and attempt a safe fallback without nested products
            console.warn('Invoice items query failed with product relation, retrying without relation:', itemsError.message || JSON.stringify(itemsError));
            const fallback = await supabase
              .from('invoice_items')
              .select(`
                id,
                invoice_id,
                product_id,
              product_name,
              description,
                quantity,
                unit_price,
                discount_before_vat,
                tax_percentage,
                tax_amount,
                tax_inclusive,
                line_total,
                sort_order
              `)
              .in('invoice_id', invoices.map(inv => inv.id));

            invoiceItems = fallback.data || [];
            itemsError = fallback.error;
            if (itemsError) {
              console.error('Error fetching invoice items even after fallback:', itemsError.message || JSON.stringify(itemsError));
            }
          }
        } catch (err) {
          console.error('Unexpected error fetching invoice items:', err && (err.message || JSON.stringify(err)));
        }

        // Step 6: Ensure product fields are present; if relation missing, fetch products by IDs and merge
        try {
          const missingProdIds = [...new Set((invoiceItems || [])
            .filter((it: any) => it.product_id && !it.products)
            .map((it: any) => it.product_id))];
          if (missingProdIds.length > 0) {
            const { data: products, error: prodErr } = await supabase
              .from('products')
              .select('id, name, description, product_code, unit_of_measure')
              .in('id', missingProdIds);
            if (!prodErr && products) {
              const pmap = new Map(products.map(p => [p.id, p]));
              invoiceItems = (invoiceItems || []).map((it: any) => (
                it.products ? it : { ...it, products: pmap.get(it.product_id) }
              ));
            } else if (prodErr) {
              console.warn('Products fetch fallback failed:', prodErr.message || JSON.stringify(prodErr));
            }
          }
        } catch (e) {
          console.warn('Products merge step failed:', (e as any)?.message || String(e));
        }

        // Step 7: Group invoice items by invoice_id
        const itemsMap = new Map();
        (invoiceItems || []).forEach((item: any) => {
          if (!itemsMap.has(item.invoice_id)) {
            itemsMap.set(item.invoice_id, []);
          }
          itemsMap.get(item.invoice_id).push(item);
        });

        // Step 7: Combine data
        const enrichedInvoices = invoices.map(invoice => ({
          ...invoice,
          customers: customerMap.get(invoice.customer_id) || {
            name: 'Unknown Customer',
            email: null,
            phone: null
          },
          invoice_items: itemsMap.get(invoice.id) || []
        }));

        console.log('Invoices enriched successfully:', enrichedInvoices.length);
        return enrichedInvoices;

      } catch (error) {
        console.error('Error in useInvoicesFixed:', error);
        throw error;
      }
    },
    enabled: !!companyId,
    staleTime: 30000, // Cache for 30 seconds
    retry: 3,
    retryDelay: 1000,
  });
};

/**
 * Hook for fetching customer invoices (for a specific customer)
 */
export const useCustomerInvoicesFixed = (customerId?: string, companyId?: string) => {
  return useQuery({
    queryKey: ['customer_invoices_fixed', customerId, companyId],
    queryFn: async () => {
      if (!customerId) return [];

      try {
        console.log('Fetching invoices for customer:', customerId);

        // Get invoices for specific customer
        // Try with currency fields, fallback if missing
        let query = supabase
          .from('invoices')
          .select(`
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
            lpo_number,
            created_at,
            updated_at,
            currency_code,
            exchange_rate,
            fx_date
          `)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (companyId) {
          query = query.eq('company_id', companyId);
        }

        let { data: invoices, error: invoicesError } = await query;

        if (invoicesError) {
          const msg = (invoicesError.message || '').toLowerCase();
          const missingCurrencyCols = msg.includes('currency_code') || msg.includes('exchange_rate') || msg.includes('fx_date');
          if (missingCurrencyCols) {
            const fallbackQuery = supabase
              .from('invoices')
              .select(`
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
                lpo_number,
                created_at,
                updated_at
              `)
              .eq('customer_id', customerId)
              .order('created_at', { ascending: false });
            if (companyId) {
              (fallbackQuery as any).eq('company_id', companyId);
            }
            const fallback = await fallbackQuery;
            invoices = fallback.data as any;
            invoicesError = fallback.error as any;
          }
        }

        if (invoicesError) {
          console.error('Error fetching customer invoices:', invoicesError);
          throw new Error(`Failed to fetch customer invoices: ${invoicesError.message || String(invoicesError)}`);
        }

        if (!invoices || invoices.length === 0) {
          return [];
        }

        // Get customer data
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id, name, email, phone, address, city, country')
          .eq('id', customerId)
          .single();

        if (customerError) {
          console.error('Error fetching customer:', customerError);
        }

             // Get invoice items (try with products relation, then fallback)
        let invoiceItems = [];
        let itemsError = null;
        try {
          const resp = await supabase
            .from('invoice_items')
            .select(`
              id,
              invoice_id,
              product_id,
              product_name,
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
            `)
            .in('invoice_id', invoices.map(inv => inv.id));

          invoiceItems = resp.data || [];
          itemsError = resp.error;

          if (itemsError) {
            console.warn('Invoice items query (customer) failed with product relation, retrying without relation:', itemsError.message || JSON.stringify(itemsError));
            const fallback = await supabase
              .from('invoice_items')
              .select(`
                id,
                invoice_id,
                product_id,
              product_name,
              description,
                quantity,
                unit_price,
                discount_before_vat,
                tax_percentage,
                tax_amount,
                tax_inclusive,
                line_total,
                sort_order
              `)
              .in('invoice_id', invoices.map(inv => inv.id));

            invoiceItems = fallback.data || [];
            itemsError = fallback.error;
            if (itemsError) {
              console.error('Error fetching invoice items (customer) even after fallback:', itemsError.message || JSON.stringify(itemsError));
            }
          }
        } catch (err) {
          console.error('Unexpected error fetching invoice items (customer):', err && (err.message || JSON.stringify(err)));
        }

        // Ensure product fields (fallback join) and group items by invoice
        try {
          const missingProdIds = [...new Set((invoiceItems || [])
            .filter((it: any) => it.product_id && !it.products)
            .map((it: any) => it.product_id))];
          if (missingProdIds.length > 0) {
            const { data: products, error: prodErr } = await supabase
              .from('products')
              .select('id, name, description, product_code, unit_of_measure')
              .in('id', missingProdIds);
            if (!prodErr && products) {
              const pmap = new Map(products.map(p => [p.id, p]));
              invoiceItems = (invoiceItems as any[]).map((it: any) => (
                it.products ? it : { ...it, products: pmap.get(it.product_id) }
              ));
            } else if (prodErr) {
              console.warn('Products fetch fallback (customer) failed:', prodErr.message || JSON.stringify(prodErr));
            }
          }
        } catch (e) {
          console.warn('Products merge step (customer) failed:', (e as any)?.message || String(e));
        }

        const itemsMap = new Map();
        (invoiceItems || []).forEach(item => {
          if (!itemsMap.has(item.invoice_id)) {
            itemsMap.set(item.invoice_id, []);
          }
          itemsMap.get(item.invoice_id).push(item);
        });

        // Combine data
        const enrichedInvoices = invoices.map(invoice => ({
          ...invoice,
          customers: customer || {
            name: 'Unknown Customer',
            email: null,
            phone: null
          },
          invoice_items: itemsMap.get(invoice.id) || []
        }));

        return enrichedInvoices;

      } catch (error) {
        console.error('Error in useCustomerInvoicesFixed:', error);
        throw error;
      }
    },
    enabled: !!customerId,
    staleTime: 30000,
  });
};

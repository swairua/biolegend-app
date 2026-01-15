import { useState, useCallback } from 'react';
import { useCreateProduct } from '@/hooks/useDatabase';
import { toast } from 'sonner';

export interface NewItemData {
  name: string;
  product_code: string;
  selling_price: number;
  description?: string;
}

export interface NewItemWithDefaults extends NewItemData {
  id: string;
  company_id: string;
  unit_of_measure: string;
  cost_price: number;
  stock_quantity: number;
  minimum_stock_level: number;
  is_active: boolean;
  track_inventory: boolean;
}

interface UseNewItemsAutoSaveReturn {
  newItems: NewItemData[];
  addNewItem: (item: NewItemData) => void;
  saveAllNewItems: (companyId: string) => Promise<void>;
  clearNewItems: () => void;
}

/**
 * Hook to manage auto-saving of new items with default attributes
 * Tracks new items created during form submission and saves them with sensible defaults
 */
export const useNewItemsAutoSave = (): UseNewItemsAutoSaveReturn => {
  const [newItems, setNewItems] = useState<NewItemData[]>([]);
  const createProduct = useCreateProduct();

  const addNewItem = useCallback((item: NewItemData) => {
    // Check if item already exists
    const exists = newItems.some(
      (existing) => existing.product_code.toLowerCase() === item.product_code.toLowerCase()
    );

    if (exists) {
      console.warn('Item already queued for creation:', item.product_code);
      return;
    }

    setNewItems((prev) => [...prev, item]);
  }, [newItems]);

  const saveAllNewItems = useCallback(
    async (companyId: string) => {
      if (newItems.length === 0) return;

      const promises = newItems.map(async (item) => {
        try {
          // Create product with default attributes
          const productData = {
            company_id: companyId,
            name: item.name,
            product_code: item.product_code,
            description: item.description || '',
            selling_price: item.selling_price,
            unit_of_measure: 'pieces', // Default unit of measure
            cost_price: item.selling_price * 0.7, // Default to 70% of selling price
            stock_quantity: 0, // Start with 0 stock
            minimum_stock_level: 10, // Default minimum stock
            is_active: true,
            track_inventory: true, // Track inventory by default
          };

          await createProduct.mutateAsync(productData);
          console.log(`Product "${item.name}" saved successfully`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Failed to save product "${item.name}":`, message);
          throw error;
        }
      });

      try {
        await Promise.all(promises);
        toast.success(`${newItems.length} new product(s) saved to inventory`);
        setNewItems([]);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to save some products: ${message}`);
        // Don't clear items on error - let user retry
      }
    },
    [newItems, createProduct]
  );

  const clearNewItems = useCallback(() => {
    setNewItems([]);
  }, []);

  return {
    newItems,
    addNewItem,
    saveAllNewItems,
    clearNewItems,
  };
};

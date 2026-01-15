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

interface SavedProduct {
  tempId: string;
  actualId: string;
  product_code: string;
  name: string;
}

interface UseNewItemsAutoSaveReturn {
  newItems: NewItemData[];
  tempIdToActualIdMap: Map<string, string>;
  addNewItem: (item: NewItemData, tempId: string) => void;
  saveAllNewItems: (companyId: string) => Promise<SavedProduct[]>;
  clearNewItems: () => void;
}

/**
 * Hook to manage auto-saving of new items with default attributes
 * Tracks new items created during form submission and saves them with sensible defaults
 */
export const useNewItemsAutoSave = (): UseNewItemsAutoSaveReturn => {
  const [newItems, setNewItems] = useState<NewItemData[]>([]);
  const [tempIdMap, setTempIdMap] = useState<Map<string, NewItemData>>(new Map());
  const [tempIdToActualIdMap, setTempIdToActualIdMap] = useState<Map<string, string>>(new Map());
  const createProduct = useCreateProduct();

  const addNewItem = useCallback((item: NewItemData, tempId: string) => {
    // Check if item already exists
    const exists = newItems.some(
      (existing) => existing.product_code.toLowerCase() === item.product_code.toLowerCase()
    );

    if (exists) {
      console.warn('Item already queued for creation:', item.product_code);
      return;
    }

    setNewItems((prev) => [...prev, item]);
    setTempIdMap((prev) => new Map(prev).set(tempId, item));
  }, [newItems]);

  const saveAllNewItems = useCallback(
    async (companyId: string): Promise<SavedProduct[]> => {
      if (newItems.length === 0) return [];

      const savedProducts: SavedProduct[] = [];
      const promises = newItems.map(async (item, index) => {
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

          const createdProduct = await createProduct.mutateAsync(productData);
          console.log(`Product "${item.name}" saved successfully with ID: ${createdProduct.id}`);

          // Find the temp ID for this product
          let tempId = '';
          tempIdMap.forEach((value, key) => {
            if (value.product_code === item.product_code) {
              tempId = key;
            }
          });

          const savedProduct = {
            tempId: tempId || `new-${index}`,
            actualId: createdProduct.id,
            product_code: item.product_code,
            name: item.name,
          };

          savedProducts.push(savedProduct);
          setTempIdToActualIdMap((prev) => new Map(prev).set(tempId, createdProduct.id));

          return savedProduct;
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
        setTempIdMap(new Map());
        return savedProducts;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to save some products: ${message}`);
        // Don't clear items on error - let user retry
        throw error;
      }
    },
    [newItems, createProduct, tempIdMap]
  );

  const clearNewItems = useCallback(() => {
    setNewItems([]);
    setTempIdMap(new Map());
    setTempIdToActualIdMap(new Map());
  }, []);

  return {
    newItems,
    tempIdToActualIdMap,
    addNewItem,
    saveAllNewItems,
    clearNewItems,
  };
};

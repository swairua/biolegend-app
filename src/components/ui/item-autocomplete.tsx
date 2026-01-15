import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface AutocompleteItem {
  id: string;
  name: string;
  product_code?: string;
  selling_price?: number;
  unit_price?: number;
  stock_quantity?: number;
  description?: string;
  category_name?: string;
}

export interface NewItemData {
  name: string;
  product_code: string;
  selling_price: number;
  description?: string;
}

interface ItemAutocompleteProps {
  items: AutocompleteItem[];
  isLoading?: boolean;
  onSelectItem: (item: AutocompleteItem) => void;
  onCreateNewItem?: (item: NewItemData) => Promise<AutocompleteItem>;
  placeholder?: string;
  allowNew?: boolean;
  showPrices?: boolean;
}

export function ItemAutocomplete({
  items,
  isLoading = false,
  onSelectItem,
  onCreateNewItem,
  placeholder = 'Search products...',
  allowNew = true,
  showPrices = true,
}: ItemAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newItemData, setNewItemData] = useState<NewItemData>({
    name: '',
    product_code: '',
    selling_price: 0,
    description: '',
  });
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter items based on search term
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.product_code?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Show "Create new item" option if search term doesn't match any items
  const showCreateOption = allowNew && searchTerm.trim().length > 0 && filteredItems.length === 0;

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectItem = (item: AutocompleteItem) => {
    onSelectItem(item);
    setSearchTerm('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleCreateNew = async () => {
    if (!newItemData.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    if (!newItemData.product_code.trim()) {
      toast.error('Please enter a product code');
      return;
    }

    if (newItemData.selling_price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (!onCreateNewItem) {
      toast.error('Unable to create new items');
      return;
    }

    setIsSubmittingNew(true);
    try {
      const createdItem = await onCreateNewItem(newItemData);
      toast.success(`Product "${newItemData.name}" created successfully`);
      
      // Select the newly created item
      handleSelectItem(createdItem);
      
      // Reset form
      setNewItemData({
        name: '',
        product_code: '',
        selling_price: 0,
        description: '',
      });
      setIsCreatingNew(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create product';
      toast.error(`Error: ${message}`);
      console.error('Error creating new item:', error);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative" ref={containerRef}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="pl-10"
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg bg-white shadow-lg z-50 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : filteredItems.length === 0 && !showCreateOption ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchTerm ? 'No products found' : 'Start typing to search...'}
              </div>
            ) : (
              <>
                {/* Existing Items */}
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-smooth"
                    onClick={() => handleSelectItem(item)}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{item.product_code}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                        )}
                      </div>
                      {showPrices && (
                        <div className="text-right">
                          {item.selling_price !== undefined && (
                            <div className="text-sm font-semibold">KES {item.selling_price.toFixed(2)}</div>
                          )}
                          {item.stock_quantity !== undefined && (
                            <div className="text-xs text-muted-foreground">Stock: {item.stock_quantity}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Create New Option */}
                {showCreateOption && (
                  <div
                    className="p-3 hover:bg-muted/50 cursor-pointer border-t bg-blue-50"
                    onClick={() => setIsCreatingNew(true)}
                  >
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <Plus className="h-4 w-4" />
                      Create new product: "{searchTerm}"
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Create New Item Dialog */}
      {isCreatingNew && (
        <Dialog open={isCreatingNew} onOpenChange={setIsCreatingNew}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Product</DialogTitle>
              <DialogDescription>
                Add a new product to your inventory
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Product Name */}
              <div className="space-y-2">
                <Label htmlFor="new-product-name">Product Name *</Label>
                <Input
                  id="new-product-name"
                  placeholder="Enter product name"
                  value={newItemData.name}
                  onChange={(e) =>
                    setNewItemData({ ...newItemData, name: e.target.value })
                  }
                  disabled={isSubmittingNew}
                />
              </div>

              {/* Product Code */}
              <div className="space-y-2">
                <Label htmlFor="new-product-code">Product Code *</Label>
                <Input
                  id="new-product-code"
                  placeholder="Enter unique product code"
                  value={newItemData.product_code}
                  onChange={(e) =>
                    setNewItemData({ ...newItemData, product_code: e.target.value })
                  }
                  disabled={isSubmittingNew}
                />
              </div>

              {/* Selling Price */}
              <div className="space-y-2">
                <Label htmlFor="new-product-price">Selling Price (KES) *</Label>
                <Input
                  id="new-product-price"
                  type="number"
                  placeholder="Enter selling price"
                  value={newItemData.selling_price || ''}
                  onChange={(e) =>
                    setNewItemData({
                      ...newItemData,
                      selling_price: parseFloat(e.target.value) || 0,
                    })
                  }
                  step="0.01"
                  min="0"
                  disabled={isSubmittingNew}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="new-product-desc">Description (Optional)</Label>
                <Input
                  id="new-product-desc"
                  placeholder="Product description"
                  value={newItemData.description || ''}
                  onChange={(e) =>
                    setNewItemData({ ...newItemData, description: e.target.value })
                  }
                  disabled={isSubmittingNew}
                />
              </div>

              {/* Info Alert */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  This product will be saved to your inventory when you submit the form.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreatingNew(false)}
                disabled={isSubmittingNew}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNew}
                disabled={isSubmittingNew || !newItemData.name || !newItemData.product_code || newItemData.selling_price <= 0}
              >
                {isSubmittingNew ? 'Creating...' : 'Create & Use'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

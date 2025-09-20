import { useState, useEffect } from 'react';
import { useUpdateProduct } from '@/hooks/useDatabase';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Edit, Plus } from 'lucide-react';
import { CreateCategoryModalBasic } from '@/components/categories/CreateCategoryModalBasic';

interface InventoryItem {
  id?: string;
  name: string;
  product_code: string;
  description?: string;
  category_id?: string;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  max_stock_level?: number;
}

interface ProductCategory {
  id: string;
  name: string;
  description?: string;
}

interface EditInventoryItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  item: InventoryItem | null;
}

export function EditInventoryItemModal({ open, onOpenChange, onSuccess, item }: EditInventoryItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    product_code: '',
    description: '',
    category_id: '',
    unit_of_measure: 'pieces',
    cost_price: 0,
    selling_price: 0,
    stock_quantity: 0,
    min_stock_level: 10,
    max_stock_level: 100
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const updateProduct = useUpdateProduct();

  // Fetch product categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['product_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as ProductCategory[];
    },
  });

  // Populate form with existing item data when modal opens
  useEffect(() => {
    if (item && open) {
      console.log('Populating form with item data:', item);
      setFormData({
        name: item.name || '',
        product_code: item.product_code || '',
        description: item.description || '',
        category_id: item.category_id || '',
        unit_of_measure: item.unit_of_measure || 'pieces',
        cost_price: Number(item.cost_price) || 0,
        selling_price: Number(item.selling_price) || 0,
        stock_quantity: Number(item.stock_quantity) || 0,
        min_stock_level: Number(item.min_stock_level) || 10,
        max_stock_level: Number(item.max_stock_level) || 100
      });
    }
  }, [item, open]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!formData.product_code.trim()) {
      toast.error('Product code is required');
      return;
    }

    if (formData.selling_price <= 0) {
      toast.error('Selling price must be greater than 0');
      return;
    }

    if (formData.min_stock_level < 0) {
      toast.error('Minimum stock level cannot be negative');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!item?.id) {
        throw new Error('Product ID is missing');
      }

      const updatedData = {
        id: item.id,
        name: formData.name,
        product_code: formData.product_code,
        description: formData.description,
        category_id: formData.category_id,
        unit_of_measure: formData.unit_of_measure,
        cost_price: Number(formData.cost_price),
        selling_price: Number(formData.selling_price),
        stock_quantity: Number(formData.stock_quantity),
        minimum_stock_level: Number(formData.min_stock_level),
        maximum_stock_level: Number(formData.max_stock_level)
      };

      console.log('Updating product with data:', updatedData);

      await updateProduct.mutateAsync(updatedData);

      toast.success(`${formData.name} updated successfully!`);
      onSuccess();
      onOpenChange(false);

    } catch (error) {
      console.error('Error updating product:', error);

      let errorMessage = 'Failed to update product. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        const supabaseError = error as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details;
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryCreated = (categoryId: string) => {
    handleInputChange('category_id', categoryId);
    setShowCreateCategory(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      product_code: '',
      description: '',
      category_id: '',
      unit_of_measure: 'pieces',
      cost_price: 0,
      selling_price: 0,
      stock_quantity: 0,
      min_stock_level: 10,
      max_stock_level: 100
    });
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Inventory Item
          </DialogTitle>
          <DialogDescription>
            Update the details for {item.name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter product name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_code">Product Code *</Label>
              <Input
                id="product_code"
                value={formData.product_code}
                onChange={(e) => handleInputChange('product_code', e.target.value)}
                placeholder="Enter product code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter product description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="category">Category</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateCategory(true)}
                  className="h-auto p-1 text-xs text-primary hover:text-primary/80"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create New
                </Button>
              </div>
              <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesLoading ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading categories...</div>
                  ) : categories && categories.length > 0 ? (
                    categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No categories available</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_of_measure">Unit of Measure</Label>
              <Select value={formData.unit_of_measure} onValueChange={(value) => handleInputChange('unit_of_measure', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pieces">Pieces</SelectItem>
                  <SelectItem value="kg">Kilograms</SelectItem>
                  <SelectItem value="g">Grams</SelectItem>
                  <SelectItem value="l">Liters</SelectItem>
                  <SelectItem value="ml">Milliliters</SelectItem>
                  <SelectItem value="m">Meters</SelectItem>
                  <SelectItem value="cm">Centimeters</SelectItem>
                  <SelectItem value="boxes">Boxes</SelectItem>
                  <SelectItem value="packs">Packs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing and Stock Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost_price">Cost Price</Label>
                <Input
                  id="cost_price"
                  type="number"
                  value={formData.cost_price}
                  onChange={(e) => handleInputChange('cost_price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price *</Label>
                <Input
                  id="selling_price"
                  type="number"
                  value={formData.selling_price}
                  onChange={(e) => handleInputChange('selling_price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Current Stock Quantity</Label>
              <Input
                id="stock_quantity"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => handleInputChange('stock_quantity', parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_stock_level">Min Stock Level</Label>
                <Input
                  id="min_stock_level"
                  type="number"
                  value={formData.min_stock_level}
                  onChange={(e) => handleInputChange('min_stock_level', parseInt(e.target.value) || 0)}
                  placeholder="10"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_stock_level">Max Stock Level</Label>
                <Input
                  id="max_stock_level"
                  type="number"
                  value={formData.max_stock_level}
                  onChange={(e) => handleInputChange('max_stock_level', parseInt(e.target.value) || 0)}
                  placeholder="100"
                  min="0"
                />
              </div>
            </div>

          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Item'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <CreateCategoryModalBasic
        open={showCreateCategory}
        onOpenChange={setShowCreateCategory}
        onSuccess={handleCategoryCreated}
      />
    </Dialog>
  );
}

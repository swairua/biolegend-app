import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag, Plus, Palette, Hash, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

interface CreateCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (categoryId: string) => void;
}

interface CategoryData {
  name: string;
  description: string;
  parent_id: string;
  category_code: string;
  color: string;
  sort_order: number;
}

export function CreateCategoryModal({ open, onOpenChange, onSuccess }: CreateCategoryModalProps) {
  const [formData, setFormData] = useState<CategoryData>({
    name: '',
    description: '',
    parent_id: '',
    category_code: '',
    color: '#3B82F6', // Default blue color
    sort_order: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentCompany } = useCurrentCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch existing categories for parent selection
  const { data: categories } = useQuery({
    queryKey: ['product_categories', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, parent_id')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id && open,
  });

  // Auto-generate category code when name changes
  useEffect(() => {
    if (formData.name && !formData.category_code) {
      const code = formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 6) + '-' + Date.now().toString().slice(-4);
      setFormData(prev => ({ ...prev, category_code: code }));
    }
  }, [formData.name, formData.category_code]);

  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: CategoryData) => {
      console.log('🚀 Starting category creation with data:', categoryData);

      if (!currentCompany?.id) {
        throw new Error('Company not found. Please refresh and try again.');
      }

      if (!user?.id) {
        throw new Error('User not authenticated. Please sign in again.');
      }

      try {
        // Get next sort order
        console.log('📊 Getting next sort order for company:', currentCompany.id);
        const { data: maxSortData, error: sortError } = await supabase
          .from('product_categories')
          .select('sort_order')
          .eq('company_id', currentCompany.id)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle to avoid error if no records exist

        if (sortError) {
          console.error('❌ Error getting sort order:', sortError);
          throw sortError;
        }

        const nextSortOrder = (maxSortData?.sort_order || 0) + 10;
        console.log('📈 Next sort order:', nextSortOrder);

        const insertData = {
          company_id: currentCompany.id,
          name: categoryData.name.trim(),
          description: categoryData.description.trim() || null,
          parent_id: (categoryData.parent_id && categoryData.parent_id !== 'none') ? categoryData.parent_id : null,
          category_code: categoryData.category_code.trim() || null,
          color: categoryData.color || null,
          sort_order: categoryData.sort_order || nextSortOrder,
          created_by: user.id,
          updated_by: user.id,
          is_active: true
        };

        console.log('💾 Inserting category data:', insertData);

        const { data, error } = await supabase
          .from('product_categories')
          .insert(insertData)
          .select('id, name, description, category_code, color')
          .single();

        if (error) {
          console.error('❌ Supabase insert error:', error);
          throw error;
        }

        console.log('✅ Category created successfully:', data);
        return data;
      } catch (error) {
        console.error('❌ Mutation function error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product_categories'] });
      toast.success(`Category "${data.name}" created successfully!`);
      onSuccess?.(data.id);
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      let errorMessage = 'Failed to create category. Please try again.';

      try {
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error && typeof error === 'object') {
          const supabaseError = error as any;

          // Check for specific Supabase error patterns
          if (supabaseError.message) {
            errorMessage = supabaseError.message;
          } else if (supabaseError.details) {
            errorMessage = supabaseError.details;
          } else if (supabaseError.hint) {
            errorMessage = supabaseError.hint;
          } else if (supabaseError.code) {
            // Handle specific error codes
            switch (supabaseError.code) {
              case '23505':
                errorMessage = 'A category with this name or code already exists.';
                break;
              case '23503':
                errorMessage = 'Invalid parent category selected.';
                break;
              case '42703':
                errorMessage = 'Database column is missing. Please apply the category migration first.';
                break;
              case '42P01':
                errorMessage = 'Category table not found. Please check your database setup.';
                break;
              default:
                errorMessage = `Database error (${supabaseError.code}): ${supabaseError.message || 'Unknown error'}`;
            }
          } else {
            // Fallback for other object types
            errorMessage = error.toString() !== '[object Object]' ? error.toString() : 'Unknown error occurred';
          }
        }
      } catch (parseError) {
        console.error('Error parsing error message:', parseError);
        errorMessage = 'Failed to create category. Please check the console for details.';
      }

      toast.error(errorMessage, {
        duration: 6000,
        description: 'Check the console for technical details'
      });
    }
  });

  const handleInputChange = (field: keyof CategoryData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    if (formData.name.trim().length < 2) {
      toast.error('Category name must be at least 2 characters long');
      return;
    }

    if (!currentCompany?.id) {
      toast.error('No company found. Please refresh the page and try again.');
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in to create categories.');
      return;
    }

    // Validate color format if provided
    if (formData.color && !/^#[0-9A-F]{6}$/i.test(formData.color)) {
      toast.error('Color must be a valid hex code (e.g., #FF0000)');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Submitting category data:', formData);
      await createCategoryMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Submit error:', error);
      // Error is already handled by the mutation's onError
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parent_id: '',
      category_code: '',
      color: '#3B82F6',
      sort_order: 0
    });
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Tag className="h-5 w-5 text-primary" />
            <span>Create New Category</span>
          </DialogTitle>
          <DialogDescription>
            Add a new product category to organize your inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name *</Label>
                <Input
                  id="category-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Medical Equipment"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                  id="category-description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional description for this category"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {formData.description.length}/500
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent-category">Parent Category</Label>
                <Select value={formData.parent_id || 'none'} onValueChange={(value) => handleInputChange('parent_id', value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top Level)</SelectItem>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Advanced Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category-code">Category Code</Label>
                  <Input
                    id="category-code"
                    value={formData.category_code}
                    onChange={(e) => handleInputChange('category_code', e.target.value)}
                    placeholder="Auto-generated"
                    maxLength={50}
                  />
                  <div className="text-xs text-muted-foreground">
                    Unique code for this category
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort-order">Sort Order</Label>
                  <Input
                    id="sort-order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                  />
                  <div className="text-xs text-muted-foreground">
                    Lower numbers appear first
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-color" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Category Color
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="category-color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    className="w-20 h-10 p-1 border rounded"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    placeholder="#3B82F6"
                    maxLength={7}
                    className="flex-1"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Color for visual categorization in reports and displays
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !formData.name.trim() || formData.name.trim().length < 2}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Creating...' : 'Create Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

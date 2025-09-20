import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/contexts/CompanyContext';
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
import { Tag, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateCategoryModalBasicProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (categoryId: string) => void;
}

interface BasicCategoryData {
  name: string;
  description: string;
}

export function CreateCategoryModalBasic({ open, onOpenChange, onSuccess }: CreateCategoryModalBasicProps) {
  const [formData, setFormData] = useState<BasicCategoryData>({
    name: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentCompany } = useCurrentCompany();
  const queryClient = useQueryClient();

  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: BasicCategoryData) => {
      console.log('🚀 Creating basic category with data:', categoryData);
      
      if (!currentCompany?.id) {
        throw new Error('Company not found. Please refresh and try again.');
      }

      // Use only the basic columns that definitely exist
      const insertData = {
        company_id: currentCompany.id,
        name: categoryData.name.trim(),
        description: categoryData.description.trim() || null,
        is_active: true
      };

      console.log('💾 Inserting basic category data:', insertData);

      const { data, error } = await supabase
        .from('product_categories')
        .insert(insertData)
        .select('id, name, description')
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }

      console.log('✅ Basic category created successfully:', data);
      return data;
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
          
          if (supabaseError.message) {
            errorMessage = supabaseError.message;
          } else if (supabaseError.details) {
            errorMessage = supabaseError.details;
          } else if (supabaseError.code) {
            switch (supabaseError.code) {
              case '23505':
                errorMessage = 'A category with this name already exists.';
                break;
              case '42703':
                errorMessage = 'Database schema issue. Please contact support.';
                break;
              case '42P01':
                errorMessage = 'Category table not found. Please check your database setup.';
                break;
              default:
                errorMessage = `Database error: ${supabaseError.message || 'Unknown error'}`;
            }
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

  const handleInputChange = (field: keyof BasicCategoryData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
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

    setIsSubmitting(true);
    try {
      console.log('Submitting basic category data:', formData);
      await createCategoryMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Tag className="h-5 w-5 text-primary" />
            <span>Create New Category</span>
          </DialogTitle>
          <DialogDescription>
            Add a new product category to organize your inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

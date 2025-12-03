import { useState, useEffect } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Trash2, 
  Search,
  Calculator,
  Receipt,
  Edit
} from 'lucide-react';
import { useCustomers, useProducts, useTaxSettings } from '@/hooks/useDatabase';
import { useUpdateProforma, type ProformaItem as BaseProformaItem } from '@/hooks/useProforma';
import { calculateItemTax, calculateDocumentTotals, formatCurrency, type TaxableItem } from '@/utils/taxCalculation';
import { ProformaUpdateErrorHandler } from './ProformaUpdateErrorHandler';
import { toast } from 'sonner';

interface ProformaItem extends BaseProformaItem {
  // Extends the base ProformaItem with any additional UI-specific fields if needed
}

interface Proforma {
  id: string;
  proforma_number: string;
  customer_id: string;
  proforma_date: string;
  valid_until: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  terms_and_conditions?: string;
  customers?: {
    name: string;
    email?: string;
  };
  proforma_items?: ProformaItem[];
}

interface EditProformaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proforma: Proforma | null;
  onSuccess?: () => void;
  companyId?: string;
}

export const EditProformaModal = ({ 
  open, 
  onOpenChange, 
  proforma,
  onSuccess,
  companyId = '550e8400-e29b-41d4-a716-446655440000' 
}: EditProformaModalProps) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    proforma_date: '',
    valid_until: '',
    notes: '',
    terms_and_conditions: '',
    status: 'draft',
  });

  const [items, setItems] = useState<ProformaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [updateError, setUpdateError] = useState<string>('');

  const { data: customers } = useCustomers(companyId);
  const { data: products } = useProducts(companyId);
  const { data: taxSettings } = useTaxSettings(companyId);
  const updateProforma = useUpdateProforma();

  const defaultTaxRate = taxSettings?.find(t => t.is_default)?.rate || 0;

  // Populate form when proforma changes
  useEffect(() => {
    if (proforma && open) {
      console.log('📋 EditProformaModal opened with proforma:', {
        id: proforma.id,
        number: proforma.proforma_number,
        itemCount: proforma.proforma_items?.length
      });

      setFormData({
        customer_id: proforma.customer_id,
        proforma_date: proforma.proforma_date,
        valid_until: proforma.valid_until,
        notes: proforma.notes || '',
        terms_and_conditions: proforma.terms_and_conditions || '',
        status: proforma.status,
      });

      if (proforma.proforma_items && proforma.proforma_items.length > 0) {
        console.log('Loading items from proforma:', {
          count: proforma.proforma_items.length,
          items: proforma.proforma_items.map(i => ({ id: i.id, product: i.product_name, qty: i.quantity }))
        });

        // Deduplicate by ID in case there are duplicates from server
        const seenIds = new Set<string>();
        const uniqueItems = proforma.proforma_items.filter(item => {
          if (seenIds.has(item.id)) {
            console.warn('⚠️ Duplicate item detected:', item.id);
            return false;
          }
          seenIds.add(item.id);
          return true;
        });

        const mappedItems = uniqueItems.map(item => {
          const proformaItem: ProformaItem = {
            id: item.id || `item-${Date.now()}-${Math.random()}`,
            product_id: item.product_id,
            product_name: item.product_name || '',
            description: item.description || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percentage: item.discount_percentage || 0,
            discount_amount: item.discount_amount || 0,
            tax_percentage: item.tax_percentage,
            tax_amount: item.tax_amount || 0,
            tax_inclusive: item.tax_inclusive || false,
            line_total: item.line_total || 0,
          };

          // Recalculate tax to ensure consistency with new logic
          const calculated = calculateItemTax(proformaItem);
          return {
            ...proformaItem,
            base_amount: calculated.base_amount,
            discount_total: calculated.discount_total,
            taxable_amount: calculated.taxable_amount,
            tax_amount: calculated.tax_amount,
            line_total: calculated.line_total,
          };
        });
        console.log('✅ Mapped items:', mappedItems.map(i => ({ id: i.id, product: i.product_name })));
        setItems(mappedItems);
      } else {
        console.log('ℹ️ No items in proforma');
        setItems([]);
      }
    }
  }, [proforma?.id, open]);

  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItem = (product: any) => {
    // Check if product already exists in items
    const existingItem = items.find(item => item.product_id === product.id);

    if (existingItem) {
      // Increase quantity for existing product
      updateItem(existingItem.id, 'quantity', existingItem.quantity + 1);
      toast.info(`Quantity increased for ${product.name}`);
    } else {
      // Add new item
      const newItem: ProformaItem = {
        id: `item-${Date.now()}-${Math.random()}`,
        product_id: product.id,
        product_name: product.name,
        description: product.description || '',
        quantity: 1,
        unit_price: product.selling_price,
        discount_percentage: 0,
        discount_amount: 0,
        tax_percentage: defaultTaxRate,
        tax_amount: 0,
        tax_inclusive: false,
        line_total: 0,
      };

      // Calculate tax and totals using proper utility
      const calculated = calculateItemTax(newItem);
      const updatedItem: ProformaItem = {
        ...newItem,
        tax_amount: calculated.tax_amount,
        line_total: calculated.line_total,
      };

      setItems(prev => [...prev, updatedItem]);
      toast.success(`${product.name} added to proforma`);
    }

    setShowProductSearch(false);
    setSearchTerm('');
  };

  const updateItem = (id: string, field: keyof ProformaItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        let updatedItem = { ...item, [field]: value };

        // Auto-apply default tax rate when tax_inclusive is checked and no tax is set
        if (field === 'tax_inclusive' && value && item.tax_percentage === 0) {
          updatedItem.tax_percentage = defaultTaxRate;
        }

        // Recalculate using proper tax utility
        const calculated = calculateItemTax(updatedItem);
        return {
          ...updatedItem,
          base_amount: calculated.base_amount,
          discount_total: calculated.discount_total,
          taxable_amount: calculated.taxable_amount,
          tax_amount: calculated.tax_amount,
          line_total: calculated.line_total,
        };
      }
      return item;
    }));
  };


  const removeItem = (id: string) => {
    console.log('🗑️ DELETE CLICKED', { id, currentItemsCount: items.length });
    console.log('Items before delete:', items.map(i => ({ id: i.id, product: i.product_name })));

    setItems(prev => {
      const itemToDelete = prev.find(item => item.id === id);
      const filtered = prev.filter(item => {
        const keep = item.id !== id;
        console.log(`Comparing item ${item.id} with ${id}: keep=${keep}`);
        return keep;
      });
      console.log(`✅ Items after delete: ${filtered.length} items (was ${prev.length})`);

      // Show success toast for deleted item
      if (itemToDelete) {
        toast.success(`${itemToDelete.product_name} removed from proforma`);
      }

      return filtered;
    });
  };

  const calculateTotals = () => {
    const taxableItems: TaxableItem[] = items.map(item => ({
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_percentage: item.tax_percentage,
      tax_inclusive: item.tax_inclusive,
      discount_percentage: item.discount_percentage,
      discount_amount: item.discount_amount,
    }));

    return calculateDocumentTotals(taxableItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setUpdateError(''); // Clear previous errors

    try {
      if (!proforma.id) {
        toast.error('Proforma ID is missing - cannot update');
        return;
      }

      const totals = calculateTotals();

      // Update proforma using the hook
      const updatedProformaData = {
        customer_id: formData.customer_id,
        proforma_date: formData.proforma_date,
        valid_until: formData.valid_until,
        status: formData.status,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_total,
        total_amount: totals.total_amount,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
      };

      console.log('🔄 SUBMITTING PROFORMA UPDATE', {
        proformaId: proforma.id,
        proformaNumber: proforma.proforma_number,
        itemCount: items.length,
        items: items.map(i => ({ id: i.id, product: i.product_name, qty: i.quantity, price: i.unit_price })),
        totals: {
          subtotal: totals.subtotal,
          tax: totals.tax_total,
          total: totals.total_amount
        }
      });
      console.log('Update data:', updatedProformaData);

      console.log('⏳ Sending update to server...');
      const result = await updateProforma.mutateAsync({
        proformaId: proforma.id,
        proforma: updatedProformaData,
        items: items
      });

      console.log('✅ Update successful, calling onSuccess callback');

      // Show explicit success toast after mutation completes
      toast.success(`Proforma invoice ${proforma.proforma_number} updated successfully!`);

      // Call parent's onSuccess callback after mutation completes and cache is updated
      if (onSuccess) {
        console.log('⏳ Parent onSuccess callback starting (refetch)...');
        await onSuccess();
        console.log('✅ Parent onSuccess callback complete');
      }

      console.log('🚪 Closing modal');
      handleClose();
    } catch (error) {
      console.error('Error updating proforma:', error);

      // Set error state for the error handler component
      const errorMessage = error instanceof Error ? error.message : String(error);
      setUpdateError(errorMessage);

      // Also show a toast for immediate feedback
      if (errorMessage.includes('company mismatch') || errorMessage.includes('Access denied')) {
        toast.error('Permission denied: You can only edit proformas from your company');
      } else if (errorMessage.includes('not found')) {
        toast.error('Proforma not found or has been deleted');
      } else if (errorMessage.includes('check permissions')) {
        toast.error('Update failed: Please check your permissions and try again');
      } else {
        toast.error(`Failed to update proforma: ${errorMessage}`);
      }
    }
  };

  const handleClose = () => {
    console.log('Closing edit modal');
    setSearchTerm('');
    setShowProductSearch(false);
    setUpdateError('');
    setItems([]);
    setFormData({
      customer_id: '',
      proforma_date: '',
      valid_until: '',
      notes: '',
      terms_and_conditions: '',
      status: 'draft',
    });
    onOpenChange(false);
  };

  const totals = calculateTotals();

  if (!proforma) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Proforma Invoice #{proforma.proforma_number}
          </DialogTitle>
          <DialogDescription>
            Update proforma invoice details and items
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Handler */}
          {updateError && proforma && (
            <ProformaUpdateErrorHandler
              error={updateError}
              proformaId={proforma.id}
              onRetry={() => {
                setUpdateError('');
                handleSubmit(new Event('submit') as any);
              }}
              onDismiss={() => setUpdateError('')}
            />
          )}

          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proforma_number">Proforma Number</Label>
              <Input
                id="proforma_number"
                value={proforma.proforma_number}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_id">Customer *</Label>
              <Select value={formData.customer_id} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, customer_id: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, status: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proforma_date">Proforma Date</Label>
              <Input
                id="proforma_date"
                type="date"
                value={formData.proforma_date}
                onChange={(e) => setFormData(prev => ({ ...prev, proforma_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid_until">Valid Until</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
              />
            </div>
          </div>

          {/* Items Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Items
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProductSearch(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showProductSearch && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Add Product</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search products..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {filteredProducts?.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/50"
                            onClick={() => addItem(product)}
                          >
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.product_code} • ${product.selling_price}
                              </p>
                            </div>
                            <Button size="sm" variant="ghost">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowProductSearch(false)}
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items added yet. Click "Add Item" to start.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>VAT %</TableHead>
                      <TableHead>Tax Type</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Description"
                            className="min-w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.tax_percentage}
                            onChange={(e) => updateItem(item.id, 'tax_percentage', parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={item.tax_inclusive}
                              onCheckedChange={(checked) => updateItem(item.id, 'tax_inclusive', checked)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {item.tax_inclusive ? 'Incl.' : 'Excl.'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(item.line_total)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              console.log('Delete button clicked', e);
                              e.preventDefault();
                              e.stopPropagation();
                              removeItem(item.id);
                            }}
                            className="hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Totals */}
              {items.length > 0 && (
                <div className="mt-6 space-y-2 max-w-sm ml-auto">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(totals.tax_total)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(totals.total_amount)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Internal notes..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terms_and_conditions">Terms & Conditions</Label>
              <Textarea
                id="terms_and_conditions"
                value={formData.terms_and_conditions}
                onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                placeholder="Terms and conditions..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.customer_id || items.length === 0 || updateProforma.isPending}>
              {updateProforma.isPending ? 'Updating...' : 'Update Proforma'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

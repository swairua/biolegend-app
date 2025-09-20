import { useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Plus,
  Warehouse,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { useRestockProduct } from '@/hooks/useQuotationItems';
import { useCompanies } from '@/hooks/useDatabase';

interface RestockItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  item: any;
}

export function RestockItemModal({ open, onOpenChange, onSuccess, item }: RestockItemModalProps) {
  const [restockData, setRestockData] = useState({
    quantity: item?.minStock * 2 || 50,
    cost_per_unit: 0,
    supplier: item?.supplier || '',
    restock_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get company and restock mutation
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const restockProduct = useRestockProduct();

  const handleInputChange = (field: string, value: any) => {
    setRestockData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const newStockLevel = (item?.currentStock || 0) + restockData.quantity;
  const totalCost = restockData.quantity * restockData.cost_per_unit;

  const handleSubmit = async () => {
    if (!restockData.quantity || restockData.quantity <= 0) {
      toast.error('Please enter a valid restock quantity');
      return;
    }

    if (!restockData.supplier.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    if (!currentCompany?.id) {
      toast.error('No company selected. Please ensure you are associated with a company.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create restock record with stock movement and product update
      await restockProduct.mutateAsync({
        productId: item.id,
        quantity: restockData.quantity,
        costPerUnit: restockData.cost_per_unit,
        companyId: currentCompany.id,
        supplier: restockData.supplier,
        notes: restockData.notes ?
          `${restockData.notes}${restockData.reference_number ? ` (Ref: ${restockData.reference_number})` : ''}` :
          `Restock from ${restockData.supplier}${restockData.reference_number ? ` (Ref: ${restockData.reference_number})` : ''}`
      });

      toast.success(`${item?.name} restocked with ${restockData.quantity} units successfully!`);
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error restocking item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to restock item: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRestockData({
      quantity: item?.minStock * 2 || 50,
      cost_per_unit: 0,
      supplier: item?.supplier || '',
      restock_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: ''
    });
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-warning" />
            <span>Restock Inventory Item</span>
          </DialogTitle>
          <DialogDescription>
            Add stock for {item.name} ({item.sku})
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Item Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Warehouse className="h-4 w-4" />
                <span>Current Stock Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Product:</span>
                  <div className="font-medium">{item.name}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">SKU:</span>
                  <div className="font-medium">{item.sku}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Stock:</span>
                  <div className="font-bold text-xl text-destructive">{item.currentStock}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Min Level:</span>
                  <div className="font-medium">{item.minStock}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <div className="font-medium">{item.product_categories?.name || 'No category'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Unit Price:</span>
                  <div className="font-medium">{item.unitPrice}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 p-3 bg-warning-light rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <div>
                    <div className="font-medium text-warning">Low Stock Alert</div>
                    <div className="text-sm text-warning">
                      Current stock ({item.currentStock}) is below minimum level ({item.minStock})
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Restock Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Restock Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Restock Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={restockData.quantity}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                  min="1"
                  placeholder="Enter quantity to add"
                />
                <div className="text-xs text-muted-foreground">
                  Suggested: {item.minStock * 2} units (2x minimum level)
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_per_unit">Cost per Unit (KES)</Label>
                <Input
                  id="cost_per_unit"
                  type="number"
                  value={restockData.cost_per_unit}
                  onChange={(e) => handleInputChange('cost_per_unit', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <Input
                  id="supplier"
                  value={restockData.supplier}
                  onChange={(e) => handleInputChange('supplier', e.target.value)}
                  placeholder="Supplier name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="restock_date">Restock Date</Label>
                <Input
                  id="restock_date"
                  type="date"
                  value={restockData.restock_date}
                  onChange={(e) => handleInputChange('restock_date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  value={restockData.reference_number}
                  onChange={(e) => handleInputChange('reference_number', e.target.value)}
                  placeholder="PO number, invoice number, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={restockData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={2}
                  placeholder="Additional notes about this restock..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Restock Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Restock Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Current Stock</div>
                <div className="text-2xl font-bold text-destructive">{item.currentStock}</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Restock Quantity</div>
                <div className="text-2xl font-bold text-primary">+{restockData.quantity}</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">New Stock Level</div>
                <div className="text-2xl font-bold text-success">{newStockLevel}</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Cost</div>
                <div className="text-2xl font-bold text-primary">
                  KES {totalCost.toLocaleString()}
                </div>
              </div>
            </div>

            {newStockLevel >= item.minStock && (
              <div className="mt-4 p-3 bg-success-light rounded-lg">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-success" />
                  <span className="text-success font-medium">
                    After restocking, stock level will be above minimum threshold
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !restockData.quantity || !restockData.supplier.trim()}
            className="bg-warning hover:bg-warning/90"
          >
            <Package className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Restocking...' : 'Restock Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

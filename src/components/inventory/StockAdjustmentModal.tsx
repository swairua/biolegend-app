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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, RotateCcw, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InventoryItem {
  id?: string;
  name: string;
  product_code: string;
  stock_quantity: number;
  unit_of_measure: string;
  cost_price: number;
}

interface StockAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  item: InventoryItem | null;
}

export function StockAdjustmentModal({ open, onOpenChange, onSuccess, item }: StockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease' | 'set'>('increase');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!item) return;

    if (quantity <= 0 && adjustmentType !== 'set') {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (adjustmentType === 'set' && quantity < 0) {
      toast.error('Stock quantity cannot be negative');
      return;
    }

    if (adjustmentType === 'decrease' && quantity > item.stock_quantity) {
      toast.error('Cannot decrease stock below zero');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Calculate new stock quantity
      let newQuantity: number;
      switch (adjustmentType) {
        case 'increase':
          newQuantity = item.stock_quantity + quantity;
          break;
        case 'decrease':
          newQuantity = item.stock_quantity - quantity;
          break;
        case 'set':
          newQuantity = quantity;
          break;
        default:
          newQuantity = item.stock_quantity;
      }

      // TODO: Implement actual stock adjustment API call
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const adjustmentData = {
        item_id: item.id,
        product_code: item.product_code,
        adjustment_type: adjustmentType,
        old_quantity: item.stock_quantity,
        adjustment_quantity: adjustmentType === 'set' ? quantity : quantity,
        new_quantity: newQuantity,
        reason,
        notes,
        cost_impact: adjustmentType === 'increase' ? quantity * item.cost_price : 
                    adjustmentType === 'decrease' ? -quantity * item.cost_price :
                    (quantity - item.stock_quantity) * item.cost_price,
        adjustment_date: new Date().toISOString(),
      };

      console.log('Stock adjustment data:', adjustmentData);
      
      const actionText = adjustmentType === 'increase' ? 'increased by' : 
                        adjustmentType === 'decrease' ? 'decreased by' : 
                        'set to';
      
      toast.success(`Stock for ${item.name} ${actionText} ${quantity} ${item.unit_of_measure}`);
      onSuccess();
      handleClose();
      
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAdjustmentType('increase');
    setQuantity(0);
    setReason('');
    setNotes('');
    onOpenChange(false);
  };

  const getNewQuantity = () => {
    if (!item) return 0;
    switch (adjustmentType) {
      case 'increase':
        return item.stock_quantity + quantity;
      case 'decrease':
        return Math.max(0, item.stock_quantity - quantity);
      case 'set':
        return quantity;
      default:
        return item.stock_quantity;
    }
  };

  const getAdjustmentIcon = () => {
    switch (adjustmentType) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'set':
        return <RotateCcw className="h-4 w-4 text-warning" />;
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Stock Adjustment
          </DialogTitle>
          <DialogDescription>
            Adjust stock levels for {item.name} ({item.product_code})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Stock Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Stock Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Product Name</Label>
                  <p className="font-medium">{item.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Product Code</Label>
                  <p className="font-medium">{item.product_code}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Current Stock</Label>
                  <p className="font-medium text-lg">
                    {item.stock_quantity} {item.unit_of_measure}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Unit of Measure</Label>
                  <p className="font-medium">{item.unit_of_measure}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adjustment Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adjustment_type">Adjustment Type</Label>
              <Select value={adjustmentType} onValueChange={(value: 'increase' | 'decrease' | 'set') => setAdjustmentType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select adjustment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span>Increase Stock</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="decrease">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      <span>Decrease Stock</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="set">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-warning" />
                      <span>Set Exact Quantity</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">
                {adjustmentType === 'set' ? 'New Quantity' : 'Adjustment Quantity'}
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                placeholder={adjustmentType === 'set' ? 'Enter exact quantity' : 'Enter adjustment quantity'}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Adjustment *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical_count">Physical Count Adjustment</SelectItem>
                  <SelectItem value="damaged_goods">Damaged Goods</SelectItem>
                  <SelectItem value="expired_items">Expired Items</SelectItem>
                  <SelectItem value="theft_loss">Theft/Loss</SelectItem>
                  <SelectItem value="supplier_return">Supplier Return</SelectItem>
                  <SelectItem value="customer_return">Customer Return</SelectItem>
                  <SelectItem value="system_error">System Error Correction</SelectItem>
                  <SelectItem value="transfer_in">Transfer In</SelectItem>
                  <SelectItem value="transfer_out">Transfer Out</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Provide additional details about this adjustment..."
                rows={3}
              />
            </div>
          </div>

          {/* Preview */}
          {quantity > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {getAdjustmentIcon()}
                  Adjustment Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <Label className="text-sm text-muted-foreground">Current Stock</Label>
                    <p className="text-lg font-medium">{item.stock_quantity}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Adjustment</Label>
                    <p className="text-lg font-medium">
                      {adjustmentType === 'increase' ? '+' : adjustmentType === 'decrease' ? '-' : '→'} {quantity}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">New Stock</Label>
                    <p className="text-lg font-medium text-primary">{getNewQuantity()}</p>
                  </div>
                </div>
                {adjustmentType !== 'set' && (
                  <div className="mt-4 text-center">
                    <Label className="text-sm text-muted-foreground">Cost Impact</Label>
                    <p className="text-lg font-medium">
                      {adjustmentType === 'increase' ? '+' : '-'}${(quantity * item.cost_price).toFixed(2)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || quantity <= 0 || !reason}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Processing...' : 'Apply Adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

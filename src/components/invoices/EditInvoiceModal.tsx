import { useState, useEffect } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { normalizeInvoiceAmount } from '@/utils/currency';
import { getLocaleForCurrency, getExchangeRate } from '@/utils/exchangeRates';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Trash2,
  Search,
  Calculator,
  Receipt
} from 'lucide-react';
import { useCustomers, useProducts, useTaxSettings } from '@/hooks/useDatabase';
import { useUpdateInvoiceWithItems } from '@/hooks/useQuotationItems';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { supabase } from '@/integrations/supabase/client';

interface InvoiceItem {
  id: string;
  product_id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_before_vat?: number;
  tax_percentage: number;
  tax_amount: number;
  tax_inclusive: boolean;
  line_total: number;
}

interface EditInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  invoice: any;
}

export function EditInvoiceModal({ open, onOpenChange, onSuccess, invoice }: EditInvoiceModalProps) {
  const { currency, rate } = useCurrency();

  const formatInvoiceCurrency = (amount: number) => {
    const invoiceCurrency = invoice?.currency_code || 'KES';
    const normalized = normalizeInvoiceAmount(
      amount,
      invoiceCurrency as any,
      invoice?.exchange_rate,
      invoiceCurrency as any,
      rate
    );
    return new Intl.NumberFormat(getLocaleForCurrency(invoiceCurrency as any), {
      style: 'currency',
      currency: invoiceCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(normalized) ? normalized : 0);
  };
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lpoNumber, setLpoNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InvoiceItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recalculateWithCurrentRate, setRecalculateWithCurrentRate] = useState(false);
  const [lockedRateInfo, setLockedRateInfo] = useState<{ rate: number; date: string } | null>(null);

  const { currentCompany } = useCurrentCompany();
  const { data: customers, isLoading: loadingCustomers } = useCustomers(currentCompany?.id);
  const { data: products, isLoading: loadingProducts } = useProducts(currentCompany?.id);
  const { data: taxSettings } = useTaxSettings(currentCompany?.id);
  const updateInvoiceWithItems = useUpdateInvoiceWithItems();

  // Get default tax rate
  const defaultTax = taxSettings?.find(tax => tax.is_default && tax.is_active);
  const defaultTaxRate = defaultTax?.rate || 16; // Fallback to 16% if no default is set

  // Load invoice data when modal opens
  useEffect(() => {
    if (!invoice || !open) return;

    const loadInvoiceData = async () => {
      setSelectedCustomerId(invoice.customer_id || '');
      setInvoiceDate(invoice.invoice_date || '');
      setDueDate(invoice.due_date || '');
      setLpoNumber(invoice.lpo_number || '');
      setNotes(invoice.notes || '');
      setTermsAndConditions(invoice.terms_and_conditions || '');

      // Capture locked rate info if invoice was created in USD
      if (invoice.currency_code === 'USD' && invoice.exchange_rate) {
        setLockedRateInfo({
          rate: invoice.exchange_rate,
          date: invoice.fx_date || invoice.invoice_date || new Date().toISOString().split('T')[0]
        });
      } else {
        setLockedRateInfo(null);
      }
      setRecalculateWithCurrentRate(false);

      // Try to use items from invoice object first
      let invoiceItemsData = invoice.invoice_items || [];

      // If no items in the invoice object, fetch them from the database
      if (!invoiceItemsData || invoiceItemsData.length === 0) {
        try {
          console.log(`🔍 Fallback fetch for invoice items, invoice_id:`, invoice.id);
          const { data: fetchedItems, error } = await supabase
            .from('invoice_items')
            .select(`
              id,
              invoice_id,
              product_id,
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
            .eq('invoice_id', invoice.id);

          if (error) {
            console.error('❌ Fallback fetch error:', error);
          } else {
            console.log(`✅ Fallback fetch returned ${fetchedItems?.length || 0} items`);
            if (fetchedItems) {
              invoiceItemsData = fetchedItems;
            }
          }
        } catch (err) {
          console.error('Failed to fetch invoice items:', err);
        }
      }

      // Convert invoice items to local format
      const invoiceItems = (invoiceItemsData || []).map((item: any, index: number) => {
        let productName = 'Unknown Product';
        // First, try to get product name from product relationship
        if (item.product_id && products) {
          const product = products.find((p: any) => p.id === item.product_id);
          if (product) {
            productName = product.name;
          }
        }
        // If no product found, use stored description as fallback
        if (productName === 'Unknown Product' && item.description) {
          productName = item.description;
        }
        return {
          id: item.id || `existing-${index}`,
          product_id: item.product_id || '',
          product_name: productName,
          description: item.description || '',
          quantity: item.quantity || 0,
          unit_price: item.unit_price || 0,
          discount_percentage: item.discount_percentage || 0,
          discount_before_vat: item.discount_before_vat || 0,
          tax_percentage: item.tax_percentage || 0,
          tax_amount: item.tax_amount || 0,
          tax_inclusive: item.tax_inclusive || false,
          line_total: item.line_total || 0,
        };
      });

      console.log(`📊 Modal: Converted ${invoiceItems.length} items for display:`, invoiceItems);
      setItems(invoiceItems);
    };

    loadInvoiceData();
  }, [invoice, open]);

  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    product.product_code.toLowerCase().includes(searchProduct.toLowerCase())
  ) || [];

  const calculateLineTotal = (item: InvoiceItem, quantity?: number, unitPrice?: number, discountPercentage?: number, taxPercentage?: number, taxInclusive?: boolean) => {
    const qty = quantity ?? item.quantity;
    const price = unitPrice ?? item.unit_price;
    const discount = discountPercentage ?? item.discount_percentage;
    const tax = taxPercentage ?? item.tax_percentage;

    let subtotal = qty * price;
    let discountAmount = subtotal * (discount / 100);
    let afterDiscount = subtotal - discountAmount;

    let taxAmount = 0;
    let lineTotal = 0;

    if (tax === 0) {
      // No VAT applied
      lineTotal = afterDiscount;
      taxAmount = 0;
    } else {
      // Both inclusive and exclusive now add VAT on top
      taxAmount = afterDiscount * (tax / 100);
      lineTotal = afterDiscount + taxAmount;
    }

    return { lineTotal, taxAmount };
  };

  const addItem = (product: any) => {
    const existingItem = items.find(item => item.product_id === product.id);
    
    if (existingItem) {
      updateItemQuantity(existingItem.id, existingItem.quantity + 1);
      return;
    }

    const newItem: InvoiceItem = {
      id: `temp-${Date.now()}`,
      product_id: product.id,
      product_name: product.name,
      description: product.description || product.name,
      quantity: 1,
      unit_price: product.selling_price,
      discount_percentage: 0,
      discount_before_vat: 0,
      tax_percentage: 0,
      tax_amount: 0,
      tax_inclusive: false,
      line_total: product.selling_price
    };

    const { lineTotal, taxAmount } = calculateLineTotal(newItem);
    newItem.line_total = lineTotal;
    newItem.tax_amount = taxAmount;

    setItems([...items, newItem]);
    setSearchProduct('');
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems(items.map(item => {
      if (item.id === itemId) {
        const { lineTotal, taxAmount } = calculateLineTotal(item, quantity);
        return { ...item, quantity, line_total: lineTotal, tax_amount: taxAmount };
      }
      return item;
    }));
  };

  const updateItemPrice = (itemId: string, unitPrice: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const { lineTotal, taxAmount } = calculateLineTotal(item, undefined, unitPrice);
        return { ...item, unit_price: unitPrice, line_total: lineTotal, tax_amount: taxAmount };
      }
      return item;
    }));
  };

  const updateItemDiscount = (itemId: string, discountPercentage: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const { lineTotal, taxAmount } = calculateLineTotal(item, undefined, undefined, discountPercentage);
        return { ...item, discount_percentage: discountPercentage, line_total: lineTotal, tax_amount: taxAmount };
      }
      return item;
    }));
  };

  const updateItemDiscountBeforeVat = (itemId: string, discountBeforeVat: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        return { ...item, discount_before_vat: discountBeforeVat };
      }
      return item;
    }));
  };

  const updateItemTax = (itemId: string, taxPercentage: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const { lineTotal, taxAmount } = calculateLineTotal(item, undefined, undefined, undefined, taxPercentage);
        return { ...item, tax_percentage: taxPercentage, line_total: lineTotal, tax_amount: taxAmount };
      }
      return item;
    }));
  };

  const updateItemTaxInclusive = (itemId: string, taxInclusive: boolean) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const { lineTotal, taxAmount } = calculateLineTotal(item, undefined, undefined, undefined, item.tax_percentage, taxInclusive);
        return { ...item, tax_inclusive: taxInclusive, line_total: lineTotal, tax_amount: taxAmount };
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      setItemToDelete(item);
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDeleteItem = () => {
    if (itemToDelete) {
      setItems(items.filter(item => item.id !== itemToDelete.id));
      setItemToDelete(null);
      setShowDeleteConfirm(false);
    }
  };


  const recalculateItemsWithNewRate = async () => {
    if (!lockedRateInfo || invoice?.currency_code !== 'USD') {
      toast.error('Cannot recalculate: invoice was not created in USD');
      return;
    }

    try {
      toast.info('Fetching current exchange rate...');
      const currentRate = await getExchangeRate('USD', 'KES', invoiceDate);
      if (!currentRate || currentRate <= 0) {
        throw new Error('Unable to fetch current exchange rate');
      }

      const factor = currentRate / lockedRateInfo.rate;

      // Amounts in the form are stored in KES. To recalculate:
      // 1. Convert KES back to USD using the old rate: USD = KES / oldRate
      // 2. Convert USD to KES using the new rate: newKES = USD * newRate
      // This is equivalent to: newKES = KES * (newRate / oldRate) = KES * factor
      const recalculatedItems = items.map(item => {
        const newUnitPrice = parseFloat((item.unit_price * factor).toFixed(4));
        const newTaxAmount = parseFloat(((item.tax_amount || 0) * factor).toFixed(4));
        const newLineTotal = parseFloat((item.line_total * factor).toFixed(4));

        return {
          ...item,
          unit_price: newUnitPrice,
          tax_amount: newTaxAmount,
          line_total: newLineTotal
        };
      });

      setItems(recalculatedItems);
      setLockedRateInfo({
        rate: currentRate,
        date: invoiceDate
      });
      setRecalculateWithCurrentRate(false);
      toast.success(`Rate updated: 1 USD = ${currentRate.toFixed(2)} KES`);
    } catch (e: any) {
      console.error('Recalculation failed:', e);
      toast.error(e?.message || 'Failed to recalculate with current rate');
    }
  };

  const subtotal = items.reduce((sum, item) => {
    // Always use base amount for subtotal (unit price × quantity × discount)
    // VAT is calculated separately and added for exclusive, or extracted for inclusive
    const itemSubtotal = (item.quantity * item.unit_price) * (1 - item.discount_percentage / 100);
    return sum + itemSubtotal;
  }, 0);
  const taxAmount = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
  const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0);
  const balanceDue = totalAmount - (invoice?.paid_amount || 0);

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setIsSubmitting(true);
    try {
      const invoiceData: any = {
        customer_id: selectedCustomerId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        lpo_number: lpoNumber || null,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        balance_due: balanceDue,
        terms_and_conditions: termsAndConditions,
        notes: notes,
      };

      // If invoice was in USD and recalculated, update the rate metadata
      if (invoice?.currency_code === 'USD' && lockedRateInfo && recalculateWithCurrentRate) {
        invoiceData.exchange_rate = lockedRateInfo.rate;
        invoiceData.fx_date = lockedRateInfo.date;
      }

      const invoiceItems = items.map(item => ({
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage,
        discount_before_vat: item.discount_before_vat || 0,
        tax_percentage: item.tax_percentage,
        tax_amount: item.tax_amount,
        tax_inclusive: item.tax_inclusive,
        line_total: item.line_total
      }));

      await updateInvoiceWithItems.mutateAsync({
        invoiceId: invoice.id,
        invoice: invoiceData,
        items: invoiceItems
      });

      toast.success(`Invoice ${invoice.invoice_number} updated successfully!`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5 text-primary" />
            <span>Edit Invoice {invoice?.invoice_number}</span>
          </DialogTitle>
          <DialogDescription>
            Update invoice details and items
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Invoice Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Locked Rate Info (for USD invoices) */}
                {lockedRateInfo && invoice?.currency_code === 'USD' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium mb-2">
                      Exchange Rate Locked
                    </p>
                    <p className="text-sm text-blue-600 mb-3">
                      Created at 1 USD = {lockedRateInfo.rate.toFixed(2)} KES on {lockedRateInfo.date}
                    </p>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="recalculate"
                        checked={recalculateWithCurrentRate}
                        onCheckedChange={(checked) => setRecalculateWithCurrentRate(!!checked)}
                      />
                      <Label htmlFor="recalculate" className="text-sm font-normal cursor-pointer">
                        Recalculate with current rate
                      </Label>
                    </div>
                    {recalculateWithCurrentRate && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={recalculateItemsWithNewRate}
                        className="mt-2 w-full"
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        Fetch Current Rate & Recalculate
                      </Button>
                    )}
                  </div>
                )}

                {/* Customer Selection */}
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCustomers ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading customers...</div>
                      ) : (
                        customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} ({customer.customer_code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_date">Invoice Date *</Label>
                    <Input
                      id="invoice_date"
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* LPO Number */}
                <div className="space-y-2">
                  <Label htmlFor="lpo_number">LPO Number (Optional)</Label>
                  <Input
                    id="lpo_number"
                    type="text"
                    value={lpoNumber}
                    onChange={(e) => setLpoNumber(e.target.value)}
                    placeholder="Enter LPO reference number"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Additional notes for this invoice..."
                  />
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-2">
                  <Label htmlFor="terms">Terms and Conditions</Label>
                  <Textarea
                    id="terms"
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Product Selection */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Product Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name or code..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Product List */}
                  {searchProduct && (
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      {loadingProducts ? (
                        <div className="p-4 text-center text-muted-foreground">Loading products...</div>
                      ) : filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">No products found</div>
                      ) : (
                        filteredProducts.map((product) => (
                          <div
                            key={product.id}
                            className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-smooth"
                            onClick={() => addItem(product)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">{product.product_code}</div>
                                {product.description && (
                                  <div className="text-xs text-muted-foreground mt-1">{product.description}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{formatInvoiceCurrency(product.selling_price)}</div>
                                <div className="text-xs text-muted-foreground">Stock: {product.stock_quantity}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Invoice Items</span>
              <Badge variant="outline">{items.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No items added yet. Search and select products to add them.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Item #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Discount %</TableHead>
                    <TableHead>Disc. Before VAT</TableHead>
                    <TableHead>VAT %</TableHead>
                    <TableHead>Tax Incl.</TableHead>
                    <TableHead>Line Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="w-12 text-center">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="w-20"
                          min="1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                          className="w-24"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.discount_percentage}
                          onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                          className="w-20"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.discount_before_vat || 0}
                          onChange={(e) => updateItemDiscountBeforeVat(item.id, parseFloat(e.target.value) || 0)}
                          className="w-24"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.tax_percentage}
                          onChange={(e) => updateItemTax(item.id, parseFloat(e.target.value) || 0)}
                          className="w-20"
                          min="0"
                          max="100"
                          step="0.1"
                          disabled={item.tax_inclusive}
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={item.tax_inclusive}
                          onCheckedChange={(checked) => updateItemTaxInclusive(item.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatInvoiceCurrency(item.line_total)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 sm:h-9 sm:w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Totals */}
            {items.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-80 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">{formatInvoiceCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT:</span>
                      <span className="font-semibold">{formatInvoiceCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between text-lg border-t pt-2">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold text-primary">{formatInvoiceCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Paid:</span>
                      <span>{formatInvoiceCurrency(invoice?.paid_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-lg border-t pt-2">
                      <span className="font-bold">Balance Due:</span>
                      <span className="font-bold text-destructive">{formatInvoiceCurrency(balanceDue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-9 sm:h-10 px-3 sm:px-4"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedCustomerId || items.length === 0}
            className="h-9 sm:h-10 px-3 sm:px-4 w-full sm:w-auto"
          >
            <Calculator className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{isSubmitting ? 'Updating...' : 'Update Invoice'}</span>
            <span className="sm:hidden text-xs">{isSubmitting ? 'Updating' : 'Update'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>

      <DeleteConfirmationModal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDeleteItem}
        title="Delete Line Item"
        description="This line item will be removed from the invoice. This action cannot be undone."
        itemName={itemToDelete?.product_name}
      />
    </Dialog>
  );
}

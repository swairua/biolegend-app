import { useState, useEffect, useRef } from 'react';
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
  Receipt,
  Loader2
} from 'lucide-react';
import { useCustomers, useGenerateDocumentNumber, useTaxSettings, useCompanies } from '@/hooks/useDatabase';
import { useOptimizedProductSearch, usePopularProducts } from '@/hooks/useOptimizedProducts';
import { useCreateInvoiceWithItems } from '@/hooks/useQuotationItems';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getExchangeRate, getLocaleForCurrency } from '@/utils/exchangeRates';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency as formatCurrencyUtil } from '@/utils/formatCurrency';
import { ensureInvoiceCurrencyColumns } from '@/utils/ensureInvoiceCurrencyColumns';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';

interface ReceiptItem {
  id: string;
  product_id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_before_vat?: number;
  tax_percentage: number;
  tax_amount: number;
  tax_inclusive: boolean;
  line_total: number;
}

interface CreateReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preSelectedCustomer?: any;
  initialItems?: ReceiptItem[];
  initialNotes?: string;
  initialReceiptDate?: string;
  initialCurrencyCode?: 'KES' | 'USD';
  initialExchangeRate?: number;
}

export function CreateReceiptModal({ open, onOpenChange, onSuccess, preSelectedCustomer, initialItems, initialNotes, initialReceiptDate, initialCurrencyCode, initialExchangeRate }: CreateReceiptModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(preSelectedCustomer?.id || '');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const { currency: globalCurrency } = useCurrency();
  const [currencyCode, setCurrencyCode] = useState<'KES' | 'USD'>(initialCurrencyCode || globalCurrency || 'KES');
  const [exchangeRate, setExchangeRate] = useState<number>(initialExchangeRate || 1);
  const previousRateRef = useRef<number>(1);
  const [notes, setNotes] = useState('');
  const [amountTendered, setAmountTendered] = useState<number>(0);

  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<{
    step: string;
    current: number;
    total: number;
  } | null>(null);

  const { profile, loading: authLoading } = useAuth();
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const { data: customers, isLoading: loadingCustomers } = useCustomers(currentCompany?.id);
  const {
    data: searchedProducts,
    isLoading: loadingProducts,
    searchTerm: searchProduct,
    setSearchTerm: setSearchProduct,
    isSearching
  } = useOptimizedProductSearch(currentCompany?.id, open);
  const { data: popularProducts } = usePopularProducts(currentCompany?.id, 10);
  const { data: taxSettings } = useTaxSettings(currentCompany?.id);
  const createInvoiceWithItems = useCreateInvoiceWithItems();
  const generateDocNumber = useGenerateDocumentNumber();

  const defaultTax = taxSettings?.find(tax => tax.is_default && tax.is_active);
  const defaultTaxRate = defaultTax?.rate || 16;

  useEffect(() => {
    if (open) {
      if (preSelectedCustomer) {
        setSelectedCustomerId(preSelectedCustomer.id);
      }
      if (initialItems && initialItems.length > 0) {
        setItems(initialItems.map((it, idx) => ({ ...it, id: it.id || `init-${idx}` })));
      }
      if (typeof initialNotes === 'string') setNotes(initialNotes);
      if (typeof initialReceiptDate === 'string') setReceiptDate(initialReceiptDate);
    }
  }, [open, preSelectedCustomer, initialItems, initialNotes, initialReceiptDate]);

  useEffect(() => {
    if (!open) return;
    if (!initialCurrencyCode && globalCurrency && globalCurrency !== currencyCode) {
      handleCurrencyChange(globalCurrency);
    }
  }, [open, globalCurrency, initialCurrencyCode]);

  const displayProducts = searchProduct.trim() ? searchedProducts : popularProducts;

  const convertItemsByFactor = (factor: number) => {
    setItems(prev => prev.map(item => {
      const newUnit = parseFloat((item.unit_price * factor).toFixed(4));
      const { lineTotal, taxAmount } = calculateLineTotal(item, undefined, newUnit);
      return { ...item, unit_price: newUnit, line_total: lineTotal, tax_amount: taxAmount };
    }));
  };

  const handleCurrencyChange = async (newCurrency: 'KES' | 'USD') => {
    try {
      if (newCurrency === currencyCode) return;
      let newRate = 1;
      if (newCurrency === 'USD') {
        toast.info('Fetching KES→USD rate...');
        newRate = await getExchangeRate('KES', 'USD', receiptDate);
        if (!newRate || newRate <= 0) throw new Error('Invalid rate');
        toast.success(`Rate locked: 1 KES = ${newRate.toFixed(6)} USD`);
      } else {
        newRate = 1;
      }
      const factor = newRate / previousRateRef.current;
      convertItemsByFactor(factor);
      previousRateRef.current = newRate;
      setExchangeRate(newRate);
      setCurrencyCode(newCurrency);
    } catch (e: any) {
      console.error('Currency change failed:', e);
      toast.error(e?.message || 'Failed to change currency');
    }
  };

  const fetchAndSetRate = async () => {
    try {
      toast.info('Fetching exchange rate...');
      const rate = await getExchangeRate('KES', currencyCode, receiptDate);
      if (!rate || rate <= 0) throw new Error('Invalid exchange rate');
      const factor = rate / exchangeRate;
      convertItemsByFactor(factor);
      previousRateRef.current = rate;
      setExchangeRate(rate);
      toast.success(`Rate updated: 1 KES = ${rate.toFixed(6)} ${currencyCode}`);
    } catch (e: any) {
      console.error('Failed to fetch rate:', e);
      toast.error(e?.message || 'Failed to fetch exchange rate');
    }
  };

  const addItem = (product: any) => {
    const existingItem = items.find(item => item.product_id === product.id);

    if (existingItem) {
      updateItemQuantity(existingItem.id, existingItem.quantity + 1);
      return;
    }

    const priceBase = Number(product.selling_price || product.unit_price || 0);
    if (isNaN(priceBase) || priceBase === 0) {
      console.warn('Product price missing or invalid for product:', product);
      toast.warning(`Product "${product.name}" has no price set`);
    }
    const price = currencyCode === 'USD' ? priceBase * exchangeRate : priceBase;

    const newItem: ReceiptItem = {
      id: `temp-${Date.now()}`,
      product_id: product.id,
      product_name: product.name,
      description: product.description || `${product.name} - Product details`,
      quantity: 1,
      unit_price: price,
      discount_before_vat: 0,
      tax_percentage: defaultTaxRate,
      tax_amount: 0,
      tax_inclusive: true,
      line_total: price
    };

    const { lineTotal, taxAmount } = calculateLineTotal(newItem);
    newItem.line_total = lineTotal;
    newItem.tax_amount = taxAmount;

    setItems([...items, newItem]);
    setSearchProduct('');

    toast.success(`Added "${product.name}" - ${formatCurrency(lineTotal)} (incl. tax)`);
  };

  const calculateLineTotal = (item: ReceiptItem, quantity?: number, unitPrice?: number, discountPercentage?: number, taxPercentage?: number, taxInclusive?: boolean) => {
    const qty = quantity ?? item.quantity;
    const price = unitPrice ?? item.unit_price;
    const discount = discountPercentage ?? item.discount_before_vat ?? 0;
    const tax = taxPercentage ?? item.tax_percentage;
    const inclusive = taxInclusive ?? item.tax_inclusive;

    const baseAmount = qty * price;
    const discountAmount = baseAmount * (discount / 100);
    const afterDiscountAmount = baseAmount - discountAmount;

    let taxAmount = 0;
    let lineTotal = 0;

    if (tax === 0 || !inclusive) {
      lineTotal = afterDiscountAmount;
      taxAmount = 0;
    } else {
      taxAmount = afterDiscountAmount * (tax / 100);
      lineTotal = afterDiscountAmount + taxAmount;
    }

    return { lineTotal, taxAmount, discountAmount };
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

  const updateItemTax = (itemId: string, taxPercentage: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const { lineTotal, taxAmount } = calculateLineTotal(item, undefined, undefined, undefined, taxPercentage);
        return { ...item, tax_percentage: taxPercentage, line_total: lineTotal, tax_amount: taxAmount };
      }
      return item;
    }));
  };

  const updateItemDiscountBeforeVat = (itemId: string, discountBeforeVat: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const { lineTotal, taxAmount } = calculateLineTotal(item, undefined, undefined, discountBeforeVat);
        return { ...item, discount_before_vat: discountBeforeVat, line_total: lineTotal, tax_amount: taxAmount };
      }
      return item;
    }));
  };

  const updateItemTaxInclusive = (itemId: string, taxInclusive: boolean) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        let newTaxPercentage = item.tax_percentage;
        if (taxInclusive && item.tax_percentage === 0) {
          newTaxPercentage = defaultTaxRate;
        }
        if (!taxInclusive) {
          newTaxPercentage = 0;
        }

        const { lineTotal, taxAmount } = calculateLineTotal(item, undefined, undefined, undefined, newTaxPercentage, taxInclusive);
        return { ...item, tax_inclusive: taxInclusive, tax_percentage: newTaxPercentage, line_total: lineTotal, tax_amount: taxAmount };
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const formatCurrency = (amount: number) => formatCurrencyUtil(Number(amount) || 0, currencyCode || 'KES');

  const subtotal = items.reduce((sum, item) => {
    const baseAmount = item.quantity * item.unit_price;
    const discountAmount = baseAmount * ((item.discount_before_vat || 0) / 100);
    return sum + (baseAmount - discountAmount);
  }, 0);
  const totalDiscountAmount = items.reduce((sum, item) => {
    const baseAmount = item.quantity * item.unit_price;
    return sum + (baseAmount * ((item.discount_before_vat || 0) / 100));
  }, 0);
  const taxAmount = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
  const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0);

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    if (amountTendered <= 0) {
      toast.error('Please enter amount tendered');
      return;
    }

    if (!currentCompany?.id) {
      toast.error('No company selected. Please ensure you are associated with a company.');
      return;
    }

    if (authLoading) {
      toast.info('Please wait, authenticating user...');
      return;
    }

    if (!profile?.id) {
      toast.error('User not authenticated. Please sign in and try again.');
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress({
      step: 'Preparing receipt data...',
      current: 1,
      total: 3
    });

    try {
      setSubmitProgress({
        step: 'Generating receipt number...',
        current: 1,
        total: 3
      });

      const receiptNumber = await generateDocNumber.mutateAsync({
        companyId: currentCompany.id,
        type: 'invoice'
      });

      setSubmitProgress({
        step: 'Preparing receipt data...',
        current: 2,
        total: 3
      });

      await ensureInvoiceCurrencyColumns();

      let effectiveRate = exchangeRate;
      if (currencyCode === 'USD' && (!Number.isFinite(effectiveRate) || effectiveRate <= 0 || effectiveRate === 1)) {
        toast.info('Locking exchange rate for receipt date...');
        effectiveRate = await getExchangeRate('KES', 'USD', receiptDate);
        if (!effectiveRate || effectiveRate <= 0) {
          throw new Error('Unable to fetch exchange rate for the selected date');
        }
      }
      const baseRate = (Number.isFinite(exchangeRate) && exchangeRate > 0) ? exchangeRate : 1;
      const factor = currencyCode === 'USD' ? (effectiveRate / baseRate) : 1;

      const adjustedItems = items.map(item => ({
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: currencyCode === 'USD' ? Number(item.unit_price) * factor : Number(item.unit_price),
        discount_before_vat: item.discount_before_vat || 0,
        tax_percentage: item.tax_percentage,
        tax_amount: currencyCode === 'USD' ? Number(item.tax_amount || 0) * factor : Number(item.tax_amount || 0),
        tax_inclusive: item.tax_inclusive,
        line_total: currencyCode === 'USD' ? Number(item.line_total) * factor : Number(item.line_total)
      }));

      const adjustedSubtotal = currencyCode === 'USD' ? subtotal * factor : subtotal;
      const adjustedTaxAmount = currencyCode === 'USD' ? taxAmount * factor : taxAmount;
      const adjustedTotalAmount = currencyCode === 'USD' ? totalAmount * factor : totalAmount;

      const adjustedAmountTendered = currencyCode === 'USD' ? amountTendered * factor : amountTendered;
      const balance = adjustedAmountTendered - adjustedTotalAmount;
      const hasUnderpayment = balance < 0;

      const receiptData = {
        company_id: currentCompany.id,
        customer_id: selectedCustomerId,
        invoice_number: receiptNumber,
        invoice_date: receiptDate,
        due_date: receiptDate,
        status: 'paid',
        subtotal: adjustedSubtotal,
        tax_amount: adjustedTaxAmount,
        total_amount: adjustedTotalAmount,
        paid_amount: adjustedAmountTendered,
        balance_due: balance,
        notes: notes,
        created_by: profile?.id,
        currency_code: currencyCode,
        exchange_rate: currencyCode === 'USD' ? effectiveRate : 1,
        fx_date: receiptDate,
        terms_and_conditions: ''
      };

      const receiptItems = adjustedItems;

      const totalSteps = hasUnderpayment ? 4 : 3;

      setSubmitProgress({
        step: `Creating receipt with ${items.length} items...`,
        current: 3,
        total: totalSteps
      });

      await createInvoiceWithItems.mutateAsync({
        invoice: receiptData,
        items: receiptItems
      });

      if (hasUnderpayment) {
        setSubmitProgress({
          step: 'Creating underpayment invoice...',
          current: 4,
          total: totalSteps
        });

        const invoiceNumber = await generateDocNumber.mutateAsync({
          companyId: currentCompany.id,
          type: 'invoice'
        });

        const invoiceData = {
          company_id: currentCompany.id,
          customer_id: selectedCustomerId,
          invoice_number: invoiceNumber,
          invoice_date: receiptDate,
          due_date: receiptDate,
          status: 'partial',
          subtotal: adjustedSubtotal,
          tax_amount: adjustedTaxAmount,
          total_amount: adjustedTotalAmount,
          paid_amount: adjustedAmountTendered,
          balance_due: Math.abs(balance),
          notes: `Created from receipt ${receiptNumber} - underpayment amount: ${Math.abs(balance).toFixed(2)}`,
          created_by: profile?.id,
          currency_code: currencyCode,
          exchange_rate: currencyCode === 'USD' ? effectiveRate : 1,
          fx_date: receiptDate,
          terms_and_conditions: ''
        };

        await createInvoiceWithItems.mutateAsync({
          invoice: invoiceData,
          items: receiptItems
        });

        toast.success(`Receipt ${receiptNumber} and Invoice ${invoiceNumber} created successfully! (Underpayment detected)`);
      } else {
        toast.success(`Receipt ${receiptNumber} created successfully!`);
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating receipt:', error);
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        const supabaseError = error as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details;
        } else if (supabaseError.hint) {
          errorMessage = supabaseError.hint;
        } else if (supabaseError.error?.message) {
          errorMessage = supabaseError.error.message;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast.error(`Failed to create receipt: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
      setSubmitProgress(null);
    }
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setAmountTendered(0);
    setItems([]);
    setSearchProduct('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5 text-primary" />
            <span>Create New Receipt</span>
          </DialogTitle>
          <DialogDescription>
            Create a receipt for customer purchases - items will adjust stock
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Receipt Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency *</Label>
                    <Select value={currencyCode} onValueChange={(v) => handleCurrencyChange(v as 'KES' | 'USD')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KES">KES (Kenyan Shilling)</SelectItem>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate">Exchange Rate</Label>
                    <div className="flex items-center gap-2">
                      <Input id="rate" value={`1 KES = ${exchangeRate.toFixed(6)} ${currencyCode}`} readOnly />
                      <Button type="button" variant="outline" onClick={fetchAndSetRate} disabled={currencyCode === 'KES'}>
                        <Calculator className="h-4 w-4 mr-1" />
                        Fetch
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt_date">Receipt Date *</Label>
                  <Input
                    id="receipt_date"
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Additional notes for this receipt..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount_tendered">Amount Tendered *</Label>
                  <Input
                    id="amount_tendered"
                    type="number"
                    step="0.01"
                    value={amountTendered || ''}
                    onChange={(e) => setAmountTendered(parseFloat(e.target.value) || 0)}
                    placeholder="Enter amount received from customer"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name or code..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    {(loadingProducts || isSearching) ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {searchProduct ? 'Searching products...' : 'Loading products...'}
                      </div>
                    ) : (displayProducts && displayProducts.length === 0) ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {searchProduct ? 'No products found' : 'No products available'}
                      </div>
                    ) : (
                      (displayProducts || []).map((product) => (
                        <div
                          key={product.id}
                          className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-smooth"
                          onClick={() => addItem(product)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">{product.product_code}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatCurrency(currencyCode === 'USD' ? (Number(product.unit_price) || 0) * exchangeRate : (Number(product.unit_price) || 0))}</div>
                              <div className="text-xs text-muted-foreground">Stock: {product.stock_quantity}</div>
                              {product.category_name && (
                                <div className="text-xs text-muted-foreground">{product.category_name}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {!searchProduct && (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      Start typing to search products, or select from popular items above
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Receipt Items</span>
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
                    <TableHead>Disc. Before VAT</TableHead>
                    <TableHead>VAT %</TableHead>
                    <TableHead>VAT Incl.</TableHead>
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
                          placeholder="0"
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
                        {formatCurrency(item.line_total)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {items.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-80 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">{formatCurrency(items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0))}</span>
                    </div>
                    {totalDiscountAmount > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Discount:</span>
                        <span className="font-semibold">-{formatCurrency(totalDiscountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>After Discount:</span>
                      <span className="font-semibold">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT:</span>
                      <span className="font-semibold">{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between text-lg border-t pt-2 font-bold">
                      <span>Total Due:</span>
                      <span className="text-primary">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Amount Tendered:</span>
                      <span className="font-semibold">{formatCurrency(amountTendered)}</span>
                    </div>
                    <div className={`flex justify-between text-sm font-bold ${amountTendered - totalAmount < 0 ? 'text-destructive' : 'text-success'}`}>
                      <span>Balance:</span>
                      <span>{formatCurrency(amountTendered - totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span>Items: {items.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {submitProgress && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    {submitProgress.step}
                  </span>
                  <span className="text-xs text-blue-700">
                    {submitProgress.current} of {submitProgress.total}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(submitProgress.current / submitProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedCustomerId || items.length === 0} className="min-w-32">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {submitProgress ? 'Processing...' : 'Creating...'}
              </>
            ) : (
              <>
                <Receipt className="mr-2 h-4 w-4" />
                Create Receipt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

    </Dialog>
  );
}

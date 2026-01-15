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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Trash2,
  Calculator
} from 'lucide-react';
import { useCustomers, useProducts, useGenerateDocumentNumber, useTaxSettings, useCompanies } from '@/hooks/useDatabase';
import { useCreateQuotationWithItems } from '@/hooks/useQuotationItems';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { convertAmount } from '@/utils/currency';
import { getExchangeRate } from '@/utils/exchangeRates';
import { ItemAutocomplete, type AutocompleteItem, type NewItemData } from '@/components/ui/item-autocomplete';
import { useNewItemsAutoSave } from '@/hooks/useNewItemsAutoSave';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';

interface QuotationItem {
  id: string;
  product_id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_percentage: number;
  vat_inclusive: boolean;
  line_total: number;
}

interface CreateQuotationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateQuotationModal({ open, onOpenChange, onSuccess }: CreateQuotationModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('We trust that you will look at this quote satisfactorily........, looking forward to the order. Thank you for Your business!');
  
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<QuotationItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { currency, rate, format } = useCurrency();
  const formatCurrency = (amount: number) => format(convertAmount(Number(amount) || 0, 'KES', currency, rate));
  const { newItems, tempIdToActualIdMap, addNewItem, saveAllNewItems, clearNewItems } = useNewItemsAutoSave();

  // Get current user and company from context
  const { profile, loading: authLoading } = useAuth();
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const { data: customers, isLoading: loadingCustomers } = useCustomers(currentCompany?.id);
  const { data: products, isLoading: loadingProducts } = useProducts(currentCompany?.id);
  const { data: taxSettings } = useTaxSettings(currentCompany?.id);

  // Log for debugging if needed
  if (process.env.NODE_ENV === 'development') {
    console.log('Company:', currentCompany?.name, 'Customers:', customers?.length || 0);
  }
  const createQuotationWithItems = useCreateQuotationWithItems();
  const generateDocNumber = useGenerateDocumentNumber();

  // Get default tax rate
  const defaultTax = taxSettings?.find(tax => tax.is_default && tax.is_active);
  const defaultTaxRate = defaultTax?.rate || 16; // Fallback to 16% if no default is set

  // Convert products to AutocompleteItem format
  const autocompleteItems: AutocompleteItem[] = (products || []).map(product => ({
    id: product.id,
    name: product.name,
    product_code: product.product_code,
    selling_price: product.selling_price,
    stock_quantity: product.stock_quantity,
    description: product.description,
  }));

  const calculateItemTotal = (quantity: number, unitPrice: number, taxPercentage: number, taxInclusive: boolean) => {
    const baseAmount = quantity * unitPrice;

    if (taxPercentage === 0 || !taxInclusive) {
      // No tax applied or tax checkbox unchecked
      return baseAmount;
    }

    // Tax checkbox checked: add tax to the base amount
    const taxAmount = baseAmount * (taxPercentage / 100);
    return baseAmount + taxAmount;
  };

  const calculateTaxAmount = (item: QuotationItem) => {
    const baseAmount = item.quantity * item.unit_price;

    if (item.vat_percentage === 0 || !item.vat_inclusive) {
      // No tax or tax checkbox unchecked
      return 0;
    }

    // Tax checkbox checked: calculate tax on base amount
    return baseAmount * (item.vat_percentage / 100);
  };

  const addItem = (product: AutocompleteItem) => {
    const existingItem = items.find(item => item.product_id === product.id);

    if (existingItem) {
      // Increase quantity if item already exists
      updateItemQuantity(existingItem.id, existingItem.quantity + 1);
      return;
    }

    const newItem: QuotationItem = {
      id: `temp-${Date.now()}`,
      product_id: product.id,
      product_name: product.name,
      description: product.description || product.name,
      quantity: 1,
      unit_price: product.selling_price || 0,
      vat_percentage: 0,
      vat_inclusive: false,
      line_total: calculateItemTotal(1, product.selling_price || 0, 0, false)
    };

    setItems([...items, newItem]);
  };

  const handleCreateNewItem = async (itemData: NewItemData): Promise<AutocompleteItem> => {
    // Create temporary ID for this item
    const tempId = `new-${Date.now()}`;

    // Add to new items queue for auto-save
    addNewItem(itemData, tempId);

    // Return immediately with a temporary item that can be used in the form
    return {
      id: tempId,
      name: itemData.name,
      product_code: itemData.product_code,
      selling_price: itemData.selling_price,
      description: itemData.description,
      stock_quantity: 0,
    };
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems(items.map(item => {
      if (item.id === itemId) {
        const lineTotal = calculateItemTotal(quantity, item.unit_price, item.vat_percentage, item.vat_inclusive);
        return { ...item, quantity, line_total: lineTotal };
      }
      return item;
    }));
  };

  const updateItemPrice = (itemId: string, unitPrice: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const lineTotal = calculateItemTotal(item.quantity, unitPrice, item.vat_percentage, item.vat_inclusive);
        return { ...item, unit_price: unitPrice, line_total: lineTotal };
      }
      return item;
    }));
  };

  const updateItemVAT = (itemId: string, vatPercentage: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const lineTotal = calculateItemTotal(item.quantity, item.unit_price, vatPercentage, item.vat_inclusive);
        return { ...item, vat_percentage: vatPercentage, line_total: lineTotal };
      }
      return item;
    }));
  };

  const updateItemVATInclusive = (itemId: string, vatInclusive: boolean) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        // When checking VAT Inclusive, auto-apply default tax rate if no VAT is set
        let newVatPercentage = item.vat_percentage;
        if (vatInclusive && item.vat_percentage === 0) {
          newVatPercentage = defaultTaxRate;
        }
        // When unchecking VAT Inclusive, reset VAT to 0
        if (!vatInclusive) {
          newVatPercentage = 0;
        }

        const lineTotal = calculateItemTotal(item.quantity, item.unit_price, newVatPercentage, vatInclusive);
        return { ...item, vat_inclusive: vatInclusive, vat_percentage: newVatPercentage, line_total: lineTotal };
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


  const subtotal = items.reduce((sum, item) => {
    // Unit prices are always tax-exclusive, so subtotal is always the base amount
    return sum + (item.quantity * item.unit_price);
  }, 0);
  const taxAmount = items.reduce((sum, item) => sum + calculateTaxAmount(item), 0);
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

    if (!quotationDate) {
      toast.error('Please select a quotation date');
      return;
    }

    if (!validUntil) {
      toast.error('Please select a valid until date');
      return;
    }

    // Save any new items before submitting the quotation
    if (newItems.length > 0) {
      if (!currentCompany?.id) {
        toast.error('No company selected. Cannot save new items.');
        return;
      }

      try {
        await saveAllNewItems(currentCompany.id);

        // Update items array with actual product IDs
        setItems(prevItems => prevItems.map(item => {
          const actualId = tempIdToActualIdMap.get(item.product_id);
          if (actualId) {
            return { ...item, product_id: actualId };
          }
          return item;
        }));
      } catch (error) {
        toast.error('Failed to save new items. Please try again.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      console.log('Starting quotation creation process...');
      console.log('Selected customer:', selectedCustomerId);
      console.log('Items count:', items.length);
      console.log('Quotation date:', quotationDate);
      console.log('Valid until:', validUntil);

      // Generate quotation number
      console.log('Generating quotation number...');
      const quotationNumber = await generateDocNumber.mutateAsync({
        companyId: currentCompany?.id || 'default-company-id',
        type: 'quotation'
      });
      console.log('Generated quotation number:', quotationNumber);

      // Validate required fields
      if (!currentCompany?.id) {
        toast.error('No company selected. Please ensure you are associated with a company.');
        return;
      }

      // Check if auth is still loading
      if (authLoading) {
        toast.info('Please wait, authenticating user...');
        return;
      }

      // Check if user is authenticated and has profile
      if (!profile?.id) {
        toast.error('User not authenticated. Please sign in and try again.');
        return;
      }

      // Determine effective exchange rate and convert values if needed
      let effectiveRate = currency === 'USD' ? rate : 1;
      if (currency === 'USD' && (!Number.isFinite(effectiveRate) || effectiveRate <= 0 || effectiveRate === 1)) {
        try {
          const fetched = await getExchangeRate('KES', 'USD', quotationDate);
          if (!fetched || fetched <= 0) throw new Error('Unable to fetch exchange rate for the selected date');
          effectiveRate = fetched;
          toast.success(`Locked exchange rate for ${quotationDate}: ${fetched.toFixed(4)}`);
        } catch (e: any) {
          toast.error(e?.message || 'Failed to fetch exchange rate');
          throw e;
        }
      }

      // Create quotation with items
      console.log('Preparing quotation data...');
      const subtotalFinal = currency === 'USD' ? convertAmount(subtotal, 'KES', 'USD', effectiveRate) : subtotal;
      const taxAmountFinal = currency === 'USD' ? convertAmount(taxAmount, 'KES', 'USD', effectiveRate) : taxAmount;
      const totalAmountFinal = currency === 'USD' ? convertAmount(totalAmount, 'KES', 'USD', effectiveRate) : totalAmount;

      const quotationData = {
        company_id: currentCompany.id,
        customer_id: selectedCustomerId,
        quotation_number: quotationNumber,
        quotation_date: quotationDate,
        valid_until: validUntil,
        status: 'draft',
        subtotal: subtotalFinal,
        tax_amount: taxAmountFinal,
        total_amount: totalAmountFinal,
        terms_and_conditions: termsAndConditions,
        notes: notes,
        created_by: profile.id,
        currency_code: currency,
        exchange_rate: currency === 'USD' ? effectiveRate : 1,
        fx_date: quotationDate
      };
      console.log('Quotation data prepared:', quotationData);

      console.log('Preparing quotation items...');
      const quotationItems = items.map(item => {
        // Validate item data
        if (!item.description || item.description.trim() === '') {
          throw new Error(`Item "${item.product_name}" is missing a description`);
        }
        if (item.quantity <= 0) {
          throw new Error(`Item "${item.product_name}" must have a quantity greater than 0`);
        }
        if (item.unit_price < 0) {
          throw new Error(`Item "${item.product_name}" cannot have a negative unit price`);
        }

        const unitPriceFinal = currency === 'USD' ? convertAmount(item.unit_price, 'KES', 'USD', effectiveRate) : item.unit_price;
        const taxAmountBase = calculateTaxAmount(item);
        const taxAmountFinalItem = currency === 'USD' ? convertAmount(taxAmountBase, 'KES', 'USD', effectiveRate) : taxAmountBase;
        const lineTotalFinal = currency === 'USD' ? convertAmount(item.line_total, 'KES', 'USD', effectiveRate) : item.line_total;

        return {
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: unitPriceFinal,
          discount_percentage: 0,
          tax_percentage: item.vat_percentage || 0,
          tax_amount: taxAmountFinalItem,
          tax_inclusive: item.vat_inclusive || false,
          line_total: lineTotalFinal
        };
      });
      console.log('Quotation items prepared:', quotationItems);

      // Validate quotation data
      if (!quotationData.customer_id) {
        throw new Error('Customer is required');
      }
      if (!quotationData.quotation_date) {
        throw new Error('Quotation date is required');
      }
      if (!quotationData.quotation_number) {
        throw new Error('Failed to generate quotation number');
      }

      console.log('Submitting quotation to database...');
      await createQuotationWithItems.mutateAsync({
        quotation: quotationData,
        items: quotationItems
      });
      console.log('Quotation created successfully!');

      toast.success(`Quotation ${quotationNumber} created successfully!`);
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating quotation:', error);
      console.error('Error type:', typeof error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        // Handle Supabase error objects
        const supabaseError = error as any;

        // Check for common Supabase error patterns
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details;
        } else if (supabaseError.hint) {
          errorMessage = supabaseError.hint;
        } else if (supabaseError.error?.message) {
          errorMessage = supabaseError.error.message;
        } else if (supabaseError.statusText) {
          errorMessage = supabaseError.statusText;
        } else if (supabaseError.data?.message) {
          errorMessage = supabaseError.data.message;
        } else {
          // Last resort - try to extract meaningful info
          const errorStr = JSON.stringify(error);
          if (errorStr.length > 50) {
            errorMessage = 'Database operation failed. Please check your data and try again.';
          } else {
            errorMessage = errorStr;
          }
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast.error(`Failed to create quotation: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setQuotationDate(new Date().toISOString().split('T')[0]);
    setValidUntil(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setNotes('');
    setTermsAndConditions('We trust that you will look at this quote satisfactorily........, looking forward to the order. Thank you for Your business!');
    setItems([]);
    clearNewItems();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-primary" />
            <span>Create New Quotation</span>
          </DialogTitle>
          <DialogDescription>
            Create a detailed quotation with multiple items for your customer
          </DialogDescription>

        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Quotation Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quotation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Selection */}
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCustomers ? (
                        <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                      ) : !currentCompany ? (
                        <SelectItem value="no-company" disabled>No company found - please refresh</SelectItem>
                      ) : !customers || customers.length === 0 ? (
                        <SelectItem value="no-customers" disabled>No customers found - create customers first</SelectItem>
                      ) : (
                        customers.map((customer) => (
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
                    <Label htmlFor="quotation_date">Quotation Date *</Label>
                    <Input
                      id="quotation_date"
                      type="date"
                      value={quotationDate}
                      onChange={(e) => setQuotationDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valid_until">Valid Until</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Additional notes for this quotation..."
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
                <ItemAutocomplete
                  items={autocompleteItems}
                  isLoading={loadingProducts}
                  onSelectItem={addItem}
                  onCreateNewItem={handleCreateNewItem}
                  placeholder="Search products by name or code..."
                  allowNew={true}
                  showPrices={true}
                />
                {newItems.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      {newItems.length} new product(s) will be added to your inventory when you submit.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Quotation Items</span>
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
                          value={item.vat_percentage}
                          onChange={(e) => updateItemVAT(item.id, parseFloat(e.target.value) || 0)}
                          className="w-20"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="0"
                          disabled={item.vat_inclusive}
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={item.vat_inclusive}
                          onCheckedChange={(checked) => updateItemVATInclusive(item.id, !!checked)}
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

            {/* Totals */}
            {items.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-80 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT:</span>
                      <span className="font-semibold">{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between text-lg border-t pt-2">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold text-primary">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedCustomerId || items.length === 0}>
            <Calculator className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Creating...' : 'Create Quotation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

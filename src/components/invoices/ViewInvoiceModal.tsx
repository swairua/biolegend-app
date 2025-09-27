import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCurrency } from '@/contexts/CurrencyContext';
import { normalizeInvoiceAmount } from '@/utils/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Receipt,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Download,
  Send,
  DollarSign,
  Edit
} from 'lucide-react';

interface ViewInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  onEdit: () => void;
  onDownload: () => void;
  onSend: () => void;
  onRecordPayment: () => void;
}

export function ViewInvoiceModal({ 
  open, 
  onOpenChange, 
  invoice, 
  onEdit, 
  onDownload, 
  onSend, 
  onRecordPayment 
}: ViewInvoiceModalProps) {
  if (!invoice) return null;

  const { currency, rate, format } = useCurrency();
  const formatCurrency = (amount: number) => format(
    normalizeInvoiceAmount(Number(amount) || 0, invoice?.currency_code as any, invoice?.exchange_rate as any, currency, rate)
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-muted text-muted-foreground border-muted-foreground/20';
      case 'sent':
        return 'bg-warning-light text-warning border-warning/20';
      case 'paid':
        return 'bg-success-light text-success border-success/20';
      case 'partial':
        return 'bg-primary-light text-primary border-primary/20';
      case 'overdue':
        return 'bg-destructive-light text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/20';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Receipt className="h-6 w-6 text-primary" />
              <div>
                <div className="flex items-center space-x-2">
                  <span>Invoice {invoice.invoice_number}</span>
                  <Badge variant="outline" className={getStatusColor(invoice.status)}>
                    {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground font-normal">
                  {formatCurrency(invoice.total_amount || 0)}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {invoice.status === 'draft' && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {invoice.customers?.email && invoice.status === 'draft' && (
                <Button variant="outline" size="sm" onClick={onSend}>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              )}
              <Button size="sm" onClick={onRecordPayment}>
                <DollarSign className="h-4 w-4 mr-2" />
                {(invoice.balance_due || 0) > 0 ? 'Record Payment' : 'Payment Adjustment'}
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Invoice details and line items
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Customer Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="font-medium text-lg">{invoice.customers?.name || 'Unknown Customer'}</div>
                <div className="text-sm text-muted-foreground">{invoice.customers?.customer_code || 'N/A'}</div>
              </div>

              {invoice.customers?.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{invoice.customers.email}</span>
                </div>
              )}

              {invoice.customers?.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{invoice.customers.phone}</span>
                </div>
              )}

              {invoice.customers?.address && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <div>{invoice.customers.address}</div>
                    {invoice.customers.city && (
                      <div className="text-muted-foreground">
                        {invoice.customers.city}, {invoice.customers.country || 'Kenya'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Invoice Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Invoice Date:</span>
                  <div className="font-medium flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(invoice.invoice_date)}</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Due Date:</span>
                  <div className="font-medium flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(invoice.due_date)}</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Amount:</span>
                  <div className="font-bold text-lg text-primary">
                    {formatCurrency(invoice.total_amount || 0)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Balance Due:</span>
                  <div className={`font-bold text-lg ${(invoice.balance_due || 0) > 0 ? 'text-destructive' : 'text-success'}`}>
                    {formatCurrency(invoice.balance_due || 0)}
                  </div>
                </div>
              </div>

              {invoice.notes && (
                <div>
                  <span className="text-muted-foreground text-sm">Notes:</span>
                  <div className="text-sm mt-1 p-2 bg-muted/50 rounded">
                    {invoice.notes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Invoice Items</span>
              <Badge variant="outline">
                {invoice.invoice_items?.length || 0} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!invoice.invoice_items || invoice.invoice_items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No items found for this invoice
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
                    <TableHead>VAT %</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.invoice_items.map((item: any, index: number) => (
                    <TableRow key={item.id || index}>
                      <TableCell className="w-12 text-center">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {item.products?.name || item.description || 'Unknown Product'}
                          </div>
                          {item.description && item.description !== item.products?.name && (
                            <div className="text-sm text-muted-foreground">{item.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell>{item.discount_percentage || 0}%</TableCell>
                      <TableCell>{item.tax_percentage || 0}%</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.line_total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Invoice Totals */}
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(invoice.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT:</span>
                    <span className="font-semibold">{formatCurrency(invoice.tax_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-lg border-t pt-2">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-primary">{formatCurrency(invoice.total_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Paid:</span>
                    <span>{formatCurrency(invoice.paid_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-lg border-t pt-2">
                    <span className="font-bold">Balance Due:</span>
                    <span className={`font-bold ${(invoice.balance_due || 0) > 0 ? 'text-destructive' : 'text-success'}`}>
                      {formatCurrency(invoice.balance_due || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

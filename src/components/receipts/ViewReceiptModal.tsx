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
  Download
} from 'lucide-react';

interface ViewReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: any;
  onDownload: () => void;
}

export function ViewReceiptModal({ 
  open, 
  onOpenChange, 
  receipt, 
  onDownload
}: ViewReceiptModalProps) {
  if (!receipt) return null;

  const { currency, rate, format } = useCurrency();
  const formatCurrency = (amount: number) => format(
    normalizeInvoiceAmount(Number(amount) || 0, receipt?.currency_code as any, receipt?.exchange_rate as any, currency, rate)
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Receipt className="h-6 w-6 text-primary" />
              <div>
                <div className="flex items-center space-x-2">
                  <span>Receipt {receipt.invoice_number}</span>
                  <Badge variant="outline" className={getStatusColor(receipt.status)}>
                    {receipt.status?.charAt(0).toUpperCase() + receipt.status?.slice(1)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground font-normal">
                  {formatCurrency(receipt.total_amount || 0)}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Receipt details and item breakdown
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Customer Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <div className="font-semibold text-foreground">{receipt.customers?.name || 'Unknown Customer'}</div>
              </div>
              {receipt.customers?.email && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{receipt.customers.email}</span>
                </div>
              )}
              {receipt.customers?.phone && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{receipt.customers.phone}</span>
                </div>
              )}
              {receipt.customers?.address && (
                <div className="flex items-start space-x-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <span>
                    {receipt.customers.address}
                    {receipt.customers.city ? `, ${receipt.customers.city}` : ''}
                    {receipt.customers.country ? `, ${receipt.customers.country}` : ''}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Receipt Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt Number:</span>
                <span className="font-semibold">{receipt.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-semibold">{formatDate(receipt.invoice_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className={getStatusColor(receipt.status)}>
                  {receipt.status?.charAt(0).toUpperCase() + receipt.status?.slice(1)}
                </Badge>
              </div>
              {receipt.currency_code && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency:</span>
                  <span className="font-semibold">{receipt.currency_code}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {receipt.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{receipt.notes}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Receipt Items</CardTitle>
          </CardHeader>
          <CardContent>
            {receipt.invoice_items && receipt.invoice_items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipt.invoice_items.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="w-12 text-center text-sm">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{item.products?.name || item.product_name}</div>
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatCurrency(item.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No items in this receipt
              </div>
            )}

            {receipt.invoice_items && receipt.invoice_items.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-80 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">{formatCurrency(receipt.subtotal || 0)}</span>
                    </div>
                    {receipt.tax_amount && receipt.tax_amount > 0 && (
                      <div className="flex justify-between">
                        <span>VAT:</span>
                        <span className="font-semibold">{formatCurrency(receipt.tax_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base border-t pt-2 font-bold">
                      <span>Total Amount Received:</span>
                      <span className="text-primary">{formatCurrency(receipt.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Calendar,
  User,
  DollarSign,
  Package,
  Download,
  Printer,
  Send,
  Trash2
} from 'lucide-react';
import type { CreditNote } from '@/hooks/useCreditNotes';
import { useCreditNotePDFDownload } from '@/hooks/useCreditNotePDF';
import { useCurrency } from '@/contexts/CurrencyContext';
import { normalizeInvoiceAmount } from '@/utils/currency';

interface ViewCreditNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditNote: CreditNote | null;
  onDelete?: (creditNote: CreditNote) => void;
}

export function ViewCreditNoteModal({ open, onOpenChange, creditNote, onDelete }: ViewCreditNoteModalProps) {
  const downloadPDF = useCreditNotePDFDownload();

  const { currency, rate, format } = useCurrency();

  if (!creditNote) return null;
  const fmt = (amount: number) => format(
    normalizeInvoiceAmount(Number(amount) || 0, (creditNote as any).currency_code as any, (creditNote as any).exchange_rate as any, currency, rate)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-muted text-muted-foreground border-muted-foreground/20';
      case 'sent':
        return 'bg-warning-light text-warning border-warning/20';
      case 'applied':
        return 'bg-success-light text-success border-success/20';
      case 'cancelled':
        return 'bg-destructive-light text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/20';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>Credit Note {creditNote.credit_note_number}</span>
            <Badge variant="outline" className={getStatusColor(creditNote.status)}>
              {creditNote.status.charAt(0).toUpperCase() + creditNote.status.slice(1)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Credit note details and line items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <User className="h-4 w-4 mr-2 text-primary" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="font-semibold">{creditNote.customers?.name || 'Unknown Customer'}</div>
                  {creditNote.customers?.email && (
                    <div className="text-sm text-muted-foreground">{creditNote.customers.email}</div>
                  )}
                  {creditNote.customers?.phone && (
                    <div className="text-sm text-muted-foreground">{creditNote.customers.phone}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    Code: {creditNote.customers?.customer_code}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-primary" />
                  Credit Note Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date:</span>
                  <span className="text-sm font-medium">
                    {new Date(creditNote.credit_note_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Reason:</span>
                  <span className="text-sm font-medium">{creditNote.reason || 'Not specified'}</span>
                </div>
                {creditNote.invoice_id && creditNote.invoices && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Related Invoice:</span>
                    <span className="text-sm font-medium">{creditNote.invoices.invoice_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Affects Inventory:</span>
                  <span className="text-sm font-medium">
                    {creditNote.affects_inventory ? 'Yes' : 'No'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Credit Note Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-4 w-4 mr-2 text-primary" />
                Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {creditNote.credit_note_items && creditNote.credit_note_items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Tax %</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditNote.credit_note_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.description}</div>
                            {item.products && (
                              <div className="text-sm text-muted-foreground">
                                {item.products.name} ({item.products.product_code})
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{fmt(item.unit_price)}</TableCell>
                        <TableCell className="text-right">{item.tax_percentage}%</TableCell>
                        <TableCell className="text-right font-semibold">
                          {fmt(item.line_total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No items found for this credit note
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-primary" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{fmt(creditNote.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT Amount:</span>
                  <span className="font-semibold">{fmt(creditNote.tax_amount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total Credit:</span>
                  <span className="font-bold text-success">{fmt(creditNote.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-warning">Applied Amount:</span>
                  <span className="font-semibold text-warning">{fmt(creditNote.applied_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary">Remaining Balance:</span>
                  <span className="font-semibold text-primary">{fmt(creditNote.balance)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(creditNote.notes || creditNote.terms_and_conditions) && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {creditNote.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {creditNote.notes}
                    </p>
                  </div>
                )}
                {creditNote.terms_and_conditions && (
                  <div>
                    <h4 className="font-medium mb-2">Terms and Conditions:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {creditNote.terms_and_conditions}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadPDF.mutate(creditNote)}
                disabled={downloadPDF.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloadPDF.isPending ? 'Generating...' : 'Download PDF'}
              </Button>
              {creditNote.status === 'draft' && (
                <Button variant="outline" size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Send to Customer
                </Button>
              )}
              {creditNote.status === 'draft' && onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onDelete(creditNote);
                    onOpenChange(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>

            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  Download, 
  Send, 
  Calendar,
  User,
  Package,
  MapPin,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Phone,
  Edit
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { convertAmount } from '@/utils/currency';

interface ViewLPOModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lpo: any | null;
  onEdit: () => void;
  onDownloadPDF?: (lpo: any) => void;
  onSendEmail?: (lpo: any) => void;
  onUpdateStatus?: (lpo: any, status: string) => void;
}

export const ViewLPOModal = ({ 
  open, 
  onOpenChange, 
  lpo,
  onEdit,
  onDownloadPDF,
  onSendEmail,
  onUpdateStatus
}: ViewLPOModalProps) => {
  if (!lpo) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-secondary-light text-secondary border-secondary/20"><FileText className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-primary-light text-primary border-primary/20"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-success-light text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'received':
        return <Badge variant="outline" className="bg-success text-success-foreground"><Package className="h-3 w-3 mr-1" />Received</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-destructive-light text-destructive border-destructive/20"><AlertTriangle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const { currency, rate, format } = useCurrency();
  const formatCurrency = (amount: number) => format(convertAmount(Number(amount) || 0, 'KES', currency, rate));

  const handleDownload = () => {
    onDownloadPDF?.(lpo);
  };

  const handleSendEmail = () => {
    onSendEmail?.(lpo);
  };

  const handleStatusUpdate = (newStatus: string) => {
    onUpdateStatus?.(lpo, newStatus);
  };

  const canUpdateToStatus = (targetStatus: string) => {
    const statusFlow = {
      'draft': ['sent', 'cancelled'],
      'sent': ['approved', 'cancelled'],
      'approved': ['received', 'cancelled'],
      'received': [],
      'cancelled': []
    };
    return statusFlow[lpo.status]?.includes(targetStatus) || false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Purchase Order #{lpo.lpo_number}
          </DialogTitle>
          <DialogDescription>
            View purchase order details and manage status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Purchase Order Details
                </CardTitle>
                {getStatusBadge(lpo.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">LPO Number</p>
                  <p className="text-sm">{lpo.lpo_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">LPO Date</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(lpo.lpo_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivery Date</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(lpo.delivery_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="text-sm font-bold text-primary">{formatCurrency(lpo.total_amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supplier and Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier Information */}
            {lpo.suppliers && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Supplier Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{lpo.suppliers.name}</p>
                    {lpo.suppliers.email && (
                      <p className="text-sm text-muted-foreground">{lpo.suppliers.email}</p>
                    )}
                    {lpo.suppliers.phone && (
                      <p className="text-sm text-muted-foreground">{lpo.suppliers.phone}</p>
                    )}
                    {lpo.suppliers.address && (
                      <p className="text-sm text-muted-foreground">{lpo.suppliers.address}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lpo.delivery_address && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Delivery Address</p>
                      <p className="text-sm whitespace-pre-wrap">{lpo.delivery_address}</p>
                    </div>
                  )}
                  {lpo.contact_person && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
                      <p className="text-sm">{lpo.contact_person}</p>
                    </div>
                  )}
                  {lpo.contact_phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Contact Phone</p>
                      <p className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lpo.contact_phone}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items */}
          {lpo.lpo_items && lpo.lpo_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Items Ordered</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>VAT Rate</TableHead>
                      <TableHead>VAT Amount</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lpo.lpo_items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.products?.name || 'Unknown Product'}
                          {item.products?.product_code && (
                            <div className="text-xs text-muted-foreground">
                              {item.products.product_code}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>
                          {item.quantity} {item.products?.unit_of_measure || 'pcs'}
                        </TableCell>
                        <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell>{item.tax_rate}%</TableCell>
                        <TableCell>{formatCurrency(item.tax_amount)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(item.line_total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Separator className="my-4" />

                {/* Totals Summary */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(lpo.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT:</span>
                      <span>{formatCurrency(lpo.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(lpo.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lpo.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {lpo.notes}
                  </p>
                </CardContent>
              </Card>
            )}
            
            {lpo.terms_and_conditions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Terms & Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {lpo.terms_and_conditions}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex flex-wrap gap-2 w-full justify-between">
            {/* Status Update Buttons */}
            <div className="flex gap-2">
              {canUpdateToStatus('sent') && (
                <Button 
                  variant="outline" 
                  onClick={() => handleStatusUpdate('sent')}
                  className="bg-primary-light text-primary"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Mark as Sent
                </Button>
              )}
              {canUpdateToStatus('approved') && (
                <Button 
                  variant="outline" 
                  onClick={() => handleStatusUpdate('approved')}
                  className="bg-success-light text-success"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              )}
              {canUpdateToStatus('received') && (
                <Button 
                  variant="outline" 
                  onClick={() => handleStatusUpdate('received')}
                  className="bg-success text-success-foreground"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Mark as Received
                </Button>
              )}
              {canUpdateToStatus('cancelled') && (
                <Button 
                  variant="outline" 
                  onClick={() => handleStatusUpdate('cancelled')}
                  className="bg-destructive-light text-destructive"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={handleSendEmail}>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

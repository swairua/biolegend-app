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
  CreditCard, 
  Download, 
  Send, 
  Calendar,
  User,
  DollarSign,
  FileText,
  CheckCircle,
  Receipt
} from 'lucide-react';

interface PaymentAllocation {
  id: string;
  invoice_number: string;
  allocated_amount: number;
  invoice_total: number;
}

interface Payment {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  customers?: {
    name: string;
    email?: string;
    phone?: string;
  };
  payment_allocations?: PaymentAllocation[];
}

interface ViewPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  onDownloadReceipt?: (payment: Payment) => void;
  onSendReceipt?: (payment: Payment) => void;
}

export const ViewPaymentModal = ({ 
  open, 
  onOpenChange, 
  payment,
  onDownloadReceipt,
  onSendReceipt
}: ViewPaymentModalProps) => {
  if (!payment) return null;

  const getPaymentMethodBadge = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <Badge variant="destructive"><DollarSign className="h-3 w-3 mr-1" />Cash</Badge>;
      case 'credit_card':
        return <Badge variant="default"><CreditCard className="h-3 w-3 mr-1" />Credit Card</Badge>;
      case 'bank_transfer':
        return <Badge variant="secondary">Bank Transfer</Badge>;
      case 'check':
        return <Badge variant="outline">Check</Badge>;
      default:
        return <Badge variant="secondary">{method}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleDownload = () => {
    onDownloadReceipt?.(payment);
  };

  const handleSendReceipt = () => {
    onSendReceipt?.(payment);
  };

  const totalAllocated = payment.payment_allocations?.reduce((sum, allocation) => 
    sum + allocation.allocated_amount, 0
  ) || 0;

  const unallocatedAmount = payment.amount - totalAllocated;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment #{payment.payment_number}
          </DialogTitle>
          <DialogDescription>
            View payment details and allocation information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Header Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Details
                </CardTitle>
                <div className="flex items-center gap-2">
                  {getPaymentMethodBadge(payment.payment_method)}
                  <Badge variant="destructive">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Received
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Number</p>
                  <p className="text-sm font-mono">{payment.payment_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Date</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(payment.payment_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount (KES)</p>
                  <p className="text-sm flex items-center gap-1 font-medium">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(payment.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                  <p className="text-sm">{payment.payment_method.replace('_', ' ')}</p>
                </div>
              </div>

              {payment.reference_number && (
                <div className="mt-4 pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Reference Number</p>
                    <p className="text-sm font-mono">{payment.reference_number}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          {payment.customers && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{payment.customers.name}</p>
                  {payment.customers.email && (
                    <p className="text-sm text-muted-foreground">{payment.customers.email}</p>
                  )}
                  {payment.customers.phone && (
                    <p className="text-sm text-muted-foreground">{payment.customers.phone}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Allocations */}
          {payment.payment_allocations && payment.payment_allocations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Invoice Allocations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Invoice Total</TableHead>
                      <TableHead>Allocated Amount</TableHead>
                      <TableHead>Remaining Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payment.payment_allocations.map((allocation) => (
                      <TableRow key={allocation.id}>
                        <TableCell className="font-medium">{allocation.invoice_number}</TableCell>
                        <TableCell>{formatCurrency(allocation.invoice_total)}</TableCell>
                        <TableCell className="font-medium text-success">
                          {formatCurrency(allocation.allocated_amount)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(allocation.invoice_total - allocation.allocated_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Separator className="my-4" />

                {/* Allocation Summary */}
                <div className="space-y-2 max-w-sm ml-auto">
                  <div className="flex justify-between">
                    <span className="text-sm">Payment Amount:</span>
                    <span className="text-sm font-medium">{formatCurrency(payment.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Allocated:</span>
                    <span className="text-sm">{formatCurrency(totalAllocated)}</span>
                  </div>
                  {unallocatedAmount > 0 && (
                    <div className="flex justify-between text-warning">
                      <span className="text-sm">Unallocated:</span>
                      <span className="text-sm font-medium">{formatCurrency(unallocatedAmount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Status:</span>
                    <span className="text-success">
                      {unallocatedAmount === 0 ? 'Fully Allocated' : 'Partially Allocated'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Notes */}
          {payment.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Payment Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {payment.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Summary Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-muted-foreground">Total Payment</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalAllocated)}</p>
                  <p className="text-xs text-muted-foreground">Allocated</p>
                </div>
                {unallocatedAmount > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-warning">{formatCurrency(unallocatedAmount)}</p>
                    <p className="text-xs text-muted-foreground">Unallocated</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </Button>
            <Button variant="outline" onClick={handleSendReceipt}>
              <Send className="h-4 w-4 mr-2" />
              Send Receipt
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

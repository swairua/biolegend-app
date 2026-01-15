import { useMemo } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Download,
  Send,
  Calendar,
  User,
  Receipt,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/utils/taxCalculation';

interface ProformaItem {
  id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_percentage: number;
  tax_amount: number;
  line_total: number;
}

interface Proforma {
  id: string;
  proforma_number: string;
  proforma_date: string;
  valid_until: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  terms_and_conditions?: string;
  customers?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  proforma_items?: ProformaItem[];
}

interface ViewProformaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proforma: Proforma | null;
  onDownloadPDF?: (proforma: Proforma) => void;
  onSendEmail?: (proforma: Proforma) => void;
  onCreateInvoice?: (proforma: Proforma) => void;
}

export const ViewProformaModal = ({
  open,
  onOpenChange,
  proforma,
  onDownloadPDF,
  onSendEmail,
  onCreateInvoice
}: ViewProformaModalProps) => {
  if (!proforma) return null;

  // 🔍 Deduplicate items for display
  const { deduplicatedItems, hasDuplicates, duplicateCount } = useMemo(() => {
    if (!proforma.proforma_items || proforma.proforma_items.length === 0) {
      return { deduplicatedItems: [], hasDuplicates: false, duplicateCount: 0 };
    }

    const productMap = new Map<string, ProformaItem>();
    let duplicateCount = 0;

    proforma.proforma_items.forEach((item) => {
      const key = item.product_id;
      if (productMap.has(key)) {
        duplicateCount++;
      } else {
        productMap.set(key, item);
      }
    });

    return {
      deduplicatedItems: Array.from(productMap.values()),
      hasDuplicates: duplicateCount > 0,
      duplicateCount
    };
  }, [proforma.proforma_items]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'sent':
        return <Badge variant="default">Sent</Badge>;
      case 'accepted':
        return <Badge variant="destructive">Accepted</Badge>;
      case 'expired':
        return <Badge variant="outline">Expired</Badge>;
      case 'converted':
        return <Badge variant="destructive">Converted to Invoice</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleDownload = () => {
    onDownloadPDF?.(proforma);
  };

  const handleSendEmail = () => {
    onSendEmail?.(proforma);
  };

  const handleCreateInvoice = () => {
    onCreateInvoice?.(proforma);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Proforma Invoice #{proforma.proforma_number}
          </DialogTitle>
          <DialogDescription>
            View proforma invoice details and perform actions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Duplicate Items Warning */}
          {hasDuplicates && (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                ⚠️ This proforma has <strong>{duplicateCount} duplicate item(s)</strong> in the database.
                The display below shows deduplicated items. Use <strong>"Repair Duplicates"</strong> from the Proforma list page to permanently clean up the database.
              </AlertDescription>
            </Alert>
          )}

          {/* Header Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Proforma Details
                </CardTitle>
                {getStatusBadge(proforma.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Proforma Number</p>
                  <p className="text-sm">{proforma.proforma_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(proforma.proforma_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valid Until</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(proforma.valid_until)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p className="text-sm flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(proforma.total_amount || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          {proforma.customers && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{proforma.customers.name}</p>
                  {proforma.customers.email && (
                    <p className="text-sm text-muted-foreground">{proforma.customers.email}</p>
                  )}
                  {proforma.customers.phone && (
                    <p className="text-sm text-muted-foreground">{proforma.customers.phone}</p>
                  )}
                  {proforma.customers.address && (
                    <p className="text-sm text-muted-foreground">{proforma.customers.address}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items */}
          {proforma.proforma_items && proforma.proforma_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>VAT %</TableHead>
                      <TableHead>VAT Amount</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proforma.proforma_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell>{item.tax_percentage}%</TableCell>
                        <TableCell>{formatCurrency(item.tax_amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.line_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Separator className="my-4" />

                {/* Totals */}
                <div className="space-y-2 max-w-sm ml-auto">
                  <div className="flex justify-between">
                    <span className="text-sm">Subtotal:</span>
                    <span className="text-sm">{formatCurrency(proforma.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">VAT:</span>
                    <span className="text-sm">{formatCurrency(proforma.tax_amount || 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(proforma.total_amount || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes and Terms */}
          {(proforma.notes || proforma.terms_and_conditions) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proforma.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-snug text-muted-foreground whitespace-pre-wrap break-words">
                      {proforma.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
              {proforma.terms_and_conditions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Terms & Conditions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-snug text-muted-foreground whitespace-pre-wrap break-words">
                      {proforma.terms_and_conditions}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={handleSendEmail}>
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            {proforma.status !== 'converted' && (
              <Button onClick={handleCreateInvoice}>
                <Receipt className="h-4 w-4 mr-2" />
                Convert to Invoice
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

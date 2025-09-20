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
import { mapDeliveryNoteForDisplay } from '@/utils/deliveryNoteMapper';
import {
  Truck,
  Download,
  Send,
  Calendar,
  User,
  Package,
  MapPin,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface DeliveryItem {
  id: string;
  product_name: string;
  description: string;
  quantity_ordered: number;
  quantity_delivered: number;
  unit_of_measure: string;
}

interface DeliveryNote {
  id: string;
  delivery_note_number: string;
  delivery_date: string;
  delivery_address: string;
  delivery_method: string;
  tracking_number?: string;
  carrier?: string;
  status: string;
  notes?: string;
  delivered_by?: string;
  received_by?: string;
  customers?: {
    name: string;
    email?: string;
    phone?: string;
  };
  delivery_items?: DeliveryItem[];
  invoice_number?: string;
}

interface ViewDeliveryNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryNote: DeliveryNote | null;
  onDownloadPDF?: (deliveryNote: DeliveryNote) => void;
  onSendEmail?: (deliveryNote: DeliveryNote) => void;
  onMarkDelivered?: (deliveryNote: DeliveryNote) => void;
}

export const ViewDeliveryNoteModal = ({
  open,
  onOpenChange,
  deliveryNote,
  onDownloadPDF,
  onSendEmail,
  onMarkDelivered
}: ViewDeliveryNoteModalProps) => {
  if (!deliveryNote) return null;

  const mappedDeliveryNote = mapDeliveryNoteForDisplay(deliveryNote);
  const noteNumber = mappedDeliveryNote.delivery_note_number || mappedDeliveryNote.delivery_number;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'prepared':
        return <Badge variant="secondary" className="bg-secondary-light text-secondary border-secondary/20"><Clock className="h-3 w-3 mr-1" />Prepared</Badge>;
      case 'in_transit':
        return <Badge variant="default" className="bg-primary text-primary-foreground"><Truck className="h-3 w-3 mr-1" />In Transit</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="bg-success-light text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-destructive-light text-destructive border-destructive/20"><AlertTriangle className="h-3 w-3 mr-1" />Failed Delivery</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDeliveryMethodDisplay = (method: string) => {
    switch (method) {
      case 'pickup':
        return 'Customer Pickup';
      case 'delivery':
        return 'Home Delivery';
      case 'courier':
        return 'Courier Service';
      case 'freight':
        return 'Freight Shipping';
      default:
        return method;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleDownload = () => {
    onDownloadPDF?.(deliveryNote);
  };

  const handleSendEmail = () => {
    onSendEmail?.(deliveryNote);
  };

  const handleMarkDelivered = () => {
    onMarkDelivered?.(deliveryNote);
  };

  const totalItemsOrdered = deliveryNote.delivery_items?.reduce((sum, item) => sum + item.quantity_ordered, 0) || 0;
  const totalItemsDelivered = deliveryNote.delivery_items?.reduce((sum, item) => sum + item.quantity_delivered, 0) || 0;
  const isPartialDelivery = totalItemsDelivered < totalItemsOrdered;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Delivery Note #{noteNumber}
          </DialogTitle>
          <DialogDescription>
            View delivery note details and track shipment status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Delivery Details
                </CardTitle>
                {getStatusBadge(mappedDeliveryNote.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivery Note #</p>
                  <p className="text-sm">{noteNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivery Date</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(mappedDeliveryNote.delivery_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivery Method</p>
                  <p className="text-sm">{getDeliveryMethodDisplay(mappedDeliveryNote.delivery_method)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Items Status</p>
                  <p className="text-sm">
                    {totalItemsDelivered}/{totalItemsOrdered} items
                    {isPartialDelivery && <span className="text-warning"> (Partial)</span>}
                  </p>
                </div>
              </div>

              {(mappedDeliveryNote.invoice_number || mappedDeliveryNote.invoices?.invoice_number) && (
                <div className="mt-4 pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Related Invoice</p>
                    <p className="text-sm font-semibold text-primary">
                      {mappedDeliveryNote.invoice_number || mappedDeliveryNote.invoices?.invoice_number}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer and Shipping Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Information */}
            {mappedDeliveryNote.customers && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{mappedDeliveryNote.customers.name}</p>
                    {mappedDeliveryNote.customers.email && (
                      <p className="text-sm text-muted-foreground">{mappedDeliveryNote.customers.email}</p>
                    )}
                    {mappedDeliveryNote.customers.phone && (
                      <p className="text-sm text-muted-foreground">{mappedDeliveryNote.customers.phone}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Delivery Address</p>
                    <p className="text-sm whitespace-pre-wrap">{mappedDeliveryNote.delivery_address}</p>
                  </div>
                  {mappedDeliveryNote.carrier && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Carrier</p>
                      <p className="text-sm">{mappedDeliveryNote.carrier}</p>
                    </div>
                  )}
                  {mappedDeliveryNote.tracking_number && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tracking Number</p>
                      <p className="text-sm font-mono">{mappedDeliveryNote.tracking_number}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items */}
          {mappedDeliveryNote.delivery_items && mappedDeliveryNote.delivery_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Items for Delivery</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Ordered</TableHead>
                      <TableHead>Delivered</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappedDeliveryNote.delivery_items.map((item) => {
                      const isFullyDelivered = item.quantity_delivered >= item.quantity_ordered;
                      const isPartiallyDelivered = item.quantity_delivered > 0 && item.quantity_delivered < item.quantity_ordered;
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.quantity_ordered}</TableCell>
                          <TableCell className={
                            isFullyDelivered ? 'text-success' : 
                            isPartiallyDelivered ? 'text-warning' : 'text-muted-foreground'
                          }>
                            {item.quantity_delivered}
                          </TableCell>
                          <TableCell>{item.unit_of_measure}</TableCell>
                          <TableCell>
                            {isFullyDelivered ? (
                              <Badge className="text-xs bg-success text-success-foreground">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Complete
                              </Badge>
                            ) : isPartiallyDelivered ? (
                              <Badge className="text-xs bg-warning text-warning-foreground">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Partial
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Delivery Personnel and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(mappedDeliveryNote.delivered_by || mappedDeliveryNote.received_by) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Personnel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mappedDeliveryNote.delivered_by && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Delivered By</p>
                      <p className="text-sm">{mappedDeliveryNote.delivered_by}</p>
                    </div>
                  )}
                  {mappedDeliveryNote.received_by && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Received By</p>
                      <p className="text-sm">{mappedDeliveryNote.received_by}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {mappedDeliveryNote.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Delivery Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {mappedDeliveryNote.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
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
            {mappedDeliveryNote.status !== 'delivered' && (
              <Button onClick={handleMarkDelivered}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Delivered
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

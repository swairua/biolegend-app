import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  CreditCard,
  Calendar,
  FileText,
  DollarSign,
  Activity
} from 'lucide-react';
import { useCustomerInvoices, useCustomerPayments } from '@/hooks/useDatabase';

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  credit_limit?: number;
  payment_terms?: number;
  is_active?: boolean;
  created_at?: string;
}

interface ViewCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onEdit: () => void;
  onCreateInvoice: () => void;
}

export function ViewCustomerModal({ open, onOpenChange, customer, onEdit, onCreateInvoice }: ViewCustomerModalProps) {
  if (!customer) return null;

  // Fetch real customer data
  const { data: invoices } = useCustomerInvoices(customer.id);
  const { data: payments } = useCustomerPayments(customer.id);

  // Calculate real account metrics
  const totalInvoiced = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  const totalPaid = payments?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0;
  const outstandingBalance = totalInvoiced - totalPaid;
  const totalInvoices = invoices?.length || 0;
  const totalPayments = payments?.length || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                {customer.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <span>{customer.name}</span>
                <Badge variant="outline" className={customer.is_active !== false ? 'bg-success-light text-success border-success/20' : 'bg-muted text-muted-foreground border-muted-foreground/20'}>
                  {customer.is_active !== false ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">{customer.customer_code}</div>
            </div>
          </DialogTitle>
          <DialogDescription>
            View complete customer information and account details
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Contact Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{customer.email}</div>
                    <div className="text-sm text-muted-foreground">Email Address</div>
                  </div>
                </div>
              )}

              {customer.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{customer.phone}</div>
                    <div className="text-sm text-muted-foreground">Phone Number</div>
                  </div>
                </div>
              )}

              {customer.address && (
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <div className="font-medium">{customer.address}</div>
                    <div className="text-sm text-muted-foreground">
                      {customer.city && customer.country 
                        ? `${customer.city}, ${customer.country}`
                        : customer.city || customer.country || 'Address'
                      }
                    </div>
                  </div>
                </div>
              )}

              {customer.created_at && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{formatDate(customer.created_at)}</div>
                    <div className="text-sm text-muted-foreground">Customer Since</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>Business Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{formatCurrency(customer.credit_limit || 0)}</div>
                  <div className="text-sm text-muted-foreground">Credit Limit</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{customer.payment_terms || 30} days</div>
                  <div className="text-sm text-muted-foreground">Payment Terms</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    <Badge variant="outline" className={customer.is_active !== false ? 'bg-success-light text-success border-success/20' : 'bg-destructive-light text-destructive border-destructive/20'}>
                      {customer.is_active !== false ? 'Active Account' : 'Inactive Account'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">Account Status</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Summary */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <DollarSign className="h-4 w-4" />
                <span>Account Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-primary-light rounded-lg">
                  <div className="text-2xl font-bold text-primary">{totalInvoices}</div>
                  <div className="text-sm text-muted-foreground">Total Invoices</div>
                </div>
                <div className="text-center p-4 bg-success-light rounded-lg">
                  <div className="text-2xl font-bold text-success">{formatCurrency(totalInvoiced)}</div>
                  <div className="text-sm text-muted-foreground">Total Sales</div>
                </div>
                <div className="text-center p-4 bg-warning-light rounded-lg">
                  <div className="text-2xl font-bold text-warning">{formatCurrency(outstandingBalance)}</div>
                  <div className="text-sm text-muted-foreground">Outstanding</div>
                </div>
                <div className="text-center p-4 bg-secondary-light rounded-lg">
                  <div className="text-2xl font-bold text-secondary">{totalPayments}</div>
                  <div className="text-sm text-muted-foreground">Payments</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            {customer.email && (
              <Button 
                variant="outline"
                onClick={() => window.open(`mailto:${customer.email}`, '_blank')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            )}
            {customer.phone && (
              <Button 
                variant="outline"
                onClick={() => window.open(`tel:${customer.phone}`, '_blank')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button 
              variant="outline"
              onClick={onCreateInvoice}
              className="bg-primary-light text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground"
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
            <Button onClick={onEdit}>
              <User className="h-4 w-4 mr-2" />
              Edit Customer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

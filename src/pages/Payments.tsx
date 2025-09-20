import { useState } from 'react';
import { toast } from 'sonner';
import { parseErrorMessage } from '@/utils/errorHelpers';
import { RecordPaymentModal } from '@/components/payments/RecordPaymentModal';
import { ViewPaymentModal } from '@/components/payments/ViewPaymentModal';
import { PaymentAllocationStatus } from '@/components/payments/PaymentAllocationStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Filter,
  Eye,
  DollarSign,
  Download
} from 'lucide-react';
import { usePayments, useCompanies, useCreatePayment } from '@/hooks/useDatabase';
import { useInvoicesFixed as useInvoices } from '@/hooks/useInvoicesFixed';
import { generatePaymentReceiptPDF } from '@/utils/pdfGenerator';

interface Payment {
  id: string;
  payment_number: string;
  customer_id: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'mpesa' | 'bank_transfer' | 'cheque';
  reference_number?: string;
  notes?: string;
  customers?: {
    name: string;
    email?: string;
  };
  payment_allocations?: {
    id: string;
    invoice_number: string;
    allocated_amount: number;
    invoice_total: number;
  }[];
}

function getStatusColor() {
  return 'bg-success-light text-success border-success/20'; // All payments are completed when recorded
}

function getMethodColor(method: string) {
  switch (method) {
    case 'cash':
      return 'bg-success-light text-success border-success/20';
    case 'mpesa':
      return 'bg-primary-light text-primary border-primary/20';
    case 'bank_transfer':
      return 'bg-primary-light text-primary border-primary/20';
    case 'cheque':
      return 'bg-warning-light text-warning border-warning/20';
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  
  // Fetch live payments data and company details
  const { data: companies = [] } = useCompanies();
  const currentCompany = companies[0];
  const { data: payments = [], isLoading, error } = usePayments(currentCompany?.id);
  const { data: invoices = [] } = useInvoices(currentCompany?.id);
  const createPayment = useCreatePayment();

  const handleRecordPayment = () => {
    setShowRecordModal(true);
  };

  const handleAddTestPayment = async () => {
    try {
      if (!currentCompany?.id) {
        toast.error('No company found');
        return;
      }
      const latestInvoice = invoices[0];
      if (!latestInvoice) {
        toast.error('No invoices found');
        return;
      }
      const paymentNumber = `PAY-${Date.now()}`;
      await createPayment.mutateAsync({
        company_id: latestInvoice.company_id,
        customer_id: latestInvoice.customer_id,
        invoice_id: latestInvoice.id,
        payment_number: paymentNumber,
        payment_date: new Date().toISOString().split('T')[0],
        amount: Math.min(100, latestInvoice.balance_due || latestInvoice.total_amount || 100),
        payment_method: 'bank_transfer',
        reference_number: paymentNumber,
        notes: 'Test payment'
      } as any);
      toast.success('Test payment recorded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to add test payment');
    }
  };

  const handleViewPayment = (payment: Payment) => {
    // Payment data is already in the correct format from the database
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const handleDownloadReceipt = (payment: Payment) => {
    try {
      // Use the utility function with company details
      const companyDetails = currentCompany ? {
        name: currentCompany.name,
        address: currentCompany.address,
        city: currentCompany.city,
        country: currentCompany.country,
        phone: currentCompany.phone,
        email: currentCompany.email,
        tax_number: currentCompany.tax_number,
        logo_url: currentCompany.logo_url
      } : undefined;

      generatePaymentReceiptPDF(payment, companyDetails);
      toast.success(`Receipt downloaded for payment ${payment.payment_number}`);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt. Please try again.');
    }
  };

  // Removed inline PDF generation function - now using utility function

  const filteredPayments = payments.filter(payment =>
    payment.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.payment_allocations?.some(alloc => alloc.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payments</h1>
            <p className="text-muted-foreground">Loading payment data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payments</h1>
            <p className="text-destructive">Error loading payments: {parseErrorMessage(error)}</p>
          </div>
        </div>

        {/* Show auto-fix if there's an error */}
        <PaymentAllocationAutoFix />
      </div>
    );
  }

  // Calculate stats from live data
  const totalReceivedToday = payments
    .filter(p => new Date(p.payment_date).toDateString() === new Date().toDateString())
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalThisMonth = payments
    .filter(p => {
      const paymentDate = new Date(p.payment_date);
      const now = new Date();
      return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.amount, 0);
  
  const completedThisMonth = payments
    .filter(p => {
      const paymentDate = new Date(p.payment_date);
      const now = new Date();
      return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
    }).length;
  
  const pendingAmount = 0; // All payments in system are completed when recorded

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground">
            Track and manage customer payments (All amounts in KES)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddTestPayment}>
            <DollarSign className="h-4 w-4 mr-2" />
            Add Test Payment
          </Button>
          <Button className="gradient-primary text-primary-foreground hover:opacity-90 shadow-card" size="lg" onClick={handleRecordPayment}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* System Status Check */}
      <PaymentAllocationStatus />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Received Today</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(totalReceivedToday)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Badge className="bg-success-light text-success">{completedThisMonth}</Badge>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed This Month</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(totalThisMonth)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Badge className="bg-warning-light text-warning">0</Badge>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-warning">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No payments found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Record your first payment to get started'
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleRecordPayment}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount (KES)</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{payment.payment_number}</TableCell>
                    <TableCell>{payment.customers?.name || 'N/A'}</TableCell>
                    <TableCell className="font-medium text-primary">
                      {payment.payment_allocations?.[0]?.invoice_number || 'N/A'}
                    </TableCell>
                    <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-semibold text-success">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getMethodColor(payment.payment_method)}>
                        {payment.payment_method.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor()}>
                        Completed
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewPayment(payment)}
                          title="View payment details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadReceipt(payment)}
                          title="Download receipt"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        open={showRecordModal}
        onOpenChange={setShowRecordModal}
        onSuccess={() => {
          setShowRecordModal(false);
          toast.success('Payment recorded successfully!');
        }}
        invoice={undefined} // For standalone payment recording
      />



      {/* View Payment Modal */}
      <ViewPaymentModal
        open={showViewModal}
        onOpenChange={setShowViewModal}
        payment={selectedPayment}
        onDownloadReceipt={handleDownloadReceipt}
        onSendReceipt={(payment) => toast.info(`Sending receipt for payment ${payment.payment_number}`)}
      />
    </div>
  );
}

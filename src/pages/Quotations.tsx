import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Edit,
  FileText,
  Download,
  Calendar,
  Send
} from 'lucide-react';
import { useQuotations, useCompanies, useUpdateQuotationStatus } from '@/hooks/useDatabase';
import { useCurrency } from '@/contexts/CurrencyContext';
import { convertAmount } from '@/utils/currency';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CreateQuotationModal } from '@/components/quotations/CreateQuotationModal';
import { ViewQuotationModal } from '@/components/quotations/ViewQuotationModal';
import { EditQuotationModal } from '@/components/quotations/EditQuotationModal';
import { downloadQuotationPDF } from '@/utils/pdfGenerator';
import { CreateInvoiceModal } from '@/components/invoices/CreateInvoiceModal';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, X } from 'lucide-react';

interface Quotation {
  id: string;
  quotation_number: string;
  customers: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  quotation_date: string;
  valid_until?: string;
  total_amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  quotation_items?: any[];
  subtotal?: number;
  tax_amount?: number;
  notes?: string;
  terms_and_conditions?: string;
  currency_code?: 'KES' | 'USD';
  exchange_rate?: number;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'draft':
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
    case 'sent':
      return 'bg-warning-light text-warning border-warning/20';
    case 'accepted':
      return 'bg-success-light text-success border-success/20';
    case 'rejected':
      return 'bg-destructive-light text-destructive border-destructive/20';
    case 'expired':
      return 'bg-destructive-light text-destructive border-destructive/20';
    case 'converted':
      return 'bg-primary-light text-primary border-primary/20';
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
  }
}

export default function Quotations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [invoicePrefill, setInvoicePrefill] = useState<{ customer: any | null; items: any[]; notes?: string; terms?: string; invoiceDate?: string; dueDate?: string } | null>(null);

  // Get current user and company from context
  const { profile, loading: authLoading } = useAuth();
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const { data: quotations, isLoading, error, refetch } = useQuotations(currentCompany?.id);

  const { currency, rate, format } = useCurrency();
  const formatCurrency = (amount: number) => format(convertAmount(Number(amount) || 0, 'KES', currency, rate));

  const filteredQuotations = quotations?.filter(quotation =>
    quotation.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.quotation_number.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreateSuccess = () => {
    refetch();
    toast.success('Quotation created successfully!');
  };

  const handleViewQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowViewModal(true);
  };

  const handleEditQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    refetch();
    setSelectedQuotation(null);
    toast.success('Quotation updated successfully!');
  };

  const handleDownloadQuotation = (quotation: Quotation) => {
    try {
      // Get current company details for PDF
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

      downloadQuotationPDF(quotation, companyDetails);
      toast.success(`PDF download started for ${quotation.quotation_number}`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    }
  };

  const handleSendQuotation = async (quotation: Quotation) => {
    if (!quotation.customers?.email) {
      toast.error('Customer email not available');
      return;
    }

    try {
      // Create email content
      const subject = `Quotation ${quotation.quotation_number} from MedPlus Africa`;
      const body = `Dear ${quotation.customers.name},

Please find attached your quotation ${quotation.quotation_number} dated ${new Date(quotation.quotation_date).toLocaleDateString()}.

Quotation Summary:
- Total Amount: KES ${quotation.total_amount?.toLocaleString() || '0'}
- Valid Until: ${quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : 'No expiry'}

If you have any questions about this quotation, please don't hesitate to contact us.

Best regards,
Biolegend Scientific Ltd Team
Tel: 0741 207 690/0780 165 490
Email: biolegend@biolegendscientific.co.ke/info@biolegendscientific.co.ke
Website: www.biolegendscientific.co.ke`;

      // Open email client with pre-filled content
      const emailUrl = `mailto:${quotation.customers.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(emailUrl, '_blank');

      // TODO: In a real app, this would actually send the email via API and update the quotation status
      toast.success(`Email client opened with quotation ${quotation.quotation_number} for ${quotation.customers.email}`);

      // Update quotation status to 'sent' (simulated)
      // await updateQuotationStatus(quotation.id, 'sent');

    } catch (error) {
      console.error('Error sending quotation:', error);

      let errorMessage = 'Please try again.';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        const supabaseError = error as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details;
        } else if (supabaseError.hint) {
          errorMessage = supabaseError.hint;
        } else {
          errorMessage = JSON.stringify(error);
        }
      }

      toast.error(`Failed to send quotation email: ${errorMessage}`);
    }
  };

  const handleConvertToInvoice = async (quotation: Quotation) => {
    try {
      if (!currentCompany?.id) {
        toast.error('No company selected.');
        return;
      }
      if (!quotation.customers?.id) {
        toast.error('Invalid customer data.');
        return;
      }

      const items = (quotation.quotation_items || []).map((qi: any, idx: number) => ({
        id: `q-${idx}`,
        product_id: qi.product_id || undefined,
        product_name: qi.products?.name || qi.description || 'Item',
        description: qi.description || qi.products?.name || 'Item',
        quantity: Number(qi.quantity || 0),
        unit_price: Number(qi.unit_price || 0),
        discount_before_vat: Number(qi.discount_percentage || 0),
        tax_percentage: Number(qi.tax_percentage || 0),
        tax_amount: Number(qi.tax_amount || 0),
        tax_inclusive: !!qi.tax_inclusive,
        line_total: Number(qi.line_total || (Number(qi.quantity || 0) * Number(qi.unit_price || 0)))
      }));

      setInvoicePrefill({
        customer: quotation.customers,
        items,
        notes: `Converted from quotation ${quotation.quotation_number}`,
        terms: quotation.terms_and_conditions || 'Payment due within 30 days of invoice date.',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      setSelectedQuotation(quotation);
      setShowCreateInvoiceModal(true);
    } catch (error) {
      console.error('Error preparing conversion:', error);
      toast.error('Failed to prepare invoice conversion.');
    }
  };

  const handleFilter = () => {
    toast.info('Advanced filter functionality coming soon!');
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quotations</h1>
            <p className="text-muted-foreground">Create and manage customer quotations</p>
          </div>
        </div>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive">Error loading quotations: {error.message}</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotations</h1>
          <p className="text-muted-foreground">
            Create and manage customer quotations
          </p>
        </div>
        <Button 
          className="gradient-primary text-primary-foreground hover:opacity-90 shadow-card"
          size="lg"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Quotation
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search quotations by customer or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={handleFilter}>
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quotations Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>Quotations List</span>
            {!isLoading && (
              <Badge variant="outline" className="ml-auto">
                {filteredQuotations.length} quotations
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No quotations found</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Get started by creating your first quotation'
                }
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="gradient-primary text-primary-foreground hover:opacity-90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Quotation
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right min-w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.map((quotation: Quotation) => (
                  <TableRow key={quotation.id} className="hover:bg-muted/50 transition-smooth">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span>{quotation.quotation_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{quotation.customers?.name || 'Unknown Customer'}</div>
                        {quotation.customers?.email && (
                          <div className="text-sm text-muted-foreground">{quotation.customers.email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(quotation.quotation_date).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(quotation.total_amount || 0)}
                    </TableCell>
                    <TableCell>
                      {quotation.valid_until 
                        ? new Date(quotation.valid_until).toLocaleDateString()
                        : 'No expiry'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(quotation.status)}>
                        {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {/* Icon Actions */}
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewQuotation(quotation)}
                            title="View quotation"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditQuotation(quotation)}
                            title="Edit quotation"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadQuotation(quotation)}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Conditional Action Buttons */}
                        <div className="flex space-x-2 ml-2">
                          {quotation.status === 'draft' && quotation.customers?.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendQuotation(quotation)}
                              className="bg-primary-light text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground"
                            >
                              <Send className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Send</span>
                            </Button>
                          )}
                          {quotation.status !== 'converted' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConvertToInvoice(quotation)}
                              className="bg-success-light text-success border-success/20 hover:bg-success hover:text-success-foreground"
                              title="Convert to Invoice"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Convert</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateQuotationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
      />

      <ViewQuotationModal
        open={showViewModal}
        onOpenChange={setShowViewModal}
        quotation={selectedQuotation}
        onEdit={() => selectedQuotation && handleEditQuotation(selectedQuotation)}
        onDownload={() => selectedQuotation && handleDownloadQuotation(selectedQuotation)}
        onSend={() => selectedQuotation && handleSendQuotation(selectedQuotation)}
      />

      <EditQuotationModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        quotation={selectedQuotation}
        onSuccess={handleEditSuccess}
      />

      {/* Create Invoice from Quotation */}
      {showCreateInvoiceModal && invoicePrefill && (
        <CreateInvoiceModal
          open={showCreateInvoiceModal}
          onOpenChange={(open) => {
            setShowCreateInvoiceModal(open);
            if (!open) setInvoicePrefill(null);
          }}
          onSuccess={async () => {
            try {
              if (selectedQuotation?.id) {
                await supabase.from('quotations').update({ status: 'converted' }).eq('id', selectedQuotation.id);
              }
              toast.success('Invoice created and inventory updated.');
              setSelectedQuotation(null);
              setInvoicePrefill(null);
              setShowCreateInvoiceModal(false);
              refetch();
            } catch (e) {
              console.error('Post-conversion update failed:', e);
              refetch();
            }
          }}
          preSelectedCustomer={invoicePrefill.customer}
          initialItems={invoicePrefill.items}
          initialNotes={invoicePrefill.notes}
          initialTerms={invoicePrefill.terms}
          initialInvoiceDate={invoicePrefill.invoiceDate}
          initialDueDate={invoicePrefill.dueDate}
        />
      )}
    </div>
  );
}

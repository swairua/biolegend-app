import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  DollarSign,
  Download,
  Send,
  Calendar,
  Receipt,
  FileText,
  CheckCircle,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useProformas, useConvertProformaToInvoice, useDeleteProforma, type ProformaWithItems } from '@/hooks/useProforma';
import { useCompanies } from '@/hooks/useDatabase';
import { CreateInvoiceModal } from '@/components/invoices/CreateInvoiceModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateProformaModalOptimized } from '@/components/proforma/CreateProformaModalOptimized';
import { EditProformaModal } from '@/components/proforma/EditProformaModal';
import { ViewProformaModal } from '@/components/proforma/ViewProformaModal';
import { ProformaSetupBanner } from '@/components/proforma/ProformaSetupBanner';
import { ProformaDuplicateRepairPanel } from '@/components/proforma/ProformaDuplicateRepairPanel';
import { downloadInvoicePDF, downloadQuotationPDF } from '@/utils/pdfGenerator';
import { ensureProformaSchema } from '@/utils/proformaDatabaseSetup';
import { fixAllProformaDuplicates } from '@/utils/proformaDeduplication';
import { recalculateAllProformaTotals } from '@/utils/proformaRecalculation';
import { useCurrency } from '@/contexts/CurrencyContext';
import { convertAmount } from '@/utils/currency';

export default function Proforma() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedProforma, setSelectedProforma] = useState<ProformaWithItems | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [invoicePrefill, setInvoicePrefill] = useState<{ customer: any | null; items: any[]; notes?: string; terms?: string; invoiceDate?: string; dueDate?: string } | null>(null);
  const [proformaToDelete, setProformaToDelete] = useState<ProformaWithItems | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRepairPanel, setShowRepairPanel] = useState(false);

  // Get company data
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];

  // Use proper proforma hooks
  const { data: proformas = [], isLoading, refetch } = useProformas(currentCompany?.id);
  const convertToInvoice = useConvertProformaToInvoice();
  const deleteProforma = useDeleteProforma();

  const { currency, rate, format } = useCurrency();
  const formatCurrency = (amount: number) => format(convertAmount(Number(amount) || 0, 'KES', currency, rate));

  const filteredProformas = proformas.filter(proforma =>
    proforma.proforma_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proforma.customers?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        return <Badge variant="destructive">Converted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleView = (proforma: ProformaWithItems) => {
    setSelectedProforma(proforma);
    setShowViewModal(true);
  };

  const handleEdit = (proforma: ProformaWithItems) => {
    console.log('📝 Opening edit modal for proforma:', {
      id: proforma.id,
      number: proforma.proforma_number,
      itemCount: proforma.proforma_items?.length,
      items: proforma.proforma_items?.map(i => ({ id: i.id, product: i.product_name, qty: i.quantity }))
    });
    setSelectedProforma(proforma);
    setShowEditModal(true);
  };

  const handleDownloadPDF = async (proforma: ProformaWithItems) => {
    try {
      // Convert proforma to invoice format for PDF generation
      const invoiceData = {
        id: proforma.id,
        invoice_number: proforma.proforma_number,
        customers: proforma.customers,
        invoice_date: proforma.proforma_date,
        valid_until: proforma.valid_until,
        total_amount: proforma.total_amount,
        invoice_items: proforma.proforma_items || [],
        subtotal: proforma.subtotal,
        tax_amount: proforma.tax_amount,
        status: proforma.status,
        notes: proforma.notes || '',
        terms_and_conditions: proforma.terms_and_conditions || 'Payment required before goods are delivered.',
        currency_code: (proforma as any).currency_code,
        exchange_rate: (proforma as any).exchange_rate,
      };

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

      await downloadInvoicePDF(invoiceData, 'PROFORMA', companyDetails);
      toast.success('Proforma PDF downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleSendEmail = (proforma: ProformaWithItems) => {
    const subject = `Proforma Invoice ${proforma.proforma_number}`;
    const body = `Please find attached proforma invoice ${proforma.proforma_number} for your review.`;
    const emailUrl = `mailto:${proforma.customers?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(emailUrl);
    toast.success(`Email client opened with proforma ${proforma.proforma_number}`);
  };

  const handleCreateInvoice = async (proforma: ProformaWithItems) => {
    try {
      console.log('🔍 handleCreateInvoice - Proforma data:', {
        id: proforma.id,
        number: proforma.proforma_number,
        hasItems: !!proforma.proforma_items,
        itemsCount: proforma.proforma_items?.length || 0,
        proforma_items: proforma.proforma_items
      });

      if (!currentCompany?.id) {
        toast.error('No company selected.');
        return;
      }

      const items = (proforma.proforma_items || []).map((pi: any, idx: number) => ({
        id: `pf-${idx}`,
        product_id: pi.product_id || undefined,
        product_name: pi.products?.name || pi.product_name || pi.description || 'Item',
        description: pi.description || pi.products?.name || 'Item',
        quantity: Number(pi.quantity || 0),
        unit_price: Number(pi.unit_price || 0),
        discount_before_vat: Number(pi.discount_percentage || 0),
        tax_percentage: Number(pi.tax_percentage || 0),
        tax_amount: Number(pi.tax_amount || 0),
        tax_inclusive: !!pi.tax_inclusive,
        line_total: Number(pi.line_total || (Number(pi.quantity || 0) * Number(pi.unit_price || 0)))
      }));

      setInvoicePrefill({
        customer: proforma.customers,
        items,
        notes: `Converted from proforma ${proforma.proforma_number}`,
        terms: proforma.terms_and_conditions || 'Payment due within 30 days of invoice date.',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currencyCode: proforma.currency_code || 'KES',
        exchangeRate: proforma.exchange_rate || 1
      });
      setSelectedProforma(proforma);
      setShowCreateInvoiceModal(true);
    } catch (error) {
      console.error('Error converting proforma to invoice:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error converting proforma to invoice: ${message}`);
    }
  };

  const handleAcceptProforma = async (proforma: ProformaWithItems) => {
    // TODO: Implement accept proforma mutation
    toast.success(`Proforma ${proforma.proforma_number} marked as accepted`);
    refetch();
  };

  const handleDeleteClick = (proforma: ProformaWithItems) => {
    setProformaToDelete(proforma);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!proformaToDelete?.id) return;

    try {
      await deleteProforma.mutateAsync(proformaToDelete.id);
      toast.success(`Proforma ${proformaToDelete.proforma_number} deleted successfully`);
      setShowDeleteConfirm(false);
      setProformaToDelete(null);
      await refetch();
    } catch (error) {
      console.error('Error deleting proforma:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error deleting proforma: ${message}`);
    }
  };

  const handleFilter = () => {
    toast.info('Advanced filter functionality coming soon!');
  };

  const handleCreateSuccess = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEditSuccess = async () => {
    console.log('📡 handleEditSuccess: Starting refetch for all proformas');
    const result = await refetch();

    console.log('📡 Refetch complete, result:', {
      dataCount: result.data?.length,
      selectedProformaId: selectedProforma?.id
    });

    // Update the selectedProforma with the latest data from the refetch
    if (result.data && selectedProforma) {
      console.log('🔍 Looking for updated proforma with ID:', selectedProforma.id);
      const updatedProforma = result.data.find(p => p.id === selectedProforma.id);

      if (updatedProforma) {
        console.log('✅ Found updated proforma, updating selectedProforma:', {
          id: updatedProforma.id,
          number: updatedProforma.proforma_number,
          itemCount: updatedProforma.proforma_items?.length,
          items: updatedProforma.proforma_items?.map(i => ({ id: i.id, product: i.product_name }))
        });
        setSelectedProforma(updatedProforma);
      } else {
        console.warn('⚠️ Updated proforma not found in refetch results');
      }
    }

    // Auto-deduplicate the entire company's proformas after edit
    if (currentCompany?.id) {
      console.log('🔄 Auto-deduplicating proformas after edit...');
      try {
        const dedupResult = await fixAllProformaDuplicates(currentCompany.id);
        if (dedupResult.success && dedupResult.duplicates_fixed > 0) {
          console.log('✅ Auto-deduplication completed:', dedupResult.message);
          // Refetch again to show cleaned data
          await refetch();
        }
      } catch (error) {
        console.warn('⚠️ Auto-deduplication failed (non-blocking):', error);
      }
    }

    setShowEditModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Database Setup Banner */}
      <ProformaSetupBanner />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Proforma Invoices</h1>
          <p className="text-muted-foreground">
            Create and manage proforma invoices for prepayment scenarios
          </p>
        </div>
        <Button 
          variant="default" 
          size="lg"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Proforma
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{proformas.length}</p>
                <p className="text-xs text-muted-foreground">Total Proformas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <Send className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {proformas.filter(p => p.status === 'sent').length}
                </p>
                <p className="text-xs text-muted-foreground">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold">
                  {proformas.filter(p => p.status === 'accepted').length}
                </p>
                <p className="text-xs text-muted-foreground">Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(proformas.reduce((sum, p) => sum + (p.total_amount || 0), 0))}
                </p>
                <p className="text-xs text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Proforma Invoices</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search proformas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleFilter}>
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const res = await ensureProformaSchema();
                  if ((res as any)?.success) {
                    toast.success('Proforma schema harmonized');
                  } else {
                    toast.error(`Schema fix failed: ${(res as any)?.error || 'Unknown error'}`);
                  }
                }}
              >
                Fix Proforma Schema
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRepairPanel(true)}
                className="border-amber-300 hover:bg-amber-50"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Repair Duplicates
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!currentCompany?.id) {
                    toast.error('No company selected');
                    return;
                  }

                  const loadingToast = toast.loading('Recalculating proforma totals...');

                  try {
                    const result = await recalculateAllProformaTotals(currentCompany.id);

                    console.log('Recalculation result:', {
                      success: result.success,
                      message: result.message,
                      proformas_updated: result.proformas_updated,
                      errors: result.errors
                    });

                    if (result.success) {
                      toast.dismiss(loadingToast);
                      if (result.proformas_updated > 0) {
                        toast.success(`✅ Recalculated totals for ${result.proformas_updated} proforma(s)`);
                        refetch();
                      } else {
                        toast.success('No proformas needed recalculation');
                      }
                    } else {
                      toast.dismiss(loadingToast);
                      toast.error(`Recalculation failed:\n${result.errors.join('\n')}`, {
                        duration: 5000
                      });
                    }
                  } catch (error) {
                    toast.dismiss(loadingToast);
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.error('Recalculation error:', error);
                    toast.error(`Error recalculating totals: ${errorMsg}`);
                  }
                }}
              >
                Recalculate Totals
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[160px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProformas.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No proforma invoices found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No proformas match your search.' : 'Create your first proforma invoice to get started.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Proforma
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proforma #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProformas.map((proforma) => (
                  <TableRow key={proforma.id}>
                    <TableCell className="font-medium">
                      {proforma.proforma_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{proforma.customers?.name}</div>
                        {proforma.customers?.email && (
                          <div className="text-sm text-muted-foreground">
                            {proforma.customers.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        {formatDate(proforma.proforma_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        {formatDate(proforma.valid_until)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center font-medium">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {formatCurrency(proforma.total_amount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(proforma.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(proforma)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(proforma)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(proforma)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendEmail(proforma)}
                          disabled={!proforma.customers?.email}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        {proforma.status === 'sent' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAcceptProforma(proforma)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {proforma.status !== 'converted' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateInvoice(proforma)}
                            title="Convert to Invoice"
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                        )}
                        {proforma.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(proforma)}
                            title="Delete Proforma"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
      <CreateProformaModalOptimized
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
        companyId={currentCompany?.id}
      />

      <EditProformaModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        proforma={selectedProforma}
        onSuccess={handleEditSuccess}
        companyId={currentCompany?.id}
      />

      <ViewProformaModal
        open={showViewModal}
        onOpenChange={setShowViewModal}
        proforma={selectedProforma}
        onDownloadPDF={handleDownloadPDF}
        onSendEmail={handleSendEmail}
        onCreateInvoice={handleCreateInvoice}
      />

      {showCreateInvoiceModal && invoicePrefill && (
        <CreateInvoiceModal
          open={showCreateInvoiceModal}
          onOpenChange={async (open) => {
            setShowCreateInvoiceModal(open);
            if (!open) setInvoicePrefill(null);
          }}
          onSuccess={async () => {
            try {
              if (selectedProforma?.id) {
                const { error } = await supabase
                  .from('proforma_invoices')
                  .update({ status: 'converted' })
                  .eq('id', selectedProforma.id)
                  .select()
                  .maybeSingle();
                if (error) console.error('Post-conversion status update failed:', error);
              }
              toast.success('Invoice created and inventory updated.');
              setSelectedProforma(null);
              setInvoicePrefill(null);
              setShowCreateInvoiceModal(false);
              refetch();
            } catch (e) {
              console.error('Post-conversion handling error:', e);
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete Proforma Invoice?"
        description="This action cannot be undone."
        itemName={proformaToDelete?.proforma_number}
        isLoading={deleteProforma.isPending}
      />

      {/* Repair Panel Modal */}
      {showRepairPanel && currentCompany?.id && (
        <Dialog open={showRepairPanel} onOpenChange={setShowRepairPanel}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Repair Duplicate Items
              </DialogTitle>
              <DialogDescription>
                Scan and repair proformas with duplicate items
              </DialogDescription>
            </DialogHeader>
            <ProformaDuplicateRepairPanel
              companyId={currentCompany.id}
              onRepairComplete={() => {
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

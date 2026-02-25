import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  FileText,
  Download,
  Edit,
  Calendar,
  CreditCard,
  Building2,
  Trash2
} from 'lucide-react';
import { downloadRemittancePDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';
import { useRemittanceAdvice, useCompanies, useDeleteRemittanceAdvice } from '@/hooks/useDatabase';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { CreateRemittanceModal } from '@/components/remittance/CreateRemittanceModalFixed';
import { ViewRemittanceModal } from '@/components/remittance/ViewRemittanceModal';
import { EditRemittanceModal } from '@/components/remittance/EditRemittanceModal';
import { useCurrency } from '@/contexts/CurrencyContext';
import { convertAmount } from '@/utils/currency';

// Remittance advice page - uses real database data via useRemittanceAdvice hook

const RemittanceAdvice = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRemittance, setSelectedRemittance] = useState<any>(null);
  const [selectedRemittances, setSelectedRemittances] = useState<Set<string>>(new Set());
  const [remittanceToDelete, setRemittanceToDelete] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [remittancesToBulkDelete, setRemittancesToBulkDelete] = useState<any[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch live remittance advice data and company details
  const { data: remittances = [], isLoading, error, refetch } = useRemittanceAdvice();
  const { data: companies = [] } = useCompanies();
  const deleteRemittance = useDeleteRemittanceAdvice();

  // Get the current company (assuming first company for now)
  const currentCompany = companies[0];

  const { currency, rate, format } = useCurrency();
  const formatCurrency = (amount: number) => format(convertAmount(Number(amount) || 0, 'KES', currency, rate));

  const handleViewRemittance = (remittance: any) => {
    setSelectedRemittance(remittance);
    setShowViewModal(true);
  };

  const handleEditRemittance = (remittance: any) => {
    setSelectedRemittance(remittance);
    setShowEditModal(true);
  };

  const handleDownloadRemittance = (remittance: any) => {
    try {
      // Use live data format
      const remittanceData = {
        advice_number: remittance.advice_number,
        advice_date: remittance.advice_date,
        total_payment: remittance.total_payment,
        customers: {
          name: remittance.customers?.name || 'N/A',
          address: remittance.customers?.address || 'N/A',
          city: remittance.customers?.city || 'Nairobi',
          country: remittance.customers?.country || 'Kenya'
        },
        notes: remittance.notes || `Remittance advice for ${remittance.customers?.name}`,
        // Include line items for PDF generation
        remittance_advice_items: remittance.remittance_advice_items || [],
        items: remittance.items || [] // Fallback for legacy format
      };

      // Pass company details to PDF generator
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

      downloadRemittancePDF(remittanceData, companyDetails);
      toast.success(`PDF download started for ${remittance.advice_number}`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    }
  };

  const handleToggleRemittanceSelection = (remittanceId: string) => {
    const newSelected = new Set(selectedRemittances);
    if (newSelected.has(remittanceId)) {
      newSelected.delete(remittanceId);
    } else {
      newSelected.add(remittanceId);
    }
    setSelectedRemittances(newSelected);
  };

  const handleSelectAllRemittances = () => {
    if (selectedRemittances.size === filteredRemittances.length) {
      setSelectedRemittances(new Set());
    } else {
      setSelectedRemittances(new Set(filteredRemittances.map(r => r.id)));
    }
  };

  const handleDeleteRemittance = (remittance: any) => {
    setRemittanceToDelete(remittance);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!remittanceToDelete?.id) return;

    setIsDeleting(true);
    try {
      await deleteRemittance.mutateAsync(remittanceToDelete.id);
      toast.success('Remittance advice deleted successfully');
      setShowDeleteConfirm(false);
      setRemittanceToDelete(null);
    } catch (error) {
      console.error('Error deleting remittance advice:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete remittance advice';
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = () => {
    const itemsToDelete = filteredRemittances.filter(r => selectedRemittances.has(r.id));
    if (itemsToDelete.length === 0) {
      toast.error('No remittance advice selected');
      return;
    }
    setRemittancesToBulkDelete(itemsToDelete);
    setShowBulkDeleteConfirm(true);
  };

  const handleConfirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const deleteResults = await Promise.allSettled(
        remittancesToBulkDelete.map(r => deleteRemittance.mutateAsync(r.id))
      );

      const failedItems: string[] = [];
      const successfulCount = deleteResults.filter((result, index) => {
        if (result.status === 'fulfilled') {
          return true;
        } else {
          failedItems.push(remittancesToBulkDelete[index].advice_number);
          console.error(`Failed to delete remittance "${remittancesToBulkDelete[index].advice_number}":`, result.reason);
          return false;
        }
      }).length;

      if (failedItems.length > 0) {
        const failureList = failedItems.slice(0, 3).join(', ');
        const additionalCount = failedItems.length > 3 ? ` and ${failedItems.length - 3} more` : '';

        if (successfulCount > 0) {
          toast.success(`Deleted ${successfulCount} remittance advice successfully`);
        }
        toast.error(`Failed to delete: ${failureList}${additionalCount}`);
      } else {
        toast.success(`${successfulCount} remittance advice deleted successfully!`);
      }

      // Always close dialog and clear state after attempting all deletes
      setShowBulkDeleteConfirm(false);
      setRemittancesToBulkDelete([]);
      setSelectedRemittances(new Set());
    } catch (error) {
      console.error('Error bulk deleting remittance advice:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete remittance advice';
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const allFilteredRemittances = remittances.filter(remittance => {
    const matchesSearch = (remittance.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (remittance.advice_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || remittance.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = allFilteredRemittances.length;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const filteredRemittances = allFilteredRemittances.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Remittance Advice</h1>
            <p className="text-muted-foreground">Loading remittance advice data...</p>
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
            <h1 className="text-3xl font-bold text-foreground">Remittance Advice</h1>
            <p className="text-destructive">Error loading remittance advice: {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-success text-success-foreground';
      case 'draft':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Remittance Advice</h1>
          <p className="text-muted-foreground">
            Manage payment advice and remittance documents for customers
          </p>
        </div>
        <Button
          className="shadow-card"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Remittance Advice
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>Filter Remittance Advice</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by customer name or advice number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Toolbar */}
      {selectedRemittances.size > 0 && (
        <Card className="shadow-card bg-primary-light/20 border-primary/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-foreground">
                {selectedRemittances.size} remittance{selectedRemittances.size !== 1 ? 's' : ''} selected
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRemittances(new Set())}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remittance Advice List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Remittance Advice Documents</CardTitle>
          <CardDescription>
            List of all remittance advice documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedRemittances.size === filteredRemittances.length && filteredRemittances.length > 0}
                    onChange={handleSelectAllRemittances}
                    className="rounded border-gray-300"
                    title="Select all remittances"
                  />
                </TableHead>
                <TableHead>Advice Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRemittances.map((remittance) => (
                <TableRow key={remittance.id} className="hover:bg-muted/50 transition-smooth">
                  <TableCell className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedRemittances.has(remittance.id)}
                      onChange={() => handleToggleRemittanceSelection(remittance.id)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span>{remittance.adviceNumber || remittance.advice_number || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{remittance.customerName || remittance.customers?.name || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">
                        {remittance.customerAddress || remittance.customers?.address || 'N/A'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(remittance.date || remittance.advice_date || new Date()).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{(remittance.remittance_advice_items?.length || remittance.items?.length || 0)} items</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {formatCurrency(remittance.total_payment || remittance.totalPayment || 0)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(remittance.status || 'draft')}>
                      {(remittance.status || 'draft').charAt(0).toUpperCase() + (remittance.status || 'draft').slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewRemittance(remittance)}
                      >
                        <FileText className="mr-1 h-3 w-3" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRemittance(remittance)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadRemittance(remittance)}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredRemittances.length === 0 && (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No remittance advice found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search criteria'
                  : 'Create your first remittance advice document'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Remittance Advice
                </Button>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {!isLoading && filteredRemittances.length > 0 && totalCount > PAGE_SIZE && (
            <div className="mt-6 flex flex-col items-center gap-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) {
                          setCurrentPage(currentPage - 1);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  {Array.from({ length: Math.ceil(totalCount / PAGE_SIZE) }).map((_, i) => {
                    const pageNum = i + 1;
                    const isCurrentPage = pageNum === currentPage;
                    const isVisible = pageNum === 1 ||
                                      pageNum === Math.ceil(totalCount / PAGE_SIZE) ||
                                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

                    if (!isVisible) {
                      if (pageNum === currentPage - 2) {
                        return (
                          <PaginationItem key={`ellipsis-${pageNum}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          isActive={isCurrentPage}
                          className={isCurrentPage ? '' : 'cursor-pointer'}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < Math.ceil(totalCount / PAGE_SIZE)) {
                          setCurrentPage(currentPage + 1);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className={currentPage >= Math.ceil(totalCount / PAGE_SIZE) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Latest Remittance Advice Preview */}
      {filteredRemittances.length > 0 && filteredRemittances[0] && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span>Remittance Advice Preview - {filteredRemittances[0].adviceNumber || filteredRemittances[0].advice_number || 'N/A'}</span>
            </CardTitle>
            <CardDescription>
              Latest remittance advice document layout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 p-6 rounded-lg">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-primary">REMITTANCE ADVICE</h2>
                <div className="mt-4 space-y-1">
                  <div className="font-semibold">MedPlus Africa Limited</div>
                  <div className="text-sm text-muted-foreground">
                    P.O Box 85988-00200, Nairobi, Kenya
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Tel: 0741 207 690/0780 165 490
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Email: biolegend@biolegendscientific.co.ke/info@biolegendscientific.co.ke
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Website: www.biolegendscientific.co.ke
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="font-semibold text-sm mb-2">TO:</div>
                  <div className="space-y-1">
                    <div className="font-medium">{filteredRemittances[0].customerName || filteredRemittances[0].customers?.name || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">
                      {filteredRemittances[0].customerAddress || filteredRemittances[0].customers?.address || 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <div><span className="font-semibold">Date:</span> {new Date(filteredRemittances[0].date || filteredRemittances[0].advice_date || new Date()).toLocaleDateString()}</div>
                    <div><span className="font-semibold">Advice No:</span> {filteredRemittances[0].adviceNumber || filteredRemittances[0].advice_number || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice/Credit Note</TableHead>
                    <TableHead className="text-right">Invoice Amount</TableHead>
                    <TableHead className="text-right">Credit Note</TableHead>
                    <TableHead className="text-right">Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(filteredRemittances[0].items || []).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>
                        {item.invoiceNumber || item.creditNote}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.invoiceAmount ? formatCurrency(item.invoiceAmount || 0) : ''}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.creditAmount ? formatCurrency(item.creditAmount || 0) : ''}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.payment || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell colSpan={4} className="font-semibold">Total Payment</TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(filteredRemittances[0].totalPayment || 0) }
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Remittance Modal */}
      <CreateRemittanceModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          // Refresh the data when a new remittance is created
          // In a real app, this would refetch the data
          toast.success('Remittance advice created successfully!');
        }}
      />

      {/* View Remittance Modal */}
      <ViewRemittanceModal
        open={showViewModal}
        onOpenChange={setShowViewModal}
        remittance={selectedRemittance}
        onDownload={() => {
          // Optional callback when PDF is downloaded from view modal
        }}
      />

      {/* Edit Remittance Modal */}
      <EditRemittanceModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        remittance={selectedRemittance}
        onSuccess={() => {
          toast.success('Remittance advice updated successfully!');
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Remittance Advice"
        description={`Are you sure you want to delete remittance advice ${remittanceToDelete?.advice_number}? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        itemName="remittance advice"
        isDangerous
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        title="Delete Remittance Advice"
        description={`Are you sure you want to delete ${remittancesToBulkDelete.length} remittance advice? This action cannot be undone.`}
        onConfirm={handleConfirmBulkDelete}
        isLoading={isDeleting}
        itemName="remittance advice"
        isDangerous
      />
    </div>
  );
};

export default RemittanceAdvice;

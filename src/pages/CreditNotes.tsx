import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  FileText,
  Download,
  Send,
  Calendar,
  DollarSign,
  AlertCircle,
  Undo2
} from 'lucide-react';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { useCompanies } from '@/hooks/useDatabase';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { convertAmount } from '@/utils/currency';
import { useOptimizedCreditNotes } from '@/hooks/useOptimizedCreditNotes';
import { toast } from 'sonner';
import { CreateCreditNoteModal } from '@/components/credit-notes/CreateCreditNoteModal';
import { ViewCreditNoteModal } from '@/components/credit-notes/ViewCreditNoteModal';
import { EditCreditNoteModal } from '@/components/credit-notes/EditCreditNoteModal';
import { ApplyCreditNoteModal } from '@/components/credit-notes/ApplyCreditNoteModal';
import { CreditNotesSetupGuide } from '@/components/credit-notes/CreditNotesSetupGuide';
import { SimpleForeignKeyPatch } from '@/components/credit-notes/SimpleForeignKeyPatch';
import { CreditNotesConnectionStatus } from '@/components/credit-notes/CreditNotesConnectionStatus';
import { useCreditNotePDFDownload } from '@/hooks/useCreditNotePDF';
import type { CreditNote } from '@/hooks/useCreditNotes';
import { useReverseCreditNote } from '@/hooks/useReverseCreditNote';

function getStatusColor(status: string) {
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
}

export default function CreditNotes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null);
  const [creditNoteToReverse, setCreditNoteToReverse] = useState<CreditNote | null>(null);
  const [showReverseConfirm, setShowReverseConfirm] = useState(false);
  const [reversalDetails, setReversalDetails] = useState<{
    hasApplied: boolean;
    affectsInventory: boolean;
  } | null>(null);

  const [creditNoteToDelete, setCreditNoteToDelete] = useState<CreditNote | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [amountFromFilter, setAmountFromFilter] = useState('');
  const [amountToFilter, setAmountToFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];

  // Use optimized credit notes hook with server-side pagination
  const { data: creditNoteData, isLoading, error, refetch } = useOptimizedCreditNotes(currentCompany?.id, {
    page: currentPage,
    pageSize: PAGE_SIZE,
    searchTerm,
    statusFilter: statusFilter as 'all' | 'draft' | 'sent' | 'applied' | 'cancelled',
    dateFromFilter: dateFromFilter || undefined,
    dateToFilter: dateToFilter || undefined,
    amountFromFilter: amountFromFilter ? parseFloat(amountFromFilter) : undefined,
    amountToFilter: amountToFilter ? parseFloat(amountToFilter) : undefined
  });

  const downloadPDF = useCreditNotePDFDownload();
  const reverseCreditNote = useReverseCreditNote();

  const creditNotes = creditNoteData?.creditNotes || [];
  const totalCount = creditNoteData?.totalCount || 0;
  const filteredCreditNotes = creditNotes;

  const { currency, rate, format } = useCurrency();
  const formatCurrency = (amount: number) => format(convertAmount(Number(amount) || 0, 'KES', currency, rate));

  const handleCreateSuccess = () => {
    refetch();
    toast.success('Credit note created successfully!');
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setCustomerFilter('all');
    setAmountFromFilter('');
    setAmountToFilter('');
    setSearchTerm('');
    toast.success('Filters cleared');
  };

  const handleInitiateReversal = (creditNote: CreditNote) => {
    setCreditNoteToReverse(creditNote);
    setReversalDetails({
      hasApplied: (creditNote.applied_amount || 0) > 0,
      affectsInventory: creditNote.affects_inventory || false
    });
    setShowReverseConfirm(true);
  };

  const handleConfirmReversal = async () => {
    if (!creditNoteToReverse?.id) return;
    try {
      await reverseCreditNote.mutateAsync({ creditNoteId: creditNoteToReverse.id });
      setShowReverseConfirm(false);
      setCreditNoteToReverse(null);
      setReversalDetails(null);
      refetch();
    } catch (e) {
      // handled in hook toast
    }
  };

  // Check if we have the credit_notes table available
  const hasCreditNotesTable = !error || !(
    error.message.includes('relation "credit_notes" does not exist') ||
    error.message.includes("Could not find the table 'public.credit_notes'") ||
    error.message.includes('table "credit_notes" does not exist')
  );

  // Check if this is a relationship error
  const isRelationshipError = error && (
    error.message.includes('Could not find a relationship between') ||
    error.message.includes('relationship') ||
    error.message.includes('schema cache')
  );

  if (error && !hasCreditNotesTable) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Credit Notes</h1>
            <p className="text-muted-foreground">Manage customer credit notes and refunds</p>
          </div>
        </div>
        
        <CreditNotesSetupGuide />
      </div>
    );
  }

  if (error && isRelationshipError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Credit Notes</h1>
            <p className="text-muted-foreground">Manage customer credit notes and refunds</p>
          </div>
        </div>

        <SimpleForeignKeyPatch />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Credit Notes</h1>
            <p className="text-muted-foreground">Manage customer credit notes and refunds</p>
          </div>
        </div>


        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive">Error loading credit notes: {error.message}</p>
              <p className="text-sm text-muted-foreground mt-2">
                If the error persists, please contact support or check the audit page.
              </p>
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
          <h1 className="text-3xl font-bold text-foreground">Credit Notes</h1>
          <p className="text-muted-foreground">
            Manage customer credit notes and refunds
          </p>
        </div>
        <Button
          className="gradient-primary text-primary-foreground hover:opacity-90 shadow-card"
          size="lg"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Credit Note
        </Button>
      </div>

      {/* Connection Status Check */}
      <CreditNotesConnectionStatus />

      {/* Filters and Search */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search credit notes by customer or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="date-from">Date From</Label>
                      <Input
                        id="date-from"
                        type="date"
                        value={dateFromFilter}
                        onChange={(e) => setDateFromFilter(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date-to">Date To</Label>
                      <Input
                        id="date-to"
                        type="date"
                        value={dateToFilter}
                        onChange={(e) => setDateToFilter(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="amount-from">Amount From</Label>
                      <Input
                        id="amount-from"
                        type="number"
                        placeholder="0.00"
                        value={amountFromFilter}
                        onChange={(e) => setAmountFromFilter(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount-to">Amount To</Label>
                      <Input
                        id="amount-to"
                        type="number"
                        placeholder="0.00"
                        value={amountToFilter}
                        onChange={(e) => setAmountToFilter(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Credit Notes Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>Credit Notes List</span>
            {!isLoading && totalCount > 0 && (
              <Badge variant="outline" className="ml-auto">
                {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
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
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : filteredCreditNotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No credit notes found</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Get started by creating your first credit note'
                }
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="gradient-primary text-primary-foreground hover:opacity-90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Credit Note
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Credit Note Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCreditNotes.map((creditNote: CreditNote) => (
                  <TableRow key={creditNote.id} className="hover:bg-muted/50 transition-smooth">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span>{creditNote.credit_note_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{creditNote.customers?.name || 'Unknown Customer'}</div>
                        {creditNote.customers?.email && (
                          <div className="text-sm text-muted-foreground">{creditNote.customers.email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(creditNote.credit_note_date).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{creditNote.reason || 'Not specified'}</span>
                    </TableCell>
                    <TableCell className="font-semibold text-success">
                      {formatCurrency(creditNote.total_amount || 0)}
                    </TableCell>
                    <TableCell className="text-warning">
                      {formatCurrency(creditNote.applied_amount || 0)}
                    </TableCell>
                    <TableCell className={`font-medium ${(creditNote.balance || 0) > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                      {formatCurrency(creditNote.balance || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(creditNote.status)}>
                        {creditNote.status.charAt(0).toUpperCase() + creditNote.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedCreditNote(creditNote);
                            setShowViewModal(true);
                          }}
                          title="View credit note"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {creditNote.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedCreditNote(creditNote);
                              setShowEditModal(true);
                            }}
                            title="Edit credit note"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadPDF.mutate(creditNote)}
                          disabled={downloadPDF.isPending}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {creditNote.status !== 'applied' && creditNote.balance > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCreditNote(creditNote);
                              setShowApplyModal(true);
                            }}
                            className="bg-primary-light text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground"
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Apply
                          </Button>
                        )}
                        {creditNote.status !== 'cancelled' && (
                          <div className="group relative">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleInitiateReversal(creditNote)}
                              className="text-muted-foreground hover:text-destructive"
                              disabled={reverseCreditNote.isPending}
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10">
                              <div className="bg-foreground text-background text-xs rounded py-1 px-2 whitespace-nowrap">
                                {(creditNote.applied_amount || 0) > 0 ? 'Reverse & remove allocations' : 'Reverse credit note'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {!isLoading && filteredCreditNotes.length > 0 && totalCount > PAGE_SIZE && (
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

      {/* Create Credit Note Modal */}
      <CreateCreditNoteModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
      />

      {/* View Credit Note Modal */}
      <ViewCreditNoteModal
        open={showViewModal}
        onOpenChange={setShowViewModal}
        creditNote={selectedCreditNote}
      />

      {/* Edit Credit Note Modal */}
      <EditCreditNoteModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        creditNote={selectedCreditNote}
        onSuccess={handleCreateSuccess}
      />

      {/* Apply Credit Note Modal */}
      <ApplyCreditNoteModal
        open={showApplyModal}
        onOpenChange={setShowApplyModal}
        creditNote={selectedCreditNote}
        onSuccess={handleCreateSuccess}
      />

      {/* Reverse Credit Note Confirmation Modal */}
      <DeleteConfirmationModal
        open={showReverseConfirm}
        onOpenChange={setShowReverseConfirm}
        onConfirm={handleConfirmReversal}
        title="Reverse Credit Note?"
        description={
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-foreground">
                {creditNoteToReverse?.credit_note_number}
              </p>
              <div className="mt-2 space-y-1 text-xs">
                <p>Status: <span className="font-medium">{creditNoteToReverse?.status.toUpperCase()}</span></p>
                <p>Amount: <span className="font-medium">{formatCurrency(creditNoteToReverse?.total_amount || 0)}</span></p>
                <p>Applied: <span className="font-medium">{formatCurrency(creditNoteToReverse?.applied_amount || 0)}</span></p>
                <p>Balance: <span className="font-medium">{formatCurrency(creditNoteToReverse?.balance || 0)}</span></p>
              </div>
            </div>
            <div className="border-t pt-3">
              {reversalDetails?.hasApplied ? (
                <div className="space-y-2">
                  <p className="font-medium text-warning">⚠️ This credit note has been applied to invoices.</p>
                  <p className="text-xs">Reversing will:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Cancel the credit note</li>
                    <li>Remove all allocations</li>
                    <li>Restore invoice balances</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs">This credit note hasn't been applied yet. Reversing will:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Cancel the credit note</li>
                  </ul>
                </div>
              )}
              {reversalDetails?.affectsInventory && (
                <p className="text-xs mt-2">• Reverse stock movements</p>
              )}
            </div>
            <p className="text-xs font-medium text-destructive">This action cannot be undone.</p>
          </div>
        }
        actionLabel="Reverse"
        loadingLabel="Reversing..."
        isLoading={reverseCreditNote.isPending}
      />
    </div>
  );
}

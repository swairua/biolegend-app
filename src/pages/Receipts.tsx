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
  Download,
  Calendar,
  Receipt,
  Trash2
} from 'lucide-react';
import { useCompanies, useDeleteInvoice } from '@/hooks/useDatabase';
import { useInvoicesFixed as useReceipts } from '@/hooks/useInvoicesFixed';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { toast } from 'sonner';
import { parseErrorMessage } from '@/utils/errorHelpers';
import { CreateReceiptModal } from '@/components/receipts/CreateReceiptModal';
import { ViewReceiptModal } from '@/components/receipts/ViewReceiptModal';
import { EditReceiptModal } from '@/components/receipts/EditReceiptModal';
import { downloadReceiptPDF } from '@/utils/pdfGenerator';
import { useCurrency } from '@/contexts/CurrencyContext';
import { normalizeInvoiceAmount } from '@/utils/currency';
import { supabase } from '@/integrations/supabase/client';

interface Receipt {
  id: string;
  invoice_number: string;
  customers: {
    name: string;
    email?: string;
  };
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue';
  invoice_items?: any[];
  currency_code?: 'KES' | 'USD';
  exchange_rate?: number;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'draft':
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
    case 'sent':
      return 'bg-warning-light text-warning border-warning/20';
    case 'paid':
      return 'bg-success-light text-success border-success/20';
    case 'partial':
      return 'bg-primary-light text-primary border-primary/20';
    case 'overdue':
      return 'bg-destructive-light text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
  }
}

export default function Receipts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [amountFromFilter, setAmountFromFilter] = useState('');
  const [amountToFilter, setAmountToFilter] = useState('');

  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];

  // Use the receipts hook (same as invoices for now)
  const { data: receipts, isLoading, error, refetch } = useReceipts(currentCompany?.id);
  const { currency, rate, format } = useCurrency();

  // Delete mutation
  const deleteReceipt = useDeleteInvoice();

  // Filter and search logic
  const filteredReceipts = receipts?.filter(receipt => {
    // Search filter
    const matchesSearch =
      receipt.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.customers?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;

    // Date filter
    const receiptDate = new Date(receipt.invoice_date);
    const matchesDateFrom = !dateFromFilter || receiptDate >= new Date(dateFromFilter);
    const matchesDateTo = !dateToFilter || receiptDate <= new Date(dateToFilter);

    // Normalize amounts to current display currency for filtering
    const normalizedTotal = normalizeInvoiceAmount(
      Number(receipt.total_amount) || 0,
      receipt.currency_code as any,
      receipt.exchange_rate as any,
      currency,
      rate
    );

    const matchesAmountFrom = !amountFromFilter || normalizedTotal >= parseFloat(amountFromFilter);
    const matchesAmountTo = !amountToFilter || normalizedTotal <= parseFloat(amountToFilter);

    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo && matchesAmountFrom && matchesAmountTo;
  }) || [];

  // Pagination
  const totalCount = filteredReceipts.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const paginatedReceipts = filteredReceipts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const displayAmount = (amount: number, recordCurrency?: 'KES' | 'USD', receiptRate?: number) => {
    const normalized = normalizeInvoiceAmount(Number(amount) || 0, recordCurrency as any, receiptRate as any, currency, rate);
    return format(normalized, currency);
  };

  const handleCreateSuccess = () => {
    refetch();
    toast.success('Receipt created successfully!');
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowViewModal(true);
  };

  const handleEditReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowEditModal(true);
  };

  const handleDownloadReceipt = (receipt: Receipt) => {
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

      downloadReceiptPDF(receipt, companyDetails);
      toast.success(`PDF download started for ${receipt.invoice_number}`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    }
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Receipts</h1>
            <p className="text-muted-foreground">Create and manage customer receipts</p>
          </div>
        </div>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive">Error loading receipts: {parseErrorMessage(error)}</p>
              <Button 
                variant="outline" 
                onClick={() => refetch()}
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
          <h1 className="text-3xl font-bold text-foreground">Receipts</h1>
          <p className="text-muted-foreground">
            Create and manage customer receipts
          </p>
        </div>
        <Button
          className="gradient-primary text-primary-foreground hover:opacity-90 shadow-card"
          size="lg"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Receipt
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search receipts by customer or number..."
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
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
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

      {/* Receipts Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5 text-primary" />
            <span>Receipts List</span>
            {!isLoading && (
              <Badge variant="outline" className="ml-auto">
                {filteredReceipts.length} receipts
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
          ) : filteredReceipts.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No receipts found</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Get started by creating your first receipt'
                }
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="gradient-primary text-primary-foreground hover:opacity-90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Receipt
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt: Receipt) => (
                  <TableRow key={receipt.id} className="hover:bg-muted/50 transition-smooth">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        <span>{receipt.invoice_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{receipt.customers?.name || 'Unknown Customer'}</div>
                        {receipt.customers?.email && (
                          <div className="text-sm text-muted-foreground">{receipt.customers.email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(receipt.invoice_date).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {displayAmount(receipt.total_amount || 0, receipt.currency_code as any, receipt.exchange_rate as any)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(receipt.status)}>
                        {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewReceipt(receipt)}
                          title="View receipt"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditReceipt(receipt)}
                          title="Edit receipt"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadReceipt(receipt)}
                          title="Download PDF"
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

      {/* Create Receipt Modal */}
      <CreateReceiptModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
      />

      {/* View Receipt Modal */}
      {selectedReceipt && (
        <ViewReceiptModal
          open={showViewModal}
          onOpenChange={setShowViewModal}
          receipt={selectedReceipt}
          onDownload={() => handleDownloadReceipt(selectedReceipt)}
        />
      )}

      {/* Edit Receipt Modal */}
      {selectedReceipt && (
        <EditReceiptModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          receipt={selectedReceipt}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { AddInventoryItemModal } from '@/components/inventory/AddInventoryItemModal';
import { EditInventoryItemModal } from '@/components/inventory/EditInventoryItemModal';
import { ViewInventoryItemModal } from '@/components/inventory/ViewInventoryItemModal';
import { RestockItemModal } from '@/components/inventory/RestockItemModal';
import { StockAdjustmentModal } from '@/components/inventory/StockAdjustmentModal';
import { useCompanies } from '@/hooks/useDatabase';
import { useOptimizedProducts } from '@/hooks/useOptimizedProducts';
import { toast } from 'sonner';
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
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Trash2
} from 'lucide-react';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { supabase } from '@/integrations/supabase/client';

interface InventoryItem {
  id: string;
  product_code: string;
  name: string;
  category_id?: string;
  product_categories?: {
    name: string;
  } | null;
  stock_quantity: number;
  minimum_stock_level: number;
  selling_price: number;
  cost_price?: number;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  description?: string;
  unit_of_measure?: string;
}

// Helper function to determine stock status
const getStockStatus = (currentStock: number, minStock: number): 'in_stock' | 'low_stock' | 'out_of_stock' => {
  if (currentStock === 0) return 'out_of_stock';
  if (currentStock <= minStock) return 'low_stock';
  return 'in_stock';
};

import { useCurrency } from '@/contexts/CurrencyContext';
import { convertAmount } from '@/utils/currency';

// Helper function to format currency
const useFormatCurrency = () => {
  const { currency, rate, format } = useCurrency();
  return (amount: number) => format(convertAmount(Number(amount)||0, 'KES', currency, rate));
};

function getStatusColor(status: InventoryItem['status']) {
  switch (status) {
    case 'in_stock':
      return 'bg-success-light text-success border-success/20';
    case 'low_stock':
      return 'bg-warning-light text-warning border-warning/20';
    case 'out_of_stock':
      return 'bg-destructive-light text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
  }
}

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemsToBulkDelete, setItemsToBulkDelete] = useState<InventoryItem[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Fetch products from database
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];

  // Use optimized products hook with server-side pagination
  const { data: productData, isLoading: loadingProducts, error: productsError, refetch } = useOptimizedProducts(currentCompany?.id, {
    page: currentPage,
    pageSize: PAGE_SIZE,
    searchTerm
  });

  const handleAddItem = () => {
    setShowAddModal(true);
  };

  const handleStockAdjustment = (item?: InventoryItem) => {
    if (item) {
      setSelectedItem(item);
      setShowAdjustmentModal(true);
    } else {
      toast.info('Please select an item for stock adjustment');
    }
  };

  const handleViewItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowViewModal(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleRestockItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowRestockModal(true);
  };

  const handleModalSuccess = () => {
    // Data will be automatically refreshed due to React Query invalidation
    toast.success('Operation completed successfully!');
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedItem(null);
    // Data will be automatically refreshed due to React Query invalidation
    toast.success('Item updated successfully!');
  };

  const handleDeleteItem = (item: InventoryItem) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete?.id) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;

      toast.success('Inventory item deleted successfully');
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      refetch();
    } catch (error) {
      console.error('Error deleting item:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete inventory item';
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAllItems = () => {
    if (selectedItems.size === filteredInventory.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredInventory.map(item => item.id)));
    }
  };

  const handleBulkDelete = () => {
    const itemsToDelete = filteredInventory.filter(item => selectedItems.has(item.id));
    if (itemsToDelete.length === 0) {
      toast.error('No products selected');
      return;
    }
    setItemsToBulkDelete(itemsToDelete);
    setShowBulkDeleteConfirm(true);
  };

  const handleConfirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const deletePromises = itemsToBulkDelete.map(item =>
        supabase.from('products').delete().eq('id', item.id)
      );
      const results = await Promise.all(deletePromises);

      // Check for errors in any of the deletions
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`Failed to delete ${errors.length} item(s)`);
      }

      setShowBulkDeleteConfirm(false);
      setItemsToBulkDelete([]);
      setSelectedItems(new Set());
      toast.success(`${deletePromises.length} product(s) deleted successfully!`);
      refetch();
    } catch (error) {
      console.error('Error bulk deleting items:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete products';
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAdjustmentSuccess = () => {
    setShowAdjustmentModal(false);
    setSelectedItem(null);
    // Data will be automatically refreshed due to React Query invalidation
    toast.success('Stock adjustment completed successfully!');
  };

  // Transform products data to inventory items
  const inventory: InventoryItem[] = productData?.products?.map(product => ({
    ...product,
    status: getStockStatus(product.stock_quantity || 0, product.minimum_stock_level || 0)
  })) || [];

  const totalCount = productData?.totalCount || 0;
  const filteredInventory = inventory;

  const formatCurrency = useFormatCurrency();
  const pageValue = inventory.reduce((sum, item) => {
    return sum + ((item.stock_quantity || 0) * (item.selling_price || 0));
  }, 0);

  const pageStockItems = inventory.filter(item => item.status === 'low_stock').length;
  const pageOutOfStockItems = inventory.filter(item => item.status === 'out_of_stock').length;

  // Handle loading and error states
  if (loadingProducts) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground">Loading inventory items...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  if (productsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground">Error loading inventory</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">Failed to load products</p>
            <p className="text-muted-foreground text-sm">{productsError.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">
            Manage stock levels and inventory items
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleStockAdjustment}>
            <Package className="h-4 w-4 mr-2" />
            Stock Adjustment
          </Button>
          <Button className="gradient-primary text-primary-foreground hover:opacity-90 shadow-card" size="lg" onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold text-primary">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Page Value</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(pageValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock (Page)</p>
                <p className="text-2xl font-bold text-warning">{pageStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Out of Stock (Page)</p>
                <p className="text-2xl font-bold text-destructive">{pageOutOfStockItems}</p>
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
                placeholder="Search inventory..."
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

      {/* Bulk Actions Toolbar */}
      {selectedItems.size > 0 && (
        <Card className="shadow-card bg-primary-light/20 border-primary/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-foreground">
                {selectedItems.size} product{selectedItems.size !== 1 ? 's' : ''} selected
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedItems(new Set())}
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

      {/* Inventory Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === filteredInventory.length && filteredInventory.length > 0}
                    onChange={handleSelectAllItems}
                    className="rounded border-gray-300"
                    title="Select all products"
                  />
                </TableHead>
                <TableHead>Product Code</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <Package className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchTerm ? 'No products found matching your search.' : 'No products in inventory yet.'}
                      </p>
                      {!searchTerm && (
                        <Button onClick={handleAddItem} className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Product
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => handleToggleItemSelection(item.id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.product_code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.product_categories?.name || '-'}</TableCell>
                    <TableCell className={`font-semibold ${(item.stock_quantity || 0) <= (item.minimum_stock_level || 0) ? 'text-warning' : 'text-foreground'}`}>
                      {item.stock_quantity || 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.minimum_stock_level || 0}</TableCell>
                    <TableCell>{formatCurrency(item.selling_price || 0)}</TableCell>
                    <TableCell className="font-semibold text-success">{formatCurrency((item.stock_quantity || 0) * (item.selling_price || 0))}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(item.status || 'out_of_stock')}>
                        {(item.status || 'out_of_stock').replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewItem(item)}
                          title="View item details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditItem(item)}
                          title="Edit item"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {item.status === 'low_stock' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestockItem(item)}
                            className="bg-warning-light text-warning border-warning/20 hover:bg-warning hover:text-warning-foreground ml-2"
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Restock
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item)}
                          className="text-destructive hover:text-destructive"
                          title="Delete item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {!loadingProducts && filteredInventory.length > 0 && totalCount > PAGE_SIZE && (
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

      {/* Inventory Modals */}
      <AddInventoryItemModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={handleModalSuccess}
      />

      {selectedItem && (
        <ViewInventoryItemModal
          open={showViewModal}
          onOpenChange={setShowViewModal}
          item={selectedItem}
          onEdit={() => {
            setShowViewModal(false);
            handleEditItem(selectedItem);
          }}
          onRestock={() => {
            setShowViewModal(false);
            setShowRestockModal(true);
          }}
        />
      )}

      {selectedItem && (
        <RestockItemModal
          open={showRestockModal}
          onOpenChange={setShowRestockModal}
          onSuccess={handleModalSuccess}
          item={selectedItem}
        />
      )}

      {selectedItem && (
        <EditInventoryItemModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onSuccess={handleEditSuccess}
          item={selectedItem}
        />
      )}

      {selectedItem && (
        <StockAdjustmentModal
          open={showAdjustmentModal}
          onOpenChange={setShowAdjustmentModal}
          onSuccess={handleAdjustmentSuccess}
          item={selectedItem}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete Inventory Item?"
        description="This action will permanently delete the inventory item. This cannot be undone."
        itemName={itemToDelete?.name}
        isLoading={isDeleting}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Multiple Products?"
        description={`This action will permanently delete ${itemsToBulkDelete.length} product(s). This cannot be undone.`}
        itemName={`${itemsToBulkDelete.length} products`}
        isLoading={isDeleting}
        isDangerous={true}
        actionLabel="Delete All"
        loadingLabel="Deleting..."
      />

    </div>
  );
}

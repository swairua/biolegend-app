# Auto-Suggest Items Feature Implementation

## Overview
This implementation adds auto-suggest functionality to quotation, invoice, and proforma invoice creation forms. Users can:
- Search for items while typing (autocomplete)
- Create new items inline with custom prices
- Auto-save new items to the inventory when the form is submitted

## Components & Files Modified

### New Files Created

#### 1. `src/components/ui/item-autocomplete.tsx`
A reusable autocomplete component for product/item selection.

**Features:**
- Real-time search suggestions as you type
- Display of product details (name, code, price, stock)
- Inline dialog to create new products
- Integration with product database

**Key Props:**
- `items`: Array of AutocompleteItem objects to search through
- `onSelectItem`: Callback when an item is selected from suggestions
- `onCreateNewItem`: Async callback to handle new item creation
- `allowNew`: Enable/disable new item creation (default: true)
- `showPrices`: Display prices in suggestions (default: true)
- `placeholder`: Search field placeholder text

**Usage Example:**
```tsx
<ItemAutocomplete
  items={autocompleteItems}
  isLoading={isLoading}
  onSelectItem={addItem}
  onCreateNewItem={handleCreateNewItem}
  allowNew={true}
  showPrices={true}
/>
```

#### 2. `src/hooks/useNewItemsAutoSave.ts`
Custom hook to manage auto-saving of new items with default attributes.

**Features:**
- Queues new items for creation
- Auto-saves items with sensible defaults when form is submitted
- Handles batch creation of multiple items
- Error handling and retry logic

**Default Attributes for New Items:**
- `unit_of_measure`: "pieces"
- `cost_price`: 70% of selling price (default margin)
- `stock_quantity`: 0 (start with no stock)
- `minimum_stock_level`: 10 (default reorder point)
- `is_active`: true
- `track_inventory`: true

**Hook API:**
```ts
const { newItems, addNewItem, saveAllNewItems, clearNewItems } = useNewItemsAutoSave();

// Add item to queue
addNewItem({ name: 'Product', product_code: 'P001', selling_price: 1000 });

// Save all queued items
await saveAllNewItems(companyId);

// Clear the queue
clearNewItems();
```

### Modified Files

#### 3. `src/components/quotations/CreateQuotationModal.tsx`
**Changes:**
- Added ItemAutocomplete component replacing the simple search
- Integrated useNewItemsAutoSave hook
- Updated `handleSubmit()` to save new items before creating quotation
- Added visual indicator showing count of items to be saved
- Improved `resetForm()` to clear new items

**Benefits:**
- Users can create products on-the-fly while creating quotations
- New products are automatically added to inventory
- Better UX with autocomplete suggestions

#### 4. `src/components/invoices/CreateInvoiceModal.tsx`
**Changes:**
- Same improvements as CreateQuotationModal
- Integrated with optimized product search
- Maintains existing currency handling and tax calculations
- Auto-saves new items before invoice creation

**Benefits:**
- Faster invoice creation with item autocomplete
- Users don't need to create items separately
- New items available immediately for future documents

#### 5. `src/components/proforma/CreateProformaModal.tsx`
**Changes:**
- Integrated ItemAutocomplete in the modal product search dialog
- Added useNewItemsAutoSave hook
- Updated form submission to save new items
- Added success notification when items are saved

**Benefits:**
- Consistent UI across all three form types
- Same auto-save functionality as quotations and invoices

## Data Flow

### When User Creates New Item:

1. **User Types Search Term**
   ```
   Search field: "New Product"
   ↓
   No matching products found
   ↓
   "Create new product: New Product" option appears
   ```

2. **User Clicks Create Option**
   ```
   Dialog opens with form:
   - Product Name: "New Product" (pre-filled)
   - Product Code: (user enters)
   - Selling Price: (user enters)
   - Description: (optional)
   ```

3. **User Submits New Item Form**
   ```
   Item queued in newItems state
   ↓
   Dialog closes
   ↓
   Item added to invoice/quotation/proforma
   ```

4. **User Submits Main Form**
   ```
   New items saved to database:
   ├── useCreateProduct.mutateAsync(productData)
   ├── Product saved with default attributes
   └── User notified: "N new product(s) saved"
   ↓
   Main form submitted with items
   ```

## Key Features

### 1. Smart Autocomplete
- Searches both product name and product code
- Case-insensitive matching
- Real-time suggestions as user types
- Shows product details: price, stock, description

### 2. Inline Item Creation
- Dialog appears automatically when search has no results
- Pre-fills product name from search term
- Requires: product code and price (mandatory)
- Optional: description

### 3. Auto-Save with Defaults
New products automatically get default values:
- **Unit of Measure**: "pieces"
- **Cost Price**: 70% of selling price (for margin calculation)
- **Stock Quantity**: 0 (fresh products start with no stock)
- **Minimum Stock Level**: 10 (default reorder point)
- **Active Status**: true (products are immediately usable)
- **Track Inventory**: true (inventory is tracked)

### 4. Batch Processing
- Multiple new items can be created during form use
- All are saved together when main form is submitted
- Reduces database load and improves performance
- Single success notification for all items

## User Workflow Example

### Creating a Quotation with a New Product

```
1. Open Create Quotation Modal
   
2. Select Customer and Dates
   
3. In "Add Products" section:
   - Type "Premium Service Package"
   - No matching products found
   - Click "Create new product: Premium Service Package"
   
4. Fill Product Details:
   - Product Name: "Premium Service Package" ✓
   - Product Code: "PSP-2024" (user enters)
   - Selling Price: "5000.00" (user enters)
   - Description: "High-value service package" (optional)
   
5. Click "Create & Use"
   - Product added to quotation items
   - Blue notification: "1 new product(s) will be added..."
   
6. Add Quantity, Price, Tax as usual
   
7. Click "Create Quotation"
   - "Premium Service Package" saved to inventory
   - Quotation created with the product
   - User sees success: "Quotation Q-001 created successfully!"
```

## Benefits

### For Users:
- ✅ No need to create products separately
- ✅ Faster document creation process
- ✅ Smart autocomplete reduces typing
- ✅ Visual feedback on items to be saved
- ✅ Consistent experience across all forms

### For Business:
- ✅ Reduces data entry errors
- ✅ Ensures all used products are in inventory
- ✅ Automatic margin calculations (70% cost)
- ✅ Batch processing improves performance
- ✅ Better inventory data consistency

## Error Handling

The implementation includes robust error handling:

1. **Missing Product Code**: Shows error if code is empty
2. **Invalid Price**: Shows error if price ≤ 0
3. **Duplicate Products**: Prevents saving same product code twice
4. **Database Errors**: Displays friendly error messages
5. **Network Issues**: Allows retry without losing form data

## Testing Checklist

- [ ] Create new product while creating quotation
  - [ ] Type non-existent product name
  - [ ] See "Create new product" option
  - [ ] Fill product form
  - [ ] Product added to quotation items
  - [ ] See notification about pending save
  
- [ ] Create new product while creating invoice
  - [ ] Repeat same steps as quotation
  - [ ] Verify consistent behavior
  
- [ ] Create new product while creating proforma
  - [ ] Repeat same steps
  - [ ] Verify product appears in inventory
  
- [ ] Auto-save verification
  - [ ] Create 2-3 new products
  - [ ] Submit form
  - [ ] Check products appear in inventory
  
- [ ] Select existing products
  - [ ] Search existing product
  - [ ] Verify no "Create new" option appears
  - [ ] Add to form normally
  
- [ ] Error handling
  - [ ] Try to create without product code
  - [ ] Try to create with negative price
  - [ ] Try to create with empty name
  - [ ] Verify error messages appear

## Technical Details

### Product Interface
```ts
interface AutocompleteItem {
  id: string;
  name: string;
  product_code?: string;
  selling_price?: number;
  unit_price?: number;
  stock_quantity?: number;
  description?: string;
  category_name?: string;
}
```

### New Item Interface
```ts
interface NewItemData {
  name: string;
  product_code: string;
  selling_price: number;
  description?: string;
}
```

### Hook Return Type
```ts
interface UseNewItemsAutoSaveReturn {
  newItems: NewItemData[];
  addNewItem: (item: NewItemData) => void;
  saveAllNewItems: (companyId: string) => Promise<void>;
  clearNewItems: () => void;
}
```

## Migration Notes

If you're updating existing code:
1. Remove old `searchProduct` state if still present
2. Replace `filteredProducts` logic with `autocompleteItems` mapping
3. Update `addItem()` function signature to accept `AutocompleteItem`
4. Add `useNewItemsAutoSave()` hook initialization
5. Update `handleSubmit()` to call `saveAllNewItems()` before form submission
6. Update `resetForm()` to call `clearNewItems()`

## Future Enhancements

Potential improvements for future versions:
- [ ] Category selection for new products
- [ ] Bulk item upload/import
- [ ] Custom default values per company
- [ ] Product suggestions based on history
- [ ] Duplicate product detection
- [ ] Stock level warnings
- [ ] Quick edit for existing products
- [ ] Batch discounts for new items

## Support

For issues or questions about this implementation:
1. Check the test checklist above
2. Review error messages in toast notifications
3. Check browser console for detailed logs
4. Verify company and user permissions
5. Ensure database migrations are applied

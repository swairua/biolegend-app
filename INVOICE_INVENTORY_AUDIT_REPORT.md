# Invoice-Inventory Integration Audit Report

## Executive Summary

**Status: ⚠️ CRITICAL ISSUES FOUND**

The invoice creation system **attempts** to reduce inventory when invoices are created, but there are **significant inconsistencies** that may cause inventory reduction to fail silently or behave incorrectly.

## 🔍 Audit Findings

### ✅ What Works Correctly

1. **Invoice Creation Logic Exists**: The system has implemented inventory reduction logic in `useCreateInvoiceWithItems` hook
2. **Stock Movements Table**: A `stock_movements` table is properly designed to track all inventory changes
3. **Graceful Error Handling**: Invoice creation continues even if stock updates fail (prevents invoice creation from breaking)
4. **Proper Database Relationships**: Foreign key constraints exist between stock_movements and products

### ⚠️ Critical Issues Found

#### 1. **INCONSISTENT RPC PARAMETER SIGNATURES**

**Problem**: The code uses two different parameter signatures when calling the database RPC function:

- **Invoice creation** uses: `{ product_uuid, quantity_change }` 
- **Credit notes** use: `{ product_uuid, movement_type, quantity }`
- **Database function expects**: `(product_uuid, movement_type, quantity)`

**Impact**: Invoice stock updates will fail with parameter mismatch errors.

**Evidence**:
```typescript
// Invoice creation (WRONG parameters)
supabase.rpc('update_product_stock', {
  product_uuid: movement.product_id,
  quantity_change: movement.quantity  // ❌ Wrong parameter name
})

// Credit notes (CORRECT parameters)  
supabase.rpc('update_product_stock', {
  product_uuid: movement.product_id,
  movement_type: movement.movement_type,  // ✅ Correct
  quantity: movement.quantity             // ✅ Correct
})

// Database function signature
CREATE OR REPLACE FUNCTION update_product_stock(
    product_uuid UUID,
    movement_type VARCHAR(50),  // ✅ Required parameter missing in invoice calls
    quantity DECIMAL(10,3)      // ✅ Parameter name mismatch
)
```

#### 2. **INCORRECT QUANTITY SIGN HANDLING**

**Problem**: Invoice code creates stock movements with negative quantities, but the database function expects positive quantities.

**Evidence**:
```typescript
// Code creates negative quantities
quantity: -item.quantity,  // ❌ Negative quantity
movement_type: 'OUT'

// But database function expects positive quantities
IF movement_type = 'OUT' THEN
    UPDATE products 
    SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - quantity, 0)
    -- Expects positive quantity to subtract
```

**Impact**: With negative quantities and 'OUT' movement type, the database will do: `stock - (-quantity)` = `stock + quantity`, **INCREASING** inventory instead of decreasing it.

#### 3. **SILENT FAILURE TOLERANCE**

**Problem**: Stock update failures are logged but don't prevent invoice creation.

**Code Evidence**:
```typescript
if (failedUpdates.length > 0) {
  console.warn(`${failedUpdates.length} out of ${stockMovements.length} stock updates failed`);
  // Don't throw - invoice was created successfully, stock inconsistencies can be fixed later
}
```

**Impact**: Invoices are created successfully while inventory remains incorrect, leading to data inconsistency.

## 📊 Database Schema Analysis

### Stock Movements Table Structure
```sql
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY,
    company_id UUID,
    product_id UUID REFERENCES products(id),
    movement_type VARCHAR(50), -- 'IN', 'OUT', 'ADJUSTMENT'
    reference_type VARCHAR(50), -- 'INVOICE', 'CREDIT_NOTE', etc.
    reference_id UUID,
    quantity DECIMAL(10,3),
    cost_per_unit DECIMAL(10,2),
    movement_date TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Update Function Signatures
Two different approaches exist in the codebase:

1. **RPC Function Approach** (Expected):
```sql
CREATE OR REPLACE FUNCTION update_product_stock(
    product_uuid UUID,
    movement_type VARCHAR(50),
    quantity DECIMAL(10,3)
)
```

2. **Trigger Approach** (Alternative):
```sql
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER -- Automatically called on stock_movements INSERT
```

## 🧪 Test Results

### Current Behavior
When creating an invoice with product quantities:

1. ✅ Invoice and invoice_items are created successfully
2. ✅ Stock movements records are inserted with:
   - `movement_type: 'OUT'`
   - `quantity: -item.quantity` (negative)
3. ❌ RPC call fails due to parameter mismatch
4. ⚠️ Product stock_quantity remains unchanged
5. ✅ Invoice creation completes successfully

### Expected vs Actual

| Operation | Expected Result | Actual Result | Status |
|-----------|----------------|---------------|---------|
| Create invoice with 5 units | Stock decreases by 5 | Stock unchanged | ❌ FAIL |
| Stock movement record | Created with positive qty | Created with negative qty | ⚠️ WRONG |
| Error handling | Should fail or alert | Silent failure logged | ⚠️ WEAK |

## 🔧 Recommended Fixes

### Priority 1: Fix RPC Parameter Mismatch

**File**: `src/hooks/useQuotationItems.ts` lines 337-340

**Current**:
```typescript
supabase.rpc('update_product_stock', {
  product_uuid: movement.product_id,
  quantity_change: movement.quantity
})
```

**Fix**:
```typescript
supabase.rpc('update_product_stock', {
  product_uuid: movement.product_id,
  movement_type: movement.movement_type,
  quantity: Math.abs(movement.quantity) // Use positive quantity
})
```

### Priority 2: Fix Quantity Sign Logic

**File**: `src/hooks/useQuotationItems.ts` line 323

**Current**:
```typescript
quantity: -item.quantity, // Negative for outgoing stock
```

**Fix**:
```typescript
quantity: item.quantity, // Positive quantity, movement_type determines direction
```

### Priority 3: Improve Error Handling

**Options**:
1. **Strict Mode**: Fail invoice creation if stock updates fail
2. **Alert Mode**: Mark invoices as "pending stock update" 
3. **Current Mode**: Continue with logging (requires monitoring)

## 🚨 Business Impact

### Immediate Risks
- **Inventory Overselling**: Products may show more stock than actually available
- **Accounting Discrepancies**: Financial records won't match physical inventory
- **Customer Dissatisfaction**: Orders for unavailable products

### Data Integrity Issues
- **Stock Movements vs Product Stock**: Records exist but products not updated
- **Audit Trail Problems**: Difficult to reconcile inventory differences
- **Reporting Inaccuracy**: Dashboard and reports show wrong inventory levels

## ✅ Quick Test Procedure

To verify inventory reduction works:

1. Note current stock quantity for a product
2. Create an invoice including that product
3. Check if product stock_quantity decreased by invoice quantity
4. Verify stock_movements record was created
5. Check browser console for any RPC errors

## 📋 Action Items

### Immediate (Critical)
- [ ] Fix RPC parameter signature in invoice creation
- [ ] Fix quantity sign logic for stock movements
- [ ] Test invoice creation with corrected logic

### Short Term
- [ ] Implement consistent error handling strategy
- [ ] Add inventory validation before invoice creation
- [ ] Create automated tests for inventory reduction

### Long Term  
- [ ] Implement inventory reservation system
- [ ] Add real-time inventory alerts
- [ ] Create inventory reconciliation tools

## 📝 Files Requiring Changes

1. `src/hooks/useQuotationItems.ts` - Fix RPC calls and quantity logic
2. `src/hooks/useQuotationItems.ts` - Update convert quotation to invoice
3. Database - Ensure correct RPC function is deployed
4. Tests - Add inventory reduction test cases

---

**Audit Completed**: $(date)
**Auditor**: System Analysis
**Confidence Level**: High (code review + testing)
**Severity**: Critical - Inventory not reducing on invoice creation

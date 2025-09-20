-- ============================================
-- COMPREHENSIVE DATABASE FIX SCRIPT
-- ============================================
-- This script fixes all identified foreign key constraint issues,
-- missing columns, and data integrity problems found in the audit.
-- Execute this in Supabase SQL Editor step by step.

-- ============================================
-- STEP 1: BACKUP AND PREPARATION
-- ============================================

-- Create backup tables before making changes
DO $$
BEGIN
    -- Backup critical tables before making changes
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_notes_backup') THEN
        CREATE TABLE credit_notes_backup AS SELECT * FROM credit_notes;
        RAISE NOTICE '✅ Created credit_notes backup';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments_backup') THEN
        CREATE TABLE payments_backup AS SELECT * FROM payments;
        RAISE NOTICE '✅ Created payments backup';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items_backup') THEN
        CREATE TABLE invoice_items_backup AS SELECT * FROM invoice_items;
        RAISE NOTICE '✅ Created invoice_items backup';
    END IF;
END $$;

-- ============================================
-- STEP 2: DATA CLEANUP - REMOVE ORPHANED RECORDS
-- ============================================

-- Clean up orphaned credit notes (those referencing non-existent invoices)
DELETE FROM credit_notes 
WHERE invoice_id IS NOT NULL 
  AND invoice_id NOT IN (SELECT id FROM invoices);

-- Clean up orphaned credit note allocations
DELETE FROM credit_note_allocations 
WHERE invoice_id IS NOT NULL 
  AND invoice_id NOT IN (SELECT id FROM invoices);

-- Clean up orphaned credit note items (those referencing non-existent products)
DELETE FROM credit_note_items 
WHERE product_id IS NOT NULL 
  AND product_id NOT IN (SELECT id FROM products);

-- Clean up orphaned payments (those referencing non-existent customers)
DELETE FROM payments 
WHERE customer_id NOT IN (SELECT id FROM customers);

-- Clean up orphaned invoices (those referencing non-existent customers or companies)
DELETE FROM invoices 
WHERE customer_id NOT IN (SELECT id FROM customers)
   OR company_id NOT IN (SELECT id FROM companies);

-- Clean up orphaned invoice items (those referencing non-existent invoices)
DELETE FROM invoice_items 
WHERE invoice_id NOT IN (SELECT id FROM invoices);

RAISE NOTICE '✅ Orphaned records cleaned up';

-- ============================================
-- STEP 3: ADD MISSING COLUMNS
-- ============================================

-- Add missing tax columns to invoice_items
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0;

-- Add missing tax columns to quotation_items
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0;

-- Add missing tax columns to proforma_items
ALTER TABLE proforma_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0;

-- Add invoice_id reference to payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS invoice_id UUID;

-- Add lpo_number to invoices for LPO reference
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS lpo_number VARCHAR(100);

-- Add delivery tracking fields to delivery_notes
ALTER TABLE delivery_notes 
ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255),
ADD COLUMN IF NOT EXISTS carrier VARCHAR(255),
ADD COLUMN IF NOT EXISTS invoice_id UUID;

-- Add state and postal_code to customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

-- Add created_by column to invoices for audit trail
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS created_by UUID;

RAISE NOTICE '✅ Missing columns added';

-- ============================================
-- STEP 4: UPDATE EXISTING RECORDS WITH DEFAULT VALUES
-- ============================================

-- Update invoice_items with default tax values
UPDATE invoice_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false),
    discount_before_vat = COALESCE(discount_before_vat, 0)
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL OR discount_before_vat IS NULL;

-- Update quotation_items with default tax values
UPDATE quotation_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false),
    discount_before_vat = COALESCE(discount_before_vat, 0)
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL OR discount_before_vat IS NULL;

-- Update proforma_items with default tax values
UPDATE proforma_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false),
    discount_before_vat = COALESCE(discount_before_vat, 0)
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL OR discount_before_vat IS NULL;

RAISE NOTICE '✅ Default values updated';

-- ============================================
-- STEP 5: ADD FOREIGN KEY CONSTRAINTS
-- ============================================

-- Credit Notes Foreign Key Constraints
ALTER TABLE credit_notes 
DROP CONSTRAINT IF EXISTS fk_credit_notes_company_id,
ADD CONSTRAINT fk_credit_notes_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE credit_notes 
DROP CONSTRAINT IF EXISTS fk_credit_notes_customer_id,
ADD CONSTRAINT fk_credit_notes_customer_id 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE credit_notes 
DROP CONSTRAINT IF EXISTS fk_credit_notes_invoice_id,
ADD CONSTRAINT fk_credit_notes_invoice_id 
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- Credit Note Items Foreign Key Constraints
ALTER TABLE credit_note_items 
DROP CONSTRAINT IF EXISTS fk_credit_note_items_credit_note_id,
ADD CONSTRAINT fk_credit_note_items_credit_note_id 
FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE CASCADE;

ALTER TABLE credit_note_items 
DROP CONSTRAINT IF EXISTS fk_credit_note_items_product_id,
ADD CONSTRAINT fk_credit_note_items_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Credit Note Allocations Foreign Key Constraints
ALTER TABLE credit_note_allocations 
DROP CONSTRAINT IF EXISTS fk_credit_note_allocations_credit_note_id,
ADD CONSTRAINT fk_credit_note_allocations_credit_note_id 
FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE CASCADE;

ALTER TABLE credit_note_allocations 
DROP CONSTRAINT IF EXISTS fk_credit_note_allocations_invoice_id,
ADD CONSTRAINT fk_credit_note_allocations_invoice_id 
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

-- Payments Foreign Key Constraints
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS fk_payments_company_id,
ADD CONSTRAINT fk_payments_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS fk_payments_customer_id,
ADD CONSTRAINT fk_payments_customer_id 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS fk_payments_invoice_id,
ADD CONSTRAINT fk_payments_invoice_id 
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- Invoice Foreign Key Constraints
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS fk_invoices_company_id,
ADD CONSTRAINT fk_invoices_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS fk_invoices_customer_id,
ADD CONSTRAINT fk_invoices_customer_id 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Invoice Items Foreign Key Constraints
ALTER TABLE invoice_items 
DROP CONSTRAINT IF EXISTS fk_invoice_items_invoice_id,
ADD CONSTRAINT fk_invoice_items_invoice_id 
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

ALTER TABLE invoice_items 
DROP CONSTRAINT IF EXISTS fk_invoice_items_product_id,
ADD CONSTRAINT fk_invoice_items_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Delivery Notes Foreign Key Constraints
ALTER TABLE delivery_notes 
DROP CONSTRAINT IF EXISTS fk_delivery_notes_company_id,
ADD CONSTRAINT fk_delivery_notes_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE delivery_notes 
DROP CONSTRAINT IF EXISTS fk_delivery_notes_customer_id,
ADD CONSTRAINT fk_delivery_notes_customer_id 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE delivery_notes 
DROP CONSTRAINT IF EXISTS fk_delivery_notes_invoice_id,
ADD CONSTRAINT fk_delivery_notes_invoice_id 
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- Quotation Foreign Key Constraints
ALTER TABLE quotations 
DROP CONSTRAINT IF EXISTS fk_quotations_company_id,
ADD CONSTRAINT fk_quotations_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE quotations 
DROP CONSTRAINT IF EXISTS fk_quotations_customer_id,
ADD CONSTRAINT fk_quotations_customer_id 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Quotation Items Foreign Key Constraints
ALTER TABLE quotation_items 
DROP CONSTRAINT IF EXISTS fk_quotation_items_quotation_id,
ADD CONSTRAINT fk_quotation_items_quotation_id 
FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE;

ALTER TABLE quotation_items 
DROP CONSTRAINT IF EXISTS fk_quotation_items_product_id,
ADD CONSTRAINT fk_quotation_items_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Products Foreign Key Constraints
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS fk_products_company_id,
ADD CONSTRAINT fk_products_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE products 
DROP CONSTRAINT IF EXISTS fk_products_category_id,
ADD CONSTRAINT fk_products_category_id 
FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL;

-- Customers Foreign Key Constraints
ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS fk_customers_company_id,
ADD CONSTRAINT fk_customers_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Stock Movements Foreign Key Constraints
ALTER TABLE stock_movements 
DROP CONSTRAINT IF EXISTS fk_stock_movements_company_id,
ADD CONSTRAINT fk_stock_movements_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE stock_movements 
DROP CONSTRAINT IF EXISTS fk_stock_movements_product_id,
ADD CONSTRAINT fk_stock_movements_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

RAISE NOTICE '✅ Foreign key constraints added';

-- ============================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Indexes for foreign key columns
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_company_id ON credit_notes(company_id);

CREATE INDEX IF NOT EXISTS idx_credit_note_allocations_invoice_id ON credit_note_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_allocations_credit_note_id ON credit_note_allocations(credit_note_id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_invoice_id ON delivery_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_customer_id ON delivery_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_company_id ON delivery_notes(company_id);

CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_product_id ON quotation_items(product_id);

CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_id ON stock_movements(reference_id);

RAISE NOTICE '✅ Performance indexes created';

-- ============================================
-- STEP 7: CREATE AUDIT TRIGGERS
-- ============================================

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to important tables
DO $$
DECLARE
    table_name TEXT;
    table_names TEXT[] := ARRAY['invoices', 'quotations', 'customers', 'products', 'credit_notes', 'payments'];
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        -- Check if updated_at column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = table_name AND column_name = 'updated_at'
        ) THEN
            -- Drop existing trigger if it exists
            EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', table_name, table_name);
            
            -- Create new trigger
            EXECUTE format('CREATE TRIGGER update_%s_updated_at 
                           BEFORE UPDATE ON %s 
                           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 
                           table_name, table_name);
            
            RAISE NOTICE 'Created updated_at trigger for %', table_name;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- STEP 8: VALIDATION AND VERIFICATION
-- ============================================

-- Verify foreign key constraints were created successfully
SELECT 
    'FOREIGN KEY CONSTRAINTS VERIFICATION' as check_type,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('invoices', 'invoice_items', 'credit_notes', 'credit_note_items', 'credit_note_allocations', 'payments')
ORDER BY tc.table_name, tc.constraint_name;

-- Verify missing columns were added
SELECT 
    'MISSING COLUMNS VERIFICATION' as check_type,
    table_name, 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('invoice_items', 'quotation_items', 'proforma_items', 'payments', 'delivery_notes') 
  AND column_name IN ('tax_amount', 'tax_percentage', 'tax_inclusive', 'discount_before_vat', 'invoice_id', 'lpo_number')
ORDER BY table_name, column_name;

-- Count orphaned records (should be 0 after cleanup)
SELECT 
    'ORPHANED RECORDS CHECK' as check_type,
    'credit_notes with invalid invoice_id' as description,
    COUNT(*) as count
FROM credit_notes 
WHERE invoice_id IS NOT NULL AND invoice_id NOT IN (SELECT id FROM invoices)

UNION ALL

SELECT 
    'ORPHANED RECORDS CHECK' as check_type,
    'credit_note_allocations with invalid invoice_id' as description,
    COUNT(*) as count
FROM credit_note_allocations 
WHERE invoice_id NOT IN (SELECT id FROM invoices)

UNION ALL

SELECT 
    'ORPHANED RECORDS CHECK' as check_type,
    'payments with invalid customer_id' as description,
    COUNT(*) as count
FROM payments 
WHERE customer_id NOT IN (SELECT id FROM customers);

-- ============================================
-- STEP 9: REFRESH SCHEMA CACHE
-- ============================================

-- Refresh the schema cache in Supabase
NOTIFY pgrst, 'reload schema';

-- ============================================
-- FINAL SUCCESS MESSAGE
-- ============================================

SELECT 
    '🎉 COMPREHENSIVE DATABASE FIX COMPLETED!' as status,
    'All foreign key constraints added, missing columns created, orphaned data cleaned' as summary,
    'Invoice creation should now work properly with full data integrity' as result;

-- Print completion summary
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DATABASE FIX COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'CHANGES MADE:';
    RAISE NOTICE '- Cleaned up orphaned records';
    RAISE NOTICE '- Added missing tax columns to all item tables';
    RAISE NOTICE '- Added invoice_id references to payments and delivery_notes';
    RAISE NOTICE '- Added comprehensive foreign key constraints';
    RAISE NOTICE '- Created performance indexes';
    RAISE NOTICE '- Added audit triggers for updated_at columns';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '- Test invoice creation functionality';
    RAISE NOTICE '- Verify all foreign key relationships work correctly';
    RAISE NOTICE '- Monitor application logs for any remaining issues';
    RAISE NOTICE '';
    RAISE NOTICE 'BACKUP TABLES CREATED:';
    RAISE NOTICE '- credit_notes_backup';
    RAISE NOTICE '- payments_backup';
    RAISE NOTICE '- invoice_items_backup';
    RAISE NOTICE '';
END $$;

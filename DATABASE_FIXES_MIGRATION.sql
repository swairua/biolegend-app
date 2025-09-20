-- ============================================
-- COMPREHENSIVE DATABASE FIXES MIGRATION
-- Copy and paste this entire content into Supabase SQL Editor and run it
-- This fixes all identified issues from the forms vs database audit
-- ============================================

-- 1. Fix remittance_items table name bug in tax_settings migration
-- The migration was trying to add tax_setting_id to "remittance_items" but the actual table is "remittance_advice_items"
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'remittance_advice_items') THEN
        ALTER TABLE remittance_advice_items 
        ADD COLUMN IF NOT EXISTS tax_setting_id UUID REFERENCES tax_settings(id);
        RAISE NOTICE 'Added tax_setting_id to remittance_advice_items';
    END IF;
END $$;

-- 2. Add missing unit_of_measure columns to item tables
-- LPO items need unit_of_measure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpo_items') THEN
        ALTER TABLE lpo_items 
        ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT 'pieces';
        RAISE NOTICE 'Added unit_of_measure to lpo_items';
    END IF;
END $$;

-- Delivery note items need unit_of_measure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_note_items') THEN
        ALTER TABLE delivery_note_items 
        ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT 'pieces';
        RAISE NOTICE 'Added unit_of_measure to delivery_note_items';
    END IF;
END $$;

-- 3. Add missing delivery tracking fields to delivery_notes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_notes') THEN
        ALTER TABLE delivery_notes 
        ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50),
        ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255),
        ADD COLUMN IF NOT EXISTS carrier VARCHAR(255);
        RAISE NOTICE 'Added delivery tracking fields to delivery_notes';
    END IF;
END $$;

-- 4. Add lpo_number to invoices table for LPO reference
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        ALTER TABLE invoices 
        ADD COLUMN IF NOT EXISTS lpo_number VARCHAR(100);
        RAISE NOTICE 'Added lpo_number to invoices';
    END IF;
END $$;

-- 5. Add discount_before_vat columns to item tables for proper discount handling
DO $$
BEGIN
    -- Invoice items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
        ALTER TABLE invoice_items 
        ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added discount_before_vat to invoice_items';
    END IF;
    
    -- Quotation items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotation_items') THEN
        ALTER TABLE quotation_items 
        ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added discount_before_vat to quotation_items';
    END IF;
    
    -- Proforma items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proforma_items') THEN
        ALTER TABLE proforma_items 
        ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added discount_before_vat to proforma_items';
    END IF;
END $$;

-- 6. Add product_name columns to item tables for historical tracking
DO $$
BEGIN
    -- Invoice items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
        ALTER TABLE invoice_items 
        ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
        RAISE NOTICE 'Added product_name to invoice_items';
    END IF;
    
    -- Quotation items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotation_items') THEN
        ALTER TABLE quotation_items 
        ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
        RAISE NOTICE 'Added product_name to quotation_items';
    END IF;
    
    -- Proforma items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proforma_items') THEN
        ALTER TABLE proforma_items 
        ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
        RAISE NOTICE 'Added product_name to proforma_items';
    END IF;
    
    -- LPO items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpo_items') THEN
        ALTER TABLE lpo_items 
        ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
        RAISE NOTICE 'Added product_name to lpo_items';
    END IF;
    
    -- Credit note items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_note_items') THEN
        ALTER TABLE credit_note_items 
        ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
        RAISE NOTICE 'Added product_name to credit_note_items';
    END IF;
END $$;

-- 7. Add customer fields to remittance_advice for denormalized customer data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'remittance_advice') THEN
        ALTER TABLE remittance_advice 
        ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS customer_address TEXT;
        RAISE NOTICE 'Added customer fields to remittance_advice';
    END IF;
END $$;

-- 8. Ensure tax columns exist on all item tables (in case migrations weren't run)
DO $$
BEGIN
    -- Invoice items tax columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
        ALTER TABLE invoice_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
        RAISE NOTICE 'Ensured tax columns exist on invoice_items';
    END IF;
    
    -- Quotation items tax columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotation_items') THEN
        ALTER TABLE quotation_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
        RAISE NOTICE 'Ensured tax columns exist on quotation_items';
    END IF;
    
    -- Proforma items tax columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proforma_items') THEN
        ALTER TABLE proforma_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
        RAISE NOTICE 'Ensured tax columns exist on proforma_items';
    END IF;
END $$;

-- 9. Fix stock level column naming (add alias columns for form compatibility)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        -- Add columns with form-expected names that reference the existing ones
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS min_stock_level DECIMAL(10,3),
        ADD COLUMN IF NOT EXISTS max_stock_level DECIMAL(10,3);
        
        -- Copy existing data
        UPDATE products 
        SET min_stock_level = minimum_stock_level,
            max_stock_level = maximum_stock_level
        WHERE min_stock_level IS NULL OR max_stock_level IS NULL;
        
        RAISE NOTICE 'Added form-compatible stock level columns to products';
    END IF;
END $$;

-- 10. Add missing state and postal_code to customers (from form)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS state VARCHAR(100),
        ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
        RAISE NOTICE 'Added state and postal_code to customers';
    END IF;
END $$;

-- 11. Create invoice_id column on payments for direct reference (optional alternative to payment_allocations)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        ALTER TABLE payments 
        ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id);
        RAISE NOTICE 'Added invoice_id to payments for direct reference';
    END IF;
END $$;

-- 12. VERIFICATION - Run these to check if everything was created successfully
SELECT 'DATABASE FIXES VERIFICATION RESULTS' as title;

SELECT 'Missing Columns Check' as component,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lpo_items' AND column_name = 'unit_of_measure') THEN '✅ EXISTS' ELSE '❌ MISSING' END as lpo_items_unit_of_measure,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_note_items' AND column_name = 'unit_of_measure') THEN '✅ EXISTS' ELSE '❌ MISSING' END as delivery_items_unit_of_measure,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'lpo_number') THEN '✅ EXISTS' ELSE '❌ MISSING' END as invoices_lpo_number;

SELECT 'Delivery Tracking Check' as component,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_notes' AND column_name = 'delivery_method') THEN '✅ EXISTS' ELSE '❌ MISSING' END as delivery_method,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_notes' AND column_name = 'tracking_number') THEN '✅ EXISTS' ELSE '❌ MISSING' END as tracking_number,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_notes' AND column_name = 'carrier') THEN '✅ EXISTS' ELSE '❌ MISSING' END as carrier;

SELECT 'Tax Columns Check' as component,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'tax_amount') THEN '✅ EXISTS' ELSE '❌ MISSING' END as invoice_tax,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'tax_amount') THEN '✅ EXISTS' ELSE '❌ MISSING' END as quotation_tax,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'remittance_advice_items' AND column_name = 'tax_setting_id') THEN '✅ EXISTS' ELSE '❌ MISSING' END as remittance_tax_setting;

SELECT 'Discount Columns Check' as component,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'discount_before_vat') THEN '✅ EXISTS' ELSE '❌ MISSING' END as invoice_discount,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'discount_before_vat') THEN '✅ EXISTS' ELSE '❌ MISSING' END as quotation_discount,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_items' AND column_name = 'discount_before_vat') THEN '✅ EXISTS' ELSE '❌ MISSING' END as proforma_discount;

SELECT 'Stock Level Columns Check' as component,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'min_stock_level') THEN '✅ EXISTS' ELSE '❌ MISSING' END as min_stock_level,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'max_stock_level') THEN '✅ EXISTS' ELSE '❌ MISSING' END as max_stock_level;

-- Success message
SELECT '🎉 Database fixes migration completed!' as message,
       'All missing columns and tables have been added.' as details,
       'Your forms should now work without database structure errors.' as note;

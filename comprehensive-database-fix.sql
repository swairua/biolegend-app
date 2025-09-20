-- COMPREHENSIVE DATABASE COLUMN FIX
-- This SQL adds all missing columns that the application expects
-- Run this in your Supabase SQL Editor to fix all "column does not exist" errors

-- ==================================================
-- 1. INVOICES TABLE - Add missing columns
-- ==================================================
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS lpo_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS affects_inventory BOOLEAN DEFAULT true;

-- ==================================================
-- 2. INVOICE_ITEMS TABLE - Add missing tax and other columns
-- ==================================================
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS tax_setting_id UUID REFERENCES tax_settings(id);

-- ==================================================
-- 3. QUOTATION_ITEMS TABLE - Add missing tax and other columns
-- ==================================================
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS tax_setting_id UUID REFERENCES tax_settings(id);

-- ==================================================
-- 4. PROFORMA_ITEMS TABLE - Add missing tax and other columns
-- ==================================================
ALTER TABLE proforma_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS tax_setting_id UUID REFERENCES tax_settings(id);

-- ==================================================
-- 5. PRODUCTS TABLE - Add alternative stock column names
-- ==================================================
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_stock_level INTEGER,
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);

-- Copy data from existing columns to new ones
UPDATE products 
SET min_stock_level = COALESCE(minimum_stock_level, 0),
    max_stock_level = maximum_stock_level,
    product_name = name
WHERE min_stock_level IS NULL OR max_stock_level IS NULL OR product_name IS NULL;

-- ==================================================
-- 6. TAX_SETTINGS TABLE - Create if not exists
-- ==================================================
CREATE TABLE IF NOT EXISTS tax_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rate DECIMAL(6,3) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add default tax setting for existing companies
INSERT INTO tax_settings (company_id, name, rate, is_default, is_active)
SELECT 
    id, 
    'VAT 16%', 
    16.000, 
    true, 
    true
FROM companies 
WHERE NOT EXISTS (
    SELECT 1 FROM tax_settings WHERE company_id = companies.id
);

-- ==================================================
-- 7. PAYMENTS TABLE - Add invoice_id if missing
-- ==================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        ALTER TABLE payments 
        ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id);
    END IF;
END $$;

-- ==================================================
-- 8. PROFILES TABLE - Create if not exists (for Supabase auth)
-- ==================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    phone VARCHAR(50),
    company_id UUID REFERENCES companies(id),
    department VARCHAR(100),
    position VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    invited_by UUID REFERENCES auth.users(id),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================================================
-- 9. CREDIT_NOTE_ITEMS TABLE - Add tax columns if table exists
-- ==================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_note_items') THEN
        ALTER TABLE credit_note_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
    END IF;
END $$;

-- ==================================================
-- 10. LPO_ITEMS TABLE - Add tax columns if table exists
-- ==================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpo_items') THEN
        ALTER TABLE lpo_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
    END IF;
END $$;

-- ==================================================
-- 11. UPDATE EXISTING RECORDS WITH DEFAULT VALUES
-- ==================================================

-- Update invoice_items
UPDATE invoice_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false),
    discount_before_vat = COALESCE(discount_before_vat, 0);

-- Update quotation_items
UPDATE quotation_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false),
    discount_before_vat = COALESCE(discount_before_vat, 0);

-- Update proforma_items
UPDATE proforma_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false),
    discount_before_vat = COALESCE(discount_before_vat, 0);

-- Update invoices
UPDATE invoices 
SET affects_inventory = COALESCE(affects_inventory, true);

-- ==================================================
-- 12. CREATE INDEXES FOR PERFORMANCE
-- ==================================================
CREATE INDEX IF NOT EXISTS idx_invoice_items_tax_setting ON invoice_items(tax_setting_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_tax_setting ON quotation_items(tax_setting_id);
CREATE INDEX IF NOT EXISTS idx_proforma_items_tax_setting ON proforma_items(tax_setting_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_settings_company ON tax_settings(company_id);

-- ==================================================
-- 13. VERIFICATION QUERIES
-- ==================================================

-- Check invoices table columns
SELECT 
    'invoices' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' 
    AND column_name IN ('lpo_number', 'affects_inventory')
ORDER BY column_name;

-- Check invoice_items table columns
SELECT 
    'invoice_items' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'invoice_items' 
    AND column_name IN ('tax_percentage', 'tax_amount', 'tax_inclusive', 'discount_before_vat', 'product_name')
ORDER BY column_name;

-- Check quotation_items table columns
SELECT 
    'quotation_items' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'quotation_items' 
    AND column_name IN ('tax_percentage', 'tax_amount', 'tax_inclusive', 'discount_before_vat', 'product_name')
ORDER BY column_name;

-- Check products table columns
SELECT 
    'products' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
    AND column_name IN ('min_stock_level', 'max_stock_level', 'product_name')
ORDER BY column_name;

-- Show final success message
SELECT 
    'SUCCESS: All missing columns have been added to the database!' as status,
    'Invoice creation should now work without column errors' as message;

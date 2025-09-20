-- ============================================
-- COMPLETE DATABASE MIGRATION FOR LPO SYSTEM
-- Execute this in Supabase SQL Editor
-- ============================================

-- 1. CREATE LPO TABLES AND FUNCTIONS
-- ===================================

-- Create LPO status enum
DO $$ BEGIN
    CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Main LPO table
CREATE TABLE IF NOT EXISTS lpos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    lpo_number VARCHAR(100) UNIQUE NOT NULL,
    lpo_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    status lpo_status DEFAULT 'draft',
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    terms_and_conditions TEXT,
    delivery_address TEXT,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LPO items table
CREATE TABLE IF NOT EXISTS lpo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lpo_id UUID REFERENCES lpos(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lpos_company_id ON lpos(company_id);
CREATE INDEX IF NOT EXISTS idx_lpos_supplier_id ON lpos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_number ON lpos(lpo_number);
CREATE INDEX IF NOT EXISTS idx_lpos_status ON lpos(status);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_date ON lpos(lpo_date);
CREATE INDEX IF NOT EXISTS idx_lpo_items_lpo_id ON lpo_items(lpo_id);
CREATE INDEX IF NOT EXISTS idx_lpo_items_product_id ON lpo_items(product_id);


-- 2. ADD TAX COLUMNS TO EXISTING TABLES
-- =====================================

-- Add tax columns to quotation_items
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Add tax columns to invoice_items
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Add tax columns to proforma_items (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proforma_items') THEN
        ALTER TABLE proforma_items
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
    END IF;
END $$;


-- 3. CREATE TAX SETTINGS TABLE
-- =============================

CREATE TABLE IF NOT EXISTS tax_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    rate DECIMAL(6,3) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for tax_settings
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;

-- Create indexes for tax_settings
CREATE INDEX IF NOT EXISTS idx_tax_settings_company_id ON tax_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_settings_active ON tax_settings(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tax_settings_default ON tax_settings(company_id, is_default);

-- Ensure only one default tax per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_settings_unique_default
    ON tax_settings(company_id)
    WHERE is_default = TRUE;


-- 4. CREATE HELPER FUNCTIONS
-- ===========================

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RPC function to generate LPO number
CREATE OR REPLACE FUNCTION generate_lpo_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    company_code TEXT;
    lpo_count INTEGER;
    lpo_number TEXT;
BEGIN
    SELECT COALESCE(UPPER(LEFT(name, 3)), 'LPO') INTO company_code
    FROM companies 
    WHERE id = company_uuid;
    
    SELECT COUNT(*) INTO lpo_count
    FROM lpos
    WHERE company_id = company_uuid;
    
    lpo_number := company_code || '-LPO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((lpo_count + 1)::TEXT, 4, '0');
    
    RETURN lpo_number;
END;
$$ LANGUAGE plpgsql;


-- 5. ADD TRIGGERS
-- ===============

-- Add trigger to lpos table
DROP TRIGGER IF EXISTS update_lpos_updated_at ON lpos;
CREATE TRIGGER update_lpos_updated_at
    BEFORE UPDATE ON lpos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to tax_settings table
DROP TRIGGER IF EXISTS update_tax_settings_updated_at ON tax_settings;
CREATE TRIGGER update_tax_settings_updated_at
    BEFORE UPDATE ON tax_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 6. UPDATE EXISTING RECORDS
-- ===========================

-- Update existing quotation_items records
UPDATE quotation_items 
SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

-- Update existing invoice_items records
UPDATE invoice_items 
SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

-- Update existing proforma_items records (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proforma_items') THEN
        UPDATE proforma_items 
        SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
        WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;
    END IF;
END $$;


-- 7. INSERT DEFAULT TAX SETTINGS
-- ===============================

-- Insert default tax settings for existing companies
INSERT INTO tax_settings (company_id, name, rate, is_active, is_default)
SELECT 
    c.id as company_id,
    'VAT (16%)' as name,
    16.000 as rate,
    true as is_active,
    true as is_default
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM tax_settings ts 
    WHERE ts.company_id = c.id AND ts.is_default = true
);

-- Insert additional standard tax rates
INSERT INTO tax_settings (company_id, name, rate, is_active, is_default)
SELECT 
    c.id as company_id,
    'Zero Rated (0%)' as name,
    0.000 as rate,
    true as is_active,
    false as is_default
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM tax_settings ts 
    WHERE ts.company_id = c.id AND ts.name = 'Zero Rated (0%)'
);

INSERT INTO tax_settings (company_id, name, rate, is_active, is_default)
SELECT 
    c.id as company_id,
    'Exempt (0%)' as name,
    0.000 as rate,
    true as is_active,
    false as is_default
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM tax_settings ts 
    WHERE ts.company_id = c.id AND ts.name = 'Exempt (0%)'
);


-- 8. VERIFICATION QUERIES
-- ========================

-- Verify LPO tables exist
SELECT 'LPO Tables Created' as status, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpos') THEN 'YES' ELSE 'NO' END as lpos_table,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpo_items') THEN 'YES' ELSE 'NO' END as lpo_items_table;

-- Verify tax columns exist
SELECT 'Tax Columns Added' as status,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'tax_amount') THEN 'YES' ELSE 'NO' END as quotation_tax,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'tax_amount') THEN 'YES' ELSE 'NO' END as invoice_tax;

-- Verify RPC function exists
SELECT 'RPC Functions' as status,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'generate_lpo_number') THEN 'YES' ELSE 'NO' END as generate_lpo_number;

-- Show companies and their tax settings
SELECT c.name as company, COUNT(ts.id) as tax_settings_count
FROM companies c
LEFT JOIN tax_settings ts ON c.id = ts.company_id
GROUP BY c.id, c.name
ORDER BY c.name;

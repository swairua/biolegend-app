-- ========================================
-- FORCE MIGRATION: LPO SYSTEM COMPLETE
-- Execute this ENTIRE script in Supabase SQL Editor
-- ========================================

-- Step 1: Create LPO status enum
DO $$ BEGIN
    CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create main LPO table
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

-- Step 3: Create LPO items table
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

-- Step 4: Add tax columns to quotation_items
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Step 5: Add tax columns to invoice_items
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Step 6: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_lpos_company_id ON lpos(company_id);
CREATE INDEX IF NOT EXISTS idx_lpos_supplier_id ON lpos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_number ON lpos(lpo_number);
CREATE INDEX IF NOT EXISTS idx_lpos_status ON lpos(status);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_date ON lpos(lpo_date);
CREATE INDEX IF NOT EXISTS idx_lpo_items_lpo_id ON lpo_items(lpo_id);
CREATE INDEX IF NOT EXISTS idx_lpo_items_product_id ON lpo_items(product_id);

-- Step 7: Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create LPO number generator function
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

-- Step 9: Create triggers
DROP TRIGGER IF EXISTS update_lpos_updated_at ON lpos;
CREATE TRIGGER update_lpos_updated_at
    BEFORE UPDATE ON lpos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Update existing records with default tax values
UPDATE quotation_items 
SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

UPDATE invoice_items 
SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

-- ========================================
-- VERIFICATION: Check migration success
-- ========================================

SELECT '🎉 FORCE MIGRATION VERIFICATION' as title;

SELECT 
    'LPO TABLES' as component,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpos') 
         THEN '✅ lpos table created' 
         ELSE '❌ lpos table missing' END as main_table,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpo_items') 
         THEN '✅ lpo_items table created' 
         ELSE '❌ lpo_items table missing' END as items_table;

SELECT 
    'TAX COLUMNS' as component,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'tax_amount') 
         THEN '✅ quotation tax columns added' 
         ELSE '❌ quotation tax columns missing' END as quotation_columns,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'tax_amount') 
         THEN '✅ invoice tax columns added' 
         ELSE '❌ invoice tax columns missing' END as invoice_columns;

SELECT 
    'FUNCTIONS' as component,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'generate_lpo_number') 
         THEN '✅ LPO number generator created' 
         ELSE '❌ LPO number generator missing' END as lpo_generator,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'update_updated_at_column') 
         THEN '✅ Update trigger created' 
         ELSE '❌ Update trigger missing' END as update_trigger;

-- Test LPO number generation (if company exists)
DO $$
DECLARE
    test_company_id UUID;
    sample_lpo_number TEXT;
BEGIN
    SELECT id INTO test_company_id FROM companies LIMIT 1;
    
    IF test_company_id IS NOT NULL THEN
        SELECT generate_lpo_number(test_company_id) INTO sample_lpo_number;
        RAISE NOTICE '✅ Sample LPO Number: %', sample_lpo_number;
    ELSE
        RAISE NOTICE '⚠️ No companies found - LPO number generation not tested';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ LPO number generation test failed: %', SQLERRM;
END $$;

SELECT '🚀 FORCE MIGRATION COMPLETE!' as status, 
       'Return to your application and refresh the LPOs page' as next_step;

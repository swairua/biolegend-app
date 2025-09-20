-- ============================================
-- PART 2: ADD MISSING COLUMNS
-- ============================================
-- Execute this after Part 1 to add missing columns

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

-- Add missing tax columns to proforma_items (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proforma_items') THEN
        ALTER TABLE proforma_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE '✅ Added tax columns to proforma_items';
    END IF;
END $$;

-- Add invoice_id reference to payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS invoice_id UUID;

-- Add lpo_number to invoices for LPO reference
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS lpo_number VARCHAR(100);

-- Add delivery tracking fields to delivery_notes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_notes') THEN
        ALTER TABLE delivery_notes 
        ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50),
        ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255),
        ADD COLUMN IF NOT EXISTS carrier VARCHAR(255),
        ADD COLUMN IF NOT EXISTS invoice_id UUID;
        RAISE NOTICE '✅ Added delivery tracking fields to delivery_notes';
    END IF;
END $$;

-- Add state and postal_code to customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

-- Add created_by column to invoices for audit trail
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Update existing records with default values
UPDATE invoice_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false),
    discount_before_vat = COALESCE(discount_before_vat, 0)
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL OR discount_before_vat IS NULL;

UPDATE quotation_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false),
    discount_before_vat = COALESCE(discount_before_vat, 0)
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL OR discount_before_vat IS NULL;

-- Verify columns were added
SELECT 
    'MISSING COLUMNS VERIFICATION' as check_type,
    table_name, 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('invoice_items', 'quotation_items', 'proforma_items', 'payments', 'delivery_notes', 'invoices', 'customers') 
  AND column_name IN ('tax_amount', 'tax_percentage', 'tax_inclusive', 'discount_before_vat', 'invoice_id', 'lpo_number', 'delivery_method', 'state', 'postal_code', 'created_by')
ORDER BY table_name, column_name;

SELECT '✅ PART 2 COMPLETED - Missing columns added and updated' as status;

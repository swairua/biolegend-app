-- URGENT: Run this SQL in your Supabase Dashboard → SQL Editor NOW
-- This will permanently fix the missing tax_amount column issue

-- First, check current schema
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('quotation_items', 'invoice_items') 
ORDER BY table_name, ordinal_position;

-- Add missing columns to quotation_items (will skip if already exist)
DO $$ 
BEGIN
    -- Check and add tax_amount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='quotation_items' AND column_name='tax_amount'
    ) THEN
        ALTER TABLE quotation_items ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0 NOT NULL;
        RAISE NOTICE 'Added tax_amount column to quotation_items';
    ELSE
        RAISE NOTICE 'tax_amount column already exists in quotation_items';
    END IF;

    -- Check and add tax_percentage  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='quotation_items' AND column_name='tax_percentage'
    ) THEN
        ALTER TABLE quotation_items ADD COLUMN tax_percentage DECIMAL(6,3) DEFAULT 0 NOT NULL;
        RAISE NOTICE 'Added tax_percentage column to quotation_items';
    ELSE
        RAISE NOTICE 'tax_percentage column already exists in quotation_items';
    END IF;

    -- Check and add tax_inclusive
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='quotation_items' AND column_name='tax_inclusive'
    ) THEN
        ALTER TABLE quotation_items ADD COLUMN tax_inclusive BOOLEAN DEFAULT false NOT NULL;
        RAISE NOTICE 'Added tax_inclusive column to quotation_items';
    ELSE
        RAISE NOTICE 'tax_inclusive column already exists in quotation_items';
    END IF;
END $$;

-- Add missing columns to invoice_items (will skip if already exist)
DO $$ 
BEGIN
    -- Check and add tax_amount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='invoice_items' AND column_name='tax_amount'
    ) THEN
        ALTER TABLE invoice_items ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0 NOT NULL;
        RAISE NOTICE 'Added tax_amount column to invoice_items';
    ELSE
        RAISE NOTICE 'tax_amount column already exists in invoice_items';
    END IF;

    -- Check and add tax_percentage  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='invoice_items' AND column_name='tax_percentage'
    ) THEN
        ALTER TABLE invoice_items ADD COLUMN tax_percentage DECIMAL(6,3) DEFAULT 0 NOT NULL;
        RAISE NOTICE 'Added tax_percentage column to invoice_items';
    ELSE
        RAISE NOTICE 'tax_percentage column already exists in invoice_items';
    END IF;

    -- Check and add tax_inclusive
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='invoice_items' AND column_name='tax_inclusive'
    ) THEN
        ALTER TABLE invoice_items ADD COLUMN tax_inclusive BOOLEAN DEFAULT false NOT NULL;
        RAISE NOTICE 'Added tax_inclusive column to invoice_items';
    ELSE
        RAISE NOTICE 'tax_inclusive column already exists in invoice_items';
    END IF;
END $$;

-- Update any existing records to have proper default values
UPDATE quotation_items 
SET 
    tax_amount = COALESCE(tax_amount, 0),
    tax_percentage = COALESCE(tax_percentage, 0),
    tax_inclusive = COALESCE(tax_inclusive, false)
WHERE tax_amount IS NULL OR tax_percentage IS NULL OR tax_inclusive IS NULL;

UPDATE invoice_items 
SET 
    tax_amount = COALESCE(tax_amount, 0),
    tax_percentage = COALESCE(tax_percentage, 0),
    tax_inclusive = COALESCE(tax_inclusive, false)
WHERE tax_amount IS NULL OR tax_percentage IS NULL OR tax_inclusive IS NULL;

-- Verify the columns were added successfully
SELECT 
    'SUCCESS: All tax columns added' as status,
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('quotation_items', 'invoice_items') 
    AND column_name IN ('tax_amount', 'tax_percentage', 'tax_inclusive')
ORDER BY table_name, column_name;

-- Show sample data to confirm structure
SELECT 'quotation_items sample:' as info;
SELECT * FROM quotation_items LIMIT 3;

SELECT 'invoice_items sample:' as info;
SELECT * FROM invoice_items LIMIT 3;

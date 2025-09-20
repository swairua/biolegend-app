-- IMMEDIATE FIX: Copy and paste this SQL into your Supabase Dashboard → SQL Editor
-- This will add the missing tax_amount columns right now

-- Add tax columns to quotation_items
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Add tax columns to invoice_items
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Update existing records to have default values
UPDATE quotation_items 
SET tax_amount = 0, tax_percentage = 0, tax_inclusive = false 
WHERE tax_amount IS NULL OR tax_percentage IS NULL OR tax_inclusive IS NULL;

UPDATE invoice_items 
SET tax_amount = 0, tax_percentage = 0, tax_inclusive = false 
WHERE tax_amount IS NULL OR tax_percentage IS NULL OR tax_inclusive IS NULL;

-- Verify the columns exist
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('quotation_items', 'invoice_items') 
AND column_name IN ('tax_amount', 'tax_percentage', 'tax_inclusive')
ORDER BY table_name, column_name;

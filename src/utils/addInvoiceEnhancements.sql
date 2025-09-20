-- Add LPO number reference column to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS lpo_number VARCHAR(255);

-- Add discount before VAT column to invoice_items table (if not already exists)
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0;

-- Ensure tax columns exist in invoice_items (in case they were missed)
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Update existing records with proper default values for new columns
UPDATE invoices 
SET lpo_number = NULL
WHERE lpo_number IS NULL;

UPDATE invoice_items 
SET discount_before_vat = COALESCE(discount_before_vat, 0),
    tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false)
WHERE discount_before_vat IS NULL 
   OR tax_percentage IS NULL 
   OR tax_amount IS NULL 
   OR tax_inclusive IS NULL;

-- Verification - Check that columns were added successfully
SELECT 'Invoice enhancements verification' as status,
       table_name, 
       column_name, 
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_name IN ('invoices', 'invoice_items') 
  AND column_name IN ('lpo_number', 'discount_before_vat', 'tax_percentage', 'tax_amount', 'tax_inclusive')
ORDER BY table_name, column_name;

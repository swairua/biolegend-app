-- ============================================
-- EMERGENCY DATABASE FIX - EXECUTE IMMEDIATELY
-- ============================================
-- This fixes the critical "tax_amount column not found" errors
-- Copy and paste this entire content into Supabase SQL Editor and run it

-- Step 1: Add missing tax columns to quotation_items
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Step 2: Add missing tax columns to invoice_items  
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Step 3: Update existing records with proper default values
UPDATE quotation_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false)
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

UPDATE invoice_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false)
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

-- Step 4: Verification - Check that columns were added successfully
SELECT 'SUCCESS: Tax columns verification' as status,
       table_name, 
       column_name, 
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_name IN ('quotation_items', 'invoice_items') 
  AND column_name IN ('tax_amount', 'tax_percentage', 'tax_inclusive')
ORDER BY table_name, column_name;

-- Step 5: Test query - This should now work without errors
SELECT 'TEST: Quotation items query' as test_type;
SELECT id, description, quantity, unit_price, tax_amount, tax_percentage, tax_inclusive, line_total
FROM quotation_items 
LIMIT 3;

-- Step 6: Success message
SELECT '✅ EMERGENCY FIX COMPLETE!' as result,
       'The tax column errors should now be resolved.' as message,
       'You can now create quotations and invoices normally.' as next_step;

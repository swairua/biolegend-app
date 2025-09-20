-- Verify quotation_items table structure
-- Run this in your Supabase SQL editor to check the table structure

-- Check if quotation_items table exists and show its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quotation_items' 
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'quotation_items'
    AND tc.constraint_type = 'FOREIGN KEY';

-- Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'quotation_items';

-- Add missing tax columns if they don't exist
DO $$
BEGIN
    -- Add tax_percentage column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotation_items' AND column_name = 'tax_percentage'
    ) THEN
        ALTER TABLE quotation_items ADD COLUMN tax_percentage DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE 'Added tax_percentage column to quotation_items';
    END IF;

    -- Add tax_amount column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotation_items' AND column_name = 'tax_amount'
    ) THEN
        ALTER TABLE quotation_items ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added tax_amount column to quotation_items';
    END IF;

    -- Add tax_inclusive column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotation_items' AND column_name = 'tax_inclusive'
    ) THEN
        ALTER TABLE quotation_items ADD COLUMN tax_inclusive BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added tax_inclusive column to quotation_items';
    END IF;

    -- Ensure foreign key constraints exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'quotation_items' 
        AND constraint_name = 'fk_quotation_items_quotation_id'
    ) THEN
        ALTER TABLE quotation_items 
        ADD CONSTRAINT fk_quotation_items_quotation_id 
        FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint fk_quotation_items_quotation_id';
    END IF;

    RAISE NOTICE 'Schema verification and fixes completed for quotation_items table';
END $$;

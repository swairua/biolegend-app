-- ============================================
-- PART 1: BACKUP AND DATA CLEANUP
-- ============================================
-- Execute this first to backup data and clean orphaned records

-- Step 1: Create backup tables
DO $$
BEGIN
    -- Backup critical tables before making changes
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_notes_backup') THEN
        CREATE TABLE credit_notes_backup AS SELECT * FROM credit_notes;
        RAISE NOTICE '✅ Created credit_notes backup';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments_backup') THEN
        CREATE TABLE payments_backup AS SELECT * FROM payments;
        RAISE NOTICE '✅ Created payments backup';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items_backup') THEN
        CREATE TABLE invoice_items_backup AS SELECT * FROM invoice_items;
        RAISE NOTICE '✅ Created invoice_items backup';
    END IF;
END $$;

-- Step 2: Check for orphaned records before cleanup
SELECT 'ORPHANED RECORDS ANALYSIS' as check_type;

SELECT 
    'credit_notes with invalid invoice_id' as description,
    COUNT(*) as count
FROM credit_notes 
WHERE invoice_id IS NOT NULL AND invoice_id NOT IN (SELECT id FROM invoices)

UNION ALL

SELECT 
    'credit_note_allocations with invalid invoice_id' as description,
    COUNT(*) as count
FROM credit_note_allocations 
WHERE invoice_id IS NOT NULL AND invoice_id NOT IN (SELECT id FROM invoices)

UNION ALL

SELECT 
    'credit_note_items with invalid product_id' as description,
    COUNT(*) as count
FROM credit_note_items 
WHERE product_id IS NOT NULL AND product_id NOT IN (SELECT id FROM products)

UNION ALL

SELECT 
    'payments with invalid customer_id' as description,
    COUNT(*) as count
FROM payments 
WHERE customer_id NOT IN (SELECT id FROM customers);

-- Step 3: Clean up orphaned records (only if counts above show orphans)
-- Uncomment the following lines ONLY if you see orphaned records above:

/*
-- Clean up orphaned credit notes
DELETE FROM credit_notes 
WHERE invoice_id IS NOT NULL 
  AND invoice_id NOT IN (SELECT id FROM invoices);

-- Clean up orphaned credit note allocations
DELETE FROM credit_note_allocations 
WHERE invoice_id IS NOT NULL 
  AND invoice_id NOT IN (SELECT id FROM invoices);

-- Clean up orphaned credit note items
DELETE FROM credit_note_items 
WHERE product_id IS NOT NULL 
  AND product_id NOT IN (SELECT id FROM products);

-- Clean up orphaned payments
DELETE FROM payments 
WHERE customer_id NOT IN (SELECT id FROM customers);
*/

SELECT '✅ PART 1 COMPLETED - Backups created and orphaned records analyzed' as status;

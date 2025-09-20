-- =====================================================
-- COMPLETE DATABASE BACKUP FOR BIOLEGEND SYSTEM
-- Generated: 2024-08-26
-- Project: klifzjcfnlaxminytmyh.supabase.co
-- =====================================================

-- NOTE: This is a template backup script. 
-- To generate the actual backup, run this command with proper credentials:
-- pg_dump "postgresql://postgres:[PASSWORD]@db.klifzjcfnlaxminytmyh.supabase.co:5432/postgres" \
--   --schema-only --no-owner --no-privileges \
--   --include-table="*" \
--   --include-function="*" \
--   --include-trigger="*" \
--   --include-procedure="*" \
--   --include-view="*" \
--   --include-sequence="*" \
--   --include-type="*" \
--   --include-domain="*" \
--   --include-aggregate="*" \
--   --include-operator="*" \
--   --include-operator-class="*" \
--   --include-operator-family="*" \
--   --include-collation="*" \
--   --include-conversion="*" \
--   --include-text-search="*" \
--   --include-extension="*" > schema_backup.sql

-- For data backup:
-- pg_dump "postgresql://postgres:[PASSWORD]@db.klifzjcfnlaxminytmyh.supabase.co:5432/postgres" \
--   --data-only --no-owner --no-privileges \
--   --disable-triggers > data_backup.sql

-- For complete backup (schema + data):
-- pg_dump "postgresql://postgres:[PASSWORD]@db.klifzjcfnlaxminytmyh.supabase.co:5432/postgres" \
--   --no-owner --no-privileges \
--   --disable-triggers > complete_backup.sql

-- Alternative: Use Supabase CLI for backup
-- supabase db dump --project-ref klifzjcfnlaxminytmyh --schema public > supabase_backup.sql

-- =====================================================
-- KNOWN TABLES FROM CODEBASE ANALYSIS
-- =====================================================

-- Based on the codebase analysis, the following tables exist:
-- - companies
-- - profiles
-- - customers
-- - inventory_items
-- - quotations
-- - quotation_items
-- - invoices
-- - invoice_items
-- - proforma_invoices
-- - proforma_invoice_items
-- - credit_notes
-- - credit_note_items
-- - delivery_notes
-- - delivery_note_items
-- - lpos (Local Purchase Orders)
-- - lpo_items
-- - remittance_advice
-- - remittance_advice_items
-- - payments
-- - payment_allocations
-- - stock_movements
-- - tax_settings
-- - product_categories
-- - users

-- =====================================================
-- BACKUP VERIFICATION QUERIES
-- =====================================================

-- Verify table counts before backup
SELECT 
    schemaname,
    tablename,
    (SELECT COUNT(*) FROM pg_class WHERE relname = tablename) as row_count
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify functions and triggers
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- POST-BACKUP RESTORATION NOTES
-- =====================================================

-- To restore from backup:
-- 1. Create new database or reset existing one
-- 2. Run: psql "postgresql://[CONNECTION_STRING]" < complete_backup.sql
-- 3. Verify data integrity with the verification queries above
-- 4. Test critical application functions
-- 5. Update any environment variables to point to new database

-- =====================================================
-- SECURITY RECOMMENDATIONS
-- =====================================================

-- After backup:
-- 1. Store backup files securely (encrypted, access-controlled)
-- 2. Rotate Supabase keys used in this backup process
-- 3. Remove hardcoded credentials from codebase
-- 4. Implement proper environment variable management
-- 5. Set up automated backup schedules

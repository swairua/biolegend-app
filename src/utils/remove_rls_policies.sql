-- ============================================================================
-- REMOVE ROW LEVEL SECURITY (RLS) POLICIES FROM ALL TABLES
-- This migration disables RLS and removes all restrictive policies
-- ============================================================================

-- Step 1: Disable RLS on all main tables
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE remittance_advice DISABLE ROW LEVEL SECURITY;
ALTER TABLE remittance_advice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_items DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies on product_categories
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Users can manage categories they created" ON product_categories;
DROP POLICY IF EXISTS "Users can view active categories in their company" ON product_categories;
DROP POLICY IF EXISTS "Users can insert categories in their company" ON product_categories;
DROP POLICY IF EXISTS "Users can update categories in their company" ON product_categories;

-- Step 3: Drop all existing policies on companies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;

-- Step 4: Drop all existing policies on profiles/users
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Admins can insert new profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles in their company" ON profiles;

-- Step 5: Drop all existing policies on customers
DROP POLICY IF EXISTS "Users can view customers in their company" ON customers;
DROP POLICY IF EXISTS "Users can insert customers in their company" ON customers;
DROP POLICY IF EXISTS "Users can update customers in their company" ON customers;

-- Step 6: Drop all existing policies on products
DROP POLICY IF EXISTS "Users can view products in their company" ON products;
DROP POLICY IF EXISTS "Users can insert products in their company" ON products;
DROP POLICY IF EXISTS "Users can update products in their company" ON products;

-- Step 7: Drop all existing policies on quotations
DROP POLICY IF EXISTS "Users can view quotations in their company" ON quotations;
DROP POLICY IF EXISTS "Users can insert quotations in their company" ON quotations;
DROP POLICY IF EXISTS "Users can update quotations in their company" ON quotations;

-- Step 8: Drop all existing policies on invoices
DROP POLICY IF EXISTS "Users can view invoices in their company" ON invoices;
DROP POLICY IF EXISTS "Users can insert invoices in their company" ON invoices;
DROP POLICY IF EXISTS "Users can update invoices in their company" ON invoices;

-- Step 9: Drop all existing policies on other tables
DROP POLICY IF EXISTS "Users can view items in their company" ON quotation_items;
DROP POLICY IF EXISTS "Users can insert items in their company" ON quotation_items;
DROP POLICY IF EXISTS "Users can update items in their company" ON quotation_items;

DROP POLICY IF EXISTS "Users can view items in their company" ON invoice_items;
DROP POLICY IF EXISTS "Users can insert items in their company" ON invoice_items;
DROP POLICY IF EXISTS "Users can update items in their company" ON invoice_items;

DROP POLICY IF EXISTS "Users can view proforma in their company" ON proforma_invoices;
DROP POLICY IF EXISTS "Users can insert proforma in their company" ON proforma_invoices;
DROP POLICY IF EXISTS "Users can update proforma in their company" ON proforma_invoices;

DROP POLICY IF EXISTS "Users can view items in their company" ON proforma_items;
DROP POLICY IF EXISTS "Users can insert items in their company" ON proforma_items;
DROP POLICY IF EXISTS "Users can update items in their company" ON proforma_items;

DROP POLICY IF EXISTS "Users can view delivery notes in their company" ON delivery_notes;
DROP POLICY IF EXISTS "Users can insert delivery notes in their company" ON delivery_notes;
DROP POLICY IF EXISTS "Users can update delivery notes in their company" ON delivery_notes;

DROP POLICY IF EXISTS "Users can view items in their company" ON delivery_note_items;
DROP POLICY IF EXISTS "Users can insert items in their company" ON delivery_note_items;
DROP POLICY IF EXISTS "Users can update items in their company" ON delivery_note_items;

DROP POLICY IF EXISTS "Users can view payments in their company" ON payments;
DROP POLICY IF EXISTS "Users can insert payments in their company" ON payments;
DROP POLICY IF EXISTS "Users can update payments in their company" ON payments;

DROP POLICY IF EXISTS "Users can view allocations in their company" ON payment_allocations;
DROP POLICY IF EXISTS "Users can insert allocations in their company" ON payment_allocations;
DROP POLICY IF EXISTS "Users can update allocations in their company" ON payment_allocations;

DROP POLICY IF EXISTS "Users can view remittance in their company" ON remittance_advice;
DROP POLICY IF EXISTS "Users can insert remittance in their company" ON remittance_advice;
DROP POLICY IF EXISTS "Users can update remittance in their company" ON remittance_advice;

DROP POLICY IF EXISTS "Users can view items in their company" ON remittance_advice_items;
DROP POLICY IF EXISTS "Users can insert items in their company" ON remittance_advice_items;
DROP POLICY IF EXISTS "Users can update items in their company" ON remittance_advice_items;

DROP POLICY IF EXISTS "Users can view stock movements in their company" ON stock_movements;
DROP POLICY IF EXISTS "Users can insert stock movements in their company" ON stock_movements;
DROP POLICY IF EXISTS "Users can update stock movements in their company" ON stock_movements;

-- Step 10: Drop policies on user management tables
DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions in their company" ON user_permissions;

DROP POLICY IF EXISTS "Admins can manage invitations for their company" ON user_invitations;

-- Step 11: Drop policies on credit notes (if they exist)
DROP POLICY IF EXISTS "Users can view credit notes in their company" ON credit_notes;
DROP POLICY IF EXISTS "Users can insert credit notes in their company" ON credit_notes;
DROP POLICY IF EXISTS "Users can update credit notes in their company" ON credit_notes;

DROP POLICY IF EXISTS "Users can view items in their company" ON credit_note_items;
DROP POLICY IF EXISTS "Users can insert items in their company" ON credit_note_items;
DROP POLICY IF EXISTS "Users can update items in their company" ON credit_note_items;

-- Step 12: Create a function to check if RLS is disabled on all tables
CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE(table_name text, rls_enabled boolean) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        rowsecurity as rls_enabled
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
        'companies', 'users', 'profiles', 'customers', 'suppliers', 
        'product_categories', 'products', 'quotations', 'quotation_items',
        'invoices', 'invoice_items', 'proforma_invoices', 'proforma_items',
        'delivery_notes', 'delivery_note_items', 'payments', 'payment_allocations',
        'remittance_advice', 'remittance_advice_items', 'stock_movements',
        'user_permissions', 'user_invitations', 'credit_notes', 'credit_note_items'
    )
    ORDER BY tablename;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Run the check function to verify RLS is disabled
SELECT * FROM check_rls_status();

-- Step 14: Display success message
SELECT 'SUCCESS: All RLS policies removed from all tables. Full access enabled.' as status;

-- Optional: If you want to completely remove the check function after verification
-- DROP FUNCTION IF EXISTS check_rls_status();

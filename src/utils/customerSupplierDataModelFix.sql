-- ============================================================================
-- Customer vs Supplier Data Model Fix
-- ============================================================================
-- This script addresses the critical data integrity issue where suppliers
-- are stored in the customers table, creating business logic conflicts.
-- 
-- PROBLEM: LPOs reference customers table for suppliers, causing:
-- - Customers to appear as supplier options
-- - Same entity used as both customer and supplier
-- - Business relationship confusion
-- - Data integrity issues
--
-- SOLUTION: Create dedicated suppliers table and migrate data properly
-- ============================================================================

-- Step 1: Create dedicated suppliers table
-- ============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Supplier identification
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    -- Contact information
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Business details
    business_registration_number VARCHAR(100),
    tax_identification_number VARCHAR(100),
    
    -- Supplier-specific fields
    supplier_type VARCHAR(50) DEFAULT 'vendor', -- vendor, manufacturer, distributor, etc.
    credit_limit DECIMAL(15,2),
    payment_terms_days INTEGER DEFAULT 30,
    preferred_payment_method VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'KES',
    
    -- Banking information
    bank_name VARCHAR(255),
    bank_account_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_branch VARCHAR(255),
    swift_code VARCHAR(50),
    
    -- Operational
    lead_time_days INTEGER,
    minimum_order_amount DECIMAL(15,2),
    delivery_terms VARCHAR(100),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT true,
    is_preferred BOOLEAN DEFAULT false,
    notes TEXT,
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at);

-- Step 3: Create supplier categories table (optional enhancement)
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add category reference to suppliers
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES supplier_categories(id);

-- Step 4: Data migration function
-- ============================================================================
-- Function to migrate existing customer-suppliers to suppliers table
CREATE OR REPLACE FUNCTION migrate_customer_suppliers_to_suppliers()
RETURNS TABLE (
    migrated_count INTEGER,
    error_count INTEGER,
    details TEXT
) AS $$
DECLARE
    customer_record RECORD;
    supplier_code VARCHAR(50);
    migration_count INTEGER := 0;
    error_count INTEGER := 0;
    error_details TEXT := '';
BEGIN
    -- Identify customers that are used as suppliers in LPOs
    FOR customer_record IN
        SELECT DISTINCT 
            c.id,
            c.company_id,
            c.customer_code,
            c.name,
            c.email,
            c.phone,
            c.address,
            c.city,
            c.country,
            c.created_at,
            COUNT(l.id) as lpo_count
        FROM customers c
        INNER JOIN lpos l ON c.id = l.supplier_id
        WHERE c.is_active = true
        GROUP BY c.id, c.company_id, c.customer_code, c.name, c.email, c.phone, c.address, c.city, c.country, c.created_at
        ORDER BY COUNT(l.id) DESC
    LOOP
        BEGIN
            -- Generate unique supplier code
            supplier_code := 'SUP-' || UPPER(LEFT(customer_record.name, 3)) || '-' || EXTRACT(YEAR FROM NOW()) || LPAD((migration_count + 1)::TEXT, 4, '0');
            
            -- Ensure code is unique
            WHILE EXISTS (SELECT 1 FROM suppliers WHERE supplier_code = supplier_code) LOOP
                supplier_code := 'SUP-' || UPPER(LEFT(customer_record.name, 3)) || '-' || EXTRACT(YEAR FROM NOW()) || LPAD((migration_count + error_count + 1)::TEXT, 4, '0');
            END LOOP;
            
            -- Insert into suppliers table
            INSERT INTO suppliers (
                company_id,
                supplier_code,
                name,
                email,
                phone,
                address,
                city,
                country,
                payment_terms_days,
                is_active,
                notes,
                created_at
            ) VALUES (
                customer_record.company_id,
                supplier_code,
                customer_record.name,
                customer_record.email,
                customer_record.phone,
                customer_record.address,
                customer_record.city,
                customer_record.country,
                30, -- Default payment terms
                true,
                'Migrated from customers table. Originally had ' || customer_record.lpo_count || ' LPOs. Review and update supplier-specific information.',
                customer_record.created_at
            );
            
            migration_count := migration_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            error_details := error_details || 'Error migrating customer ' || customer_record.name || ': ' || SQLERRM || '; ';
        END;
    END LOOP;
    
    RETURN QUERY SELECT migration_count, error_count, error_details;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Update LPOs table to reference suppliers
-- ============================================================================
-- First, add new supplier_id_new column
ALTER TABLE lpos 
ADD COLUMN IF NOT EXISTS supplier_id_new UUID REFERENCES suppliers(id);

-- Function to update LPO supplier references
CREATE OR REPLACE FUNCTION update_lpo_supplier_references()
RETURNS TABLE (
    updated_count INTEGER,
    unmapped_count INTEGER,
    details TEXT
) AS $$
DECLARE
    lpo_record RECORD;
    supplier_id_found UUID;
    updated_count INTEGER := 0;
    unmapped_count INTEGER := 0;
    unmapped_details TEXT := '';
BEGIN
    -- Update LPOs to reference new suppliers table
    FOR lpo_record IN
        SELECT l.id, l.supplier_id, c.name as customer_name
        FROM lpos l
        LEFT JOIN customers c ON l.supplier_id = c.id
    LOOP
        -- Find corresponding supplier
        SELECT s.id INTO supplier_id_found
        FROM suppliers s
        INNER JOIN customers c ON s.name = c.name AND s.company_id = c.company_id
        WHERE c.id = lpo_record.supplier_id
        LIMIT 1;
        
        IF supplier_id_found IS NOT NULL THEN
            UPDATE lpos 
            SET supplier_id_new = supplier_id_found
            WHERE id = lpo_record.id;
            updated_count := updated_count + 1;
        ELSE
            unmapped_count := unmapped_count + 1;
            unmapped_details := unmapped_details || 'LPO ' || lpo_record.id || ' (supplier: ' || lpo_record.customer_name || '); ';
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT updated_count, unmapped_count, unmapped_details;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Complete migration steps (run these manually after review)
-- ============================================================================
/*
-- MANUAL EXECUTION STEPS (run these one by one after reviewing the data):

-- 1. Run the migration to create supplier records
SELECT * FROM migrate_customer_suppliers_to_suppliers();

-- 2. Review migrated suppliers
SELECT 
    s.supplier_code,
    s.name,
    s.email,
    s.notes,
    COUNT(l.id) as lpo_count
FROM suppliers s
LEFT JOIN lpos l ON s.id = l.supplier_id_new
GROUP BY s.id, s.supplier_code, s.name, s.email, s.notes
ORDER BY lpo_count DESC;

-- 3. Update LPO references
SELECT * FROM update_lpo_supplier_references();

-- 4. Verify the update
SELECT 
    COUNT(*) as total_lpos,
    COUNT(supplier_id_new) as mapped_to_suppliers,
    COUNT(*) - COUNT(supplier_id_new) as unmapped
FROM lpos;

-- 5. After verification, drop old column and rename new one
-- WARNING: This is irreversible! Make sure everything is working first.
-- ALTER TABLE lpos DROP COLUMN supplier_id;
-- ALTER TABLE lpos RENAME COLUMN supplier_id_new TO supplier_id;
-- ALTER TABLE lpos ALTER COLUMN supplier_id SET NOT NULL;

-- 6. Update indexes
-- DROP INDEX IF EXISTS idx_lpos_supplier_id;
-- CREATE INDEX idx_lpos_supplier_id ON lpos(supplier_id);
*/

-- Step 7: Create view for backward compatibility (optional)
-- ============================================================================
CREATE OR REPLACE VIEW lpos_with_supplier_details AS
SELECT 
    l.*,
    s.supplier_code,
    s.name as supplier_name,
    s.email as supplier_email,
    s.phone as supplier_phone,
    s.address as supplier_address,
    s.city as supplier_city,
    s.country as supplier_country,
    s.payment_terms_days,
    s.supplier_type,
    s.is_preferred as is_preferred_supplier
FROM lpos l
LEFT JOIN suppliers s ON l.supplier_id_new = s.id;

-- Step 8: Add constraints and triggers
-- ============================================================================
-- Ensure supplier codes are unique per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_company_supplier_code 
ON suppliers(company_id, supplier_code);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_suppliers_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Use these to verify the migration was successful:

-- 1. Check for customer/supplier conflicts
/*
SELECT 
    'Customer/Supplier Conflicts' as check_type,
    COUNT(*) as conflict_count
FROM customers c
WHERE EXISTS (
    SELECT 1 FROM suppliers s 
    WHERE s.name = c.name AND s.company_id = c.company_id
);

-- 2. Check LPO mapping completeness  
SELECT 
    'LPO Supplier Mapping' as check_type,
    COUNT(*) as total_lpos,
    COUNT(supplier_id_new) as mapped_lpos,
    COUNT(*) - COUNT(supplier_id_new) as unmapped_lpos
FROM lpos;

-- 3. Check for duplicate supplier codes
SELECT 
    'Duplicate Supplier Codes' as check_type,
    COUNT(*) as duplicate_count
FROM (
    SELECT supplier_code
    FROM suppliers
    GROUP BY supplier_code
    HAVING COUNT(*) > 1
) duplicates;
*/

-- ============================================================================
-- ROLLBACK SCRIPT (in case of issues)
-- ============================================================================
/*
-- EMERGENCY ROLLBACK (only if needed):
-- 1. Drop new references
UPDATE lpos SET supplier_id_new = NULL;

-- 2. Drop suppliers table
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS supplier_categories CASCADE;

-- 3. Drop functions
DROP FUNCTION IF EXISTS migrate_customer_suppliers_to_suppliers();
DROP FUNCTION IF EXISTS update_lpo_supplier_references();
DROP FUNCTION IF EXISTS update_suppliers_updated_at();
*/

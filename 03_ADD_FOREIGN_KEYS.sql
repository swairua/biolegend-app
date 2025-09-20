-- ============================================
-- PART 3: ADD FOREIGN KEY CONSTRAINTS
-- ============================================
-- Execute this after Parts 1 and 2 to add foreign key constraints

-- Credit Notes Foreign Key Constraints
ALTER TABLE credit_notes 
DROP CONSTRAINT IF EXISTS fk_credit_notes_company_id,
ADD CONSTRAINT fk_credit_notes_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE credit_notes 
DROP CONSTRAINT IF EXISTS fk_credit_notes_customer_id,
ADD CONSTRAINT fk_credit_notes_customer_id 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE credit_notes 
DROP CONSTRAINT IF EXISTS fk_credit_notes_invoice_id,
ADD CONSTRAINT fk_credit_notes_invoice_id 
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- Credit Note Items Foreign Key Constraints (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_note_items') THEN
        ALTER TABLE credit_note_items 
        DROP CONSTRAINT IF EXISTS fk_credit_note_items_credit_note_id,
        ADD CONSTRAINT fk_credit_note_items_credit_note_id 
        FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE CASCADE;

        ALTER TABLE credit_note_items 
        DROP CONSTRAINT IF EXISTS fk_credit_note_items_product_id,
        ADD CONSTRAINT fk_credit_note_items_product_id 
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Added credit_note_items foreign keys';
    END IF;
END $$;

-- Credit Note Allocations Foreign Key Constraints (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_note_allocations') THEN
        ALTER TABLE credit_note_allocations 
        DROP CONSTRAINT IF EXISTS fk_credit_note_allocations_credit_note_id,
        ADD CONSTRAINT fk_credit_note_allocations_credit_note_id 
        FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE CASCADE;

        ALTER TABLE credit_note_allocations 
        DROP CONSTRAINT IF EXISTS fk_credit_note_allocations_invoice_id,
        ADD CONSTRAINT fk_credit_note_allocations_invoice_id 
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Added credit_note_allocations foreign keys';
    END IF;
END $$;

-- Payments Foreign Key Constraints
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS fk_payments_company_id,
ADD CONSTRAINT fk_payments_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS fk_payments_customer_id,
ADD CONSTRAINT fk_payments_customer_id 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Add invoice_id FK only if column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'invoice_id') THEN
        ALTER TABLE payments 
        DROP CONSTRAINT IF EXISTS fk_payments_invoice_id,
        ADD CONSTRAINT fk_payments_invoice_id 
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Added payments.invoice_id foreign key';
    END IF;
END $$;

-- Invoice Foreign Key Constraints
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS fk_invoices_company_id,
ADD CONSTRAINT fk_invoices_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS fk_invoices_customer_id,
ADD CONSTRAINT fk_invoices_customer_id 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Invoice Items Foreign Key Constraints
ALTER TABLE invoice_items 
DROP CONSTRAINT IF EXISTS fk_invoice_items_invoice_id,
ADD CONSTRAINT fk_invoice_items_invoice_id 
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

ALTER TABLE invoice_items 
DROP CONSTRAINT IF EXISTS fk_invoice_items_product_id,
ADD CONSTRAINT fk_invoice_items_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Verify foreign key constraints were created
SELECT 
    'FOREIGN KEY CONSTRAINTS VERIFICATION' as check_type,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('invoices', 'invoice_items', 'credit_notes', 'credit_note_items', 'credit_note_allocations', 'payments')
ORDER BY tc.table_name, tc.constraint_name;

SELECT '✅ PART 3 COMPLETED - Foreign key constraints added' as status;

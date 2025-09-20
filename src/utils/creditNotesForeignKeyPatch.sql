-- Credit Notes Foreign Key Constraints Patch
-- Run this if you created credit_notes tables without proper foreign key relationships

-- Add foreign key constraints to credit_notes table
-- Note: Only run these if the tables already exist and relationships are missing

-- Add foreign key constraint for company_id
ALTER TABLE credit_notes 
DROP CONSTRAINT IF EXISTS fk_credit_notes_company_id;

ALTER TABLE credit_notes 
ADD CONSTRAINT fk_credit_notes_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id);

-- Add foreign key constraint for customer_id  
ALTER TABLE credit_notes 
DROP CONSTRAINT IF EXISTS fk_credit_notes_customer_id;

ALTER TABLE credit_notes 
ADD CONSTRAINT fk_credit_notes_customer_id 
FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Add foreign key constraint for invoice_id (optional)
ALTER TABLE credit_notes 
DROP CONSTRAINT IF EXISTS fk_credit_notes_invoice_id;

ALTER TABLE credit_notes 
ADD CONSTRAINT fk_credit_notes_invoice_id 
FOREIGN KEY (invoice_id) REFERENCES invoices(id);

-- Add foreign key constraint to credit_note_items for product_id
ALTER TABLE credit_note_items 
DROP CONSTRAINT IF EXISTS fk_credit_note_items_product_id;

ALTER TABLE credit_note_items 
ADD CONSTRAINT fk_credit_note_items_product_id 
FOREIGN KEY (product_id) REFERENCES products(id);

-- Add foreign key constraint to credit_note_allocations for invoice_id
ALTER TABLE credit_note_allocations 
DROP CONSTRAINT IF EXISTS fk_credit_note_allocations_invoice_id;

ALTER TABLE credit_note_allocations 
ADD CONSTRAINT fk_credit_note_allocations_invoice_id 
FOREIGN KEY (invoice_id) REFERENCES invoices(id);

-- Refresh the schema cache in Supabase
-- This helps Supabase recognize the new relationships
NOTIFY pgrst, 'reload schema';

-- Credit Note Migration SQL
-- This file contains SQL commands to create credit_notes and credit_note_items tables
-- Following the same pattern as invoices/invoice_items

-- Create credit_notes table
CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_id UUID REFERENCES invoices(id), -- Optional reference to original invoice
    credit_note_number TEXT NOT NULL,
    credit_note_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'applied', 'cancelled')),
    reason TEXT, -- Reason for credit note (returns, discount, error correction, etc.)
    
    -- Financial fields
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    applied_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- Amount already applied to invoices
    balance DECIMAL(12,2) NOT NULL DEFAULT 0, -- Remaining credit balance
    
    -- Inventory control
    affects_inventory BOOLEAN NOT NULL DEFAULT false,
    
    -- Additional info
    notes TEXT,
    terms_and_conditions TEXT,
    
    -- Audit fields
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(company_id, credit_note_number)
);

-- Create credit_note_items table
CREATE TABLE IF NOT EXISTS credit_note_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id), -- Optional, can be null for custom items
    
    -- Item details
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Tax information
    tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_inclusive BOOLEAN NOT NULL DEFAULT false,
    tax_setting_id UUID, -- Reference to tax settings
    
    -- Totals
    line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credit_note_allocations table for applying credits to invoices
CREATE TABLE IF NOT EXISTS credit_note_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id), -- References invoices table
    allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    
    -- Audit
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(credit_note_id, invoice_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_notes_company_id ON credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_date ON credit_notes(credit_note_date);
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON credit_notes(status);
CREATE INDEX IF NOT EXISTS idx_credit_notes_number ON credit_notes(credit_note_number);

CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_product_id ON credit_note_items(product_id);

CREATE INDEX IF NOT EXISTS idx_credit_note_allocations_credit_note_id ON credit_note_allocations(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_allocations_invoice_id ON credit_note_allocations(invoice_id);

-- Create RPC function to generate credit note numbers
CREATE OR REPLACE FUNCTION generate_credit_note_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    formatted_number TEXT;
BEGIN
    -- Get the next number for this company
    SELECT COALESCE(MAX(CAST(SUBSTRING(credit_note_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM credit_notes
    WHERE company_id = company_uuid
    AND credit_note_number ~ '^CN[0-9]+$';
    
    -- Format the number with leading zeros
    formatted_number := 'CN' || LPAD(next_number::TEXT, 6, '0');
    
    RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to apply credit note to invoice
CREATE OR REPLACE FUNCTION apply_credit_note_to_invoice(
    credit_note_uuid UUID,
    invoice_uuid UUID,
    amount_to_apply DECIMAL(12,2),
    applied_by_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    credit_note_record RECORD;
    invoice_record RECORD;
    available_credit DECIMAL(12,2);
    result JSON;
BEGIN
    -- Get credit note details
    SELECT * INTO credit_note_record
    FROM credit_notes
    WHERE id = credit_note_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Credit note not found');
    END IF;
    
    -- Get invoice details (assuming invoices table exists)
    SELECT id, balance_due, paid_amount, total_amount INTO invoice_record
    FROM invoices
    WHERE id = invoice_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invoice not found');
    END IF;
    
    -- Calculate available credit
    available_credit := credit_note_record.total_amount - credit_note_record.applied_amount;
    
    -- Validate application amount
    IF amount_to_apply <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Application amount must be positive');
    END IF;
    
    IF amount_to_apply > available_credit THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient credit balance');
    END IF;
    
    IF amount_to_apply > invoice_record.balance_due THEN
        RETURN json_build_object('success', false, 'error', 'Amount exceeds invoice balance');
    END IF;
    
    -- Insert allocation record
    INSERT INTO credit_note_allocations (
        credit_note_id,
        invoice_id,
        allocated_amount,
        allocation_date,
        created_by
    ) VALUES (
        credit_note_uuid,
        invoice_uuid,
        amount_to_apply,
        CURRENT_DATE,
        applied_by_uuid
    )
    ON CONFLICT (credit_note_id, invoice_id)
    DO UPDATE SET
        allocated_amount = credit_note_allocations.allocated_amount + amount_to_apply,
        allocation_date = CURRENT_DATE;
    
    -- Update credit note applied amount and balance
    UPDATE credit_notes
    SET applied_amount = applied_amount + amount_to_apply,
        balance = total_amount - (applied_amount + amount_to_apply),
        status = CASE 
            WHEN (applied_amount + amount_to_apply) >= total_amount THEN 'applied'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = credit_note_uuid;
    
    -- Update invoice paid amount and balance
    UPDATE invoices
    SET paid_amount = paid_amount + amount_to_apply,
        balance_due = balance_due - amount_to_apply,
        updated_at = NOW()
    WHERE id = invoice_uuid;
    
    RETURN json_build_object(
        'success', true,
        'applied_amount', amount_to_apply,
        'remaining_credit', available_credit - amount_to_apply,
        'invoice_balance', invoice_record.balance_due - amount_to_apply
    );
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_credit_notes_updated_at 
    BEFORE UPDATE ON credit_notes
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_credit_note_items_updated_at 
    BEFORE UPDATE ON credit_note_items
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

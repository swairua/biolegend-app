-- Add missing tax fields to quotation_items table
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Add missing tax fields to proforma_items table
ALTER TABLE proforma_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE proforma_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE proforma_items ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Add missing tax fields to invoice_items table
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Create function to generate proforma numbers
CREATE OR REPLACE FUNCTION generate_proforma_number(company_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(proforma_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM proforma_invoices 
    WHERE company_id = company_uuid 
    AND proforma_number LIKE 'PF-' || year_part || '-%';
    
    RETURN 'PF-' || year_part || '-' || LPAD(next_number::VARCHAR, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Create LPO (Local Purchase Order) tables

-- LPO status enum
DO $$ BEGIN
    CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Main LPO table
CREATE TABLE IF NOT EXISTS lpos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES customers(id) ON DELETE CASCADE, -- Using customers table for suppliers
    lpo_number VARCHAR(100) UNIQUE NOT NULL,
    lpo_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    status lpo_status DEFAULT 'draft',
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    terms_and_conditions TEXT,
    delivery_address TEXT,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LPO items table
CREATE TABLE IF NOT EXISTS lpo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lpo_id UUID REFERENCES lpos(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lpos_company_id ON lpos(company_id);
CREATE INDEX IF NOT EXISTS idx_lpos_supplier_id ON lpos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_number ON lpos(lpo_number);
CREATE INDEX IF NOT EXISTS idx_lpos_status ON lpos(status);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_date ON lpos(lpo_date);
CREATE INDEX IF NOT EXISTS idx_lpo_items_lpo_id ON lpo_items(lpo_id);
CREATE INDEX IF NOT EXISTS idx_lpo_items_product_id ON lpo_items(product_id);

-- RPC function to generate LPO number
CREATE OR REPLACE FUNCTION generate_lpo_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    company_code TEXT;
    lpo_count INTEGER;
    lpo_number TEXT;
BEGIN
    -- Get company code/prefix (you may want to add this to companies table)
    -- For now, using first 3 letters of company name or default 'LPO'
    SELECT COALESCE(UPPER(LEFT(name, 3)), 'LPO') INTO company_code
    FROM companies 
    WHERE id = company_uuid;
    
    -- Count existing LPOs for this company
    SELECT COUNT(*) INTO lpo_count
    FROM lpos
    WHERE company_id = company_uuid;
    
    -- Generate LPO number
    lpo_number := company_code || '-LPO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((lpo_count + 1)::TEXT, 4, '0');
    
    RETURN lpo_number;
END;
$$ LANGUAGE plpgsql;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to lpos table
DROP TRIGGER IF EXISTS update_lpos_updated_at ON lpos;
CREATE TRIGGER update_lpos_updated_at
    BEFORE UPDATE ON lpos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add some comments for documentation
COMMENT ON TABLE lpos IS 'Local Purchase Orders for ordering goods from suppliers';
COMMENT ON TABLE lpo_items IS 'Line items for Local Purchase Orders';
COMMENT ON COLUMN lpos.supplier_id IS 'References customers table - suppliers are stored as customers with supplier flag';
COMMENT ON COLUMN lpos.status IS 'LPO status: draft, sent, approved, received, cancelled';
COMMENT ON FUNCTION generate_lpo_number(UUID) IS 'Generates unique LPO number for a company';

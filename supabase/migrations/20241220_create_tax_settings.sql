-- Create tax_settings table for managing company tax rates
CREATE TABLE tax_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    rate DECIMAL(6,3) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for tax_settings
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;

-- Add trigger for updated_at
CREATE TRIGGER update_tax_settings_updated_at 
    BEFORE UPDATE ON tax_settings 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_tax_settings_company_id ON tax_settings(company_id);
CREATE INDEX idx_tax_settings_active ON tax_settings(company_id, is_active);
CREATE INDEX idx_tax_settings_default ON tax_settings(company_id, is_default);

-- Ensure only one default tax per company
CREATE UNIQUE INDEX idx_tax_settings_unique_default 
    ON tax_settings(company_id) 
    WHERE is_default = TRUE;

-- Add tax_setting_id reference to item tables (optional foreign key)
ALTER TABLE quotation_items 
ADD COLUMN tax_setting_id UUID REFERENCES tax_settings(id);

ALTER TABLE invoice_items 
ADD COLUMN tax_setting_id UUID REFERENCES tax_settings(id);

ALTER TABLE proforma_items 
ADD COLUMN tax_setting_id UUID REFERENCES tax_settings(id);

ALTER TABLE remittance_items 
ADD COLUMN tax_setting_id UUID REFERENCES tax_settings(id);

-- Insert default tax settings for existing companies
INSERT INTO tax_settings (company_id, name, rate, is_active, is_default)
SELECT 
    id as company_id,
    'VAT' as name,
    16.0 as rate,
    TRUE as is_active,
    TRUE as is_default
FROM companies
WHERE NOT EXISTS (
    SELECT 1 FROM tax_settings WHERE tax_settings.company_id = companies.id
);

-- Insert additional common tax rates
INSERT INTO tax_settings (company_id, name, rate, is_active, is_default)
SELECT 
    id as company_id,
    'Zero Rated' as name,
    0.0 as rate,
    TRUE as is_active,
    FALSE as is_default
FROM companies
WHERE NOT EXISTS (
    SELECT 1 FROM tax_settings WHERE tax_settings.company_id = companies.id AND name = 'Zero Rated'
);

INSERT INTO tax_settings (company_id, name, rate, is_active, is_default)
SELECT 
    id as company_id,
    'Exempt' as name,
    0.0 as rate,
    TRUE as is_active,
    FALSE as is_default
FROM companies
WHERE NOT EXISTS (
    SELECT 1 FROM tax_settings WHERE tax_settings.company_id = companies.id AND name = 'Exempt'
);

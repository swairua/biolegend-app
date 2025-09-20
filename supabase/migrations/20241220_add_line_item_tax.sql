-- Add tax support to quotation items
ALTER TABLE quotation_items 
ADD COLUMN tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN tax_inclusive BOOLEAN DEFAULT false;

-- Add tax support to invoice items  
ALTER TABLE invoice_items
ADD COLUMN tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN tax_inclusive BOOLEAN DEFAULT false;

-- Add tax support to proforma items
ALTER TABLE proforma_items
ADD COLUMN tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN tax_inclusive BOOLEAN DEFAULT false;

-- Add tax support to remittance advice items  
ALTER TABLE remittance_items
ADD COLUMN tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN tax_inclusive BOOLEAN DEFAULT false;

-- Update existing records to ensure data consistency
UPDATE quotation_items SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false WHERE tax_percentage IS NULL;
UPDATE invoice_items SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false WHERE tax_percentage IS NULL;
UPDATE proforma_items SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false WHERE tax_percentage IS NULL;
UPDATE remittance_items SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false WHERE tax_percentage IS NULL;

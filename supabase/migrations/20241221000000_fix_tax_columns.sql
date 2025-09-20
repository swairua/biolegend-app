-- Migration: Fix missing tax columns in line item tables
-- This migration ensures tax_amount, tax_percentage, and tax_inclusive columns exist

-- Add tax support to quotation_items if not already present
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Add tax support to invoice_items if not already present
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Add tax support to proforma_items if table exists and columns don't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='proforma_items') THEN
        ALTER TABLE proforma_items
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add tax support to remittance_items if table exists and columns don't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='remittance_items') THEN
        ALTER TABLE remittance_items
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Update any existing records that might have NULL values
UPDATE quotation_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false);

UPDATE invoice_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false);

-- Update proforma_items if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='proforma_items') THEN
        UPDATE proforma_items 
        SET tax_percentage = COALESCE(tax_percentage, 0),
            tax_amount = COALESCE(tax_amount, 0),
            tax_inclusive = COALESCE(tax_inclusive, false);
    END IF;
END $$;

-- Update remittance_items if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='remittance_items') THEN
        UPDATE remittance_items 
        SET tax_percentage = COALESCE(tax_percentage, 0),
            tax_amount = COALESCE(tax_amount, 0),
            tax_inclusive = COALESCE(tax_inclusive, false);
    END IF;
END $$;

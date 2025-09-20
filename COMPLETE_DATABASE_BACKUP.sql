-- ===============================================================================
-- BIOLEGEND SCIENTIFIC LTD - COMPLETE DATABASE BACKUP SCHEMA
-- Business Management System - Complete Database Structure
-- Generated: 2025-01-26
-- 
-- This file contains the complete, clean database schema for the entire application
-- Execute this script in Supabase SQL Editor to recreate the exact database structure
-- ===============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===============================================================================
-- ENUMS AND TYPES
-- ===============================================================================

-- User role enumeration
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'stock_manager', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User status enumeration
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Document status enumeration
DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('draft', 'pending', 'approved', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'expired', 'accepted', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment method enumeration
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'cheque', 'bank_transfer', 'mobile_money', 'credit_card', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- LPO status enumeration
DO $$ BEGIN
    CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===============================================================================
-- CORE TABLES
-- ===============================================================================

-- 1. Companies table (Multi-tenant support)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Kenya',
    logo_url TEXT,
    currency VARCHAR(3) DEFAULT 'KES',
    fiscal_year_start INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    status user_status DEFAULT 'pending',
    phone TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    department TEXT,
    position TEXT,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. User permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    permission_name TEXT NOT NULL,
    granted BOOLEAN DEFAULT TRUE,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, permission_name)
);

-- 4. User invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role user_role DEFAULT 'user',
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    invitation_token UUID DEFAULT gen_random_uuid(),
    UNIQUE(email, company_id)
);

-- 5. Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Kenya',
    tax_number VARCHAR(100),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Product categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES product_categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id),
    product_code VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(50) DEFAULT 'pcs',
    cost_price DECIMAL(15,2) DEFAULT 0,
    selling_price DECIMAL(15,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    minimum_stock_level INTEGER DEFAULT 0,
    maximum_stock_level INTEGER,
    reorder_point INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    track_inventory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tax settings table
CREATE TABLE IF NOT EXISTS tax_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    rate DECIMAL(6,3) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================================================
-- SALES DOCUMENTS TABLES
-- ===============================================================================

-- 9. Quotations table
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    quotation_number VARCHAR(100) UNIQUE NOT NULL,
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    status document_status DEFAULT 'draft',
    notes TEXT,
    terms_and_conditions TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Quotation items table
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    discount_percentage DECIMAL(6,3) DEFAULT 0,
    discount_before_vat DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_percentage DECIMAL(6,3) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    tax_inclusive BOOLEAN DEFAULT false,
    tax_setting_id UUID REFERENCES tax_settings(id),
    line_total DECIMAL(15,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Proforma invoices table
CREATE TABLE IF NOT EXISTS proforma_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    proforma_number VARCHAR(100) UNIQUE NOT NULL,
    proforma_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    status document_status DEFAULT 'draft',
    notes TEXT,
    terms_and_conditions TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Proforma items table
CREATE TABLE IF NOT EXISTS proforma_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proforma_id UUID REFERENCES proforma_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    discount_percentage DECIMAL(6,3) DEFAULT 0,
    discount_before_vat DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_percentage DECIMAL(6,3) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    tax_inclusive BOOLEAN DEFAULT false,
    tax_setting_id UUID REFERENCES tax_settings(id),
    line_total DECIMAL(15,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    quotation_id UUID REFERENCES quotations(id),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    lpo_number VARCHAR(100),
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    balance_due DECIMAL(15,2) DEFAULT 0,
    status document_status DEFAULT 'draft',
    affects_inventory BOOLEAN DEFAULT TRUE,
    notes TEXT,
    terms_and_conditions TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    discount_percentage DECIMAL(6,3) DEFAULT 0,
    discount_before_vat DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_percentage DECIMAL(6,3) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    tax_inclusive BOOLEAN DEFAULT false,
    tax_setting_id UUID REFERENCES tax_settings(id),
    line_total DECIMAL(15,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================================================
-- CREDIT NOTES TABLES
-- ===============================================================================

-- 15. Credit notes table
CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_id UUID REFERENCES invoices(id),
    credit_note_number TEXT NOT NULL,
    credit_note_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'applied', 'cancelled')),
    reason TEXT,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    applied_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    affects_inventory BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    terms_and_conditions TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, credit_note_number)
);

-- 16. Credit note items table
CREATE TABLE IF NOT EXISTS credit_note_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_inclusive BOOLEAN NOT NULL DEFAULT false,
    tax_setting_id UUID REFERENCES tax_settings(id),
    line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Credit note allocations table
CREATE TABLE IF NOT EXISTS credit_note_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(credit_note_id, invoice_id)
);

-- ===============================================================================
-- PROCUREMENT TABLES
-- ===============================================================================

-- 18. LPOs table (Local Purchase Orders)
CREATE TABLE IF NOT EXISTS lpos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES customers(id) ON DELETE CASCADE,
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
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. LPO items table
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
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================================================
-- DELIVERY TABLES
-- ===============================================================================

-- 20. Delivery notes table
CREATE TABLE IF NOT EXISTS delivery_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    invoice_id UUID REFERENCES invoices(id),
    delivery_number VARCHAR(100) UNIQUE NOT NULL,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_address TEXT,
    delivery_method VARCHAR(100),
    carrier VARCHAR(255),
    tracking_number VARCHAR(255),
    status document_status DEFAULT 'draft',
    delivered_by VARCHAR(255),
    received_by VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. Delivery note items table
CREATE TABLE IF NOT EXISTS delivery_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_note_id UUID REFERENCES delivery_notes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity_ordered DECIMAL(10,3) NOT NULL,
    quantity_delivered DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================================================
-- PAYMENT TABLES
-- ===============================================================================

-- 22. Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    payment_number VARCHAR(100) UNIQUE NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15,2) NOT NULL,
    payment_method payment_method NOT NULL,
    reference_number VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. Payment allocations table
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount_allocated DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 24. Remittance advice table
CREATE TABLE IF NOT EXISTS remittance_advice (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    advice_number VARCHAR(100) UNIQUE NOT NULL,
    advice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_payment DECIMAL(15,2) NOT NULL,
    status document_status DEFAULT 'draft',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 25. Remittance advice items table
CREATE TABLE IF NOT EXISTS remittance_advice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    remittance_advice_id UUID REFERENCES remittance_advice(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id),
    invoice_id UUID REFERENCES invoices(id),
    document_date DATE NOT NULL,
    document_number VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    invoice_amount DECIMAL(15,2),
    credit_amount DECIMAL(15,2),
    payment_amount DECIMAL(15,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================================================
-- INVENTORY TABLES
-- ===============================================================================

-- 26. Stock movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
    reference_type VARCHAR(50) CHECK (reference_type IN ('INVOICE', 'DELIVERY_NOTE', 'RESTOCK', 'ADJUSTMENT')),
    reference_id UUID,
    quantity DECIMAL(10,3) NOT NULL,
    cost_per_unit DECIMAL(15,2),
    notes TEXT,
    movement_date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================================================
-- INDEXES FOR PERFORMANCE
-- ===============================================================================

-- Company indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- Profile indexes
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- User permission indexes
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_name ON user_permissions(permission_name);

-- User invitation indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Product category indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_company_id ON product_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON product_categories(parent_id);

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Tax setting indexes
CREATE INDEX IF NOT EXISTS idx_tax_settings_company_id ON tax_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_settings_active ON tax_settings(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tax_settings_default ON tax_settings(company_id, is_default);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_settings_unique_default ON tax_settings(company_id) WHERE is_default = TRUE;

-- Quotation indexes
CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(quotation_date);

-- Quotation item indexes
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_product_id ON quotation_items(product_id);

-- Proforma indexes
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_company_id ON proforma_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_customer_id ON proforma_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_number ON proforma_invoices(proforma_number);

-- Proforma item indexes
CREATE INDEX IF NOT EXISTS idx_proforma_items_proforma_id ON proforma_items(proforma_id);
CREATE INDEX IF NOT EXISTS idx_proforma_items_product_id ON proforma_items(product_id);

-- Invoice indexes
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);

-- Invoice item indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);

-- Credit note indexes
CREATE INDEX IF NOT EXISTS idx_credit_notes_company_id ON credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_date ON credit_notes(credit_note_date);
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON credit_notes(status);
CREATE INDEX IF NOT EXISTS idx_credit_notes_number ON credit_notes(credit_note_number);

-- Credit note item indexes
CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_product_id ON credit_note_items(product_id);

-- Credit note allocation indexes
CREATE INDEX IF NOT EXISTS idx_credit_note_allocations_credit_note_id ON credit_note_allocations(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_allocations_invoice_id ON credit_note_allocations(invoice_id);

-- LPO indexes
CREATE INDEX IF NOT EXISTS idx_lpos_company_id ON lpos(company_id);
CREATE INDEX IF NOT EXISTS idx_lpos_supplier_id ON lpos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_number ON lpos(lpo_number);
CREATE INDEX IF NOT EXISTS idx_lpos_status ON lpos(status);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_date ON lpos(lpo_date);

-- LPO item indexes
CREATE INDEX IF NOT EXISTS idx_lpo_items_lpo_id ON lpo_items(lpo_id);
CREATE INDEX IF NOT EXISTS idx_lpo_items_product_id ON lpo_items(product_id);

-- Delivery note indexes
CREATE INDEX IF NOT EXISTS idx_delivery_notes_company_id ON delivery_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_customer_id ON delivery_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_invoice_id ON delivery_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_number ON delivery_notes(delivery_number);

-- Delivery note item indexes
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_delivery_note_id ON delivery_note_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_product_id ON delivery_note_items(product_id);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_number ON payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- Payment allocation indexes
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- Remittance advice indexes
CREATE INDEX IF NOT EXISTS idx_remittance_advice_company_id ON remittance_advice(company_id);
CREATE INDEX IF NOT EXISTS idx_remittance_advice_customer_id ON remittance_advice(customer_id);
CREATE INDEX IF NOT EXISTS idx_remittance_advice_number ON remittance_advice(advice_number);

-- Remittance advice item indexes
CREATE INDEX IF NOT EXISTS idx_remittance_advice_items_remittance_advice_id ON remittance_advice_items(remittance_advice_id);
CREATE INDEX IF NOT EXISTS idx_remittance_advice_items_payment_id ON remittance_advice_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_remittance_advice_items_invoice_id ON remittance_advice_items(invoice_id);

-- Stock movement indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);

-- ===============================================================================
-- TRIGGERS AND FUNCTIONS
-- ===============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER IF NOT EXISTS update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_product_categories_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_tax_settings_updated_at BEFORE UPDATE ON tax_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_quotation_items_updated_at BEFORE UPDATE ON quotation_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_proforma_invoices_updated_at BEFORE UPDATE ON proforma_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_proforma_items_updated_at BEFORE UPDATE ON proforma_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_invoice_items_updated_at BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_credit_notes_updated_at BEFORE UPDATE ON credit_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_credit_note_items_updated_at BEFORE UPDATE ON credit_note_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_lpos_updated_at BEFORE UPDATE ON lpos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_lpo_items_updated_at BEFORE UPDATE ON lpo_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_delivery_notes_updated_at BEFORE UPDATE ON delivery_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_delivery_note_items_updated_at BEFORE UPDATE ON delivery_note_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_remittance_advice_updated_at BEFORE UPDATE ON remittance_advice FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_remittance_advice_items_updated_at BEFORE UPDATE ON remittance_advice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_stock_movements_updated_at BEFORE UPDATE ON stock_movements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================================================
-- DOCUMENT NUMBER GENERATION FUNCTIONS
-- ===============================================================================

-- Generate quotation number
CREATE OR REPLACE FUNCTION generate_quotation_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM quotations 
    WHERE company_id = company_uuid 
    AND quotation_number LIKE 'QT-' || year_part || '-%';
    
    RETURN 'QT-' || year_part || '-' || LPAD(next_number::VARCHAR, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM invoices 
    WHERE company_id = company_uuid 
    AND invoice_number LIKE 'INV-' || year_part || '-%';
    
    RETURN 'INV-' || year_part || '-' || LPAD(next_number::VARCHAR, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate proforma number
CREATE OR REPLACE FUNCTION generate_proforma_number(company_uuid UUID)
RETURNS TEXT AS $$
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

-- Generate remittance number
CREATE OR REPLACE FUNCTION generate_remittance_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(advice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM remittance_advice 
    WHERE company_id = company_uuid 
    AND advice_number LIKE 'RA-' || year_part || '-%';
    
    RETURN 'RA-' || year_part || '-' || LPAD(next_number::VARCHAR, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate credit note number
CREATE OR REPLACE FUNCTION generate_credit_note_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    formatted_number TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(credit_note_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM credit_notes
    WHERE company_id = company_uuid
    AND credit_note_number ~ '^CN[0-9]+$';
    
    formatted_number := 'CN' || LPAD(next_number::TEXT, 6, '0');
    
    RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Generate LPO number
CREATE OR REPLACE FUNCTION generate_lpo_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    company_code TEXT;
    lpo_count INTEGER;
    lpo_number TEXT;
BEGIN
    SELECT COALESCE(UPPER(LEFT(name, 3)), 'LPO') INTO company_code
    FROM companies 
    WHERE id = company_uuid;
    
    SELECT COUNT(*) INTO lpo_count
    FROM lpos
    WHERE company_id = company_uuid;
    
    lpo_number := company_code || '-LPO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((lpo_count + 1)::TEXT, 4, '0');
    
    RETURN lpo_number;
END;
$$ LANGUAGE plpgsql;

-- ===============================================================================
-- CREDIT NOTE BUSINESS LOGIC FUNCTIONS
-- ===============================================================================

-- Apply credit note to invoice
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
    
    -- Get invoice details
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

-- ===============================================================================
-- AUTHENTICATION AND USER MANAGEMENT
-- ===============================================================================

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TABLE(permission_name TEXT, granted BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT up.permission_name, up.granted
    FROM user_permissions up
    WHERE up.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has permission
CREATE OR REPLACE FUNCTION has_permission(user_uuid UUID, permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN DEFAULT FALSE;
    user_role_val user_role;
BEGIN
    -- Get user role
    SELECT role INTO user_role_val
    FROM profiles
    WHERE id = user_uuid;

    -- Admin has all permissions
    IF user_role_val = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Check specific permission
    SELECT COALESCE(granted, FALSE) INTO has_perm
    FROM user_permissions
    WHERE user_id = user_uuid AND permission_name = permission;

    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ===============================================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lpos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lpo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE remittance_advice ENABLE ROW LEVEL SECURITY;
ALTER TABLE remittance_advice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized later)
-- Users can access their company data
CREATE POLICY "Users can access their company data" ON companies
    FOR ALL USING (id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ));

-- Users can manage their own profile
CREATE POLICY "Users can manage their own profile" ON profiles
    FOR ALL USING (id = auth.uid());

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions" ON user_permissions
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can manage permissions in their company
CREATE POLICY "Admins can manage permissions in their company" ON user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles admin_profile 
            JOIN profiles user_profile ON user_profile.id = user_permissions.user_id
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
            AND admin_profile.company_id = user_profile.company_id
        )
    );

-- ===============================================================================
-- SAMPLE DATA (Biolegend Scientific Ltd)
-- ===============================================================================

-- Insert default company
INSERT INTO companies (
    id, 
    name, 
    registration_number, 
    tax_number, 
    email, 
    phone, 
    address, 
    city, 
    country, 
    logo_url
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Biolegend Scientific Ltd',
    'C.52/2013',
    'P051701091X',
    'biolegend@biolegendscientific.co.ke',
    '0741207690/0780165490',
    'P.O. Box 85988-00200, Nairobi' || E'\n' || 'Alpha Center, Eastern Bypass, Membley',
    'Nairobi',
    'Kenya',
    'https://cdn.builder.io/api/v1/image/assets%2F69400b16069b456f9aaefcb4af79d463%2F1183a0a5c37e4fe69d12256c4d461bcd?format=webp&width=800'
) ON CONFLICT (id) DO NOTHING;

-- Insert default tax settings
INSERT INTO tax_settings (company_id, name, rate, is_active, is_default)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'VAT 16%', 16.0, TRUE, TRUE),
    ('550e8400-e29b-41d4-a716-446655440000', 'Zero Rated', 0.0, TRUE, FALSE),
    ('550e8400-e29b-41d4-a716-446655440000', 'Exempt', 0.0, TRUE, FALSE)
ON CONFLICT DO NOTHING;

-- Insert sample product categories
INSERT INTO product_categories (company_id, name, description)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'Medical Equipment', 'Medical devices and equipment'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Laboratory Supplies', 'Laboratory testing supplies and reagents'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Protective Equipment', 'Personal protective equipment for medical use')
ON CONFLICT DO NOTHING;

-- ===============================================================================
-- VERIFICATION QUERY
-- ===============================================================================

-- Final verification
SELECT 
    'Database schema created successfully!' as status,
    COUNT(*) as total_tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'companies', 'profiles', 'user_permissions', 'user_invitations',
    'customers', 'product_categories', 'products', 'tax_settings',
    'quotations', 'quotation_items', 'proforma_invoices', 'proforma_items',
    'invoices', 'invoice_items', 'credit_notes', 'credit_note_items', 'credit_note_allocations',
    'lpos', 'lpo_items', 'delivery_notes', 'delivery_note_items',
    'payments', 'payment_allocations', 'remittance_advice', 'remittance_advice_items',
    'stock_movements'
  );

-- ===============================================================================
-- END OF SCHEMA
-- ===============================================================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Copy,
  ExternalLink,
  Database,
  FileCode,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

export function CreditNoteMigrationSQL() {
  const [copied, setCopied] = useState(false);

  // The complete, correct SQL for credit note schema
  const migrationSQL = `-- Credit Note Migration SQL - Complete Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard

-- Step 1: Drop any existing incomplete tables
DROP TABLE IF EXISTS credit_note_allocations CASCADE;
DROP TABLE IF EXISTS credit_note_items CASCADE; 
DROP TABLE IF EXISTS credit_notes CASCADE;

-- Drop incorrect functions
DROP FUNCTION IF EXISTS generate_credit_note_number(UUID);
DROP FUNCTION IF EXISTS apply_credit_note_to_invoice(UUID, UUID, DECIMAL, UUID);

-- Step 2: Create the correct credit_notes table
CREATE TABLE credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_id UUID REFERENCES invoices(id),
    credit_note_number TEXT NOT NULL,
    credit_note_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'applied', 'cancelled')),
    reason TEXT,
    
    -- Financial fields
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    applied_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    
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

-- Step 3: Create the correct credit_note_items table
CREATE TABLE credit_note_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    
    -- Item details
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Tax information (CORRECT FIELDS - not tax_rate!)
    tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_inclusive BOOLEAN NOT NULL DEFAULT false,
    tax_setting_id UUID,
    
    -- Totals
    line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create credit_note_allocations table
CREATE TABLE credit_note_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    
    -- Audit
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(credit_note_id, invoice_id)
);

-- Step 5: Create indexes for performance
CREATE INDEX idx_credit_notes_company_id ON credit_notes(company_id);
CREATE INDEX idx_credit_notes_customer_id ON credit_notes(customer_id);
CREATE INDEX idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX idx_credit_notes_date ON credit_notes(credit_note_date);
CREATE INDEX idx_credit_notes_status ON credit_notes(status);
CREATE INDEX idx_credit_notes_number ON credit_notes(credit_note_number);

CREATE INDEX idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);
CREATE INDEX idx_credit_note_items_product_id ON credit_note_items(product_id);

CREATE INDEX idx_credit_note_allocations_credit_note_id ON credit_note_allocations(credit_note_id);
CREATE INDEX idx_credit_note_allocations_invoice_id ON credit_note_allocations(invoice_id);

-- Step 6: Create utility functions
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
BEGIN
    -- Get credit note details
    SELECT * INTO credit_note_record FROM credit_notes WHERE id = credit_note_uuid;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Credit note not found');
    END IF;
    
    -- Get invoice details
    SELECT id, balance_due, paid_amount, total_amount INTO invoice_record
    FROM invoices WHERE id = invoice_uuid;
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
        credit_note_id, invoice_id, allocated_amount, allocation_date, created_by
    ) VALUES (
        credit_note_uuid, invoice_uuid, amount_to_apply, CURRENT_DATE, applied_by_uuid
    )
    ON CONFLICT (credit_note_id, invoice_id)
    DO UPDATE SET
        allocated_amount = credit_note_allocations.allocated_amount + amount_to_apply,
        allocation_date = CURRENT_DATE;
    
    -- Update credit note
    UPDATE credit_notes
    SET applied_amount = applied_amount + amount_to_apply,
        balance = total_amount - (applied_amount + amount_to_apply),
        status = CASE 
            WHEN (applied_amount + amount_to_apply) >= total_amount THEN 'applied'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = credit_note_uuid;
    
    -- Update invoice
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

-- Step 7: Add update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_credit_notes_updated_at ON credit_notes;
CREATE TRIGGER update_credit_notes_updated_at 
    BEFORE UPDATE ON credit_notes
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_credit_note_items_updated_at ON credit_note_items;
CREATE TRIGGER update_credit_note_items_updated_at 
    BEFORE UPDATE ON credit_note_items
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Migration complete! 
-- Your credit notes will now work with the correct schema including:
-- ✅ tax_percentage (not tax_rate) 
-- ✅ tax_inclusive boolean field
-- ✅ tax_setting_id reference`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(migrationSQL);
      setCopied(true);
      toast.success('SQL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy SQL');
    }
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank');
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary-light/5">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-primary" />
            <span>Credit Note Migration SQL</span>
            <Badge variant="outline" className="bg-success-light text-success border-success/20">
              Complete Schema
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <FileCode className="h-4 w-4" />
            <AlertDescription>
              <strong>Simple approach:</strong> Copy the SQL below and run it directly in Supabase SQL Editor.<br />
              This creates the complete, correct credit note schema with all required fields.
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-4">
            <Button
              onClick={copyToClipboard}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
            >
              <Copy className="h-4 w-4 mr-2" />
              {copied ? 'Copied!' : 'Copy SQL'}
            </Button>

            <Button
              variant="outline"
              onClick={openSupabase}
              size="lg"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Supabase
            </Button>
          </div>

          <div className="bg-muted p-4 rounded font-mono text-xs max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{migrationSQL}</pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-success-light/10 border border-success/20 rounded">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <div className="font-medium text-sm">Correct Fields</div>
              <div className="text-xs text-muted-foreground">tax_percentage, tax_inclusive</div>
            </div>
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <div className="font-medium text-sm">All Functions</div>
              <div className="text-xs text-muted-foreground">Number generation, allocation</div>
            </div>
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <div className="font-medium text-sm">Performance</div>
              <div className="text-xs text-muted-foreground">Indexes and triggers</div>
            </div>
          </div>

          <Alert className="border-info/20 bg-info-light/10">
            <AlertDescription>
              <strong>Instructions:</strong><br />
              1. Copy the SQL above<br />
              2. Go to Supabase Dashboard → SQL Editor<br />
              3. Paste and run the SQL<br />
              4. Your credit notes will work perfectly!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

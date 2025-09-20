import { supabase } from '@/integrations/supabase/client';

// SQL script to create proforma invoice tables
const PROFORMA_TABLES_SQL = `
-- Create proforma_invoices table
CREATE TABLE IF NOT EXISTS proforma_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    proforma_number VARCHAR(100) UNIQUE NOT NULL,
    proforma_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    terms_and_conditions TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create proforma_items table
CREATE TABLE IF NOT EXISTS proforma_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proforma_id UUID REFERENCES proforma_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    tax_inclusive BOOLEAN DEFAULT FALSE,
    line_total DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_company_id ON proforma_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_customer_id ON proforma_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_number ON proforma_invoices(proforma_number);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_date ON proforma_invoices(proforma_date);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_status ON proforma_invoices(status);
CREATE INDEX IF NOT EXISTS idx_proforma_items_proforma_id ON proforma_items(proforma_id);
CREATE INDEX IF NOT EXISTS idx_proforma_items_product_id ON proforma_items(product_id);

-- Enable RLS (Row Level Security)
ALTER TABLE proforma_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proforma_invoices
CREATE POLICY IF NOT EXISTS "Users can view proformas from their company" ON proforma_invoices
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can insert proformas for their company" ON proforma_invoices
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can update proformas from their company" ON proforma_invoices
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can delete proformas from their company" ON proforma_invoices
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for proforma_items
CREATE POLICY IF NOT EXISTS "Users can view proforma items from their company" ON proforma_items
    FOR SELECT USING (
        proforma_id IN (
            SELECT id FROM proforma_invoices WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY IF NOT EXISTS "Users can insert proforma items for their company" ON proforma_items
    FOR INSERT WITH CHECK (
        proforma_id IN (
            SELECT id FROM proforma_invoices WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY IF NOT EXISTS "Users can update proforma items from their company" ON proforma_items
    FOR UPDATE USING (
        proforma_id IN (
            SELECT id FROM proforma_invoices WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY IF NOT EXISTS "Users can delete proforma items from their company" ON proforma_items
    FOR DELETE USING (
        proforma_id IN (
            SELECT id FROM proforma_invoices WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_proforma_invoices_updated_at ON proforma_invoices;
CREATE TRIGGER update_proforma_invoices_updated_at
    BEFORE UPDATE ON proforma_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate proforma numbers
CREATE OR REPLACE FUNCTION generate_proforma_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    next_number INTEGER;
    proforma_number TEXT;
BEGIN
    year_part := EXTRACT(year FROM CURRENT_DATE)::TEXT;
    
    -- Get the next number for this year and company
    SELECT COALESCE(MAX(
        CASE 
            WHEN proforma_number ~ ('^PF-' || year_part || '-[0-9]+$') 
            THEN CAST(SPLIT_PART(proforma_number, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_number
    FROM proforma_invoices 
    WHERE company_id = company_uuid;
    
    -- Format as PF-YYYY-NNNN
    proforma_number := 'PF-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN proforma_number;
END;
$$ LANGUAGE plpgsql;
`;

/**
 * Set up proforma invoice tables in the database
 */
export async function setupProformaTables() {
  const results = {
    success: false,
    steps: [] as Array<{ step: string; success: boolean; error?: string }>,
    tablesCreated: [] as string[],
    errors: [] as string[]
  };

  try {
    console.log('🚀 Setting up proforma invoice tables...');
    
    // Execute the SQL to create tables
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: PROFORMA_TABLES_SQL });
      
      if (error) {
        throw error;
      }
      
      results.steps.push({ step: 'Create proforma tables', success: true });
      results.tablesCreated.push('proforma_invoices', 'proforma_items');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to create proforma tables:', errorMessage);
      results.steps.push({ step: 'Create proforma tables', success: false, error: errorMessage });
      results.errors.push(`Table creation failed: ${errorMessage}`);
    }

    // Verify tables exist
    console.log('🔍 Verifying proforma tables...');
    const tablesToCheck = ['proforma_invoices', 'proforma_items'];
    let tablesExist = 0;
    
    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (!error) {
          tablesExist++;
        }
      } catch (err) {
        console.warn(`Table ${table} verification failed:`, err);
      }
    }
    
    results.steps.push({ 
      step: `Verify proforma tables (${tablesExist}/${tablesToCheck.length} working)`, 
      success: tablesExist === tablesToCheck.length
    });

    // Overall success if we have both tables working
    results.success = tablesExist === tablesToCheck.length;
    
    if (results.success) {
      console.log(`✅ Proforma tables setup completed! ${tablesExist}/${tablesToCheck.length} tables verified.`);
    } else {
      console.log(`⚠️ Proforma tables setup partially completed. ${tablesExist}/${tablesToCheck.length} tables verified.`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Proforma tables setup failed:', errorMessage);
    results.errors.push(`Setup failed: ${errorMessage}`);
    results.steps.push({ step: 'Proforma tables setup', success: false, error: errorMessage });
  }

  return results;
}

/** Ensure schema columns exist (harmonize) */
export async function ensureProformaSchema() {
  const SQL = `
  -- Harmonize proforma_invoices
  ALTER TABLE IF EXISTS proforma_invoices
    ADD COLUMN IF NOT EXISTS valid_until DATE;

  -- Harmonize proforma_items
  ALTER TABLE IF EXISTS proforma_items
    ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_percentage NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS line_total NUMERIC(15,2) DEFAULT 0;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: SQL });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Schema harmonization failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Check if proforma tables exist
 */
export async function checkProformaTables() {
  try {
    const tables = ['proforma_invoices', 'proforma_items'];
    const status = {
      tablesChecked: 0,
      tablesWorking: 0,
      tables: {} as Record<string, boolean>,
      ready: false
    };

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        status.tables[table] = !error;
        status.tablesChecked++;
        if (!error) {
          status.tablesWorking++;
        }
      } catch (err) {
        status.tables[table] = false;
        status.tablesChecked++;
      }
    }

    status.ready = status.tablesWorking === tables.length;
    return status;
  } catch (error) {
    return {
      tablesChecked: 0,
      tablesWorking: 0,
      tables: {},
      ready: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

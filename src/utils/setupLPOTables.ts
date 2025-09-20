import { supabase } from '@/integrations/supabase/client';

export const setupLPOTables = async () => {
  try {
    console.log('Setting up LPO tables...');

    // First, create the LPO status enum
    const { error: enumError } = await supabase.rpc('create_lpo_enum');
    if (enumError && !enumError.message.includes('already exists')) {
      console.error('Error creating LPO enum:', enumError);
    }

    // Create the main LPO table
    const { error: lpoTableError } = await supabase.rpc('create_lpo_table');
    if (lpoTableError && !lpoTableError.message.includes('already exists')) {
      console.error('Error creating LPO table:', lpoTableError);
    }

    // Create the LPO items table
    const { error: itemsTableError } = await supabase.rpc('create_lpo_items_table');
    if (itemsTableError && !itemsTableError.message.includes('already exists')) {
      console.error('Error creating LPO items table:', itemsTableError);
    }

    // Create indexes
    const { error: indexError } = await supabase.rpc('create_lpo_indexes');
    if (indexError && !indexError.message.includes('already exists')) {
      console.error('Error creating LPO indexes:', indexError);
    }

    // Create the LPO number generation function
    const { error: functionError } = await supabase.rpc('create_lpo_function');
    if (functionError && !functionError.message.includes('already exists')) {
      console.error('Error creating LPO function:', functionError);
    }

    console.log('LPO tables setup completed successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error setting up LPO tables:', error);
    return { success: false, error };
  }
};

// Direct SQL execution approach
export const executeLPOSetupSQL = async () => {
  try {
    console.log('Executing LPO setup SQL...');

    // Execute the SQL directly using a single RPC call
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        -- Create LPO status enum
        DO $$ BEGIN
            CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;

        -- Main LPO table
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
      `
    });

    if (error) {
      console.error('Error executing LPO setup SQL:', error);
      return { success: false, error };
    }

    console.log('LPO tables created successfully!');
    return { success: true, data };
  } catch (error) {
    console.error('Error in executeLPOSetupSQL:', error);
    return { success: false, error };
  }
};

import { supabase } from '@/integrations/supabase/client';

/**
 * Fix stock_movements table schema by adding missing updated_at column
 * This resolves the "could not find updated_at column of 'stock_movements' in the schema cache" error
 */
export async function fixStockMovementsSchema() {
  try {
    console.log('Checking stock_movements table schema...');

    // First check if the table exists
    const { error: tableCheckError } = await supabase
      .from('stock_movements')
      .select('id')
      .limit(1);

    if (tableCheckError && tableCheckError.code === 'PGRST116') {
      throw new Error('Stock movements table does not exist. Please create it first using the Database Schema Initializer.');
    }

    // Check if updated_at column exists by trying to select it
    const { error: columnCheckError } = await supabase
      .from('stock_movements')
      .select('updated_at')
      .limit(1);

    if (columnCheckError && columnCheckError.message.includes('updated_at')) {
      console.log('updated_at column missing, adding it...');

      // Try to add the missing updated_at column using direct SQL execution
      // First try individual SQL statements which are more compatible
      try {
        // Step 1: Add the column
        const { error: addColumnError } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`
        });

        if (addColumnError) {
          throw new Error(`Failed to add column: ${addColumnError.message}`);
        }

        // Step 2: Update existing rows
        const { error: updateError } = await supabase.rpc('exec_sql', {
          sql: `UPDATE stock_movements SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;`
        });

        if (updateError) {
          console.warn('Failed to update existing rows, but column was added successfully:', updateError);
        }

        // Step 3: Create trigger function
        const { error: functionError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE OR REPLACE FUNCTION update_stock_movements_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.updated_at = NOW();
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
          `
        });

        if (functionError) {
          console.warn('Failed to create trigger function:', functionError);
        }

        // Step 4: Create trigger
        const { error: triggerError } = await supabase.rpc('exec_sql', {
          sql: `
            DROP TRIGGER IF EXISTS trigger_update_stock_movements_updated_at ON stock_movements;
            CREATE TRIGGER trigger_update_stock_movements_updated_at
              BEFORE UPDATE ON stock_movements
              FOR EACH ROW EXECUTE FUNCTION update_stock_movements_updated_at();
          `
        });

        if (triggerError) {
          console.warn('Failed to create trigger:', triggerError);
        }

      } catch (rpcError) {
        console.error('RPC method failed, trying alternative approach:', rpcError);

        // Fallback: Try using the supabase client directly with simpler SQL
        const { error: directError } = await supabase
          .rpc('exec_sql', {
            sql: 'ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();'
          });

        if (directError) {
          throw new Error(`All methods failed. Last error: ${directError.message}. Please use the manual SQL approach.`);
        }
      }

      if (addColumnError) {
        console.error('Error adding updated_at column:', addColumnError);
        throw new Error(`Failed to add updated_at column: ${addColumnError.message}`);
      }

      console.log('✅ Successfully added updated_at column to stock_movements table');
      return { success: true, message: 'updated_at column added successfully' };
    } else {
      console.log('✅ updated_at column already exists');
      return { success: true, message: 'updated_at column already exists' };
    }

  } catch (error) {
    console.error('Error fixing stock movements schema:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Alternative direct SQL approach if the RPC method doesn't work
 */
export const STOCK_MOVEMENTS_FIX_SQL = `
-- Fix stock_movements table schema by adding missing updated_at column
DO $$
BEGIN
  -- Check if updated_at column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_movements' 
    AND column_name = 'updated_at'
  ) THEN
    -- Add the updated_at column
    ALTER TABLE stock_movements 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- Update existing rows to have updated_at = created_at
    UPDATE stock_movements 
    SET updated_at = COALESCE(created_at, NOW()) 
    WHERE updated_at IS NULL;
    
    -- Create trigger function for automatic updated_at updates
    CREATE OR REPLACE FUNCTION update_stock_movements_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
    
    -- Create trigger
    DROP TRIGGER IF EXISTS trigger_update_stock_movements_updated_at ON stock_movements;
    CREATE TRIGGER trigger_update_stock_movements_updated_at
      BEFORE UPDATE ON stock_movements
      FOR EACH ROW EXECUTE FUNCTION update_stock_movements_updated_at();
      
    RAISE NOTICE 'Added updated_at column to stock_movements table';
  ELSE
    RAISE NOTICE 'updated_at column already exists in stock_movements table';
  END IF;
END $$;
`;

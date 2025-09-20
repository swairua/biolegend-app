import { supabase } from '@/integrations/supabase/client';

/**
 * Simple function to just add the currency column
 */
export async function addCurrencyColumn(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Adding currency column to companies table...');
    
    // Simple SQL to add the currency column
    const sql = `ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES';`;
    
    // Try to execute using RPC if available
    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    });

    if (error) {
      // If RPC doesn't work, provide the SQL for manual execution
      console.error('RPC failed:', error);
      return {
        success: false,
        message: `Please execute this SQL manually in Supabase: ${sql}`
      };
    }

    console.log('✅ Currency column added successfully');
    return {
      success: true,
      message: 'Currency column added successfully'
    };

  } catch (error) {
    console.error('Error adding currency column:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Just the SQL command if you want to run it manually
 */
export const ADD_CURRENCY_COLUMN_SQL = `ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES';`;

import { supabase } from '@/integrations/supabase/client';

/**
 * Run the stock movements constraint fix
 * This fixes the check constraint violation error in invoice creation
 */
export async function runStockMovementsConstraintFix() {
  const constraintFixSQL = `-- Fix stock_movements table constraints
-- Drop existing constraints if they exist
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_type_check;
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_reference_type_check;

-- Add correct constraints with uppercase values as expected by the application
ALTER TABLE stock_movements 
ADD CONSTRAINT stock_movements_movement_type_check 
CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT'));

ALTER TABLE stock_movements 
ADD CONSTRAINT stock_movements_reference_type_check 
CHECK (reference_type IN ('INVOICE', 'DELIVERY_NOTE', 'RESTOCK', 'ADJUSTMENT', 'CREDIT_NOTE', 'PURCHASE'));

-- Ensure the table has the updated_at column
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to use correct case if needed
UPDATE stock_movements SET movement_type = UPPER(movement_type) WHERE movement_type != UPPER(movement_type);
UPDATE stock_movements SET reference_type = UPPER(reference_type) WHERE reference_type != UPPER(reference_type);

-- Create or replace the update trigger function
CREATE OR REPLACE FUNCTION update_stock_movements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_stock_movements_updated_at ON stock_movements;
CREATE TRIGGER trigger_update_stock_movements_updated_at
  BEFORE UPDATE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION update_stock_movements_updated_at();`;

  try {
    console.log('Running stock movements constraint fix...');
    
    // Try to execute the fix using RPC
    const { error } = await supabase.rpc('exec_sql', { sql: constraintFixSQL });

    if (error) {
      console.error('Failed to fix constraints via RPC:', error);
      throw new Error(`Database constraint fix failed: ${error.message}`);
    }

    console.log('✅ Successfully fixed stock movements constraints');
    return { success: true, message: 'Stock movements constraints fixed successfully' };

  } catch (error) {
    console.error('Error fixing stock movements constraints:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

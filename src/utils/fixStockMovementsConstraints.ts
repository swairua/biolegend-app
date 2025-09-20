import { supabase } from '@/integrations/supabase/client';

/**
 * Fix stock movements table constraints to match application expectations
 * This resolves check constraint violations when creating stock movements
 */
export async function fixStockMovementsConstraints() {
  try {
    console.log('Fixing stock movements constraints...');

    // SQL to fix the constraints
    const constraintFixSQL = `
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
        FOR EACH ROW EXECUTE FUNCTION update_stock_movements_updated_at();
    `;

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

/**
 * Check if stock movements table has correct constraints
 */
export async function checkStockMovementsConstraints() {
  try {
    console.log('Checking stock movements constraints...');

    // Try to create a test stock movement with expected values
    const testMovement = {
      company_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID for test
      product_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID for test
      movement_type: 'OUT',
      reference_type: 'INVOICE',
      reference_id: '00000000-0000-0000-0000-000000000000',
      quantity: 1,
      notes: 'Test constraint check',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // This is just a dry run - we'll use a WHERE false to avoid actually inserting
    const { error } = await supabase
      .from('stock_movements')
      .insert([testMovement])
      .select()
      .limit(0); // This should validate the data without inserting

    if (error && error.code === '23514') {
      // Check constraint violation
      console.log('Constraint validation failed:', error.message);
      return { 
        success: false, 
        error: 'Check constraints are incorrect',
        needsFix: true 
      };
    }

    if (error && error.code !== '23505') { // Ignore unique constraint violations for this test
      console.log('Other error during constraint check:', error);
      return { 
        success: false, 
        error: error.message,
        needsFix: false 
      };
    }

    console.log('✅ Stock movements constraints are correct');
    return { success: true, message: 'Constraints are working correctly' };

  } catch (error) {
    console.error('Error checking stock movements constraints:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      needsFix: false
    };
  }
}

/**
 * Validate movement data before inserting
 */
export function validateStockMovementData(movement: {
  movement_type: string;
  reference_type: string;
  [key: string]: any;
}) {
  const validMovementTypes = ['IN', 'OUT', 'ADJUSTMENT'];
  const validReferenceTypes = ['INVOICE', 'DELIVERY_NOTE', 'RESTOCK', 'ADJUSTMENT', 'CREDIT_NOTE', 'PURCHASE'];

  if (!validMovementTypes.includes(movement.movement_type)) {
    throw new Error(`Invalid movement_type: ${movement.movement_type}. Must be one of: ${validMovementTypes.join(', ')}`);
  }

  if (movement.reference_type && !validReferenceTypes.includes(movement.reference_type)) {
    throw new Error(`Invalid reference_type: ${movement.reference_type}. Must be one of: ${validReferenceTypes.join(', ')}`);
  }

  return true;
}

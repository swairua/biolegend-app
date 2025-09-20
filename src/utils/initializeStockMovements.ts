import { supabase } from '@/integrations/supabase/client';

/**
 * Initialize stock movements table with proper schema
 * This handles cases where the table might not exist or have wrong constraints
 */
export async function initializeStockMovements() {
  try {
    // First check if the table exists by trying a simple query
    const { error: checkError } = await supabase
      .from('stock_movements')
      .select('id')
      .limit(1);

    // If table doesn't exist, we'll get a specific error
    if (checkError && checkError.code === 'PGRST116') {
      console.log('Stock movements table does not exist, needs to be created in database');
      throw new Error('Stock movements table not found. Please run database migrations.');
    }

    // If there's a different error, log it
    if (checkError) {
      console.error('Error checking stock_movements table:', checkError);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to initialize stock movements:', error);
    return { success: false, error };
  }
}

/**
 * Create a stock movement record with proper error handling
 */
export async function createStockMovement(movement: {
  company_id: string;
  product_id: string;
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT';
  reference_type: 'INVOICE' | 'DELIVERY_NOTE' | 'RESTOCK' | 'ADJUSTMENT' | 'CREDIT_NOTE' | 'PURCHASE';
  reference_id: string;
  quantity: number;
  cost_per_unit?: number;
  notes?: string;
}) {
  try {
    // Prepare the movement data with all required fields
    const movementData = {
      company_id: movement.company_id,
      product_id: movement.product_id,
      movement_type: movement.movement_type,
      reference_type: movement.reference_type,
      reference_id: movement.reference_id,
      quantity: movement.quantity,
      cost_per_unit: movement.cost_per_unit || null,
      movement_date: new Date().toISOString().split('T')[0],
      notes: movement.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('stock_movements')
      .insert([movementData])
      .select();

    if (error) {
      console.error('Stock movement insert error:', error);
      console.error('Movement data:', movementData);
      
      // Provide more specific error messages
      if (error.code === '23514') {
        throw new Error(`Invalid data: Check constraint violation. ${error.message}`);
      } else if (error.code === '42P01') {
        throw new Error('Stock movements table not found. Please contact system administrator.');
      } else {
        throw new Error(`Failed to create stock movement: ${error.message}`);
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error creating stock movement:', error);
    return { data: null, error };
  }
}

/**
 * Batch create stock movements with proper error handling
 */
export async function createStockMovements(movements: Array<{
  company_id: string;
  product_id: string;
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT';
  reference_type: 'INVOICE' | 'DELIVERY_NOTE' | 'RESTOCK' | 'ADJUSTMENT' | 'CREDIT_NOTE' | 'PURCHASE';
  reference_id: string;
  quantity: number;
  cost_per_unit?: number;
  notes?: string;
}>) {
  try {
    // Initialize table check
    const initResult = await initializeStockMovements();
    if (!initResult.success) {
      throw initResult.error;
    }

    // Validate movement data before inserting
    const { validateStockMovementData } = await import('./fixStockMovementsConstraints');

    for (const movement of movements) {
      try {
        validateStockMovementData(movement);
      } catch (validationError) {
        console.error('Movement data validation failed:', validationError);
        throw validationError;
      }
    }

    // Prepare all movement data
    const movementData = movements.map(movement => ({
      company_id: movement.company_id,
      product_id: movement.product_id,
      movement_type: movement.movement_type,
      reference_type: movement.reference_type,
      reference_id: movement.reference_id,
      quantity: movement.quantity,
      cost_per_unit: movement.cost_per_unit || null,
      movement_date: new Date().toISOString().split('T')[0],
      notes: movement.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('stock_movements')
      .insert(movementData)
      .select();

    if (error) {
      console.error('Batch stock movements insert error:', error);
      console.error('Movement data sample:', movementData[0]);

      // Provide more specific error messages
      if (error.code === '23514') {
        const constraintError = new Error(`Check constraint violation: ${error.message}. The database constraints need to be fixed. Please use the StockMovementsConstraintFix component to resolve this issue.`);
        constraintError.name = 'ConstraintViolationError';
        throw constraintError;
      } else if (error.code === '42P01') {
        throw new Error('Stock movements table not found. Please contact system administrator.');
      } else {
        throw new Error(`Failed to create stock movements: ${error.message}`);
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error creating stock movements:', error);
    return { data: null, error };
  }
}

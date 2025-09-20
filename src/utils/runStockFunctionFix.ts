import { supabase } from '@/integrations/supabase/client';

/**
 * Create or fix the update_product_stock function in the database
 */
export async function createStockUpdateFunction() {
  const functionSQL = `
-- Create or replace the update_product_stock function
-- This function updates product stock quantities based on movement type
CREATE OR REPLACE FUNCTION update_product_stock(
    product_uuid UUID,
    movement_type VARCHAR(50),
    quantity DECIMAL(10,3)
)
RETURNS VOID AS $$
BEGIN
    -- Validate movement_type
    IF movement_type NOT IN ('IN', 'OUT', 'ADJUSTMENT') THEN
        RAISE EXCEPTION 'Invalid movement_type: %. Must be IN, OUT, or ADJUSTMENT', movement_type;
    END IF;

    -- Validate quantity is positive
    IF quantity < 0 THEN
        RAISE EXCEPTION 'Quantity must be positive: %', quantity;
    END IF;

    -- Update stock based on movement type
    IF movement_type = 'IN' THEN
        -- Add to stock (restock, returns, etc.)
        UPDATE products 
        SET stock_quantity = COALESCE(stock_quantity, 0) + quantity,
            updated_at = NOW()
        WHERE id = product_uuid;
        
    ELSIF movement_type = 'OUT' THEN
        -- Remove from stock (sales, deliveries, etc.)
        UPDATE products 
        SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - quantity, 0),
            updated_at = NOW()
        WHERE id = product_uuid;
        
    ELSIF movement_type = 'ADJUSTMENT' THEN
        -- For adjustments, the quantity represents the new total stock level
        UPDATE products 
        SET stock_quantity = quantity,
            updated_at = NOW()
        WHERE id = product_uuid;
    END IF;

    -- Check if product exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % not found', product_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_product_stock(UUID, VARCHAR, DECIMAL) TO authenticated;
`;

  try {
    console.log('Creating/updating update_product_stock function...');
    
    // Try to execute the function creation using RPC
    const { error } = await supabase.rpc('exec_sql', { sql: functionSQL });

    if (error) {
      console.error('Failed to create function via RPC:', error);
      throw new Error(`Function creation failed: ${error.message}`);
    }

    console.log('✅ Successfully created/updated update_product_stock function');
    return { success: true, message: 'Stock update function created successfully' };

  } catch (error) {
    console.error('Error creating stock update function:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Test the update_product_stock function
 */
export async function testStockUpdateFunction() {
  try {
    // Test with a dummy UUID (this should fail gracefully with "Product not found")
    const { error } = await supabase.rpc('update_product_stock', {
      product_uuid: '00000000-0000-0000-0000-000000000000',
      movement_type: 'IN',
      quantity: 1
    });

    // We expect this to fail with "Product not found" which means the function exists
    if (error && error.message.includes('Product with ID')) {
      return { success: true, message: 'Function exists and working correctly' };
    }

    // If no error, that's unexpected but okay
    if (!error) {
      return { success: true, message: 'Function executed successfully' };
    }

    // Other errors indicate function issues
    throw new Error(error.message);

  } catch (error) {
    console.error('Error testing stock update function:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

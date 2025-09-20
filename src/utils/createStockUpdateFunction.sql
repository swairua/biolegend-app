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

-- Grant execute permission to authenticated users (adjust as needed for your security model)
GRANT EXECUTE ON FUNCTION update_product_stock(UUID, VARCHAR, DECIMAL) TO authenticated;

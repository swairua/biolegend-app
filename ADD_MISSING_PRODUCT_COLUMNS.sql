-- ============================================
-- ADD MISSING PRODUCT TABLE COLUMNS
-- Based on audit of AddInventoryItemModal and form requirements
-- ============================================

-- Add missing columns to products table
DO $$
BEGIN
    -- Add track_inventory column (used by AddInventoryItemModal)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'track_inventory') THEN
        ALTER TABLE products ADD COLUMN track_inventory BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added track_inventory column to products';
    END IF;

    -- Ensure minimum_stock_level column exists (form uses this)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'minimum_stock_level') THEN
        ALTER TABLE products ADD COLUMN minimum_stock_level INTEGER DEFAULT 10;
        RAISE NOTICE 'Added minimum_stock_level column to products';
    END IF;

    -- Ensure maximum_stock_level column exists (form uses this)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'maximum_stock_level') THEN
        ALTER TABLE products ADD COLUMN maximum_stock_level INTEGER DEFAULT 100;
        RAISE NOTICE 'Added maximum_stock_level column to products';
    END IF;

    -- Ensure stock_quantity column exists (form uses this)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
        ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
        RAISE NOTICE 'Added stock_quantity column to products';
    END IF;

    -- Add reorder_point column (referenced in verification)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'reorder_point') THEN
        ALTER TABLE products ADD COLUMN reorder_point INTEGER DEFAULT 5;
        RAISE NOTICE 'Added reorder_point column to products';
    END IF;

    -- Ensure cost_price column exists with proper type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost_price') THEN
        ALTER TABLE products ADD COLUMN cost_price DECIMAL(15,2) DEFAULT 0.00;
        RAISE NOTICE 'Added cost_price column to products';
    END IF;

    -- Ensure selling_price column exists with proper type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'selling_price') THEN
        ALTER TABLE products ADD COLUMN selling_price DECIMAL(15,2) DEFAULT 0.00;
        RAISE NOTICE 'Added selling_price column to products';
    END IF;

    -- Ensure unit_of_measure column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'unit_of_measure') THEN
        ALTER TABLE products ADD COLUMN unit_of_measure VARCHAR(50) DEFAULT 'pieces';
        RAISE NOTICE 'Added unit_of_measure column to products';
    END IF;

    -- Ensure product_code column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'product_code') THEN
        ALTER TABLE products ADD COLUMN product_code VARCHAR(100) UNIQUE;
        RAISE NOTICE 'Added product_code column to products';
    END IF;

    -- Ensure is_active column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_active') THEN
        ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to products';
    END IF;

    -- Ensure category_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
        ALTER TABLE products ADD COLUMN category_id UUID REFERENCES product_categories(id);
        RAISE NOTICE 'Added category_id column to products';
    END IF;

    -- Ensure company_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'company_id') THEN
        ALTER TABLE products ADD COLUMN company_id UUID REFERENCES companies(id) NOT NULL;
        RAISE NOTICE 'Added company_id column to products';
    END IF;

    -- Ensure description column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'description') THEN
        ALTER TABLE products ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to products';
    END IF;

    -- Ensure name column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'name') THEN
        ALTER TABLE products ADD COLUMN name VARCHAR(255) NOT NULL;
        RAISE NOTICE 'Added name column to products';
    END IF;

    -- Ensure created_at/updated_at columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'created_at') THEN
        ALTER TABLE products ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to products';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'updated_at') THEN
        ALTER TABLE products ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to products';
    END IF;

END $$;

-- Create stock_movements table for inventory tracking (referenced by StockAdjustmentModal)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer')),
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(15,2),
    reference_type VARCHAR(50),
    reference_id UUID,
    reference_number VARCHAR(100),
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);

-- Create function to update product stock automatically
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stock_quantity based on movement
    IF NEW.movement_type = 'in' THEN
        UPDATE products 
        SET 
            stock_quantity = COALESCE(stock_quantity, 0) + NEW.quantity,
            updated_at = NOW() 
        WHERE id = NEW.product_id;
    ELSIF NEW.movement_type = 'out' THEN
        UPDATE products 
        SET 
            stock_quantity = COALESCE(stock_quantity, 0) - NEW.quantity,
            updated_at = NOW() 
        WHERE id = NEW.product_id;
    ELSIF NEW.movement_type = 'adjustment' THEN
        -- For adjustments, quantity represents the new total, not the change
        UPDATE products 
        SET 
            stock_quantity = NEW.quantity,
            updated_at = NOW() 
        WHERE id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic stock updates
DROP TRIGGER IF EXISTS trigger_update_product_stock ON stock_movements;
CREATE TRIGGER trigger_update_product_stock
    AFTER INSERT ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Verify the products table has all required columns
SELECT 'Product table column verification:' as check_type;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

-- Verify stock_movements table exists
SELECT 'Stock movements table verification:' as check_type;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'stock_movements' 
ORDER BY ordinal_position;

SELECT '✅ PRODUCT TABLE AUDIT AND FIX COMPLETED!' as status;

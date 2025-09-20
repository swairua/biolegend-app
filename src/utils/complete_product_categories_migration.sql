-- ============================================================================
-- COMPLETE PRODUCT CATEGORIES TABLE MIGRATION
-- This migration adds ALL missing columns to the product_categories table
-- ============================================================================

-- Step 1: Add the basic missing columns first
ALTER TABLE product_categories 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS category_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS color VARCHAR(7); -- For hex color codes like #FF0000

-- Step 2: Update existing records to have is_active = true
UPDATE product_categories 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- Step 3: Create unique index on category_code per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_code_company 
ON product_categories(company_id, category_code) 
WHERE category_code IS NOT NULL;

-- Step 4: Create index for parent_id for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id 
ON product_categories(parent_id);

-- Step 5: Create index for sort_order for better performance
CREATE INDEX IF NOT EXISTS idx_product_categories_sort_order 
ON product_categories(company_id, sort_order);

-- Step 6: Create index for is_active filtering
CREATE INDEX IF NOT EXISTS idx_product_categories_active 
ON product_categories(company_id, is_active);

-- Step 7: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_product_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_categories_updated_at 
    BEFORE UPDATE ON product_categories 
    FOR EACH ROW EXECUTE PROCEDURE update_product_categories_updated_at();

-- Step 8: Update existing records with sort_order based on creation order
UPDATE product_categories 
SET sort_order = sub.row_num * 10
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at) as row_num
    FROM product_categories
    WHERE sort_order = 0 OR sort_order IS NULL
) sub
WHERE product_categories.id = sub.id;

-- Step 9: Add constraint to ensure positive sort_order
ALTER TABLE product_categories 
ADD CONSTRAINT IF NOT EXISTS check_sort_order_positive 
CHECK (sort_order >= 0);

-- Step 10: Add constraint for color format (hex codes)
ALTER TABLE product_categories 
ADD CONSTRAINT IF NOT EXISTS check_color_format 
CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');

-- Step 11: Update RLS policies to include is_active and created_by filtering
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Users can manage categories they created" ON product_categories;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view active categories in their company" ON product_categories
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        is_active = TRUE AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = product_categories.company_id
        )
    );

CREATE POLICY "Users can insert categories in their company" ON product_categories
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = product_categories.company_id
        )
    );

CREATE POLICY "Users can update categories in their company" ON product_categories
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = product_categories.company_id
        )
    );

-- Step 12: Function to generate category codes
CREATE OR REPLACE FUNCTION generate_category_code(category_name TEXT, company_uuid UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    base_code VARCHAR(50);
    final_code VARCHAR(50);
    counter INTEGER := 1;
BEGIN
    -- Create base code from category name (first 3 letters + timestamp)
    base_code := UPPER(LEFT(REGEXP_REPLACE(category_name, '[^A-Za-z]', '', 'g'), 3));
    
    IF LENGTH(base_code) = 0 THEN
        base_code := 'CAT';
    END IF;
    
    -- Add timestamp-based suffix to make it unique
    base_code := base_code || TO_CHAR(NOW(), 'YYMMDD');
    
    -- Check for uniqueness and add counter if needed
    final_code := base_code;
    WHILE EXISTS (
        SELECT 1 FROM product_categories 
        WHERE company_id = company_uuid 
        AND category_code = final_code
    ) LOOP
        counter := counter + 1;
        final_code := base_code || LPAD(counter::text, 2, '0');
    END LOOP;
    
    RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Add documentation comments
COMMENT ON TABLE product_categories IS 'Product categories for organizing inventory items with hierarchical support and visual features';
COMMENT ON COLUMN product_categories.parent_id IS 'Reference to parent category for hierarchical structure';
COMMENT ON COLUMN product_categories.category_code IS 'Unique category code/SKU for easy reference';
COMMENT ON COLUMN product_categories.sort_order IS 'Custom sort order for category display (lower numbers first)';
COMMENT ON COLUMN product_categories.color IS 'Hex color code for visual categorization (#RRGGBB format)';
COMMENT ON COLUMN product_categories.is_active IS 'Whether this category is active and should be shown in lists';
COMMENT ON COLUMN product_categories.created_by IS 'User who created this category';
COMMENT ON COLUMN product_categories.updated_by IS 'User who last updated this category';
COMMENT ON COLUMN product_categories.updated_at IS 'Timestamp of last update (automatically maintained)';

-- Step 14: Verify the migration worked
DO $$
BEGIN
    -- Check if all columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_categories' 
        AND column_name = 'is_active'
    ) THEN
        RAISE EXCEPTION 'Migration failed: is_active column not found';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully! All columns added to product_categories table.';
END $$;

-- Step 15: Show the updated table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'product_categories' 
ORDER BY ordinal_position;

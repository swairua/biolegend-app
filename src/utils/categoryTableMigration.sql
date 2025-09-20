-- Product Categories Table Enhancement Migration
-- Add missing columns and improve the product_categories table structure

-- Step 1: Add missing columns to product_categories table
ALTER TABLE product_categories 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS category_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS color VARCHAR(7); -- For hex color codes like #FF0000

-- Step 2: Create unique index on category_code per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_code_company 
ON product_categories(company_id, category_code) 
WHERE category_code IS NOT NULL;

-- Step 3: Create index for parent_id for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id 
ON product_categories(parent_id);

-- Step 4: Create index for sort_order
CREATE INDEX IF NOT EXISTS idx_product_categories_sort_order 
ON product_categories(company_id, sort_order);

-- Step 5: Create trigger for updated_at
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

-- Step 6: Update existing records with sort_order based on creation order
UPDATE product_categories 
SET sort_order = sub.row_num
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at) as row_num
    FROM product_categories
    WHERE sort_order = 0 OR sort_order IS NULL
) sub
WHERE product_categories.id = sub.id;

-- Step 7: Add constraint to ensure positive sort_order
ALTER TABLE product_categories 
ADD CONSTRAINT check_sort_order_positive 
CHECK (sort_order >= 0);

-- Step 8: Update RLS policies to include created_by filtering
CREATE POLICY "Users can manage categories they created" ON product_categories
    FOR ALL USING (
        auth.uid() = created_by OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = product_categories.company_id
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Step 9: Function to generate category codes
CREATE OR REPLACE FUNCTION generate_category_code(category_name TEXT, company_uuid UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    base_code VARCHAR(50);
    final_code VARCHAR(50);
    counter INTEGER := 1;
BEGIN
    -- Create base code from category name (first 3 letters + random number)
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

-- Step 10: Add comments for documentation
COMMENT ON TABLE product_categories IS 'Product categories for organizing inventory items with hierarchical support';
COMMENT ON COLUMN product_categories.parent_id IS 'Reference to parent category for hierarchical structure';
COMMENT ON COLUMN product_categories.category_code IS 'Unique category code/SKU for easy reference';
COMMENT ON COLUMN product_categories.sort_order IS 'Custom sort order for category display';
COMMENT ON COLUMN product_categories.color IS 'Hex color code for visual categorization (#RRGGBB)';
COMMENT ON COLUMN product_categories.created_by IS 'User who created this category';
COMMENT ON COLUMN product_categories.updated_by IS 'User who last updated this category';

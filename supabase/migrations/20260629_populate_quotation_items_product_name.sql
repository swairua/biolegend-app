-- Populate missing product_name in quotation_items from products table
UPDATE quotation_items
SET product_name = p.name
FROM products p
WHERE quotation_items.product_id = p.id
  AND (quotation_items.product_name IS NULL OR TRIM(quotation_items.product_name) = '');

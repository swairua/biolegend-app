-- Backfill missing descriptions in invoice_items and quotation_items from products table
-- This ensures complete product information is displayed in generated PDFs

-- Backfill invoice_items descriptions
UPDATE invoice_items
SET description = p.description
FROM products p
WHERE invoice_items.product_id = p.id
  AND (invoice_items.description IS NULL OR TRIM(invoice_items.description) = '')
  AND p.description IS NOT NULL
  AND TRIM(p.description) != '';

-- Backfill quotation_items descriptions
UPDATE quotation_items
SET description = p.description
FROM products p
WHERE quotation_items.product_id = p.id
  AND (quotation_items.description IS NULL OR TRIM(quotation_items.description) = '')
  AND p.description IS NOT NULL
  AND TRIM(p.description) != '';

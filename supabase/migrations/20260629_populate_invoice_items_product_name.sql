-- Populate missing product_name in invoice_items from products table
UPDATE invoice_items
SET product_name = p.name
FROM products p
WHERE invoice_items.product_id = p.id
  AND (invoice_items.product_name IS NULL OR TRIM(invoice_items.product_name) = '');

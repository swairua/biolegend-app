-- Diagnostic queries to identify missing descriptions in invoice_items and quotation_items
-- Run these to understand the gap before creating the backfill migration

-- Check invoice_items: count how many have missing descriptions
SELECT 
  COUNT(*) as total_invoice_items,
  COUNT(CASE WHEN (description IS NULL OR TRIM(description) = '') THEN 1 END) as missing_description,
  COUNT(CASE WHEN (description IS NOT NULL AND TRIM(description) != '') THEN 1 END) as has_description
FROM invoice_items;

-- Check quotation_items: count how many have missing descriptions
SELECT 
  COUNT(*) as total_quotation_items,
  COUNT(CASE WHEN (description IS NULL OR TRIM(description) = '') THEN 1 END) as missing_description,
  COUNT(CASE WHEN (description IS NOT NULL AND TRIM(description) != '') THEN 1 END) as has_description
FROM quotation_items;

-- Check how many items with missing description have a product_id that could be backfilled
SELECT 
  'invoice_items' as type,
  COUNT(*) as items_with_missing_description,
  COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END) as with_product_id,
  COUNT(CASE WHEN product_id IS NOT NULL AND p.description IS NOT NULL AND TRIM(p.description) != '' THEN 1 END) as can_be_backfilled
FROM invoice_items ii
LEFT JOIN products p ON ii.product_id = p.id
WHERE ii.description IS NULL OR TRIM(ii.description) = '';

-- Check quotation_items for backfill potential
SELECT 
  'quotation_items' as type,
  COUNT(*) as items_with_missing_description,
  COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END) as with_product_id,
  COUNT(CASE WHEN product_id IS NOT NULL AND p.description IS NOT NULL AND TRIM(p.description) != '' THEN 1 END) as can_be_backfilled
FROM quotation_items qi
LEFT JOIN products p ON qi.product_id = p.id
WHERE qi.description IS NULL OR TRIM(qi.description) = '';

-- Show sample invoice_items with missing descriptions and their corresponding product data
SELECT 
  ii.id,
  ii.product_name,
  ii.description as item_description,
  p.name as product_table_name,
  p.description as product_table_description
FROM invoice_items ii
LEFT JOIN products p ON ii.product_id = p.id
WHERE ii.description IS NULL OR TRIM(ii.description) = ''
LIMIT 10;

-- Show sample quotation_items with missing descriptions and their corresponding product data
SELECT 
  qi.id,
  qi.product_name,
  qi.description as item_description,
  p.name as product_table_name,
  p.description as product_table_description
FROM quotation_items qi
LEFT JOIN products p ON qi.product_id = p.id
WHERE qi.description IS NULL OR TRIM(qi.description) = ''
LIMIT 10;

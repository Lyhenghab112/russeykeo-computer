-- Add discount_percentage column to products table to store the applied discount percentage
-- This will fix the issue where 10% discount shows as 5% due to calculation differences

-- Add the column
ALTER TABLE products 
ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT NULL COMMENT 'Applied discount percentage (0-100)';

-- Create an index for better performance
CREATE INDEX idx_products_discount_percentage ON products(discount_percentage);

-- Update existing products to calculate their current discount percentage
UPDATE products 
SET discount_percentage = ROUND(((original_price - price) / original_price) * 100, 2)
WHERE original_price IS NOT NULL 
  AND price < original_price 
  AND discount_percentage IS NULL;

-- Show the results
SELECT 
    id, 
    name, 
    price, 
    original_price, 
    discount_percentage,
    ROUND(((original_price - price) / original_price) * 100, 2) as calculated_discount
FROM products 
WHERE original_price IS NOT NULL 
  AND price < original_price 
LIMIT 10;

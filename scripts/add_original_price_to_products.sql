-- Migration script to add original_price column to products table
-- This is required for proper profit calculations in the money insight

-- Add original_price column to products table
ALTER TABLE products 
ADD COLUMN original_price DECIMAL(10,2) NULL AFTER price;

-- Set existing products' original_price to their current price
-- This ensures profit calculations work correctly for existing products
UPDATE products 
SET original_price = price 
WHERE original_price IS NULL;

-- Add index for better performance on profit calculations
CREATE INDEX idx_products_original_price ON products(original_price);

-- Verify the column was added
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'products' 
AND COLUMN_NAME = 'original_price';

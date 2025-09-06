-- Migration script to add discount information to order_items table
-- This will allow invoices to show original price, discount amount, and final price

-- Add original_price column to store the original price before discount
ALTER TABLE order_items 
ADD COLUMN original_price DECIMAL(10,2) NULL AFTER price;

-- Add discount_percentage column to store the discount percentage applied
ALTER TABLE order_items 
ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0.00 AFTER original_price;

-- Add discount_amount column to store the actual discount amount in currency
ALTER TABLE order_items 
ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00 AFTER discount_percentage;

-- Update existing order_items to populate original_price from current product data
-- This is a best-effort approach for existing data
UPDATE order_items oi
JOIN products p ON oi.product_id = p.id
SET oi.original_price = COALESCE(p.original_price, oi.price),
    oi.discount_percentage = CASE 
        WHEN p.original_price IS NOT NULL AND p.original_price > oi.price 
        THEN ROUND(((p.original_price - oi.price) / p.original_price) * 100, 2)
        ELSE 0.00
    END,
    oi.discount_amount = CASE 
        WHEN p.original_price IS NOT NULL AND p.original_price > oi.price 
        THEN ROUND(p.original_price - oi.price, 2)
        ELSE 0.00
    END
WHERE oi.original_price IS NULL;

-- For order items where we can't determine original price, set it equal to current price
UPDATE order_items 
SET original_price = price,
    discount_percentage = 0.00,
    discount_amount = 0.00
WHERE original_price IS NULL;

-- Add indexes for better query performance
CREATE INDEX idx_order_items_discount ON order_items(discount_percentage);
CREATE INDEX idx_order_items_original_price ON order_items(original_price);

-- Add comments to document the new columns
ALTER TABLE order_items 
MODIFY COLUMN original_price DECIMAL(10,2) NULL COMMENT 'Original price before any discounts were applied',
MODIFY COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Discount percentage applied (0-100)',
MODIFY COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Actual discount amount in currency';

-- Migration script to denormalize product data in order_items
-- This allows products to be deleted while preserving order history

-- Add product information columns to order_items table
ALTER TABLE order_items 
ADD COLUMN product_name VARCHAR(100) NULL AFTER product_id,
ADD COLUMN product_description TEXT NULL AFTER product_name,
ADD COLUMN product_category VARCHAR(100) NULL AFTER product_description;

-- Populate existing order_items with product data
UPDATE order_items oi
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
SET oi.product_name = p.name,
    oi.product_description = p.description,
    oi.product_category = c.name
WHERE oi.product_name IS NULL;

-- Set NOT NULL constraints after data population
ALTER TABLE order_items 
MODIFY COLUMN product_name VARCHAR(100) NOT NULL,
MODIFY COLUMN product_category VARCHAR(100) NOT NULL;

-- Add index for better query performance
CREATE INDEX idx_order_items_product_name ON order_items(product_name);

-- Add comments
ALTER TABLE order_items 
MODIFY COLUMN product_name VARCHAR(100) NOT NULL COMMENT 'Denormalized product name for order history preservation',
MODIFY COLUMN product_description TEXT NULL COMMENT 'Denormalized product description for order history preservation',
MODIFY COLUMN product_category VARCHAR(100) NOT NULL COMMENT 'Denormalized product category for order history preservation';

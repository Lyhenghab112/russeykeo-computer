-- Migration script to allow NULL product references in order_items
-- This enables true product deletion while preserving order history

-- First ensure we have denormalized product data (run denormalize_order_items.sql first)

-- Drop the existing foreign key constraint
ALTER TABLE order_items 
DROP FOREIGN KEY order_items_ibfk_2;

-- Allow product_id to be NULL
ALTER TABLE order_items 
MODIFY COLUMN product_id INT NULL;

-- Add the foreign key constraint back with ON DELETE SET NULL
ALTER TABLE order_items 
ADD CONSTRAINT order_items_ibfk_2 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Add a check constraint to ensure we have either product_id OR product_name
-- (MySQL 8.0+ feature - remove if using older MySQL)
ALTER TABLE order_items 
ADD CONSTRAINT chk_order_items_product_info 
CHECK (product_id IS NOT NULL OR product_name IS NOT NULL);

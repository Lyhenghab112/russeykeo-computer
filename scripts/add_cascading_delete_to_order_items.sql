-- Migration script to add ON DELETE CASCADE to order_items.product_id foreign key

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE order_items
DROP FOREIGN KEY order_items_ibfk_2;

-- Step 2: Add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE order_items
ADD CONSTRAINT order_items_ibfk_2
FOREIGN KEY (product_id) REFERENCES products(id)
ON DELETE CASCADE;

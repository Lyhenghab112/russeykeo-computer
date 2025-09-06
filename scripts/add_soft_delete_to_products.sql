-- Migration script to add soft delete functionality to products
-- This allows "deletion" while preserving references for order history

-- Add deleted flag to products table
ALTER TABLE products 
ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE AFTER archived,
ADD COLUMN deleted_at TIMESTAMP NULL AFTER deleted,
ADD COLUMN deleted_by INT NULL AFTER deleted_at;

-- Add foreign key for deleted_by (user who deleted the product)
ALTER TABLE products 
ADD CONSTRAINT fk_products_deleted_by 
FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_products_deleted ON products(deleted);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);

-- Add comments
ALTER TABLE products 
MODIFY COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Soft delete flag - true if product is deleted but preserved for order history',
MODIFY COLUMN deleted_at TIMESTAMP NULL COMMENT 'Timestamp when product was deleted',
MODIFY COLUMN deleted_by INT NULL COMMENT 'User ID who deleted the product';

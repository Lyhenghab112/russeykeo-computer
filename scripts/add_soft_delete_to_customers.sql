-- Add soft delete functionality to customers table
-- This preserves customer data while allowing "deletion" for display purposes

-- Add deleted_at column to track when customer was soft deleted
ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Add index for better performance when filtering deleted customers
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at);

-- Add comment explaining the soft delete functionality
ALTER TABLE customers COMMENT = 'Customers table with soft delete support - deleted_at tracks soft deletion timestamp';

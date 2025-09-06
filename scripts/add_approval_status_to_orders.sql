-- Migration script to add approval status to orders table
-- This enables order approval workflow for online customer purchases

-- Add approval_status column to orders table
ALTER TABLE orders 
ADD COLUMN approval_status ENUM('Pending Approval', 'Approved', 'Rejected') 
DEFAULT 'Pending Approval' 
AFTER payment_method;

-- Add approval_date column to track when approval was granted/rejected
ALTER TABLE orders 
ADD COLUMN approval_date DATETIME NULL 
AFTER approval_status;

-- Add approved_by column to track who approved/rejected the order
ALTER TABLE orders 
ADD COLUMN approved_by INT NULL 
AFTER approval_date;

-- Add approval_notes column for optional notes during approval/rejection
ALTER TABLE orders 
ADD COLUMN approval_notes TEXT NULL 
AFTER approved_by;

-- Add foreign key constraint for approved_by to reference users table
ALTER TABLE orders 
ADD CONSTRAINT fk_orders_approved_by 
FOREIGN KEY (approved_by) REFERENCES users(id) 
ON DELETE SET NULL;

-- Update existing completed orders to be automatically approved
-- (This maintains backward compatibility for existing orders)
UPDATE orders 
SET approval_status = 'Approved', 
    approval_date = order_date 
WHERE status = 'Completed' 
AND approval_status = 'Pending Approval';

-- Add indexes for better query performance
CREATE INDEX idx_orders_approval_status ON orders(approval_status);
CREATE INDEX idx_orders_approval_date ON orders(approval_date);

-- Add comments to document the new columns
ALTER TABLE orders 
MODIFY COLUMN approval_status ENUM('Pending Approval', 'Approved', 'Rejected') 
DEFAULT 'Pending Approval' 
COMMENT 'Approval status for order processing workflow',
MODIFY COLUMN approval_date DATETIME NULL 
COMMENT 'Date when order was approved or rejected',
MODIFY COLUMN approved_by INT NULL 
COMMENT 'User ID of staff member who approved/rejected the order',
MODIFY COLUMN approval_notes TEXT NULL 
COMMENT 'Optional notes added during approval/rejection process';

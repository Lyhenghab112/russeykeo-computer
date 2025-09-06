-- Migration script to add volume discount functionality
-- This enables automatic cart-level discounts based on order total thresholds

-- Create volume_discount_rules table
CREATE TABLE volume_discount_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Display name for the discount rule (e.g., "Bulk Purchase Discount")',
    minimum_amount DECIMAL(10,2) NOT NULL COMMENT 'Minimum cart total required to trigger this discount',
    discount_percentage DECIMAL(5,2) NOT NULL COMMENT 'Percentage discount to apply (0-100)',
    max_discount_amount DECIMAL(10,2) NULL COMMENT 'Maximum discount amount in currency (NULL = no limit)',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this rule is currently active',
    priority INT DEFAULT 0 COMMENT 'Rule priority (higher number = higher priority)',
    description TEXT NULL COMMENT 'Internal description of the rule',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL COMMENT 'User ID who created this rule',
    
    -- Constraints
    CONSTRAINT chk_minimum_amount CHECK (minimum_amount > 0),
    CONSTRAINT chk_discount_percentage CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    CONSTRAINT chk_max_discount CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
    
    -- Foreign key to users table
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) COMMENT 'Volume discount rules for cart-level discounts based on order total';

-- Add indexes for better performance
CREATE INDEX idx_volume_discounts_amount ON volume_discount_rules(minimum_amount);
CREATE INDEX idx_volume_discounts_active ON volume_discount_rules(is_active);
CREATE INDEX idx_volume_discounts_priority ON volume_discount_rules(priority);

-- Insert default volume discount rules
INSERT INTO volume_discount_rules (name, minimum_amount, discount_percentage, max_discount_amount, description, priority) VALUES
('Starter Bulk Discount', 500.00, 5.00, 50.00, 'Entry-level volume discount for orders over $500', 1),
('Business Discount', 1000.00, 10.00, 150.00, 'Popular discount tier for business customers', 2),
('Premium Volume Discount', 2000.00, 15.00, 400.00, 'Premium tier for large orders', 3);

-- Add volume discount tracking to orders table
ALTER TABLE orders 
ADD COLUMN volume_discount_rule_id INT NULL COMMENT 'ID of volume discount rule applied to this order',
ADD COLUMN volume_discount_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Volume discount percentage applied',
ADD COLUMN volume_discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Volume discount amount in currency',
ADD FOREIGN KEY (volume_discount_rule_id) REFERENCES volume_discount_rules(id) ON DELETE SET NULL;

-- Add indexes for volume discount tracking
CREATE INDEX idx_orders_volume_discount ON orders(volume_discount_rule_id);
CREATE INDEX idx_orders_volume_amount ON orders(volume_discount_amount);

-- Add comments to document the new columns
ALTER TABLE orders 
MODIFY COLUMN volume_discount_rule_id INT NULL COMMENT 'ID of volume discount rule applied to this order',
MODIFY COLUMN volume_discount_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Volume discount percentage applied (0-100)',
MODIFY COLUMN volume_discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Volume discount amount deducted from order total';

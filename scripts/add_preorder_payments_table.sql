-- Migration script to add pre-order payment history tracking

-- Create pre_order_payments table to track payment history
CREATE TABLE IF NOT EXISTS pre_order_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pre_order_id INT NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    payment_type ENUM('deposit', 'balance', 'full') NOT NULL DEFAULT 'deposit',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'QR Payment',
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
    session_id VARCHAR(255) NULL,
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pre_order_id) REFERENCES pre_orders(id) ON DELETE CASCADE,
    INDEX idx_pre_order_id (pre_order_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_payment_status (payment_status)
);

-- Add a column to track total payments made on pre-orders for easier calculation
ALTER TABLE pre_orders 
ADD COLUMN total_paid DECIMAL(10,2) DEFAULT 0.00 AFTER deposit_amount;

-- Update existing pre-orders to set total_paid equal to deposit_amount
UPDATE pre_orders 
SET total_paid = COALESCE(deposit_amount, 0.00) 
WHERE total_paid = 0.00;

-- Create a trigger to automatically update total_paid when payments are added
DELIMITER //
CREATE TRIGGER update_preorder_total_paid 
AFTER INSERT ON pre_order_payments
FOR EACH ROW
BEGIN
    UPDATE pre_orders 
    SET total_paid = (
        SELECT COALESCE(SUM(payment_amount), 0) 
        FROM pre_order_payments 
        WHERE pre_order_id = NEW.pre_order_id 
        AND payment_status = 'completed'
    )
    WHERE id = NEW.pre_order_id;
END//
DELIMITER ;

-- Insert existing deposit payments into the payment history table
INSERT INTO pre_order_payments (pre_order_id, payment_amount, payment_type, payment_method, payment_date, notes)
SELECT 
    id,
    deposit_amount,
    CASE 
        WHEN deposit_amount >= (expected_price * quantity) THEN 'full'
        ELSE 'deposit'
    END,
    COALESCE(deposit_payment_method, 'Cash'),
    created_date,
    'Initial deposit payment (migrated from existing data)'
FROM pre_orders 
WHERE deposit_amount > 0;

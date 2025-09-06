-- Migration script to create payment_sessions table for robust QR payment handling
-- This ensures payment data persists through server restarts

CREATE TABLE IF NOT EXISTS payment_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    payment_id VARCHAR(255) UNIQUE NOT NULL,
    order_id INT NULL,
    customer_id INT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    qr_data TEXT NOT NULL,
    md5_hash VARCHAR(32) NOT NULL,
    bill_number VARCHAR(50) NOT NULL,
    reference_id VARCHAR(255) NULL,
    status ENUM('pending', 'completed', 'failed', 'expired') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    payment_screenshot_path VARCHAR(500) NULL,
    screenshot_uploaded_at DATETIME NULL,
    payment_verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    notes TEXT NULL,
    
    INDEX idx_session_id (session_id),
    INDEX idx_payment_id (payment_id),
    INDEX idx_order_id (order_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at),
    INDEX idx_md5_hash (md5_hash),
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Add payment session tracking to orders table
ALTER TABLE orders 
ADD COLUMN payment_session_id VARCHAR(255) NULL AFTER transaction_id,
ADD INDEX idx_payment_session_id (payment_session_id);

-- Create cleanup procedure for expired sessions
DELIMITER //
CREATE PROCEDURE CleanupExpiredPaymentSessions()
BEGIN
    -- Delete expired payment sessions older than 24 hours
    DELETE FROM payment_sessions 
    WHERE expires_at < NOW() 
    AND status IN ('pending', 'failed');
    
    -- Log cleanup
    SELECT CONCAT('Cleaned up ', ROW_COUNT(), ' expired payment sessions') as cleanup_result;
END//
DELIMITER ;

-- Create event to run cleanup daily
CREATE EVENT IF NOT EXISTS daily_payment_cleanup
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
  CALL CleanupExpiredPaymentSessions();

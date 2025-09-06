-- Add OTP-related fields to customers table
ALTER TABLE customers ADD COLUMN otp_secret VARCHAR(32) NULL;
ALTER TABLE customers ADD COLUMN otp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN last_otp_attempt DATETIME NULL;
ALTER TABLE customers ADD COLUMN otp_attempts INT DEFAULT 0;
ALTER TABLE customers ADD COLUMN otp_locked_until DATETIME NULL;

-- Create OTP verification table for temporary OTP storage
CREATE TABLE IF NOT EXISTS customer_otp_verification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Add index for faster OTP lookups
CREATE INDEX idx_otp_verification_customer_email ON customer_otp_verification(customer_id, email);
CREATE INDEX idx_otp_verification_expires ON customer_otp_verification(expires_at);

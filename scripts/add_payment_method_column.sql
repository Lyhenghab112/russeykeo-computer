-- Migration script to add payment_method column to orders table

-- Add payment_method column to orders table
ALTER TABLE orders 
ADD COLUMN payment_method VARCHAR(50) DEFAULT 'QR Payment' AFTER status;

-- Update existing orders to have 'QR Payment' as default payment method
UPDATE orders 
SET payment_method = 'QR Payment' 
WHERE payment_method IS NULL;

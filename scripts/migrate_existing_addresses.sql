-- Migration script to move existing addresses from customers table to customer_addresses table
-- This preserves existing address data while moving to the new atomic structure

-- First, create the customer_addresses table (run create_customer_addresses_table.sql first)
-- Then run this migration script

-- Migrate existing addresses from customers table
INSERT INTO customer_addresses (
    customer_id,
    address_type,
    is_default,
    street_name,  -- Store original address in street_name for now
    province,     -- Set default province, can be updated manually
    created_at,
    is_active
)
SELECT 
    id as customer_id,
    'home' as address_type,
    TRUE as is_default,
    address as street_name,  -- Original address stored here
    'Phnom Penh' as province,  -- Default province, update manually
    created_at,
    TRUE as is_active
FROM customers 
WHERE address IS NOT NULL 
  AND address != '' 
  AND address != 'NULL'
  AND TRIM(address) != '';

-- Show migration results
SELECT 
    'Migration completed' as status,
    COUNT(*) as migrated_addresses
FROM customer_addresses;

-- Show customers with addresses
SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    ca.street_name as original_address,
    ca.province
FROM customers c
JOIN customer_addresses ca ON c.id = ca.customer_id
WHERE ca.is_active = TRUE
ORDER BY c.id
LIMIT 10;


-- Debug script to check discount detection
-- Run this in your MySQL database to see what's happening

-- Check the current state of products table
SELECT 
    id,
    name,
    price,
    original_price,
    CASE 
        WHEN original_price IS NULL THEN 'No original price set'
        WHEN price < original_price THEN 'Has discount'
        WHEN price = original_price THEN 'No discount'
        WHEN price > original_price THEN 'Price increased'
    END as discount_status,
    CASE 
        WHEN original_price IS NOT NULL AND price < original_price 
        THEN ROUND(((original_price - price) / original_price) * 100, 2)
        ELSE NULL
    END as discount_percentage,
    CASE 
        WHEN original_price IS NOT NULL AND price < original_price 
        THEN ROUND(original_price - price, 2)
        ELSE NULL
    END as savings_amount
FROM products 
WHERE id = 51  -- MSI Katana laptop
ORDER BY id;

-- Check all products with discounts
SELECT 
    id,
    name,
    price,
    original_price,
    ROUND(((original_price - price) / original_price) * 100, 2) as discount_percentage,
    ROUND(original_price - price, 2) as savings_amount
FROM products 
WHERE original_price IS NOT NULL
    AND price < original_price
    AND (archived IS NULL OR archived = FALSE)
ORDER BY discount_percentage DESC;

-- Check products that might have discount detection issues
SELECT 
    id,
    name,
    price,
    original_price,
    CASE 
        WHEN original_price IS NULL THEN 'Missing original_price'
        WHEN price >= original_price THEN 'No discount detected'
        ELSE 'OK'
    END as issue
FROM products 
WHERE original_price IS NULL 
    OR price >= original_price
ORDER BY id;

-- Count products by discount status
SELECT 
    CASE 
        WHEN original_price IS NULL THEN 'No original price set'
        WHEN price < original_price THEN 'Has discount'
        WHEN price = original_price THEN 'No discount'
        WHEN price > original_price THEN 'Price increased'
    END as discount_status,
    COUNT(*) as count
FROM products 
GROUP BY 
    CASE 
        WHEN original_price IS NULL THEN 'No original price set'
        WHEN price < original_price THEN 'Has discount'
        WHEN price = original_price THEN 'No discount'
        WHEN price > original_price THEN 'Price increased'
    END
ORDER BY count DESC;

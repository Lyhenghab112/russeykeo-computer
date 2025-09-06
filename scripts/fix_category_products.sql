-- Replace incorrect category IDs with the correct "Laptop Gaming" category ID

-- Step 1: Find the correct category ID for "Laptop Gaming"
SELECT id FROM categories WHERE name = 'Laptop Gaming';

-- Assume the correct category ID is 1 (based on your data)

-- Step 2: Incorrect category IDs to fix: 24, 25, 27

-- Step 3: Update products with incorrect category IDs to the correct "Laptop Gaming" category ID
UPDATE products
SET category_id = 1
WHERE category_id IN (24, 25, 27);

-- Step 4 (Optional): Delete incorrect category entries after reassignment
DELETE FROM categories
WHERE id IN (24, 25, 27);

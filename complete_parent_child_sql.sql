-- =====================================================
-- COMPLETE PARENT-CHILD CATEGORY HIERARCHY SQL
-- =====================================================
-- This is the complete SQL code that was executed
-- to create the parent-child category structure
-- =====================================================

-- Step 1: Add parent_id column to categories table
-- =====================================================
ALTER TABLE categories ADD COLUMN parent_id INT NULL;

-- Step 2: Add sort_order column for display order
-- =====================================================
ALTER TABLE categories ADD COLUMN sort_order INT DEFAULT 0;

-- Step 3: Add is_active column for enabling/disabling categories
-- =====================================================
ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Step 4: Add foreign key constraint
-- =====================================================
ALTER TABLE categories ADD CONSTRAINT fk_categories_parent 
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Step 5: Create indexes for better performance
-- =====================================================
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

-- Step 6: Set up main categories (parent level)
-- =====================================================

-- Set Laptop_Gaming as main category
UPDATE categories 
SET parent_id = NULL, sort_order = 1, is_active = TRUE 
WHERE name = 'Laptop_Gaming';

-- Set Desktops as main category
UPDATE categories 
SET parent_id = NULL, sort_order = 2, is_active = TRUE 
WHERE name = 'Desktops';

-- Set Accessories as main category (this will be the parent)
UPDATE categories 
SET parent_id = NULL, sort_order = 3, is_active = TRUE 
WHERE name = 'Accessories';

-- Set Laptop_Office as main category
UPDATE categories 
SET parent_id = NULL, sort_order = 4, is_active = TRUE 
WHERE name = 'Laptop_Office';

-- Set Pc Component as main category
UPDATE categories 
SET parent_id = NULL, sort_order = 5, is_active = TRUE 
WHERE name = 'Pc Component';

-- Set Network as main category
UPDATE categories 
SET parent_id = NULL, sort_order = 6, is_active = TRUE 
WHERE name = 'Network';

-- Set Gaming as main category
UPDATE categories 
SET parent_id = NULL, sort_order = 7, is_active = TRUE 
WHERE name = 'Gaming';

-- Step 7: Set up Accessories subcategories (child level)
-- =====================================================

-- Set monitors as child of Accessories
UPDATE categories 
SET parent_id = (SELECT id FROM categories WHERE name = 'Accessories'), 
    sort_order = 1, 
    is_active = TRUE 
WHERE name = 'monitors';

-- Set gaming_accessories as child of Accessories
UPDATE categories 
SET parent_id = (SELECT id FROM categories WHERE name = 'Accessories'), 
    sort_order = 2, 
    is_active = TRUE 
WHERE name = 'gaming_accessories';

-- Set storage as child of Accessories
UPDATE categories 
SET parent_id = (SELECT id FROM categories WHERE name = 'Accessories'), 
    sort_order = 3, 
    is_active = TRUE 
WHERE name = 'storage';

-- Set peripherals as child of Accessories
UPDATE categories 
SET parent_id = (SELECT id FROM categories WHERE name = 'Accessories'), 
    sort_order = 4, 
    is_active = TRUE 
WHERE name = 'peripherals';

-- Set cables_adapters as child of Accessories
UPDATE categories 
SET parent_id = (SELECT id FROM categories WHERE name = 'Accessories'), 
    sort_order = 5, 
    is_active = TRUE 
WHERE name = 'cables_adapters';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Query 1: Show complete hierarchy structure
SELECT 
    c1.id,
    c1.name as category_name,
    c1.parent_id,
    c2.name as parent_name,
    c1.sort_order,
    c1.is_active,
    CASE 
        WHEN c1.parent_id IS NULL THEN 'PARENT'
        ELSE 'CHILD'
    END as category_type
FROM categories c1
LEFT JOIN categories c2 ON c1.parent_id = c2.id
ORDER BY c1.sort_order, c1.name;

-- Query 2: Show parent categories with child counts
SELECT 
    p.id,
    p.name as parent_category,
    p.sort_order,
    COUNT(c.id) as child_count
FROM categories p
LEFT JOIN categories c ON p.id = c.parent_id
WHERE p.parent_id IS NULL
GROUP BY p.id, p.name, p.sort_order
ORDER BY p.sort_order;

-- Query 3: Show all Accessories subcategories
SELECT 
    c.id,
    c.name as subcategory_name,
    c.sort_order,
    COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
WHERE c.parent_id = (SELECT id FROM categories WHERE name = 'Accessories')
GROUP BY c.id, c.name, c.sort_order
ORDER BY c.sort_order;

-- Query 4: Show product distribution across hierarchy
SELECT 
    CASE 
        WHEN c.parent_id IS NULL THEN c.name
        ELSE CONCAT(p.name, ' → ', c.name)
    END as category_path,
    COUNT(pr.id) as product_count
FROM categories c
LEFT JOIN categories p ON c.parent_id = p.id
LEFT JOIN products pr ON c.id = pr.category_id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.parent_id, p.name
ORDER BY c.sort_order;

-- =====================================================
-- USEFUL QUERIES FOR FUTURE USE
-- =====================================================

-- Query 5: Get all children of a specific parent
-- (Replace 'Accessories' with any parent category name)
SELECT 
    id, name, description, sort_order
FROM categories 
WHERE parent_id = (SELECT id FROM categories WHERE name = 'Accessories')
AND is_active = TRUE
ORDER BY sort_order;

-- Query 6: Get all parent categories (no children)
SELECT 
    id, name, description, sort_order
FROM categories 
WHERE parent_id IS NULL 
AND is_active = TRUE
ORDER BY sort_order;

-- Query 7: Get category tree (recursive)
-- This shows the full hierarchy in a tree format
WITH RECURSIVE category_tree AS (
    -- Base case: parent categories
    SELECT 
        id, name, parent_id, sort_order, 0 as level,
        CAST(name AS CHAR(1000)) as path
    FROM categories 
    WHERE parent_id IS NULL AND is_active = TRUE
    
    UNION ALL
    
    -- Recursive case: child categories
    SELECT 
        c.id, c.name, c.parent_id, c.sort_order, ct.level + 1,
        CONCAT(ct.path, ' → ', c.name)
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.is_active = TRUE
)
SELECT 
    CONCAT(REPEAT('  ', level), '├── ', name) as tree_display,
    path as full_path,
    level
FROM category_tree
ORDER BY path;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- After running this script:
-- 1. Categories table has parent_id, sort_order, is_active columns
-- 2. Accessories is the parent of all accessory subcategories
-- 3. You can create nested category structures
-- 4. Admin interface can show hierarchical navigation
-- 5. Customers can navigate through category hierarchy
-- =====================================================

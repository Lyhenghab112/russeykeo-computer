-- =====================================================
-- COMPLETE MIGRATION SCRIPT FOR FRIEND
-- =====================================================
-- This script does EVERYTHING we did:
-- 1. Breaks down Accessories into 5 subcategories
-- 2. Creates parent-child hierarchy structure
-- 3. Moves products to appropriate categories
-- =====================================================

-- Step 1: Add hierarchy columns to categories table
-- =====================================================
ALTER TABLE categories ADD COLUMN parent_id INT NULL;
ALTER TABLE categories ADD COLUMN sort_order INT DEFAULT 0;
ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Step 2: Add foreign key constraint
-- =====================================================
ALTER TABLE categories ADD CONSTRAINT fk_categories_parent 
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Step 3: Create indexes for better performance
-- =====================================================
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

-- Step 4: Create new accessory subcategories
-- =====================================================
INSERT INTO categories (name, description) VALUES
('monitors', 'Computer monitors and displays - gaming, professional, and eye care monitors'),
('gaming_accessories', 'Gaming keyboards, mice, headsets, and gaming-specific accessories'),
('storage', 'SSDs, HDDs, portable drives, and storage devices'),
('peripherals', 'Keyboards, mice, webcams, speakers, and input/output devices'),
('cables_adapters', 'Cables, adapters, chargers, and connectivity accessories');

-- Step 5: Move products to new categories based on name patterns
-- =====================================================

-- Monitors (All ASUS, Dell, MSI monitors)
UPDATE products SET category_id = (
    SELECT id FROM categories WHERE name = 'monitors'
) WHERE category_id = 3 AND (
    name LIKE '%monitor%' OR 
    name LIKE '%display%' OR
    (name LIKE '%ASUS%' AND (name LIKE '%VU%' OR name LIKE '%VG%' OR name LIKE '%VA%' OR name LIKE '%ProArt%' OR name LIKE '%ROG%' OR name LIKE '%TUF%')) OR
    (name LIKE '%Dell%' AND (name LIKE '%S%' OR name LIKE '%P%' OR name LIKE '%SE%' OR name LIKE '%C%')) OR
    (name LIKE '%MSI%' AND (name LIKE '%G%' OR name LIKE '%MAG%' OR name LIKE '%MPG%' OR name LIKE '%Optix%' OR name LIKE '%Pro%' OR name LIKE '%Modern%'))
);

-- Gaming Accessories (Razer keyboards, gaming monitors, gaming mice)
UPDATE products SET category_id = (
    SELECT id FROM categories WHERE name = 'gaming_accessories'
) WHERE category_id = 3 AND (
    name LIKE '%Razer%' OR
    name LIKE '%gaming%' OR
    name LIKE '%Gaming%' OR
    name LIKE '%ROG%' OR
    name LIKE '%TUF%' OR
    name LIKE '%Claymore%' OR
    name LIKE '%BLACKWIDOW%' OR
    name LIKE '%DEATHSTALKER%' OR
    name LIKE '%HUNTSMAN%' OR
    name LIKE '%ORNATA%' OR
    name LIKE '%HP P31 Gaming%' OR
    (name LIKE '%Corsair%' AND name LIKE '%RAM%')
);

-- Storage (SSDs, HDDs, portable drives)
UPDATE products SET category_id = (
    SELECT id FROM categories WHERE name = 'storage'
) WHERE category_id = 3 AND (
    name LIKE '%SSD%' OR
    name LIKE '%HDD%' OR
    name LIKE '%storage%' OR
    name LIKE '%drive%' OR
    (name LIKE '%Samsung%' AND (name LIKE '%970%' OR name LIKE '%990%' OR name LIKE '%Qvo%' OR name LIKE '%M.2%' OR name LIKE '%9100%' OR name LIKE '%Crucial%')) OR
    name LIKE '%Seagate%' OR
    name LIKE '%Portable%' OR
    name LIKE '%T7%'
);

-- Peripherals (Keyboards, webcams, speakers)
UPDATE products SET category_id = (
    SELECT id FROM categories WHERE name = 'peripherals'
) WHERE category_id = 3 AND (
    name LIKE '%keyboard%' OR
    name LIKE '%Keyboard%' OR
    name LIKE '%webcam%' OR
    name LIKE '%Webcam%' OR
    name LIKE '%speaker%' OR
    name LIKE '%Speaker%' OR
    (name LIKE '%Logitech%' AND name LIKE '%C920%') OR
    (name LIKE '%HP%' AND (name LIKE '%K%' OR name LIKE '%MK%' OR name LIKE '%WK%')) OR
    (name LIKE '%Dell%' AND name LIKE '%Speaker%')
);

-- Cables & Adapters (HDMI cables, adapters)
UPDATE products SET category_id = (
    SELECT id FROM categories WHERE name = 'cables_adapters'
) WHERE category_id = 3 AND (
    name LIKE '%cable%' OR
    name LIKE '%Cable%' OR
    name LIKE '%adapter%' OR
    name LIKE '%Adapter%' OR
    name LIKE '%HDMI%' OR
    name LIKE '%USB%' OR
    name LIKE '%charger%' OR
    name LIKE '%Charger%'
);

-- Step 6: Set up parent-child hierarchy
-- =====================================================

-- Set main categories (parent level)
UPDATE categories SET parent_id = NULL, sort_order = 1, is_active = TRUE WHERE name = 'laptops';
UPDATE categories SET parent_id = NULL, sort_order = 2, is_active = TRUE WHERE name = 'Desktops';
UPDATE categories SET parent_id = NULL, sort_order = 3, is_active = TRUE WHERE name = 'Accessories';
UPDATE categories SET parent_id = NULL, sort_order = 4, is_active = TRUE WHERE name = 'Pc Component';
UPDATE categories SET parent_id = NULL, sort_order = 5, is_active = TRUE WHERE name = 'Network';
UPDATE categories SET parent_id = NULL, sort_order = 6, is_active = TRUE WHERE name = 'Gaming';

-- Set accessory subcategories (child level)
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE name = 'Accessories'), sort_order = 1, is_active = TRUE WHERE name = 'monitors';
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE name = 'Accessories'), sort_order = 2, is_active = TRUE WHERE name = 'gaming_accessories';
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE name = 'Accessories'), sort_order = 3, is_active = TRUE WHERE name = 'storage';
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE name = 'Accessories'), sort_order = 4, is_active = TRUE WHERE name = 'peripherals';
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE name = 'Accessories'), sort_order = 5, is_active = TRUE WHERE name = 'cables_adapters';

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

-- Query 2: Show product counts in each category
SELECT 
    c.name as category_name,
    COUNT(p.id) as product_count,
    CASE 
        WHEN c.parent_id IS NULL THEN 'PARENT'
        ELSE 'CHILD'
    END as category_type
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.parent_id
ORDER BY c.sort_order, c.name;

-- Query 3: Show Accessories hierarchy specifically
SELECT 
    p.name as parent_category,
    c.name as child_category,
    COUNT(pr.id) as product_count
FROM categories p
LEFT JOIN categories c ON p.id = c.parent_id
LEFT JOIN products pr ON c.id = pr.category_id
WHERE p.name = 'Accessories'
GROUP BY p.name, c.name
ORDER BY c.sort_order;

-- Query 4: Show remaining products in original Accessories category
SELECT COUNT(*) as remaining_in_accessories
FROM products 
WHERE category_id = 3;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- After running this script, your friend will have:
-- 1. 5 new accessory subcategories created
-- 2. Products moved to appropriate categories based on name patterns
-- 3. Parent-child hierarchy structure (Accessories as parent)
-- 4. All the same organization as your database
-- =====================================================

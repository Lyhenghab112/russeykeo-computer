-- Migration script to add missing image columns to products table

-- Check if back_view column exists, if not add it
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'back_view'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE products ADD COLUMN back_view VARCHAR(255) DEFAULT NULL',
    'SELECT "Column back_view already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if left_rear_view column exists, if not add it
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'left_rear_view'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE products ADD COLUMN left_rear_view VARCHAR(255) DEFAULT NULL',
    'SELECT "Column left_rear_view already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if right_rear_view column exists, if not add it
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'right_rear_view'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE products ADD COLUMN right_rear_view VARCHAR(255) DEFAULT NULL',
    'SELECT "Column right_rear_view already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show the current structure of the products table
DESCRIBE products;

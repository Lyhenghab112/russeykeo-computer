-- Create customer_addresses table with atomic address components
-- This table supports one-to-many relationship between customers and addresses

CREATE TABLE customer_addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    address_type ENUM('home', 'work', 'shop', 'other') DEFAULT 'home',
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Atomic address components for Cambodia
    house_number VARCHAR(50),           -- #123, St. 123, Building 456
    street_name VARCHAR(100),           -- Street 271, National Road 1, Main Street
    street_number VARCHAR(50),          -- 271, 1, etc. (extracted from street_name)
    village VARCHAR(100),               -- Village name
    sangkat VARCHAR(100),               -- Sangkat name
    commune VARCHAR(100),               -- Commune name
    khan VARCHAR(100),                  -- Khan name
    province VARCHAR(100),              -- Province name
    postal_code VARCHAR(20),            -- Postal code
    country VARCHAR(50) DEFAULT 'Cambodia',
    
    -- Additional fields
    building_name VARCHAR(100),         -- Building name
    floor_number VARCHAR(20),           -- Floor 3
    unit_number VARCHAR(20),            -- Unit 301
    landmark VARCHAR(100),              -- Near Central Market
    delivery_notes TEXT,                -- Special delivery instructions
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Foreign key constraint
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Indexes for better performance
    INDEX idx_customer_addresses (customer_id, is_active),
    INDEX idx_province (province),
    INDEX idx_sangkat (sangkat),
    INDEX idx_street_number (street_number),
    INDEX idx_address_type (address_type)
);

-- Add comment to table
ALTER TABLE customer_addresses COMMENT = 'Customer addresses with atomic components for Cambodia e-commerce';


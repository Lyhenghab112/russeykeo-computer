#!/usr/bin/env python3
"""
Migration script to add discount information to order_items table
"""

import mysql.connector
from config import Config

def run_migration():
    """Execute the discount migration SQL commands"""
    
    # Database connection
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor()
        
        print("🔗 Connected to database")
        
        # Migration SQL commands
        migration_commands = [
            # Add original_price column
            """
            ALTER TABLE order_items 
            ADD COLUMN original_price DECIMAL(10,2) NULL AFTER price
            """,
            
            # Add discount_percentage column
            """
            ALTER TABLE order_items 
            ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0.00 AFTER original_price
            """,
            
            # Add discount_amount column
            """
            ALTER TABLE order_items 
            ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00 AFTER discount_percentage
            """,
            
            # Update existing order_items with discount information
            """
            UPDATE order_items oi
            JOIN products p ON oi.product_id = p.id
            SET oi.original_price = COALESCE(p.original_price, oi.price),
                oi.discount_percentage = CASE 
                    WHEN p.original_price IS NOT NULL AND p.original_price > oi.price 
                    THEN ROUND(((p.original_price - oi.price) / p.original_price) * 100, 2)
                    ELSE 0.00
                END,
                oi.discount_amount = CASE 
                    WHEN p.original_price IS NOT NULL AND p.original_price > oi.price 
                    THEN ROUND(p.original_price - oi.price, 2)
                    ELSE 0.00
                END
            WHERE oi.original_price IS NULL
            """,
            
            # Set original_price equal to price for items without discount info
            """
            UPDATE order_items 
            SET original_price = price,
                discount_percentage = 0.00,
                discount_amount = 0.00
            WHERE original_price IS NULL
            """,
            
            # Add indexes for better performance
            """
            CREATE INDEX idx_order_items_discount ON order_items(discount_percentage)
            """,
            
            """
            CREATE INDEX idx_order_items_original_price ON order_items(original_price)
            """
        ]
        
        # Execute each command
        for i, command in enumerate(migration_commands, 1):
            try:
                print(f"📝 Executing migration step {i}...")
                cur.execute(command)
                conn.commit()
                print(f"✅ Step {i} completed successfully")
            except mysql.connector.Error as e:
                if "Duplicate column name" in str(e) or "already exists" in str(e):
                    print(f"⚠️  Step {i} skipped - column/index already exists")
                else:
                    print(f"❌ Error in step {i}: {e}")
                    raise
        
        print("🎉 Migration completed successfully!")
        
    except Exception as e:
        print(f"💥 Migration failed: {e}")
        raise
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    run_migration()

#!/usr/bin/env python3
"""
Migration script to add original_price column to products table
This fixes the profit calculation issue in money insight
"""

import mysql.connector
from config import Config

def run_migration():
    """Execute the original_price migration SQL commands"""
    
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
        
        # Check if original_price column already exists
        cur.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'products' 
            AND COLUMN_NAME = 'original_price'
        """, (Config.MYSQL_DB,))
        
        if cur.fetchone():
            print("⚠️  original_price column already exists in products table")
            return
        
        # Migration SQL commands
        migration_commands = [
            # Add original_price column
            """
            ALTER TABLE products 
            ADD COLUMN original_price DECIMAL(10,2) NULL AFTER price
            """,
            
            # Set existing products' original_price to their current price
            """
            UPDATE products 
            SET original_price = price 
            WHERE original_price IS NULL
            """,
            
            # Add index for better performance
            """
            CREATE INDEX idx_products_original_price ON products(original_price)
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
        
        # Verify the migration
        cur.execute("""
            SELECT COUNT(*) as total_products, 
                   COUNT(original_price) as products_with_original_price,
                   MIN(original_price) as min_original_price,
                   MAX(original_price) as max_original_price
            FROM products
        """)
        
        result = cur.fetchone()
        print(f"📊 Migration verification:")
        print(f"   Total products: {result[0]}")
        print(f"   Products with original_price: {result[1]}")
        print(f"   Original price range: ${result[2]} - ${result[3]}")
        
        print("🎉 Migration completed successfully!")
        print("💡 Profit calculations in money insight should now work correctly!")
        
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

#!/usr/bin/env python3
"""
Migration script to add notifications table
"""

import mysql.connector
from config import Config

def run_migration():
    """Execute the notifications table migration"""
    
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor()
        
        print("🔗 Connected to database")
        
        # Create notifications table
        migration_command = """
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            order_id INT NULL,
            type ENUM('order_approved', 'order_rejected', 'order_shipped', 'order_delivered', 'general') NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            read_at DATETIME NULL,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            INDEX idx_customer_id (customer_id),
            INDEX idx_order_id (order_id),
            INDEX idx_created_at (created_at),
            INDEX idx_is_read (is_read)
        )
        """
        
        try:
            print("📝 Creating notifications table...")
            cur.execute(migration_command)
            conn.commit()
            print("✅ Notifications table created successfully")
        except mysql.connector.Error as e:
            if "already exists" in str(e):
                print("⚠️  Notifications table already exists")
            else:
                print(f"❌ Error creating table: {e}")
                raise
        
        print("🎉 Notifications migration completed successfully!")
        
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

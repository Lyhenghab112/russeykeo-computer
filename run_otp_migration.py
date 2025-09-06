#!/usr/bin/env python3
"""
Script to add OTP functionality to the customers table
"""

import mysql.connector
from config import Config
import sys

def get_db():
    """Get database connection"""
    return mysql.connector.connect(
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        host=Config.MYSQL_HOST,
        database=Config.MYSQL_DB
    )

def run_otp_migration():
    """Run OTP migration"""
    conn = get_db()
    cur = conn.cursor()
    
    try:
        print("Starting OTP migration...")
        
        # Check if OTP fields already exist
        cur.execute("SHOW COLUMNS FROM customers LIKE 'otp_secret'")
        otp_fields_exist = cur.fetchone() is not None
        if otp_fields_exist:
            print("OTP fields already exist in customers table")
        else:
            print("Adding OTP fields to customers table...")
            
            # Add OTP-related fields to customers table
            cur.execute("ALTER TABLE customers ADD COLUMN otp_secret VARCHAR(32) NULL")
            cur.execute("ALTER TABLE customers ADD COLUMN otp_enabled BOOLEAN DEFAULT FALSE")
            cur.execute("ALTER TABLE customers ADD COLUMN last_otp_attempt DATETIME NULL")
            cur.execute("ALTER TABLE customers ADD COLUMN otp_attempts INT DEFAULT 0")
            cur.execute("ALTER TABLE customers ADD COLUMN otp_locked_until DATETIME NULL")
            
            print("✓ OTP fields added to customers table")
        
        # Check if OTP verification table exists
        cur.execute("SHOW TABLES LIKE 'customer_otp_verification'")
        otp_table_exists = cur.fetchone() is not None
        if otp_table_exists:
            print("OTP verification table already exists")
        else:
            print("Creating OTP verification table...")
            
            # Create OTP verification table
            cur.execute("""
                CREATE TABLE customer_otp_verification (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    customer_id INT NOT NULL,
                    otp_code VARCHAR(6) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME NOT NULL,
                    used BOOLEAN DEFAULT FALSE,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
                )
            """)
            
            print("✓ OTP verification table created")
        
        # Check if indexes exist (only if table exists)
        if otp_table_exists:
            cur.execute("SHOW INDEX FROM customer_otp_verification WHERE Key_name = 'idx_otp_verification_customer_email'")
            indexes_exist = cur.fetchone() is not None
            if not indexes_exist:
                print("Creating OTP verification indexes...")
                
                # Create indexes
                cur.execute("CREATE INDEX idx_otp_verification_customer_email ON customer_otp_verification(customer_id, email)")
                cur.execute("CREATE INDEX idx_otp_verification_expires ON customer_otp_verification(expires_at)")
                
                print("✓ OTP verification indexes created")
            else:
                print("OTP verification indexes already exist")
        
        # Commit all changes
        conn.commit()
        print("\n🎉 OTP migration completed successfully!")
        
        # Show table structure
        print("\nUpdated customers table structure:")
        cur.execute("DESCRIBE customers")
        columns = cur.fetchall()
        for col in columns:
            print(f"  {col[0]} - {col[1]} - {col[2]} - {col[3]} - {col[4]} - {col[5]}")
        
        print("\nOTP verification table structure:")
        cur.execute("DESCRIBE customer_otp_verification")
        columns = cur.fetchall()
        for col in columns:
            print(f"  {col[0]} - {col[1]} - {col[2]} - {col[3]} - {col[4]} - {col[5]}")
        
    except mysql.connector.Error as err:
        print(f"❌ Database error: {err}")
        conn.rollback()
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_otp_migration()

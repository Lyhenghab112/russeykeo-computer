#!/usr/bin/env python3
"""
Simple script to fix OTP database tables
"""

import mysql.connector
from config import Config

def get_db():
    """Get database connection"""
    return mysql.connector.connect(
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        host=Config.MYSQL_HOST,
        database=Config.MYSQL_DB
    )

def fix_otp_tables():
    """Fix OTP database tables"""
    conn = get_db()
    cur = conn.cursor()
    
    try:
        print("Checking OTP database setup...")
        
        # Check if OTP verification table exists
        cur.execute("SHOW TABLES LIKE 'customer_otp_verification'")
        result = cur.fetchone()
        
        if result:
            print("✓ OTP verification table exists")
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
        
        # Commit changes
        conn.commit()
        print("\n🎉 OTP tables are ready!")
        
        # Show table structure
        print("\nOTP verification table structure:")
        cur.execute("DESCRIBE customer_otp_verification")
        columns = cur.fetchall()
        for col in columns:
            print(f"  {col[0]} - {col[1]} - {col[2]} - {col[3]} - {col[4]} - {col[5]}")
        
    except mysql.connector.Error as err:
        print(f"❌ Database error: {err}")
        conn.rollback()
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    fix_otp_tables()

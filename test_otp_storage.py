#!/usr/bin/env python3
"""
Test OTP storage directly
"""

import mysql.connector
from config import Config
from datetime import datetime, timedelta

def get_db():
    """Get database connection"""
    return mysql.connector.connect(
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        host=Config.MYSQL_HOST,
        database=Config.MYSQL_DB
    )

def test_otp_storage():
    """Test OTP storage directly"""
    print("Testing OTP storage directly...")
    
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Test customer ID
        customer_id = 999
        email = "test@example.com"
        otp_code = "123456"
        expiry_minutes = 15
        
        print(f"Testing with customer_id={customer_id}, email={email}, otp={otp_code}")
        
        # Check if table exists
        cur.execute("SHOW TABLES LIKE 'customer_otp_verification'")
        table_exists = cur.fetchone() is not None
        print(f"OTP table exists: {table_exists}")
        
        if not table_exists:
            print("Creating OTP table...")
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
            conn.commit()
            print("OTP table created")
        
        # Try to insert OTP
        expires_at = datetime.now() + timedelta(minutes=expiry_minutes)
        print(f"Inserting OTP with expiry: {expires_at}")
        
        cur.execute("""
            INSERT INTO customer_otp_verification (customer_id, otp_code, email, expires_at)
            VALUES (%s, %s, %s, %s)
        """, (customer_id, otp_code, email, expires_at))
        
        conn.commit()
        print("OTP inserted successfully")
        
        # Try to retrieve OTP
        cur.execute("""
            SELECT id, expires_at, used FROM customer_otp_verification
            WHERE customer_id = %s AND email = %s AND otp_code = %s
            ORDER BY created_at DESC LIMIT 1
        """, (customer_id, email, otp_code))
        
        otp_record = cur.fetchone()
        if otp_record:
            print(f"OTP retrieved: {otp_record}")
            
            # Mark as used
            cur.execute("""
                UPDATE customer_otp_verification
                SET used = TRUE
                WHERE id = %s
            """, (otp_record[0],))
            conn.commit()
            print("OTP marked as used")
        else:
            print("Failed to retrieve OTP")
        
        cur.close()
        conn.close()
        print("Test completed successfully")
        return True
        
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_otp_storage()

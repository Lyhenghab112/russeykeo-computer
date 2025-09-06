#!/usr/bin/env python3
"""
Check existing customers in database
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

def check_customers():
    """Check existing customers"""
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Get customer count
        cur.execute("SELECT COUNT(*) FROM customers")
        count = cur.fetchone()[0]
        print(f"Total customers in database: {count}")
        
        # Get some sample customer IDs
        cur.execute("SELECT id, first_name, last_name, email FROM customers ORDER BY id DESC LIMIT 10")
        customers = cur.fetchall()
        
        print("\nRecent customers:")
        for customer in customers:
            print(f"  ID: {customer[0]}, Name: {customer[1]} {customer[2]}, Email: {customer[3]}")
        
        # Check OTP fields
        cur.execute("SHOW COLUMNS FROM customers LIKE 'otp_enabled'")
        otp_field = cur.fetchone()
        if otp_field:
            print(f"\nOTP field exists: {otp_field}")
            
            # Check OTP status
            cur.execute("SELECT COUNT(*) FROM customers WHERE otp_enabled = TRUE")
            otp_enabled_count = cur.fetchone()[0]
            print(f"Customers with OTP enabled: {otp_enabled_count}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_customers()

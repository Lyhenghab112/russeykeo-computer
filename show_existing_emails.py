
#!/usr/bin/env python3
"""
Show existing email addresses in database
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

def show_existing_emails():
    """Show all existing email addresses"""
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Get all emails
        cur.execute("SELECT email FROM customers WHERE email IS NOT NULL AND email != 'None' ORDER BY email")
        emails = cur.fetchall()
        
        print(f"Found {len(emails)} existing email addresses:")
        print("-" * 50)
        
        for i, (email,) in enumerate(emails, 1):
            print(f"{i:2d}. {email}")
        
        cur.close()
        conn.close()
        
        print("\n💡 To test registration OTP, use a completely new email address!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    show_existing_emails()

#!/usr/bin/env python3
"""
Script to update existing admin users with properly hashed passwords.
This is needed because the current users have plain text passwords.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from werkzeug.security import generate_password_hash
from models import get_db

def update_admin_passwords():
    """Update existing admin users with properly hashed passwords"""
    
    # Default password for all users (you should change this in production)
    DEFAULT_PASSWORD = "admin123"
    
    # Hash the password
    hashed_password = generate_password_hash(DEFAULT_PASSWORD)
    
    # Get database connection
    conn = get_db()
    cur = conn.cursor()
    
    try:
        # Update all existing users with the hashed password
        cur.execute("""
            UPDATE users 
            SET password = %s 
            WHERE password = '12345'
        """, (hashed_password,))
        
        updated_count = cur.rowcount
        conn.commit()
        
        print(f"✅ Successfully updated {updated_count} users with hashed passwords")
        print(f"🔑 Default password for all users: {DEFAULT_PASSWORD}")
        print("\n📋 Updated users:")
        
        # Show the updated users
        cur.execute("SELECT username, role FROM users ORDER BY id")
        users = cur.fetchall()
        
        for username, role in users:
            print(f"   • {username} ({role})")
        
        print(f"\n🌐 You can now test the admin login at: /admin")
        print(f"   Username: any of the above usernames")
        print(f"   Password: {DEFAULT_PASSWORD}")
        
    except Exception as e:
        print(f"❌ Error updating passwords: {str(e)}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    print("🔐 Admin Password Update Script")
    print("=" * 40)
    update_admin_passwords()

#!/usr/bin/env python3
"""
Script to enable OTP for existing customers
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

def enable_otp_for_customers():
    """Enable OTP for all existing customers"""
    conn = get_db()
    cur = conn.cursor()
    
    try:
        print("Enabling OTP for existing customers...")
        
        # Check if OTP fields exist
        cur.execute("SHOW COLUMNS FROM customers LIKE 'otp_enabled'")
        if not cur.fetchone():
            print("❌ OTP fields not found. Please run the migration script first:")
            print("   python run_otp_migration.py")
            return False
        
        # Get all customers
        cur.execute("SELECT id, first_name, last_name, email FROM customers")
        customers = cur.fetchall()
        
        if not customers:
            print("No customers found in database")
            return True
        
        print(f"Found {len(customers)} customers")
        
        # Ask user which customers to enable OTP for
        print("\nOptions:")
        print("1. Enable OTP for ALL customers")
        print("2. Enable OTP for specific customers by email")
        print("3. Enable OTP for customers with specific names")
        print("4. Skip (exit)")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == '1':
            # Enable OTP for all customers
            cur.execute("UPDATE customers SET otp_enabled = TRUE")
            affected_rows = cur.rowcount
            print(f"✓ Enabled OTP for {affected_rows} customers")
            
        elif choice == '2':
            # Enable OTP for specific customers by email
            emails = input("Enter email addresses (comma-separated): ").strip()
            email_list = [email.strip() for email in emails.split(',')]
            
            for email in email_list:
                cur.execute("UPDATE customers SET otp_enabled = TRUE WHERE email = %s", (email,))
                if cur.rowcount > 0:
                    print(f"✓ Enabled OTP for {email}")
                else:
                    print(f"⚠️  Customer with email {email} not found")
            
        elif choice == '3':
            # Enable OTP for customers with specific names
            name = input("Enter customer name (first or last name): ").strip()
            cur.execute("""
                UPDATE customers 
                SET otp_enabled = TRUE 
                WHERE first_name LIKE %s OR last_name LIKE %s
            """, (f'%{name}%', f'%{name}%'))
            
            affected_rows = cur.rowcount
            print(f"✓ Enabled OTP for {affected_rows} customers with name containing '{name}'")
            
        elif choice == '4':
            print("Skipped. No changes made.")
            return True
            
        else:
            print("Invalid choice. Exiting.")
            return False
        
        # Commit changes
        conn.commit()
        
        # Show updated status
        print("\nUpdated OTP status:")
        cur.execute("""
            SELECT 
                COUNT(*) as total_customers,
                SUM(CASE WHEN otp_enabled = TRUE THEN 1 ELSE 0 END) as otp_enabled,
                SUM(CASE WHEN otp_enabled = FALSE OR otp_enabled IS NULL THEN 1 ELSE 0 END) as otp_disabled
            FROM customers
        """)
        
        stats = cur.fetchone()
        print(f"  Total customers: {stats[0]}")
        print(f"  OTP enabled: {stats[1]}")
        print(f"  OTP disabled: {stats[2]}")
        
        return True
        
    except mysql.connector.Error as err:
        print(f"❌ Database error: {err}")
        conn.rollback()
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()

def show_customer_otp_status():
    """Show current OTP status for all customers"""
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    
    try:
        print("\nCurrent OTP status for customers:")
        print("-" * 80)
        print(f"{'ID':<5} {'Name':<30} {'Email':<35} {'OTP Status':<12}")
        print("-" * 80)
        
        cur.execute("""
            SELECT id, first_name, last_name, email, otp_enabled
            FROM customers 
            ORDER BY first_name, last_name
        """)
        
        customers = cur.fetchall()
        
        for customer in customers:
            name = f"{customer['first_name']} {customer['last_name']}"
            otp_status = "✓ Enabled" if customer['otp_enabled'] else "✗ Disabled"
            
            print(f"{customer['id']:<5} {name:<30} {customer['email']:<35} {otp_status:<12}")
        
        print("-" * 80)
        print(f"Total customers: {len(customers)}")
        
    except Exception as e:
        print(f"Error showing customer status: {e}")
    finally:
        cur.close()
        conn.close()

def main():
    """Main function"""
    print("🔐 Customer OTP Management Tool")
    print("=" * 50)
    
    try:
        # Show current status
        show_customer_otp_status()
        
        # Ask if user wants to make changes
        response = input("\nDo you want to enable OTP for customers? (y/n): ").strip().lower()
        
        if response in ['y', 'yes']:
            success = enable_otp_for_customers()
            if success:
                print("\n🎉 OTP setup completed successfully!")
                show_customer_otp_status()
            else:
                print("\n❌ OTP setup failed. Please check the errors above.")
                return 1
        else:
            print("No changes made.")
        
        return 0
        
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
        return 0
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())

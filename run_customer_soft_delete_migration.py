#!/usr/bin/env python3
"""
Customer Soft Delete Migration Script
This script adds soft delete functionality to the customers table.
"""

import os
import sys
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import mysql

def run_migration():
    """Run the customer soft delete migration"""
    app = create_app()
    
    with app.app_context():
        try:
            print("🔄 Starting Customer Soft Delete Migration...")
            print("=" * 50)
            
            # Read the migration SQL file
            migration_file = "scripts/add_soft_delete_to_customers.sql"
            
            if not os.path.exists(migration_file):
                print(f"❌ Migration file not found: {migration_file}")
                return False
            
            with open(migration_file, 'r') as f:
                sql_commands = f.read()
            
            # Split SQL commands by semicolon and execute each one
            commands = [cmd.strip() for cmd in sql_commands.split(';') if cmd.strip()]
            
            conn = mysql.connection
            cur = conn.cursor()
            
            try:
                for i, command in enumerate(commands, 1):
                    if command.startswith('--'):  # Skip comments
                        print(f"📝 Skipping comment: {command[:50]}...")
                        continue
                    
                    print(f"🔄 Executing command {i}/{len(commands)}...")
                    print(f"   SQL: {command[:80]}...")
                    
                    cur.execute(command)
                    print(f"   ✅ Command {i} executed successfully")
                
                conn.commit()
                print("\n🎉 Migration completed successfully!")
                print("✅ Added deleted_at column to customers table")
                print("✅ Added index for better performance")
                print("✅ Added table comment explaining soft delete functionality")
                print("\n💡 The customers table now supports soft delete operations.")
                print("   - Customers can be 'deleted' without losing data")
                print("   - Orders and financial data remain intact")
                print("   - Deleted customers can be restored later")
                
                return True
                
            except Exception as e:
                conn.rollback()
                print(f"❌ Error executing migration: {e}")
                return False
            finally:
                cur.close()
                
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            return False

if __name__ == "__main__":
    success = run_migration()
    if success:
        print("\n🚀 You can now use soft delete functionality in your customer management system!")
        print("   - Run your Flask app to test the new features")
        print("   - Use the 'View Deleted Customers' button to manage deleted customers")
        print("   - Deleted customers will be hidden from the main list but data is preserved")
    else:
        print("\n💥 Migration failed. Please check the error messages above.")
        sys.exit(1)

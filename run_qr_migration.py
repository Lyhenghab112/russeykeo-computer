#!/usr/bin/env python3
"""
Run QR Payment Migration
Creates the payment_sessions table for QR recovery system
"""

import mysql.connector
from config import Config

def run_migration():
    """Run the payment sessions table migration"""
    try:
        # Connect to database
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        
        cur = conn.cursor()
        
        print("🔄 Running QR Payment Migration...")
        
        # Read and execute the migration script
        with open('scripts/create_payment_sessions_table.sql', 'r') as f:
            migration_sql = f.read()
        
        # Split by semicolon and execute each statement
        statements = migration_sql.split(';')
        
        for statement in statements:
            statement = statement.strip()
            if statement and not statement.startswith('--'):
                try:
                    cur.execute(statement)
                    print(f"✅ Executed: {statement[:50]}...")
                except Exception as e:
                    if "already exists" in str(e) or "Duplicate column name" in str(e):
                        print(f"⚠️  Skipped (already exists): {statement[:50]}...")
                    else:
                        print(f"❌ Error: {e}")
                        print(f"   Statement: {statement[:100]}...")
        
        conn.commit()
        print("🎉 Migration completed successfully!")
        
        # Verify table was created
        cur.execute("SHOW TABLES LIKE 'payment_sessions'")
        if cur.fetchone():
            print("✅ payment_sessions table created successfully!")
        else:
            print("❌ payment_sessions table not found!")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    run_migration()

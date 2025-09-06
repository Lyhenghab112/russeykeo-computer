#!/usr/bin/env python3
"""
Address Migration Script
Migrates existing customer addresses to the new atomic address structure
"""

import mysql.connector
from mysql.connector import Error
import os
from datetime import datetime

def get_db_connection():
    """Get database connection using the same config as the main app"""
    try:
        # Import config from the main app
        import sys
        sys.path.append('.')
        from config import Config
        
        connection = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            database=Config.MYSQL_DB,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD
        )
        return connection
    except Error as e:
        print(f"Error connecting to database: {e}")
        return None

def run_sql_file(connection, file_path):
    """Run SQL commands from a file"""
    try:
        cursor = connection.cursor()
        
        with open(file_path, 'r', encoding='utf-8') as file:
            sql_commands = file.read().split(';')
            
        for command in sql_commands:
            command = command.strip()
            if command and not command.startswith('--'):
                cursor.execute(command)
                
        connection.commit()
        print(f"Successfully executed: {file_path}")
        return True
        
    except Error as e:
        print(f"Error executing {file_path}: {e}")
        return False
    finally:
        if cursor:
            cursor.close()

def check_table_exists(connection, table_name):
    """Check if table exists"""
    try:
        cursor = connection.cursor()
        cursor.execute(f"SHOW TABLES LIKE '{table_name}'")
        result = cursor.fetchone()
        return result is not None
    except Error as e:
        print(f"Error checking table {table_name}: {e}")
        return False
    finally:
        if cursor:
            cursor.close()

def backup_existing_data(connection):
    """Create backup of existing customer data"""
    try:
        cursor = connection.cursor()
        
        # Create backup table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customers_backup_address_migration AS 
            SELECT * FROM customers
        """)
        
        connection.commit()
        print("Backup created: customers_backup_address_migration")
        return True
        
    except Error as e:
        print(f"Error creating backup: {e}")
        return False
    finally:
        if cursor:
            cursor.close()

def main():
    """Main migration function"""
    print("Starting Address Migration...")
    print("=" * 50)
    
    # Get database connection
    connection = get_db_connection()
    if not connection:
        print("Failed to connect to database. Exiting.")
        return
    
    try:
        # Step 1: Create backup
        print("Step 1: Creating backup of existing data...")
        if not backup_existing_data(connection):
            print("Failed to create backup. Exiting.")
            return
        
        # Step 2: Create customer_addresses table
        print("Step 2: Creating customer_addresses table...")
        if not run_sql_file(connection, 'scripts/create_customer_addresses_table.sql'):
            print("Failed to create customer_addresses table. Exiting.")
            return
        
        # Step 3: Check if table was created
        if not check_table_exists(connection, 'customer_addresses'):
            print("customer_addresses table was not created. Exiting.")
            return
        
        # Step 4: Migrate existing addresses
        print("Step 4: Migrating existing addresses...")
        if not run_sql_file(connection, 'scripts/migrate_existing_addresses.sql'):
            print("Failed to migrate addresses. Exiting.")
            return
        
        # Step 5: Verify migration
        print("Step 5: Verifying migration...")
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM customer_addresses")
        address_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM customers WHERE address IS NOT NULL AND address != ''")
        original_count = cursor.fetchone()[0]
        
        print(f"Original addresses: {original_count}")
        print(f"Migrated addresses: {address_count}")
        
        if address_count == original_count:
            print("✅ Migration completed successfully!")
        else:
            print("⚠️  Migration completed with warnings. Check the data.")
        
        # Show sample migrated data
        print("\nSample migrated addresses:")
        cursor.execute("""
            SELECT c.first_name, c.last_name, ca.street_name, ca.province
            FROM customers c
            JOIN customer_addresses ca ON c.id = ca.customer_id
            WHERE ca.is_active = TRUE
            LIMIT 5
        """)
        
        for row in cursor.fetchall():
            print(f"  {row[0]} {row[1]}: {row[2]} ({row[3]})")
        
    except Error as e:
        print(f"Migration failed: {e}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
            print("\nDatabase connection closed.")

if __name__ == "__main__":
    main()

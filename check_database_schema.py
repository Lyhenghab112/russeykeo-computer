#!/usr/bin/env python3
"""
Script to check the database schema for products table and verify image columns.
"""

import mysql.connector
from config import Config

def connect_to_database():
    """Connect to the MySQL database."""
    try:
        connection = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        return connection
    except mysql.connector.Error as e:
        print(f"Error connecting to database: {e}")
        return None

def check_products_table_schema(connection):
    """Check the structure of the products table."""
    print("=== Products Table Schema ===")
    
    cursor = connection.cursor()
    try:
        # Get table structure
        cursor.execute("DESCRIBE products")
        columns = cursor.fetchall()
        
        print("Column Name | Data Type | Null | Key | Default | Extra")
        print("-" * 60)
        
        image_columns = []
        for column in columns:
            field, data_type, null, key, default, extra = column
            print(f"{field:<12} | {data_type:<10} | {null:<4} | {key:<3} | {str(default):<7} | {extra}")
            
            # Track image-related columns
            if 'photo' in field.lower() or 'image' in field.lower() or 'view' in field.lower():
                image_columns.append(field)
        
        print(f"\nImage-related columns found: {image_columns}")
        return image_columns
        
    except mysql.connector.Error as e:
        print(f"Error checking table schema: {e}")
        return []
    finally:
        cursor.close()

def check_sample_products(connection, image_columns):
    """Check some sample products to see current image data."""
    print("\n=== Sample Product Image Data ===")
    
    cursor = connection.cursor(dictionary=True)
    try:
        # Build query to select image columns
        image_cols_str = ", ".join(image_columns) if image_columns else "id"
        query = f"SELECT id, name, {image_cols_str} FROM products LIMIT 5"
        
        cursor.execute(query)
        products = cursor.fetchall()
        
        for product in products:
            print(f"\nProduct ID {product['id']}: {product.get('name', 'Unknown')}")
            for col in image_columns:
                value = product.get(col)
                print(f"  {col}: {value if value else 'NULL'}")
                
    except mysql.connector.Error as e:
        print(f"Error checking sample products: {e}")
    finally:
        cursor.close()

def test_update_query(connection):
    """Test the update query structure that the app uses."""
    print("\n=== Testing Update Query Structure ===")
    
    cursor = connection.cursor()
    try:
        # Test a dry-run update query similar to what the app does
        test_updates = {
            'name': 'Test Product',
            'photo': 'test_image.jpg',
            'back_view': 'test_back.jpg'
        }
        
        # Build the query like the app does
        set_clause_parts = []
        update_values = []
        for key, value in test_updates.items():
            set_clause_parts.append(f"`{key}` = %s")
            update_values.append(value)
        
        set_clause = ", ".join(set_clause_parts)
        update_values.append(999999)  # Non-existent product ID for testing
        
        query = f"UPDATE products SET {set_clause} WHERE id = %s"
        print(f"Test query: {query}")
        print(f"Test values: {update_values}")
        
        # Execute but don't commit (it will fail due to non-existent ID)
        cursor.execute(query, tuple(update_values))
        print("✓ Query syntax is valid")
        
    except mysql.connector.Error as e:
        if "doesn't exist" in str(e) or "Unknown column" in str(e):
            print(f"✗ Column issue: {e}")
        else:
            print(f"Query executed successfully (expected failure for non-existent ID): {e}")
    finally:
        cursor.close()

def check_recent_updates(connection):
    """Check for recent updates to see if any image updates are happening."""
    print("\n=== Recent Product Updates ===")
    
    cursor = connection.cursor(dictionary=True)
    try:
        # Check if there's an updated_at column
        cursor.execute("SHOW COLUMNS FROM products LIKE 'updated_at'")
        has_updated_at = cursor.fetchone() is not None
        
        if has_updated_at:
            cursor.execute("""
                SELECT id, name, photo, updated_at 
                FROM products 
                WHERE updated_at IS NOT NULL 
                ORDER BY updated_at DESC 
                LIMIT 10
            """)
            recent_updates = cursor.fetchall()
            
            if recent_updates:
                print("Recent updates found:")
                for product in recent_updates:
                    print(f"  ID {product['id']}: {product['name']} - Updated: {product['updated_at']}")
            else:
                print("No recent updates found")
        else:
            print("No updated_at column found")
            
    except mysql.connector.Error as e:
        print(f"Error checking recent updates: {e}")
    finally:
        cursor.close()

def main():
    """Main function to run all checks."""
    print("Database Schema and Update Logic Verification")
    print("=" * 50)
    
    # Connect to database
    connection = connect_to_database()
    if not connection:
        print("Cannot proceed without database connection")
        return
    
    try:
        # Check table schema
        image_columns = check_products_table_schema(connection)
        
        # Check sample data
        if image_columns:
            check_sample_products(connection, image_columns)
        
        # Test update query
        test_update_query(connection)
        
        # Check recent updates
        check_recent_updates(connection)
        
    finally:
        connection.close()
        print("\nDatabase connection closed")

if __name__ == "__main__":
    main()

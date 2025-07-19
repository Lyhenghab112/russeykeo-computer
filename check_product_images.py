#!/usr/bin/env python3
"""
Script to check the current state of product images in the database
"""

import mysql.connector
from config import Config

def check_product_images():
    """Check which products have image fields populated"""
    
    try:
        # Connect to database
        conn = mysql.connector.connect(
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            host=Config.MYSQL_HOST,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor(dictionary=True)
        
        # Check if the image columns exist
        print("=== Checking if image columns exist ===")
        cur.execute("SHOW COLUMNS FROM products LIKE '%view'")
        image_columns = cur.fetchall()
        print("Image columns found:")
        for col in image_columns:
            print(f"  - {col['Field']}: {col['Type']}")
        
        # Check if photo column exists
        cur.execute("SHOW COLUMNS FROM products LIKE 'photo'")
        photo_columns = cur.fetchall()
        print("Photo columns found:")
        for col in photo_columns:
            print(f"  - {col['Field']}: {col['Type']}")
        
        # Get sample products with their image fields
        print("\n=== Sample products with image fields ===")
        cur.execute("""
            SELECT id, name, photo, back_view, left_rear_view, right_rear_view 
            FROM products 
            ORDER BY id DESC 
            LIMIT 10
        """)
        products = cur.fetchall()
        
        print(f"Found {len(products)} products:")
        for product in products:
            print(f"ID {product['id']}: {product['name']}")
            print(f"  Photo: {product.get('photo', 'NULL')}")
            print(f"  Back View: {product.get('back_view', 'NULL')}")
            print(f"  Left Rear: {product.get('left_rear_view', 'NULL')}")
            print(f"  Right Rear: {product.get('right_rear_view', 'NULL')}")
            print()
        
        # Count products with and without images
        print("=== Image statistics ===")
        cur.execute("SELECT COUNT(*) as total FROM products")
        total = cur.fetchone()['total']
        
        cur.execute("SELECT COUNT(*) as with_photo FROM products WHERE photo IS NOT NULL AND photo != ''")
        with_photo = cur.fetchone()['with_photo']
        
        cur.execute("SELECT COUNT(*) as with_back FROM products WHERE back_view IS NOT NULL AND back_view != ''")
        with_back = cur.fetchone()['with_back']
        
        cur.execute("SELECT COUNT(*) as with_left FROM products WHERE left_rear_view IS NOT NULL AND left_rear_view != ''")
        with_left = cur.fetchone()['with_left']
        
        cur.execute("SELECT COUNT(*) as with_right FROM products WHERE right_rear_view IS NOT NULL AND right_rear_view != ''")
        with_right = cur.fetchone()['with_right']
        
        print(f"Total products: {total}")
        print(f"Products with photo: {with_photo}")
        print(f"Products with back view: {with_back}")
        print(f"Products with left rear view: {with_left}")
        print(f"Products with right rear view: {with_right}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    check_product_images()

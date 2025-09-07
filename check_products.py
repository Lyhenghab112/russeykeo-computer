#!/usr/bin/env python3
"""
Check products in database
"""

import mysql.connector
from config import Config

def check_products():
    try:
        print("Connecting to database...")
        print(f"Host: {Config.MYSQL_HOST}")
        print(f"Port: {Config.MYSQL_PORT}")
        print(f"Database: {Config.MYSQL_DB}")
        print(f"User: {Config.MYSQL_USER}")
        
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB,
            port=Config.MYSQL_PORT,
            connection_timeout=10
        )
        
        cursor = conn.cursor()
        
        # Check total products
        cursor.execute('SELECT COUNT(*) FROM products')
        total_products = cursor.fetchone()[0]
        print(f'\nTotal products in database: {total_products}')
        
        # Check featured products
        cursor.execute('SELECT COUNT(*) FROM products WHERE featured = 1')
        featured_products = cursor.fetchone()[0]
        print(f'Featured products: {featured_products}')
        
        # Check categories
        cursor.execute('SELECT COUNT(*) FROM categories')
        categories = cursor.fetchone()[0]
        print(f'Categories: {categories}')
        
        # Show some product names
        cursor.execute('SELECT name, price, featured FROM products LIMIT 10')
        products = cursor.fetchall()
        print('\nFirst 10 products:')
        for product in products:
            print(f'- {product[0]} - ${product[1]} - Featured: {product[2]}')
        
        cursor.close()
        conn.close()
        print('\nDatabase check completed successfully!')
        
    except Exception as e:
        print(f'Database error: {e}')

if __name__ == "__main__":
    check_products()

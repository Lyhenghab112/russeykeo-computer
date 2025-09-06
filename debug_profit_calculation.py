#!/usr/bin/env python3
"""
Debug script to check profit calculation issues
"""

import mysql.connector
from config import Config

def debug_profit_calculation():
    """Debug the profit calculation by examining actual data"""
    
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor(dictionary=True)
        
        print("🔍 Debugging Profit Calculation Issues")
        print("=" * 50)
        
        # Check product prices and original prices
        print("\n1. Checking Product Prices vs Original Prices:")
        cur.execute("""
            SELECT id, name, price, original_price, 
                   (price - original_price) as price_difference,
                   CASE 
                       WHEN original_price > price THEN 'DISCOUNTED'
                       WHEN original_price = price THEN 'NO DISCOUNT'
                       WHEN original_price < price THEN 'MARKED UP'
                       ELSE 'UNKNOWN'
                   END as price_status
            FROM products 
            ORDER BY (price - original_price) DESC
            LIMIT 10
        """)
        
        products = cur.fetchall()
        for product in products:
            print(f"   Product: {product['name']}")
            print(f"     Current Price: ${product['price']}")
            print(f"     Original Price: ${product['original_price']}")
            print(f"     Difference: ${product['price_difference']}")
            print(f"     Status: {product['price_status']}")
            print()
        
        # Check if there are any completed orders
        print("\n2. Checking Completed Orders:")
        cur.execute("""
            SELECT COUNT(*) as total_orders,
                   SUM(oi.quantity * oi.price) as total_revenue
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE LOWER(o.status) = 'completed'
        """)
        
        order_stats = cur.fetchone()
        print(f"   Total completed orders: {order_stats['total_orders']}")
        print(f"   Total revenue: ${order_stats['total_revenue'] or 0:.2f}")
        
        # Check sample order items with profit calculation
        print("\n3. Sample Order Items Profit Calculation:")
        cur.execute("""
            SELECT oi.order_id, oi.product_id, oi.quantity, oi.price as selling_price,
                   p.original_price, p.name as product_name,
                   (oi.price - p.original_price) as unit_profit,
                   (oi.quantity * (oi.price - p.original_price)) as total_profit
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE LOWER(o.status) = 'completed'
            ORDER BY o.order_date DESC
            LIMIT 5
        """)
        
        order_items = cur.fetchall()
        for item in order_items:
            print(f"   Order #{item['order_id']} - {item['product_name']}")
            print(f"     Quantity: {item['quantity']}")
            print(f"     Selling Price: ${item['selling_price']}")
            print(f"     Original Price: ${item['original_price']}")
            print(f"     Unit Profit: ${item['unit_profit']}")
            print(f"     Total Profit: ${item['total_profit']}")
            print()
        
        # Check monthly sales calculation
        print("\n4. Testing Monthly Sales Profit Calculation:")
        cur.execute("""
            SELECT
                DATE_FORMAT(o.order_date, '%Y-%m') as month,
                SUM(oi.quantity * oi.price) as total_sales,
                SUM(oi.quantity * (oi.price - COALESCE(p.original_price, 0))) as total_profit
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.order_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            AND LOWER(o.status) = 'completed'
            GROUP BY month
            ORDER BY month DESC
        """)
        
        monthly_sales = cur.fetchall()
        for sale in monthly_sales:
            print(f"   Month: {sale['month']}")
            print(f"     Total Sales: ${sale['total_sales']:.2f}")
            print(f"     Total Profit: ${sale['total_profit']:.2f}")
            print()
        
        print("=" * 50)
        print("💡 Analysis Complete!")
        
    except Exception as e:
        print(f"💥 Error: {e}")
        raise
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    debug_profit_calculation()

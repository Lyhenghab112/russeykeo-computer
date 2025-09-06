#!/usr/bin/env python3
"""
Debug why the monthly sales API is returning 0 records
"""

import mysql.connector
from config import Config

def debug_monthly_sales_api():
    """Debug the monthly sales API issue"""
    
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor(dictionary=True)
        
        print("🔍 Debugging Monthly Sales API Issue")
        print("=" * 50)
        
        # Check the date range of orders
        print("\n1. Checking Order Date Range:")
        cur.execute("""
            SELECT 
                MIN(order_date) as earliest_order,
                MAX(order_date) as latest_order,
                COUNT(*) as total_orders
            FROM orders 
            WHERE LOWER(status) = 'completed'
        """)
        
        date_range = cur.fetchone()
        print(f"   Total completed orders: {date_range['total_orders']}")
        print(f"   Earliest order: {date_range['earliest_order']}")
        print(f"   Latest order: {date_range['latest_order']}")
        
        # Check orders by year and month
        print("\n2. Checking Orders by Year/Month:")
        cur.execute("""
            SELECT 
                YEAR(order_date) as year,
                MONTH(order_date) as month,
                COUNT(*) as order_count,
                SUM(oi.quantity * oi.price) as total_sales
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE LOWER(o.status) = 'completed'
            GROUP BY YEAR(order_date), MONTH(order_date)
            ORDER BY year DESC, month DESC
        """)
        
        monthly_orders = cur.fetchall()
        for order in monthly_orders:
            print(f"   {order['year']}-{order['month']:02d}: {order['order_count']} orders, ${order['total_sales']:.2f}")
        
        # Test the exact query from the API
        print("\n3. Testing the API Query:")
        start_date = "2025-01-01"
        end_date = "2025-12-31"
        
        print(f"   Testing with date range: {start_date} to {end_date}")
        
        cur.execute("""
            SELECT
                DATE_FORMAT(o.order_date, '%Y-%m') as month,
                SUM(oi.quantity * oi.price) as total_sales,
                SUM(oi.quantity * (oi.price - p.original_price)) as total_profit
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.order_date BETWEEN %s AND %s
            AND LOWER(o.status) = 'completed'
            AND (p.archived IS NULL OR p.archived = FALSE)
            GROUP BY month
            ORDER BY month ASC
        """, (start_date, end_date))
        
        api_results = cur.fetchall()
        print(f"   API query results: {len(api_results)} records")
        
        for result in api_results:
            print(f"     Month: {result['month']}")
            print(f"       Sales: ${result['total_sales']:.2f}")
            print(f"       Profit: ${result['total_profit']:.2f}")
        
        # Check if there are any archived products
        print("\n4. Checking Archived Products:")
        cur.execute("""
            SELECT COUNT(*) as archived_count
            FROM products 
            WHERE archived = TRUE
        """)
        
        archived_count = cur.fetchone()
        print(f"   Archived products: {archived_count['archived_count']}")
        
        # Check if the issue is with the archived filter
        print("\n5. Testing Without Archived Filter:")
        cur.execute("""
            SELECT
                DATE_FORMAT(o.order_date, '%Y-%m') as month,
                SUM(oi.quantity * oi.price) as total_sales,
                SUM(oi.quantity * (oi.price - p.original_price)) as total_profit
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.order_date BETWEEN %s AND %s
            AND LOWER(o.status) = 'completed'
            GROUP BY month
            ORDER BY month ASC
        """, (start_date, end_date))
        
        no_archived_results = cur.fetchall()
        print(f"   Without archived filter: {len(no_archived_results)} records")
        
        for result in no_archived_results:
            print(f"     Month: {result['month']}")
            print(f"       Sales: ${result['total_sales']:.2f}")
            print(f"       Profit: ${result['total_profit']:.2f}")
        
        print("\n" + "=" * 50)
        print("💡 Debug Complete!")
        
    except Exception as e:
        print(f"💥 Error: {e}")
        raise
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    debug_monthly_sales_api()

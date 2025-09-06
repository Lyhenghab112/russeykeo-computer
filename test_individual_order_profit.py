#!/usr/bin/env python3
"""
Test individual order profit calculations
"""

import mysql.connector
from config import Config

def test_individual_order_profit():
    """Test individual order profit calculations"""
    
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor(dictionary=True)
        
        print("🧪 Testing Individual Order Profit Calculations")
        print("=" * 60)
        
        # Test a few specific orders
        print("\n1. Testing Individual Order Profits:")
        
        # Get some recent orders
        cur.execute("""
            SELECT o.id as order_id, o.order_date, o.total_amount
            FROM orders o
            WHERE LOWER(o.status) = 'completed'
            ORDER BY o.order_date DESC
            LIMIT 5
        """)
        
        orders = cur.fetchall()
        
        for order in orders:
            order_id = order['order_id']
            print(f"\n   📦 Order #{order_id} (Date: {order['order_date']})")
            
            # Get order items with profit calculation
            cur.execute("""
                SELECT 
                    oi.product_id,
                    oi.quantity,
                    oi.price as selling_price,
                    p.original_price,
                    p.name as product_name,
                    (oi.price - p.original_price) as unit_profit,
                    (oi.quantity * (oi.price - p.original_price)) as total_profit
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = %s
            """, (order_id,))
            
            items = cur.fetchall()
            order_total_profit = 0
            
            for item in items:
                unit_profit = item['unit_profit']
                total_profit = item['total_profit']
                order_total_profit += total_profit
                
                print(f"      Product: {item['product_name']}")
                print(f"        Quantity: {item['quantity']}")
                print(f"        Selling Price: ${item['selling_price']:.2f}")
                print(f"        Original Price: ${item['original_price']:.2f}")
                print(f"        Unit Profit: ${unit_profit:.2f}")
                print(f"        Item Total Profit: ${total_profit:.2f}")
            
            print(f"      🎯 Order Total Profit: ${order_total_profit:.2f}")
        
        # Test the exact query from the fixed method
        print("\n2. Testing the Fixed get_monthly_sales_detail Method:")
        
        # Simulate what the method does
        month = "2025-08"
        start_date = f"{month}-01"
        from datetime import datetime
        import calendar
        year, mon = map(int, month.split('-'))
        last_day = calendar.monthrange(year, mon)[1]
        end_date = f"{month}-{last_day:02d}"
        
        print(f"   Testing month: {month} ({start_date} to {end_date})")
        
        cur.execute("""
            SELECT o.id as order_id, o.order_date, c.first_name, c.last_name, o.total_amount
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.order_date BETWEEN %s AND %s
            AND LOWER(o.status) = 'completed'
            ORDER BY o.order_date ASC
            LIMIT 3
        """, (start_date, end_date))
        
        test_orders = cur.fetchall()
        
        for row in test_orders:
            order_id = row['order_id']
            print(f"\n   🔍 Testing Order #{order_id}")
            
            # Calculate profit for this order (same as the fixed method)
            cur.execute("""
                SELECT SUM((oi.price - p.original_price) * oi.quantity) as total_profit
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = %s
            """, (order_id,))
            
            profit_result = cur.fetchone()
            total_profit = float(profit_result['total_profit']) if profit_result and profit_result['total_profit'] else 0.0
            
            print(f"      Customer: {row['first_name']} {row['last_name']}")
            print(f"      Total Amount: ${row['total_amount']:.2f}")
            print(f"      Calculated Profit: ${total_profit:.2f}")
        
        print("\n" + "=" * 60)
        print("💡 Individual order profit calculations should now work!")
        print("💡 Restart your Flask app to see the changes")
        
    except Exception as e:
        print(f"💥 Error: {e}")
        raise
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    test_individual_order_profit()

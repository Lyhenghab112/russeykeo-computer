#!/usr/bin/env python3
"""
Fix profit calculation by updating the business logic
"""

import mysql.connector
from config import Config

def fix_profit_calculation():
    """Fix the profit calculation by updating the business logic"""
    
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor(dictionary=True)
        
        print("🔧 Fixing Profit Calculation")
        print("=" * 50)
        
        # First, let's understand the current data structure
        print("\n1. Current Data Analysis:")
        cur.execute("""
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN price = original_price THEN 1 END) as same_price,
                COUNT(CASE WHEN price < original_price THEN 1 END) as discounted,
                COUNT(CASE WHEN price > original_price THEN 1 END) as marked_up,
                AVG(price) as avg_price,
                AVG(original_price) as avg_original_price
            FROM products
        """)
        
        analysis = cur.fetchone()
        print(f"   Total products: {analysis['total_products']}")
        print(f"   Same price (no discount): {analysis['same_price']}")
        print(f"   Discounted products: {analysis['discounted']}")
        print(f"   Marked up products: {analysis['marked_up']}")
        print(f"   Average current price: ${analysis['avg_price']:.2f}")
        print(f"   Average original price: ${analysis['avg_original_price']:.2f}")
        
        # Check if there are any completed orders
        print("\n2. Checking Order Data:")
        cur.execute("""
            SELECT COUNT(*) as completed_orders
            FROM orders 
            WHERE LOWER(status) = 'completed'
        """)
        
        order_count = cur.fetchone()
        print(f"   Completed orders: {order_count['completed_orders']}")
        
        if order_count['completed_orders'] == 0:
            print("   ⚠️  No completed orders found - this explains why profit is $0")
            print("   💡 You need to have completed orders to see profit calculations")
            return
        
        # Now let's fix the profit calculation
        print("\n3. Fixing Profit Calculation Logic:")
        
        # Option 1: Add a cost_price column for actual profit calculation
        print("   Adding cost_price column for accurate profit calculation...")
        try:
            cur.execute("""
                ALTER TABLE products 
                ADD COLUMN cost_price DECIMAL(10,2) NULL AFTER original_price
            """)
            print("   ✅ cost_price column added")
        except mysql.connector.Error as e:
            if "Duplicate column name" in str(e):
                print("   ⚠️  cost_price column already exists")
            else:
                print(f"   ❌ Error adding cost_price: {e}")
                raise
        
        # Set cost_price to 70% of original_price as a reasonable estimate
        # (You can adjust this percentage based on your business model)
        print("   Setting cost_price to 70% of original_price as estimated cost...")
        cur.execute("""
            UPDATE products 
            SET cost_price = ROUND(original_price * 0.7, 2)
            WHERE cost_price IS NULL
        """)
        print("   ✅ cost_price values set")
        
        # Now let's test the new profit calculation
        print("\n4. Testing New Profit Calculation:")
        cur.execute("""
            SELECT
                DATE_FORMAT(o.order_date, '%Y-%m') as month,
                SUM(oi.quantity * oi.price) as total_sales,
                SUM(oi.quantity * (oi.price - COALESCE(p.cost_price, p.original_price * 0.7))) as total_profit
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
        
        # Update the models.py profit calculation
        print("\n5. Updating Profit Calculation in Code:")
        print("   The profit calculation should now use cost_price instead of original_price")
        print("   Update the SQL query in models.py to:")
        print("   SUM(oi.quantity * (oi.price - COALESCE(p.cost_price, p.original_price * 0.7))) as total_profit")
        
        conn.commit()
        print("\n🎉 Profit calculation fix completed!")
        print("💡 Money insight should now show proper profit calculations")
        
    except Exception as e:
        print(f"💥 Error: {e}")
        raise
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    fix_profit_calculation()

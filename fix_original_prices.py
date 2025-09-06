#!/usr/bin/env python3
"""
Fix the incorrect original_price values that are set to $1.00
"""

import mysql.connector
from config import Config

def fix_original_prices():
    """Fix the incorrect original_price values"""
    
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor(dictionary=True)
        
        print("🔧 Fixing Incorrect Original Prices")
        print("=" * 50)
        
        # Check how many products have incorrect original_price
        print("\n1. Checking Current Original Price Issues:")
        cur.execute("""
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN original_price = 1.00 THEN 1 END) as incorrect_price,
                COUNT(CASE WHEN original_price = price THEN 1 END) as correct_price,
                COUNT(CASE WHEN original_price != price AND original_price != 1.00 THEN 1 END) as different_price
            FROM products
        """)
        
        analysis = cur.fetchone()
        print(f"   Total products: {analysis['total_products']}")
        print(f"   Products with $1.00 original_price: {analysis['incorrect_price']}")
        print(f"   Products with correct original_price: {analysis['correct_price']}")
        print(f"   Products with different original_price: {analysis['different_price']}")
        
        # Fix the $1.00 original_price values
        print("\n2. Fixing $1.00 Original Prices:")
        cur.execute("""
            UPDATE products 
            SET original_price = price 
            WHERE original_price = 1.00
        """)
        
        affected_rows = cur.rowcount
        print(f"   ✅ Updated {affected_rows} products")
        
        # Verify the fix
        print("\n3. Verifying the Fix:")
        cur.execute("""
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN original_price = 1.00 THEN 1 END) as incorrect_price,
                COUNT(CASE WHEN original_price = price THEN 1 END) as correct_price,
                COUNT(CASE WHEN original_price != price AND original_price != 1.00 THEN 1 END) as different_price
            FROM products
        """)
        
        analysis_after = cur.fetchone()
        print(f"   Total products: {analysis_after['total_products']}")
        print(f"   Products with $1.00 original_price: {analysis_after['incorrect_price']}")
        print(f"   Products with correct original_price: {analysis_after['correct_price']}")
        print(f"   Products with different original_price: {analysis_after['different_price']}")
        
        # Now test the profit calculation
        print("\n4. Testing Profit Calculation After Fix:")
        cur.execute("""
            SELECT
                DATE_FORMAT(o.order_date, '%Y-%m') as month,
                SUM(oi.quantity * oi.price) as total_sales,
                SUM(oi.quantity * (oi.price - p.original_price)) as total_profit
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
        
        # Test the total revenue calculation
        print("\n5. Testing Total Revenue Calculation:")
        cur.execute("""
            SELECT 
                COUNT(*) as total_orders,
                SUM(oi.quantity * oi.price) as total_revenue
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE LOWER(o.status) = 'completed'
        """)
        
        revenue_stats = cur.fetchone()
        print(f"   Total completed orders: {revenue_stats['total_orders']}")
        print(f"   Total revenue: ${revenue_stats['total_revenue']:.2f}")
        
        conn.commit()
        print("\n🎉 Original price fix completed!")
        print("💡 Money insight should now show proper revenue and profit calculations")
        print("💡 The profit will now be $0 for products sold at regular price")
        print("💡 For discounted products, profit will show the discount amount")
        
    except Exception as e:
        print(f"💥 Error: {e}")
        raise
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    fix_original_prices()

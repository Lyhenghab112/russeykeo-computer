#!/usr/bin/env python3
"""
Debug script to check product prices for today's orders
"""

from flask import Flask
from flask_mysqldb import MySQL
from config import Config
from datetime import datetime

def debug_product_prices():
    """Check the actual product prices for today's orders"""
    
    try:
        # Create a minimal Flask app for testing
        app = Flask(__name__)
        app.config.from_object(Config)
        
        # Initialize MySQL
        mysql = MySQL()
        mysql.init_app(app)
        
        with app.app_context():
            cursor = mysql.connection.cursor()
            
            # Get today's date
            today = datetime.now().strftime('%Y-%m-%d')
            print(f"🔍 Checking product prices for orders on {today}")
            print("="*60)
            
            # Get today's orders with their items and product details
            cursor.execute("""
                SELECT 
                    o.id as order_id,
                    o.total_amount as order_total,
                    oi.quantity,
                    oi.price as selling_price,
                    p.original_price,
                    p.name as product_name,
                    (oi.quantity * (oi.price - p.original_price)) as item_profit
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE DATE(o.order_date) = %s
                AND LOWER(o.status) = 'completed'
                ORDER BY o.id, oi.id
            """, (today,))
            
            items = cursor.fetchall()
            
            if items:
                print(f"Found {len(items)} order items for today:")
                print("-" * 60)
                
                current_order = None
                order_total_profit = 0
                
                for item in items:
                    order_id, order_total, quantity, selling_price, original_price, product_name, item_profit = item
                    
                    # Show order header if it's a new order
                    if current_order != order_id:
                        if current_order is not None:
                            print(f"  📊 Order {current_order} Total Profit: ${order_total_profit:,.2f}")
                            print()
                        current_order = order_id
                        order_total_profit = 0
                        print(f"🛒 Order {order_id} (Total: ${order_total:,.2f}):")
                    
                    # Calculate profit for this item
                    profit = (selling_price - original_price) * quantity
                    order_total_profit += profit
                    
                    print(f"    • {product_name}")
                    print(f"      Quantity: {quantity}")
                    print(f"      Selling Price: ${selling_price:,.2f}")
                    print(f"      Original Price: ${original_price:,.2f}")
                    print(f"      Item Profit: ${profit:,.2f}")
                    print()
                
                # Show last order's total profit
                if current_order is not None:
                    print(f"  📊 Order {current_order} Total Profit: ${order_total_profit:,.2f}")
                
                # Calculate total profit for all orders
                total_profit = sum(item[6] for item in items)
                print("-" * 60)
                print(f"💰 TOTAL PROFIT FOR TODAY: ${total_profit:,.2f}")
                
            else:
                print("No order items found for today")
            
            cursor.close()
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_product_prices()

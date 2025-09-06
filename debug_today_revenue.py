#!/usr/bin/env python3
"""
Debug script to test the today_revenue API endpoint
"""

import requests
import json
from datetime import datetime

def test_today_revenue_api():
    """Test the today_revenue API endpoint"""
    
    # Get today's date
    today = datetime.now().strftime('%Y-%m-%d')
    print(f"Testing today_revenue API for date: {today}")
    
    # Test the API endpoint
    url = f"http://localhost:5000/auth/staff/api/reports/today_revenue?date={today}"
    
    try:
        response = requests.get(url)
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Response data:")
            print(json.dumps(data, indent=2))
            
            if data.get('success'):
                print(f"\n📊 Today's Revenue: ${data.get('total_revenue', 0):,.2f}")
                print(f"💰 Today's Profit: ${data.get('total_profit', 0):,.2f}")
            else:
                print(f"❌ API Error: {data.get('message', 'Unknown error')}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request Error: {e}")
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")

def test_database_directly():
    """Test the database query directly to see what's happening"""
    print("\n" + "="*50)
    print("TESTING DATABASE QUERY DIRECTLY")
    print("="*50)
    
    try:
        from flask import Flask
        from flask_mysqldb import MySQL
        from config import Config
        from datetime import datetime
        
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
            print(f"Testing database query for date: {today}")
            
            # Test the exact query from the API
            query = """
                SELECT 
                    COALESCE(SUM(o.total_amount), 0) as total_revenue,
                    COALESCE(SUM(oi.quantity * (oi.price - p.original_price)), 0) as total_profit
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE DATE(o.order_date) = %s 
                AND (LOWER(o.status) = 'completed' OR o.approval_status = 'APPROVED')
            """
            
            print(f"Executing query: {query}")
            cursor.execute(query, (today,))
            
            row = cursor.fetchone()
            total_revenue = float(row[0]) if row[0] else 0.0
            total_profit = float(row[1]) if row[1] else 0.0
            
            print(f"Database result:")
            print(f"  Total Revenue: ${total_revenue:,.2f}")
            print(f"  Total Profit: ${total_profit:,.2f}")
            
            # Let's also check individual orders for today
            print(f"\nChecking individual orders for {today}:")
            cursor.execute("""
                SELECT o.id, o.total_amount, o.status, o.approval_status
                FROM orders o
                WHERE DATE(o.order_date) = %s
                ORDER BY o.order_date DESC
            """, (today,))
            
            orders = cursor.fetchall()
            if orders:
                print(f"Found {len(orders)} orders for today:")
                for order in orders:
                    order_id, total_amount, status, approval_status = order
                    print(f"  Order {order_id}: ${total_amount:,.2f} | Status: {status} | Approval: {approval_status}")
            else:
                print("No orders found for today")
            
            cursor.close()
            
    except Exception as e:
        print(f"❌ Database Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🔍 DEBUGGING TODAY'S REVENUE API")
    print("="*50)
    
    # Test the API endpoint
    test_today_revenue_api()
    
    # Test the database directly
    test_database_directly()

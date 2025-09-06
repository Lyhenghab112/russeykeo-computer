#!/usr/bin/env python3
"""
Script to update existing orders that should have 'Completed' status
This is a one-time fix for orders created before the payment confirmation logic was updated
"""

import mysql.connector
from config import MYSQL_CONFIG

def update_pending_orders():
    """Update orders that should have 'Completed' status"""
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        cursor = conn.cursor()
        
        print("🔍 Checking for orders that need status updates...")
        
        # First, let's see what we have
        cursor.execute("""
            SELECT id, status, approval_status, payment_method, order_date 
            FROM orders 
            WHERE status = 'PENDING'
            ORDER BY id DESC
        """)
        
        pending_orders = cursor.fetchall()
        print(f"Found {len(pending_orders)} orders with 'Pending' status:")
        
        for order in pending_orders:
            print(f"  Order {order[0]}: {order[1]} | {order[2]} | {order[3]} | {order[4]}")
        
        if not pending_orders:
            print("✅ No orders need updating!")
            return
        
        # Update orders that should be 'Completed'
        # This is based on the logic that orders with payment_method should be 'Completed'
        # and approval_status should remain 'Pending Approval'
        cursor.execute("""
            UPDATE orders 
            SET status = 'COMPLETED' 
            WHERE status = 'PENDING' 
            AND (payment_method IS NOT NULL OR payment_method != '')
        """)
        
        updated_count = cursor.rowcount
        conn.commit()
        
        print(f"✅ Updated {updated_count} orders from 'Pending' to 'Completed'")
        
        # Show the updated orders
        cursor.execute("""
            SELECT id, status, approval_status, payment_method, order_date 
            FROM orders 
            WHERE status = 'COMPLETED' 
            ORDER BY id DESC 
            LIMIT 10
        """)
        
        completed_orders = cursor.fetchall()
        print(f"\nRecent 'Completed' orders:")
        for order in completed_orders:
            print(f"  Order {order[0]}: {order[1]} | {order[2]} | {order[3]} | {order[4]}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    update_pending_orders()

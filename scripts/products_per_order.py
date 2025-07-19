import mysql.connector
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config import Config

def get_db():
    return mysql.connector.connect(
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        host=Config.MYSQL_HOST,
        database=Config.MYSQL_DB
    )

def get_products_per_order():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT o.id as order_id, c.id as customer_id, c.first_name, c.last_name, COUNT(oi.product_id) as product_count
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id, c.id, c.first_name, c.last_name
            ORDER BY c.id, o.id
        """)
        results = cur.fetchall()
        for row in results:
            print(f"Order {row['order_id']} for customer {row['first_name']} {row['last_name']} (ID: {row['customer_id']}) contains {row['product_count']} products.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    get_products_per_order()

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

def ensure_min_products_per_customer(min_products=5):
    conn = get_db()
    cur = conn.cursor(dictionary=True)

    try:
        # Find customers with fewer than min_products ordered
        cur.execute("""
            SELECT c.id as customer_id, COUNT(oi.id) as product_count
            FROM customers c
            LEFT JOIN orders o ON c.id = o.customer_id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY c.id
            HAVING product_count < %s OR product_count IS NULL
        """, (min_products,))
        customers = cur.fetchall()

        print(f"Found {len(customers)} customers with fewer than {min_products} products ordered.")

        # For each such customer, add orders/order_items to reach min_products
        for customer in customers:
            customer_id = customer['customer_id']
            current_count = customer['product_count'] or 0
            needed = min_products - current_count

            print(f"Customer {customer_id} has {current_count} products, adding {needed} products.")

            # For simplicity, add one order with needed products of a default product_id (e.g., 1)
            # You may want to customize product selection logic

            # Get a valid product_id from products table
            cur.execute("SELECT id, price FROM products LIMIT 1")
            product = cur.fetchone()
            if not product:
                raise Exception("No products found in the database to add to orders.")
            product_id = product['id']
            price = float(product['price'])

            cur.execute("INSERT INTO orders (customer_id, status, order_date, total_amount) VALUES (%s, %s, NOW(), 0)", (customer_id, 'Pending'))
            order_id = cur.lastrowid

            # Insert order_items with discount information
            for _ in range(needed):
                quantity = 1
                # Set original_price equal to price (no discount for these test orders)
                cur.execute("""
                    INSERT INTO order_items (order_id, product_id, quantity, price, original_price, discount_percentage, discount_amount)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (order_id, product_id, quantity, price, price, 0.00, 0.00))

            # Update order total_amount
            total_amount = needed * price
            cur.execute("UPDATE orders SET total_amount = %s WHERE id = %s", (total_amount, order_id))

        conn.commit()
        print("Database updated successfully.")

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    ensure_min_products_per_customer()

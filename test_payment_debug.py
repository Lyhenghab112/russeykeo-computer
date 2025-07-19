import mysql.connector
from config import Config

def test_database_data():
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor(dictionary=True)
        
        # Check customers
        cur.execute("SELECT COUNT(*) as count FROM customers")
        customer_count = cur.fetchone()['count']
        print(f"Total customers: {customer_count}")
        
        if customer_count > 0:
            cur.execute("SELECT id, first_name, last_name, email FROM customers LIMIT 5")
            customers = cur.fetchall()
            print("\nSample customers:")
            for customer in customers:
                print(f"  ID: {customer['id']}, Name: {customer['first_name']} {customer['last_name']}, Email: {customer['email']}")
        
        # Check pre-orders
        cur.execute("SELECT COUNT(*) as count FROM pre_orders")
        preorder_count = cur.fetchone()['count']
        print(f"\nTotal pre-orders: {preorder_count}")
        
        if preorder_count > 0:
            cur.execute("""
                SELECT po.id, po.customer_id, po.status, po.expected_price, po.quantity, po.deposit_amount,
                       p.name as product_name, c.first_name, c.last_name
                FROM pre_orders po
                LEFT JOIN products p ON po.product_id = p.id
                LEFT JOIN customers c ON po.customer_id = c.id
                ORDER BY po.created_date DESC
                LIMIT 5
            """)
            preorders = cur.fetchall()
            print("\nSample pre-orders:")
            for po in preorders:
                total_price = (po['expected_price'] or 0) * (po['quantity'] or 1)
                remaining = total_price - (po['deposit_amount'] or 0)
                print(f"  ID: {po['id']}, Customer: {po['first_name']} {po['last_name']}, Product: {po['product_name']}")
                print(f"    Status: {po['status']}, Total: ${total_price:.2f}, Remaining: ${remaining:.2f}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_database_data()

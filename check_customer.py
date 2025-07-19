import mysql.connector
from config import Config

def check_customer():
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor()
        
        # Check customers table
        print("=== Customers Table ===")
        cur.execute("SELECT id, first_name, last_name, email FROM customers WHERE email = 'test@customer.com'")
        customers = cur.fetchall()
        for customer in customers:
            print(f"Customer ID: {customer[0]}, Name: {customer[1]} {customer[2]}, Email: {customer[3]}")
        
        # Check users table
        print("\n=== Users Table ===")
        cur.execute("SELECT id, username, role FROM users WHERE username = 'test@customer.com'")
        users = cur.fetchall()
        for user in users:
            print(f"User ID: {user[0]}, Username: {user[1]}, Role: {user[2]}")
        
        # Check pre-orders for this customer
        if customers:
            customer_id = customers[0][0]
            print(f"\n=== Pre-orders for Customer ID {customer_id} ===")
            cur.execute("""
                SELECT po.id, po.status, p.name, po.quantity, po.expected_price
                FROM pre_orders po
                JOIN products p ON po.product_id = p.id
                WHERE po.customer_id = %s
            """, (customer_id,))
            preorders = cur.fetchall()
            for po in preorders:
                print(f"Pre-order ID: {po[0]}, Status: {po[1]}, Product: {po[2]}, Qty: {po[3]}, Price: {po[4]}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_customer()

import mysql.connector
from config import Config
from werkzeug.security import generate_password_hash

def create_test_customer():
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor()
        
        # Create a test customer
        first_name = "Test"
        last_name = "Customer"
        email = "test@customer.com"
        password = "password123"  # Simple password for testing
        phone = "1234567890"
        address = "123 Test Street"
        
        # Hash the password
        hashed_password = generate_password_hash(password)
        
        # Check if customer already exists
        cur.execute("SELECT id FROM customers WHERE email = %s", (email,))
        existing = cur.fetchone()
        
        if existing:
            print(f"Test customer already exists with ID: {existing[0]}")
            customer_id = existing[0]
        else:
            # Insert new customer
            cur.execute("""
                INSERT INTO customers (first_name, last_name, email, password, phone, address, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """, (first_name, last_name, email, hashed_password, phone, address))
            conn.commit()
            customer_id = cur.lastrowid
            print(f"Test customer created with ID: {customer_id}")
        
        # Create a test pre-order for this customer
        # First, get a product
        cur.execute("SELECT id, name, price FROM products LIMIT 1")
        product = cur.fetchone()
        
        if product:
            product_id, product_name, product_price = product
            
            # Check if pre-order already exists
            cur.execute("SELECT id FROM pre_orders WHERE customer_id = %s AND product_id = %s", (customer_id, product_id))
            existing_preorder = cur.fetchone()
            
            if not existing_preorder:
                # Create a test pre-order
                deposit_amount = float(product_price) * 0.3
                cur.execute("""
                    INSERT INTO pre_orders (customer_id, product_id, quantity, expected_price,
                                          deposit_amount, status, created_date)
                    VALUES (%s, %s, %s, %s, %s, 'pending', NOW())
                """, (customer_id, product_id, 2, product_price, deposit_amount))
                conn.commit()
                preorder_id = cur.lastrowid
                print(f"Test pre-order created with ID: {preorder_id} for product: {product_name}")
            else:
                print(f"Test pre-order already exists with ID: {existing_preorder[0]}")
        
        print("\nTest data created successfully!")
        print(f"Login credentials:")
        print(f"Email: {email}")
        print(f"Password: {password}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_test_customer()

import mysql.connector
from config import Config

def check_user_account():
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor()
        
        # Check for "long dalan" in customers table
        print("=== Checking Customers Table ===")
        cur.execute("""
            SELECT id, first_name, last_name, email, password 
            FROM customers 
            WHERE CONCAT(first_name, ' ', last_name) LIKE '%long dalan%' 
            OR first_name LIKE '%long%' 
            OR last_name LIKE '%dalan%'
            OR email LIKE '%long%'
            OR email LIKE '%dalan%'
        """)
        customers = cur.fetchall()
        
        if customers:
            for customer in customers:
                print(f"Customer ID: {customer[0]}")
                print(f"Name: {customer[1]} {customer[2]}")
                print(f"Email: {customer[3]}")
                print(f"Has Password: {'Yes' if customer[4] else 'No'}")
                print(f"Password: {customer[4][:20]}..." if customer[4] else "No password")
                print("---")
        else:
            print("No customers found matching 'long dalan'")
        
        # Check users table
        print("\n=== Checking Users Table ===")
        cur.execute("""
            SELECT id, username, role, password 
            FROM users 
            WHERE username LIKE '%long%' 
            OR username LIKE '%dalan%'
        """)
        users = cur.fetchall()
        
        if users:
            for user in users:
                print(f"User ID: {user[0]}")
                print(f"Username: {user[1]}")
                print(f"Role: {user[2]}")
                print(f"Password: {user[3][:20]}..." if user[3] else "No password")
                print("---")
        else:
            print("No users found matching 'long dalan'")
        
        # Check all customers to see the pattern
        print("\n=== All Customers (first 10) ===")
        cur.execute("SELECT id, first_name, last_name, email FROM customers LIMIT 10")
        all_customers = cur.fetchall()
        for customer in all_customers:
            print(f"ID: {customer[0]}, Name: {customer[1]} {customer[2]}, Email: {customer[3]}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_user_account()

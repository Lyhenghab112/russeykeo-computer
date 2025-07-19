import mysql.connector
from config import Config
from werkzeug.security import generate_password_hash

def update_customer_password():
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor()
        
        email = "test@customer.com"
        password = "password123"
        hashed_password = generate_password_hash(password)
        
        # Update the customer with a password
        cur.execute("""
            UPDATE customers 
            SET password = %s 
            WHERE email = %s
        """, (hashed_password, email))
        
        conn.commit()
        
        if cur.rowcount > 0:
            print(f"Successfully updated password for customer: {email}")
            print(f"Password: {password}")
            print(f"Hashed password: {hashed_password[:50]}...")
        else:
            print(f"No customer found with email: {email}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_customer_password()

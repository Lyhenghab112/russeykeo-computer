import mysql.connector
from config import Config

def check_schema():
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor()
        
        # Check customers table schema
        print("=== Customers Table Schema ===")
        cur.execute("DESCRIBE customers")
        columns = cur.fetchall()
        for column in columns:
            print(f"{column[0]}: {column[1]} {column[2]} {column[3]} {column[4]} {column[5]}")
        
        # Check if password column exists
        cur.execute("SHOW COLUMNS FROM customers LIKE 'password'")
        password_column = cur.fetchone()
        if password_column:
            print(f"\nPassword column exists: {password_column}")
        else:
            print("\nPassword column does NOT exist in customers table")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()

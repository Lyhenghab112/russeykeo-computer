import mysql.connector
from config import Config

try:
    # Connect to database
    conn = mysql.connector.connect(
        host=Config.MYSQL_HOST,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        database=Config.MYSQL_DB
    )
    cur = conn.cursor(dictionary=True)
    
    # Check products table structure
    cur.execute("DESCRIBE products")
    columns = cur.fetchall()
    print("Products table structure:")
    for col in columns:
        print(f"  {col['Field']}: {col['Type']}")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'cur' in locals():
        cur.close()
    if 'conn' in locals():
        conn.close()

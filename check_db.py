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
    
    # Check if pre_orders table exists
    cur.execute("SHOW TABLES LIKE 'pre_orders'")
    table_exists = cur.fetchone()
    print(f"Pre-orders table exists: {table_exists is not None}")
    
    if table_exists:
        # Check table structure
        cur.execute("DESCRIBE pre_orders")
        columns = cur.fetchall()
        print("\nTable structure:")
        for col in columns:
            print(f"  {col['Field']}: {col['Type']}")
        
        # Count pre-orders
        cur.execute("SELECT COUNT(*) as count FROM pre_orders")
        count = cur.fetchone()['count']
        print(f"\nTotal pre-orders: {count}")
        
        if count > 0:
            # Show recent pre-orders
            cur.execute("""
                SELECT po.*, p.name as product_name 
                FROM pre_orders po 
                LEFT JOIN products p ON po.product_id = p.id 
                ORDER BY po.created_date DESC 
                LIMIT 5
            """)
            orders = cur.fetchall()
            print("\nRecent pre-orders:")
            for order in orders:
                print(f"  ID: {order['id']}, Product: {order['product_name']}, Status: {order['status']}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    if 'cur' in locals():
        cur.close()
    if 'conn' in locals():
        conn.close()

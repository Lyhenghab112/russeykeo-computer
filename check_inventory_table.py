from models import get_db

def check_inventory():
    print("Checking inventory table structure and data...")
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        
        # Check table structure
        cur.execute("DESCRIBE inventory")
        print("\nInventory Table Structure:")
        for col in cur.fetchall():
            print(f"{col['Field']}: {col['Type']} ({col['Null']})")
        
        # Check sample data
        cur.execute("SELECT * FROM inventory LIMIT 5")
        print("\nSample Inventory Records:")
        for row in cur.fetchall():
            print(row)
            
        cur.close()
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    check_inventory()

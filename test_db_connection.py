from models import get_db

def test_connection():
    try:
        conn = get_db()
        cur = conn.cursor()
        print("Database connection successful!")
        
        # Test users table
        cur.execute("SHOW TABLES LIKE 'users'")
        if cur.fetchone():
            print("Users table exists")
        else:
            print("Users table NOT found")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Connection failed: {str(e)}")

if __name__ == "__main__":
    test_connection()

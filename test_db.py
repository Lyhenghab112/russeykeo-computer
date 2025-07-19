from models import get_db
import traceback

print("Testing database connection...")
try:
    # Test basic connection
    conn = get_db()
    cur = conn.cursor()
        print("1. Connection successful")
        
        # Test users table exists
        cur.execute("SHOW TABLES LIKE 'users'")
        if not cur.fetchone():
            print("ERROR: 'users' table not found")
        else:
            print("2. 'users' table exists")
            
            # Test user records
            cur.execute("SELECT * FROM users LIMIT 1")
            users = cur.fetchall()
            print(f"3. Found {len(users)} user(s)")
            if users:
                print(f"First user: {users[0]}")
                
        cur.close()
    except Exception as e:
        print("ERROR DETAILS:")
        print(str(e))
        print("STACK TRACE:")
        traceback.print_exc()

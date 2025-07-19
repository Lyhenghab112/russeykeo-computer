from app import create_app
from models import mysql, User
from werkzeug.security import check_password_hash
import time

app = create_app()

def verify_login(username, password, max_retries=3):
    for attempt in range(max_retries):
        with app.app_context():
            try:
                # Ensure fresh connection
                try:
                    mysql.connection.ping()
                except:
                    mysql.connection.connect()
                
                user = User.get_by_username(username)
                if not user:
                    print(f"User '{username}' not found")
                    return False
                    
                if check_password_hash(user[2], password) or user[2] == password:
                    print(f"Login successful for user '{username}'")
                    print(f"User details: ID={user[0]}, Role={user[3]}")
                    return True
                else:
                    print("Invalid password")
                    return False
                    
            except Exception as e:
                print(f"Attempt {attempt + 1} failed: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(1)  # Wait before retrying
                    continue
                return False

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: python verify_login.py <username> <password>")
        sys.exit(1)
        
    username = sys.argv[1]
    password = sys.argv[2]
    verify_login(username, password)

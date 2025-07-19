from app import create_app
from models import mysql, User
from werkzeug.security import generate_password_hash

app = create_app()

def migrate_passwords():
    with app.app_context():
        try:
            cur = mysql.connection.cursor()
            # Get all users with plaintext passwords (length < 60 chars)
            cur.execute("SELECT id, password FROM users WHERE LENGTH(password) < 60")
            users = cur.fetchall()
            
            if not users:
                print("No users with plaintext passwords found")
                return True
                
            print(f"Found {len(users)} users with plaintext passwords")
            
            for user_id, plain_password in users:
                hashed = generate_password_hash(plain_password)
                cur.execute(
                    "UPDATE users SET password = %s WHERE id = %s",
                    (hashed, user_id)
                )
                print(f"Updated password for user ID {user_id}")
            
            mysql.connection.commit()
            print("Password migration completed successfully")
            return True
            
        except Exception as e:
            print(f"Migration failed: {str(e)}")
            mysql.connection.rollback()
            return False
        finally:
            cur.close()

if __name__ == "__main__":
    migrate_passwords()

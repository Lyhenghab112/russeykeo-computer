import mysql.connector
from config import Config

def test_mysql_connection():
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        print("MySQL connection successful!")
        conn.close()
        return True
    except Exception as e:
        print(f"MySQL connection failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_mysql_connection()

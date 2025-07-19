import mysql.connector
from datetime import datetime

def test_create_customer():
    config = {
        'user': 'root',
        'password': '12345',
        'host': 'localhost',
        'database': 'computer_shop3'
    }

    first_name = "TestFirst"
    last_name = "TestLast"
    email = "testemail_simple@example.com"

    try:
        conn = mysql.connector.connect(**config)
        cur = conn.cursor()
        now = datetime.now()
        insert_query = """
            INSERT INTO customers (first_name, last_name, email, created_at)
            VALUES (%s, %s, %s, %s)
        """
        cur.execute(insert_query, (first_name, last_name, email, now))
        conn.commit()
        print(f"Customer created successfully with ID: {cur.lastrowid}")
        cur.close()
        conn.close()
    except mysql.connector.Error as err:
        print(f"Failed to create customer: {err}")

if __name__ == "__main__":
    test_create_customer()

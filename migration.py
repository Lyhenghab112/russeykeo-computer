import mysql.connector
from config import Config

def get_db():
    return mysql.connector.connect(
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        host=Config.MYSQL_HOST,
        database=Config.MYSQL_DB
    )

def migrate():
    conn = get_db()
    cur = conn.cursor()
    try:
        # Check if the column already exists
        cur.execute("SHOW COLUMNS FROM products LIKE 'supplier_id'")
        if not cur.fetchone():
            cur.execute("ALTER TABLE products ADD COLUMN supplier_id INT")
            print("Column 'supplier_id' added to 'products' table.")
        else:
            print("Column 'supplier_id' already exists in 'products' table.")
        
        # Add foreign key constraint
        try:
            cur.execute("ALTER TABLE products ADD CONSTRAINT fk_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id)")
            print("Foreign key constraint 'fk_supplier_id' added.")
        except mysql.connector.Error as err:
            if err.errno == 1826: # Foreign key already exists
                print("Foreign key 'fk_supplier_id' already exists.")
            else:
                raise
    finally:
        cur.close()
        conn.close()

def migrate():
    conn = get_db()
    cur = conn.cursor()
    try:
        # Check if the column already exists in products table
        cur.execute("SHOW COLUMNS FROM products LIKE 'supplier_id'")
        if not cur.fetchone():
            cur.execute("ALTER TABLE products ADD COLUMN supplier_id INT")
            print("Column 'supplier_id' added to 'products' table.")
        else:
            print("Column 'supplier_id' already exists in 'products' table.")
        
        # Add foreign key constraint to products table
        try:
            cur.execute("ALTER TABLE products ADD CONSTRAINT fk_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id)")
            print("Foreign key constraint 'fk_supplier_id' added.")
        except mysql.connector.Error as err:
            if err.errno == 1826: # Foreign key already exists
                print("Foreign key 'fk_supplier_id' already exists.")
            else:
                raise

        # Check if the column already exists in customers table
        cur.execute("SHOW COLUMNS FROM customers LIKE 'created_at'")
        if not cur.fetchone():
            cur.execute("ALTER TABLE customers ADD COLUMN created_at DATETIME")
            print("Column 'created_at' added to 'customers' table.")
        else:
            print("Column 'created_at' already exists in 'customers' table.")

    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate()
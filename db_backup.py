import os
from datetime import datetime
from app import create_app
from models import mysql

app = create_app()

def backup_database():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"db_backup_{timestamp}.sql"
    
    with app.app_context():
        try:
            # Create backup directory if it doesn't exist
            os.makedirs("backups", exist_ok=True)
            
            # Dump database to SQL file
            with open(f"backups/{backup_file}", "w") as f:
                cur = mysql.connection.cursor()
                cur.execute("SHOW TABLES")
                tables = [table[0] for table in cur.fetchall()]
                
                for table in tables:
                    cur.execute(f"SELECT * FROM {table}")
                    rows = cur.fetchall()
                    f.write(f"\n-- Table: {table}\n")
                    for row in rows:
                        f.write(f"INSERT INTO {table} VALUES {row};\n")
                
                cur.close()
            
            print(f"Database backup created: backups/{backup_file}")
            return True
        except Exception as e:
            print(f"Backup failed: {str(e)}")
            return False

if __name__ == "__main__":
    backup_database()

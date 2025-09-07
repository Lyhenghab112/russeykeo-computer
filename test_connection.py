#!/usr/bin/env python3
import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

# Get environment variables
host = os.getenv('MYSQL_HOST', 'localhost')
user = os.getenv('MYSQL_USER', 'root')
password = os.getenv('MYSQL_PASSWORD', '12345')
database = os.getenv('MYSQL_DB', 'computershop5')
port = int(os.getenv('MYSQL_PORT', 3306))

print("=== Connection Details ===")
print(f"Host: {host}")
print(f"User: {user}")
print(f"Password: {password[:5]}...{password[-5:] if len(password) > 10 else '***'}")
print(f"Database: {database}")
print(f"Port: {port}")
print("=" * 30)

try:
    print("Attempting to connect...")
    conn = mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        port=port,
        use_pure=True
    )
    print("✅ SUCCESS: Connected to database!")
    
    # Test a simple query
    cursor = conn.cursor()
    cursor.execute("SELECT 1")
    result = cursor.fetchone()
    print(f"✅ Query test successful: {result}")
    
    cursor.close()
    conn.close()
    print("✅ Connection closed successfully!")
    
except Exception as e:
    print(f"❌ ERROR: {e}")
    print(f"Error type: {type(e).__name__}")

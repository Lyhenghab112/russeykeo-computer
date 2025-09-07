#!/usr/bin/env python3
import mysql.connector

# Railway connection details (from your screenshot)
host = "shuttle.proxy.rlwy.net"
user = "root"
password = "YEQSqCUDYMKHVEqVtTRkCmoYkssrmasc"
database = "railway"
port = 40319

print("=== Railway Connection Test ===")
print(f"Host: {host}")
print(f"User: {user}")
print(f"Password: {password[:5]}...{password[-5:]}")
print(f"Database: {database}")
print(f"Port: {port}")
print("=" * 40)

try:
    print("Attempting to connect to Railway...")
    conn = mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        port=port,
        use_pure=True
    )
    print("✅ SUCCESS: Connected to Railway database!")
    
    # Test a simple query
    cursor = conn.cursor()
    cursor.execute("SELECT 1")
    result = cursor.fetchone()
    print(f"✅ Query test successful: {result}")
    
    # Test if our tables exist
    cursor.execute("SHOW TABLES")
    tables = cursor.fetchall()
    print(f"✅ Found {len(tables)} tables in database")
    for table in tables[:5]:  # Show first 5 tables
        print(f"  - {table[0]}")
    
    cursor.close()
    conn.close()
    print("✅ Connection closed successfully!")
    
except Exception as e:
    print(f"❌ ERROR: {e}")
    print(f"Error type: {type(e).__name__}")
    
    # Try with different authentication plugin
    print("\n=== Trying with different auth plugin ===")
    try:
        conn = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            database=database,
            port=port,
            use_pure=True,
            auth_plugin='mysql_native_password'
        )
        print("✅ SUCCESS with mysql_native_password!")
        conn.close()
    except Exception as e2:
        print(f"❌ Also failed with mysql_native_password: {e2}")

import mysql.connector
import sys

def fix_warranty_schema():
    try:
        # Connect to database using config from the app
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password='12345',
            database='computer_shop3'
        )
        cur = conn.cursor()
        
        print("=== FIXING WARRANTY SCHEMA ===")
        
        # Step 1: Check current warranty-related columns
        cur.execute("""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'products' 
            AND COLUMN_NAME LIKE '%warranty%'
            ORDER BY COLUMN_NAME
        """)
        columns = cur.fetchall()
        
        print("Current warranty-related columns in products table:")
        warranty_varchar_exists = False
        warranty_id_exists = False
        
        for col in columns:
            print(f"  {col[0]} ({col[1]}) - Nullable: {col[2]}")
            if col[0] == 'warranty' and 'varchar' in col[1].lower():
                warranty_varchar_exists = True
            elif col[0] == 'warranty_id' and 'int' in col[1].lower():
                warranty_id_exists = True
        
        # Step 2: Verify warranty_id is working correctly
        if warranty_id_exists:
            print("\n=== VERIFYING WARRANTY_ID FUNCTIONALITY ===")
            cur.execute("""
                SELECT COUNT(*) FROM products WHERE warranty_id IS NOT NULL
            """)
            products_with_warranty = cur.fetchone()[0]
            print(f"Products with warranty_id assigned: {products_with_warranty}")
            
            cur.execute("""
                SELECT p.id, p.name, p.warranty_id, w.warranty_name
                FROM products p
                LEFT JOIN warranty w ON p.warranty_id = w.warranty_id
                LIMIT 3
            """)
            sample_data = cur.fetchall()
            
            print("Sample products with warranty information:")
            for row in sample_data:
                warranty_name = row[3] if row[3] else "No warranty"
                print(f"  Product {row[0]}: warranty_id={row[2]} -> '{warranty_name}'")
        
        # Step 3: Check and remove unused warranty VARCHAR column
        if warranty_varchar_exists:
            print("\n=== CHECKING UNUSED WARRANTY VARCHAR COLUMN ===")
            
            # Check if warranty VARCHAR has any non-NULL data
            cur.execute("SELECT COUNT(*) FROM products WHERE warranty IS NOT NULL AND warranty != ''")
            non_null_count = cur.fetchone()[0]
            
            if non_null_count == 0:
                print("✅ The 'warranty' VARCHAR column contains only NULL values - safe to remove.")
                print("🔧 Removing unused 'warranty' VARCHAR column...")
                
                try:
                    cur.execute("ALTER TABLE products DROP COLUMN warranty")
                    conn.commit()
                    print("✅ Successfully removed the unused 'warranty' VARCHAR column!")
                except Exception as e:
                    print(f"❌ Error removing column: {e}")
                    conn.rollback()
                    return False
            else:
                print(f"⚠️  WARNING: {non_null_count} products have data in 'warranty' VARCHAR column.")
                print("   Manual review required before removal.")
                return False
        
        # Step 4: Verify the fix
        print("\n=== VERIFICATION AFTER FIX ===")
        cur.execute("""
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'products' 
            AND COLUMN_NAME LIKE '%warranty%'
            ORDER BY COLUMN_NAME
        """)
        remaining_columns = cur.fetchall()
        
        print("Remaining warranty-related columns:")
        for col in remaining_columns:
            print(f"  ✅ {col[0]} ({col[1]})")
        
        # Final test of warranty functionality
        cur.execute("""
            SELECT p.id, p.name, p.warranty_id, w.warranty_name
            FROM products p
            LEFT JOIN warranty w ON p.warranty_id = w.warranty_id
            WHERE p.warranty_id IS NOT NULL
            LIMIT 3
        """)
        final_test = cur.fetchall()
        
        print("\nFinal test - warranty functionality:")
        for row in final_test:
            print(f"  ✅ Product {row[0]}: warranty_id={row[2]} -> '{row[3]}'")
        
        print("\n🎉 WARRANTY SCHEMA FIXED SUCCESSFULLY!")
        print("   - Removed unused 'warranty' VARCHAR column")
        print("   - Kept 'warranty_id' INT foreign key column")
        print("   - Warranty functionality working correctly")
        
        cur.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = fix_warranty_schema()
    if success:
        print("\n✅ Schema fix completed successfully!")
    else:
        print("\n❌ Schema fix failed. Please review the errors above.")
        sys.exit(1)

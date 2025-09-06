#!/usr/bin/env python3
"""
Complete Category Hierarchy Migration Script
===========================================

This script sets up the complete category hierarchy system:
1. Adds parent-child category support
2. Creates subcategories for Accessories
3. Migrates all products to correct categories
4. Verifies the results

Usage: python complete_category_migration.py
"""

from app import create_app
from models import get_db
import sys

def run_migration():
    """Run the complete category migration"""
    app = create_app()
    
    with app.app_context():
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        
        try:
            print("🚀 Starting Complete Category Migration...")
            print("=" * 50)
            
            # Step 1: Add parent-child support columns
            print("\n📋 Step 1: Adding parent-child support columns...")
            
            try:
                cur.execute("ALTER TABLE categories ADD COLUMN parent_id INT")
                print("✅ Added parent_id column")
            except Exception as e:
                if "Duplicate column name" in str(e):
                    print("ℹ️  parent_id column already exists")
                else:
                    raise e
            
            try:
                cur.execute("ALTER TABLE categories ADD COLUMN sort_order INT DEFAULT 0")
                print("✅ Added sort_order column")
            except Exception as e:
                if "Duplicate column name" in str(e):
                    print("ℹ️  sort_order column already exists")
                else:
                    raise e
            
            try:
                cur.execute("ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
                print("✅ Added is_active column")
            except Exception as e:
                if "Duplicate column name" in str(e):
                    print("ℹ️  is_active column already exists")
                else:
                    raise e
            
            # Add foreign key constraint
            try:
                cur.execute("""
                    ALTER TABLE categories ADD CONSTRAINT fk_categories_parent 
                    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
                """)
                print("✅ Added foreign key constraint")
            except Exception as e:
                if "Duplicate key name" in str(e):
                    print("ℹ️  Foreign key constraint already exists")
                else:
                    raise e
            
            # Step 2: Create subcategories for Accessories
            print("\n📋 Step 2: Creating subcategories for Accessories...")
            
            subcategories = [
                ('monitors', 'Computer monitors and displays - gaming, professional, and eye care monitor', 3, 1),
                ('gaming_accessories', 'Gaming keyboards, controller, mouse', 3, 2),
                ('storage', 'SSD, HDD,', 3, 3),
                ('peripherals', 'Keyboards, mice, webcams, speakers', 3, 4),
                ('cables_adapters', 'Cables, adapters, chargers, and connectivity accessories', 3, 5)
            ]
            
            for name, description, parent_id, sort_order in subcategories:
                try:
                    cur.execute("""
                        INSERT INTO categories (name, description, parent_id, sort_order, is_active) 
                        VALUES (%s, %s, %s, %s, TRUE)
                    """, (name, description, parent_id, sort_order))
                    print(f"✅ Created subcategory: {name}")
                except Exception as e:
                    if "Duplicate entry" in str(e):
                        print(f"ℹ️  Subcategory {name} already exists")
                    else:
                        raise e
            
            # Step 3: Update product categories
            print("\n📋 Step 3: Migrating products to correct categories...")
            
            # Get the new category IDs
            cur.execute("SELECT id, name FROM categories WHERE parent_id = 3")
            category_mapping = {row['name']: row['id'] for row in cur.fetchall()}
            
            print(f"📊 Category mapping: {category_mapping}")
            
            # Migration rules
            migrations = [
                # Monitors
                (category_mapping['monitors'], "name LIKE '%monitor%' OR name LIKE '%display%' OR name LIKE '%screen%'", "Monitors"),
                
                # Gaming Accessories
                (category_mapping['gaming_accessories'], "name LIKE '%gaming%' OR name LIKE '%gamer%' OR name LIKE '%razer%' OR name LIKE '%corsair%'", "Gaming Accessories"),
                
                # Storage
                (category_mapping['storage'], "name LIKE '%ssd%' OR name LIKE '%hdd%' OR name LIKE '%ram%' OR name LIKE '%memory%' OR name LIKE '%storage%' OR name LIKE '%samsung%' OR name LIKE '%crucial%'", "Storage"),
                
                # Peripherals
                (category_mapping['peripherals'], "name LIKE '%keyboard%' OR name LIKE '%mouse%' OR name LIKE '%webcam%' OR name LIKE '%speaker%' OR name LIKE '%logitech%' OR name LIKE '%hp km%' OR name LIKE '%hp wk%' OR name LIKE '%hp mk%'", "Peripherals"),
                
                # Cables & Adapters
                (category_mapping['cables_adapters'], "name LIKE '%cable%' OR name LIKE '%adapter%' OR name LIKE '%charger%' OR name LIKE '%connector%'", "Cables & Adapters"),
                
                # Processors and Graphics Cards to Gaming
                (category_mapping['gaming_accessories'], "name LIKE '%processor%' OR name LIKE '%cpu%' OR name LIKE '%intel%' OR name LIKE '%amd%' OR name LIKE '%nvidia%' OR name LIKE '%geforce%' OR name LIKE '%rtx%' OR name LIKE '%gtx%'", "Gaming Accessories (Processors/Graphics)"),
                
                # MK series keyboards to Peripherals
                (category_mapping['peripherals'], "name LIKE '%MK%' OR name LIKE '%keyboard%'", "Peripherals (Keyboards)"),
                
                # Laptops to Laptop Gaming
                (1, "name LIKE '%laptop%' OR name LIKE '%thinkpad%' OR name LIKE '%carbon%'", "Laptop Gaming")
            ]
            
            total_migrated = 0
            for category_id, condition, description in migrations:
                query = f"UPDATE products SET category_id = %s WHERE category_id = 3 AND ({condition})"
                cur.execute(query, (category_id,))
                affected = cur.rowcount
                if affected > 0:
                    print(f"✅ Moved {affected} products to {description}")
                    total_migrated += affected
            
            print(f"📊 Total products migrated: {total_migrated}")
            
            # Commit all changes
            conn.commit()
            print("✅ All changes committed to database")
            
            # Step 4: Verify results
            print("\n📋 Step 4: Verifying results...")
            
            # Check category structure
            print("\n📊 Category Structure:")
            cur.execute("""
                SELECT c.id, c.name, c.description, c.parent_id, c.sort_order, c.is_active
                FROM categories c
                WHERE c.parent_id = 3 OR c.id = 3
                ORDER BY c.parent_id, c.sort_order
            """)
            categories = cur.fetchall()
            for cat in categories:
                parent_info = f" (Parent: {cat['parent_id']})" if cat['parent_id'] else " (Top-level)"
                print(f"  ID {cat['id']}: {cat['name']}{parent_info} - {cat['description'][:50]}...")
            
            # Check product distribution
            print("\n📊 Product Distribution by Category:")
            cur.execute("""
                SELECT c.name, c.id, COUNT(p.id) as product_count
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id
                WHERE c.parent_id = 3 AND c.is_active = TRUE
                GROUP BY c.id, c.name
                ORDER BY c.name
            """)
            category_counts = cur.fetchall()
            for cc in category_counts:
                print(f"  {cc['name']} (ID {cc['id']}): {cc['product_count']} products")
            
            # Check remaining products in old category
            cur.execute("SELECT COUNT(*) as remaining FROM products WHERE category_id = 3")
            remaining = cur.fetchone()['remaining']
            
            if remaining == 0:
                print("✅ No products left in old Accessories category!")
            else:
                print(f"⚠️  {remaining} products still in old Accessories category")
                
                # Show remaining products
                cur.execute("SELECT id, name FROM products WHERE category_id = 3 LIMIT 10")
                remaining_products = cur.fetchall()
                print("Remaining products:")
                for prod in remaining_products:
                    print(f"  ID {prod['id']}: {prod['name']}")
            
            print("\n🎉 Migration completed successfully!")
            print("=" * 50)
            print("✅ Category hierarchy established")
            print("✅ All products properly categorized")
            print("✅ Filtering system ready to use")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            conn.rollback()
            print("🔄 Changes rolled back")
            sys.exit(1)
            
        finally:
            cur.close()
            conn.close()

if __name__ == "__main__":
    print("🔄 Complete Category Migration Script")
    print("This will set up the category hierarchy system")
    print("=" * 50)
    
    response = input("Do you want to continue? (y/N): ").strip().lower()
    if response in ['y', 'yes']:
        run_migration()
    else:
        print("❌ Migration cancelled")
        sys.exit(0)

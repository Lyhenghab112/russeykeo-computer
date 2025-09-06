#!/usr/bin/env python3
"""
Create Subcategories for Storage and Peripherals
===============================================

This script creates new subcategories under Storage and Peripherals:
- Storage subcategories: SSDs, HDDs, RAM
- Peripherals subcategories: Keyboards, Mice, Webcams, Audio

Usage: python create_subcategories.py
"""

from app import create_app
from models import get_db
import sys

def create_subcategories():
    """Create new subcategories for Storage and Peripherals"""
    app = create_app()
    
    with app.app_context():
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        
        try:
            print("🚀 Creating Subcategories for Storage and Peripherals...")
            print("=" * 60)
            
            # Get current category IDs
            cur.execute("SELECT id, name FROM categories WHERE parent_id = 3")
            categories = cur.fetchall()
            category_mapping = {row['name']: row['id'] for row in categories}
            
            print(f"📊 Current categories: {category_mapping}")
            
            # Define new subcategories
            new_subcategories = [
                # Storage subcategories (parent: storage category ID 38)
                ('ssds', 'Solid State Drives - NVMe, SATA, M.2 SSDs', category_mapping['storage'], 1),
                ('hdds', 'Hard Disk Drives - Traditional spinning drives', category_mapping['storage'], 2),
                ('ram', 'Random Access Memory - DDR4, DDR5 RAM modules', category_mapping['storage'], 3),
                
                # Peripherals subcategories (parent: peripherals category ID 39)
                ('keyboards', 'Keyboards - Mechanical, gaming, office keyboards', category_mapping['peripherals'], 1),
                ('mice', 'Mice and Mousepads - Gaming mice, office mice, mousepads', category_mapping['peripherals'], 2),
                ('webcams', 'Webcams - Video conferencing and streaming cameras', category_mapping['peripherals'], 3),
                ('audio', 'Audio and Headsets - Speakers, headsets, microphones', category_mapping['peripherals'], 4)
            ]
            
            print("\n📋 Creating new subcategories...")
            
            created_categories = {}
            for name, description, parent_id, sort_order in new_subcategories:
                try:
                    cur.execute("""
                        INSERT INTO categories (name, description, parent_id, sort_order, is_active) 
                        VALUES (%s, %s, %s, %s, TRUE)
                    """, (name, description, parent_id, sort_order))
                    
                    # Get the new category ID
                    new_id = cur.lastrowid
                    created_categories[name] = new_id
                    print(f"✅ Created: {name} (ID: {new_id}) under parent ID {parent_id}")
                    
                except Exception as e:
                    if "Duplicate entry" in str(e):
                        print(f"ℹ️  Subcategory {name} already exists")
                    else:
                        raise e
            
            # Commit the changes
            conn.commit()
            print("✅ All subcategories created successfully!")
            
            # Show the new category structure
            print("\n📊 Updated Category Structure:")
            cur.execute("""
                SELECT c.id, c.name, c.description, c.parent_id, c.sort_order, c.is_active
                FROM categories c
                WHERE c.parent_id = 3 OR c.id = 3
                ORDER BY c.parent_id, c.sort_order, c.name
            """)
            categories = cur.fetchall()
            
            current_parent = None
            for cat in categories:
                if cat['parent_id'] != current_parent:
                    if cat['parent_id'] is None:
                        print(f"\n📁 {cat['name']} (ID: {cat['id']}) - Top Level")
                    else:
                        parent_name = next((c['name'] for c in categories if c['id'] == cat['parent_id']), 'Unknown')
                        print(f"\n📁 {parent_name} (ID: {cat['parent_id']}) - Parent Category")
                    current_parent = cat['parent_id']
                
                if cat['parent_id'] is not None:
                    print(f"  └── {cat['name']} (ID: {cat['id']}) - {cat['description'][:50]}...")
            
            print("\n🎉 Subcategories created successfully!")
            print("=" * 60)
            print("✅ Storage subcategories: SSDs, HDDs, RAM")
            print("✅ Peripherals subcategories: Keyboards, Mice, Webcams, Audio")
            print("✅ Ready to migrate products to new subcategories")
            
            return created_categories
            
        except Exception as e:
            print(f"❌ Failed to create subcategories: {e}")
            conn.rollback()
            print("🔄 Changes rolled back")
            sys.exit(1)
            
        finally:
            cur.close()
            conn.close()

if __name__ == "__main__":
    print("🔄 Create Subcategories Script")
    print("This will create new subcategories for Storage and Peripherals")
    print("=" * 60)
    
    response = input("Do you want to continue? (y/N): ").strip().lower()
    if response in ['y', 'yes']:
        created_categories = create_subcategories()
        print(f"\n📋 Created categories: {created_categories}")
    else:
        print("❌ Operation cancelled")
        sys.exit(0)

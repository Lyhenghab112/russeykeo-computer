#!/usr/bin/env python3
"""
Script to add sample discounts to products for testing
"""

import requests
import json

def add_sample_discounts():
    """Add sample discounts to some products for testing"""
    
    # Sample discount data - we'll add 10-20% discounts to some popular products
    discount_data = [
        {
            "product_id": 51,  # MSI Katana laptop
            "original_price": 2499.00,
            "current_price": 2249.00,  # 10% discount
            "description": "MSI Katana - 10% off"
        },
        {
            "product_id": 52,  # Another popular laptop
            "original_price": 899.00,
            "current_price": 719.00,  # 20% discount
            "description": "Popular Laptop - 20% off"
        },
        {
            "product_id": 53,  # Desktop computer
            "original_price": 1299.00,
            "current_price": 1039.00,  # 20% discount
            "description": "Gaming Desktop - 20% off"
        },
        {
            "product_id": 54,  # Accessory
            "original_price": 199.00,
            "current_price": 159.00,  # 20% discount
            "description": "Gaming Accessory - 20% off"
        },
        {
            "product_id": 55,  # Another laptop
            "original_price": 699.00,
            "current_price": 559.00,  # 20% discount
            "description": "Office Laptop - 20% off"
        }
    ]
    
    print("Adding sample discounts to products...")
    print("=" * 50)
    
    for discount in discount_data:
        print(f"\nProcessing product ID {discount['product_id']}: {discount['description']}")
        
        # First, get the current product info
        try:
            response = requests.get(f"http://localhost:5000/api/walk-in/products?page=1&page_size=100")
            if response.status_code == 200:
                data = response.json()
                if data['success']:
                    products = data['products']
                    product = next((p for p in products if p['id'] == discount['product_id']), None)
                    
                    if product:
                        print(f"  Current: {product['name']}")
                        print(f"  Current Price: ${product['price']}")
                        print(f"  Original Price: ${product.get('original_price', 'N/A')}")
                        
                        # Check if this product already has a discount
                        if product.get('has_discount'):
                            print(f"  Already has discount: {product.get('discount_percentage')}%")
                        else:
                            print(f"  No discount currently")
                            
                            # Here you would update the database to set original_price
                            # For now, we'll just show what would be updated
                            print(f"  Would update to:")
                            print(f"    Original Price: ${discount['original_price']}")
                            print(f"    Current Price: ${discount['current_price']}")
                            print(f"    Discount: {((discount['original_price'] - discount['current_price']) / discount['original_price'] * 100):.1f}%")
                    else:
                        print(f"  Product ID {discount['product_id']} not found")
                else:
                    print(f"  Error getting products: {data.get('error')}")
            else:
                print(f"  HTTP Error: {response.status_code}")
                
        except Exception as e:
            print(f"  Error: {e}")
    
    print("\n" + "=" * 50)
    print("Note: This script only shows what discounts would be added.")
    print("To actually add discounts, you need to update the database directly.")
    print("\nYou can run this SQL command to add sample discounts:")
    print("""
    -- Add sample discounts to products
    UPDATE products SET original_price = 2499.00 WHERE id = 51;
    UPDATE products SET original_price = 899.00 WHERE id = 52;
    UPDATE products SET original_price = 1299.00 WHERE id = 53;
    UPDATE products SET original_price = 199.00 WHERE id = 54;
    UPDATE products SET original_price = 699.00 WHERE id = 55;
    """)

if __name__ == "__main__":
    add_sample_discounts()

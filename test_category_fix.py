#!/usr/bin/env python3
"""
Test script to verify that the category fix is working correctly.
"""

import requests
import json

def test_api_product_endpoint():
    """Test the API endpoint that returns individual product data."""
    print("=== Testing API Product Endpoint ===")
    
    # Test with product ID 273 (the one from the screenshot)
    try:
        response = requests.get('http://localhost:5000/api/products/273')
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                product = data
                print(f"✅ Product API working")
                print(f"   Product Name: {product.get('name', 'N/A')}")
                print(f"   Category ID: {product.get('category_id', 'N/A')}")
                print(f"   Category Name: {product.get('category', 'N/A')}")
            else:
                print(f"❌ API returned error: {data.get('error', 'Unknown error')}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_staff_inventory_endpoint():
    """Test the staff inventory endpoint that returns product lists."""
    print("\n=== Testing Staff Inventory Endpoint ===")
    
    try:
        response = requests.get('http://localhost:5000/staff/inventory/search?page=1&page_size=5')
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                products = data.get('products', [])
                print(f"✅ Staff Inventory API working")
                print(f"   Found {len(products)} products")
                
                for i, product in enumerate(products[:3]):  # Show first 3 products
                    print(f"   Product {i+1}:")
                    print(f"     ID: {product.get('id', 'N/A')}")
                    print(f"     Name: {product.get('name', 'N/A')}")
                    print(f"     Category ID: {product.get('category_id', 'N/A')}")
                    print(f"     Category Name: {product.get('category_name', 'N/A')}")
            else:
                print(f"❌ API returned error: {data.get('error', 'Unknown error')}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_search_functionality():
    """Test the search functionality."""
    print("\n=== Testing Search Functionality ===")
    
    try:
        # Test search with a common term
        response = requests.get('http://localhost:5000/staff/inventory/search?q=MSI&page=1&page_size=3')
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                products = data.get('products', [])
                print(f"✅ Search functionality working")
                print(f"   Found {len(products)} products matching 'MSI'")
                
                for i, product in enumerate(products):
                    print(f"   Product {i+1}:")
                    print(f"     ID: {product.get('id', 'N/A')}")
                    print(f"     Name: {product.get('name', 'N/A')[:50]}...")
                    print(f"     Category Name: {product.get('category_name', 'N/A')}")
            else:
                print(f"❌ Search returned error: {data.get('error', 'Unknown error')}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_category_filter():
    """Test the category filter functionality."""
    print("\n=== Testing Category Filter ===")
    
    try:
        # Test filter by category 1 (Laptop_Gaming)
        response = requests.get('http://localhost:5000/staff/inventory/search?category_filter=1&page=1&page_size=3')
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                products = data.get('products', [])
                print(f"✅ Category filter working")
                print(f"   Found {len(products)} products in category 1")
                
                for i, product in enumerate(products):
                    print(f"   Product {i+1}:")
                    print(f"     ID: {product.get('id', 'N/A')}")
                    print(f"     Name: {product.get('name', 'N/A')[:50]}...")
                    print(f"     Category ID: {product.get('category_id', 'N/A')}")
                    print(f"     Category Name: {product.get('category_name', 'N/A')}")
            else:
                print(f"❌ Category filter returned error: {data.get('error', 'Unknown error')}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")

def main():
    """Main function to run all tests."""
    print("Category Fix Verification Tests")
    print("=" * 50)
    
    test_api_product_endpoint()
    test_staff_inventory_endpoint()
    test_search_functionality()
    test_category_filter()
    
    print("\n" + "=" * 50)
    print("Tests completed!")

if __name__ == "__main__":
    main()

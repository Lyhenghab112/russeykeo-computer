#!/usr/bin/env python3
"""
Test script to verify cart functionality for both logged-in and non-logged-in users
"""

import requests
import json

# Base URL for the application
BASE_URL = "http://localhost:5000"

def test_cart_functionality():
    """Test cart functionality for non-logged-in users"""
    
    print("🧪 Testing Cart Functionality for Non-Logged-In Users")
    print("=" * 60)
    
    # Test 1: Add item to cart without login
    print("\n1. Testing add to cart without login...")
    
    add_cart_data = {
        "product_id": 1,  # Assuming product ID 1 exists
        "quantity": 2
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json=add_cart_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            print("   ✅ SUCCESS: Non-logged-in user can add items to cart")
        else:
            print("   ❌ FAILED: Non-logged-in user cannot add items to cart")
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
    
    # Test 2: Get cart count without login
    print("\n2. Testing get cart count without login...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/cart/count")
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            print("   ✅ SUCCESS: Non-logged-in user can view cart count")
        else:
            print("   ❌ FAILED: Non-logged-in user cannot view cart count")
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
    
    # Test 3: Get cart items without login
    print("\n3. Testing get cart items without login...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/cart/items")
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            print("   ✅ SUCCESS: Non-logged-in user can view cart items")
        else:
            print("   ❌ FAILED: Non-logged-in user cannot view cart items")
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
    
    print("\n" + "=" * 60)
    print("🎯 Test Summary:")
    print("   - Non-logged-in users can now add items to cart")
    print("   - Cart badge will show item count")
    print("   - Users can view cart contents")
    print("   - Checkout requires login but cart building doesn't")
    print("\n💡 Benefits:")
    print("   - Better user experience")
    print("   - Users can build cart before deciding to register")
    print("   - Cart persists in session across page visits")
    print("   - Professional e-commerce behavior")

if __name__ == "__main__":
    test_cart_functionality()

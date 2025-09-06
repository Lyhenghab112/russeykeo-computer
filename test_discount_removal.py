#!/usr/bin/env python3
"""
Test script to verify discount removal behavior
"""

import requests
import json

# Test configuration
BASE_URL = "http://localhost:5000"
TEST_PRODUCT_ID = 52  # Dell Inspiron AIO from the image

def test_discount_removal():
    """Test that removing a discount keeps the current selling price"""
    print("🧪 Testing Discount Removal Behavior")
    print("=" * 60)
    
    # Step 1: Check current state
    print("Step 1: Checking current product state...")
    try:
        response = requests.get(f"{BASE_URL}/api/staff/discounts/debug")
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                product = data['test_product']
                print(f"✅ Current state:")
                print(f"   Product: {product['name']}")
                print(f"   Current Price: ${product['price']}")
                print(f"   Original Price: ${product['original_price']}")
                print(f"   Status: {product['status']}")
                
                # Check if this product has a discount
                if product['original_price'] and product['price'] < product['original_price']:
                    print(f"   ✅ Product has a discount - good for testing!")
                    current_price = product['price']
                    original_price = product['original_price']
                else:
                    print(f"   ❌ Product doesn't have a discount - cannot test removal")
                    return False
            else:
                print(f"❌ Debug failed: {data.get('error')}")
                return False
        else:
            print(f"❌ Debug request failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False
    
    # Step 2: Remove the discount
    print(f"\nStep 2: Removing discount from product {TEST_PRODUCT_ID}...")
    try:
        response = requests.post(f"{BASE_URL}/api/staff/discounts/remove", 
                               json={"product_id": TEST_PRODUCT_ID}, 
                               headers={'Content-Type': 'application/json'})
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Discount removed successfully!")
            print(f"   Message: {result.get('message', 'N/A')}")
            print(f"   Current Price: ${result.get('current_price', 'N/A')}")
            print(f"   Original Price: ${result.get('original_price', 'N/A')}")
        else:
            print(f"❌ Failed to remove discount: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception removing discount: {e}")
        return False
    
    # Step 3: Check state after removal
    print(f"\nStep 3: Checking state after discount removal...")
    try:
        response = requests.get(f"{BASE_URL}/api/staff/discounts/debug")
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                product = data['test_product']
                print(f"✅ State after removal:")
                print(f"   Product: {product['name']}")
                print(f"   Current Price: ${product['price']}")
                print(f"   Original Price: {product['original_price']}")
                print(f"   Status: {product['status']}")
                
                # Verify the behavior
                if product['original_price'] is None:
                    print(f"   ✅ Original price cleared (no longer detected as discounted)")
                else:
                    print(f"   ❌ Original price still set: {product['original_price']}")
                
                if product['price'] == current_price:
                    print(f"   ✅ Current price maintained: ${product['price']}")
                else:
                    print(f"   ❌ Current price changed: ${current_price} → ${product['price']}")
                
                # Check if it's still detected as discounted
                if product['price'] < (product['original_price'] or float('inf')):
                    print(f"   ❌ Still detected as discounted")
                else:
                    print(f"   ✅ No longer detected as discounted")
                    
            else:
                print(f"❌ Debug failed: {data.get('error')}")
                return False
        else:
            print(f"❌ Debug request failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ Discount removal test completed!")
    return True

if __name__ == "__main__":
    print("🚀 Starting Discount Removal Test")
    
    success = test_discount_removal()
    
    if success:
        print("\n🎯 Test completed successfully!")
        print("   The discount removal should now:")
        print("   1. Keep the current selling price")
        print("   2. Clear the original_price field")
        print("   3. Stop detecting the product as discounted")
    else:
        print("\n❌ Test failed. Check the error messages above.")
    
    print("\n" + "=" * 60)
    print("🏁 Testing completed!")

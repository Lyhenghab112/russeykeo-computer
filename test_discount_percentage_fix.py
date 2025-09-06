#!/usr/bin/env python3
"""
Test script to verify discount percentage fix
"""

import requests
import json

# Test configuration
BASE_URL = "http://localhost:5000"
TEST_PRODUCT_ID = 53  # Dell Vostro Mini Tower from the image

def test_discount_percentage_fix():
    """Test that discount percentage is now stored correctly"""
    print("🧪 Testing Discount Percentage Fix")
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
                print(f"   Discount %: {product['discount_percentage'] or 'N/A'}%")
                
                if product['original_price'] and product['price'] < product['original_price']:
                    print(f"   ✅ Product has a discount - good for testing!")
                    current_price = product['price']
                    original_price = product['original_price']
                else:
                    print(f"   ❌ Product doesn't have a discount - cannot test")
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
    
    # Step 2: Apply a 10% discount
    print(f"\nStep 2: Applying 10% discount...")
    try:
        response = requests.post(f"{BASE_URL}/api/staff/discounts/apply-single", 
                               json={"product_id": TEST_PRODUCT_ID, "discount_percentage": 10}, 
                               headers={'Content-Type': 'application/json'})
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Discount applied successfully!")
            print(f"   New price: ${result.get('new_price', 'N/A')}")
            print(f"   Original price: ${result.get('original_price', 'N/A')}")
            print(f"   Base price used: ${result.get('base_price_used', 'N/A')}")
        else:
            print(f"❌ Failed to apply discount: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception applying discount: {e}")
        return False
    
    # Step 3: Check if the product appears in discounted list with correct percentage
    print(f"\nStep 3: Checking discounted products list...")
    try:
        response = requests.get(f"{BASE_URL}/api/staff/discounts/products?page=1&page_size=10")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                products = result.get('products', [])
                
                print(f"✅ Discount list loaded:")
                print(f"   Found {len(products)} discounted products")
                
                # Look for our test product
                test_product = None
                for product in products:
                    if product.get('id') == TEST_PRODUCT_ID:
                        test_product = product
                        break
                
                if test_product:
                    print(f"   ✅ Test product found in discounted list!")
                    print(f"      Name: {test_product.get('name', 'N/A')}")
                    print(f"      Original Price: ${test_product.get('original_price', 'N/A')}")
                    print(f"      Sale Price: ${test_product.get('price', 'N/A')}")
                    print(f"      Discount: {test_product.get('discount_percentage', 'N/A')}%")
                    print(f"      Savings: ${test_product.get('savings_amount', 'N/A')}")
                    
                    # Check if the discount percentage is correct
                    expected_discount = 10
                    actual_discount = test_product.get('discount_percentage', 0)
                    
                    if actual_discount == expected_discount:
                        print(f"   🎯 Discount percentage is CORRECT: {actual_discount}%")
                        return True
                    else:
                        print(f"   ❌ Discount percentage is WRONG: expected {expected_discount}%, got {actual_discount}%")
                        return False
                else:
                    print(f"   ❌ Test product NOT found in discounted list")
                    return False
            else:
                print(f"❌ API returned error: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Failed to fetch discounted products: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Exception checking discounts: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Discount Percentage Fix Test")
    
    success = test_discount_percentage_fix()
    
    if success:
        print("\n🎯 Test completed successfully!")
        print("   The discount percentage should now show correctly as 10%")
    else:
        print("\n❌ Test failed. Check the error messages above.")
    
    print("\n" + "=" * 60)
    print("🏁 Testing completed!")

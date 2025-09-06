#!/usr/bin/env python3
"""
Debug script to test discount removal step by step
"""

import requests
import json
import time

# Test configuration
BASE_URL = "http://localhost:5000"
TEST_PRODUCT_ID = 53  # Dell Vostro Mini Tower from the image

def debug_discount_removal():
    """Debug the discount removal process step by step"""
    print("🔍 Debugging Discount Removal Process")
    print("=" * 60)
    
    # Step 1: Check if the discount_percentage column exists
    print("Step 1: Checking database schema...")
    try:
        response = requests.get(f"{BASE_URL}/api/staff/discounts/debug")
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Debug endpoint working - database connection OK")
                
                # Check if we can see the discount_percentage field
                product = data['test_product']
                print(f"📱 Test Product: {product['name']}")
                print(f"   Current Price: ${product['price']}")
                print(f"   Original Price: ${product['original_price']}")
                print(f"   Status: {product['status']}")
                
                # This will help us see if the column exists
                if 'discount_percentage' in product:
                    print(f"   ✅ discount_percentage column exists: {product['discount_percentage']}")
                else:
                    print(f"   ❌ discount_percentage column NOT found in response")
                    print(f"   This suggests the database migration hasn't been run yet")
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
    
    # Step 2: Check current discounted products list
    print(f"\nStep 2: Checking current discounted products...")
    try:
        response = requests.get(f"{BASE_URL}/api/staff/discounts/products?page=1&page_size=10")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                products = result.get('products', [])
                print(f"✅ Found {len(products)} discounted products")
                
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
                    
                    # Store the current price for comparison
                    current_price = test_product.get('price')
                    original_price = test_product.get('original_price')
                    
                else:
                    print(f"   ❌ Test product NOT found in discounted list")
                    print(f"   This suggests the product doesn't have a discount")
                    return False
            else:
                print(f"❌ API returned error: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Failed to fetch discounted products: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False
    
    # Step 3: Remove the discount
    print(f"\nStep 3: Removing discount...")
    try:
        response = requests.post(f"{BASE_URL}/api/staff/discounts/remove", 
                               json={"product_id": TEST_PRODUCT_ID}, 
                               headers={'Content-Type': 'application/json'})
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Discount removal response:")
            print(f"   Success: {result.get('success')}")
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
    
    # Step 4: Check the state after removal
    print(f"\nStep 4: Checking state after discount removal...")
    time.sleep(1)  # Wait a moment for database update
    
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
                
                # Check what changed
                if product['price'] == current_price:
                    print(f"   ✅ Price maintained: ${product['price']}")
                else:
                    print(f"   ❌ Price changed: ${current_price} → ${product['price']}")
                
                if product['original_price'] is None:
                    print(f"   ✅ Original price cleared (no longer detected as discounted)")
                else:
                    print(f"   ❌ Original price still set: {product['original_price']}")
                    
            else:
                print(f"❌ Debug failed: {data.get('error')}")
                return False
        else:
            print(f"❌ Debug request failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False
    
    # Step 5: Check if product still appears in discounted list
    print(f"\nStep 5: Checking if product still appears in discounted list...")
    try:
        response = requests.get(f"{BASE_URL}/api/staff/discounts/products?page=1&page_size=10")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                products = result.get('products', [])
                print(f"✅ Found {len(products)} discounted products after removal")
                
                # Look for our test product
                test_product = None
                for product in products:
                    if product.get('id') == TEST_PRODUCT_ID:
                        test_product = product
                        break
                
                if test_product:
                    print(f"   ❌ Test product STILL found in discounted list!")
                    print(f"      This suggests the discount removal didn't work properly")
                    return False
                else:
                    print(f"   ✅ Test product NO LONGER in discounted list!")
                    print(f"      Discount removal worked correctly")
                    
            else:
                print(f"❌ API returned error: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Failed to fetch discounted products: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ Debug completed!")
    return True

if __name__ == "__main__":
    print("🚀 Starting Discount Removal Debug")
    
    success = debug_discount_removal()
    
    if success:
        print("\n🎯 Debug completed successfully!")
        print("   Check the output above to see what happened")
    else:
        print("\n❌ Debug failed. Check the error messages above.")
    
    print("\n" + "=" * 60)
    print("🏁 Debug completed!")

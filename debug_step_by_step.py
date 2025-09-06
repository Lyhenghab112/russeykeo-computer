#!/usr/bin/env python3
"""
Step-by-step debug script for discount detection
"""

import requests
import json
import time

# Test configuration
BASE_URL = "http://localhost:5000"
TEST_PRODUCT_ID = 51  # MSI Katana laptop

def step1_check_initial_state():
    """Step 1: Check the initial state of the product"""
    print("🔍 Step 1: Checking initial product state...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/staff/discounts/debug")
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                product = data['test_product']
                print(f"✅ Initial state:")
                print(f"   Product: {product['name']}")
                print(f"   Current Price: ${product['price']}")
                print(f"   Original Price: ${product['original_price']}")
                print(f"   Status: {product['status']}")
                print(f"   Discount %: {product['discount_percentage'] or 'N/A'}%")
                return product
            else:
                print(f"❌ Debug failed: {data.get('error')}")
                return None
        else:
            print(f"❌ Debug request failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None

def step2_apply_discount():
    """Step 2: Apply a discount to the product"""
    print("\n💰 Step 2: Applying 20% discount...")
    
    discount_data = {
        "product_id": TEST_PRODUCT_ID,
        "discount_percentage": 20
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/staff/discounts/apply-single", 
                               json=discount_data, 
                               headers={'Content-Type': 'application/json'})
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Discount applied successfully!")
            print(f"   New price: ${result.get('new_price', 'N/A')}")
            print(f"   Original price: ${result.get('original_price', 'N/A')}")
            print(f"   Base price used: ${result.get('base_price', 'N/A')}")
            print(f"   Total savings: ${result.get('total_savings_from_original', 'N/A')}")
            return result
        else:
            print(f"❌ Failed to apply discount: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Exception applying discount: {e}")
        return None

def step3_check_after_discount():
    """Step 3: Check the state after applying discount"""
    print("\n🔍 Step 3: Checking state after discount...")
    
    # Wait a moment for the database to update
    time.sleep(1)
    
    try:
        response = requests.get(f"{BASE_URL}/api/staff/discounts/debug")
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                product = data['test_product']
                print(f"✅ State after discount:")
                print(f"   Product: {product['name']}")
                print(f"   Current Price: ${product['price']}")
                print(f"   Original Price: ${product['original_price']}")
                print(f"   Status: {product['status']}")
                print(f"   Discount %: {product['discount_percentage'] or 'N/A'}%")
                return product
            else:
                print(f"❌ Debug failed: {data.get('error')}")
                return None
        else:
            print(f"❌ Debug request failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None

def step4_check_discount_list():
    """Step 4: Check if the product appears in the discounted products list"""
    print("\n📋 Step 4: Checking if product appears in discounted list...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/staff/discounts/products?page=1&page_size=10")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                products = result.get('products', [])
                pagination = result.get('pagination', {})
                
                print(f"✅ Discount list loaded:")
                print(f"   Found {len(products)} discounted products")
                print(f"   Total count: {pagination.get('total_count', 0)}")
                
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
                    return True
                else:
                    print(f"   ❌ Test product NOT found in discounted list")
                    print(f"      This confirms the discount detection issue")
                    return False
            else:
                print(f"❌ API returned error: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Failed to fetch discounted products: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception checking discounts: {e}")
        return False

def analyze_results(initial_state, discount_result, after_state, in_list):
    """Analyze the results to identify the issue"""
    print("\n🔍 Analysis:")
    print("=" * 50)
    
    if initial_state and after_state:
        print(f"Price change: ${initial_state['price']} → ${after_state['price']}")
        print(f"Original price: ${after_state['original_price']}")
        
        # Check if the discount should be detected
        if after_state['price'] < after_state['original_price']:
            print(f"✅ Price < Original Price: {after_state['price']} < {after_state['original_price']}")
            print(f"   This should be detected as a discount")
        else:
            print(f"❌ Price >= Original Price: {after_state['price']} >= {after_state['original_price']}")
            print(f"   This will NOT be detected as a discount")
    
    if in_list:
        print(f"✅ Product appears in discounted list - system working correctly")
    else:
        print(f"❌ Product does NOT appear in discounted list")
        print(f"   This suggests a discount detection issue")
        
        if after_state and after_state['price'] >= after_state['original_price']:
            print(f"   Root cause: Price >= Original Price")
            print(f"   Solution: Need to fix the discount application logic")

if __name__ == "__main__":
    print("🚀 Starting Step-by-Step Discount Debug")
    print("=" * 60)
    
    # Step 1: Check initial state
    initial_state = step1_check_initial_state()
    if not initial_state:
        print("❌ Cannot proceed - failed to get initial state")
        exit(1)
    
    # Step 2: Apply discount
    discount_result = step2_apply_discount()
    if not discount_result:
        print("❌ Cannot proceed - failed to apply discount")
        exit(1)
    
    # Step 3: Check state after discount
    after_state = step3_check_after_discount()
    if not after_state:
        print("❌ Cannot proceed - failed to get state after discount")
        exit(1)
    
    # Step 4: Check if product appears in discounted list
    in_list = step4_check_discount_list()
    
    # Analyze results
    analyze_results(initial_state, discount_result, after_state, in_list)
    
    print("\n" + "=" * 60)
    print("🏁 Debug completed!")

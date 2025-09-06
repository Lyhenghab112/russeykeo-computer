#!/usr/bin/env python3
"""
Test script to verify discount detection and application
"""

import requests
import json

# Test configuration
BASE_URL = "http://localhost:5000"
TEST_PRODUCT_ID = 51  # MSI Katana laptop from the image

def test_discount_application():
    """Test applying a discount and then checking if it's detected"""
    print("🧪 Testing Discount Application and Detection")
    print("=" * 60)
    
    # Step 1: Apply a discount
    print("Step 1: Applying 15% discount...")
    discount_data = {
        "product_id": TEST_PRODUCT_ID,
        "discount_percentage": 15
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
            print(f"   Base price used: ${result.get('base_price_used', 'N/A')}")
            print(f"   Total savings: ${result.get('total_savings_from_original', 'N/A')}")
        else:
            print(f"❌ Failed to apply discount: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception applying discount: {e}")
        return False
    
    # Step 2: Check if the discount is detected
    print("\nStep 2: Checking if discount is detected...")
    try:
        response = requests.get(f"{BASE_URL}/api/staff/discounts/products?page=1&page_size=10")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                products = result.get('products', [])
                pagination = result.get('pagination', {})
                
                print(f"✅ Discount detection working!")
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
                else:
                    print(f"   ❌ Test product NOT found in discounted list")
                    print(f"      This suggests a discount detection issue")
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
    
    print("\n" + "=" * 60)
    print("✅ All tests passed! Discount system is working correctly.")
    return True

def test_database_state():
    """Test the current database state to understand the issue"""
    print("\n🔍 Database State Analysis")
    print("=" * 60)
    
    # This would require direct database access, but we can infer from the API
    print("Note: To fully analyze database state, you would need to:")
    print("1. Check the products table directly")
    print("2. Verify original_price and price values")
    print("3. Ensure the discount detection query works")
    
    print("\nExpected database state after discount:")
    print("- original_price: Should be the price BEFORE discount")
    print("- price: Should be the price AFTER discount")
    print("- price < original_price: Should be TRUE for discounted products")

if __name__ == "__main__":
    print("🚀 Starting Discount System Tests")
    
    # Run the main test
    success = test_discount_application()
    
    if success:
        test_database_state()
    else:
        print("\n❌ Tests failed. Check the error messages above.")
    
    print("\n" + "=" * 60)
    print("🏁 Testing completed!")

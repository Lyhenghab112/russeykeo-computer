#!/usr/bin/env python3
"""
Test script to verify the new discount API functionality
"""

import requests
import json

# Test configuration
BASE_URL = "http://localhost:5000"
TEST_PRODUCT_ID = 51  # MSI Katana laptop from the image

def test_discount_from_current_price():
    """Test applying discount from current selling price (new default behavior)"""
    print("Testing discount from current selling price...")
    
    data = {
        "product_id": TEST_PRODUCT_ID,
        "discount_percentage": 10
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/staff/discounts/apply-single", 
                               json=data, 
                               headers={'Content-Type': 'application/json'})
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success: {result}")
            print(f"   New price: ${result.get('new_price', 'N/A')}")
            print(f"   Base price used: ${result.get('base_price_used', 'N/A')}")
            print(f"   Total savings from original: ${result.get('total_savings_from_original', 'N/A')}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_bulk_discount():
    """Test bulk discount application"""
    print("\nTesting bulk discount application...")
    
    data = {
        "product_ids": [TEST_PRODUCT_ID],
        "discount_percentage": 15
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/staff/discounts/apply-bulk", 
                               json=data, 
                               headers={'Content-Type': 'application/json'})
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success: {result}")
            print(f"   Updated products: {result.get('success_count', 'N/A')}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    print("🧪 Testing Discount API Functionality")
    print("=" * 50)
    
    # Test all scenarios
    test_discount_from_current_price()
    test_bulk_discount()
    
    print("\n" + "=" * 50)
    print("✅ Testing completed!")

#!/usr/bin/env python3
"""
Test the API endpoints that provide data for the Money Insight widget
"""

import requests
import json

def test_api_endpoints():
    """Test the API endpoints for Money Insight data"""
    
    base_url = "http://127.0.0.1:5000"
    
    print("🧪 Testing API Endpoints for Money Insight")
    print("=" * 50)
    
    # Test 1: Monthly sales endpoint
    print("\n1. Testing Monthly Sales API:")
    try:
        response = requests.get(f"{base_url}/auth/staff/api/reports/monthly_sales?start_date=2025-01-01&end_date=2025-12-31")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Status: {response.status_code}")
            print(f"   Success: {data.get('success', False)}")
            if data.get('success'):
                sales_data = data.get('sales', [])
                print(f"   Sales records: {len(sales_data)}")
                total_sales = sum(item.get('total_sales', 0) for item in sales_data)
                total_profit = sum(item.get('total_profit', 0) for item in sales_data)
                print(f"   Total Sales: ${total_sales:.2f}")
                print(f"   Total Profit: ${total_profit:.2f}")
            else:
                print(f"   Error: {data.get('error', 'Unknown error')}")
        else:
            print(f"   ❌ Status: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"   💥 Error: {e}")
    
    # Test 2: Current month revenue endpoint
    print("\n2. Testing Current Month Revenue API:")
    try:
        response = requests.get(f"{base_url}/auth/staff/api/reports/current_month_revenue")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Status: {response.status_code}")
            print(f"   Success: {data.get('success', False)}")
            if data.get('success'):
                revenue_data = data.get('revenue', [])
                print(f"   Revenue records: {len(revenue_data)}")
                total_revenue = sum(item.get('daily_revenue', 0) for item in revenue_data)
                print(f"   Total Current Month Revenue: ${total_revenue:.2f}")
            else:
                print(f"   Error: {data.get('error', 'Unknown error')}")
        else:
            print(f"   ❌ Status: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"   💥 Error: {e}")
    
    # Test 3: Monthly revenue endpoint
    print("\n3. Testing Monthly Revenue API:")
    try:
        response = requests.get(f"{base_url}/auth/staff/api/reports/monthly_revenue")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Status: {response.status_code}")
            print(f"   Success: {data.get('success', False)}")
            if data.get('success'):
                months_data = data.get('months', [])
                print(f"   Months data: {len(months_data)}")
                for month in months_data:
                    print(f"   {month.get('month_label', 'Unknown')}: ${month.get('monthly_revenue', 0):.2f}")
            else:
                print(f"   Error: {data.get('error', 'Unknown error')}")
        else:
            print(f"   ❌ Status: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"   💥 Error: {e}")
    
    print("\n" + "=" * 50)
    print("💡 API Testing Complete!")
    print("💡 If any endpoints fail, check if Flask app is running")
    print("💡 If endpoints work but Money Insight shows $0, check JavaScript console")

if __name__ == "__main__":
    test_api_endpoints()

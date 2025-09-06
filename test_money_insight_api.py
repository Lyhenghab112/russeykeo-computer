#!/usr/bin/env python3
"""
Test the Money Insight API endpoint directly
"""

import requests
import json

def test_money_insight_api():
    """Test the Money Insight API endpoint"""
    
    base_url = "http://127.0.0.1:5000"
    
    print("🧪 Testing Money Insight API Endpoint")
    print("=" * 50)
    
    # Test the monthly sales endpoint that Money Insight uses
    print("\n1. Testing Monthly Sales API (Money Insight Data Source):")
    try:
        # Test with current year date range
        response = requests.get(f"{base_url}/auth/staff/api/reports/monthly_sales?start_date=2025-01-01&end_date=2025-12-31")
        
        print(f"   URL: {response.url}")
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success: {data.get('success', False)}")
            
            if data.get('success'):
                sales_data = data.get('sales', [])
                print(f"   📊 Sales Records: {len(sales_data)}")
                
                if len(sales_data) > 0:
                    total_sales = sum(item.get('total_sales', 0) for item in sales_data)
                    total_profit = sum(item.get('total_profit', 0) for item in sales_data)
                    
                    print(f"   💰 Total Sales: ${total_sales:,.2f}")
                    print(f"   💵 Total Profit: ${total_profit:,.2f}")
                    
                    print(f"\n   📅 Monthly Breakdown:")
                    for item in sales_data:
                        month = item.get('month', 'Unknown')
                        sales = item.get('total_sales', 0)
                        profit = item.get('total_profit', 0)
                        print(f"      {month}: Sales ${sales:,.2f}, Profit ${profit:,.2f}")
                    
                    print(f"\n   🎯 Money Insight should show:")
                    print(f"      Total Revenue: ${total_sales:,.2f}")
                    print(f"      Total Profit: ${total_profit:,.2f}")
                else:
                    print("   ❌ No sales data returned")
                    print("   💡 This explains why Money Insight shows $0")
            else:
                print(f"   ❌ API Error: {data.get('error', 'Unknown error')}")
        else:
            print(f"   ❌ HTTP Error: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("   ❌ Connection Error: Flask app is not running")
        print("   💡 Start your Flask application first")
    except Exception as e:
        print(f"   💥 Error: {e}")
    
    print("\n" + "=" * 50)
    print("💡 If the API works but Money Insight shows $0:")
    print("   1. Restart your Flask application")
    print("   2. Check browser console for JavaScript errors")
    print("   3. Clear browser cache and refresh")

if __name__ == "__main__":
    test_money_insight_api()

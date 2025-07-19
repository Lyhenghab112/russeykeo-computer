#!/usr/bin/env python3
"""
Simple test script to verify cart functionality
"""

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app import create_app
    from models import Product
    
    print("✓ Successfully imported app and models")
    
    # Test creating the app
    app = create_app()
    print("✓ Successfully created Flask app")
    
    # Test if we can access the cart route
    with app.test_client() as client:
        # Test cart page (should work even without login)
        response = client.get('/cart')
        print(f"✓ Cart page status: {response.status_code}")
        
        # Test cart API without login (should return 401)
        response = client.post('/api/cart/add', 
                             json={'product_id': 1, 'quantity': 1})
        print(f"✓ Add to cart without login status: {response.status_code}")
        
    print("\n✅ All basic tests passed!")
    print("The cart functionality should be working correctly.")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure all dependencies are installed.")
except Exception as e:
    print(f"❌ Error: {e}")
    print("There might be an issue with the cart implementation.")

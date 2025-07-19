#!/usr/bin/env python3
"""
Test script to debug product image update functionality.
This script will help identify where the image update process is failing.
"""

import requests
import os
import json
from io import BytesIO
from PIL import Image
import tempfile

# Configuration
BASE_URL = "http://localhost:5000"
TEST_PRODUCT_ID = 273  # Change this to an existing product ID
USERNAME = "hab"  # Change to your admin username
PASSWORD = "12345"  # Change to your admin password

def create_test_image():
    """Create a simple test image for upload testing."""
    # Create a simple 100x100 red image
    img = Image.new('RGB', (100, 100), color='red')
    
    # Save to a temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
    img.save(temp_file.name, 'JPEG')
    temp_file.close()
    
    return temp_file.name

def login_and_get_session():
    """Login and return session for authenticated requests."""
    session = requests.Session()
    
    # Get login page first to get any CSRF tokens if needed
    login_page = session.get(f"{BASE_URL}/auth/login")
    print(f"Login page status: {login_page.status_code}")
    
    # Attempt login
    login_data = {
        'username': USERNAME,
        'password': PASSWORD
    }
    
    login_response = session.post(f"{BASE_URL}/auth/login", data=login_data)
    print(f"Login response status: {login_response.status_code}")
    print(f"Login response URL: {login_response.url}")
    
    # Check if we're redirected to dashboard (successful login)
    if 'dashboard' in login_response.url or login_response.status_code == 200:
        print("✓ Login successful")
        return session
    else:
        print("✗ Login failed")
        print(f"Response content: {login_response.text[:500]}")
        return None

def test_get_product_details(session, product_id):
    """Test fetching product details via API."""
    print(f"\n--- Testing product details fetch for ID {product_id} ---")
    
    response = session.get(f"{BASE_URL}/api/products/{product_id}")
    print(f"API response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if data.get('success'):
            product = data.get('product', {})
            print(f"✓ Product found: {product.get('name', 'Unknown')}")
            print(f"  Current photo: {product.get('photo', 'None')}")
            print(f"  Current back_view: {product.get('back_view', 'None')}")
            print(f"  Current left_rear_view: {product.get('left_rear_view', 'None')}")
            print(f"  Current right_rear_view: {product.get('right_rear_view', 'None')}")
            return product
        else:
            print(f"✗ API returned error: {data.get('error', 'Unknown error')}")
    else:
        print(f"✗ API request failed with status {response.status_code}")
        print(f"Response: {response.text[:500]}")
    
    return None

def test_image_update(session, product_id, test_image_path):
    """Test updating product image."""
    print(f"\n--- Testing image update for product ID {product_id} ---")
    
    # Prepare form data
    form_data = {
        'name': 'Test Product Updated',
        'description': 'Updated description for testing',
        'price': '999.99',
        'stock': '10'
    }
    
    # Prepare file data
    files = {}
    with open(test_image_path, 'rb') as f:
        files['photo'] = ('test_image.jpg', f, 'image/jpeg')
        
        print(f"Uploading image: {test_image_path}")
        print(f"Form data: {form_data}")
        
        # Make the update request
        response = session.post(
            f"{BASE_URL}/staff/inventory/{product_id}/update",
            data=form_data,
            files=files
        )
    
    print(f"Update response status: {response.status_code}")
    print(f"Update response headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            if data.get('success'):
                print("✓ Update request successful")
                return True
            else:
                print(f"✗ Update failed: {data.get('error', 'Unknown error')}")
        except json.JSONDecodeError:
            print(f"✗ Invalid JSON response: {response.text[:500]}")
    else:
        print(f"✗ Update request failed with status {response.status_code}")
        print(f"Response: {response.text[:500]}")
    
    return False

def verify_image_update(session, product_id, expected_changes):
    """Verify that the image update was persisted to the database."""
    print(f"\n--- Verifying image update persistence ---")
    
    # Wait a moment for database to update
    import time
    time.sleep(1)
    
    # Fetch updated product details
    updated_product = test_get_product_details(session, product_id)
    
    if updated_product:
        # Check if image was updated
        current_photo = updated_product.get('photo')
        if current_photo and current_photo != expected_changes.get('original_photo'):
            print(f"✓ Image updated successfully: {current_photo}")
            
            # Check if file exists on disk
            image_path = os.path.join('static', 'uploads', 'products', current_photo)
            if os.path.exists(image_path):
                print(f"✓ Image file exists on disk: {image_path}")
                return True
            else:
                print(f"✗ Image file not found on disk: {image_path}")
        else:
            print(f"✗ Image not updated in database. Current: {current_photo}, Original: {expected_changes.get('original_photo')}")
    
    return False

def main():
    """Main test function."""
    print("=== Product Image Update Test ===")
    
    # Create test image
    test_image_path = create_test_image()
    print(f"Created test image: {test_image_path}")
    
    try:
        # Login
        session = login_and_get_session()
        if not session:
            print("Cannot proceed without valid session")
            return
        
        # Get current product details
        original_product = test_get_product_details(session, TEST_PRODUCT_ID)
        if not original_product:
            print(f"Cannot find product with ID {TEST_PRODUCT_ID}")
            return
        
        original_photo = original_product.get('photo')
        
        # Test image update
        update_success = test_image_update(session, TEST_PRODUCT_ID, test_image_path)
        
        if update_success:
            # Verify the update was persisted
            verify_success = verify_image_update(session, TEST_PRODUCT_ID, {
                'original_photo': original_photo
            })
            
            if verify_success:
                print("\n✓ Image update test PASSED")
            else:
                print("\n✗ Image update test FAILED - changes not persisted")
        else:
            print("\n✗ Image update test FAILED - update request failed")
    
    finally:
        # Clean up test image
        if os.path.exists(test_image_path):
            os.unlink(test_image_path)
            print(f"Cleaned up test image: {test_image_path}")

if __name__ == "__main__":
    main()

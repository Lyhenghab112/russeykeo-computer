#!/usr/bin/env python3
"""
Test script to debug file upload issues in product editing
"""

import requests
import os
from werkzeug.datastructures import FileStorage
from io import BytesIO

def test_file_upload_behavior():
    """Test how Flask handles empty vs filled file inputs"""
    
    # Simulate what happens when a file input is empty
    print("=== Testing Empty File Input ===")
    empty_file = FileStorage(
        stream=BytesIO(b''),
        filename='',
        content_type='application/octet-stream'
    )
    
    print(f"Empty file - filename: '{empty_file.filename}'")
    print(f"Empty file - bool(filename): {bool(empty_file.filename)}")
    print(f"Empty file - filename.strip(): '{empty_file.filename.strip() if empty_file.filename else 'None'}'")
    print(f"Empty file - hasattr(file, 'filename'): {hasattr(empty_file, 'filename')}")
    
    # Simulate what happens when a file input has a file
    print("\n=== Testing File Input with File ===")
    test_content = b'fake image content'
    filled_file = FileStorage(
        stream=BytesIO(test_content),
        filename='test.jpg',
        content_type='image/jpeg'
    )
    
    print(f"Filled file - filename: '{filled_file.filename}'")
    print(f"Filled file - bool(filename): {bool(filled_file.filename)}")
    print(f"Filled file - filename.strip(): '{filled_file.filename.strip() if filled_file.filename else 'None'}'")
    print(f"Filled file - hasattr(file, 'filename'): {hasattr(filled_file, 'filename')}")
    
    # Test the conditions used in create vs update
    print("\n=== Testing Conditions ===")
    
    # Create condition: if file and file.filename and allowed_file(file.filename):
    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif'}
    
    print("Create condition for empty file:")
    create_condition_empty = empty_file and empty_file.filename and allowed_file(empty_file.filename) if empty_file.filename else False
    print(f"  Result: {create_condition_empty}")
    
    print("Create condition for filled file:")
    create_condition_filled = filled_file and filled_file.filename and allowed_file(filled_file.filename)
    print(f"  Result: {create_condition_filled}")
    
    # Update condition: if hasattr(file, 'filename') and file.filename and file.filename.strip():
    print("Update condition for empty file:")
    update_condition_empty = hasattr(empty_file, 'filename') and empty_file.filename and empty_file.filename.strip()
    print(f"  Result: {update_condition_empty}")
    
    print("Update condition for filled file:")
    update_condition_filled = hasattr(filled_file, 'filename') and filled_file.filename and filled_file.filename.strip()
    print(f"  Result: {update_condition_filled}")

if __name__ == '__main__':
    test_file_upload_behavior()

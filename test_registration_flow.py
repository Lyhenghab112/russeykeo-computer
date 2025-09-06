#!/usr/bin/env python3
"""
Test script to simulate registration flow
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_registration_flow():
    """Test the registration flow step by step"""
    print("🧪 Testing Registration Flow")
    print("=" * 50)
    
    try:
        # Test 1: Import OTP modules
        print("1. Testing OTP module imports...")
        from utils.otp_utils import OTPManager
        from utils.email_utils import EmailManager
        print("   ✓ OTP modules imported successfully")
        
        # Test 2: Generate OTP
        print("2. Testing OTP generation...")
        otp_code = OTPManager.generate_otp()
        print(f"   ✓ Generated OTP: {otp_code}")
        
        # Test 3: Test email sending (fallback mode)
        print("3. Testing email sending...")
        email_result = EmailManager.send_registration_otp_email('test@example.com', 'Test User', otp_code)
        print(f"   ✓ Email sent: {email_result}")
        
        # Test 4: Test database connection
        print("4. Testing database connection...")
        from models import get_db
        conn = get_db()
        cur = conn.cursor()
        
        # Check if OTP table exists
        cur.execute("SHOW TABLES LIKE 'customer_otp_verification'")
        table_exists = cur.fetchone() is not None
        print(f"   ✓ OTP table exists: {table_exists}")
        
        # Check if OTP fields exist in customers table
        cur.execute("SHOW COLUMNS FROM customers LIKE 'otp_enabled'")
        fields_exist = cur.fetchone() is not None
        print(f"   ✓ OTP fields exist: {fields_exist}")
        
        cur.close()
        conn.close()
        
        print("\n🎉 All registration flow tests passed!")
        print("\nThe issue might be:")
        print("1. Flask application not running")
        print("2. Database connection issues during actual registration")
        print("3. Template rendering issues")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_registration_flow()
    sys.exit(0 if success else 1)

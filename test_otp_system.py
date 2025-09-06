#!/usr/bin/env python3
"""
Test script for OTP system functionality
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_otp_generation():
    """Test OTP generation"""
    print("Testing OTP generation...")
    
    try:
        from utils.otp_utils import OTPManager
        
        # Generate multiple OTPs to ensure randomness
        otps = []
        for i in range(5):
            otp = OTPManager.generate_otp()
            otps.append(otp)
            print(f"  Generated OTP {i+1}: {otp}")
        
        # Check if all OTPs are 6 digits
        all_valid = all(len(otp) == 6 and otp.isdigit() for otp in otps)
        print(f"  All OTPs are 6 digits: {all_valid}")
        
        # Check if OTPs are different (basic randomness test)
        unique_otps = len(set(otps))
        print(f"  Unique OTPs generated: {unique_otps}/5")
        
        return all_valid and unique_otps > 1
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_email_utils():
    """Test email utility functions"""
    print("\nTesting email utilities...")
    
    try:
        from utils.email_utils import EmailManager
        
        # Test fallback email (should work without SMTP config)
        result = EmailManager.send_otp_email('test@example.com', 'Test User', '123456')
        print(f"  Fallback email test: {'✓' if result else '❌'}")
        
        return result
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_database_connection():
    """Test database connection"""
    print("\nTesting database connection...")
    
    try:
        from models import get_db
        
        conn = get_db()
        cur = conn.cursor()
        
        # Test basic query
        cur.execute("SELECT 1")
        result = cur.fetchone()
        
        cur.close()
        conn.close()
        
        print(f"  Database connection: {'✓' if result and result[0] == 1 else '❌'}")
        return result and result[0] == 1
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_otp_table_exists():
    """Test if OTP tables exist"""
    print("\nTesting OTP database tables...")
    
    try:
        from models import get_db
        
        conn = get_db()
        cur = conn.cursor()
        
        # Check if OTP fields exist in customers table
        cur.execute("SHOW COLUMNS FROM customers LIKE 'otp_enabled'")
        otp_enabled_exists = cur.fetchone() is not None
        
        # Check if OTP verification table exists
        cur.execute("SHOW TABLES LIKE 'customer_otp_verification'")
        otp_table_exists = cur.fetchone() is not None
        
        cur.close()
        conn.close()
        
        print(f"  OTP fields in customers table: {'✓' if otp_enabled_exists else '❌'}")
        print(f"  OTP verification table: {'✓' if otp_table_exists else '❌'}")
        
        return otp_enabled_exists and otp_table_exists
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 OTP System Test Suite")
    print("=" * 50)
    
    tests = [
        test_otp_generation,
        test_email_utils,
        test_database_connection,
        test_otp_table_exists
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"  ❌ Test failed with exception: {e}")
            results.append(False)
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    
    for i, (test, result) in enumerate(zip(tests, results)):
        status = "✓ PASS" if result else "❌ FAIL"
        test_name = test.__name__.replace('_', ' ').title()
        print(f"  {i+1}. {test_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! OTP system is ready to use.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
Debug script for registration OTP functionality
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test if all required modules can be imported"""
    print("Testing imports...")
    
    try:
        from utils.otp_utils import OTPManager
        print("  ✓ OTPManager imported successfully")
    except Exception as e:
        print(f"  ❌ Failed to import OTPManager: {e}")
        return False
    
    try:
        from utils.email_utils import EmailManager
        print("  ✓ EmailManager imported successfully")
    except Exception as e:
        print(f"  ❌ Failed to import EmailManager: {e}")
        return False
    
    try:
        from models import get_db
        print("  ✓ Database connection imported successfully")
    except Exception as e:
        print(f"  ❌ Failed to import database connection: {e}")
        return False
    
    return True

def test_database_tables():
    """Test if OTP database tables exist"""
    print("\nTesting database tables...")
    
    try:
        from models import get_db
        
        conn = get_db()
        cur = conn.cursor()
        
        # Check if OTP fields exist in customers table
        cur.execute("SHOW COLUMNS FROM customers LIKE 'otp_enabled'")
        otp_enabled_exists = cur.fetchone() is not None
        
        if otp_enabled_exists:
            print("  ✓ OTP fields exist in customers table")
        else:
            print("  ❌ OTP fields missing from customers table")
            print("     Run: python run_otp_migration.py")
            return False
        
        # Check if OTP verification table exists
        cur.execute("SHOW TABLES LIKE 'customer_otp_verification'")
        otp_table_exists = cur.fetchone() is not None
        
        if otp_table_exists:
            print("  ✓ OTP verification table exists")
        else:
            print("  ❌ OTP verification table missing")
            print("     Run: python run_otp_migration.py")
            return False
        
        cur.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"  ❌ Database error: {e}")
        return False

def test_otp_generation():
    """Test OTP generation"""
    print("\nTesting OTP generation...")
    
    try:
        from utils.otp_utils import OTPManager
        
        otp = OTPManager.generate_otp()
        print(f"  ✓ Generated OTP: {otp}")
        print(f"  ✓ OTP length: {len(otp)} digits")
        print(f"  ✓ OTP is numeric: {otp.isdigit()}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ OTP generation error: {e}")
        return False

def test_email_sending():
    """Test email sending"""
    print("\nTesting email sending...")
    
    try:
        from utils.email_utils import EmailManager
        
        # Test registration email
        result = EmailManager.send_registration_otp_email('test@example.com', 'Test User', '123456')
        print(f"  ✓ Registration email sent: {result}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Email sending error: {e}")
        return False

def test_otp_storage():
    """Test OTP storage in database"""
    print("\nTesting OTP storage...")
    
    try:
        from utils.otp_utils import OTPManager
        
        # Test with a dummy customer ID
        customer_id = 999
        email = "test@example.com"
        otp_code = "123456"
        
        # Try to store OTP
        success = OTPManager.store_otp(customer_id, email, otp_code, expiry_minutes=15)
        print(f"  ✓ OTP stored: {success}")
        
        # Try to verify OTP
        verified = OTPManager.verify_stored_otp(customer_id, email, otp_code)
        print(f"  ✓ OTP verified: {verified}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ OTP storage error: {e}")
        return False

def main():
    """Run all debug tests"""
    print("🐛 Registration OTP Debug Script")
    print("=" * 50)
    
    tests = [
        test_imports,
        test_database_tables,
        test_otp_generation,
        test_email_sending,
        test_otp_storage
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
    print("📊 Debug Results Summary")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    
    for i, (test, result) in enumerate(zip(tests, results)):
        status = "✓ PASS" if result else "❌ FAIL"
        test_name = test.__name__.replace('_', ' ').title()
        print(f"  {i+1}. {test_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Registration OTP should work.")
        print("\nNext steps:")
        print("1. Try registering a new account")
        print("2. Check console for OTP codes (fallback mode)")
        print("3. Verify the OTP on the verification page")
    else:
        print("⚠️  Some tests failed. Please fix the issues above.")
        
        if not results[1]:  # Database tables test failed
            print("\n🔧 To fix database issues:")
            print("   python run_otp_migration.py")
        
        if not results[0]:  # Import test failed
            print("\n🔧 To fix import issues:")
            print("   Check that utils/otp_utils.py and utils/email_utils.py exist")
            print("   Install required packages: pip install pyotp flask-mail")
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())

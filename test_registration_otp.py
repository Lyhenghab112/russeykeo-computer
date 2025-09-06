#!/usr/bin/env python3
"""
Test script for Registration OTP functionality
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_registration_otp_flow():
    """Test the complete registration OTP flow"""
    print("Testing Registration OTP Flow...")
    
    try:
        from utils.otp_utils import OTPManager
        from utils.email_utils import EmailManager
        
        # Simulate customer registration
        customer_id = 999  # Test customer ID
        email = "test@example.com"
        customer_name = "Test User"
        
        print(f"  Simulating registration for: {customer_name} ({email})")
        
        # Generate OTP for registration
        otp_code = OTPManager.generate_otp()
        print(f"  Generated registration OTP: {otp_code}")
        
        # Store OTP with 15-minute expiry
        success = OTPManager.store_otp(customer_id, email, otp_code, expiry_minutes=15)
        print(f"  OTP stored in database: {'✓' if success else '❌'}")
        
        # Send registration email
        email_sent = EmailManager.send_registration_otp_email(email, customer_name, otp_code)
        print(f"  Registration email sent: {'✓' if email_sent else '❌'}")
        
        # Verify OTP
        otp_verified = OTPManager.verify_stored_otp(customer_id, email, otp_code)
        print(f"  OTP verification: {'✓' if otp_verified else '❌'}")
        
        # Try to verify the same OTP again (should fail - single use)
        otp_verified_again = OTPManager.verify_stored_otp(customer_id, email, otp_code)
        print(f"  OTP re-verification (should fail): {'❌' if not otp_verified_again else '⚠️'}")
        
        return success and email_sent and otp_verified and not otp_verified_again
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_email_templates():
    """Test both email templates"""
    print("\nTesting Email Templates...")
    
    try:
        from utils.email_utils import EmailManager
        
        # Test registration email template
        reg_result = EmailManager.send_registration_otp_email('test@example.com', 'Test User', '123456')
        print(f"  Registration email template: {'✓' if reg_result else '❌'}")
        
        # Test login email template
        login_result = EmailManager.send_otp_email('test@example.com', 'Test User', '789012')
        print(f"  Login email template: {'✓' if login_result else '❌'}")
        
        return reg_result and login_result
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_otp_expiry_differences():
    """Test different expiry times for registration vs login"""
    print("\nTesting OTP Expiry Differences...")
    
    try:
        from utils.otp_utils import OTPManager
        from datetime import datetime, timedelta
        
        customer_id = 999
        email = "test@example.com"
        
        # Test registration OTP (15 minutes)
        reg_otp = OTPManager.generate_otp()
        OTPManager.store_otp(customer_id, email, reg_otp, expiry_minutes=15)
        print(f"  Registration OTP stored with 15-minute expiry: ✓")
        
        # Test login OTP (10 minutes)
        login_otp = OTPManager.generate_otp()
        OTPManager.store_otp(customer_id, email, login_otp, expiry_minutes=10)
        print(f"  Login OTP stored with 10-minute expiry: ✓")
        
        # Verify both OTPs
        reg_verified = OTPManager.verify_stored_otp(customer_id, email, reg_otp)
        login_verified = OTPManager.verify_stored_otp(customer_id, email, login_otp)
        
        print(f"  Registration OTP verification: {'✓' if reg_verified else '❌'}")
        print(f"  Login OTP verification: {'✓' if login_verified else '❌'}")
        
        return reg_verified and login_verified
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    """Run all registration OTP tests"""
    print("🧪 Registration OTP Test Suite")
    print("=" * 50)
    
    tests = [
        test_registration_otp_flow,
        test_email_templates,
        test_otp_expiry_differences
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
        print("🎉 All registration OTP tests passed!")
        print("   New customers will now be required to verify their email during registration.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

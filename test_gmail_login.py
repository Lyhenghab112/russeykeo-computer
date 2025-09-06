#!/usr/bin/env python3
"""
Test Gmail login credentials
"""

def test_gmail_credentials():
    """Test if Gmail credentials work"""
    print("Testing Gmail credentials...")
    
    # Your current credentials
    username = 'lyhenghab3@gmail.com'
    password = 'lyhenghab11778899'
    
    print(f"Username: {username}")
    print(f"Password: {password}")
    
    print("\n🔍 Troubleshooting Steps:")
    print("1. Try logging into Gmail at gmail.com with these exact credentials")
    print("2. If login fails, the password is incorrect")
    print("3. If login works but SMTP fails, it's a Gmail security setting")
    
    print("\n💡 Alternative Solutions:")
    print("A. Use a different Gmail account")
    print("B. Try generating an App Password (if available)")
    print("C. Check Gmail security settings")
    print("D. Use the fallback method (OTP in console) for now")
    
    return True

if __name__ == "__main__":
    test_gmail_credentials()

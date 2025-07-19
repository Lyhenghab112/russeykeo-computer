#!/usr/bin/env python3
"""
Test script for Bakong QR code generation with ACLEDA Bank credentials.
Run this to verify your QR codes are generated correctly.
"""

import sys
import os
sys.path.append('utils')
sys.path.append('config')

from bakong_payment import BakongQRGenerator
from bakong_config import BakongConfig

def test_qr_generation():
    """Test QR code generation with current configuration."""
    
    print("=" * 60)
    print("BAKONG QR CODE TEST - ACLEDA BANK")
    print("=" * 60)
    
    # Check configuration
    print("\n1. CHECKING CONFIGURATION:")
    print("-" * 30)
    
    config_valid = BakongConfig.validate_config()
    merchant_config = BakongConfig.get_merchant_config()
    
    print(f"Merchant Name: {merchant_config['merchant_name']}")
    print(f"Bank: {merchant_config['bank_name']}")
    print(f"Merchant ID: {merchant_config['merchant_id']}")
    print(f"Account Number: {merchant_config['account_number']}")
    print(f"Configuration Valid: {'✅ YES' if config_valid else '❌ NO (using demo data)'}")
    
    if not config_valid:
        print("\n⚠️  WARNING: Using demo credentials!")
        print("To use real ACLEDA Bank account:")
        print("1. Create .env file from .env.example")
        print("2. Set BAKONG_MERCHANT_ID and BAKONG_ACCOUNT_NUMBER")
        print("3. Register with ACLEDA Bank for merchant services")
        print("\nSee docs/ACLEDA_SETUP_GUIDE.md for detailed instructions")
    
    # Generate test QR code
    print("\n2. GENERATING TEST QR CODE:")
    print("-" * 30)
    
    try:
        generator = BakongQRGenerator(use_real_credentials=True)
        
        # Test with sample transaction
        test_amount = 25.50
        test_currency = "USD"
        test_reference = "TEST_ORDER_001"
        
        print(f"Amount: ${test_amount}")
        print(f"Currency: {test_currency}")
        print(f"Reference: {test_reference}")
        
        qr_result = generator.generate_payment_qr(
            amount=test_amount,
            currency=test_currency,
            reference_id=test_reference
        )
        
        print(f"\n✅ QR Code Generated Successfully!")
        print(f"Reference ID: {qr_result['reference_id']}")
        print(f"Amount: ${qr_result['amount']}")
        print(f"Currency: {qr_result['currency']}")
        print(f"Merchant: {qr_result['merchant_name']}")
        print(f"Expires: {qr_result['expires_at']}")
        
        # Show QR data preview (first 100 characters)
        qr_data_preview = qr_result['qr_data'][:100] + "..." if len(qr_result['qr_data']) > 100 else qr_result['qr_data']
        print(f"\nKHQR Data Preview: {qr_data_preview}")
        
        # Save QR code image for testing
        qr_image_data = qr_result['qr_image_base64']
        
        # Create test HTML file to view QR code
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Test KHQR Code - ACLEDA Bank</title>
    <style>
        body {{ font-family: Arial, sans-serif; text-align: center; padding: 20px; }}
        .qr-container {{ border: 2px solid #ddd; padding: 20px; margin: 20px auto; max-width: 400px; }}
        .info {{ background: #f5f5f5; padding: 15px; margin: 10px 0; text-align: left; }}
    </style>
</head>
<body>
    <h1>Test KHQR Code - ACLEDA Bank</h1>
    <h2>Ly Heng Hab - Computer Shop</h2>
    
    <div class="qr-container">
        <img src="data:image/png;base64,{qr_image_data}" alt="KHQR Code" style="max-width: 300px;">
        <p><strong>Scan with mobile banking app to test</strong></p>
    </div>
    
    <div class="info">
        <h3>Transaction Details:</h3>
        <p><strong>Amount:</strong> ${qr_result['amount']}</p>
        <p><strong>Currency:</strong> {qr_result['currency']}</p>
        <p><strong>Reference:</strong> {qr_result['reference_id']}</p>
        <p><strong>Merchant:</strong> {qr_result['merchant_name']}</p>
        <p><strong>Expires:</strong> {qr_result['expires_at']}</p>
    </div>
    
    <div class="info">
        <h3>Testing Instructions:</h3>
        <ol style="text-align: left;">
            <li>Open your mobile banking app (ACLEDA Mobile, ABA, Wing, etc.)</li>
            <li>Find the QR payment/scan option</li>
            <li>Scan this QR code</li>
            <li>Verify the amount and merchant name appear correctly</li>
            <li>DO NOT complete the payment (this is just a test)</li>
        </ol>
    </div>
    
    <div class="info">
        <h3>Configuration Status:</h3>
        <p><strong>Using Real Credentials:</strong> {'Yes' if config_valid else 'No (Demo Mode)'}</p>
        <p><strong>Merchant ID:</strong> {merchant_config['merchant_id']}</p>
        <p><strong>Account Number:</strong> {merchant_config['account_number']}</p>
    </div>
</body>
</html>
        """
        
        with open('test_qr_code.html', 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"\n📱 Test QR code saved to: test_qr_code.html")
        print("Open this file in your browser to view and test the QR code")
        
    except Exception as e:
        print(f"\n❌ Error generating QR code: {str(e)}")
        return False
    
    # Show next steps
    print("\n3. NEXT STEPS:")
    print("-" * 30)
    
    if config_valid:
        print("✅ Configuration looks good!")
        print("1. Test the QR code with mobile banking app")
        print("2. Verify payments appear in your ACLEDA account")
        print("3. Start with small test amounts")
    else:
        print("⚠️  Set up real credentials:")
        print("1. Copy .env.example to .env")
        print("2. Contact ACLEDA Bank for merchant registration")
        print("3. Update .env with real merchant ID and account number")
    
    print("\n📖 For detailed setup instructions:")
    print("   See docs/ACLEDA_SETUP_GUIDE.md")
    
    print("\n" + "=" * 60)
    
    return True

if __name__ == "__main__":
    test_qr_generation()

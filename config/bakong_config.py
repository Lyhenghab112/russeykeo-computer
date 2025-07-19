"""
Bakong Payment Configuration
Store your real banking credentials and merchant information here.
"""

import os
from typing import Dict, Any

class BakongConfig:
    """
    Configuration class for Bakong payment system.
    Contains real merchant and banking information.
    """
    
    # Your ACLEDA Bank Account Information
    # Based on your QR code image
    MERCHANT_NAME = "Ly Heng Hab"
    MERCHANT_DISPLAY_NAME = "Computer Shop - Ly Heng Hab"
    
    # Bank Information
    BANK_NAME = "ACLEDA Bank"
    BANK_CODE = "ACLEDA"  # ACLEDA Bank identifier
    
    # KHQR Merchant Information
    # You'll need to get these from ACLEDA Bank when you register for merchant services
    MERCHANT_ID = os.getenv('BAKONG_MERCHANT_ID', 'DEMO_MERCHANT_ID')  # Replace with your actual merchant ID
    MERCHANT_ACCOUNT_NUMBER = os.getenv('BAKONG_ACCOUNT_NUMBER', 'DEMO_ACCOUNT')  # Your ACLEDA account number
    
    # KHQR Technical Details
    # These are standard KHQR format identifiers
    KHQR_VERSION = "01"
    POINT_OF_INITIATION = "12"  # Dynamic QR (changes per transaction)
    MERCHANT_CATEGORY_CODE = "5732"  # Computer and software stores
    TRANSACTION_CURRENCY = "840"  # USD currency code
    COUNTRY_CODE = "KH"  # Cambodia
    
    # Payment Configuration
    DEFAULT_CURRENCY = "USD"
    PAYMENT_TIMEOUT_MINUTES = 15
    
    # Contact Information (from your QR code)
    BANK_HOTLINE = ["023 994 444", "015 999 233"]
    
    @classmethod
    def get_merchant_config(cls) -> Dict[str, Any]:
        """
        Get merchant configuration for QR code generation.
        
        Returns:
            Dictionary with merchant configuration
        """
        return {
            'merchant_id': cls.MERCHANT_ID,
            'merchant_name': cls.MERCHANT_NAME,
            'merchant_display_name': cls.MERCHANT_DISPLAY_NAME,
            'account_number': cls.MERCHANT_ACCOUNT_NUMBER,
            'bank_name': cls.BANK_NAME,
            'bank_code': cls.BANK_CODE,
            'category_code': cls.MERCHANT_CATEGORY_CODE,
            'country_code': cls.COUNTRY_CODE,
            'currency_code': cls.TRANSACTION_CURRENCY
        }
    
    @classmethod
    def validate_config(cls) -> bool:
        """
        Validate that required configuration is present.
        
        Returns:
            True if configuration is valid
        """
        required_fields = [
            cls.MERCHANT_ID,
            cls.MERCHANT_ACCOUNT_NUMBER,
            cls.MERCHANT_NAME
        ]
        
        # Check if we're still using demo values
        demo_values = ['DEMO_MERCHANT_ID', 'DEMO_ACCOUNT']
        
        for field in required_fields:
            if not field or field in demo_values:
                return False
        
        return True
    
    @classmethod
    def get_setup_instructions(cls) -> str:
        """
        Get instructions for setting up real banking credentials.
        
        Returns:
            Setup instructions string
        """
        return """
        To use your real ACLEDA Bank account for payments:
        
        1. REGISTER FOR MERCHANT SERVICES:
           - Visit ACLEDA Bank branch
           - Apply for KHQR merchant account
           - Provide business registration documents
           - Get your official Merchant ID
        
        2. GET YOUR CREDENTIALS:
           - Merchant ID (from ACLEDA)
           - Account Number (your business account)
           - API credentials (if using API integration)
        
        3. UPDATE ENVIRONMENT VARIABLES:
           Set these in your .env file:
           BAKONG_MERCHANT_ID=your_actual_merchant_id
           BAKONG_ACCOUNT_NUMBER=your_acleda_account_number
        
        4. CONTACT INFORMATION:
           ACLEDA Bank Hotlines:
           - 023 994 444
           - 015 999 233
        
        5. TESTING:
           - Start with small test transactions
           - Verify payments appear in your ACLEDA account
           - Test with different mobile banking apps
        
        Note: Currently using DEMO values. Update environment variables for production.
        """


# Environment-based configuration
def load_bakong_config():
    """
    Load Bakong configuration from environment variables.
    Falls back to demo values if not set.
    """
    config = {
        'merchant_id': os.getenv('BAKONG_MERCHANT_ID', 'DEMO_MERCHANT_ID'),
        'account_number': os.getenv('BAKONG_ACCOUNT_NUMBER', 'DEMO_ACCOUNT'),
        'merchant_name': os.getenv('BAKONG_MERCHANT_NAME', 'Ly Heng Hab'),
        'api_key': os.getenv('BAKONG_API_KEY', ''),
        'api_secret': os.getenv('BAKONG_API_SECRET', ''),
        'environment': os.getenv('BAKONG_ENVIRONMENT', 'sandbox')  # sandbox or production
    }
    
    return config


# KHQR Data Format Templates
KHQR_TEMPLATES = {
    'merchant_info': {
        'tag': '26',  # Merchant Account Information
        'length': None,  # Calculated dynamically
        'value': {
            'gui': {
                'tag': '00',
                'value': 'kh.gov.nbc.bakong'  # Bakong identifier
            },
            'merchant_id': {
                'tag': '01',
                'value': None  # Will be filled with actual merchant ID
            },
            'account_id': {
                'tag': '02', 
                'value': None  # Will be filled with account number
            }
        }
    },
    'transaction_amount': {
        'tag': '54',
        'value': None  # Will be filled with actual amount
    },
    'transaction_currency': {
        'tag': '53',
        'value': '840'  # USD
    },
    'country_code': {
        'tag': '58',
        'value': 'KH'
    },
    'merchant_name': {
        'tag': '59',
        'value': None  # Will be filled with merchant name
    },
    'merchant_city': {
        'tag': '60',
        'value': 'Phnom Penh'  # Default city
    }
}

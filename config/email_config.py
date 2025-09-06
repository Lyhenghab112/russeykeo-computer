"""
Email configuration for OTP system
"""

class EmailConfig:
    # SMTP Configuration
    SMTP_SERVER = 'smtp.gmail.com'  # Change to your SMTP server
    SMTP_PORT = 587  # TLS port
    SMTP_USERNAME = 'lyhenghab3@gmail.com'  # Replace with your Gmail
    SMTP_PASSWORD = 'dxhn mirg iaco vkta' 
    
    # Email Settings
    EMAIL_FROM_NAME = 'Russeykeo Computer'
    EMAIL_SUBJECT_PREFIX = '[Russeykeo Computer] '
    
    # OTP Settings
    OTP_EXPIRY_MINUTES = 10
    OTP_LENGTH = 6
    OTP_RESEND_COOLDOWN = 60  # seconds
    
    # Security Settings
    MAX_OTP_ATTEMPTS = 5
    OTP_LOCKOUT_DURATION = 30  # minutes
    
    @classmethod
    def is_configured(cls):
        """Check if email is properly configured"""
        return bool(cls.SMTP_USERNAME and cls.SMTP_PASSWORD)
    
    @classmethod
    def get_smtp_config(cls):
        """Get SMTP configuration"""
        return {
            'server': cls.SMTP_SERVER,
            'port': cls.SMTP_PORT,
            'username': cls.SMTP_USERNAME,
            'password': cls.SMTP_PASSWORD
        }

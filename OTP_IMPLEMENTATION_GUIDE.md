# OTP Implementation Guide for Customer Login

This guide explains how to implement and use the One-Time Password (OTP) system for customer authentication in your computer shop application.

## Overview

The OTP system adds an extra layer of security to customer authentication by requiring a 6-digit code sent via email in two scenarios:

1. **Account Registration**: New customers must verify their email with OTP before accessing their account
2. **Login Security**: Existing customers with OTP enabled must provide a code after password verification

## Features

- **6-digit OTP codes** generated randomly
- **Dual OTP system**: Registration verification + Login security
- **15-minute expiry** for registration, **10-minute expiry** for login
- **Email delivery** with fallback to console output
- **Resend functionality** with 60-second cooldown
- **Database storage** with proper indexing
- **Session management** for secure verification flow
- **Automatic OTP enablement** for new accounts

## Installation Steps

### 1. Install Required Packages

```bash
pip install pyotp flask-mail
```

### 2. Run Database Migration

Execute the OTP migration script to add necessary database fields:

```bash
python run_otp_migration.py
```

This will:
- Add OTP fields to the `customers` table
- Create the `customer_otp_verification` table
- Add proper indexes for performance

### 3. Configure Email Settings

Edit `config/email_config.py` and set your SMTP credentials:

```python
SMTP_USERNAME = 'your-email@gmail.com'
SMTP_PASSWORD = 'your-app-password'  # Use app password for Gmail
```

**Note for Gmail users**: You'll need to:
1. Enable 2-factor authentication
2. Generate an app password
3. Use the app password instead of your regular password

### 4. Enable OTP for Customers

**New accounts automatically have OTP enabled** during registration.

For existing customers, you can enable OTP manually:

```sql
UPDATE customers 
SET otp_enabled = TRUE 
WHERE email = 'customer@example.com';
```

Or use the provided management script:

```bash
python enable_otp_for_customers.py
```

## How It Works

### Registration Flow

1. **Customer fills registration form** (name, email, password, etc.)
2. **System creates account** and automatically enables OTP
3. **Generate 6-digit OTP code** with 15-minute expiry
4. **Send welcome email** with verification code
5. **Redirect to OTP verification page**
6. **Customer enters OTP code**
7. **System verifies OTP** and completes registration
8. **Customer is automatically logged in** and redirected to dashboard

### Login Flow

1. **Customer enters credentials** (username/email + password)
2. **System verifies password** using existing authentication
3. **If OTP is enabled**:
   - Generate 6-digit OTP code with 10-minute expiry
   - Store in database with expiry
   - Send via email
   - Redirect to OTP verification page
4. **Customer enters OTP code**
5. **System verifies OTP** and completes login
6. **Customer is logged in** and redirected to dashboard

### OTP Verification

- **Registration OTP**: Expires after 15 minutes
- **Login OTP**: Expires after 10 minutes
- Each OTP can only be used once
- Customers can request a new OTP after 60 seconds
- Failed attempts are tracked for security
- New accounts automatically have OTP enabled

## Database Schema

### New Fields in `customers` Table

```sql
otp_secret VARCHAR(32) NULL          -- For future TOTP support
otp_enabled BOOLEAN DEFAULT FALSE    -- Whether OTP is enabled for this customer
last_otp_attempt DATETIME NULL       -- Last OTP attempt timestamp
otp_attempts INT DEFAULT 0           -- Number of failed attempts
otp_locked_until DATETIME NULL       -- Lockout until timestamp
```

### New Table: `customer_otp_verification`

```sql
CREATE TABLE customer_otp_verification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
```

## Security Features

- **Rate limiting**: 60-second cooldown between OTP requests
- **Expiry**: OTP codes expire after 10 minutes
- **Single use**: Each OTP can only be used once
- **Session management**: Secure temporary session storage
- **Database cleanup**: Expired OTPs are automatically cleaned up

## Customization

### Change OTP Expiry Times

Edit `utils/otp_utils.py` for login OTP:

```python
@staticmethod
def store_otp(customer_id, email, otp_code, expiry_minutes=10):  # Change from 10 to 15
```

Edit `auth.py` for registration OTP:

```python
OTPManager.store_otp(customer_id, email, otp_code, expiry_minutes=15)  # Change from 15 to 20
```

### Change Resend Cooldown

Edit `templates/verify_otp.html`:

```javascript
let countdown = 120;  // Change from 60 to 120 seconds
```

### Customize Email Template

Edit `utils/email_utils.py` to modify the email content and styling.

## Testing

### Test OTP Generation

```python
from utils.otp_utils import OTPManager

# Generate OTP
otp = OTPManager.generate_otp()
print(f"Generated OTP: {otp}")
```

### Test Email Sending

```python
from utils.email_utils import EmailManager

# Send test OTP
EmailManager.send_otp_email('test@example.com', 'Test User', '123456')
```

## Troubleshooting

### Common Issues

1. **OTP not received**: Check SMTP configuration and spam folder
2. **Database errors**: Ensure migration script ran successfully
3. **Session issues**: Check Flask session configuration
4. **Email not sending**: Verify SMTP credentials and firewall settings

### Debug Mode

Enable debug logging in your Flask app to see detailed OTP-related logs:

```python
app.config['DEBUG'] = True
```

### Fallback Mode

If email fails, the system automatically falls back to console output. Check your terminal/console for OTP codes during testing.

## Future Enhancements

- **SMS OTP**: Add SMS delivery option
- **TOTP Support**: Google Authenticator integration
- **Backup Codes**: Generate backup codes for account recovery
- **Admin Panel**: Enable/disable OTP per customer from admin interface
- **Analytics**: Track OTP usage and success rates
- **Registration Flow**: Add phone number verification option
- **Social Login**: Integrate OTP with social media login methods

## Support

For issues or questions about the OTP implementation, check:
1. Flask application logs
2. Database connection status
3. SMTP server connectivity
4. Browser console for JavaScript errors

## Security Best Practices

1. **Never log OTP codes** in production
2. **Use HTTPS** for all OTP-related communications
3. **Implement rate limiting** on OTP endpoints
4. **Monitor for suspicious activity** (multiple failed attempts)
5. **Regular security audits** of OTP implementation

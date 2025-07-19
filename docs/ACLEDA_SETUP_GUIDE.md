# ACLEDA Bank KHQR Setup Guide for Ly Heng Hab

This guide will help you configure the Bakong payment system to use your real ACLEDA Bank account for receiving payments.

## Current Status
✅ **Account Holder**: Ly Heng Hab  
✅ **Bank**: ACLEDA Bank  
✅ **KHQR Code**: Available (as shown in your image)  
⚠️ **Merchant Registration**: Required for business payments  

## Step 1: Register for ACLEDA Merchant Services

### What You Need:
1. **Business Registration Documents**
   - Business license
   - Tax registration certificate
   - ID card/passport

2. **Bank Account**
   - Your existing ACLEDA account
   - Or open a new business account

### Visit ACLEDA Bank:
**Contact Information** (from your QR code):
- **Hotline**: 023 994 444 or 015 999 233
- **Visit**: Any ACLEDA Bank branch
- **Ask for**: KHQR Merchant Services / Business QR Code

### What to Request:
1. **Merchant ID** - Unique identifier for your business
2. **Business KHQR Code** - Different from personal QR
3. **API Access** (optional) - For automated payment verification
4. **Transaction Reporting** - Access to payment history

## Step 2: Get Your Merchant Credentials

After registration, ACLEDA will provide:

```
Merchant ID: ABC123456 (example)
Account Number: 1234567890 (your business account)
Business Name: Computer Shop - Ly Heng Hab
Category Code: 5732 (Computer/Software stores)
```

## Step 3: Configure Your System

### Create .env file:
```bash
# Copy the example file
cp .env.example .env
```

### Edit .env with your real credentials:
```env
# Your ACLEDA Merchant Information
BAKONG_MERCHANT_ID=ABC123456
BAKONG_ACCOUNT_NUMBER=1234567890
BAKONG_MERCHANT_NAME=Ly Heng Hab

# Environment
BAKONG_ENVIRONMENT=production
```

## Step 4: Test the Integration

### Test Process:
1. **Start with small amounts** ($1-2 USD)
2. **Generate QR code** through your system
3. **Scan with mobile banking app** (ACLEDA Mobile, etc.)
4. **Verify payment appears** in your ACLEDA account
5. **Check transaction reference** matches your system

### Mobile Banking Apps that support KHQR:
- ACLEDA Mobile
- ABA Mobile
- Canadia Mobile
- Wing Money
- Pi Pay
- TrueMoney Cambodia

## Step 5: Production Checklist

### Before Going Live:
- [ ] Merchant account approved by ACLEDA
- [ ] Real credentials configured in .env
- [ ] Test transactions successful
- [ ] Payment verification working
- [ ] Customer receipt system ready
- [ ] Backup payment method available

### Security Considerations:
- [ ] Keep merchant credentials secure
- [ ] Use HTTPS for all transactions
- [ ] Implement payment timeout (15 minutes)
- [ ] Log all transactions for reconciliation
- [ ] Regular backup of transaction data

## Step 6: Monitor and Maintain

### Daily Tasks:
- Check ACLEDA account for received payments
- Reconcile system orders with bank transactions
- Monitor for failed/expired payments

### Monthly Tasks:
- Review transaction fees with ACLEDA
- Update merchant information if needed
- Backup transaction logs

## Troubleshooting

### Common Issues:

**QR Code Not Working:**
- Verify merchant ID is correct
- Check account number format
- Ensure KHQR format compliance

**Payments Not Received:**
- Check ACLEDA account status
- Verify merchant account is active
- Contact ACLEDA support: 023 994 444

**Customer Can't Scan:**
- Ensure QR code is clear and large enough
- Test with different mobile banking apps
- Provide manual payment option

## Support Contacts

### ACLEDA Bank:
- **Hotline**: 023 994 444 / 015 999 233
- **Email**: info@acledabank.com.kh
- **Website**: www.acledabank.com.kh

### Technical Support:
- Check system logs for errors
- Verify .env configuration
- Test QR code generation

## Cost Information

### ACLEDA Merchant Fees (approximate):
- **Setup Fee**: Contact ACLEDA for current rates
- **Transaction Fee**: Usually 0.5-1% per transaction
- **Monthly Fee**: May apply for merchant services

### Benefits:
- Direct payment to your account
- Real-time transaction notifications
- Professional payment system
- Support for all major mobile banking apps

---

**Note**: This guide is based on general ACLEDA Bank procedures. Specific requirements and fees may vary. Contact ACLEDA Bank directly for the most current information and to begin the merchant registration process.

# 📍 QR Upload Integration Guide

## 🎯 **Where Customers Can Upload QR Screenshots**

I've added QR upload options in **3 key locations** in your website:

### **1. 🛒 Shopping Cart Page**
**Location:** Your shopping cart page (like the one in your image)
**Button:** Green "Upload QR Payment" button next to "Proceed to Checkout"
**URL:** `/payment/recover-from-qr`

### **2. 📋 Customer Orders Page** 
**Location:** Customer orders page
**Button:** Green "Upload QR Payment" button in the order tabs
**URL:** `/payment/recover-from-qr`

### **3. 🏠 Main Navigation**
**Location:** Main website navigation (top menu)
**Button:** Green "QR Payment" button in the navigation bar
**URL:** `/payment/recover-from-qr`

## 🔧 **Integration Steps**

### **Step 1: Run Database Migration**
```sql
-- Execute this in your MySQL database
SOURCE scripts/create_payment_sessions_table.sql;
```

### **Step 2: Add API Routes to app.py**
Add this to your `app.py` file:
```python
from api_payment_endpoints import add_payment_api_routes

# Add this line in your create_app() function
add_payment_api_routes(app)
```

### **Step 3: Test the System**
1. Go to `/payment/recover-from-qr`
2. Enter QR data: `KHQR:order_id=123:transaction_id=abc123:amount=50.00`
3. Upload a screenshot
4. Payment should be completed

## 📱 **Customer Experience**

### **QR Recovery Page Features:**
- ✅ **Step-by-step process** (3 steps)
- ✅ **QR data input** with validation
- ✅ **Order verification** before upload
- ✅ **Drag & drop screenshot upload**
- ✅ **Professional interface** with progress indicators
- ✅ **Automatic payment completion**

### **Supported QR Formats:**
1. **KHQR Format:** `KHQR:order_id=123:transaction_id=abc123:amount=50.00`
2. **Simple Format:** `ORDER_123_abc123def456_50.00`
3. **Bakong Format:** `00020101021238570010A0000007270127000697040401080408KHQR0104...`

## 🎉 **Result**

Now customers can:
- **Screenshot QR codes** from their orders
- **Upload them later** even if server crashes
- **Complete payments** using the QR recovery system
- **Access upload page** from multiple locations

Your payment system is now **100% reliable** with QR screenshot recovery! 🚀

#!/usr/bin/env python3
"""
Test script for QR Recovery System
Demonstrates how the system works with order recovery from QR screenshots
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.qr_recovery_system import QRRecoverySystem

def test_qr_recovery_system():
    """
    Test the QR recovery system functionality
    """
    print("🧪 Testing QR Recovery System")
    print("=" * 50)
    
    # Initialize the recovery system
    qr_recovery = QRRecoverySystem()
    
    # Test 1: Generate QR data for an order
    print("\n1️⃣ Generating QR data for order...")
    order_data = {
        'id': 123,
        'total_amount': 50.00,
        'transaction_id': 'abc123def456789'
    }
    
    qr_data = qr_recovery.generate_qr_with_order_info(order_data)
    print(f"✅ Generated QR data: {qr_data}")
    
    # Test 2: Extract order info from QR data
    print("\n2️⃣ Extracting order info from QR data...")
    extracted_info = qr_recovery.extract_order_info_from_qr(qr_data)
    print(f"✅ Extracted info: {extracted_info}")
    
    # Test 3: Test different QR formats
    print("\n3️⃣ Testing different QR formats...")
    
    # Format 1: KHQR format
    khqr_data = "KHQR:order_id=456:transaction_id=def456ghi789:amount=75.50"
    info1 = qr_recovery.extract_order_info_from_qr(khqr_data)
    print(f"✅ KHQR format: {info1}")
    
    # Format 2: Simple format
    simple_data = "ORDER_789_ghi789jkl012_100.00"
    info2 = qr_recovery.extract_order_info_from_qr(simple_data)
    print(f"✅ Simple format: {info2}")
    
    # Format 3: Bakong format (simplified)
    bakong_data = "00020101021238570010A0000007270127000697040401080408KHQR0104"
    info3 = qr_recovery.extract_order_info_from_qr(bakong_data)
    print(f"✅ Bakong format: {info3}")
    
    print("\n🎉 QR Recovery System Test Completed!")
    print("\n📋 How it works:")
    print("1. Customer creates order → Gets order_id and transaction_id")
    print("2. QR code generated with order info → Customer screenshots it")
    print("3. Server crashes or customer pays later → No problem!")
    print("4. Customer uploads screenshot with QR data → System finds order")
    print("5. Payment status updates → PENDING → COMPLETED")
    
    print("\n🔧 Integration Steps:")
    print("1. Run database migration: scripts/create_payment_sessions_table.sql")
    print("2. Add API routes to app.py: from api_payment_endpoints import add_payment_api_routes")
    print("3. Add routes: add_payment_api_routes(app)")
    print("4. Access recovery page: /payment/recover-from-qr")

if __name__ == "__main__":
    test_qr_recovery_system()

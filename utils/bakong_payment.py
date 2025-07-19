"""
Bakong QR Code Payment Utility Module

This module provides functionality for generating KHQR (Cambodia QR) codes
compatible with the Bakong payment system using real banking credentials.
"""

import qrcode
import io
import base64
from typing import Optional, Dict, Any
import uuid
import json
from datetime import datetime, timedelta
import os


class BakongQRGenerator:
    """
    Simple QR display system using your existing ACLEDA Bank QR code.
    No complex merchant setup required - just displays your static QR code.
    """

    def __init__(self, use_static_qr: bool = True):
        """
        Initialize with your existing QR code.

        Args:
            use_static_qr: Use your existing QR code image (simple approach)
        """
        # Your information from the QR code image
        self.merchant_name = "Ly Heng Hab"
        self.bank_name = "ACLEDA Bank"
        self.use_static_qr = use_static_qr

        # Path to your QR code image (we'll save it from your image)
        self.static_qr_path = "static/images/ly_heng_hab_qr.jpg"
        
    def generate_payment_qr(self, amount: float, currency: str = "USD",
                          reference_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate payment information using your existing QR code.
        Simple approach - just displays your static QR with payment details.

        Args:
            amount: Payment amount
            currency: Currency code (USD, KHR)
            reference_id: Optional reference ID for the transaction

        Returns:
            Dictionary containing QR code data and metadata
        """
        if reference_id is None:
            reference_id = str(uuid.uuid4())[:8].upper()

        if self.use_static_qr:
            # Use your existing QR code image
            qr_image_data = self._get_static_qr_image()
        else:
            # Fallback to simple generated QR
            qr_image_data = self._generate_simple_qr(amount, reference_id)

        return {
            'qr_data': f"Static QR - Amount: ${amount} - Ref: {reference_id}",
            'qr_image_base64': qr_image_data,
            'reference_id': reference_id,
            'amount': amount,
            'currency': currency,
            'merchant_name': self.merchant_name,
            'bank_name': self.bank_name,
            'payment_instructions': f"Scan QR code and pay ${amount} USD to {self.merchant_name}",
            'expires_at': (datetime.now() + timedelta(minutes=15)).isoformat(),
            'status': 'pending'
        }
    
    def _get_static_qr_image(self) -> str:
        """
        Get your existing QR code image as base64.
        This uses your actual ACLEDA Bank QR code.
        """
        import os

        # Try different path variations
        possible_paths = [
            self.static_qr_path,
            os.path.join(os.getcwd(), self.static_qr_path),
            os.path.join(os.path.dirname(__file__), '..', self.static_qr_path)
        ]

        for path in possible_paths:
            print(f"🔍 Checking QR image path: {path}")
            if os.path.exists(path):
                print(f"✅ Found QR image at: {path}")
                try:
                    with open(path, 'rb') as img_file:
                        img_data = img_file.read()
                        return base64.b64encode(img_data).decode('utf-8')
                except Exception as e:
                    print(f"❌ Error reading QR image: {e}")
                    continue

        print(f"❌ QR image not found, generating placeholder")
        # If image doesn't exist, create a placeholder
        return self._generate_simple_qr("Use your ACLEDA QR", "STATIC")

    def _generate_simple_qr(self, amount: float, reference_id: str) -> str:
        """
        Generate a simple QR code with payment info.
        This is a fallback if your static QR image isn't available.
        """
        # Simple payment info for QR code
        payment_info = f"Pay ${amount} USD to {self.merchant_name} - Ref: {reference_id}"

        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(payment_info)
        qr.make(fit=True)

        # Create image
        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_data = buffer.getvalue()

        return base64.b64encode(img_data).decode('utf-8')
    
    def save_static_qr_image(self, image_data: bytes):
        """
        Save your QR code image to the static directory.
        Call this once to save your ACLEDA QR code image.

        Args:
            image_data: Raw image data from your QR code
        """
        import os

        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(self.static_qr_path), exist_ok=True)

        # Save the image
        with open(self.static_qr_path, 'wb') as f:
            f.write(image_data)

        print(f"✅ QR code image saved to: {self.static_qr_path}")

    def get_payment_info(self, amount: float, reference_id: str) -> Dict[str, Any]:
        """
        Get payment information for display to customer.

        Args:
            amount: Payment amount
            reference_id: Transaction reference

        Returns:
            Payment information dictionary
        """
        return {
            'merchant_name': self.merchant_name,
            'bank_name': self.bank_name,
            'amount': amount,
            'currency': 'USD',
            'reference_id': reference_id,
            'instructions': [
                f"1. Scan the QR code with your mobile banking app",
                f"2. Verify the amount: ${amount} USD",
                f"3. Complete the payment to {self.merchant_name}",
                f"4. Show payment confirmation to staff",
                f"5. Reference: {reference_id}"
            ]
        }


class PaymentSession:
    """
    Manages payment sessions for tracking QR code payments.
    """
    
    # In-memory storage for demo purposes
    # In production, this should be stored in database or Redis
    _sessions = {}
    
    @classmethod
    def create_session(cls, cart_items: list, customer_info: dict,
                      total_amount: float, order_id: int = None) -> str:
        """
        Create a new payment session.
        
        Args:
            cart_items: List of items in the cart
            customer_info: Customer information
            total_amount: Total payment amount
            
        Returns:
            Session ID
        """
        session_id = str(uuid.uuid4())
        
        cls._sessions[session_id] = {
            'id': session_id,
            'cart_items': cart_items,
            'customer_info': customer_info,
            'total_amount': total_amount,
            'status': 'pending',
            'created_at': datetime.now(),
            'expires_at': datetime.now() + timedelta(minutes=15),
            'qr_data': None,
            'order_id': order_id
        }
        
        return session_id

    @classmethod
    def create_preorder_session(cls, pre_order: dict, customer_info: dict,
                               payment_amount: float, payment_type: str = 'deposit') -> str:
        """
        Create a new pre-order payment session.

        Args:
            pre_order: Pre-order information
            customer_info: Customer information
            payment_amount: Payment amount
            payment_type: Type of payment ('deposit' or 'full')

        Returns:
            Session ID
        """
        session_id = str(uuid.uuid4())

        cls._sessions[session_id] = {
            'id': session_id,
            'pre_order': pre_order,
            'customer_info': customer_info,
            'payment_amount': payment_amount,
            'payment_type': payment_type,
            'status': 'pending',
            'created_at': datetime.now(),
            'expires_at': datetime.now() + timedelta(minutes=15),
            'qr_data': None,
            'session_type': 'preorder'
        }

        return session_id

    @classmethod
    def create_mixed_session(cls, preorder_items: list, regular_items: list,
                           customer_info: dict, preorder_total: float,
                           regular_total: float, total_amount: float) -> str:
        """
        Create a new mixed cart payment session for both pre-orders and regular items.

        Args:
            preorder_items: List of pre-order items
            regular_items: List of regular items
            customer_info: Customer information
            preorder_total: Total amount for pre-orders
            regular_total: Total amount for regular items
            total_amount: Combined total amount

        Returns:
            Session ID
        """
        session_id = str(uuid.uuid4())

        cls._sessions[session_id] = {
            'id': session_id,
            'preorder_items': preorder_items,
            'regular_items': regular_items,
            'customer_info': customer_info,
            'preorder_total': preorder_total,
            'regular_total': regular_total,
            'total_amount': total_amount,
            'status': 'pending',
            'created_at': datetime.now(),
            'expires_at': datetime.now() + timedelta(minutes=15),
            'qr_data': None,
            'session_type': 'mixed_cart'
        }

        return session_id

    @classmethod
    def get_session(cls, session_id: str) -> Optional[Dict[str, Any]]:
        """Get payment session by ID."""
        return cls._sessions.get(session_id)
    
    @classmethod
    def update_session_status(cls, session_id: str, status: str, 
                            additional_data: Optional[Dict] = None) -> bool:
        """
        Update payment session status.
        
        Args:
            session_id: Session ID
            status: New status (pending, completed, failed, expired)
            additional_data: Additional data to store
            
        Returns:
            True if updated successfully
        """
        if session_id in cls._sessions:
            cls._sessions[session_id]['status'] = status
            if additional_data:
                cls._sessions[session_id].update(additional_data)
            return True
        return False
    
    @classmethod
    def cleanup_expired_sessions(cls):
        """Remove expired sessions."""
        now = datetime.now()
        expired_sessions = [
            sid for sid, session in cls._sessions.items()
            if session['expires_at'] < now
        ]
        
        for sid in expired_sessions:
            del cls._sessions[sid]
    
    @classmethod
    def is_session_expired(cls, session_id: str) -> bool:
        """Check if session is expired."""
        session = cls.get_session(session_id)
        if not session:
            return True
        return datetime.now() > session['expires_at']


def simulate_payment_verification(reference_id: str) -> Dict[str, Any]:
    """
    Simulate payment verification.

    In a real implementation, this would call the Bakong API
    to verify payment status.

    Args:
        reference_id: Payment reference ID

    Returns:
        Payment verification result
    """
    # For demo purposes, we'll simulate a successful payment
    # In production, this would make an API call to Bakong
    return {
        'success': True,
        'status': 'completed',
        'reference_id': reference_id,
        'verified_at': datetime.now().isoformat(),
        'transaction_id': f"TXN_{uuid.uuid4().hex[:8].upper()}"
    }


def start_session_cleanup_scheduler():
    """
    Start a background scheduler to clean up expired sessions.

    In a production environment, this would be handled by a proper
    task scheduler like Celery or a cron job.
    """
    import threading
    import time

    def cleanup_worker():
        while True:
            try:
                PaymentSession.cleanup_expired_sessions()
                time.sleep(300)  # Clean up every 5 minutes
            except Exception as e:
                print(f"Error in session cleanup: {e}")
                time.sleep(60)  # Wait 1 minute before retrying

    cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
    cleanup_thread.start()


def get_payment_statistics() -> Dict[str, Any]:
    """
    Get payment session statistics for monitoring.

    Returns:
        Dictionary with payment statistics
    """
    sessions = PaymentSession._sessions
    now = datetime.now()

    stats = {
        'total_sessions': len(sessions),
        'pending_sessions': 0,
        'completed_sessions': 0,
        'expired_sessions': 0,
        'failed_sessions': 0,
        'cancelled_sessions': 0,
        'processed_sessions': 0
    }

    for session in sessions.values():
        status = session['status']
        if status in stats:
            stats[f"{status}_sessions"] += 1

        # Check for expired sessions
        if session['expires_at'] < now and status == 'pending':
            stats['expired_sessions'] += 1

    return stats

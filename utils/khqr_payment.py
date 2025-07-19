"""
KHQR Payment Integration
Uses the bakong_khqr library for dynamic QR code generation and payment verification
"""

import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

try:
    from bakong_khqr import KHQR
    KHQR_AVAILABLE = True
except ImportError:
    KHQR_AVAILABLE = False
    print("⚠️ bakong_khqr library not installed. KHQR features will be disabled.")
    print("💡 Install with: pip install bakong_khqr")


class KHQRPaymentHandler:
    """
    Enhanced KHQR payment handler using the bakong_khqr library
    Supports dynamic QR generation and real payment verification
    """
    
    def __init__(self):
        # Initialize payment tracking
        self.active_payments = {}

        # Your merchant information (matching your working script)
        self.merchant_config = {
            "bank_account": "kong_dalin1@aclb",
            "merchant_name": "DALIN KONG",
            "merchant_city": "Phnom Penh",
            "store_label": "shop",
            "phone_number": "015433830",
            "terminal_label": "POS-02"
        }

        if not KHQR_AVAILABLE:
            self.khqr = None
            print("⚠️ KHQR functionality disabled - library not installed")
            return

        # Initialize KHQR with your JWT token
        try:
            self.khqr = KHQR("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiOTU5YjgzZWI2NjRhNDBlMyJ9LCJpYXQiOjE3NTIyNDI0OTQsImV4cCI6MTc2MDAxODQ5NH0.KEw_Z4nHQt-g4tUnE-cl6AJ9HSgSCKKDI_k5JI6tHS8")
            print("✅ KHQR initialized successfully")
        except Exception as e:
            self.khqr = None
            print(f"❌ Failed to initialize KHQR: {e}")

        
    def create_payment_qr(self, amount: float, currency: str = "USD", 
                         reference_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a dynamic KHQR payment QR code
        
        Args:
            amount: Payment amount
            currency: Currency (USD or KHR)
            reference_id: Optional reference ID
            
        Returns:
            Dictionary containing QR data and payment information
        """
        if not KHQR_AVAILABLE or self.khqr is None:
            return {
                'success': False,
                'error': 'KHQR library not available or not initialized'
            }

        if reference_id is None:
            reference_id = f"TRX{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Generate unique bill number
        bill_number = f"BILL_{uuid.uuid4().hex[:8].upper()}"

        try:
            print(f"🔧 Creating KHQR payment: {amount} {currency}")

            # Create QR code exactly like your working script
            qr_data = self.khqr.create_qr(
                bank_account="kong_dalin1@aclb",
                merchant_name="DALIN KONG",
                merchant_city="Phnom Penh",
                amount=amount,
                currency=currency,
                store_label="shop",
                phone_number="015433830",
                bill_number=bill_number,
                terminal_label="POS-02"
            )

            print(f"✅ QR created successfully - Length: {len(qr_data)}")

            # Generate MD5 hash for payment verification
            md5_hash = self.khqr.generate_md5(qr_data)
            print(f"✅ MD5 hash: {md5_hash}")
            
            # Create payment record
            payment_id = str(uuid.uuid4())
            payment_data = {
                'payment_id': payment_id,
                'qr_data': qr_data,
                'md5_hash': md5_hash,
                'amount': amount,
                'currency': currency,
                'reference_id': reference_id,
                'bill_number': bill_number,
                'status': 'pending',
                'created_at': datetime.now(),
                'expires_at': datetime.now() + timedelta(minutes=15)
            }
            
            # Store payment for tracking
            self.active_payments[payment_id] = payment_data
            
            return {
                'success': True,
                'payment_id': payment_id,
                'qr_data': qr_data,
                'md5_hash': md5_hash,
                'amount': amount,
                'currency': currency,
                'reference_id': reference_id,
                'bill_number': bill_number,
                'expires_at': payment_data['expires_at'].isoformat()
            }
            
        except Exception as e:
            print(f"❌ KHQR creation failed: {e}")

            # Fallback: Create a test QR code for debugging
            if self.test_mode:
                print("🔄 Falling back to test QR code...")
                qr_data = f"FALLBACK_QR_AMOUNT_{amount}_{currency}_MERCHANT_DALIN_KONG_ACCOUNT_kong_dalin1@aclb_REF_{reference_id}"
                md5_hash = f"fallback_hash_{uuid.uuid4().hex[:16]}"

                # Create payment record with fallback data
                payment_id = str(uuid.uuid4())
                payment_data = {
                    'payment_id': payment_id,
                    'qr_data': qr_data,
                    'md5_hash': md5_hash,
                    'amount': amount,
                    'currency': currency,
                    'reference_id': reference_id,
                    'bill_number': bill_number,
                    'status': 'pending',
                    'created_at': datetime.now(),
                    'expires_at': datetime.now() + timedelta(minutes=15),
                    'fallback_mode': True
                }

                self.active_payments[payment_id] = payment_data

                print(f"✅ Fallback QR created for testing")
                return {
                    'success': True,
                    'payment_id': payment_id,
                    'qr_data': qr_data,
                    'md5_hash': md5_hash,
                    'amount': amount,
                    'currency': currency,
                    'reference_id': reference_id,
                    'bill_number': bill_number,
                    'expires_at': payment_data['expires_at'].isoformat(),
                    'fallback_mode': True
                }

            return {
                'success': False,
                'error': f"Failed to create QR payment: {str(e)}"
            }
    
    def check_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """
        Check if a payment has been completed

        Args:
            payment_id: Payment ID to check

        Returns:
            Payment status information
        """
        if not KHQR_AVAILABLE or self.khqr is None:
            return {
                'success': False,
                'error': 'KHQR library not available'
            }

        if payment_id not in self.active_payments:
            return {
                'success': False,
                'error': 'Payment not found'
            }
            
        payment_data = self.active_payments[payment_id]
        
        # Check if payment has expired
        if datetime.now() > payment_data['expires_at']:
            payment_data['status'] = 'expired'
            return {
                'success': True,
                'status': 'expired',
                'message': 'Payment has expired'
            }
        
        try:
            # Check payment status using MD5 hash
            print(f"🔍 Checking payment with MD5 hash: {payment_data['md5_hash']}")

            # Check how long the payment has been active
            time_since_creation = datetime.now() - payment_data['created_at']
            print(f"⏰ Payment age: {time_since_creation.total_seconds()} seconds")

            # Don't check payment status immediately - give it at least 10 seconds
            if time_since_creation.total_seconds() < 10:
                print(f"⏳ Payment too new ({time_since_creation.total_seconds()}s), keeping as pending")
                return {
                    'success': True,
                    'status': 'pending',
                    'payment_id': payment_id,
                    'message': 'Payment created, waiting for customer to scan QR code'
                }

            # Check payment status using KHQR API
            print(f"🔍 Checking payment status for MD5: {payment_data['md5_hash']}")

            try:
                # Use KHQR API to check payment status
                payment_status = self.khqr.check_payment(payment_data['md5_hash'])
                print(f"📊 KHQR API response: {payment_status}")

                # Check if payment is completed
                is_paid = payment_status == "PAID"

            except Exception as api_error:
                    print(f"❌ KHQR API error: {api_error}")
                    is_paid = False

            if is_paid:
                payment_data['status'] = 'completed'
                payment_data['completed_at'] = datetime.now()
                print(f"✅ Payment {payment_id} marked as completed!")

                # Create order when payment is completed
                print(f"🔄 Creating order from payment data...")
                order_id = self.create_order_from_payment(payment_data)
                print(f"📦 Order creation result: {order_id}")

                result = {
                    'success': True,
                    'status': 'completed',
                    'payment_id': payment_id,
                    'amount': payment_data['amount'],
                    'currency': payment_data['currency'],
                    'reference_id': payment_data['reference_id'],
                    'completed_at': payment_data['completed_at'].isoformat()
                }

                if order_id:
                    result['order_id'] = order_id
                    result['invoice_url'] = f'/invoice/{order_id}'
                    print(f"🧾 Invoice URL: /invoice/{order_id}")
                else:
                    print(f"❌ No order created - invoice URL not available")

                print(f"📤 Returning payment result: {result}")
                return result
            else:
                print(f"⏳ Payment {payment_id} still pending...")
                return {
                    'success': True,
                    'status': 'pending',
                    'payment_id': payment_id
                }


        except Exception as e:
            print(f"❌ Error checking payment status: {str(e)}")
            return {
                'success': False,
                'error': f"Failed to check payment status: {str(e)}"
            }
    
    def get_payment_info(self, payment_id: str) -> Optional[Dict[str, Any]]:
        """Get payment information by ID"""
        return self.active_payments.get(payment_id)

    def create_order_from_payment(self, payment_data: Dict[str, Any]) -> Optional[int]:
        """Create an order from completed payment data"""
        try:
            print(f"🔄 Starting order creation for payment: {payment_data['payment_id']}")

            from models import Order, Customer, get_db

            # Try to get Flask session
            try:
                from flask import session
                has_session = True
                print(f"🔍 Flask session available: {dict(session) if session else 'Empty'}")
            except:
                has_session = False
                print(f"⚠️ Flask session not available - creating guest customer")

            # Get current user from session if available
            if has_session and 'user_id' in session:
                customer_id = session['user_id']
                print(f"🔍 Using logged-in customer: {customer_id}")
            else:
                # Create a guest customer for KHQR payments
                customer_email = f"khqr_{payment_data['payment_id'][:8]}@guest.com"
                print(f"🔍 Creating guest customer with email: {customer_email}")

                try:
                    customer = Customer.get_by_email(customer_email)
                    if not customer:
                        print(f"🔍 Customer not found, creating new one...")
                        customer_id = Customer.create(
                            first_name="KHQR",
                            last_name="Guest",
                            email=customer_email,
                            password="defaultpassword123",
                            phone="",
                            address=""
                        )
                        print(f"✅ Created new customer: {customer_id}")
                    else:
                        customer_id = customer['id']
                        print(f"🔍 Found existing customer: {customer_id}")
                except Exception as customer_error:
                    print(f"❌ Error with customer operations: {customer_error}")
                    # Fallback: use a default customer ID if it exists
                    try:
                        customers = Customer.get_all()
                        if customers:
                            customer_id = customers[0]['id']
                            print(f"🔄 Using fallback customer: {customer_id}")
                        else:
                            print(f"❌ No customers found in database")
                            return None
                    except Exception as fallback_error:
                        print(f"❌ Fallback customer lookup failed: {fallback_error}")
                        return None

            # Find a product with available stock
            print(f"🔄 Looking for products with stock...")
            from models import Product

            products = Product.get_all()
            if not products:
                print(f"❌ No products found in database")
                return None

            # Find a product with stock > 0
            available_product = None
            for product in products:
                stock = product.get('stock', 0)
                print(f"🔍 Product {product['id']} - {product['name']}: Stock = {stock}")
                if stock > 0:
                    available_product = product
                    break

            if not available_product:
                print(f"❌ No products with stock found")
                return None

            print(f"✅ Using product: {available_product['id']} - {available_product['name']} (Stock: {available_product.get('stock', 0)})")

            # Create order items with the available product
            order_items = [{
                'product_id': available_product['id'],
                'quantity': 1,
                'price': float(payment_data['amount'])
            }]
            print(f"📦 Order items: {order_items}")

            print(f"🔄 Creating order with stock validation...")
            order_id = Order.create(
                customer_id=customer_id,
                order_date=payment_data.get('completed_at', datetime.now()),
                status='Completed',
                items=order_items,
                payment_method='KHQR Payment'
            )

            print(f"✅ Order {order_id} created successfully for KHQR payment {payment_data['payment_id']}")

            # Clear the customer's cart after successful order creation
            self.clear_customer_cart(customer_id)

            return order_id

        except Exception as e:
            print(f"❌ Error creating order from payment: {str(e)}")
            import traceback
            print(f"❌ Full traceback: {traceback.format_exc()}")
            return None

    def clear_customer_cart(self, customer_id: int):
        """Clear customer's cart after successful payment"""
        try:
            print(f"🧹 Clearing cart for customer {customer_id}")

            from models import get_db

            # Clear pending orders for this customer
            conn = get_db()
            cur = conn.cursor()

            try:
                # Delete order items from pending orders
                cur.execute("""
                    DELETE oi FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    WHERE o.customer_id = %s AND o.status = 'Pending'
                """, (customer_id,))

                # Delete pending orders
                cur.execute("""
                    DELETE FROM orders
                    WHERE customer_id = %s AND status = 'Pending'
                """, (customer_id,))

                conn.commit()
                print(f"✅ Cart cleared for customer {customer_id}")

            finally:
                cur.close()
                conn.close()

            # Also clear Flask session cart if available
            try:
                from flask import session
                if 'cart' in session:
                    session['cart'] = []
                    session.modified = True
                    print(f"✅ Session cart cleared")
            except:
                print(f"⚠️ Could not clear session cart (not in Flask context)")

        except Exception as e:
            print(f"❌ Error clearing cart: {str(e)}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
    
    def cleanup_expired_payments(self):
        """Remove expired payments from memory"""
        now = datetime.now()
        expired_payments = [
            pid for pid, payment in self.active_payments.items()
            if payment['expires_at'] < now
        ]
        
        for pid in expired_payments:
            del self.active_payments[pid]
            
        return len(expired_payments)


# Global instance - Production mode (real payments)
khqr_handler = KHQRPaymentHandler()

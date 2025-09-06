"""
API endpoints for enhanced payment system with screenshot upload
Add these to your main app.py file
"""

from flask import request, jsonify, render_template, session
from utils.payment_session_manager import PaymentSessionManager
from utils.qr_recovery_system import QRRecoverySystem
from utils.qr_reader import QRCodeReader
import os

# Initialize payment session manager and QR recovery system
payment_manager = PaymentSessionManager()
qr_recovery = QRRecoverySystem()
qr_reader = QRCodeReader()

def add_payment_api_routes(app):
    """
    Add payment API routes to the Flask app
    """
    
    @app.route('/api/payment/create-session', methods=['POST'])
    def create_qr_payment_session():
        """Create a new payment session with QR code"""
        try:
            data = request.get_json()
            amount = float(data.get('amount', 0))
            currency = data.get('currency', 'USD')
            order_id = data.get('order_id')
            customer_id = session.get('user_id')
            reference_id = data.get('reference_id')
            
            if amount <= 0:
                return jsonify({'success': False, 'error': 'Invalid amount'}), 400
            
            # Create payment session
            result = payment_manager.create_payment_session(
                amount=amount,
                currency=currency,
                order_id=order_id,
                customer_id=customer_id,
                reference_id=reference_id
            )
            
            if result['success']:
                return jsonify(result)
            else:
                return jsonify(result), 500
                
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/payment/upload-screenshot', methods=['POST'])
    def upload_qr_payment_screenshot():
        """Upload payment screenshot"""
        try:
            if 'screenshot' not in request.files:
                return jsonify({'success': False, 'error': 'No file provided'}), 400
            
            file = request.files['screenshot']
            session_id = request.form.get('session_id')
            
            if not session_id:
                return jsonify({'success': False, 'error': 'Session ID required'}), 400
            
            # Upload screenshot
            result = payment_manager.upload_payment_screenshot(file, session_id)
            
            if result['success']:
                # Update order status if payment is completed
                session_data = payment_manager.get_payment_session(session_id)
                if session_data and session_data.get('order_id'):
                    # Update order to completed status
                    from models import get_db
                    conn = get_db()
                    cur = conn.cursor()
                    try:
                        cur.execute("""
                            UPDATE orders 
                            SET status = 'COMPLETED', transaction_id = %s
                            WHERE id = %s
                        """, (session_data['md5_hash'], session_data['order_id']))
                        conn.commit()
                    finally:
                        cur.close()
                        conn.close()
                
                return jsonify(result)
            else:
                return jsonify(result), 400
                
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/payment/verify/<md5_hash>')
    def verify_qr_payment_by_md5(md5_hash):
        """Verify payment using MD5 hash (for server recovery)"""
        try:
            session_data = payment_manager.verify_payment_by_md5(md5_hash)
            
            if session_data:
                return jsonify({
                    'success': True,
                    'session': session_data,
                    'message': 'Payment session found'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Payment session not found or expired'
                }), 404
                
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/payment/upload-screenshot/<session_id>')
    def show_qr_screenshot_upload_page(session_id):
        """Show screenshot upload page for a payment session"""
        try:
            session_data = payment_manager.get_payment_session(session_id)
            
            if not session_data:
                return jsonify({'error': 'Payment session not found'}), 404
            
            if session_data['status'] != 'pending':
                return jsonify({'error': 'Payment session is not pending'}), 400
            
            return render_template('payment_screenshot_upload.html',
                                 session_id=session_id,
                                 amount=session_data['amount'],
                                 transaction_id=session_data['md5_hash'],
                                 expires_at=session_data['expires_at'])
                                 
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/payment/sessions')
    def get_customer_qr_payment_sessions():
        """Get all payment sessions for current customer"""
        try:
            customer_id = session.get('user_id')
            if not customer_id:
                return jsonify({'error': 'Customer not logged in'}), 401
            
            sessions = payment_manager.get_customer_payment_sessions(customer_id)
            
            return jsonify({
                'success': True,
                'sessions': sessions
            })
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/payment/cleanup', methods=['POST'])
    def cleanup_expired_qr_sessions():
        """Clean up expired payment sessions (admin only)"""
        try:
            # Check if user is admin/staff
            if session.get('role') not in ['admin', 'super_admin', 'staff']:
                return jsonify({'error': 'Unauthorized'}), 403
            
            deleted_count = payment_manager.cleanup_expired_sessions()
            
            return jsonify({
                'success': True,
                'deleted_count': deleted_count,
                'message': f'Cleaned up {deleted_count} expired sessions'
            })
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/payment/recover-from-qr', methods=['POST'])
    def recover_qr_payment_from_qr():
        """Recover payment from QR code data (for screenshot uploads)"""
        try:
            data = request.get_json()
            qr_data = data.get('qr_data')
            screenshot_path = data.get('screenshot_path')
            
            if not qr_data:
                return jsonify({'success': False, 'error': 'QR data required'}), 400
            
            # Recover payment from QR
            result = qr_recovery.complete_payment_from_qr(qr_data, screenshot_path)
            
            if result['success']:
                return jsonify(result)
            else:
                return jsonify(result), 400
                
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/payment/upload-screenshot-with-qr', methods=['POST'])
    def upload_qr_screenshot_with_qr():
        """Upload screenshot with QR code data for payment recovery"""
        try:
            if 'screenshot' not in request.files:
                return jsonify({'success': False, 'error': 'No file provided'}), 400
            
            file = request.files['screenshot']
            qr_data = request.form.get('qr_data')
            
            if not qr_data:
                return jsonify({'success': False, 'error': 'QR data required'}), 400
            
            # Save screenshot first
            from werkzeug.utils import secure_filename
            import os
            from datetime import datetime
            
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"qr_recovery_{timestamp}_{filename}"
            
            upload_folder = 'static/uploads/payment_screenshots'
            os.makedirs(upload_folder, exist_ok=True)
            
            file_path = os.path.join(upload_folder, filename)
            file.save(file_path)
            
            relative_path = f"payment_screenshots/{filename}"
            
            # Complete payment from QR
            result = qr_recovery.complete_payment_from_qr(qr_data, relative_path)
            
            if result['success']:
                return jsonify({
                    'success': True,
                    'message': 'Payment completed successfully from QR screenshot',
                    'order_id': result['order_id'],
                    'screenshot_path': relative_path
                })
            else:
                # Clean up file if payment failed
                os.remove(file_path)
                return jsonify(result), 400
                
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/payment/verify-qr', methods=['POST'])
    def verify_qr_payment_data():
        """Verify QR code data and return order information"""
        try:
            data = request.get_json()
            qr_data = data.get('qr_data')
            
            if not qr_data:
                return jsonify({'success': False, 'error': 'QR data required'}), 400
            
            # Recover payment information
            result = qr_recovery.recover_payment_from_qr(qr_data)
            
            if result['success']:
                return jsonify(result)
            else:
                return jsonify(result), 404
                
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/payment/recover-from-qr')
    def show_qr_payment_recovery_page():
        """Show QR recovery upload page"""
        return render_template('simple_qr_recovery.html')
    
    @app.route('/payment/save-qr')
    def show_qr_save_page():
        """Show QR save and share page"""
        return render_template('qr_save_share.html')
    
    @app.route('/api/orders/<int:order_id>')
    def get_order_data(order_id):
        """Get order data for QR generation"""
        try:
            from models import get_db
            conn = get_db()
            cur = conn.cursor(dictionary=True)
            
            cur.execute("""
                SELECT o.*, c.first_name, c.last_name, c.email, c.phone
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE o.id = %s
            """, (order_id,))
            
            order = cur.fetchone()
            cur.close()
            conn.close()
            
            if order:
                return jsonify(order)
            else:
                return jsonify({'error': 'Order not found'}), 404
                
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/payment/auto-read-qr', methods=['POST'])
    def auto_read_qr_code():
        """Automatically read QR code from uploaded image"""
        try:
            if 'screenshot' not in request.files:
                return jsonify({'success': False, 'error': 'No file provided'}), 400
            
            file = request.files['screenshot']
            
            if not file or not file.filename:
                return jsonify({'success': False, 'error': 'No file selected'}), 400
            
            # Read QR code from image
            qr_result = qr_reader.read_qr_from_file(file)
            
            if not qr_result['success']:
                return jsonify(qr_result), 400
            
            # Recover payment information from QR data
            recovery_result = qr_recovery.recover_payment_from_qr(qr_result['qr_data'])
            
            if recovery_result['success']:
                return jsonify({
                    'success': True,
                    'order_data': recovery_result['order_data'],
                    'qr_data': qr_result['qr_data'],
                    'message': 'QR code read and order found successfully!'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Order not found. Please make sure this QR code is from a valid order.'
                }), 404
                
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/payment/complete-from-qr', methods=['POST'])
    def complete_payment_from_qr_image():
        """Complete payment from QR image upload"""
        try:
            if 'screenshot' not in request.files:
                return jsonify({'success': False, 'error': 'No file provided'}), 400
            
            file = request.files['screenshot']
            order_id = request.form.get('order_id')
            
            if not order_id:
                return jsonify({'success': False, 'error': 'Order ID required'}), 400
            
            # Save screenshot first
            from werkzeug.utils import secure_filename
            from datetime import datetime
            
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"qr_complete_{timestamp}_{filename}"
            
            upload_folder = 'static/uploads/payment_screenshots'
            os.makedirs(upload_folder, exist_ok=True)
            
            file_path = os.path.join(upload_folder, filename)
            file.save(file_path)
            
            relative_path = f"payment_screenshots/{filename}"
            
            # Update order status to completed
            from models import get_db
            conn = get_db()
            cur = conn.cursor()
            
            try:
                cur.execute("""
                    UPDATE orders 
                    SET status = 'COMPLETED', 
                        approval_status = 'Approved',
                        approval_date = NOW(),
                        approved_by = 1  # Admin user ID
                    WHERE id = %s
                """, (order_id,))
                
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'order_id': order_id,
                    'message': 'Payment completed successfully from QR screenshot',
                    'screenshot_path': relative_path
                })
                
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                cur.close()
                conn.close()
                
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

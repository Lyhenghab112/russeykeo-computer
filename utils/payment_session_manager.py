"""
Enhanced Payment Session Manager
Handles persistent payment sessions with screenshot upload capability
"""

import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from models import get_db
import os
from werkzeug.utils import secure_filename

class PaymentSessionManager:
    """
    Manages payment sessions with database persistence
    Handles server crashes and screenshot uploads
    """
    
    def __init__(self):
        self.upload_folder = 'static/uploads/payment_screenshots'
        self.allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        self.max_file_size = 5 * 1024 * 1024  # 5MB
        
        # Ensure upload directory exists
        os.makedirs(self.upload_folder, exist_ok=True)
    
    def create_payment_session(self, amount: float, currency: str = "USD", 
                             order_id: Optional[int] = None, 
                             customer_id: Optional[int] = None,
                             reference_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new payment session with database persistence
        """
        try:
            # Generate unique identifiers
            session_id = str(uuid.uuid4())
            payment_id = str(uuid.uuid4())
            bill_number = f"BILL_{uuid.uuid4().hex[:8].upper()}"
            
            # Generate QR data (simplified for demo - replace with actual KHQR generation)
            qr_data = f"KHQR:amount={amount}:currency={currency}:bill={bill_number}:ref={reference_id or ''}"
            
            # Generate MD5 hash
            md5_hash = hashlib.md5(qr_data.encode()).hexdigest()
            
            # Calculate expiration time (15 minutes from now)
            expires_at = datetime.now() + timedelta(minutes=15)
            
            # Store in database
            conn = get_db()
            cur = conn.cursor(dictionary=True)
            
            try:
                cur.execute("""
                    INSERT INTO payment_sessions 
                    (session_id, payment_id, order_id, customer_id, amount, currency, 
                     qr_data, md5_hash, bill_number, reference_id, expires_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (session_id, payment_id, order_id, customer_id, amount, currency,
                      qr_data, md5_hash, bill_number, reference_id, expires_at))
                
                conn.commit()
                
                # Update order with payment session ID if order_id provided
                if order_id:
                    cur.execute("""
                        UPDATE orders SET payment_session_id = %s WHERE id = %s
                    """, (session_id, order_id))
                    conn.commit()
                
                return {
                    'success': True,
                    'session_id': session_id,
                    'payment_id': payment_id,
                    'qr_data': qr_data,
                    'md5_hash': md5_hash,
                    'bill_number': bill_number,
                    'amount': amount,
                    'currency': currency,
                    'expires_at': expires_at.isoformat(),
                    'status': 'pending'
                }
                
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                cur.close()
                conn.close()
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_payment_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve payment session from database
        """
        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)
            
            try:
                cur.execute("""
                    SELECT * FROM payment_sessions WHERE session_id = %s
                """, (session_id,))
                
                session = cur.fetchone()
                return session
                
            finally:
                cur.close()
                conn.close()
                
        except Exception as e:
            print(f"Error retrieving payment session: {e}")
            return None
    
    def update_payment_status(self, session_id: str, status: str, 
                            screenshot_path: Optional[str] = None) -> bool:
        """
        Update payment session status
        """
        try:
            conn = get_db()
            cur = conn.cursor()
            
            try:
                if screenshot_path:
                    cur.execute("""
                        UPDATE payment_sessions 
                        SET status = %s, completed_at = NOW(), 
                            payment_screenshot_path = %s, screenshot_uploaded_at = NOW()
                        WHERE session_id = %s
                    """, (status, screenshot_path, session_id))
                else:
                    cur.execute("""
                        UPDATE payment_sessions 
                        SET status = %s, completed_at = NOW()
                        WHERE session_id = %s
                    """, (status, session_id))
                
                conn.commit()
                return True
                
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                cur.close()
                conn.close()
                
        except Exception as e:
            print(f"Error updating payment status: {e}")
            return False
    
    def upload_payment_screenshot(self, file, session_id: str) -> Dict[str, Any]:
        """
        Upload and save payment screenshot
        """
        try:
            if not file or not file.filename:
                return {'success': False, 'error': 'No file provided'}
            
            # Validate file
            if not self._allowed_file(file.filename):
                return {'success': False, 'error': 'Invalid file type'}
            
            if len(file.read()) > self.max_file_size:
                file.seek(0)  # Reset file pointer
                return {'success': False, 'error': 'File too large (max 5MB)'}
            
            file.seek(0)  # Reset file pointer
            
            # Generate secure filename
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{session_id}_{timestamp}_{filename}"
            
            # Save file
            file_path = os.path.join(self.upload_folder, filename)
            file.save(file_path)
            
            # Update database
            relative_path = f"payment_screenshots/{filename}"
            success = self.update_payment_status(session_id, 'completed', relative_path)
            
            if success:
                return {
                    'success': True,
                    'screenshot_path': relative_path,
                    'message': 'Screenshot uploaded successfully'
                }
            else:
                # Clean up file if database update failed
                os.remove(file_path)
                return {'success': False, 'error': 'Failed to update payment status'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def verify_payment_by_md5(self, md5_hash: str) -> Optional[Dict[str, Any]]:
        """
        Verify payment using MD5 hash (for server recovery)
        """
        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)
            
            try:
                cur.execute("""
                    SELECT * FROM payment_sessions 
                    WHERE md5_hash = %s AND status = 'pending'
                """, (md5_hash,))
                
                session = cur.fetchone()
                return session
                
            finally:
                cur.close()
                conn.close()
                
        except Exception as e:
            print(f"Error verifying payment by MD5: {e}")
            return None
    
    def get_customer_payment_sessions(self, customer_id: int) -> list:
        """
        Get all payment sessions for a customer
        """
        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)
            
            try:
                cur.execute("""
                    SELECT ps.*, o.id as order_id, o.status as order_status
                    FROM payment_sessions ps
                    LEFT JOIN orders o ON ps.order_id = o.id
                    WHERE ps.customer_id = %s
                    ORDER BY ps.created_at DESC
                """, (customer_id,))
                
                sessions = cur.fetchall()
                return sessions
                
            finally:
                cur.close()
                conn.close()
                
        except Exception as e:
            print(f"Error getting customer payment sessions: {e}")
            return []
    
    def _allowed_file(self, filename: str) -> bool:
        """
        Check if file extension is allowed
        """
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in self.allowed_extensions
    
    def cleanup_expired_sessions(self) -> int:
        """
        Clean up expired payment sessions
        """
        try:
            conn = get_db()
            cur = conn.cursor()
            
            try:
                cur.execute("""
                    DELETE FROM payment_sessions 
                    WHERE expires_at < NOW() 
                    AND status IN ('pending', 'failed')
                """)
                
                deleted_count = cur.rowcount
                conn.commit()
                
                return deleted_count
                
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                cur.close()
                conn.close()
                
        except Exception as e:
            print(f"Error cleaning up expired sessions: {e}")
            return 0

import secrets
import string
import pyotp
from datetime import datetime, timedelta
from models import get_db

class OTPManager:
    @staticmethod
    def generate_otp():
        """Generate a 6-digit OTP code"""
        return ''.join(secrets.choice(string.digits) for _ in range(6))
    
    @staticmethod
    def store_otp(customer_id, email, otp_code, expiry_minutes=10):
        """Store OTP code in database with expiry"""
        conn = get_db()
        cur = conn.cursor()
        try:
            expires_at = datetime.now() + timedelta(minutes=expiry_minutes)
            cur.execute("""
                INSERT INTO customer_otp_verification (customer_id, otp_code, email, expires_at)
                VALUES (%s, %s, %s, %s)
            """, (customer_id, otp_code, email, expires_at))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()
    
    @staticmethod
    def store_registration_otp(email, otp_code, expiry_minutes=15):
        """Store OTP code for registration (before customer account exists)"""
        conn = get_db()
        cur = conn.cursor()
        try:
            expires_at = datetime.now() + timedelta(minutes=expiry_minutes)
            cur.execute("""
                INSERT INTO customer_otp_verification (customer_id, otp_code, email, expires_at)
                VALUES (NULL, %s, %s, %s)
            """, (otp_code, email, expires_at))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()
    
    @staticmethod
    def verify_stored_otp(customer_id, email, otp_code):
        """Verify stored OTP code"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT * FROM customer_otp_verification 
                WHERE customer_id = %s AND email = %s AND otp_code = %s 
                AND expires_at > NOW() AND used = FALSE
                ORDER BY created_at DESC LIMIT 1
            """, (customer_id, email, otp_code))
            
            otp_record = cur.fetchone()
            if otp_record:
                cur.execute("""
                    UPDATE customer_otp_verification 
                    SET used = TRUE WHERE id = %s
                """, (otp_record['id'],))
                conn.commit()
                return True
            return False
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()
    
    @staticmethod
    def verify_registration_otp(email, otp_code):
        """Verify registration OTP code (before customer account exists)"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT * FROM customer_otp_verification 
                WHERE customer_id IS NULL AND email = %s AND otp_code = %s 
                AND expires_at > NOW() AND used = FALSE
                ORDER BY created_at DESC LIMIT 1
            """, (email, otp_code))
            
            otp_record = cur.fetchone()
            if otp_record:
                cur.execute("""
                    UPDATE customer_otp_verification 
                    SET used = TRUE WHERE id = %s
                """, (otp_record['id'],))
                conn.commit()
                return True
            return False
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()
    
    @staticmethod
    def store_password_reset_otp(customer_id, otp_code, expiry_minutes=15):
        """Store OTP code for password reset"""
        conn = get_db()
        cur = conn.cursor()
        try:
            expires_at = datetime.now() + timedelta(minutes=expiry_minutes)
            cur.execute("""
                INSERT INTO customer_otp_verification (customer_id, otp_code, email, expires_at)
                VALUES (%s, %s, (SELECT email FROM customers WHERE id = %s), %s)
            """, (customer_id, otp_code, customer_id, expires_at))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()
    
    @staticmethod
    def verify_password_reset_otp(email, otp_code):
        """Verify password reset OTP code"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT * FROM customer_otp_verification 
                WHERE customer_id IS NOT NULL AND email = %s AND otp_code = %s 
                AND expires_at > NOW() AND used = FALSE
                ORDER BY created_at DESC LIMIT 1
            """, (email, otp_code))
            
            otp_record = cur.fetchone()
            if otp_record:
                cur.execute("""
                    UPDATE customer_otp_verification 
                    SET used = TRUE WHERE id = %s
                """, (otp_record['id'],))
                conn.commit()
                return True
            return False
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

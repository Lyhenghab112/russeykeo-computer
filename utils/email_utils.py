import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import Config
import logging

class EmailManager:
    @staticmethod
    def send_otp_email(to_email, customer_name, otp_code):
        """Send OTP code via email"""
        try:
            # Email configuration
            smtp_server = getattr(Config, 'SMTP_SERVER', 'smtp.gmail.com')
            smtp_port = getattr(Config, 'SMTP_PORT', 587)
            smtp_username = getattr(Config, 'SMTP_USERNAME', None)
            smtp_password = getattr(Config, 'SMTP_PASSWORD', None)
            
            if not smtp_username or not smtp_password:
                logging.warning("SMTP credentials not configured, using fallback method")
                return EmailManager._send_fallback_email(to_email, customer_name, otp_code)
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = smtp_username
            msg['To'] = to_email
            msg['Subject'] = "Your Login OTP Code"
            
            # Email body
            body = f"""
            Hello {customer_name},
            
            Your OTP (One-Time Password) code is: {otp_code}
            
            This code will expire in 10 minutes.
            
            If you didn't request this code, please ignore this email.
            
            Best regards,
            Computer Russeykeo
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_username, to_email, text)
            server.quit()
            
            logging.info(f"OTP email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to send OTP email: {str(e)}")
            # Fallback to console output
            return EmailManager._send_fallback_email(to_email, customer_name, otp_code)
    
    @staticmethod
    def _send_fallback_email(to_email, customer_name, otp_code):
        """Fallback method when email sending fails - log to console"""
        print(f"""
        ========================================
        OTP EMAIL (Fallback Method)
        ========================================
        To: {to_email}
        Subject: Your Login OTP Code
        
        Hello {customer_name},
        
        Your OTP (One-Time Password) code is: {otp_code}
        
        This code will expire in 10 minutes.
        
        If you didn't request this code, please ignore this email.
        
        Best regards,
        Computer Shop Team
        ========================================
        """)
        return True
    
    @staticmethod
    def send_registration_otp_email(to_email, customer_name, otp_code):
        """Send registration OTP code via email"""
        try:
            # Email configuration
            smtp_server = getattr(Config, 'SMTP_SERVER', 'smtp.gmail.com')
            smtp_port = getattr(Config, 'SMTP_PORT', 587)
            smtp_username = getattr(Config, 'SMTP_USERNAME', None)
            smtp_password = getattr(Config, 'SMTP_PASSWORD', None)
            
            if not smtp_username or not smtp_password:
                logging.warning("SMTP credentials not configured, using fallback method")
                return EmailManager._send_fallback_registration_email(to_email, customer_name, otp_code)
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = smtp_username
            msg['To'] = to_email
            msg['Subject'] = "Welcome! Verify Your Account"
            
            # Email body
            body = f"""
            Hello {customer_name},
            
            Welcome to our Computer Russeykeo! 🎉
            
            To complete your account registration, please use this verification code: {otp_code}
            
            This code will expire in 15 minutes.
            
            Once verified, you'll have full access to your account and can start shopping!
            
            If you didn't create this account, please ignore this email.
            
            Best regards,
            Computer Russeykeo
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_username, to_email, text)
            server.quit()
            
            logging.info(f"Registration OTP email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to send registration OTP email: {str(e)}")
            # Fallback to console output
            return EmailManager._send_fallback_registration_email(to_email, customer_name, otp_code)
    
    @staticmethod
    def _send_fallback_registration_email(to_email, customer_name, otp_code):
        """Fallback method for registration OTP when email sending fails"""
        print(f"""
        ========================================
        REGISTRATION OTP EMAIL (Fallback Method)
        ========================================
        To: {to_email}
        Subject: Welcome! Verify Your Account
        
        Hello {customer_name},
        
        Welcome to our Computer Russeykeo! 🎉
        
        To complete your account registration, please use this verification code: {otp_code}
        
        This code will expire in 15 minutes.
        
        Once verified, you'll have full access to your account and can start shopping!
        
        If you didn't create this account, please ignore this email.
        
        Best regards,
        Computer Russeykeo
        ========================================
        """)
        return True

def send_otp_email(to_email, customer_name, otp_code, subject=None, message=None):
    """Send OTP code via email with custom subject and message"""
    try:
        # Email configuration
        smtp_server = getattr(Config, 'SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = getattr(Config, 'SMTP_PORT', 587)
        smtp_username = getattr(Config, 'SMTP_USERNAME', None)
        smtp_password = getattr(Config, 'SMTP_PASSWORD', None)
        
        if not smtp_username or not smtp_password:
            logging.warning("SMTP credentials not configured, using fallback method")
            return _send_fallback_custom_email(to_email, customer_name, otp_code, subject, message)
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = to_email
        msg['Subject'] = subject or "Your OTP Code"
        
        # Email body
        body = f"""
        Hello {customer_name},
        
        {message or "Your OTP (One-Time Password) code is:"} {otp_code}
        
        This code will expire in 15 minutes.
        
        If you didn't request this code, please ignore this email.
        
        Best regards,
        Computer Russeykeo
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_username, to_email, text)
        server.quit()
        
        logging.info(f"Custom OTP email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logging.error(f"Failed to send custom OTP email: {str(e)}")
        # Fallback to console output
        return _send_fallback_custom_email(to_email, customer_name, otp_code, subject, message)

def _send_fallback_custom_email(to_email, customer_name, otp_code, subject=None, message=None):
    """Fallback method for custom OTP when email sending fails"""
    print(f"""
    ========================================
    CUSTOM OTP EMAIL (Fallback Method)
    ========================================
    To: {to_email}
    Subject: {subject or "Your OTP Code"}
    
    Hello {customer_name},
    
    {message or "Your OTP (One-Time Password) code is:"} {otp_code}
    
    This code will expire in 15 minutes.
    
    If you didn't request this code, please ignore this email.
    
    Best regards,
    Computer Russeykeo
    ========================================
    """)
    return True

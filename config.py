import os
from dotenv import load_dotenv
import secrets

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY') or secrets.token_hex(32)
    # Try Railway's MYSQL_URL first, then fallback to individual variables
    MYSQL_URL = os.getenv('MYSQL_URL')
    if MYSQL_URL:
        # Use Railway's provided MYSQL_URL
        SQLALCHEMY_DATABASE_URI = MYSQL_URL.replace('mysql://', 'mysql+mysqlconnector://')
    else:
        # Fallback to individual variables
        MYSQL_HOST = os.getenv('MYSQL_HOST') or 'localhost'
        MYSQL_USER = os.getenv('MYSQL_USER') or 'root'
        MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD') or '12345'
        MYSQL_DB = os.getenv('MYSQL_DB') or 'computershop5'
        MYSQL_PORT = int(os.getenv('MYSQL_PORT') or 3306)
        SQLALCHEMY_DATABASE_URI = f"mysql+mysqlconnector://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
    
    # Use Railway's built-in variable names
    MYSQL_HOST = os.getenv('MYSQL_HOST') or os.getenv('MYSQLHOST') or 'localhost'
    MYSQL_USER = os.getenv('MYSQL_USER') or os.getenv('MYSQLUSER') or 'root'
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD') or os.getenv('MYSQLPASSWORD') or '12345'
    MYSQL_DB = os.getenv('MYSQL_DB') or os.getenv('MYSQL_DATABASE') or os.getenv('MYSQLDATABASE') or 'computershop5'
    MYSQL_PORT = int(os.getenv('MYSQL_PORT') or os.getenv('MYSQLPORT') or 3306)

    # File upload configuration
    UPLOAD_FOLDER = 'static/uploads/products'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # Email configuration for OTP
    SMTP_SERVER = 'smtp.gmail.com'
    SMTP_PORT = 587
    SMTP_USERNAME = 'lyhenghab3@gmail.com'  # Replace with your Gmail
    SMTP_PASSWORD = 'dxhn mirg iaco vkta'     # Replace with your app password


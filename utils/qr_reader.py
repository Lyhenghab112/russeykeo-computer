"""
Automatic QR Code Reader
Reads QR codes from uploaded images automatically
"""

try:
    import cv2
    import numpy as np
    OPENCV_AVAILABLE = True
except (ImportError, OSError) as e:
    OPENCV_AVAILABLE = False
    print(f"⚠️ OpenCV not available: {e}. QR code reading will be limited.")

from PIL import Image
import io
import base64

try:
    import pyzbar.pyzbar as pyzbar
    PYZBAR_AVAILABLE = True
except ImportError:
    PYZBAR_AVAILABLE = False
    print("⚠️ pyzbar not installed. Install with: pip install pyzbar")

class QRCodeReader:
    """
    Automatically reads QR codes from uploaded images
    """
    
    def __init__(self):
        self.available = PYZBAR_AVAILABLE and OPENCV_AVAILABLE
    
    def read_qr_from_file(self, file) -> dict:
        """
        Read QR code from uploaded file
        """
        if not self.available:
            return {
                'success': False,
                'error': 'QR code reading not available. OpenCV or pyzbar not properly installed.'
            }
        
        try:
            # Read file content
            file_content = file.read()
            file.seek(0)  # Reset file pointer
            
            # Convert to PIL Image
            image = Image.open(io.BytesIO(file_content))
            
            if OPENCV_AVAILABLE:
                # Convert to OpenCV format
                opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                # Read QR codes
                qr_codes = pyzbar.decode(opencv_image)
            else:
                # Fallback to direct PIL image processing
                qr_codes = pyzbar.decode(image)
            
            if not qr_codes:
                return {
                    'success': False,
                    'error': 'No QR code found in the image. Please make sure the QR code is clear and visible.'
                }
            
            # Get the first QR code data
            qr_data = qr_codes[0].data.decode('utf-8')
            
            return {
                'success': True,
                'qr_data': qr_data,
                'message': 'QR code read successfully!'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Error reading QR code: {str(e)}'
            }
    
    def read_qr_from_base64(self, base64_string: str) -> dict:
        """
        Read QR code from base64 encoded image
        """
        if not self.available:
            return {
                'success': False,
                'error': 'QR code reading not available. OpenCV or pyzbar not properly installed.'
            }
        
        try:
            # Decode base64
            image_data = base64.b64decode(base64_string)
            
            # Convert to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            if OPENCV_AVAILABLE:
                # Convert to OpenCV format
                opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                # Read QR codes
                qr_codes = pyzbar.decode(opencv_image)
            else:
                # Fallback to direct PIL image processing
                qr_codes = pyzbar.decode(image)
            
            if not qr_codes:
                return {
                    'success': False,
                    'error': 'No QR code found in the image.'
                }
            
            # Get the first QR code data
            qr_data = qr_codes[0].data.decode('utf-8')
            
            return {
                'success': True,
                'qr_data': qr_data,
                'message': 'QR code read successfully!'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Error reading QR code: {str(e)}'
            }

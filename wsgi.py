#!/usr/bin/env python3
"""
WSGI entry point for Render deployment - Updated
"""

from app import create_app

# Create the Flask application instance
application = create_app()

if __name__ == "__main__":
    application.run()
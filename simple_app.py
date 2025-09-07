#!/usr/bin/env python3
"""
Simple Flask app for testing
"""

from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return "<h1>Hello World - Simple App Working!</h1>"

@app.route('/test')
def test():
    return "<h1>Test Route Working!</h1>"

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)

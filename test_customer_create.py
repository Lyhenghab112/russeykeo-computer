import sys
import os

# Add current directory to sys.path to import models
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from models import Customer
import logging

logging.basicConfig(level=logging.INFO)

def test_create_customer():
    first_name = "TestFirst"
    last_name = "TestLast"
    email = "testemail@example.com"

    try:
        customer_id = Customer.create(first_name, last_name, email)
        print(f"Customer created successfully with ID: {customer_id}")
    except Exception as e:
        print(f"Failed to create customer: {e}")

if __name__ == "__main__":
    test_create_customer()

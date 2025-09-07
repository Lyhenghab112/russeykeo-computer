#!/usr/bin/env python3
import os

print("=== Railway Environment Variables ===")
print("MYSQL_DATABASE:", os.getenv('MYSQL_DATABASE'))
print("MYSQL_HOST:", os.getenv('MYSQL_HOST'))
print("MYSQL_PASSWORD:", os.getenv('MYSQL_PASSWORD'))
print("MYSQL_PORT:", os.getenv('MYSQL_PORT'))
print("MYSQL_USER:", os.getenv('MYSQL_USER'))
print("MYSQL_URL:", os.getenv('MYSQL_URL'))
print("=" * 40)

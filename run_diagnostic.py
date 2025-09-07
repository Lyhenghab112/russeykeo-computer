#!/usr/bin/env python3
"""
Diagnostic script to test Flask app loading
"""

print("Starting diagnostic...")

try:
    import test_app
    print("test_app imported successfully")
    print("app object:", test_app.app)
    print("App routes:", [rule.rule for rule in test_app.app.url_map.iter_rules()])
except Exception as e:
    print("Error importing test_app:", str(e))
    import traceback
    traceback.print_exc()

print("Diagnostic complete.")

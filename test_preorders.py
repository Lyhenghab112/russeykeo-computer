from models import PreOrder

try:
    result = PreOrder.get_all_paginated()
    print('Pre-orders found:', len(result['pre_orders']))
    for po in result['pre_orders']:
        print(f"ID: {po['id']}, Status: {po['status']}, Product: {po['product_name']}")
except Exception as e:
    print('Error:', str(e))
    import traceback
    traceback.print_exc()

from config import Config
import mysql.connector

try:
    conn = mysql.connector.connect(
        host=Config.MYSQL_HOST, 
        user=Config.MYSQL_USER, 
        password=Config.MYSQL_PASSWORD, 
        database=Config.MYSQL_DB
    )
    cursor = conn.cursor(dictionary=True)
    
    # First get the product_id from order_items
    cursor.execute('SELECT product_id FROM order_items WHERE order_id = 757')
    order_item = cursor.fetchone()
    
    if order_item:
        product_id = order_item['product_id']
        print(f"Product ID from order: {product_id}")
        
        # Check the product details
        cursor.execute('SELECT * FROM products WHERE id = %s', (product_id,))
        product = cursor.fetchone()
        
        if product:
            print(f"Product: {product['name']}")
            print(f"  Current Price: ${product['price']}")
            print(f"  Original Price: ${product['original_price']}")
            print(f"  Discount Percentage: {product['discount_percentage']}%")
        else:
            print("Product not found")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")

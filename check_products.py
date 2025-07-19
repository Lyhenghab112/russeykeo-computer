from models import get_db, Product

def check_products():
    try:
        # Test database connection
        conn = get_db()
        cur = conn.cursor()
        print("Database connection successful!")
        
        # Check products table
        cur.execute("SELECT COUNT(*) FROM products")
        product_count = cur.fetchone()[0]
        print(f"Products in database: {product_count}")
        
        # Check inventory table
        cur.execute("SELECT COUNT(*) FROM inventory")
        inventory_count = cur.fetchone()[0]
        print(f"Inventory records: {inventory_count}")
        
        # Test Product.get_featured()
        featured = Product.get_featured()
        print(f"Featured products returned: {len(featured)}")
        
        # Print first 3 products if any exist
        if len(featured) > 0:
            print("\nSample products:")
            for i, product in enumerate(featured[:3]):
                print(f"{i+1}. {product['name']} - ${product['price']} (Stock: {product.get('stock_quantity', 0)})")
        
        cur.close()
    except Exception as e:
        print(f"Database error: {str(e)}")

if __name__ == '__main__':
    check_products()

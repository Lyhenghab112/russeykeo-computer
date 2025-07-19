from models import Product

def check_inventory():
    print("Checking product inventory...")
    products = Product.get_all()
    
    if not products:
        print("No products found in database")
        return
        
    print("\nCurrent Stock Levels:")
    print("{:<5} {:<30} {:<10}".format("ID", "Product Name", "Stock"))
    print("-"*50)
    
    for p in products:
        print("{:<5} {:<30} {:<10}".format(
            p['id'], 
            p['name'][:27] + '...' if len(p['name']) > 30 else p['name'],
            p['stock_quantity']
        ))

if __name__ == '__main__':
    check_inventory()

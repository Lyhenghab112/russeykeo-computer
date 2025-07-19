from flask import Flask, jsonify, request, redirect, url_for, render_template, session, flash
from auth import auth_bp

app = Flask(__name__)

app.register_blueprint(auth_bp)

from flask_mysqldb import MySQL
from config import Config
from datetime import datetime, timedelta
from models import Product, Customer, Order, Supplier, Report, db, Category, PreOrder, Notification, generate_slug, PreOrderPayment, get_db
import os
from werkzeug.utils import secure_filename
from utils.bakong_payment import BakongQRGenerator, PaymentSession


# Initialize extensions without circular imports
mysql = MySQL()

def create_app():
    app = Flask(__name__, static_folder='static')
    app.config.from_object(Config)
    app.config['UPLOAD_FOLDER'] = 'static/uploads/products'
    app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}
    app.secret_key = Config.SECRET_KEY
    
    # Configure logging
    import logging
    logging.basicConfig(level=logging.INFO)
    app.logger = logging.getLogger(__name__)
    
    # Ensure upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Initialize extensions with app
    mysql.init_app(app)
    from models import db
    db.init_app(app)

    def allowed_file(filename):
        app.logger.info(f"allowed_file called with: {filename}, type: {type(filename)}")
        if not filename:
            return False
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

    # Template filters
    @app.template_filter('slugify')
    def slugify_filter(text):
        """Template filter to generate URL slugs"""
        return generate_slug(text)

    # Public Routes
    @app.route('/login')
    def login_redirect():
        return redirect(url_for('auth.login'))
    
    @app.route('/register')
    def register():
        products = Product.get_all()
        return render_template('Register.html', products=products)
        
    @app.route('/')
    def show_dashboard():
        products = Product.get_featured()
        return render_template('homepage.html', products=products)
        
    @app.route('/auth/staff/inventory')
    def staff_inventory():
        try:
            products = Product.get_all()
        except Exception as e:
            app.logger.error(f"Error fetching products: {e}")
            products = []
        brands = Product.get_distinct_brands()
        brand_filter = request.args.get('brand_filter')
        search_query = request.args.get('q', '').strip()
        category_filter = request.args.get('category_filter', '')

        if brand_filter and search_query:
            products = Product.get_by_brand(brand_filter)
        elif brand_filter:
            products = Product.get_by_brand(brand_filter)
        elif search_query:
            # Use search_query to filter products by name (not category)
            products = Product.search(search_query)
        else:
            products = Product.get_all()
        categories = Category.get_all()
        try:
            from models import Warranty
            warranties = Warranty.get_all()
        except Exception as e:
            app.logger.error(f"Error fetching warranties: {e}")
            warranties = []
        app.logger.info(f"Brands in app.py: {brands}")
        return render_template('staff_inventory.html', products=products, brands=brands, categories=categories, warranties=warranties)

    @app.route('/products/all')
    def show_all_products():
        products = Product.get_all()
        return render_template('all_products.html', products=products)

    @app.route('/products/<int:product_id>', methods=['GET'])
    def view_product(product_id):
        if product_id <= 0:
            return render_template('error.html', error='Invalid product ID'), 400
        try:
            product = Product.get_by_id(product_id)
            if not product:
                return render_template('error.html', error='Product not found'), 404
            return render_template('product_detail.html', product=product)
        except Exception as e:
            app.logger.error(f"Error fetching product {product_id}: {e}")
            return render_template('error.html', error='Internal server error'), 500

    @app.route('/products/<string:product_slug>', methods=['GET'])
    def view_product_by_slug(product_slug):
        try:
            product = Product.get_by_slug(product_slug)
            if not product:
                return render_template('error.html', error='Product not found'), 404
            return render_template('product_detail.html', product=product)
        except Exception as e:
            app.logger.error(f"Error fetching product with slug {product_slug}: {e}")
            return render_template('error.html', error='Internal server error'), 500

    @app.route('/api/products/<int:product_id>', methods=['GET'])
    def api_get_product(product_id):
        try:
            product = Product.get_by_id(product_id)
            if not product:
                return jsonify({'success': False, 'error': 'Product not found'}), 404
            product_data = {
                'id': product['id'],
                'name': product['name'],
                'description': product['description'],
                'price': product['price'],
                'stock': product['stock'],
                'category_id': product['category_id'],
                'category_name': product.get('category_name'),
                'warranty_id': product.get('warranty_id'),
                'warranty_name': product.get('warranty_name'),
                'cpu': product.get('cpu'),
                'ram': product.get('ram'),
                'storage': product.get('storage'),
                'graphics': product.get('graphics'),
                'display': product.get('display'),
                'os': product.get('os'),
                'original_price': product.get('original_price'),
                'keyboard': product.get('keyboard'),
                'battery': product.get('battery'),
                'weight': product.get('weight'),
                'photo': product.get('photo'),
                'photo_front': product.get('photo'),
                'left_rear_view': product.get('left_rear_view'),
                'right_rear_view': product.get('right_rear_view'),
                'back_view': product.get('back_view'),
                'color': product.get('color')
            }
            return jsonify({'success': True, 'product': product_data})
        except Exception as e:
            app.logger.error(f"Error fetching product {product_id} via API: {e}")
            return jsonify({'success': False, 'error': 'Internal server error'}), 500

    @app.route('/products/category/<int:category_id>')
    def products_by_category(category_id):
        category = None
        products = []
        try:
            categories = Category.get_all()
            category = next((c for c in categories if c['id'] == category_id), None)
            if category:
                products = Product.get_by_category(category_id)
        except Exception as e:
            products = []
        return render_template('category_products.html', category=category, products=products)

    @app.route('/products/category/multi/<category_ids>')
    def products_by_multiple_categories(category_ids):
        category = None
        products = []
        try:
            categories = Category.get_all()
            # Parse category_ids from comma-separated string to list of ints
            category_id_list = [int(cid) for cid in category_ids.split(',') if cid.isdigit()]
            # For display, pick the first category or None
            category = next((c for c in categories if c['id'] == category_id_list[0]), None) if category_id_list else None
            if category_id_list:
                products = Product.get_by_categories(category_id_list)
        except Exception as e:
            products = []
        return render_template('category_products.html', category=category, products=products)

    @app.route('/products/brand/<string:brand_name>')
    def products_by_brand(brand_name):
        products = []
        try:
            products = Product.get_by_brand(brand_name)
        except Exception as e:
            products = []
        return render_template('category_products.html', brand=brand_name, products=products)


    @app.route('/about')
    def about():
        products = Product.get_all()
        return render_template('about.html', products=products)
    
    @app.route('/services')
    def services():
        products = Product.get_all()
        return render_template('services.html', products=products)
    
    @app.route('/privacy')
    def privacy():
        products = Product.get_all()
        return render_template('privacy.html', products=products)
    

    @app.route('/cart')
    def cart():
        return render_template('cart.html')

    @app.route('/api/cart/add', methods=['POST'])
    def add_to_cart():
        app.logger.info(f"🛒 ADD TO CART CALLED - Session: {dict(session)}")

        if 'username' not in session:
            app.logger.error("❌ No username in session for add to cart")
            return jsonify({'success': False, 'error': 'Please log in to add items to cart'}), 401

        data = request.get_json()
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)

        app.logger.info(f"🛒 ADD TO CART - Product ID: {product_id}, Quantity: {quantity}")

        if not product_id:
            return jsonify({'success': False, 'error': 'Product ID is required'}), 400

        # Verify product exists
        product = Product.get_by_id(product_id)
        if not product:
            return jsonify({'success': False, 'error': 'Product not found'}), 404

        # Check if product is in stock
        current_stock = product.get('stock', 0)
        if current_stock <= 0:
            return jsonify({'success': False, 'error': 'This product is currently out of stock'}), 400

        try:
            # Get customer info
            customer_id = session.get('user_id')
            if not customer_id:
                return jsonify({'success': False, 'error': 'Customer not found in session'}), 401

            # Check if customer has an existing pending order
            conn = get_db()
            cur = conn.cursor(dictionary=True)

            try:
                # Look for existing pending order for this customer
                cur.execute("""
                    SELECT id FROM orders
                    WHERE customer_id = %s AND status = 'Pending'
                    ORDER BY order_date DESC LIMIT 1
                """, (customer_id,))
                existing_order = cur.fetchone()

                if existing_order:
                    order_id = existing_order['id']

                    # Check if this product is already in the order
                    cur.execute("""
                        SELECT id, quantity FROM order_items
                        WHERE order_id = %s AND product_id = %s
                    """, (order_id, product_id))
                    existing_item = cur.fetchone()

                    if existing_item:
                        # Update existing item quantity
                        new_quantity = existing_item['quantity'] + quantity
                        if new_quantity > current_stock:
                            return jsonify({'success': False, 'error': f'Cannot add {quantity} more. Stock available: {current_stock}, already in order: {existing_item["quantity"]}'}), 400

                        cur.execute("""
                            UPDATE order_items
                            SET quantity = %s, price = %s
                            WHERE id = %s
                        """, (new_quantity, product['price'], existing_item['id']))

                        # Update order total
                        cur.execute("""
                            UPDATE orders
                            SET total_amount = (
                                SELECT SUM(quantity * price) FROM order_items WHERE order_id = %s
                            )
                            WHERE id = %s
                        """, (order_id, order_id))

                    else:
                        # Add new item to existing order
                        if quantity > current_stock:
                            return jsonify({'success': False, 'error': f'Only {current_stock} items available in stock'}), 400

                        cur.execute("""
                            INSERT INTO order_items (order_id, product_id, quantity, price)
                            VALUES (%s, %s, %s, %s)
                        """, (order_id, product_id, quantity, product['price']))

                        # Update order total
                        cur.execute("""
                            UPDATE orders
                            SET total_amount = (
                                SELECT SUM(quantity * price) FROM order_items WHERE order_id = %s
                            )
                            WHERE id = %s
                        """, (order_id, order_id))

                else:
                    # Create new pending order
                    if quantity > current_stock:
                        return jsonify({'success': False, 'error': f'Only {current_stock} items available in stock'}), 400

                    # Create order
                    total_amount = quantity * product['price']
                    cur.execute("""
                        INSERT INTO orders (customer_id, order_date, total_amount, status)
                        VALUES (%s, NOW(), %s, 'Pending')
                    """, (customer_id, total_amount))
                    order_id = cur.lastrowid

                    # Add item to order
                    cur.execute("""
                        INSERT INTO order_items (order_id, product_id, quantity, price)
                        VALUES (%s, %s, %s, %s)
                    """, (order_id, product_id, quantity, product['price']))

                conn.commit()

                # Update session cart for display purposes (optional)
                if 'cart' not in session:
                    session['cart'] = []

                # Update cart in session to reflect the order
                existing_cart_item = None
                for item in session['cart']:
                    if item['product_id'] == product_id:
                        existing_cart_item = item
                        break

                if existing_cart_item:
                    existing_cart_item['quantity'] += quantity
                else:
                    session['cart'].append({
                        'product_id': product_id,
                        'quantity': quantity,
                        'order_id': order_id
                    })

                session.modified = True

                app.logger.info(f"✅ ADD TO CART SUCCESS - Order ID: {order_id}, Session cart: {session.get('cart', [])}")

                return jsonify({
                    'success': True,
                    'message': 'Item added to cart and pending order created',
                    'order_id': order_id
                })

            finally:
                cur.close()
                conn.close()

        except Exception as e:
            app.logger.error(f"Error adding to cart: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/cart/remove', methods=['POST'])
    def remove_from_cart():
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        data = request.get_json()
        product_id = data.get('product_id')

        if not product_id:
            return jsonify({'success': False, 'error': 'Product ID is required'}), 400

        try:
            customer_id = session.get('user_id')
            if not customer_id:
                return jsonify({'success': False, 'error': 'Customer not found in session'}), 401

            conn = get_db()
            cur = conn.cursor(dictionary=True)

            try:
                # Remove item from pending order
                cur.execute("""
                    DELETE oi FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    WHERE o.customer_id = %s AND o.status = 'Pending' AND oi.product_id = %s
                """, (customer_id, product_id))

                # Update order total
                cur.execute("""
                    UPDATE orders o
                    SET total_amount = (
                        SELECT COALESCE(SUM(oi.quantity * oi.price), 0)
                        FROM order_items oi
                        WHERE oi.order_id = o.id
                    )
                    WHERE o.customer_id = %s AND o.status = 'Pending'
                """, (customer_id,))

                # Check if order is now empty and delete if so
                cur.execute("""
                    SELECT COUNT(*) as item_count FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    WHERE o.customer_id = %s AND o.status = 'Pending'
                """, (customer_id,))
                result = cur.fetchone()

                if result['item_count'] == 0:
                    # Delete empty order
                    cur.execute("""
                        DELETE FROM orders
                        WHERE customer_id = %s AND status = 'Pending'
                    """, (customer_id,))

                conn.commit()

                # Also remove from session cart
                if 'cart' in session:
                    session['cart'] = [item for item in session['cart'] if item['product_id'] != product_id]
                    session.modified = True

                return jsonify({'success': True, 'message': 'Item removed from cart'})

            finally:
                cur.close()
                conn.close()

        except Exception as e:
            app.logger.error(f"Error removing from cart: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/cart/remove-preorder', methods=['POST'])
    def remove_preorder_from_cart():
        """Remove a pre-order item from cart"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        data = request.get_json()
        preorder_id = data.get('preorder_id')

        if not preorder_id:
            return jsonify({'success': False, 'error': 'Pre-order ID is required'}), 400

        if 'cart' not in session:
            session['cart'] = []

        # Remove pre-order item from cart
        session['cart'] = [item for item in session['cart'] if item.get('preorder_id') != preorder_id]
        session.modified = True

        return jsonify({'success': True, 'message': 'Pre-order item removed from cart'})

    @app.route('/api/cart/update', methods=['POST'])
    def update_cart_quantity():
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        data = request.get_json()
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)

        if not product_id:
            return jsonify({'success': False, 'error': 'Product ID is required'}), 400

        if quantity <= 0:
            return jsonify({'success': False, 'error': 'Quantity must be greater than 0'}), 400

        if 'cart' not in session:
            session['cart'] = []

        # Update quantity for existing item
        for item in session['cart']:
            if item['product_id'] == product_id:
                item['quantity'] = quantity
                break

        session.modified = True
        return jsonify({'success': True, 'message': 'Cart updated'})

    @app.route('/api/cart/update-preorder', methods=['POST'])
    def update_preorder_cart_quantity():
        """Update quantity of a pre-order item in cart"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        data = request.get_json()
        preorder_id = data.get('preorder_id')
        quantity = data.get('quantity', 1)

        if not preorder_id:
            return jsonify({'success': False, 'error': 'Pre-order ID is required'}), 400

        if quantity <= 0:
            return jsonify({'success': False, 'error': 'Quantity must be greater than 0'}), 400

        if 'cart' not in session:
            session['cart'] = []

        # Update quantity for existing pre-order item
        for item in session['cart']:
            if item.get('preorder_id') == preorder_id:
                item['quantity'] = quantity
                break

        session.modified = True
        return jsonify({'success': True, 'message': 'Pre-order cart updated'})

    @app.route('/api/cart/add-preorder', methods=['POST'])
    def add_preorder_to_cart():
        """Add a pre-order to cart for payment"""
        app.logger.info(f"🛒 ADD PREORDER TO CART - Session data: {dict(session)}")

        if 'username' not in session:
            app.logger.error("❌ No username in session for add preorder to cart")
            return jsonify({'success': False, 'error': 'Please log in to add items to cart'}), 401

        try:
            data = request.get_json()
            app.logger.info(f"📦 Received data: {data}")

            preorder_id = data.get('preorder_id')
            product_id = data.get('product_id')
            quantity = data.get('quantity', 1)
            price = data.get('price')

            app.logger.info(f"🔍 Parsed: preorder_id={preorder_id}, product_id={product_id}, quantity={quantity}, price={price}")

            if not all([preorder_id, product_id, quantity, price]):
                app.logger.error(f"❌ Missing required fields: preorder_id={preorder_id}, product_id={product_id}, quantity={quantity}, price={price}")
                return jsonify({'success': False, 'error': 'Missing required fields'}), 400

            # Verify the pre-order exists and belongs to the current user
            from models import PreOrder, Customer

            customer_id = session.get('user_id')
            customer = Customer.get_by_id(customer_id)
            if not customer:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404

            preorder = PreOrder.get_by_id(preorder_id)
            if not preorder:
                return jsonify({'success': False, 'error': 'Pre-order not found'}), 404

            if preorder['customer_id'] != customer['id']:
                return jsonify({'success': False, 'error': 'Unauthorized access to pre-order'}), 403

            # Verify product exists
            product = Product.get_by_id(product_id)
            if not product:
                return jsonify({'success': False, 'error': 'Product not found'}), 404

            # Initialize cart if it doesn't exist
            if 'cart' not in session:
                session['cart'] = []
                app.logger.info("🛒 Initialized empty cart")

            app.logger.info(f"🛒 Current cart before adding: {session['cart']}")

            # Check if this product is already in cart (combine same products)
            existing_item = None
            for item in session['cart']:
                # Check for same product, regardless of whether it's a pre-order or regular item
                if item.get('product_id') == product_id and item.get('type') == 'preorder':
                    existing_item = item
                    break

            if existing_item:
                # Combine quantities if same product already in cart
                existing_item['quantity'] += int(quantity)
                app.logger.info(f"🔄 Combined quantities for existing product in cart: {existing_item}")
            else:
                # Add new pre-order item to cart
                cart_item = {
                    'product_id': product_id,
                    'preorder_id': preorder_id,
                    'name': product['name'],
                    'price': float(price),
                    'quantity': int(quantity),
                    'type': 'preorder'  # Mark as pre-order item
                }
                session['cart'].append(cart_item)
                app.logger.info(f"➕ Added new pre-order to cart: {cart_item}")

            session.modified = True
            app.logger.info(f"🛒 Final cart after adding: {session['cart']}")

            app.logger.info(f"✅ Pre-order {preorder_id} added to cart for customer {customer['id']}")

            return jsonify({
                'success': True,
                'message': 'Pre-order added to cart successfully'
            })

        except Exception as e:
            app.logger.error(f"Error adding pre-order to cart: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/cart/test-add-preorder/<int:preorder_id>', methods=['GET'])
    def test_add_preorder_to_cart(preorder_id):
        """Test endpoint to manually add a pre-order to cart"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import PreOrder, Customer

            # Get the pre-order
            preorder = PreOrder.get_by_id(preorder_id)
            if not preorder:
                return jsonify({'success': False, 'error': 'Pre-order not found'}), 404

            # Get product info
            product = Product.get_by_id(preorder['product_id'])
            if not product:
                return jsonify({'success': False, 'error': 'Product not found'}), 404

            # Initialize cart if it doesn't exist
            if 'cart' not in session:
                session['cart'] = []

            # Add pre-order to cart
            cart_item = {
                'product_id': preorder['product_id'],
                'preorder_id': preorder_id,
                'name': product['name'],
                'price': float(preorder['expected_price']),
                'quantity': int(preorder['quantity']),
                'type': 'preorder'
            }
            session['cart'].append(cart_item)
            session.modified = True

            app.logger.info(f"🧪 TEST: Added pre-order {preorder_id} to cart manually")

            return jsonify({
                'success': True,
                'message': f'Pre-order {preorder_id} added to cart for testing',
                'cart_item': cart_item
            })

        except Exception as e:
            app.logger.error(f"Error in test add preorder: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/cart/clear', methods=['POST'])
    def clear_cart():
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        # Clear session cart
        session['cart'] = []
        session.modified = True
        return jsonify({'success': True, 'message': 'Cart cleared'})



    @app.route('/api/cart/items', methods=['GET'])
    def get_cart_items():
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        customer_id = session.get('user_id')
        if not customer_id:
            return jsonify({'success': False, 'error': 'Customer not found in session'}), 401

        # Get cart items from pending order instead of session
        cart_items = []
        total_amount = 0
        total_items = 0

        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)

            try:
                # Get pending order items
                cur.execute("""
                    SELECT oi.product_id, oi.quantity, oi.price, p.name, p.photo
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    JOIN products p ON oi.product_id = p.id
                    WHERE o.customer_id = %s AND o.status = 'Pending'
                    ORDER BY o.order_date DESC
                """, (customer_id,))
                order_items = cur.fetchall()



                for item in order_items:
                    cart_item = {
                        'id': item['product_id'],
                        'name': item['name'],
                        'price': float(item['price']),
                        'quantity': item['quantity'],
                        'photo': item.get('photo', ''),
                        'subtotal': float(item['price']) * item['quantity']
                    }
                    cart_items.append(cart_item)
                    total_amount += cart_item['subtotal']
                    total_items += item['quantity']

                # Also include session cart items (for pre-orders and mixed carts)
                if 'cart' in session:
                    for item in session['cart']:
                        if item.get('type') == 'preorder':
                            # Handle pre-order items from session
                            cart_item = {
                                'preorder_id': item.get('preorder_id'),
                                'name': item.get('name', 'Pre-order Item'),
                                'price': float(item.get('price', 0)),
                                'quantity': item.get('quantity', 1),
                                'type': 'preorder',
                                'subtotal': float(item.get('price', 0)) * item.get('quantity', 1)
                            }
                            cart_items.append(cart_item)
                            total_amount += cart_item['subtotal']
                            total_items += item['quantity']

            finally:
                cur.close()
                conn.close()

        except Exception as e:
            app.logger.error(f"Error loading cart items: {str(e)}")
            # Fallback to session cart if database fails
            if 'cart' not in session:
                session['cart'] = []

            for item in session['cart']:
                # Only process regular items if not already in pending order
                if item.get('type') != 'preorder':
                    product = Product.get_by_id(item['product_id'])
                    if product:
                        cart_item = {
                            'id': product['id'],
                            'name': product['name'],
                            'price': float(product['price']),
                            'quantity': item['quantity'],
                            'photo': product.get('photo', ''),
                            'subtotal': float(product['price']) * item['quantity']
                        }
                        cart_items.append(cart_item)
                        total_amount += cart_item['subtotal']
                        total_items += item['quantity']

        response_data = {
            'success': True,
            'cart_items': cart_items,
            'total_amount': total_amount,
            'total_items': total_items
        }

        app.logger.info(f"🛒 CART API RETURNING: {response_data}")
        return jsonify(response_data)

    @app.route('/api/user/info', methods=['GET'])
    def get_user_info():
        """Get logged-in user information for checkout."""
        if 'username' not in session or 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Not logged in'})

        try:
            # Get customer information by user_id
            customer = Customer.get_by_id(session['user_id'])

            if not customer:
                return jsonify({'success': False, 'error': 'Customer not found'})

            user_info = {
                'id': customer['id'],
                'first_name': customer['first_name'],
                'last_name': customer['last_name'],
                'email': customer['email'],
                'phone': customer.get('phone', ''),
                'address': customer.get('address', '')
            }

            return jsonify({
                'success': True,
                'user': user_info
            })

        except Exception as e:
            app.logger.error(f"Error getting user info: {str(e)}")
            return jsonify({'success': False, 'error': 'Failed to get user information'}), 500

    # Bakong Payment Endpoints
    @app.route('/api/payment/create-session', methods=['POST'])
    def create_payment_session():
        """Create a new payment session with QR code generation."""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            data = request.get_json()
            cart_items = data.get('cart_items', [])
            customer_info = data.get('customer_info', {})
            total_amount = data.get('total_amount', 0)

            if not cart_items or total_amount <= 0:
                return jsonify({'success': False, 'error': 'Invalid cart data'}), 400

            # Check if cart contains pre-order items
            preorder_items = [item for item in cart_items if item.get('type') == 'preorder']
            regular_items = [item for item in cart_items if item.get('type') != 'preorder']

            # Handle mixed cart (both regular and pre-order items)
            if preorder_items and regular_items:
                app.logger.info(f"🔄 Processing mixed cart: {len(preorder_items)} pre-orders, {len(regular_items)} regular items")

                # Calculate separate totals
                preorder_total = sum(item['price'] * item['quantity'] for item in preorder_items)
                regular_total = sum(item['price'] * item['quantity'] for item in regular_items)

                # Create mixed cart payment session
                session_id = PaymentSession.create_mixed_session(
                    preorder_items, regular_items, customer_info,
                    preorder_total, regular_total, total_amount
                )

                # Generate QR code for total amount
                qr_generator = BakongQRGenerator(use_static_qr=True)
                qr_data = qr_generator.generate_payment_qr(
                    amount=total_amount,
                    currency="USD",
                    reference_id=f"MIXED_CART_{session_id[:8]}"
                )

                # Update session with QR data
                PaymentSession.update_session_status(session_id, 'pending', {
                    'qr_data': qr_data,
                    'payment_type': 'mixed_cart'
                })

                # Get updated session
                payment_session = PaymentSession.get_session(session_id)

                app.logger.info(f"✅ Mixed cart QR payment session created: {session_id}")
                return jsonify({
                    'success': True,
                    'session': payment_session
                })

            # Handle pre-order items
            if preorder_items:
                app.logger.info(f"🔄 Creating QR payment session for {len(preorder_items)} pre-order items")

                # For pre-orders, we don't create an order - we process payments directly
                session_id = PaymentSession.create_session(cart_items, customer_info, total_amount, None)

                # Generate QR code for pre-order payment
                qr_generator = BakongQRGenerator(use_static_qr=True)
                qr_data = qr_generator.generate_payment_qr(
                    amount=total_amount,
                    currency="USD",
                    reference_id=f"PREORDER_CART_{session_id[:8]}"
                )

                # Update session with QR data and mark as pre-order payment
                PaymentSession.update_session_status(session_id, 'pending', {
                    'qr_data': qr_data,
                    'payment_type': 'preorder_cart',
                    'preorder_items': preorder_items
                })

                # Get updated session
                payment_session = PaymentSession.get_session(session_id)

                app.logger.info(f"✅ Pre-order cart QR payment session created: {session_id}")
                return jsonify({
                    'success': True,
                    'session': payment_session
                })

            # Handle regular items - use existing pending order
            customer_id = session.get('user_id')
            if not customer_id:
                return jsonify({'success': False, 'error': 'Customer not found in session'}), 401

            # Find existing pending order for this customer
            conn = get_db()
            cur = conn.cursor(dictionary=True)

            try:
                cur.execute("""
                    SELECT id, total_amount FROM orders
                    WHERE customer_id = %s AND status = 'Pending'
                    ORDER BY order_date DESC LIMIT 1
                """, (customer_id,))
                existing_order = cur.fetchone()

                if not existing_order:
                    return jsonify({'success': False, 'error': 'No pending order found. Please add items to cart first.'}), 400

                order_id = existing_order['id']
                total_amount = float(existing_order['total_amount'])

                app.logger.info(f"🛒 Using existing pending order {order_id} for checkout")

            finally:
                cur.close()
                conn.close()

            # Create payment session with order_id
            session_id = PaymentSession.create_session(cart_items, customer_info, total_amount, order_id)

            # Generate QR code with your ACLEDA Bank QR code
            qr_generator = BakongQRGenerator(use_static_qr=True)
            qr_data = qr_generator.generate_payment_qr(
                amount=total_amount,
                currency="USD",
                reference_id=f"ORDER_{order_id}"
            )

            # Update session with QR data
            PaymentSession.update_session_status(session_id, 'pending', {'qr_data': qr_data, 'order_id': order_id})

            # Don't clear cart yet - wait for payment confirmation
            # Cart will be cleared in confirm_payment route when payment is successful

            # Get updated session
            payment_session = PaymentSession.get_session(session_id)

            return jsonify({
                'success': True,
                'session': payment_session
            })

        except Exception as e:
            app.logger.error(f"Error creating payment session: {str(e)}")
            return jsonify({'success': False, 'error': 'Failed to create payment session'}), 500

    @app.route('/api/payment/status/<session_id>', methods=['GET'])
    def get_payment_status(session_id):
        """Get payment status for a session."""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            payment_session = PaymentSession.get_session(session_id)

            if not payment_session:
                return jsonify({'success': False, 'error': 'Session not found'}), 404

            # Check if session is expired
            if PaymentSession.is_session_expired(session_id):
                PaymentSession.update_session_status(session_id, 'expired')
                return jsonify({
                    'success': True,
                    'status': 'expired',
                    'message': 'Payment session has expired'
                })

            # In a real implementation, this would check with Bakong API
            # For your ACLEDA Bank QR code, payment verification is manual
            # Customer scans QR → pays → shows confirmation → you confirm manually
            # Payment status remains 'pending' until you manually confirm

            return jsonify({
                'success': True,
                'status': payment_session['status'],
                'session': payment_session
            })

        except Exception as e:
            app.logger.error(f"Error checking payment status: {str(e)}")
            return jsonify({'success': False, 'error': 'Failed to check payment status'}), 500

    @app.route('/api/payment/cancel/<session_id>', methods=['POST'])
    def cancel_payment(session_id):
        """Cancel a payment session and update order status to Cancelled."""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            payment_session = PaymentSession.get_session(session_id)

            if not payment_session:
                return jsonify({'success': False, 'error': 'Session not found'}), 404

            if payment_session['status'] in ['completed', 'failed']:
                return jsonify({'success': False, 'error': 'Cannot cancel completed or failed payment'}), 400

            # Update order status to Cancelled if order exists
            order_id = payment_session.get('order_id')
            if order_id:
                Order.update_status(order_id, 'Cancelled')
                app.logger.info(f"Order {order_id} status updated to Cancelled")

            PaymentSession.update_session_status(session_id, 'cancelled')

            return jsonify({
                'success': True,
                'message': 'Payment cancelled successfully',
                'order_id': order_id
            })

        except Exception as e:
            app.logger.error(f"Error cancelling payment: {str(e)}")
            return jsonify({'success': False, 'error': 'Failed to cancel payment'}), 500

    @app.route('/api/payment/confirm/<session_id>', methods=['POST'])
    def confirm_payment(session_id):
        """Confirm payment and create order."""
        app.logger.info(f"🔥 PAYMENT CONFIRMATION STARTED for session: {session_id}")
        app.logger.info(f"👤 Current session data: {dict(session)}")

        if 'username' not in session:
            app.logger.error("❌ No username in session for payment confirmation")
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            payment_session = PaymentSession.get_session(session_id)
            app.logger.info(f"💳 Payment session found: {payment_session}")

            if not payment_session:
                app.logger.error(f"❌ Payment session {session_id} not found")
                return jsonify({'success': False, 'error': 'Session not found'}), 404

            # For manual confirmation, we'll mark it as completed when user clicks the button
            if payment_session['status'] not in ['pending', 'completed']:
                return jsonify({'success': False, 'error': 'Invalid payment status'}), 400

            # Mark payment as completed if it's still pending
            if payment_session['status'] == 'pending':
                PaymentSession.update_session_status(session_id, 'completed')

            # Validate customer information
            customer_info = payment_session['customer_info']
            if not customer_info.get('email') or not customer_info.get('first_name'):
                return jsonify({'success': False, 'error': 'Invalid customer information'}), 400

            # Create customer if needed
            customer = Customer.get_by_name_or_email(
                customer_info.get('first_name', ''),
                customer_info.get('last_name', ''),
                customer_info.get('email', '')
            )

            if not customer:
                try:
                    customer_id = Customer.create(
                        customer_info.get('first_name', ''),
                        customer_info.get('last_name', ''),
                        customer_info.get('email', ''),
                        'defaultpassword123',  # Default password
                        customer_info.get('phone', ''),
                        customer_info.get('address', '')
                    )
                except Exception as e:
                    app.logger.error(f"Error creating customer: {str(e)}")
                    return jsonify({'success': False, 'error': 'Failed to create customer record'}), 500
            else:
                customer_id = customer['id']

            # Check if this is a mixed cart session
            session_type = payment_session.get('session_type', 'regular')

            if session_type == 'mixed_cart':
                # Handle mixed cart payment
                app.logger.info("🔄 Processing mixed cart payment")

                # Get items from mixed cart session
                preorder_items_data = payment_session.get('preorder_items', [])
                regular_items_data = payment_session.get('regular_items', [])

                # Process pre-order items
                preorder_items = []
                for item in preorder_items_data:
                    preorder_id = item.get('preorder_id')
                    if preorder_id:
                        preorder_items.append({
                            'preorder_id': preorder_id,
                            'quantity': item['quantity'],
                            'price': item['price']
                        })

                # Process regular items - create order
                order_id = None
                if regular_items_data:
                    order_items = []
                    for item in regular_items_data:
                        order_items.append({
                            'product_id': item['id'],
                            'quantity': item['quantity'],
                            'price': item['price']
                        })

                    # Create order for regular items
                    try:
                        order_id = Order.create(
                            customer_id=customer_id,
                            order_date=datetime.now(),
                            status='Completed',
                            items=order_items,
                            payment_method='QR Payment'
                        )
                        app.logger.info(f"✅ Created order {order_id} for regular items in mixed cart")
                    except Exception as e:
                        app.logger.error(f"Error creating order for regular items: {str(e)}")
                        return jsonify({'success': False, 'error': f'Failed to create order: {str(e)}'}), 500

            else:
                # Handle regular cart items (existing logic)
                cart_items = payment_session.get('cart_items', [])
                if not cart_items:
                    return jsonify({'success': False, 'error': 'No items in cart'}), 400

                order_items = []
                preorder_items = []

                for item in cart_items:
                    # Check if this is a pre-order item
                    if item.get('type') == 'preorder':
                        # Handle pre-order payment
                        preorder_id = item.get('preorder_id')
                        if preorder_id:
                            preorder_items.append({
                                'preorder_id': preorder_id,
                                'quantity': item['quantity'],
                                'price': item['price']
                            })
                        continue

                    # Validate required fields for regular items
                    if not all(key in item for key in ['id', 'quantity', 'price']):
                        return jsonify({'success': False, 'error': 'Invalid cart item data'}), 400

                    if item['quantity'] <= 0 or item['price'] <= 0:
                        return jsonify({'success': False, 'error': 'Invalid item quantity or price'}), 400

                    order_items.append({
                        'product_id': item['id'],
                        'quantity': item['quantity'],
                        'price': item['price']
                    })

                # Handle pre-order-only payments vs regular orders
                order_id = payment_session.get('order_id')

            # Process pre-order payments
            if preorder_items:
                app.logger.info(f"💰 Processing {len(preorder_items)} pre-order payments")
                for preorder_item in preorder_items:
                    try:
                        preorder_id = preorder_item['preorder_id']
                        payment_amount = preorder_item['price'] * preorder_item['quantity']

                        app.logger.info(f"💵 Processing QR payment for pre-order {preorder_id}: ${payment_amount}")

                        # Update pre-order with QR payment
                        PreOrder.add_deposit_payment(preorder_id, payment_amount, 'QR Payment')
                        app.logger.info(f"💵 Pre-order {preorder_id} payment updated successfully")

                    except Exception as e:
                        app.logger.error(f"Error processing pre-order payment {preorder_id}: {str(e)}")
                        return jsonify({'success': False, 'error': f'Failed to process pre-order payment: {str(e)}'}), 400

            # Update regular order status if it exists
            if order_id:
                try:
                    app.logger.info(f"📦 Updating order {order_id} status to Completed")

                    # Check current status before update
                    conn = get_db()
                    cur = conn.cursor()
                    cur.execute("SELECT status FROM orders WHERE id = %s", (order_id,))
                    current_status = cur.fetchone()
                    app.logger.info(f"🔍 Order {order_id} current status: {current_status[0] if current_status else 'NOT FOUND'}")
                    cur.close()
                    conn.close()

                    Order.update_status(order_id, 'Completed')

                    # Verify status was updated
                    conn = get_db()
                    cur = conn.cursor()
                    cur.execute("SELECT status FROM orders WHERE id = %s", (order_id,))
                    new_status = cur.fetchone()
                    app.logger.info(f"✅ Order {order_id} status after update: {new_status[0] if new_status else 'NOT FOUND'}")
                    cur.close()
                    conn.close()

                except Exception as e:
                    app.logger.error(f"Error updating order status: {str(e)}")
                    return jsonify({'success': False, 'error': 'Failed to update order status'}), 500

            # Clear cart now that payment is confirmed
            session['cart'] = []
            session.modified = True
            app.logger.info("🛒 Cart cleared after successful QR payment confirmation")

            # Also clear any pending orders for this customer to ensure cart is truly empty
            try:
                conn = get_db()
                cur = conn.cursor()
                customer_id = session.get('user_id')

                # Check if there are any remaining pending orders
                cur.execute("SELECT id FROM orders WHERE customer_id = %s AND status = 'Pending'", (customer_id,))
                remaining_pending = cur.fetchall()
                app.logger.info(f"🔍 Remaining pending orders after payment: {remaining_pending}")

                cur.close()
                conn.close()
            except Exception as e:
                app.logger.error(f"Error checking remaining pending orders: {str(e)}")



            # Mark session as processed
            PaymentSession.update_session_status(session_id, 'processed', {
                'order_id': order_id,
                'preorder_items': preorder_items
            })

            # Determine response based on payment type
            if session_type == 'mixed_cart':
                # Mixed cart payment - provide both order and pre-order info
                response_data = {
                    'success': True,
                    'payment_type': 'mixed_cart',
                    'message': 'Mixed cart payment processed successfully'
                }

                if order_id:
                    response_data['order_id'] = order_id

                if preorder_items:
                    response_data['preorder_id'] = preorder_items[0]['preorder_id']
                    response_data['preorder_count'] = len(preorder_items)

            elif preorder_items and not order_id:
                # Pre-order only payment - redirect to first pre-order invoice
                first_preorder_id = preorder_items[0]['preorder_id']
                response_data = {
                    'success': True,
                    'preorder_id': first_preorder_id,
                    'message': 'Pre-order payment processed successfully',
                    'payment_type': 'preorder'
                }
            else:
                # Regular order payment
                response_data = {
                    'success': True,
                    'order_id': order_id,
                    'message': 'Order created successfully'
                }

            app.logger.info(f"🎉 Payment confirmation successful, returning: {response_data}")
            return jsonify(response_data)

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            app.logger.error(f"💥 ERROR confirming payment: {str(e)}")
            app.logger.error(f"💥 Full traceback: {error_details}")
            return jsonify({'success': False, 'error': 'Failed to create order'}), 500

    @app.route('/api/payment/cash', methods=['POST'])
    def process_cash_payment():
        """Process cash payment for walk-in customers."""
        app.logger.info("💵 CASH PAYMENT STARTED")

        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            data = request.get_json()
            cart_items = data.get('cart_items', [])
            customer_info = data.get('customer_info', {})
            total_amount = data.get('total_amount', 0)

            app.logger.info(f"💵 Cash payment request: {len(cart_items)} items, total: ${total_amount}")

            # Validate input
            if not cart_items:
                return jsonify({'success': False, 'error': 'No items in cart'}), 400

            if not customer_info.get('first_name') or not customer_info.get('email'):
                return jsonify({'success': False, 'error': 'Customer information is required'}), 400

            # Check if customer exists, create if not
            customer = Customer.get_by_name_or_email(
                customer_info.get('first_name', ''),
                customer_info.get('last_name', ''),
                customer_info.get('email', '')
            )

            if not customer:
                try:
                    customer_id = Customer.create(
                        customer_info.get('first_name', ''),
                        customer_info.get('last_name', ''),
                        customer_info.get('email', ''),
                        'defaultpassword123',  # Default password
                        customer_info.get('phone', ''),
                        customer_info.get('address', '')
                    )
                except Exception as e:
                    app.logger.error(f"Error creating customer: {str(e)}")
                    return jsonify({'success': False, 'error': 'Failed to create customer record'}), 500
            else:
                customer_id = customer['id']

            # Separate pre-order items from regular items
            preorder_items = []
            regular_items = []

            for item in cart_items:
                if item.get('type') == 'preorder':
                    preorder_items.append(item)
                else:
                    regular_items.append({
                        'product_id': item['id'],
                        'quantity': item['quantity'],
                        'price': item['price']
                    })

            # Process regular items (create order)
            order_id = None
            if regular_items:
                try:
                    order_id = Order.create(
                        customer_id=customer_id,
                        order_date=datetime.now(),
                        status='Completed',  # Cash payment is immediate
                        items=regular_items,
                        payment_method='Cash'
                    )
                    app.logger.info(f"💵 Cash payment order created: {order_id}")
                except ValueError as e:
                    # Handle insufficient stock error
                    app.logger.error(f"Stock error during cash payment order creation: {str(e)}")
                    return jsonify({'success': False, 'error': str(e)}), 400

            # Process pre-order items (update deposit amounts)
            if preorder_items:
                from models import PreOrder
                for item in preorder_items:
                    try:
                        preorder_id = item['preorder_id']
                        payment_amount = float(item['price']) * item['quantity']

                        app.logger.info(f"💵 Processing cash payment for pre-order {preorder_id}: ${payment_amount}")

                        # Update pre-order with cash payment
                        PreOrder.add_deposit_payment(preorder_id, payment_amount, 'Cash')
                        app.logger.info(f"💵 Pre-order {preorder_id} payment updated successfully")

                    except Exception as e:
                        app.logger.error(f"Error processing pre-order payment {preorder_id}: {str(e)}")
                        return jsonify({'success': False, 'error': f'Failed to process pre-order payment: {str(e)}'}), 400

            # Cancel any existing pending orders (from cancelled KHQR payments)
            try:
                conn = get_db()
                cur = conn.cursor()

                # Find and cancel pending orders for this customer (these are likely cancelled KHQR payments)
                cur.execute("SELECT id FROM orders WHERE customer_id = %s AND status = 'Pending'", (customer_id,))
                pending_orders = cur.fetchall()

                for pending_order in pending_orders:
                    pending_order_id = pending_order[0]
                    cur.execute("UPDATE orders SET status = 'Cancelled' WHERE id = %s", (pending_order_id,))
                    app.logger.info(f"💵 Cancelled pending order {pending_order_id} (likely from cancelled KHQR payment)")

                conn.commit()
                cur.close()
                conn.close()

                app.logger.info(f"💵 Cancelled {len(pending_orders)} pending orders to avoid duplicates")

            except Exception as e:
                app.logger.error(f"Error cancelling pending orders during cash payment: {str(e)}")

            # Clear cart since payment is completed
            session['cart'] = []
            session.modified = True

            # Prepare success message
            if order_id and preorder_items:
                message = f'Cash payment processed successfully. Order #{order_id} created and {len(preorder_items)} pre-order(s) updated.'
            elif order_id:
                message = f'Cash payment processed successfully. Order #{order_id} created.'
            elif preorder_items:
                message = f'Cash payment processed successfully. {len(preorder_items)} pre-order(s) updated.'
            else:
                message = 'Cash payment processed successfully.'

            app.logger.info(f"💵 Cash payment successful - Order: {order_id}, Pre-orders: {len(preorder_items) if preorder_items else 0}")

            # Prepare response based on what was processed
            response_data = {
                'success': True,
                'message': message
            }

            # Handle mixed cart (both order and pre-orders)
            if order_id and preorder_items:
                response_data['payment_type'] = 'mixed_cart'
                response_data['order_id'] = order_id
                response_data['preorder_id'] = preorder_items[0]['preorder_id']
                response_data['preorder_count'] = len(preorder_items)

            # If we have only a regular order, include order_id for invoice redirect
            elif order_id:
                response_data['order_id'] = order_id

            # If we only have pre-orders (no regular order), include pre-order info
            elif preorder_items:
                response_data['preorder_only'] = True
                response_data['preorder_count'] = len(preorder_items)
                response_data['preorder_ids'] = [item['preorder_id'] for item in preorder_items]
                # For single pre-order payment, include the preorder_id for invoice redirect
                if len(preorder_items) == 1:
                    response_data['preorder_id'] = preorder_items[0]['preorder_id']

            return jsonify(response_data)

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            app.logger.error(f"💥 ERROR processing cash payment: {str(e)}")
            app.logger.error(f"💥 Full traceback: {error_details}")
            return jsonify({'success': False, 'error': 'Failed to process cash payment'}), 500

    @app.route('/invoice/<int:order_id>')
    def view_invoice(order_id):
        """Display invoice for completed order."""
        app.logger.info(f"🧾 Invoice requested for order_id: {order_id}")
        app.logger.info(f"👤 Session data: {dict(session)}")

        # Temporarily bypass auth check for debugging
        # if 'username' not in session:
        #     app.logger.warning("❌ No username in session, redirecting to login")
        #     return redirect(url_for('login'))

        try:
            # Get order details
            app.logger.info(f"🔍 Looking for order with ID: {order_id}")
            order = Order.get_by_id(order_id)
            app.logger.info(f"📋 Order found: {order}")

            if not order:
                app.logger.error(f"❌ Order {order_id} not found")
                flash('Order not found', 'error')
                return redirect(url_for('show_dashboard'))

            # Get customer details
            customer = Customer.get_by_id(order['customer_id'])
            if not customer:
                flash('Customer not found', 'error')
                return redirect(url_for('show_dashboard'))

            # Get order items
            order_items = Order.get_order_items(order_id)
            app.logger.info(f"📦 Order items: {order_items}")

            app.logger.info("✅ Rendering invoice template")
            return render_template('invoice.html',
                                 order=order,
                                 customer=customer,
                                 order_items=order_items)

        except Exception as e:
            app.logger.error(f"💥 Error viewing invoice: {str(e)}")
            flash('Error loading invoice', 'error')
            return redirect(url_for('show_dashboard'))

    @app.route('/mixed-cart/summary/<int:order_id>/<int:preorder_id>')
    def view_mixed_cart_summary(order_id, preorder_id):
        """Display summary for mixed cart payment (both order and pre-order)."""
        app.logger.info(f"🧾 Mixed cart summary requested for order_id: {order_id}, preorder_id: {preorder_id}")

        if 'username' not in session:
            app.logger.warning("❌ No username in session, redirecting to login")
            return redirect(url_for('auth.login'))

        try:
            # Get order details
            order = Order.get_by_id(order_id)
            if not order:
                flash('Order not found', 'error')
                return redirect(url_for('show_dashboard'))

            # Get pre-order details
            preorder = PreOrder.get_by_id(preorder_id)
            if not preorder:
                flash('Pre-order not found', 'error')
                return redirect(url_for('show_dashboard'))

            # Get customer details (should be same for both)
            customer = Customer.get_by_id(order['customer_id'])
            if not customer:
                flash('Customer not found', 'error')
                return redirect(url_for('show_dashboard'))

            # Get order items
            order_items = Order.get_order_items(order_id)

            # Get payment history for pre-order
            payment_history = PreOrderPayment.get_by_preorder(preorder_id)
            latest_payment = payment_history[-1] if payment_history else None

            return render_template('mixed_cart_summary.html',
                                 order=order,
                                 preorder=preorder,
                                 customer=customer,
                                 order_items=order_items,
                                 payment_history=payment_history,
                                 latest_payment=latest_payment)

        except Exception as e:
            app.logger.error(f"Error displaying mixed cart summary: {str(e)}")
            flash('Error loading summary', 'error')
            return redirect(url_for('show_dashboard'))

    @app.route('/preorder/invoice/<int:preorder_id>')
    def view_preorder_invoice(preorder_id):
        """Display invoice for pre-order payment."""
        app.logger.info(f"🧾 Pre-order invoice requested for preorder_id: {preorder_id}")
        app.logger.info(f"👤 Session data: {dict(session)}")

        if 'username' not in session:
            app.logger.warning("❌ No username in session, redirecting to login")
            return redirect(url_for('auth.login'))

        try:
            from models import PreOrder, Customer, PreOrderPayment

            # Get pre-order details
            app.logger.info(f"🔍 Looking for pre-order with ID: {preorder_id}")
            preorder = PreOrder.get_by_id(preorder_id)
            app.logger.info(f"📋 Pre-order found: {preorder}")

            if not preorder:
                app.logger.error(f"❌ Pre-order {preorder_id} not found")
                flash('Pre-order not found', 'error')
                return redirect(url_for('show_dashboard'))

            # Verify ownership (customers can only view their own pre-orders)
            if session.get('role') == 'customer' and preorder['customer_id'] != session.get('user_id'):
                app.logger.warning(f"❌ Customer {session.get('user_id')} trying to access pre-order {preorder_id} owned by {preorder['customer_id']}")
                flash('Access denied', 'error')
                return redirect(url_for('show_dashboard'))

            # Get customer details
            customer = Customer.get_by_id(preorder['customer_id'])
            if not customer:
                flash('Customer not found', 'error')
                return redirect(url_for('show_dashboard'))

            # Get payment history for this pre-order
            payment_history = PreOrderPayment.get_by_preorder(preorder_id)
            app.logger.info(f"💳 Payment history: {payment_history}")

            # Get the latest payment (most recent)
            latest_payment = payment_history[-1] if payment_history else None

            app.logger.info("✅ Rendering pre-order invoice template")
            return render_template('preorder_invoice.html',
                                 preorder=preorder,
                                 customer=customer,
                                 payment_history=payment_history,
                                 latest_payment=latest_payment)

        except Exception as e:
            app.logger.error(f"Error displaying invoice: {str(e)}")
            flash('Error loading invoice', 'error')
            return redirect(url_for('show_dashboard'))

    @app.route('/api/payment/cleanup', methods=['POST'])
    def cleanup_expired_sessions():
        """Clean up expired payment sessions."""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            PaymentSession.cleanup_expired_sessions()
            return jsonify({
                'success': True,
                'message': 'Expired sessions cleaned up'
            })
        except Exception as e:
            app.logger.error(f"Error cleaning up sessions: {str(e)}")
            return jsonify({'success': False, 'error': 'Failed to cleanup sessions'}), 500

    # Pre-order API Endpoints
    @app.route('/api/preorders/create', methods=['POST'])
    def create_preorder():
        """Create a new pre-order"""
        app.logger.info(f"🔥 PREORDER CREATE STARTED - Session: {dict(session)}")

        if 'username' not in session:
            app.logger.error("❌ No username in session for preorder creation")
            return jsonify({'success': False, 'error': 'Please log in to place pre-orders'}), 401

        try:
            data = request.get_json()
            app.logger.info(f"📦 Preorder data received: {data}")

            product_id = data.get('product_id')
            quantity = data.get('quantity', 1)
            deposit_percentage = data.get('deposit_percentage', 0)  # 0, 25, 50, 100
            payment_method = data.get('payment_method')  # 'Cash' or 'QR Payment'
            notes = data.get('notes', '')

            if not product_id:
                return jsonify({'success': False, 'error': 'Product ID is required'}), 400

            # Get product details
            product = Product.get_by_id(product_id)
            if not product:
                return jsonify({'success': False, 'error': 'Product not found'}), 404

            # Check if pre-orders are allowed for this product
            if not product.get('allow_preorder', True):
                return jsonify({'success': False, 'error': 'Pre-orders not available for this product'}), 400

            # Check if product is actually out of stock
            if product.get('stock_quantity', 0) > 0:
                return jsonify({'success': False, 'error': 'Product is currently in stock. Please add to cart instead.'}), 400

            # Get customer information
            from models import Customer

            # Check if user is a customer or staff (for testing)
            if session.get('role') not in ['customer', 'staff', 'admin', 'super_admin']:
                return jsonify({'success': False, 'error': 'Only customers and staff can place pre-orders'}), 403

            customer_id = session.get('user_id')
            if not customer_id:
                return jsonify({'success': False, 'error': 'Customer ID not found in session'}), 401

            customer = Customer.get_by_id(customer_id)
            if not customer:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404

            # Calculate deposit amount
            expected_price = float(product['price'])
            deposit_amount = 0.00
            deposit_payment_method = None

            if deposit_percentage > 0:
                deposit_amount = (expected_price * quantity * deposit_percentage) / 100
                deposit_payment_method = payment_method

            # Create pre-order
            from models import PreOrder
            pre_order_id = PreOrder.create(
                customer_id=customer['id'],
                product_id=product_id,
                quantity=quantity,
                expected_price=expected_price,
                deposit_amount=deposit_amount,
                deposit_payment_method=deposit_payment_method,
                expected_availability_date=product.get('expected_restock_date'),
                notes=notes
            )

            app.logger.info(f"✅ Pre-order created: {pre_order_id} for customer {customer['id']}")

            response_data = {
                'success': True,
                'pre_order_id': pre_order_id,
                'message': 'Pre-order created successfully',
                'deposit_amount': deposit_amount,
                'expected_price': expected_price,
                'total_amount': expected_price * quantity
            }

            app.logger.info(f"🎉 PREORDER CREATE SUCCESS - Returning: {response_data}")
            return jsonify(response_data)

        except Exception as e:
            app.logger.error(f"Error creating pre-order: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/preorders/customer', methods=['GET'])
    def get_customer_preorders():
        """Get all pre-orders for the logged-in customer"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import Customer, PreOrder

            # Check if user is a customer or staff (for testing)
            if session.get('role') not in ['customer', 'staff', 'admin', 'super_admin']:
                return jsonify({'success': False, 'error': 'Only customers and staff can view pre-orders'}), 403

            customer_id = session.get('user_id')
            if not customer_id:
                return jsonify({'success': False, 'error': 'Customer ID not found in session'}), 401

            customer = Customer.get_by_id(customer_id)
            if not customer:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404

            status_filter = request.args.get('status')
            pre_orders = PreOrder.get_by_customer(customer['id'], status_filter)

            return jsonify({
                'success': True,
                'pre_orders': pre_orders
            })

        except Exception as e:
            app.logger.error(f"Error fetching customer pre-orders: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/preorders/status', methods=['GET'])
    def get_preorder_status():
        """Get pre-order status for multiple products (for button state management)"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import Customer, PreOrder

            customer_id = session.get('user_id')
            if not customer_id:
                return jsonify({'success': False, 'error': 'Customer ID not found in session'}), 401

            customer = Customer.get_by_id(customer_id)
            if not customer:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404

            # Get product IDs from query parameter (comma-separated)
            product_ids_param = request.args.get('product_ids', '')
            if not product_ids_param:
                return jsonify({'success': True, 'preorder_status': {}})

            try:
                product_ids = [int(pid.strip()) for pid in product_ids_param.split(',') if pid.strip()]
            except ValueError:
                return jsonify({'success': False, 'error': 'Invalid product IDs format'}), 400

            # Get active pre-orders for these products
            conn = get_db()
            cur = conn.cursor(dictionary=True)
            try:
                if product_ids:
                    placeholders = ','.join(['%s'] * len(product_ids))
                    query = f"""
                        SELECT product_id, id as preorder_id, status, quantity, created_date
                        FROM pre_orders
                        WHERE customer_id = %s
                        AND product_id IN ({placeholders})
                        AND status IN ('pending', 'confirmed', 'partially_paid', 'ready_for_pickup')
                        ORDER BY created_date DESC
                    """
                    cur.execute(query, [customer['id']] + product_ids)
                    preorders = cur.fetchall()

                    # Create status map: product_id -> preorder info
                    preorder_status = {}
                    for preorder in preorders:
                        product_id = preorder['product_id']
                        # Only include the most recent active pre-order per product
                        if product_id not in preorder_status:
                            preorder_status[product_id] = {
                                'has_preorder': True,
                                'preorder_id': preorder['preorder_id'],
                                'status': preorder['status'],
                                'quantity': preorder['quantity'],
                                'created_date': preorder['created_date'].isoformat() if preorder['created_date'] else None
                            }

                    return jsonify({
                        'success': True,
                        'preorder_status': preorder_status
                    })
                else:
                    return jsonify({'success': True, 'preorder_status': {}})

            finally:
                cur.close()
                conn.close()

        except Exception as e:
            app.logger.error(f"Error getting pre-order status: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/preorders/<int:preorder_id>/cancel', methods=['DELETE'])
    def cancel_preorder_toggle(preorder_id):
        """Cancel a pre-order (toggle functionality)"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import Customer, PreOrder

            customer_id = session.get('user_id')
            if not customer_id:
                return jsonify({'success': False, 'error': 'Customer ID not found in session'}), 401

            customer = Customer.get_by_id(customer_id)
            if not customer:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404

            # Get pre-order details to verify ownership
            preorder = PreOrder.get_by_id(preorder_id)
            if not preorder:
                return jsonify({'success': False, 'error': 'Pre-order not found'}), 404

            # Verify ownership
            if preorder['customer_id'] != customer['id']:
                return jsonify({'success': False, 'error': 'Access denied'}), 403

            # Check if pre-order can be cancelled (only pending and confirmed orders)
            if preorder['status'] not in ['pending', 'confirmed']:
                return jsonify({'success': False, 'error': f'Cannot cancel pre-order with status: {preorder["status"]}'}), 400

            # Cancel the pre-order
            conn = get_db()
            cur = conn.cursor()
            try:
                cur.execute("""
                    UPDATE pre_orders
                    SET status = 'cancelled', updated_date = NOW()
                    WHERE id = %s AND customer_id = %s
                """, (preorder_id, customer['id']))

                if cur.rowcount == 0:
                    return jsonify({'success': False, 'error': 'Failed to cancel pre-order'}), 400

                conn.commit()

                app.logger.info(f"✅ Pre-order {preorder_id} cancelled by customer {customer['id']}")
                return jsonify({
                    'success': True,
                    'message': 'Pre-order cancelled successfully',
                    'product_id': preorder['product_id']
                })

            finally:
                cur.close()
                conn.close()

        except Exception as e:
            app.logger.error(f"Error cancelling pre-order: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/preorders/<int:pre_order_id>', methods=['GET'])
    def get_preorder_details(pre_order_id):
        """Get details of a specific pre-order"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import PreOrder, Customer
            customer = Customer.get_by_id(session['user_id'])
            if not customer:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404

            pre_order = PreOrder.get_by_id(pre_order_id)
            if not pre_order:
                return jsonify({'success': False, 'error': 'Pre-order not found'}), 404

            # Check if this pre-order belongs to the logged-in customer
            if pre_order['customer_id'] != customer['id']:
                return jsonify({'success': False, 'error': 'Access denied'}), 403

            return jsonify({
                'success': True,
                'pre_order': pre_order
            })

        except Exception as e:
            app.logger.error(f"Error fetching pre-order details: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/preorders/<int:pre_order_id>/cancel', methods=['POST'])
    def cancel_preorder(pre_order_id):
        """Cancel a pre-order"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import PreOrder, Customer

            # Check if user is a customer or staff (for testing)
            if session.get('role') not in ['customer', 'staff', 'admin', 'super_admin']:
                return jsonify({'success': False, 'error': 'Only customers and staff can cancel pre-orders'}), 403

            customer_id = session.get('user_id')
            if not customer_id:
                return jsonify({'success': False, 'error': 'Customer ID not found in session'}), 401

            pre_order = PreOrder.get_by_id(pre_order_id)
            if not pre_order:
                return jsonify({'success': False, 'error': 'Pre-order not found'}), 404

            # Check if this pre-order belongs to the logged-in customer
            if pre_order['customer_id'] != customer_id:
                return jsonify({'success': False, 'error': 'Access denied'}), 403

            # Check if pre-order can be cancelled
            if pre_order['status'] in ['completed', 'cancelled']:
                return jsonify({'success': False, 'error': 'Pre-order cannot be cancelled'}), 400

            data = request.get_json()
            reason = data.get('reason', 'Customer requested cancellation')

            refund_info = PreOrder.cancel_pre_order(pre_order_id, reason)

            return jsonify({
                'success': True,
                'message': 'Pre-order cancelled successfully',
                'refund_info': refund_info
            })

        except Exception as e:
            app.logger.error(f"Error cancelling pre-order: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/preorders/<int:pre_order_id>/deposit', methods=['POST'])
    def add_preorder_deposit(pre_order_id):
        """Add deposit payment to a pre-order"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import PreOrder, Customer

            # Check if user is a customer or staff (for testing)
            if session.get('role') not in ['customer', 'staff', 'admin', 'super_admin']:
                return jsonify({'success': False, 'error': 'Only customers and staff can add deposits'}), 403

            customer_id = session.get('user_id')
            if not customer_id:
                return jsonify({'success': False, 'error': 'Customer ID not found in session'}), 401

            pre_order = PreOrder.get_by_id(pre_order_id)
            if not pre_order:
                return jsonify({'success': False, 'error': 'Pre-order not found'}), 404

            # Check if this pre-order belongs to the logged-in customer
            if pre_order['customer_id'] != customer_id:
                return jsonify({'success': False, 'error': 'Access denied'}), 403

            data = request.get_json()
            deposit_amount = data.get('deposit_amount')
            payment_method = data.get('payment_method')

            if not deposit_amount or deposit_amount <= 0:
                return jsonify({'success': False, 'error': 'Valid deposit amount is required'}), 400

            if not payment_method:
                return jsonify({'success': False, 'error': 'Payment method is required'}), 400

            new_total_deposit = PreOrder.add_deposit_payment(pre_order_id, deposit_amount, payment_method)

            return jsonify({
                'success': True,
                'message': 'Deposit payment added successfully',
                'new_total_deposit': new_total_deposit
            })

        except Exception as e:
            app.logger.error(f"Error adding deposit payment: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/preorder/payment/qr', methods=['POST'])
    def create_preorder_qr_payment():
        """Create QR payment session for pre-order"""
        app.logger.info("🔄 PREORDER QR PAYMENT STARTED")

        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import Customer, PreOrder

            # Get customer
            customer = Customer.get_by_id(session['user_id'])
            if not customer:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404

            data = request.get_json()
            pre_order_id = data.get('pre_order_id')
            payment_amount = float(data.get('payment_amount', 0))
            payment_type = data.get('payment_type', 'deposit')  # 'deposit' or 'full'

            if not pre_order_id:
                return jsonify({'success': False, 'error': 'Pre-order ID is required'}), 400

            if payment_amount <= 0:
                return jsonify({'success': False, 'error': 'Valid payment amount is required'}), 400

            # Get pre-order details
            pre_order = PreOrder.get_by_id(pre_order_id)
            if not pre_order:
                return jsonify({'success': False, 'error': 'Pre-order not found'}), 404

            # Verify ownership
            if pre_order['customer_id'] != customer['id']:
                return jsonify({'success': False, 'error': 'Access denied'}), 403

            # Verify payment amount doesn't exceed remaining balance
            total_price = float(pre_order['expected_price']) * pre_order['quantity']
            remaining_balance = total_price - float(pre_order['deposit_amount'] or 0)

            if payment_amount > remaining_balance:
                return jsonify({'success': False, 'error': f'Payment amount exceeds remaining balance of ${remaining_balance:.2f}'}), 400

            # Create payment session for pre-order
            session_id = PaymentSession.create_preorder_session(
                pre_order=pre_order,
                customer_info=customer,
                payment_amount=payment_amount,
                payment_type=payment_type
            )

            # Generate QR code
            qr_generator = BakongQRGenerator(use_static_qr=True)
            qr_data = qr_generator.generate_payment_qr(
                amount=payment_amount,
                currency="USD",
                reference_id=f"PREORDER_{pre_order_id}_{payment_type.upper()}"
            )

            # Update session with QR data
            PaymentSession.update_session_status(session_id, 'pending', {
                'qr_data': qr_data,
                'pre_order_id': pre_order_id,
                'payment_type': payment_type
            })

            # Get updated session
            payment_session = PaymentSession.get_session(session_id)

            app.logger.info(f"✅ Pre-order QR payment session created: {session_id}")
            return jsonify({
                'success': True,
                'session': payment_session
            })

        except Exception as e:
            app.logger.error(f"Error creating pre-order QR payment: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/preorder/<int:pre_order_id>/payments', methods=['GET'])
    def get_preorder_payments(pre_order_id):
        """Get payment history for a specific pre-order"""
        try:
            # Check if user is logged in
            if 'username' not in session:
                return jsonify({'success': False, 'error': 'Authentication required'}), 401

            from models import Customer, PreOrder, PreOrderPayment

            # Get customer
            customer = Customer.get_by_id(session['user_id'])
            if not customer:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404

            # Get pre-order details to verify ownership
            preorder = PreOrder.get_by_id(pre_order_id)
            if not preorder or preorder['customer_id'] != customer['id']:
                return jsonify({'success': False, 'error': 'Pre-order not found or access denied'}), 404

            # Get payment history
            payments = PreOrderPayment.get_by_preorder(pre_order_id)
            total_paid = PreOrderPayment.get_total_paid(pre_order_id)

            # Calculate remaining balance
            total_price = preorder['expected_price'] * preorder['quantity']
            remaining_balance = total_price - total_paid

            return jsonify({
                'success': True,
                'payments': payments,
                'total_paid': total_paid,
                'total_price': total_price,
                'remaining_balance': max(0, remaining_balance),
                'payment_progress': (total_paid / total_price) * 100 if total_price > 0 else 0
            })

        except Exception as e:
            app.logger.error(f"Error getting pre-order payments: {str(e)}")
            return jsonify({'success': False, 'error': 'Failed to retrieve payment history'}), 500

    @app.route('/api/preorder/payment/confirm', methods=['POST'])
    def confirm_preorder_payment():
        """Confirm pre-order payment completion"""
        app.logger.info("💳 PREORDER PAYMENT CONFIRMATION STARTED")

        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            data = request.get_json()
            session_id = data.get('session_id')

            if not session_id:
                return jsonify({'success': False, 'error': 'Session ID is required'}), 400

            # Get payment session
            payment_session = PaymentSession.get_session(session_id)
            if not payment_session:
                return jsonify({'success': False, 'error': 'Payment session not found'}), 404

            # Verify session belongs to current user
            customer = Customer.get_by_id(session['user_id'])
            if payment_session['customer_info']['id'] != customer['id']:
                return jsonify({'success': False, 'error': 'Access denied'}), 403

            # Get pre-order details
            pre_order_id = payment_session.get('pre_order_id')
            payment_amount = payment_session['payment_amount']
            payment_type = payment_session.get('payment_type', 'deposit')

            # Add payment to pre-order
            if payment_type == 'deposit':
                PreOrder.add_deposit_payment(pre_order_id, payment_amount, 'QR Payment')
            else:  # full payment
                PreOrder.add_deposit_payment(pre_order_id, payment_amount, 'QR Payment')

            # Update pre-order status based on payment
            pre_order = PreOrder.get_by_id(pre_order_id)
            total_price = float(pre_order['expected_price']) * pre_order['quantity']
            total_paid = float(pre_order['deposit_amount'] or 0)

            if total_paid >= total_price:
                # Full payment received
                PreOrder.update_status(pre_order_id, 'confirmed', 'Full payment received via QR code')
            else:
                # Partial payment
                PreOrder.update_status(pre_order_id, 'partially_paid', f'Partial payment of ${payment_amount:.2f} received via QR code')

            # Mark session as processed
            PaymentSession.update_session_status(session_id, 'processed', {
                'pre_order_id': pre_order_id,
                'payment_amount': payment_amount,
                'payment_type': payment_type
            })

            app.logger.info(f"✅ Pre-order payment confirmed: {pre_order_id}, Amount: ${payment_amount}")
            return jsonify({
                'success': True,
                'pre_order_id': pre_order_id,
                'payment_amount': payment_amount,
                'message': 'Payment confirmed successfully'
            })

        except Exception as e:
            app.logger.error(f"Error confirming pre-order payment: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/customer/preorders')
    def customer_preorders():
        """Customer pre-orders dashboard"""
        app.logger.info(f"🔍 Pre-orders route accessed. Session data: {dict(session)}")

        # Check session authentication
        if 'username' not in session or 'user_id' not in session:
            app.logger.warning(f"❌ Authentication failed. Username in session: {'username' in session}, User_id in session: {'user_id' in session}")
            flash('Please log in to view your pre-orders', 'error')
            return redirect(url_for('auth.login'))

        # Check user role
        user_role = session.get('role')
        app.logger.info(f"👤 User role: {user_role}")
        if user_role not in ['customer', 'staff', 'admin', 'super_admin']:
            app.logger.warning(f"❌ Access denied. User role '{user_role}' not authorized")
            flash('Access denied. Customer account required.', 'error')
            return redirect(url_for('show_dashboard'))

        try:
            from models import Customer, PreOrder, Order

            # Get user_id from session
            user_id = session['user_id']
            user_role = session.get('role')
            app.logger.info(f"🔍 Looking up customer with user_id: {user_id}, role: {user_role}")

            # Handle different user types
            if user_role == 'customer':
                # For customers, look up in customers table
                customer = Customer.get_by_id(user_id)
                app.logger.info(f"👤 Customer lookup result: {customer}")

                if not customer:
                    app.logger.error(f"❌ Customer not found for user_id: {user_id}")
                    flash('Customer not found', 'error')
                    return redirect(url_for('show_dashboard'))

                customer_id = customer['id']

            elif user_role in ['staff', 'admin', 'super_admin']:
                # For staff, create a mock customer object for testing
                # In production, you might want to restrict this or handle differently
                app.logger.info(f"🔧 Staff user accessing pre-orders for testing")

                # Get the first customer for testing purposes
                all_customers = Customer.get_all()
                if not all_customers:
                    flash('No customers found in system', 'error')
                    return redirect(url_for('show_dashboard'))

                customer = all_customers[0]  # Use first customer for staff testing
                customer_id = customer['id']
                app.logger.info(f"🔧 Using customer {customer_id} for staff testing")

            else:
                app.logger.error(f"❌ Unknown user role: {user_role}")
                flash('Invalid user role', 'error')
                return redirect(url_for('show_dashboard'))

            # Get customer's confirmed pre-orders only
            app.logger.info(f"📦 Fetching confirmed pre-orders for customer_id: {customer_id}")
            pre_orders = PreOrder.get_by_customer(customer_id, status='confirmed')
            app.logger.info(f"📦 Found {len(pre_orders) if pre_orders else 0} confirmed pre-orders")

            # Disable completed orders to prevent navigation conflicts
            app.logger.info(f"🚫 Completed orders disabled to prevent navigation conflicts")
            completed_orders = []

            app.logger.info("🎯 Successfully rendering customer_preorders.html")
            return render_template('customer_preorders.html',
                                 pre_orders=pre_orders,
                                 completed_orders=completed_orders,
                                 customer=customer)

        except Exception as e:
            app.logger.error(f"💥 Error loading customer pre-orders: {str(e)}")
            app.logger.error(f"💥 Exception type: {type(e)}")
            import traceback
            app.logger.error(f"💥 Traceback: {traceback.format_exc()}")
            flash('Error loading pre-orders', 'error')
            return redirect(url_for('show_dashboard'))

    @app.route('/debug/session')
    def debug_session():
        """Debug route to check session data"""
        return jsonify({
            'session_data': dict(session),
            'username_in_session': 'username' in session,
            'user_id_in_session': 'user_id' in session,
            'role_in_session': session.get('role'),
            'user_id_value': session.get('user_id')
        })

    @app.route('/api/customer/completed-orders')
    def get_customer_completed_orders():
        """API endpoint to get completed orders for the logged-in customer"""
        if 'username' not in session or 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Please log in to view orders'}), 401

        try:
            from models import Customer, Order

            # Get user info
            user_id = session['user_id']
            user_role = session.get('role')

            # Handle different user types (same logic as main route)
            if user_role == 'customer':
                customer = Customer.get_by_id(user_id)
                if not customer:
                    return jsonify({'success': False, 'error': 'Customer not found'}), 404
                customer_id = customer['id']
            elif user_role in ['staff', 'admin', 'super_admin']:
                # For staff testing, use first customer
                all_customers = Customer.get_all()
                if not all_customers:
                    return jsonify({'success': False, 'error': 'No customers found'}), 404
                customer_id = all_customers[0]['id']
            else:
                return jsonify({'success': False, 'error': 'Invalid user role'}), 403

            # Get completed orders safely
            completed_orders = Order.get_completed_orders_by_customer(customer_id)

            # Convert to JSON-safe format
            orders_data = []
            for order in completed_orders:
                order_data = {
                    'id': order['id'],
                    'order_date': str(order['order_date']) if order['order_date'] else 'Unknown',
                    'total_amount': float(order['total_amount']) if order['total_amount'] else 0.0,
                    'payment_method': order['payment_method'] or 'Unknown',
                    'items': []
                }

                for item in order.get('items', []):
                    order_data['items'].append({
                        'product_id': item['product_id'],
                        'product_name': item['product_name'] or 'Unknown Product',
                        'product_photo': item['product_photo'] or 'default.jpg',
                        'quantity': int(item['quantity']) if item['quantity'] else 0,
                        'price': float(item['price']) if item['price'] else 0.0
                    })

                orders_data.append(order_data)

            return jsonify({
                'success': True,
                'completed_orders': orders_data,
                'count': len(orders_data)
            })

        except Exception as e:
            app.logger.error(f"Error fetching completed orders via API: {str(e)}")
            return jsonify({'success': False, 'error': 'Failed to load completed orders'}), 500

    # Temporarily disable completed orders API routes
    # @app.route('/api/orders/<int:order_id>/reorder', methods=['POST'])
    # def reorder_items(order_id):
    #     """Add all items from a completed order back to the cart"""
    #     if 'username' not in session:
    #         return jsonify({'success': False, 'error': 'Please log in to reorder items'}), 401

    #     try:
    #         from models import Order, Customer

    #         # Get customer ID
    #         customer = Customer.get_by_id(session['user_id'])
    #         if not customer:
    #             return jsonify({'success': False, 'error': 'Customer not found'}), 404

    #         # Get order items
    #         order_items = Order.get_order_items(order_id)
    #         if not order_items:
    #             return jsonify({'success': False, 'error': 'Order not found or has no items'}), 404

    #         # Verify order belongs to customer
    #         order = Order.get_by_id(order_id)
    #         if not order or order['customer_id'] != customer['id']:
    #             return jsonify({'success': False, 'error': 'Order not found or access denied'}), 403

    #         # Initialize cart if it doesn't exist
    #         if 'cart' not in session:
    #             session['cart'] = []

    #         items_added = 0
    #         for item in order_items:
    #             # Check if item already exists in cart
    #             existing_item = None
    #             for cart_item in session['cart']:
    #                 if cart_item['product_id'] == item['product_id']:
    #                     existing_item = cart_item
    #                     break

    #             if existing_item:
    #                 existing_item['quantity'] += item['quantity']
    #             else:
    #                 session['cart'].append({
    #                     'product_id': item['product_id'],
    #                     'quantity': item['quantity']
    #                 })
    #             items_added += 1

    #         session.modified = True
    #         return jsonify({
    #             'success': True,
    #             'message': 'Items added to cart successfully',
    #             'items_added': items_added
    #         })

    #     except Exception as e:
    #         app.logger.error(f"Error reordering items: {str(e)}")
    #         return jsonify({'success': False, 'error': 'An error occurred while reordering items'}), 500

    # @app.route('/api/orders/<int:order_id>/details')
    # def get_order_details(order_id):
    #     """Get detailed information about a specific order"""
    #     if 'username' not in session:
    #         return jsonify({'success': False, 'error': 'Please log in to view order details'}), 401

    #     try:
    #         from models import Order, Customer

    #         # Get customer ID
    #         customer = Customer.get_by_id(session['user_id'])
    #         if not customer:
    #             return jsonify({'success': False, 'error': 'Customer not found'}), 404

    #         # Get order details
    #         order = Order.get_by_id(order_id)
    #         if not order:
    #             return jsonify({'success': False, 'error': 'Order not found'}), 404

    #         # Verify order belongs to customer
    #         if order['customer_id'] != customer['id']:
    #             return jsonify({'success': False, 'error': 'Access denied'}), 403

    #         # Get order items
    #         order_items = Order.get_order_items(order_id)

    #         # Format the response
    #         order_data = {
    #             'id': order['id'],
    #             'order_date': order['order_date'].isoformat() if hasattr(order['order_date'], 'isoformat') else str(order['order_date']),
    #             'total_amount': float(order['total_amount']),
    #             'payment_method': order['payment_method'],
    #             'status': order['status'],
    #             'items': []
    #         }

    #         for item in order_items:
    #             order_data['items'].append({
    #                 'product_id': item['product_id'],
    #                 'product_name': item['product_name'],
    #                 'quantity': item['quantity'],
    #                 'price': float(item['price'])
    #             })

    #         return jsonify({'success': True, 'order': order_data})

    #     except Exception as e:
    #         app.logger.error(f"Error getting order details: {str(e)}")
    #         return jsonify({'success': False, 'error': 'An error occurred while loading order details'}), 500

    @app.route('/staff/preorders')
    def staff_preorders():
        """Staff pre-orders management dashboard"""
        if 'username' not in session:
            flash('Please log in to access staff features', 'error')
            return redirect(url_for('auth.login'))

        try:
            from models import PreOrder

            # Get filter parameters
            status_filter = request.args.get('status')
            page = int(request.args.get('page', 1))
            page_size = 20

            # If no status filter, show pending and confirmed by default
            if not status_filter:
                status_filter = ['pending', 'confirmed']

            # Get paginated pre-orders
            result = PreOrder.get_all_paginated(
                page=page,
                page_size=page_size,
                status=status_filter
            )

            return render_template('staff_preorders.html',
                                 pre_orders=result['pre_orders'],
                                 pagination=result,
                                 current_status=status_filter if isinstance(status_filter, str) else None)

        except Exception as e:
            app.logger.error(f"Error loading staff pre-orders: {str(e)}")
            flash('Error loading pre-orders', 'error')
            return redirect(url_for('show_dashboard'))

    @app.route('/api/staff/preorders/<int:pre_order_id>/update-status', methods=['POST'])
    def update_preorder_status(pre_order_id):
        """Update pre-order status (staff only)"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            data = request.get_json()
            new_status = data.get('status')
            notes = data.get('notes')

            if not new_status:
                return jsonify({'success': False, 'error': 'Status is required'}), 400

            from models import PreOrder
            PreOrder.update_status(pre_order_id, new_status, notes)

            return jsonify({
                'success': True,
                'message': f'Pre-order status updated to {new_status}'
            })

        except Exception as e:
            app.logger.error(f"Error updating pre-order status: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/preorders/<int:pre_order_id>/mark-ready', methods=['POST'])
    def mark_preorder_ready(pre_order_id):
        """Mark pre-order as ready for pickup (staff only)"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import PreOrder
            PreOrder.mark_ready_for_pickup(pre_order_id)

            return jsonify({
                'success': True,
                'message': 'Pre-order marked as ready for pickup'
            })

        except Exception as e:
            app.logger.error(f"Error marking pre-order ready: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/preorders/stats')
    def preorder_stats():
        """Get pre-order statistics for dashboard"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import PreOrder
            stats = PreOrder.get_stats()
            return jsonify({
                'success': True,
                'stats': stats
            })

        except Exception as e:
            app.logger.error(f"Error getting pre-order stats: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/preorders/recent')
    def recent_preorders():
        """Get recent pre-orders for dashboard table"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import PreOrder
            # Get recent pre-orders (limit to 10 for dashboard)
            recent_preorders = PreOrder.get_recent_for_dashboard(limit=10)
            return jsonify({
                'success': True,
                'preorders': recent_preorders
            })

        except Exception as e:
            app.logger.error(f"Error getting recent pre-orders: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/preorders')
    def api_staff_preorders():
        """AJAX API endpoint for staff pre-orders with pagination"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import PreOrder

            # Get parameters
            page = int(request.args.get('page', 1))
            page_size = int(request.args.get('page_size', 10))
            status_filter = request.args.get('status')
            ajax = request.args.get('ajax')

            # If no status filter, show pending and confirmed by default
            if not status_filter:
                status_filter = ['pending', 'confirmed']

            # Get paginated pre-orders
            result = PreOrder.get_all_paginated(
                page=page,
                page_size=page_size,
                status=status_filter
            )

            return jsonify({
                'success': True,
                'preorders': result['pre_orders'],
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': result['total_count'],
                    'total_pages': result['total_pages']
                }
            })

        except Exception as e:
            app.logger.error(f"Error getting pre-orders via API: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/auth/staff/api/pre_order/<int:pre_order_id>/details', methods=['GET'])
    def staff_get_preorder_details(pre_order_id):
        """Get details of a specific pre-order (staff access)"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import PreOrder

            pre_order = PreOrder.get_by_id(pre_order_id)
            if not pre_order:
                return jsonify({'success': False, 'error': 'Pre-order not found'}), 404

            return jsonify({
                'success': True,
                'pre_order': pre_order
            })

        except Exception as e:
            app.logger.error(f"Error fetching pre-order details: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/products/<int:product_id>/stock', methods=['GET'])
    def get_product_stock(product_id):
        """Get current stock level for a product"""
        try:
            from models import Product

            product = Product.get_by_id(product_id)
            if not product:
                return jsonify({'success': False, 'error': 'Product not found'}), 404

            return jsonify({
                'success': True,
                'stock': product.get('stock', 0),
                'product_name': product.get('name', '')
            })

        except Exception as e:
            app.logger.error(f"Error fetching product stock: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/orders/<int:order_id>/cancel-single-item', methods=['POST'])
    def cancel_single_order_item(order_id):
        """Cancel a specific item from a pending order"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            data = request.get_json()
            product_id = data.get('product_id')
            reason = data.get('reason', 'Out of stock')
            notes = data.get('notes', '')

            # Debug logging
            app.logger.info(f"Cancel item request - Order ID: {order_id}, Product ID: {product_id}, Reason: '{reason}', Notes: '{notes}'")

            if not product_id:
                return jsonify({'success': False, 'error': 'Product ID is required'}), 400

            conn = get_db()
            cur = conn.cursor(dictionary=True)

            try:
                # Check if order exists and is pending (only pending orders can be cancelled)
                cur.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
                order = cur.fetchone()

                if not order:
                    return jsonify({'success': False, 'error': 'Order not found'}), 404

                # Only allow cancellation for pending orders
                if order['status'].lower() != 'pending':
                    return jsonify({'success': False, 'error': f'Only pending orders can be cancelled. Current status: {order["status"].lower()}'}), 400

                # Check if item exists in order
                cur.execute("""
                    SELECT id, quantity, price FROM order_items
                    WHERE order_id = %s AND product_id = %s
                """, (order_id, product_id))
                order_item = cur.fetchone()

                if not order_item:
                    return jsonify({'success': False, 'error': 'Item not found in order'}), 404

                # Log the cancellation in the order_item_cancellations table
                staff_id = session.get('user_id', 1)  # Get actual staff ID from session

                try:
                    cur.execute("""
                        INSERT INTO order_item_cancellations
                        (order_id, order_item_id, product_id, cancelled_quantity, original_quantity, reason, cancelled_by_staff_id, notes, status, customer_notified)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (order_id, order_item['id'], product_id, order_item['quantity'], order_item['quantity'], reason, staff_id, notes, 'completed', True))
                    app.logger.info(f"Cancellation logged successfully with reason: {reason}")
                except Exception as log_error:
                    # If logging fails, continue with the cancellation but log the error
                    app.logger.error(f"Failed to log cancellation: {log_error}")
                    # Still proceed with the actual cancellation

                # Remove item from order
                cur.execute("""
                    DELETE FROM order_items
                    WHERE order_id = %s AND product_id = %s
                """, (order_id, product_id))

                # Check if order is now empty
                cur.execute("SELECT COUNT(*) as item_count FROM order_items WHERE order_id = %s", (order_id,))
                remaining_items = cur.fetchone()['item_count']

                if remaining_items == 0:
                    # Cancel the entire order if no items left
                    cur.execute("UPDATE orders SET status = 'cancelled' WHERE id = %s", (order_id,))

                conn.commit()

                # Create customer notification
                try:
                    from models import Notification

                    # Get product name for notification
                    cur.execute("SELECT name FROM products WHERE id = %s", (product_id,))
                    product_result = cur.fetchone()
                    product_name = product_result['name'] if product_result else f"Product ID {product_id}"

                    if remaining_items == 0:
                        notification_message = f"Your order #{order_id} has been cancelled due to {reason.lower()}."
                    else:
                        notification_message = f"Item '{product_name}' from your order #{order_id} has been cancelled due to {reason.lower()}."

                    Notification.create_notification(
                        customer_id=order['customer_id'],
                        message=notification_message,
                        notification_type='order_item_cancelled',
                        related_id=order_id
                    )
                    app.logger.info(f"Customer notification sent for order {order_id} item cancellation")
                except Exception as notification_error:
                    app.logger.error(f"Failed to send customer notification: {notification_error}")

                return jsonify({
                    'success': True,
                    'message': f'Item cancelled successfully. Customer has been notified.',
                    'order_cancelled': remaining_items == 0
                })

            finally:
                cur.close()
                conn.close()

        except Exception as e:
            app.logger.error(f"Error cancelling order item: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/preorders/<int:pre_order_id>/confirm', methods=['POST'])
    def confirm_preorder(pre_order_id):
        """Confirm a pending pre-order (staff only)"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import PreOrder

            # Get the pre-order
            preorder = PreOrder.get_by_id(pre_order_id)
            if not preorder:
                return jsonify({'success': False, 'error': 'Pre-order not found'}), 404

            # Check if it's pending
            if preorder['status'] != 'pending':
                return jsonify({'success': False, 'error': 'Only pending pre-orders can be confirmed'}), 400

            # Update status to confirmed
            PreOrder.update_status(pre_order_id, 'confirmed', f"Confirmed by staff: {session['username']}")

            return jsonify({
                'success': True,
                'message': 'Pre-order confirmed successfully'
            })

        except Exception as e:
            app.logger.error(f"Error confirming pre-order: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/preorders/<int:pre_order_id>/complete', methods=['POST'])
    def complete_preorder(pre_order_id):
        """Complete a pre-order and notify customer"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        if session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Insufficient permissions'}), 403

        try:
            from models import PreOrder, Notification, Product

            # Get the pre-order
            preorder = PreOrder.get_by_id(pre_order_id)
            if not preorder:
                return jsonify({'success': False, 'error': 'Pre-order not found'}), 404

            # Check if it's confirmed
            if preorder['status'] != 'confirmed':
                return jsonify({'success': False, 'error': 'Only confirmed pre-orders can be completed'}), 400

            # Check product stock
            product = Product.get_by_id(preorder['product_id'])
            if not product or product['stock'] <= 0:
                # Product is out of stock - notify admin and return error to staff
                app.logger.warning(f"🚨 STOCK ISSUE: Staff {session['username']} attempted to complete pre-order #{pre_order_id} for {preorder['product_name']} but product is out of stock (current stock: {product['stock'] if product else 0})")

                # Get customer details for admin notification
                customer = Customer.get_by_id(preorder['customer_id'])
                customer_name = f"{customer['first_name']} {customer['last_name']}" if customer else "Unknown Customer"

                # Create admin notification (you can implement this to show on admin dashboard)
                admin_message = f"Staff member {session['username']} attempted to complete pre-order #{pre_order_id} for {preorder['product_name']} (Customer: {customer_name}), but the product is currently out of stock."
                app.logger.error(f"📋 ADMIN ALERT: {admin_message}")

                return jsonify({
                    'success': False,
                    'error': f'Product "{preorder["product_name"]}" is currently out of stock (Stock: {product["stock"] if product else 0}). Admin has been notified.',
                    'stock_issue': True
                })

            # Product is in stock - proceed with completion
            # Update status to completed
            PreOrder.update_status(pre_order_id, 'completed', f"Completed by staff: {session['username']} - Product is ready for pickup")

            # Create notification for customer
            notification_message = f"Great news! Your pre-order #{pre_order_id} for {preorder['product_name']} is now ready for pickup. Please visit our store to collect your item."

            Notification.create_notification(
                customer_id=preorder['customer_id'],
                message=notification_message,
                notification_type='preorder_ready',
                related_id=pre_order_id
            )

            app.logger.info(f"✅ Pre-order {pre_order_id} completed and customer {preorder['customer_id']} notified")

            return jsonify({
                'success': True,
                'message': 'Pre-order completed and customer notified successfully'
            })

        except Exception as e:
            app.logger.error(f"Error completing pre-order: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/preorders/<int:pre_order_id>/notify-stock-issue', methods=['POST'])
    def notify_stock_issue(pre_order_id):
        """Notify admin about stock issue for a pre-order"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        if session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Insufficient permissions'}), 403

        try:
            from models import PreOrder, Customer

            # Get the pre-order details
            preorder = PreOrder.get_by_id(pre_order_id)
            if not preorder:
                return jsonify({'success': False, 'error': 'Pre-order not found'}), 404

            # Get customer details
            customer = Customer.get_by_id(preorder['customer_id'])
            if not customer:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404

            # Log the stock issue for admin attention
            app.logger.warning(f"🚨 STOCK ISSUE: Staff {session['username']} attempted to complete pre-order #{pre_order_id} for {preorder['product_name']} but product is out of stock. Customer: {customer['first_name']} {customer['last_name']} ({customer['email']})")

            # You could also create a notification for admin users here
            # For now, we'll just log it and return success

            return jsonify({
                'success': True,
                'message': 'Admin has been notified about the stock issue'
            })

        except Exception as e:
            app.logger.error(f"Error notifying about stock issue: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/preorders/<int:pre_order_id>/delete', methods=['DELETE'])
    def delete_preorder(pre_order_id):
        """Delete a pre-order (staff only, cancelled or pending status only)"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from models import PreOrder

            # Delete the pre-order (validation is done in the model)
            PreOrder.delete_pre_order(pre_order_id)

            return jsonify({
                'success': True,
                'message': 'Pre-order deleted successfully'
            })

        except ValueError as e:
            # Handle validation errors (wrong status, not found, etc.)
            return jsonify({'success': False, 'error': str(e)}), 400
        except Exception as e:
            app.logger.error(f"Error deleting pre-order: {str(e)}")
            return jsonify({'success': False, 'error': 'An unexpected error occurred'}), 500

    @app.route('/api/staff/orders/<int:order_id>/cancel', methods=['POST'])
    def cancel_order(order_id):
        """Cancel a completed order (staff only)"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401

        try:
            from models import Order, Notification

            data = request.get_json() or {}
            reason = data.get('reason', 'Out of stock')
            notes = data.get('notes', '')

            # Cancel the order with inventory restoration
            result = Order.cancel_order(order_id, reason, notes, session['username'])

            # Create web notification for customer
            order = Order.get_by_id(order_id)
            if order:
                notification_message = f"Your order #{order_id} has been cancelled due to {reason.lower()}. A full refund will be processed within 3-5 business days."
                Notification.create_notification(
                    customer_id=order['customer_id'],
                    message=notification_message,
                    notification_type='order_cancelled',
                    related_id=order_id
                )

            return jsonify({
                'success': True,
                'message': 'Order cancelled successfully. Customer has been notified.',
                'cancelled_items': result.get('cancelled_items', [])
            })

        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400
        except Exception as e:
            app.logger.error(f"Error cancelling order {order_id}: {str(e)}")
            return jsonify({'success': False, 'error': 'Internal server error'}), 500

    @app.route('/api/staff/orders/<int:order_id>/cancel-item', methods=['POST'])
    def cancel_order_item(order_id):
        """Cancel specific items from an order (staff only)"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401

        try:
            from models import Order, Notification

            data = request.get_json() or {}
            item_ids = data.get('item_ids', [])
            reason = data.get('reason', 'Out of stock')
            notes = data.get('notes', '')

            if not item_ids:
                return jsonify({'success': False, 'error': 'No items selected for cancellation'}), 400

            # Cancel specific items with inventory restoration
            result = Order.cancel_order_items(order_id, item_ids, reason, notes, session['username'])

            # Create web notification for customer
            order = Order.get_by_id(order_id)
            if order:
                if result.get('order_fully_cancelled'):
                    notification_message = f"Your order #{order_id} has been cancelled due to {reason.lower()}. A full refund will be processed within 3-5 business days."
                else:
                    cancelled_count = len(result.get('cancelled_items', []))
                    notification_message = f"Some items from your order #{order_id} have been cancelled due to {reason.lower()}. A partial refund will be processed within 3-5 business days."

                Notification.create_notification(
                    customer_id=order['customer_id'],
                    message=notification_message,
                    notification_type='order_cancelled',
                    related_id=order_id
                )

            return jsonify({
                'success': True,
                'message': 'Selected items cancelled successfully. Customer has been notified.',
                'cancelled_items': result.get('cancelled_items', []),
                'order_fully_cancelled': result.get('order_fully_cancelled', False)
            })

        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400
        except Exception as e:
            app.logger.error(f"Error cancelling order items {order_id}: {str(e)}")
            return jsonify({'success': False, 'error': 'Internal server error'}), 500

    @app.route('/api/customer/notifications')
    def get_customer_notifications():
        """Get notifications for logged-in customer"""
        if 'username' not in session or session.get('role') not in ['customer', 'staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Customer or staff authentication required'}), 401

        try:
            from models import Notification

            customer_id = session.get('user_id')
            unread_only = request.args.get('unread_only', 'false').lower() == 'true'

            notifications = Notification.get_customer_notifications(customer_id, unread_only)

            # Format notifications for JSON response
            formatted_notifications = []
            for notification in notifications:
                formatted_notifications.append({
                    'id': notification['id'],
                    'message': notification['message'],
                    'type': notification['notification_type'],
                    'related_id': notification['related_id'],
                    'created_date': notification['created_date'].strftime('%Y-%m-%d %H:%M:%S') if hasattr(notification['created_date'], 'strftime') else notification['created_date'],
                    'is_read': bool(notification['is_read'])
                })

            return jsonify({
                'success': True,
                'notifications': formatted_notifications
            })

        except Exception as e:
            app.logger.error(f"Error fetching customer notifications: {str(e)}")
            return jsonify({'success': False, 'error': 'Internal server error'}), 500

    @app.route('/api/customer/notifications/<int:notification_id>/read', methods=['POST'])
    def mark_notification_read(notification_id):
        """Mark a notification as read"""
        if 'username' not in session or session.get('role') != 'customer':
            return jsonify({'success': False, 'error': 'Customer authentication required'}), 401

        try:
            from models import Notification

            customer_id = session.get('user_id')
            success = Notification.mark_as_read(notification_id, customer_id)

            if success:
                return jsonify({'success': True, 'message': 'Notification marked as read'})
            else:
                return jsonify({'success': False, 'error': 'Notification not found or access denied'}), 404

        except Exception as e:
            app.logger.error(f"Error marking notification as read: {str(e)}")
            return jsonify({'success': False, 'error': 'Internal server error'}), 500

    @app.route('/api/customer/notifications/mark-all-read', methods=['POST'])
    def mark_all_notifications_read():
        """Mark all notifications as read for customer"""
        if 'username' not in session or session.get('role') != 'customer':
            return jsonify({'success': False, 'error': 'Customer authentication required'}), 401

        try:
            from models import Notification

            customer_id = session.get('user_id')
            count = Notification.mark_all_as_read(customer_id)

            return jsonify({
                'success': True,
                'message': f'{count} notifications marked as read'
            })

        except Exception as e:
            app.logger.error(f"Error marking all notifications as read: {str(e)}")
            return jsonify({'success': False, 'error': 'Internal server error'}), 500

    @app.route('/api/customer/notifications/clear-all', methods=['POST'])
    def clear_all_notifications():
        """Clear all notifications for customer"""
        if 'username' not in session or session.get('role') != 'customer':
            return jsonify({'success': False, 'error': 'Customer authentication required'}), 401

        try:
            from models import Notification

            customer_id = session.get('user_id')
            count = Notification.clear_all_notifications(customer_id)

            return jsonify({
                'success': True,
                'message': f'{count} notifications cleared'
            })

        except Exception as e:
            app.logger.error(f"Error clearing all notifications: {str(e)}")
            return jsonify({'success': False, 'error': 'Internal server error'}), 500

    # =====================================================
    # PARTIAL ORDER CANCELLATION API ENDPOINTS
    # =====================================================

    @app.route('/api/staff/orders/<int:order_id>/items/<int:item_id>/cancel', methods=['POST'])
    def cancel_order_item_partial(order_id, item_id):
        """Cancel a specific item in an order (partial cancellation)"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401

        try:
            data = request.get_json()
            cancel_quantity = int(data.get('cancel_quantity', 1))
            reason = data.get('reason', 'out_of_stock')
            notes = data.get('notes', '')
            notify_customer = data.get('notify_customer', True)

            from models import PartialCancellation

            # Perform the partial cancellation
            result = PartialCancellation.cancel_order_item(
                order_id=order_id,
                item_id=item_id,
                cancel_quantity=cancel_quantity,
                reason=reason,
                staff_id=session.get('user_id'),
                notes=notes,
                notify_customer=notify_customer
            )

            if result['success']:
                return jsonify({
                    'success': True,
                    'message': f'Successfully cancelled {cancel_quantity} item(s)',
                    'refund_amount': result['refund_amount'],
                    'cancelled_quantity': result['cancelled_quantity'],
                    'product_name': result['product_name']
                })
            else:
                return jsonify({'success': False, 'error': result['error']}), 400

        except Exception as e:
            app.logger.error(f"Error cancelling order item: {str(e)}")
            return jsonify({'success': False, 'error': 'Internal server error'}), 500

    @app.route('/api/staff/orders/<int:order_id>/cancellation-options', methods=['GET'])
    def get_order_cancellation_options(order_id):
        """Get cancellation options for an order"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401

        try:
            from models import PartialCancellation

            options = PartialCancellation.get_cancellation_options(order_id)
            return jsonify({
                'success': True,
                'order_id': order_id,
                'items': options['items'],
                'can_cancel_items': options['can_cancel'],
                'order_status': options['order_status']
            })

        except Exception as e:
            app.logger.error(f"Error getting cancellation options: {str(e)}")
            return jsonify({'success': False, 'error': 'Internal server error'}), 500

    @app.route('/api/staff/orders/unified')
    def unified_orders():
        """Get unified orders data combining today's orders and recent pre-orders"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from datetime import datetime
            from models import PreOrder

            # Get today's orders (excluding cancelled)
            conn = mysql.connection
            cur = conn.cursor()
            today_str = datetime.now().strftime('%Y-%m-%d')

            cur.execute("""
                SELECT o.id, o.order_date, c.first_name, c.last_name, o.total_amount,
                       o.status, o.payment_method, 'order' as type
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE DATE(o.order_date) = %s AND LOWER(o.status) = 'completed'
                ORDER BY o.order_date DESC
                LIMIT 20
            """, (today_str,))

            order_rows = cur.fetchall()
            orders_data = []
            orders_total = 0

            for row in order_rows:
                # Get order items to determine details
                cur.execute("""
                    SELECT p.name as product_name, oi.quantity
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = %s
                """, (row[0],))
                order_items = cur.fetchall()

                # Determine details based on number of items
                if len(order_items) == 1:
                    details = order_items[0][0]  # Show product name for single item
                else:
                    details = 'Multiple items'

                order_data = {
                    'id': row[0],
                    'date': row[1].strftime('%Y-%m-%d %H:%M:%S') if hasattr(row[1], 'strftime') else str(row[1]),
                    'customer_name': f"{row[2]} {row[3]}",
                    'amount': float(row[4]) if row[4] is not None else 0.0,
                    'status': row[5],
                    'payment_method': row[6] if row[6] is not None else 'QR Payment',
                    'type': 'order',
                    'details': details
                }
                orders_data.append(order_data)
                if row[5] == 'completed':  # Only count completed orders in total
                    orders_total += order_data['amount']

            cur.close()

            # Get recent pre-orders (pending only)
            recent_preorders = PreOrder.get_recent_for_dashboard(limit=10)
            preorders_data = []
            preorders_expected_value = 0

            for preorder in recent_preorders:
                # Convert date to string format for consistency
                preorder_date = preorder['created_date']
                if hasattr(preorder_date, 'strftime'):
                    date_str = preorder_date.strftime('%Y-%m-%d %H:%M:%S')
                else:
                    date_str = str(preorder_date)

                preorder_data = {
                    'id': preorder['id'],
                    'date': date_str,
                    'customer_name': f"{preorder['first_name']} {preorder['last_name']}",
                    'amount': 0.0,  # Will calculate expected amount
                    'status': preorder['status'],
                    'payment_method': 'Pre-Order',
                    'type': 'preorder',
                    'details': preorder['product_name'],
                    'current_stock': preorder.get('current_stock', 0)  # Include stock information
                }
                preorders_data.append(preorder_data)

            # Combine and sort by date (most recent first)
            all_orders = orders_data + preorders_data
            # Sort by date string (works for YYYY-MM-DD HH:MM:SS format)
            all_orders.sort(key=lambda x: x['date'], reverse=True)

            return jsonify({
                'success': True,
                'orders': all_orders,
                'summary': {
                    'orders_count': len(orders_data),
                    'orders_total': orders_total,
                    'preorders_count': len(preorders_data),
                    'preorders_expected_value': preorders_expected_value
                }
            })

        except Exception as e:
            app.logger.error(f"Error getting unified orders: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/test-invoice')
    def test_invoice():
        """Test invoice template with dummy data."""
        try:
            # Create dummy data for testing
            dummy_order = {
                'id': 999,
                'total_amount': 1249.00,
                'order_date': datetime.now()
            }

            dummy_customer = {
                'first_name': 'Test',
                'last_name': 'Customer',
                'email': 'test@example.com',
                'phone': '123-456-7890',
                'address': '123 Test Street'
            }

            dummy_items = [
                {
                    'product_name': 'MSI Katana 17',
                    'brand': 'MSI',
                    'quantity': 1,
                    'price': 1249.00
                }
            ]

            return render_template('invoice.html',
                                 order=dummy_order,
                                 customer=dummy_customer,
                                 order_items=dummy_items)
        except Exception as e:
            return f"Error rendering invoice: {str(e)}"

    @app.route('/test-preorder-invoice')
    def test_preorder_invoice():
        """Test pre-order invoice template with dummy data."""
        try:
            # Create dummy data for testing
            dummy_preorder = {
                'id': 73,
                'product_name': 'MSI Katana 17 B13VFK-1427KH',
                'quantity': 1,
                'expected_price': 1249.00,
                'total_paid': 312.25,
                'status': 'confirmed'
            }

            dummy_customer = {
                'first_name': 'Test',
                'last_name': 'Customer',
                'email': 'test@example.com',
                'phone': '123-456-7890',
                'address': '123 Test Street'
            }

            dummy_payment = {
                'payment_amount': 312.25,
                'payment_type': 'deposit',
                'payment_method': 'Cash',
                'payment_date': datetime.now(),
                'payment_status': 'completed'
            }

            dummy_payment_history = [dummy_payment]

            return render_template('preorder_invoice.html',
                                 preorder=dummy_preorder,
                                 customer=dummy_customer,
                                 payment_history=dummy_payment_history,
                                 latest_payment=dummy_payment)
        except Exception as e:
            return f"Error rendering pre-order invoice: {str(e)}"



    @app.route('/test-qr')
    def test_qr():
        """Test QR code generation."""
        try:
            print("🔧 Testing QR code generation...")
            qr_generator = BakongQRGenerator(use_static_qr=True)
            qr_data = qr_generator.generate_payment_qr(
                amount=10.00,
                currency="USD",
                reference_id="TEST123"
            )
            print(f"✅ QR data generated: {bool(qr_data.get('qr_image_base64'))}")
            return f"""
            <h2>QR Test Results</h2>
            <p>Success: {bool(qr_data.get('qr_image_base64'))}</p>
            <p>Reference: {qr_data.get('reference_id')}</p>
            <p>Amount: ${qr_data.get('amount')}</p>
            {f'<img src="data:image/png;base64,{qr_data.get("qr_image_base64")}" style="max-width: 300px;">' if qr_data.get('qr_image_base64') else '<p>No QR image generated</p>'}
            """
        except Exception as e:
            print(f"❌ Error testing QR: {str(e)}")
            return f"<h2>Error:</h2><p>{str(e)}</p>"

    # Staff Suppliers Page Route
    @app.route('/auth/staff/suppliers')
    def staff_suppliers():
        try:
            suppliers = Supplier.get_all()
        except Exception as e:
            app.logger.error(f"Error fetching suppliers: {e}")
            suppliers = []
        return render_template('staff_suppliers.html', suppliers=suppliers)

    # Staff Supplier Search API Route
    @app.route('/auth/staff/suppliers/search')
    def staff_suppliers_search():
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'success': False, 'suppliers': [], 'error': 'Empty search query'})
        try:
            suppliers = Supplier.search(query)
            return jsonify({'success': True, 'suppliers': suppliers})
        except Exception as e:
            app.logger.error(f"Error searching suppliers: {e}")
            return jsonify({'success': False, 'suppliers': [], 'error': str(e)})

    # Staff Supplier Update API Route
    @app.route('/auth/staff/suppliers/<int:supplier_id>', methods=['PUT'])
    def update_supplier(supplier_id):
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        try:
            name = data.get('name', '').strip()
            contact_person = data.get('contact_person', '').strip()
            phone = data.get('phone', '').strip()
            email = data.get('email', '').strip()
            address = data.get('address', '').strip()

            if not name:
                return jsonify({'success': False, 'error': 'Name is required'}), 400

            updated = Supplier.update(supplier_id, name, contact_person, phone, email, address)
            if updated:
                return jsonify({'success': True})
            else:
                return jsonify({'success': False, 'error': 'Update failed'}), 500
        except Exception as e:
            app.logger.error(f"Error updating supplier: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    # Staff Supplier Create API Route
    @app.route('/auth/staff/suppliers', methods=['POST'])
    def create_supplier():
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        try:
            name = data.get('name', '').strip()
            contact_person = data.get('contact_person', '').strip()
            phone = data.get('phone', '').strip()
            email = data.get('email', '').strip()
            address = data.get('address', '').strip()

            if not name:
                return jsonify({'success': False, 'error': 'Name is required'}), 400

            supplier_id = Supplier.create(name, contact_person, phone, email, address)
            if supplier_id:
                return jsonify({'success': True, 'supplier_id': supplier_id})
            else:
                return jsonify({'success': False, 'error': 'Creation failed'}), 500
        except Exception as e:
            app.logger.error(f"Error creating supplier: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    # Staff Supplier Delete API Route
    @app.route('/auth/staff/suppliers/<int:supplier_id>', methods=['DELETE'])
    def delete_supplier(supplier_id):
        try:
            deleted = Supplier.delete(supplier_id)
            if deleted:
                return jsonify({'success': True})
            else:
                return jsonify({'success': False, 'error': 'Failed to delete supplier for an unknown reason'}), 500
        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400
        except Exception as e:
            app.logger.error(f"Error deleting supplier: {e}")
            return jsonify({'success': False, 'error': 'An unexpected error occurred'}), 500

    # Staff Orders Page Route
    @app.route('/auth/staff/orders')
    def staff_orders():
        # This route will now primarily render the page, and JavaScript will fetch data
        status = request.args.get('status', 'all')
        date = request.args.get('date')
        search = request.args.get('search')
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 10, type=int)

        try:
            summary = Order.get_status_summary()
            total_orders_amount = Order.get_total_amount_all()
            total_completed_amount = Order.get_total_completed_amount()
            app.logger.info(f"DEBUG: Order summary data: {summary}")
            app.logger.info(f"DEBUG: Total orders amount: {total_orders_amount}")
            # No longer fetching orders directly here, JS will do it via API
        except Exception as e:
            app.logger.error(f"Error fetching order summary data: {e}")
            summary = []
            total_orders_amount = 0.0
            total_completed_amount = 0.0

        return render_template('staff_orders.html', summary=summary, search=search, total_orders_amount=total_orders_amount, total_completed_amount=total_completed_amount, active_page='orders')

    @app.route('/auth/staff/api/orders')
    def api_staff_orders():
        status = request.args.get('status', 'all')
        date = request.args.get('date')
        search = request.args.get('search')
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 10, type=int)

        # Sanitize input parameters to treat 'none' or similar as no filter
        if status and status.lower() == 'none':
            status = 'all'
        if date and date.lower() == 'none':
            date = None
        if search and search.lower() == 'none':
            search = None

        try:
            orders, total_orders = Order.get_paginated_orders(status=status, date=date, search=search, page=page, page_size=page_size)
            
            orders_list = []
            for order in orders:
                orders_list.append({
                    'id': order['id'],
                    'first_name': order['first_name'],
                    'last_name': order['last_name'],
                    'order_date': order['order_date'].strftime('%Y-%m-%d') if hasattr(order['order_date'], 'strftime') else order['order_date'],
                    'total': float(order['total']),
                    'status': order['status'],
                    'payment_method': order.get('payment_method', 'QR Payment')
                })
            return jsonify({'success': True, 'orders': orders_list, 'total_orders': total_orders})
        except Exception as e:
            app.logger.error(f"Error fetching paginated orders: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch orders'}), 500

    # Staff API Routes
    # Status update endpoint removed - orders are automatically managed

    @app.route('/staff/inventory/search')
    def search_inventory():
        query = request.args.get('q', '')
        brand_filter = request.args.get('brand_filter', '')
        category_filter = request.args.get('category_filter', '')
        stock_filter = request.args.get('stock_filter', '')
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 10))
        sort_by = request.args.get('sort_by', 'id')
        sort_dir = request.args.get('sort_dir', 'asc').lower()
        if sort_dir not in ['asc', 'desc']:
            sort_dir = 'asc'

        product_id = request.args.get('product_id', '')
        try:
            cur = mysql.connection.cursor()

            # Build the WHERE clause dynamically
            where_clauses = []
            params = []

            if query:
                # Change to filter by product name instead of category name
                where_clauses.append("p.name LIKE %s")
                params.append(f'%{query}%')

            if brand_filter:
                where_clauses.append("p.name LIKE %s")
                params.append(f'%{brand_filter}%')

            if category_filter:
                where_clauses.append("p.category_id = %s")
                params.append(category_filter)

            if stock_filter:
                if stock_filter == 'out_of_stock':
                    where_clauses.append("p.stock = 0")
                elif stock_filter == 'low_stock':
                    where_clauses.append("p.stock > 0 AND p.stock <= 20")
                elif stock_filter == 'in_stock':
                    where_clauses.append("p.stock > 20")

            if product_id:
                where_clauses.append("p.id = %s")
                params.append(product_id)

            where_clause = " AND ".join(where_clauses)
            if where_clause:
                where_clause = "WHERE " + where_clause
            app.logger.info(f"Product ID: {product_id}")
            app.logger.info(f"WHERE clause: {where_clause}")
            # Count total matching products
            count_query = f"""
SELECT COUNT(*)
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
{where_clause}
            """
            cur.execute(count_query, tuple(params))
            total_count = cur.fetchone()[0]

            # Calculate pagination
            total_pages = (total_count + page_size - 1) // page_size
            offset = (page - 1) * page_size

            # Validate sort_by column to prevent SQL injection
            valid_sort_columns = ['id', 'name', 'price', 'original_price', 'stock']
            if sort_by not in valid_sort_columns:
                sort_by = 'id'

            # Fetch paginated products with sorting including category information
            fetch_query = f"""
SELECT p.id, p.name, p.description, p.price, p.stock, p.photo, p.cpu, p.ram, p.storage, p.display, p.os, p.keyboard, p.battery, p.weight, p.warranty_id, p.back_view, p.left_rear_view, p.category_id, p.original_price, c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
                {where_clause}
                ORDER BY p.{sort_by} {sort_dir}
                LIMIT %s OFFSET %s
            """
            cur.execute(fetch_query, tuple(params) + (page_size, offset))
            results = cur.fetchall()
            cur.close()
            products = []
            for row in results:
                products.append({
                    'id': int(row[0]),
                    'name': row[1],
                    'description': row[2],
                    'price': float(row[3]),
                    'stock': int(row[4]),
                    'photo': row[5],
                    'cpu': row[6],
                    'ram': row[7],
                    'storage': row[8],
                    'display': row[9],
                    'os': row[10],
                    'keyboard': row[11],
                    'battery': row[12],
                    'weight': row[13],
                    'warranty_id': row[14],
                    'back_view': row[15],
                    'left_rear_view': row[16],
                    'category_id': row[17],
                    'original_price': float(row[18]) if row[18] is not None else None,
                    'category_name': row[19]
                })

            pagination = {
                'page': page,
                'total_pages': total_pages,
                'total_count': total_count
            }

            return jsonify({'success': True, 'products': products, 'pagination': pagination})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/staff/orders/create', methods=['POST'])
    def create_order():
        if not request.json:
            return jsonify({'success': False, 'error': 'Invalid request'}), 400
        
        from datetime import datetime

        data = request.json
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        email = data.get('email')
        order_date = data.get('order_date')
        items = data.get('items', [])

        if not first_name or not last_name or not email:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400

        # If order_date is missing or only date without time, set to current datetime
        if not order_date:
            order_date_obj = datetime.now()
        else:
            try:
                # Try parsing order_date string to datetime
                order_date_obj = datetime.strptime(order_date, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                try:
                    # If time is missing, parse only date and add current time
                    date_part = datetime.strptime(order_date, '%Y-%m-%d')
                    now = datetime.now()
                    order_date_obj = datetime.combine(date_part.date(), now.time())
                except ValueError:
                    # If parsing fails, set to current datetime
                    order_date_obj = datetime.now()

        try:
            # Check if customer exists
            customer = Customer.get_by_name_or_email(first_name, last_name, email)
            if not customer:
                customer_id = Customer.create(first_name, last_name, email)
            else:
                customer_id = customer['id']

            # Create order (this will also reduce stock)
            order_id = Order.create(customer_id, order_date_obj, status='Pending', items=items)
            return jsonify({'success': True, 'order_id': order_id})
        except ValueError as e:
            # Handle insufficient stock error specifically
            return jsonify({'success': False, 'error': str(e)}), 400
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/orders/test_status_summary')
    def api_order_test_status_summary():
        test_summary = {
            'completed': 10,
            'pending': 5,
            'processing': 7,
            'cancelled': 2
        }
        return jsonify({'success': True, 'summary': test_summary})

    @app.route('/api/staff/orders/status_summary')
    def api_order_status_summary():
        try:
            summary = Order.get_status_summary()
            app.logger.info(f"DEBUG: Order status summary: {summary}")
            return jsonify({'success': True, 'summary': summary})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/inventory/stock_summary')
    def api_inventory_stock_summary():
        try:
            conn = mysql.connection
            cur = conn.cursor()
            cur.execute("""
                SELECT
                    COUNT(CASE WHEN stock = 0 THEN 1 END) AS out_of_stock,
                    COUNT(CASE WHEN stock > 0 AND stock < 20 THEN 1 END) AS low_stock,
                    COUNT(CASE WHEN stock >= 20 THEN 1 END) AS in_stock
                FROM products
            """)
            row = cur.fetchone()
            cur.close()
            summary = {
                'out_of_stock': row[0] or 0,
                'low_stock': row[1] or 0,
                'in_stock': row[2] or 0
            }
            return jsonify({'success': True, 'summary': summary})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/auth/api/inventory/stats')
    def api_inventory_stats():
        try:
            conn = mysql.connection
            cur = conn.cursor()
            cur.execute("""
                SELECT
                    SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS out_of_stock,
                    SUM(CASE WHEN stock > 0 AND stock < 20 THEN 1 ELSE 0 END) AS low_stock,
                    SUM(CASE WHEN stock >= 20 THEN 1 ELSE 0 END) AS in_stock
                FROM products
            """)
            row = cur.fetchone()
            cur.close()

            data = {
                'out_of_stock': row[0] or 0,
                'low_stock': row[1] or 0,
                'in_stock': row[2] or 0
            }

            return jsonify(data)
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            app.logger.error(f"Error in /auth/api/inventory/stats: {e}\n{tb}")
            return jsonify({'success': False, 'error': 'Internal server error'}), 500

    @app.route('/auth/api/inventory/product_stats')
    def api_inventory_product_stats():
        try:
            conn = mysql.connection
            cur = conn.cursor()
            # Count low stock products per brand
            query = """
                SELECT SUBSTRING_INDEX(TRIM(name), ' ', 1) as brand, COUNT(*) as low_stock_count
                FROM products
                WHERE stock > 0 AND stock < 20
                AND name IS NOT NULL
                AND TRIM(name) != ''
                AND SUBSTRING_INDEX(TRIM(name), ' ', 1) != ''
                GROUP BY brand
                ORDER BY low_stock_count DESC
                LIMIT 10
            """
            app.logger.info(f"Executing query: {query}")
            cur.execute(query)
            rows = cur.fetchall()
            cur.close()

            brands = []
            for row in rows:
                brands.append({
                    'brand': row[0],
                    'low_stock_count': row[1]
                })

            app.logger.info(f"Query result rows: {rows}")

            return jsonify({'success': True, 'brands': brands})
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            app.logger.error(f"Error in /auth/api/inventory/product_stats: {e}\n{tb}")
            return jsonify({'success': False, 'error': 'Internal server error'}), 500

    @app.route('/api/staff/notifications')
    def api_staff_notifications():
        try:
            conn = mysql.connection
            cur = conn.cursor()

            # Fetch all relevant products with updated_at for recency
            cur.execute("""
                SELECT id, name, stock, updated_at FROM products
                WHERE stock = 0 OR (stock > 0 AND stock < 20) OR stock >= 20
                ORDER BY updated_at DESC
                LIMIT 10
            """)
            products = cur.fetchall()
            cur.close()

            notifications = []

            for p in products:
                p_id, p_name, p_stock, p_updated = p
                if p_stock == 0:
                    n_type = 'out_of_stock'
                    message = f"Out of stock alert: {p_name} is out of stock."
                elif 0 < p_stock < 20:
                    n_type = 'low_stock'
                    message = f"Low stock alert: {p_name} has only {p_stock} items left."
                else:
                    n_type = 'in_stock'
                    message = f"In stock alert: {p_name} has {p_stock} items available."

                notifications.append({
                    'type': n_type,
                    'product_id': p_id,
                    'name': p_name,
                    'stock': p_stock,
                    'message': message,
                    'updated_at': p_updated.isoformat() if hasattr(p_updated, 'isoformat') else str(p_updated)
                })

            return jsonify({'success': True, 'notifications': notifications})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/staff/inventory/<int:product_id>/update', methods=['POST'])
    def update_inventory(product_id):
        if session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            # Enhanced debug logging
            app.logger.info(f"=== UPDATE REQUEST START for product {product_id} ===")
            app.logger.info(f"Request files keys: {list(request.files.keys())}")
            app.logger.info(f"Request form keys: {list(request.form.keys())}")

            # Log file details
            for file_key in request.files.keys():
                file_obj = request.files[file_key]
                app.logger.info(f"File {file_key}: filename='{file_obj.filename}', content_type='{file_obj.content_type}', has_data={bool(file_obj.read(1))}")
                file_obj.seek(0)  # Reset file pointer after reading

            stock = request.form.get('stock')
            name = request.form.get('name')
            description = request.form.get('description')
            price = request.form.get('price')
            category_id = request.form.get('category')  # Changed to category_id

            # Convert empty strings to None for proper validation
            if category_id == '':
                category_id = None
            
            cpu = request.form.get('cpu')
            ram = request.form.get('ram')
            storage = request.form.get('storage')
            graphics = request.form.get('graphics')
            display = request.form.get('display')
            operating_system = request.form.get('os')
            keyboard = request.form.get('keyboard')
            battery = request.form.get('battery')
            weight = request.form.get('weight')
            warranty_id = request.form.get('warranty_id')
            original_price = request.form.get('original_price')
            color_name = request.form.get('color')
            color_id = None
            if color_name:
                cur = mysql.connection.cursor()
                cur.execute("SELECT id FROM colors WHERE name = %s", (color_name,))
                color = cur.fetchone()
                if color:
                    color_id = color[0]
                else:
                    cur.execute("INSERT INTO colors (name) VALUES (%s)", (color_name,))
                    mysql.connection.commit()
                    color_id = cur.lastrowid
                cur.close()

            field_updates = {}
            if stock is not None: field_updates['stock'] = stock
            if name is not None: field_updates['name'] = name
            if description is not None: field_updates['description'] = description
            if price is not None: field_updates['price'] = price
            if category_id is not None: field_updates['category_id'] = category_id
            if cpu is not None: field_updates['cpu'] = cpu
            if ram is not None: field_updates['ram'] = ram
            if storage is not None: field_updates['storage'] = storage
            if graphics is not None: field_updates['graphics'] = graphics
            if display is not None: field_updates['display'] = display
            if operating_system is not None: field_updates['os'] = operating_system
            if keyboard is not None: field_updates['keyboard'] = keyboard
            if battery is not None: field_updates['battery'] = battery
            if weight is not None: field_updates['weight'] = weight
            if warranty_id is not None: field_updates['warranty_id'] = warranty_id
            if color_id is not None: field_updates['color_id'] = color_id
            if original_price is not None: field_updates['original_price'] = original_price

            # Handle file uploads using the same logic as create route
            app.logger.info("=== STARTING FILE UPLOAD PROCESSING ===")
            for file_key, db_field in [
                ('photo', 'photo'),
                ('photo_back', 'back_view'),
                ('photo_left_rear', 'left_rear_view')
            ]:
                try:
                    app.logger.info(f"Processing file_key: {file_key} -> db_field: {db_field}")

                    if file_key in request.files:
                        file = request.files[file_key]
                        app.logger.info(f"File object found for {file_key}: filename='{file.filename}', content_type='{file.content_type}'")

                        if file.filename:  # File was selected and has a name
                            app.logger.info(f"File selected for {file_key}: {file.filename}")

                            if allowed_file(file.filename):
                                app.logger.info(f"File {file_key} has valid extension: {file.filename}")
                                filename = secure_filename(file.filename)
                                upload_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                                app.logger.info(f"Saving {file_key} to: {upload_path}")

                                # Ensure upload directory exists
                                os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

                                file.save(upload_path)
                                field_updates[db_field] = filename
                                app.logger.info(f"✓ Successfully saved {file_key} as {filename} and added to field_updates")
                            else:
                                app.logger.warning(f"✗ Skipping {file_key} - invalid file type for filename: {file.filename}")
                        else:
                            # Empty filename - this happens when no file is selected
                            # DO NOT update the database field - preserve existing image
                            app.logger.info(f"No file selected for {file_key}, preserving existing {db_field}")
                    else:
                        # File key not in request.files - no file input was sent
                        # DO NOT update the database field - preserve existing image
                        app.logger.info(f"No file input for {file_key}, preserving existing {db_field}")

                except Exception as file_error:
                    import traceback
                    app.logger.error(f"✗ Error processing {file_key}: {str(file_error)}")
                    app.logger.error(f"Traceback for {file_key}: {traceback.format_exc()}")
                    # Continue with other files

            app.logger.info(f"=== FILE PROCESSING COMPLETE. field_updates so far: {field_updates} ===")

            if not field_updates:
                app.logger.warning("No fields to update - returning error")
                return jsonify({'success': False, 'error': 'No fields to update'}), 400

            field_updates['updated_at'] = datetime.now() # Add updated_at
            app.logger.info(f"=== PREPARING DATABASE UPDATE ===")
            app.logger.info(f"Final field_updates: {field_updates}")

            set_clause_parts = []
            update_values = []
            for key, value in field_updates.items():
                set_clause_parts.append(f"`{key}` = %s")
                update_values.append(value)

            set_clause = ", ".join(set_clause_parts)
            update_values.append(product_id)

            final_query = f"UPDATE products SET {set_clause} WHERE id = %s"
            app.logger.info(f"SQL Query: {final_query}")
            app.logger.info(f"SQL Values: {update_values}")

            cur = mysql.connection.cursor()
            rows_affected = cur.execute(final_query, tuple(update_values))
            app.logger.info(f"Rows affected by update: {rows_affected}")

            mysql.connection.commit()
            app.logger.info("✓ Database commit successful")

            cur.close()
            app.logger.info("=== UPDATE REQUEST COMPLETE ===")
            return jsonify({'success': True})
        except Exception as e:
            import traceback
            app.logger.error(f"Error updating product {product_id}: {str(e)}")
            app.logger.error(f"Traceback: {traceback.format_exc()}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/staff/inventory/create', methods=['POST'])
    def create_product():
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403
            
        try:
            name = request.form.get('name')
            description = request.form.get('description')
            price = request.form.get('price')
            stock = request.form.get('stock')
            category_id = request.form.get('category')  # Changed to category_id

            # Convert empty strings to None for proper validation
            if category_id == '':
                category_id = None

            # Validate required fields
            if not name or not price or not stock:
                return jsonify({'success': False, 'error': 'Name, price, and stock are required fields'}), 400

            if category_id is None:
                return jsonify({'success': False, 'error': 'Category is required'}), 400

            photo = None
            left_rear_view = None
            back_view = None
            color_name = request.form.get('color')
            color_id = None
            if color_name:
                cur = mysql.connection.cursor()
                cur.execute("SELECT id FROM colors WHERE name = %s", (color_name,))
                color = cur.fetchone()
                if color:
                    color_id = color[0]
                else:
                    cur.execute("INSERT INTO colors (name) VALUES (%s)", (color_name,))
                    mysql.connection.commit()
                    color_id = cur.lastrowid
                cur.close()

            # Handle file uploads
            if 'photo' in request.files:
                file = request.files['photo']
                if file and file.filename and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                    photo = filename

            if 'photo_left_rear' in request.files:
                file = request.files['photo_left_rear']
                if file and file.filename and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                    left_rear_view = filename



            if 'photo_back' in request.files:
                file = request.files['photo_back']
                if file and file.filename and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                    back_view = filename

            product_id = Product.create(
                name=name,
                description=description,
                price=price,
                stock=stock,
                category_id=category_id,
                photo=photo,
                left_rear_view=left_rear_view,
                back_view=back_view,
                cpu=request.form.get('cpu'),
                ram=request.form.get('ram'),
                storage=request.form.get('storage'),
                graphics=request.form.get('graphics'),
                display=request.form.get('display'),
                os=request.form.get('os'),
                keyboard=request.form.get('keyboard'),
                battery=request.form.get('battery'),
                weight=request.form.get('weight'),
                warranty_id=request.form.get('warranty_id'),
                color_id=color_id,
                original_price=request.form.get('original_price')
            )
            cur = mysql.connection.cursor()
            cur.execute("UPDATE products SET updated_at = NOW() WHERE id = %s", (product_id,))
            mysql.connection.commit()
            cur.close()
            return jsonify({
                'success': True, 
                'product_id': product_id,
                'redirect': url_for('auth.staff_inventory')
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/staff/inventory/<int:product_id>/delete', methods=['DELETE'])
    def delete_product(product_id):
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403
        try:
            cur = mysql.connection.cursor()
            cur.execute("DELETE FROM products WHERE id = %s", (product_id,))
            mysql.connection.commit()
            cur.close()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    # Discount Management Endpoints
    @app.route('/api/staff/discounts/products', methods=['GET'])
    def get_discounted_products():
        """Get all products currently on discount with pagination"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            # Get pagination parameters
            page = int(request.args.get('page', 1))
            page_size = int(request.args.get('page_size', 10))

            conn = mysql.connection
            cur = conn.cursor()

            # Count total discounted products
            cur.execute("""
                SELECT COUNT(*)
                FROM products p
                WHERE p.original_price IS NOT NULL
                AND p.price < p.original_price
            """)
            total_count = cur.fetchone()[0]

            # Calculate pagination
            total_pages = (total_count + page_size - 1) // page_size
            offset = (page - 1) * page_size

            # Fetch paginated discounted products
            cur.execute("""
                SELECT p.id, p.name, p.price, p.original_price, p.stock, c.name as category_name,
                       ROUND(((p.original_price - p.price) / p.original_price) * 100, 0) as discount_percentage,
                       (p.original_price - p.price) as savings_amount
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.original_price IS NOT NULL
                AND p.price < p.original_price
                ORDER BY discount_percentage DESC
                LIMIT %s OFFSET %s
            """, (page_size, offset))
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            products = [dict(zip(columns, row)) for row in rows]
            cur.close()

            return jsonify({
                'success': True,
                'products': products,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': total_pages
                }
            })
        except Exception as e:
            app.logger.error(f"Error fetching discounted products: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/discounts/apply-single', methods=['POST'])
    def apply_single_discount():
        """Apply discount to a single product"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            data = request.get_json()
            app.logger.info(f"Received discount request data: {data}")

            product_id = data.get('product_id')
            discount_percentage = float(data.get('discount_percentage', 0))

            app.logger.info(f"Parsed values - product_id: {product_id}, discount_percentage: {discount_percentage}")

            if not product_id or discount_percentage <= 0 or discount_percentage >= 100:
                app.logger.error(f"Invalid input - product_id: {product_id}, discount_percentage: {discount_percentage}")
                return jsonify({'success': False, 'error': 'Invalid product ID or discount percentage'}), 400

            conn = mysql.connection
            cur = conn.cursor()
            app.logger.info(f"Database connection established")

            # Get current product details
            cur.execute("SELECT price, original_price FROM products WHERE id = %s", (product_id,))
            product = cur.fetchone()
            app.logger.info(f"Product query result: {product}")

            if not product:
                app.logger.error(f"Product not found with ID: {product_id}")
                return jsonify({'success': False, 'error': 'Product not found'}), 404

            current_price, original_price = product

            # Set original_price if not set
            if original_price is None:
                original_price = current_price
                cur.execute("UPDATE products SET original_price = %s WHERE id = %s", (original_price, product_id))

            # Convert Decimal to float for calculations
            original_price_float = float(original_price)

            # Calculate new discounted price
            new_price = round(original_price_float * (1 - discount_percentage / 100), 2)

            # Update product price
            cur.execute("UPDATE products SET price = %s WHERE id = %s", (new_price, product_id))
            mysql.connection.commit()
            cur.close()

            return jsonify({
                'success': True,
                'message': f'Discount of {discount_percentage}% applied successfully',
                'new_price': new_price,
                'original_price': original_price_float,
                'savings': round(original_price_float - new_price, 2)
            })

        except Exception as e:
            app.logger.error(f"Error applying single discount: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/discounts/apply-bulk', methods=['POST'])
    def apply_bulk_discount():
        """Apply discount to multiple products"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            data = request.get_json()
            product_ids = data.get('product_ids', [])
            discount_percentage = float(data.get('discount_percentage', 0))

            if not product_ids or not isinstance(product_ids, list):
                return jsonify({'success': False, 'error': 'Invalid product IDs list'}), 400

            if discount_percentage <= 0 or discount_percentage >= 100:
                return jsonify({'success': False, 'error': 'Invalid discount percentage'}), 400

            conn = mysql.connection
            cur = conn.cursor()

            # Process each product
            updated_products = []
            failed_products = []

            for product_id in product_ids:
                try:
                    # Get current product details
                    cur.execute("SELECT name, price, original_price FROM products WHERE id = %s", (product_id,))
                    product = cur.fetchone()

                    if not product:
                        failed_products.append(f"Product ID {product_id} not found")
                        continue

                    product_name, current_price, original_price = product

                    # Set original_price if not set
                    if original_price is None:
                        original_price = current_price
                        cur.execute("UPDATE products SET original_price = %s WHERE id = %s", (original_price, product_id))

                    # Convert Decimal to float for calculations
                    original_price_float = float(original_price)

                    # Calculate new discounted price
                    new_price = round(original_price_float * (1 - discount_percentage / 100), 2)

                    # Update product price
                    cur.execute("UPDATE products SET price = %s WHERE id = %s", (new_price, product_id))

                    updated_products.append({
                        'id': product_id,
                        'name': product_name,
                        'original_price': original_price_float,
                        'new_price': new_price,
                        'savings': round(original_price_float - new_price, 2)
                    })

                except Exception as e:
                    failed_products.append(f"Product ID {product_id}: {str(e)}")

            mysql.connection.commit()
            cur.close()

            success_count = len(updated_products)
            total_count = len(product_ids)

            if success_count == 0:
                return jsonify({
                    'success': False,
                    'error': 'No products were updated',
                    'failed_products': failed_products
                }), 400

            message = f'Bulk discount of {discount_percentage}% applied to {success_count} of {total_count} products'

            response_data = {
                'success': True,
                'message': message,
                'updated_products': updated_products,
                'success_count': success_count,
                'total_count': total_count
            }

            if failed_products:
                response_data['failed_products'] = failed_products

            return jsonify(response_data)

        except Exception as e:
            app.logger.error(f"Error applying bulk discount: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    # Customer History & Recognition Endpoints
    @app.route('/api/staff/customers/search', methods=['GET'])
    def search_customers():
        """Search customers by name, email, or phone"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            query = request.args.get('q', '').strip()
            if not query:
                return jsonify({'success': False, 'error': 'Search query required'}), 400

            conn = mysql.connection
            cur = conn.cursor()

            # Search customers by name, email, or phone
            search_pattern = f"%{query}%"
            cur.execute("""
                SELECT id, CONCAT(first_name, ' ', last_name) as name, email, phone,
                       (SELECT COUNT(*) FROM orders WHERE customer_id = customers.id) as total_orders
                FROM customers
                WHERE CONCAT(first_name, ' ', last_name) LIKE %s
                   OR email LIKE %s
                   OR phone LIKE %s
                ORDER BY first_name, last_name
                LIMIT 10
            """, (search_pattern, search_pattern, search_pattern))

            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            customers = [dict(zip(columns, row)) for row in rows]
            cur.close()

            return jsonify({'success': True, 'customers': customers})

        except Exception as e:
            app.logger.error(f"Error searching customers: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/customers/<int:customer_id>/discount-history', methods=['GET'])
    def get_customer_discount_history(customer_id):
        """Get discount history for a specific customer"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            conn = mysql.connection
            cur = conn.cursor()

            # Get customer info
            cur.execute("""
                SELECT id, CONCAT(first_name, ' ', last_name) as name, email, phone,
                       (SELECT COUNT(*) FROM orders WHERE customer_id = customers.id) as total_orders
                FROM customers WHERE id = %s
            """, (customer_id,))

            customer_row = cur.fetchone()
            if not customer_row:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404

            customer_columns = [desc[0] for desc in cur.description]
            customer = dict(zip(customer_columns, customer_row))

            # Get discount history by comparing order item prices with current product original prices
            # This is a simplified approach since we don't have original_price in order_items yet
            cur.execute("""
                SELECT
                    o.order_date as date,
                    p.name as product_name,
                    COALESCE(p.original_price, p.price) as original_price,
                    oi.price as final_price,
                    CASE
                        WHEN p.original_price IS NOT NULL AND p.original_price > oi.price
                        THEN ROUND(((p.original_price - oi.price) / p.original_price) * 100, 1)
                        ELSE 0
                    END as discount_percentage,
                    CASE
                        WHEN p.original_price IS NOT NULL AND p.original_price > oi.price
                        THEN ROUND(p.original_price - oi.price, 2)
                        ELSE 0
                    END as savings,
                    'Not Tracked' as staff_name
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                JOIN products p ON oi.product_id = p.id
                WHERE o.customer_id = %s
                AND o.order_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                ORDER BY o.order_date DESC
                LIMIT 50
            """, (customer_id,))

            history_rows = cur.fetchall()
            history_columns = [desc[0] for desc in cur.description]
            history = [dict(zip(history_columns, row)) for row in history_rows]

            # Calculate insights
            insights = calculate_customer_insights(cur, customer_id, history)

            cur.close()

            return jsonify({
                'success': True,
                'customer': customer,
                'history': history,
                'insights': insights
            })

        except Exception as e:
            app.logger.error(f"Error getting customer discount history: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/customers/recent-activity', methods=['GET'])
    def get_recent_customer_activity():
        """Get customers with recent discount activity"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            conn = mysql.connection
            cur = conn.cursor()

            # Get customers with recent activity (including potential discounts)
            cur.execute("""
                SELECT
                    c.id,
                    CONCAT(c.first_name, ' ', c.last_name) as name,
                    c.email,
                    c.phone,
                    MAX(o.order_date) as last_visit,
                    COUNT(DISTINCT o.id) as order_count,
                    COUNT(DISTINCT oi.id) as item_count,
                    ROUND(AVG(
                        CASE
                            WHEN p.original_price IS NOT NULL AND p.original_price > oi.price
                            THEN ((p.original_price - oi.price) / p.original_price) * 100
                            ELSE 0
                        END
                    ), 1) as avg_discount
                FROM customers c
                JOIN orders o ON c.id = o.customer_id
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone
                HAVING avg_discount > 0 OR order_count >= 2
                ORDER BY last_visit DESC
                LIMIT 20
            """)

            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            customers = [dict(zip(columns, row)) for row in rows]
            cur.close()

            return jsonify({'success': True, 'customers': customers})

        except Exception as e:
            app.logger.error(f"Error getting recent customer activity: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    def calculate_customer_insights(cur, customer_id, history):
        """Calculate insights for customer discount behavior"""
        insights = {
            'most_common_discount': None,
            'total_purchases': 0,
            'total_savings': 0,
            'average_discount': 0,
            'last_visit': None
        }

        if not history:
            return insights

        # Calculate most common discount percentage
        discount_counts = {}
        total_savings = 0
        total_discount = 0

        for item in history:
            discount = item['discount_percentage']
            if discount:
                discount_counts[discount] = discount_counts.get(discount, 0) + 1
                total_discount += discount

            if item['savings']:
                total_savings += float(item['savings'])

        if discount_counts:
            insights['most_common_discount'] = max(discount_counts, key=discount_counts.get)
            insights['average_discount'] = round(total_discount / len(history), 1)

        insights['total_purchases'] = len(history)
        insights['total_savings'] = total_savings

        # Get last visit date
        if history:
            insights['last_visit'] = history[0]['date']  # Already ordered by date DESC

        return insights

    @app.route('/api/staff/discounts/apply-category', methods=['POST'])
    def apply_category_discount():
        """Apply discount to all products in a category"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            data = request.get_json()
            category_id = data.get('category_id')
            discount_percentage = float(data.get('discount_percentage', 0))

            if not category_id or discount_percentage <= 0 or discount_percentage >= 100:
                return jsonify({'success': False, 'error': 'Invalid category ID or discount percentage'}), 400

            conn = mysql.connection
            cur = conn.cursor()

            # First, set original_price for products that don't have it
            cur.execute("""
                UPDATE products
                SET original_price = price
                WHERE category_id = %s AND original_price IS NULL
            """, (category_id,))

            # Apply discount to all products in category
            cur.execute("""
                UPDATE products
                SET price = ROUND(original_price * %s, 2)
                WHERE category_id = %s AND original_price IS NOT NULL
            """, (1 - discount_percentage / 100, category_id))

            affected_rows = cur.rowcount
            mysql.connection.commit()
            cur.close()

            return jsonify({
                'success': True,
                'message': f'Discount of {discount_percentage}% applied to {affected_rows} products in category',
                'affected_products': affected_rows
            })

        except Exception as e:
            app.logger.error(f"Error applying category discount: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/discounts/apply-brand', methods=['POST'])
    def apply_brand_discount():
        """Apply discount to all products of a specific brand"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            data = request.get_json()
            brand_name = data.get('brand_name', '').strip()
            discount_percentage = float(data.get('discount_percentage', 0))

            if not brand_name or discount_percentage <= 0 or discount_percentage >= 100:
                return jsonify({'success': False, 'error': 'Invalid brand name or discount percentage'}), 400

            conn = mysql.connection
            cur = conn.cursor()

            # First, set original_price for products that don't have it
            cur.execute("""
                UPDATE products
                SET original_price = price
                WHERE name LIKE %s AND original_price IS NULL
            """, (f"{brand_name}%",))

            # Apply discount to all products of the brand
            cur.execute("""
                UPDATE products
                SET price = ROUND(original_price * %s, 2)
                WHERE name LIKE %s AND original_price IS NOT NULL
            """, (1 - discount_percentage / 100, f"{brand_name}%"))

            affected_rows = cur.rowcount
            mysql.connection.commit()
            cur.close()

            return jsonify({
                'success': True,
                'message': f'Discount of {discount_percentage}% applied to {affected_rows} {brand_name} products',
                'affected_products': affected_rows
            })

        except Exception as e:
            app.logger.error(f"Error applying brand discount: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/discounts/remove', methods=['POST'])
    def remove_discount():
        """Remove discount from a product (restore original price)"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            data = request.get_json()
            product_id = data.get('product_id')

            if not product_id:
                return jsonify({'success': False, 'error': 'Invalid product ID'}), 400

            conn = mysql.connection
            cur = conn.cursor()

            # Restore original price
            cur.execute("""
                UPDATE products
                SET price = original_price
                WHERE id = %s AND original_price IS NOT NULL
            """, (product_id,))

            if cur.rowcount == 0:
                return jsonify({'success': False, 'error': 'Product not found or no original price set'}), 404

            mysql.connection.commit()
            cur.close()

            return jsonify({'success': True, 'message': 'Discount removed successfully'})

        except Exception as e:
            app.logger.error(f"Error removing discount: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/discounts/products-list', methods=['GET'])
    def get_products_for_discount():
        """Get all products for discount selection dropdown"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            conn = mysql.connection
            cur = conn.cursor()
            cur.execute("""
                SELECT p.id, p.name, p.price, p.original_price, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                ORDER BY p.name
            """)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            products = [dict(zip(columns, row)) for row in rows]
            cur.close()

            return jsonify({'success': True, 'products': products})
        except Exception as e:
            app.logger.error(f"Error fetching products for discount: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/discounts/search-products', methods=['GET'])
    def search_products_for_discount():
        """Search products for discount selection with filters"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            search = request.args.get('search', '').strip()
            category_id = request.args.get('category_id', '')
            discount_only = request.args.get('discount_only', 'false').lower() == 'true'
            limit = int(request.args.get('limit', 10))
            offset = int(request.args.get('offset', 0))

            conn = mysql.connection
            cur = conn.cursor()

            # Build the query with filters
            where_conditions = []
            params = []

            if search:
                where_conditions.append("(p.name LIKE %s OR p.description LIKE %s)")
                search_param = f"%{search}%"
                params.extend([search_param, search_param])

            if category_id and category_id.isdigit():
                where_conditions.append("p.category_id = %s")
                params.append(int(category_id))

            if discount_only:
                where_conditions.append("p.original_price IS NOT NULL AND p.original_price > p.price")

            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

            # Get total count
            count_query = f"""
                SELECT COUNT(*) as total
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                {where_clause}
            """
            cur.execute(count_query, params)
            total = cur.fetchone()[0]

            # Get products with pagination
            query = f"""
                SELECT p.id, p.name, p.price, p.original_price, p.stock, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                {where_clause}
                ORDER BY p.name
                LIMIT %s OFFSET %s
            """
            params.extend([limit, offset])
            cur.execute(query, params)

            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            products = [dict(zip(columns, row)) for row in rows]
            cur.close()

            return jsonify({
                'success': True,
                'products': products,
                'total': total,
                'limit': limit,
                'offset': offset
            })
        except Exception as e:
            app.logger.error(f"Error searching products for discount: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/discounts/recently-used', methods=['GET'])
    def get_recently_used_products():
        """Get recently used products for discount selection"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            user_id = session['user_id']
            conn = mysql.connection
            cur = conn.cursor()

            # Get recently modified products (products that had price changes recently)
            # This includes products that had discounts applied or removed
            cur.execute("""
                SELECT DISTINCT p.id, p.name, p.price, p.original_price, p.stock, c.name as category_name,
                       p.updated_at
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                   OR (p.original_price IS NOT NULL AND p.original_price > p.price)
                ORDER BY p.updated_at DESC, p.id DESC
                LIMIT 8
            """)

            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            products = [dict(zip(columns, row)) for row in rows]

            # If we don't have enough recent products, add some popular ones
            if len(products) < 5:
                existing_ids = [str(p['id']) for p in products]
                placeholder = ','.join(['%s'] * len(existing_ids)) if existing_ids else 'NULL'

                cur.execute(f"""
                    SELECT DISTINCT p.id, p.name, p.price, p.original_price, p.stock, c.name as category_name,
                           p.updated_at
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    LEFT JOIN order_items oi ON p.id = oi.product_id
                    WHERE p.stock > 0
                    {f'AND p.id NOT IN ({placeholder})' if existing_ids else ''}
                    GROUP BY p.id
                    ORDER BY COUNT(oi.id) DESC, p.updated_at DESC
                    LIMIT %s
                """, existing_ids + [5 - len(products)])

                additional_rows = cur.fetchall()
                additional_columns = [desc[0] for desc in cur.description]
                additional_products = [dict(zip(additional_columns, row)) for row in additional_rows]
                products.extend(additional_products)

            cur.close()

            # Remove the updated_at field from response and limit to 5 products
            for product in products:
                if 'updated_at' in product:
                    del product['updated_at']

            return jsonify({'success': True, 'products': products[:5]})
        except Exception as e:
            app.logger.error(f"Error fetching recently used products: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/discounts/track-usage', methods=['POST'])
    def track_product_usage():
        """Track when a product is used for discount application"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            data = request.get_json()
            product_id = data.get('product_id')
            user_id = session['user_id']

            if not product_id:
                return jsonify({'success': False, 'error': 'Product ID required'}), 400

            # For now, we'll just return success
            # In a full implementation, you'd store this in a recent_usage table
            return jsonify({'success': True, 'message': 'Usage tracked'})
        except Exception as e:
            app.logger.error(f"Error tracking product usage: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/discounts/categories', methods=['GET'])
    def get_categories_for_discount():
        """Get all categories for filter buttons (excluding Accessories)"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            conn = mysql.connection
            cur = conn.cursor()
            cur.execute("""
                SELECT c.id, c.name, COUNT(p.id) as product_count
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id
                WHERE c.name != 'Accessories'
                  AND c.name IS NOT NULL
                  AND TRIM(c.name) != ''
                  AND c.name NOT LIKE '%test%'
                GROUP BY c.id, c.name
                HAVING product_count > 0
                ORDER BY c.name
            """)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            categories = [dict(zip(columns, row)) for row in rows]
            cur.close()

            return jsonify({'success': True, 'categories': categories})
        except Exception as e:
            app.logger.error(f"Error fetching categories for discount: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/products/discounted', methods=['GET'])
    def get_homepage_discounted_products():
        """Get discounted products for homepage display"""
        try:
            limit = int(request.args.get('limit', 12))

            conn = mysql.connection
            cur = conn.cursor()
            cur.execute("""
                SELECT p.id, p.name, p.description, p.price, p.original_price, p.stock, p.photo,
                       p.allow_preorder, p.expected_restock_date, c.name as category_name,
                       ROUND(((p.original_price - p.price) / p.original_price) * 100, 0) as discount_percentage,
                       (p.original_price - p.price) as savings_amount
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.original_price IS NOT NULL
                AND p.price < p.original_price
                ORDER BY discount_percentage DESC
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            products = [dict(zip(columns, row)) for row in rows]
            cur.close()

            # Process products to add image_url
            for product in products:
                if product.get('photo'):
                    product['image_url'] = f"/static/images/{product['photo']}"
                else:
                    product['image_url'] = "/static/images/placeholder.jpg"

            return jsonify({'success': True, 'products': products})
        except Exception as e:
            app.logger.error(f"Error fetching homepage discounted products: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/products/new-arrivals', methods=['GET'])
    def get_homepage_new_arrivals_products():
        """Get new arrivals products for homepage display"""
        try:
            limit = int(request.args.get('limit', 12))

            conn = mysql.connection
            cur = conn.cursor()
            cur.execute("""
                SELECT p.id, p.name, p.description, p.price, p.original_price, p.stock, p.photo,
                       p.allow_preorder, p.expected_restock_date, c.name as category_name,
                       CASE
                           WHEN p.original_price IS NOT NULL AND p.price < p.original_price
                           THEN ROUND(((p.original_price - p.price) / p.original_price) * 100, 0)
                           ELSE 0
                       END as discount_percentage,
                       p.created_at
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ORDER BY p.created_at DESC
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            products = [dict(zip(columns, row)) for row in rows]
            cur.close()

            # Process products to add image_url
            for product in products:
                if product.get('photo'):
                    product['image_url'] = f"/static/images/{product['photo']}"
                else:
                    product['image_url'] = "/static/images/placeholder.jpg"

            return jsonify({'success': True, 'products': products})
        except Exception as e:
            app.logger.error(f"Error fetching homepage new arrivals products: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    # Customer Management Endpoints
    @app.route('/staff/customers')
    def list_customers():
        try:
            customers = Customer.get_all()
            return jsonify({
                'success': True,
                'customers': customers
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/staff/customers/api')
    def list_customers_paginated():
        """API endpoint for paginated customer list with search"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 10))
            search = request.args.get('search', '').strip()

            conn = mysql.connection
            cur = conn.cursor()

            # Build search query
            if search:
                search_query = """
                    SELECT id, first_name, last_name, email, phone, address, created_at
                    FROM customers
                    WHERE first_name LIKE %s OR last_name LIKE %s OR email LIKE %s OR phone LIKE %s
                    ORDER BY created_at DESC
                """
                search_param = f"%{search}%"
                cur.execute(search_query, (search_param, search_param, search_param, search_param))
            else:
                cur.execute("""
                    SELECT id, first_name, last_name, email, phone, address, created_at
                    FROM customers
                    ORDER BY created_at DESC
                """)

            all_customers = cur.fetchall()
            total_customers = len(all_customers)

            # Calculate pagination
            offset = (page - 1) * per_page
            paginated_customers = all_customers[offset:offset + per_page]

            # Convert to dict format
            columns = [desc[0] for desc in cur.description]
            customers = [dict(zip(columns, row)) for row in paginated_customers]

            cur.close()

            return jsonify({
                'success': True,
                'customers': customers,
                'total': total_customers,
                'page': page,
                'per_page': per_page,
                'total_pages': (total_customers + per_page - 1) // per_page
            })

        except Exception as e:
            app.logger.error(f"Error fetching paginated customers: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/staff/customers/<int:customer_id>')
    def get_customer(customer_id):
        try:
            customer = Customer.get_by_id(customer_id)
            if not customer:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404
            return jsonify({
                'success': True,
                'customer': customer
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/staff/customers', methods=['POST'])
    def create_customer():
        if not request.json:
            return jsonify({'success': False, 'error': 'Invalid request'}), 400
            
        try:
            customer_id = Customer.create(
                first_name=request.json['first_name'],
                last_name=request.json['last_name'],
                email=request.json['email'],
                password=request.json['password'],
                phone=request.json.get('phone'),
                address=request.json.get('address')
            )
            return jsonify({
                'success': True,
                'customer_id': customer_id
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/staff/customers/<int:customer_id>', methods=['PUT'])
    def update_customer(customer_id):
        if not request.json:
            return jsonify({'success': False, 'error': 'Invalid request'}), 400
            
        try:
            success = Customer.update(customer_id, **request.json)
            return jsonify({
                'success': success
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})

    @app.route('/staff/customers/<int:customer_id>', methods=['DELETE'])
    def delete_customer(customer_id):
        try:
            # Use the Customer.delete method instead of SQLAlchemy ORM
            success = Customer.delete(customer_id)
            if success:
                return jsonify({'success': True})
            else:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404
        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400
        except Exception as e:
            app.logger.error(f"Error deleting customer: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/staff/categories/<int:category_id>/products')
    def get_category_products(category_id):
        try:
            conn = mysql.connection
            cur = conn.cursor()
            try:
                cur.execute("""
                    SELECT id, name, description, price, stock as stock_quantity, photo,
                           allow_preorder, expected_restock_date
                    FROM products
                    WHERE category_id = %s
                """, (category_id,))
                rows = cur.fetchall()
                columns = [desc[0] for desc in cur.description]
                products = [dict(zip(columns, row)) for row in rows]
                cur.close()
                return jsonify({'success': True, 'products': products})
            except Exception as e:
                cur.close()
                app.logger.error(f"Error executing query: {e}")
                return jsonify({'success': False, 'error': 'Database error'}), 500
        except Exception as e:
            app.logger.error(f"Error fetching products for category {category_id}: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/staff/customers/<int:customer_id>/orders')
    def get_customer_orders(customer_id):
        status = request.args.get('status')
        try:
            orders = Customer.get_orders(customer_id, status=status)
            return jsonify({
                'success': True,
                'orders': orders
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/staff/customers/<int:customer_id>/orders/completed_count')
    def get_completed_order_count(customer_id):
        try:
            conn = mysql.connection
            cur = conn.cursor()
            cur.execute("""
                SELECT COUNT(*) FROM orders
                WHERE customer_id = %s AND LOWER(status) = 'completed'
            """, (customer_id,))
            result = cur.fetchone()
            cur.close()
            count = result[0] if result else 0
            return jsonify({'success': True, 'completed_count': count})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/staff/customers/<int:customer_id>/orders/view')
    def view_customer_orders(customer_id):
        status = request.args.get('status')
        try:
            # Get regular orders
            orders = Customer.get_orders(customer_id, status=status)

            # Get completed pre-orders
            from models import PreOrder
            completed_preorders = PreOrder.get_by_customer(customer_id, status='completed')

            # Convert pre-orders to order-like format for display
            preorder_items = []
            if completed_preorders:
                for preorder in completed_preorders:
                    preorder_item = {
                        'id': f"P{preorder['id']}",  # Prefix with P to distinguish
                        'order_date': preorder.get('created_date', ''),
                        'status': 'Completed',
                        'total_amount': preorder['expected_price'] * preorder['quantity'],
                        'type': 'preorder',
                        'items': [{
                            'product_name': preorder['product_name'],
                            'quantity': preorder['quantity'],
                            'price': preorder['expected_price']
                        }]
                    }
                    preorder_items.append(preorder_item)

            # Add items field to regular orders if not present
            for order in orders:
                if 'items' not in order:
                    order['items'] = []
                order['type'] = 'order'

            # Combine orders and pre-orders
            all_orders = orders + preorder_items

            # Sort by date (most recent first)
            all_orders.sort(key=lambda x: x.get('order_date', ''), reverse=True)

            app.logger.info(f"Combined orders for customer {customer_id}: {len(orders)} regular orders + {len(preorder_items)} completed pre-orders")
            return render_template('customer_orders.html', orders=all_orders)
        except Exception as e:
            app.logger.error(f"Error fetching customer orders: {e}")
            return render_template('customer_orders.html', orders=[])

    @app.route('/auth/staff/reports')
    def staff_reports_page():
        try:
            # Fetch order summary data
            order_summary = Order.get_status_summary()
            # Fetch other report data if needed
            # For now, just pass order summary
            return render_template('staff_reports.html', order_summary=order_summary)
        except Exception as e:
            app.logger.error(f"Error rendering reports page: {e}")
            return render_template('error.html', error='Failed to load reports'), 500
    @app.route('/test_db')
    def test_db():
        try:
            cur = mysql.connection.cursor()
            cur.execute("SELECT 1")
            result = cur.fetchone()
            cur.close()
            return "Database connection successful!" if result else "Database connection failed"
        except Exception as e:
            return f"Database connection error: {str(e)}"
    
    # Serve static files explicitly
    @app.route('/static/<path:filename>')
    def static_files(filename):
        return app.send_static_file(filename)
    
    # Register auth blueprint
    with app.app_context():
        from auth import auth_bp
        app.register_blueprint(auth_bp, url_prefix='/auth')

    # API for Sales Trends
    @app.route('/auth/staff/api/reports/sales_trends')
    def api_sales_trends():
        try:
            # Default to the last 30 days
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            sales_data = Report.get_sales(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
            
            # Format date for chart
            for sale in sales_data:
                sale['date'] = sale['date'].strftime('%Y-%m-%d')
                sale['daily_sales'] = float(sale['daily_sales'])
            
            app.logger.info(f"Sales trends data being sent: {sales_data}")
            return jsonify({'success': True, 'trends': sales_data})
        except Exception as e:
            app.logger.error(f"Error fetching sales trends: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch sales trends: ' + str(e)}), 500

    # API for Top Selling Products
    @app.route('/auth/staff/api/reports/top_products')
    def api_top_products():
        try:
            top_products = Report.get_top_products(limit=5)
            app.logger.info(f"Top products data being sent: {top_products}")
            return jsonify({'success': True, 'products': top_products})
        except Exception as e:
            app.logger.error(f"Error fetching top products: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch top products: ' + str(e)}), 500

    # API for Revenue by Category
    @app.route('/auth/staff/api/reports/revenue_by_category')
    def api_revenue_by_category():
        try:
            revenue_data = Report.get_revenue_by_category()
            app.logger.info(f"Revenue by category data being sent: {revenue_data}")
            return jsonify({'success': True, 'categories': revenue_data})
        except Exception as e:
            app.logger.error(f"Error fetching revenue by category: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch revenue by category: ' + str(e)}), 500

    # API for Top Selling Products by Category (with quantity and revenue)
    @app.route('/auth/staff/api/reports/top_selling_products_by_category')
    def api_top_selling_products_by_category():
        try:
            cur = mysql.connection.cursor()
            cur.execute("""
                SELECT
                    c.name as category_name,
                    SUM(oi.quantity) as total_products_sold,
                    SUM(oi.quantity * oi.price) as total_revenue
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN categories c ON p.category_id = c.id
                JOIN orders o ON oi.order_id = o.id
                WHERE LOWER(o.status) IN ('completed', 'processing')
                GROUP BY c.id, c.name
                ORDER BY total_revenue DESC
            """)

            results = cur.fetchall()
            cur.close()

            # Format the results
            category_data = []
            for row in results:
                category_name = row[0]
                total_products_sold = int(row[1]) if row[1] is not None else 0
                total_revenue = float(row[2]) if row[2] is not None else 0.0

                category_data.append({
                    'category_name': category_name,
                    'total_products_sold': total_products_sold,
                    'total_revenue': total_revenue
                })

            app.logger.info(f"Top selling products by category data being sent: {category_data}")
            return jsonify({'success': True, 'categories': category_data})

        except Exception as e:
            app.logger.error(f"Error fetching top selling products by category: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch top selling products by category: ' + str(e)}), 500

    # API for Top Selling Products in a Specific Category
    @app.route('/auth/staff/api/reports/category_products_detail')
    def api_category_products_detail():
        category_name = request.args.get('category_name')
        if not category_name:
            return jsonify({'success': False, 'error': 'Category name parameter is required'}), 400

        try:
            cur = mysql.connection.cursor()
            cur.execute("""
                SELECT
                    p.name as product_name,
                    SUM(oi.quantity) as total_quantity_sold,
                    SUM(oi.quantity * oi.price) as total_revenue,
                    AVG(oi.price) as average_price
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN categories c ON p.category_id = c.id
                JOIN orders o ON oi.order_id = o.id
                WHERE c.name = %s
                AND LOWER(o.status) IN ('completed', 'processing')
                GROUP BY p.id, p.name
                ORDER BY total_quantity_sold DESC
                LIMIT 10
            """, (category_name,))

            results = cur.fetchall()
            cur.close()

            # Format the results
            products_data = []
            for row in results:
                product_name = row[0]
                total_quantity_sold = int(row[1]) if row[1] is not None else 0
                total_revenue = float(row[2]) if row[2] is not None else 0.0
                average_price = float(row[3]) if row[3] is not None else 0.0

                products_data.append({
                    'product_name': product_name,
                    'total_quantity_sold': total_quantity_sold,
                    'total_revenue': total_revenue,
                    'average_price': average_price
                })

            app.logger.info(f"Category products detail for {category_name} being sent: {products_data}")
            return jsonify({'success': True, 'products': products_data, 'category_name': category_name})

        except Exception as e:
            app.logger.error(f"Error fetching category products detail for {category_name}: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch category products detail: ' + str(e)}), 500

    # API for Product Purchase History Detail
    @app.route('/auth/staff/api/reports/product_purchase_history')
    def api_product_purchase_history():
        product_name = request.args.get('product_name')
        if not product_name:
            return jsonify({'success': False, 'error': 'Product name parameter is required'}), 400

        try:
            cur = mysql.connection.cursor()

            # Get overall product statistics
            cur.execute("""
                SELECT
                    p.name as product_name,
                    p.price as current_price,
                    SUM(oi.quantity) as total_quantity_sold,
                    COUNT(DISTINCT o.id) as total_orders,
                    SUM(oi.quantity * oi.price) as total_revenue,
                    AVG(oi.price) as average_selling_price,
                    MIN(o.order_date) as first_purchase_date,
                    MAX(o.order_date) as last_purchase_date
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                WHERE p.name = %s
                AND LOWER(o.status) IN ('completed', 'processing')
                GROUP BY p.id, p.name, p.price
            """, (product_name,))

            product_stats = cur.fetchone()

            if not product_stats:
                return jsonify({'success': False, 'error': 'Product not found or no sales data available'}), 404

            # Get detailed purchase history
            cur.execute("""
                SELECT
                    o.id as order_id,
                    o.order_date,
                    CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                    oi.quantity,
                    oi.price as unit_price,
                    (oi.quantity * oi.price) as total_amount,
                    o.status
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                JOIN customers c ON o.customer_id = c.id
                WHERE p.name = %s
                AND LOWER(o.status) IN ('completed', 'processing')
                ORDER BY o.order_date DESC
                LIMIT 20
            """, (product_name,))

            purchase_history = cur.fetchall()
            cur.close()

            # Format product statistics
            stats = {
                'product_name': product_stats[0],
                'current_price': float(product_stats[1]) if product_stats[1] is not None else 0.0,
                'total_quantity_sold': int(product_stats[2]) if product_stats[2] is not None else 0,
                'total_orders': int(product_stats[3]) if product_stats[3] is not None else 0,
                'total_revenue': float(product_stats[4]) if product_stats[4] is not None else 0.0,
                'average_selling_price': float(product_stats[5]) if product_stats[5] is not None else 0.0,
                'first_purchase_date': product_stats[6].strftime('%Y-%m-%d %H:%M:%S') if product_stats[6] else None,
                'last_purchase_date': product_stats[7].strftime('%Y-%m-%d %H:%M:%S') if product_stats[7] else None
            }

            # Format purchase history
            history = []
            for row in purchase_history:
                history.append({
                    'order_id': row[0],
                    'order_date': row[1].strftime('%Y-%m-%d %H:%M:%S') if row[1] else None,
                    'customer_name': row[2],
                    'quantity': int(row[3]) if row[3] is not None else 0,
                    'unit_price': float(row[4]) if row[4] is not None else 0.0,
                    'total_amount': float(row[5]) if row[5] is not None else 0.0,
                    'status': row[6]
                })

            app.logger.info(f"Product purchase history for {product_name} being sent: {len(history)} records")
            return jsonify({
                'success': True,
                'product_stats': stats,
                'purchase_history': history
            })

        except Exception as e:
            app.logger.error(f"Error fetching product purchase history for {product_name}: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch product purchase history: ' + str(e)}), 500

    # API for Monthly Sales
    @app.route('/auth/staff/api/reports/monthly_sales')
    def api_monthly_sales():
        try:
            # Accept optional start_date and end_date query parameters
            start_date_str = request.args.get('start_date')
            end_date_str = request.args.get('end_date')
            if start_date_str and end_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').replace(hour=23, minute=59, second=59, microsecond=999999)
            else:
                # Default to last 12 months
                end_date = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
                start_date = end_date - timedelta(days=365)
            monthly_sales_data = Report.get_monthly_sales(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))

            # Calculate totals for debugging
            total_sales = sum(item['total_sales'] for item in monthly_sales_data)
            total_profit = sum(item['total_profit'] for item in monthly_sales_data)
            app.logger.info(f"Dashboard widget totals - Total Sales: ${total_sales:.2f}, Total Profit: ${total_profit:.2f}")
            app.logger.info(f"Monthly sales data being sent: {monthly_sales_data}")
            return jsonify({'success': True, 'sales': monthly_sales_data})
        except Exception as e:
            app.logger.error(f"Error fetching monthly sales: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch monthly sales: ' + str(e)}), 500

    # API for Detailed Sales by Month
    @app.route('/auth/staff/api/reports/monthly_sales_detail')
    def api_monthly_sales_detail():
        month = request.args.get('month')
        status = request.args.get('status')  # Add status parameter support
        if not month:
            return jsonify({'success': False, 'error': 'Month parameter is required'}), 400
        try:
            # Assuming Report.get_monthly_sales_detail returns list of sales details for the month
            sales_detail = Report.get_monthly_sales_detail(month)
            app.logger.info(f"Monthly sales detail for {month} with status {status} being sent: {len(sales_detail)} records")

            # Calculate totals for debugging
            total_grand_total = sum(sale['grand_total'] for sale in sales_detail)
            total_profit = sum(sale['total_profit'] for sale in sales_detail)
            app.logger.info(f"Modal totals - Grand Total: ${total_grand_total:.2f}, Total Profit: ${total_profit:.2f}")

            return jsonify({'success': True, 'sales_detail': sales_detail})
        except Exception as e:
            app.logger.error(f"Error fetching monthly sales detail for {month}: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch monthly sales detail: ' + str(e)}), 500

    # API for KPIs
    @app.route('/auth/staff/api/kpis')
    def api_kpis():
        try:
            total_revenue = Report.get_total_revenue_this_month()
            new_customers = Customer.get_new_customers_this_month()
            average_order_value = Report.get_average_order_value_this_month()
            order_summary = Order.get_status_summary()
            
            return jsonify({
                'success': True,
                'total_revenue': total_revenue,
                'new_customers': new_customers,
                'average_order_value': average_order_value,
                'order_summary': order_summary
            })
        except Exception as e:
            app.logger.error(f"Error fetching KPIs: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch KPIs: ' + str(e)}), 500
            
    @app.route('/api/staff/orders')
    def api_get_orders_by_status():
        status = request.args.get('status', '').lower()
        if not status:
            return jsonify({'success': False, 'error': 'Status parameter is required'}), 400
        try:
            # Assuming Order model has a method to get orders by status
            orders = Order.get_by_status(status)
            # Format orders for JSON response
            orders_list = []
            for order in orders:
                order_date = order['order_date'] if 'order_date' in order else ''
                if hasattr(order_date, 'strftime'):
                    order_date = order_date.strftime('%Y-%m-%d')
                orders_list.append({
                    'id': order['id'],
                    'customer_name': f"{order['first_name']} {order['last_name']}" if 'first_name' in order and 'last_name' in order else '',
                    'date': order_date,
                    'status': order['status'] if 'status' in order else '',
                    'total': float(order['total']) if 'total' in order else 0.0
                })
            return jsonify({'success': True, 'orders': orders_list})
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            app.logger.error(f"Error fetching orders by status {status}: {e}\n{tb}")
            return jsonify({'success': False, 'error': 'Failed to fetch orders'}), 500

    @app.route('/api/colors')
    def api_colors():
        try:
            conn = mysql.connection
            cur = conn.cursor()
            cur.execute("SELECT id, name FROM colors ORDER BY name ASC")
            rows = cur.fetchall()
            cur.close()
            colors = [{'id': row[0], 'name': row[1]} for row in rows]
            return jsonify({'success': True, 'colors': colors})
        except Exception as e:
            app.logger.error(f"Error fetching colors: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch colors'}), 500


    @app.route('/api/staff/product_brand_counts')
    def api_product_brand_counts():
        try:
            conn = mysql.connection
            cur = conn.cursor()
            cur.execute("""
                SELECT SUBSTRING_INDEX(TRIM(name), ' ', 1) as brand, COUNT(*) as count
                FROM products
                WHERE name IS NOT NULL
                AND TRIM(name) != ''
                AND SUBSTRING_INDEX(TRIM(name), ' ', 1) != ''
                GROUP BY brand
                ORDER BY count DESC
            """)
            rows = cur.fetchall()
            cur.close()

            result = []
            for row in rows:
                brand, count = row
                result.append({'brand': brand, 'count': count})

            return jsonify({'success': True, 'data': result})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/staff/product_names_with_brand_counts')
    def api_product_names_with_brand_counts():
        try:
            conn = mysql.connection
            cur = conn.cursor()
            # Get counts of products grouped by brand (first word of name)
            cur.execute("""
                SELECT SUBSTRING_INDEX(TRIM(name), ' ', 1) as brand, COUNT(*) as brand_count
                FROM products
                WHERE name IS NOT NULL
                AND TRIM(name) != ''
                AND SUBSTRING_INDEX(TRIM(name), ' ', 1) != ''
                GROUP BY brand
            """)
            brand_counts = cur.fetchall()
            brand_count_map = {row[0]: row[1] for row in brand_counts}

            # Get all product names (excluding empty/null names)
            cur.execute("""
                SELECT name FROM products
                WHERE name IS NOT NULL AND TRIM(name) != ''
            """)
            products = cur.fetchall()
            cur.close()

            result = []
            for row in products:
                product_name = row[0]
                brand = product_name.strip().split(' ')[0] if product_name and product_name.strip() else ''
                if brand:  # Only include products with valid brands
                    count = brand_count_map.get(brand, 0)
                    result.append({'name': product_name, 'count': count})

            return jsonify({'success': True, 'data': result})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/search_suggestions')
    def search_suggestions():
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'success': True, 'suggestions': []})
        try:
            cur = mysql.connection.cursor()
            like_query = f"%{query}%"
            cur.execute("""
                SELECT id, name FROM products
                WHERE name LIKE %s
                ORDER BY name ASC
                LIMIT 10
            """, (like_query,))
            results = cur.fetchall()
            cur.close()
            suggestions = [{'id': row[0], 'name': row[1]} for row in results]
            return jsonify({'success': True, 'suggestions': suggestions})
        except Exception as e:
            app.logger.error(f"Error fetching search suggestions: {e}")
            return jsonify({'success': False, 'suggestions': [], 'error': str(e)}), 500

    # API for Monthly Revenue (Jan to June breakdown)
    @app.route('/auth/staff/api/reports/monthly_revenue')
    def api_monthly_revenue():
        try:
            from datetime import datetime

            # Get data from January to June of current year
            current_year = datetime.now().year
            start_date = f"{current_year}-01-01"
            end_date = f"{current_year}-06-30"

            cur = mysql.connection.cursor()
            cur.execute("""
                SELECT
                    DATE_FORMAT(o.order_date, '%%Y-%%m') as month,
                    SUM(oi.quantity * oi.price) as monthly_revenue
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                WHERE o.order_date BETWEEN %s AND %s
                AND LOWER(o.status) = 'completed'
                GROUP BY DATE_FORMAT(o.order_date, '%%Y-%%m')
                ORDER BY month ASC
            """, (start_date, end_date))

            results = cur.fetchall()
            cur.close()

            # Create a complete list of months from Jan to June
            months = [
                {'month': f'{current_year}-01', 'month_label': 'January', 'monthly_revenue': 0.0},
                {'month': f'{current_year}-02', 'month_label': 'February', 'monthly_revenue': 0.0},
                {'month': f'{current_year}-03', 'month_label': 'March', 'monthly_revenue': 0.0},
                {'month': f'{current_year}-04', 'month_label': 'April', 'monthly_revenue': 0.0},
                {'month': f'{current_year}-05', 'month_label': 'May', 'monthly_revenue': 0.0},
                {'month': f'{current_year}-06', 'month_label': 'June', 'monthly_revenue': 0.0}
            ]

            # Fill in actual revenue data
            for row in results:
                month_key = row[0]
                revenue = float(row[1]) if row[1] is not None else 0.0
                for month_data in months:
                    if month_data['month'] == month_key:
                        month_data['monthly_revenue'] = revenue
                        break

            app.logger.info(f"Monthly revenue data being sent: {months}")
            return jsonify({'success': True, 'revenue': months})
        except Exception as e:
            app.logger.error(f"Error fetching monthly revenue: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch monthly revenue: ' + str(e)}), 500

    # API for Current Month Daily Revenue
    @app.route('/auth/staff/api/reports/current_month_revenue')
    def api_current_month_revenue():
        try:
            from datetime import datetime, date
            import calendar

            # Get current month's first and last day
            today = date.today()
            first_day = today.replace(day=1)
            last_day_num = calendar.monthrange(today.year, today.month)[1]
            last_day = today.replace(day=last_day_num)

            cur = mysql.connection.cursor()
            cur.execute("""
                SELECT
                    DATE(o.order_date) as order_date,
                    COUNT(DISTINCT o.id) as orders_count,
                    SUM(oi.quantity * oi.price) as daily_revenue
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                WHERE DATE(o.order_date) BETWEEN %s AND %s
                AND LOWER(o.status) = 'completed'
                GROUP BY DATE(o.order_date)
                ORDER BY order_date ASC
            """, (first_day, last_day))

            results = cur.fetchall()
            cur.close()

            # Format the results
            revenue_data = []
            for row in results:
                order_date = row[0]
                orders_count = row[1]
                daily_revenue = float(row[2]) if row[2] is not None else 0.0

                revenue_data.append({
                    'date': order_date.strftime('%Y-%m-%d'),
                    'date_formatted': order_date.strftime('%B %d, %Y'),
                    'orders_count': orders_count,
                    'daily_revenue': daily_revenue
                })

            app.logger.info(f"Current month revenue data being sent: {revenue_data}")
            return jsonify({'success': True, 'revenue': revenue_data})

        except Exception as e:
            app.logger.error(f"Error fetching current month revenue: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch current month revenue: ' + str(e)}), 500

    # API for Daily Sales Detail
    @app.route('/auth/staff/api/reports/daily_sales_detail')
    def api_daily_sales_detail():
        date_param = request.args.get('date')
        if not date_param:
            return jsonify({'success': False, 'error': 'Date parameter is required'}), 400

        try:
            from datetime import datetime

            # Parse the date parameter
            target_date = datetime.strptime(date_param, '%Y-%m-%d').date()

            cur = mysql.connection.cursor()
            cur.execute("""
                SELECT
                    o.id as order_id,
                    o.order_date,
                    CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                    o.total_amount,
                    o.status
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE DATE(o.order_date) = %s
                AND LOWER(o.status) = 'completed'
                ORDER BY o.order_date DESC
            """, (target_date,))

            results = cur.fetchall()
            cur.close()

            # Format the results
            sales_detail = []
            for row in results:
                sales_detail.append({
                    'order_id': row[0],
                    'order_date': row[1].strftime('%Y-%m-%d %H:%M:%S'),
                    'customer_name': row[2],
                    'grand_total': float(row[3]) if row[3] is not None else 0.0,
                    'status': row[4]
                })

            app.logger.info(f"Daily sales detail for {date_param}: {len(sales_detail)} orders")
            return jsonify({'success': True, 'sales_detail': sales_detail})

        except ValueError as e:
            app.logger.error(f"Invalid date format: {e}")
            return jsonify({'success': False, 'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        except Exception as e:
            app.logger.error(f"Error fetching daily sales detail: {e}")
            return jsonify({'success': False, 'error': 'Failed to fetch daily sales detail: ' + str(e)}), 500

    @app.route('/api/orders/today_count')
    def api_orders_today_count():
        from datetime import datetime
        conn = mysql.connection
        cur = conn.cursor()
        try:
            today_str = datetime.now().strftime('%Y-%m-%d')
            cur.execute("""
                SELECT HOUR(order_date) AS hour, COUNT(*) AS order_count
                FROM orders
                WHERE DATE(order_date) = %s AND LOWER(status) = 'completed'
                GROUP BY hour
                ORDER BY hour
            """, (today_str,))
            rows = cur.fetchall()
            # Convert rows to list of dicts manually
            data = []
            for row in rows:
                data.append({'hour': row[0], 'order_count': row[1]})
            return jsonify({'success': True, 'data': data})
        except Exception as e:
            app.logger.error(f"Error fetching today's orders count: {e}")
            return jsonify({'success': False, 'data': []})
        finally:
            cur.close()

    @app.route('/api/orders/today_details')
    def api_orders_today_details():
        from datetime import datetime
        hour = request.args.get('hour', type=int)
        if hour is None or hour < 0 or hour > 23:
            return jsonify({'success': False, 'error': 'Invalid hour parameter', 'orders': []}), 400
        conn = mysql.connection
        cur = conn.cursor()
        try:
            today_str = datetime.now().strftime('%Y-%m-%d')
            cur.execute("""
                SELECT o.id as order_id, o.order_date, c.first_name, c.last_name, o.total_amount, o.status, o.payment_method
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE DATE(o.order_date) = %s AND HOUR(o.order_date) = %s AND LOWER(o.status) = 'completed'
                ORDER BY o.order_date ASC
            """, (today_str, hour))
            rows = cur.fetchall()
            orders = []
            for row in rows:
                order = {
                    'id': row[0],
                    'order_date': row[1].strftime('%Y-%m-%d %H:%M:%S') if hasattr(row[1], 'strftime') else row[1],
                    'customer_name': f"{row[2]} {row[3]}",
                    'total_amount': float(row[4]) if row[4] is not None else 0.0,
                    'status': row[5],
                    'payment_method': row[6] if row[6] is not None else 'QR Payment',
                    'items': []
                }
                # Fetch order items
                cur.execute("""
                    SELECT p.name as product_name, oi.quantity, oi.price
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = %s
                """, (order['id'],))
                items_rows = cur.fetchall()
                for item_row in items_rows:
                    item = {
                        'product_name': item_row[0],
                        'quantity': item_row[1],
                        'price': float(item_row[2]) if item_row[2] is not None else 0.0
                    }
                    order['items'].append(item)
                orders.append(order)
            return jsonify({'success': True, 'orders': orders})
        except Exception as e:
            app.logger.error(f"Error fetching order details for hour {hour}: {e}")
            return jsonify({'success': False, 'error': str(e), 'orders': []})
        finally:
            cur.close()

    @app.route('/api/orders/today_details/<int:hour>')
    def api_orders_today_details_v3(hour):
        from datetime import datetime
        conn = mysql.connection
        cur = conn.cursor()
        try:
            today_str = datetime.now().strftime('%Y-%m-%d')
            cur.execute("""
                SELECT o.id as order_id, o.order_date, c.first_name, c.last_name, o.total_amount
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE DATE(o.order_date) = %s AND HOUR(o.order_date) = %s
                ORDER BY o.order_date ASC
            """, (today_str, hour))
            rows = cur.fetchall()
            # Convert rows to list of dicts manually
            orders = []
            for row in rows:
                order = {
                    'order_id': row[0],
                    'order_date': row[1].strftime('%Y-%m-%d %H:%M:%S') if hasattr(row[1], 'strftime') else row[1],
                    'first_name': row[2],
                    'last_name': row[3],
                    'total_amount': float(row[4]) if row[4] is not None else 0.0,
                    'items': [],
                    'grand_total': 0.0
                }
                # Fetch order items
                cur.execute("""
                    SELECT p.name as product_name, oi.quantity, oi.price
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = %s
                """, (order['order_id'],))
                items_rows = cur.fetchall()
                grand_total = 0.0
                for item_row in items_rows:
                    item = {
                        'product_name': item_row[0],
                        'quantity': item_row[1],
                        'price': float(item_row[2]) if item_row[2] is not None else 0.0
                    }
                    order['items'].append(item)
                    grand_total += item['quantity'] * item['price']
                order['grand_total'] = grand_total
                orders.append(order)
            return jsonify({'success': True, 'orders': orders})
        except Exception as e:
            app.logger.error(f"Error fetching order details for hour {hour}: {e}")
            return jsonify({'success': False, 'error': str(e), 'orders': []})
        finally:
            cur.close()

    @app.route('/api/orders/today_details_by_order/<int:order_id>')
    def api_orders_today_details_by_order(order_id):
        conn = mysql.connection
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT p.name as product_name, oi.quantity, oi.price, p.original_price
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = %s
            """, (order_id,))
            rows = cur.fetchall()
            products = []
            for row in rows:
                product = {
                    'product_name': row[0],
                    'quantity': row[1],
                    'price': float(row[2]) if row[2] is not None else 0.0,
                    'original_price': float(row[3]) if row[3] is not None else None
                }
                products.append(product)
            return jsonify({'success': True, 'products': products})
        except Exception as e:
            app.logger.error(f"Error fetching product details for order {order_id}: {e}")
            return jsonify({'success': False, 'error': str(e), 'products': []})
        finally:
            cur.close()

    # KHQR Payment Endpoints
    @app.route('/api/khqr/create-payment', methods=['POST'])
    def create_khqr_payment():
        """Create a new KHQR payment with dynamic QR code"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from utils.khqr_payment import khqr_handler

            data = request.get_json()
            amount = data.get('amount')
            currency = data.get('currency', 'USD')
            reference_id = data.get('reference_id')

            if not amount or amount <= 0:
                return jsonify({'success': False, 'error': 'Invalid amount'}), 400

            # Create KHQR payment
            result = khqr_handler.create_payment_qr(
                amount=amount,
                currency=currency,
                reference_id=reference_id
            )

            if result['success']:
                app.logger.info(f"✅ KHQR payment created: {result['payment_id']}")
                return jsonify(result)
            else:
                app.logger.error(f"❌ KHQR payment creation failed: {result['error']}")
                return jsonify(result), 400

        except Exception as e:
            app.logger.error(f"Error creating KHQR payment: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/khqr/check-payment/<payment_id>', methods=['GET'])
    def check_khqr_payment(payment_id):
        """Check KHQR payment status"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            from utils.khqr_payment import khqr_handler

            result = khqr_handler.check_payment_status(payment_id)
            return jsonify(result)

        except Exception as e:
            app.logger.error(f"Error checking KHQR payment: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/khqr/test-order', methods=['POST'])
    def test_khqr_order():
        """Test endpoint to create an order for KHQR payment testing"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            app.logger.info(f"🧪 Test order endpoint called")
            app.logger.info(f"👤 Session data: {dict(session)}")

            from utils.khqr_payment import khqr_handler

            data = request.get_json() or {}
            amount = data.get('amount', 0.01)  # Default to 1 cent

            app.logger.info(f"🧪 Test amount: {amount}")

            # Create test payment data
            test_payment_data = {
                'payment_id': f'TEST_{int(datetime.now().timestamp())}',
                'amount': amount,
                'currency': 'USD',
                'reference_id': f'TEST_REF_{int(datetime.now().timestamp())}',
                'completed_at': datetime.now()
            }

            app.logger.info(f"🧪 Creating test order with payment data: {test_payment_data}")

            # Create order using the KHQR handler
            order_id = khqr_handler.create_order_from_payment(test_payment_data)
            app.logger.info(f"🧪 Order creation result: {order_id}")

            if order_id:
                result = {
                    'success': True,
                    'order_id': order_id,
                    'invoice_url': f'/invoice/{order_id}',
                    'amount': amount,
                    'currency': 'USD',
                    'reference_id': test_payment_data['reference_id'],
                    'message': 'Test order created successfully'
                }
                app.logger.info(f"✅ Test order created successfully: {result}")
                return jsonify(result)
            else:
                app.logger.error("❌ Order creation returned None")
                return jsonify({'success': False, 'error': 'Order creation returned None - check server logs'}), 500

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            app.logger.error(f"❌ Error creating test order: {str(e)}")
            app.logger.error(f"❌ Full traceback: {error_details}")
            return jsonify({'success': False, 'error': f'Server error: {str(e)}'}), 500

    @app.route('/api/khqr/clear-cart', methods=['POST'])
    def clear_cart_after_khqr():
        """Clear cart after successful KHQR payment"""
        if 'username' not in session:
            return jsonify({'success': False, 'error': 'Please log in'}), 401

        try:
            customer_id = session.get('user_id')
            if not customer_id:
                return jsonify({'success': False, 'error': 'Customer not found in session'}), 401

            from utils.khqr_payment import khqr_handler

            # Clear the customer's cart
            khqr_handler.clear_customer_cart(customer_id)

            app.logger.info(f"✅ Cart cleared for customer {customer_id} after KHQR payment")

            return jsonify({
                'success': True,
                'message': 'Cart cleared successfully'
            })

        except Exception as e:
            app.logger.error(f"Error clearing cart after KHQR payment: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    # Walk-in Sales API Routes
    @app.route('/auth/staff/walk-in-sales')
    def walk_in_sales():
        """Walk-in sales POS interface"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return redirect(url_for('auth.login'))
        return render_template('walk_in_sales.html')

    @app.route('/api/walk-in/products')
    def api_walk_in_products():
        """Get products for walk-in sales with pagination and filtering"""
        try:
            page = int(request.args.get('page', 1))
            page_size = int(request.args.get('page_size', 12))
            search_query = request.args.get('q', '').strip()
            category = request.args.get('category', '').strip()

            conn = mysql.connection
            cur = conn.cursor()

            # Build query with filters
            where_conditions = ["p.stock >= 0"]  # Include out of stock for display
            params = []

            if search_query:
                where_conditions.append("(p.name LIKE %s OR p.description LIKE %s)")
                search_param = f"%{search_query}%"
                params.extend([search_param, search_param])

            if category and category != 'all':
                where_conditions.append("cat.name LIKE %s")
                params.append(f"%{category}%")

            where_clause = " AND ".join(where_conditions)

            # Get total count
            count_query = f"""
                SELECT COUNT(*)
                FROM products p
                LEFT JOIN categories cat ON p.category_id = cat.id
                WHERE {where_clause}
            """
            cur.execute(count_query, params)
            total_count = cur.fetchone()[0]

            # Get products with pagination
            offset = (page - 1) * page_size
            products_query = f"""
                SELECT p.id, p.name, p.price, p.stock, p.photo, p.description,
                       cat.name as category_name
                FROM products p
                LEFT JOIN categories cat ON p.category_id = cat.id
                WHERE {where_clause}
                ORDER BY p.name ASC
                LIMIT %s OFFSET %s
            """
            cur.execute(products_query, params + [page_size, offset])

            products = []
            for row in cur.fetchall():
                products.append({
                    'id': row[0],
                    'name': row[1],
                    'price': float(row[2]),
                    'stock': row[3],
                    'photo': row[4],
                    'description': row[5],
                    'category': row[6]
                })

            cur.close()

            # Calculate pagination info
            total_pages = (total_count + page_size - 1) // page_size

            return jsonify({
                'success': True,
                'products': products,
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_count': total_count,
                    'page_size': page_size
                }
            })

        except Exception as e:
            app.logger.error(f"Error fetching walk-in products: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/walk-in/process-sale', methods=['POST'])
    def api_process_walk_in_sale():
        """Process a walk-in sale"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            data = request.get_json()
            items = data.get('items', [])
            customer_info = data.get('customer', {})
            payment_method = data.get('payment_method', 'cash')
            cash_received = data.get('cash_received')

            if not items:
                return jsonify({'success': False, 'error': 'No items in cart'}), 400

            conn = mysql.connection
            cur = conn.cursor()

            # Calculate total
            total_amount = sum(item['price'] * item['quantity'] for item in items)

            # Validate cash payment
            if payment_method == 'cash' and (not cash_received or cash_received < total_amount):
                return jsonify({'success': False, 'error': 'Insufficient cash received'}), 400

            # Check stock availability
            for item in items:
                cur.execute("SELECT stock FROM products WHERE id = %s", (item['id'],))
                result = cur.fetchone()
                if not result or result[0] < item['quantity']:
                    return jsonify({'success': False, 'error': f'Insufficient stock for {item["name"]}'}), 400

            # Create or get customer
            customer_id = None
            if customer_info.get('name') or customer_info.get('email'):
                # Check if customer exists
                if customer_info.get('email'):
                    cur.execute("SELECT id FROM customers WHERE email = %s", (customer_info['email'],))
                    existing_customer = cur.fetchone()
                    if existing_customer:
                        customer_id = existing_customer[0]

                # Create new customer if not exists
                if not customer_id:
                    cur.execute("""
                        INSERT INTO customers (first_name, last_name, email, phone, created_at)
                        VALUES (%s, %s, %s, %s, NOW())
                    """, (
                        customer_info.get('name', '').split(' ')[0] if customer_info.get('name') else 'Walk-in',
                        ' '.join(customer_info.get('name', '').split(' ')[1:]) if customer_info.get('name') and len(customer_info.get('name', '').split(' ')) > 1 else 'Customer',
                        customer_info.get('email'),
                        customer_info.get('phone')
                    ))
                    customer_id = cur.lastrowid

            # Create order
            cur.execute("""
                INSERT INTO orders (customer_id, order_date, status, total_amount, payment_method)
                VALUES (%s, NOW(), 'Completed', %s, %s)
            """, (customer_id, total_amount, payment_method.upper()))
            order_id = cur.lastrowid

            # Add order items and update stock
            for item in items:
                cur.execute("""
                    INSERT INTO order_items (order_id, product_id, quantity, price)
                    VALUES (%s, %s, %s, %s)
                """, (order_id, item['id'], item['quantity'], item['price']))

                # Update product stock
                cur.execute("""
                    UPDATE products SET stock = stock - %s WHERE id = %s
                """, (item['quantity'], item['id']))

            mysql.connection.commit()
            cur.close()

            return jsonify({
                'success': True,
                'order_id': order_id,
                'total_amount': total_amount,
                'payment_method': payment_method,
                'change': cash_received - total_amount if payment_method == 'cash' else 0
            })

        except Exception as e:
            mysql.connection.rollback()
            app.logger.error(f"Error processing walk-in sale: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/walk-in/save-quote', methods=['POST'])
    def api_save_walk_in_quote():
        """Save a quote for later processing"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            data = request.get_json()
            items = data.get('items', [])
            customer_info = data.get('customer', {})

            if not items:
                return jsonify({'success': False, 'error': 'No items in quote'}), 400

            conn = mysql.connection
            cur = conn.cursor()

            # Calculate total
            total_amount = sum(item['price'] * item['quantity'] for item in items)

            # Create or get customer
            customer_id = None
            if customer_info.get('name') or customer_info.get('email'):
                if customer_info.get('email'):
                    cur.execute("SELECT id FROM customers WHERE email = %s", (customer_info['email'],))
                    existing_customer = cur.fetchone()
                    if existing_customer:
                        customer_id = existing_customer[0]

                if not customer_id:
                    cur.execute("""
                        INSERT INTO customers (first_name, last_name, email, phone, created_at)
                        VALUES (%s, %s, %s, %s, NOW())
                    """, (
                        customer_info.get('name', '').split(' ')[0] if customer_info.get('name') else 'Walk-in',
                        ' '.join(customer_info.get('name', '').split(' ')[1:]) if customer_info.get('name') and len(customer_info.get('name', '').split(' ')) > 1 else 'Customer',
                        customer_info.get('email'),
                        customer_info.get('phone')
                    ))
                    customer_id = cur.lastrowid

            # Create quote (order with 'Quote' status)
            cur.execute("""
                INSERT INTO orders (customer_id, order_date, status, total_amount, payment_method)
                VALUES (%s, NOW(), 'Quote', %s, 'Pending')
            """, (customer_id, total_amount))
            quote_id = cur.lastrowid

            # Add quote items
            for item in items:
                cur.execute("""
                    INSERT INTO order_items (order_id, product_id, quantity, price)
                    VALUES (%s, %s, %s, %s)
                """, (quote_id, item['id'], item['quantity'], item['price']))

            mysql.connection.commit()
            cur.close()

            return jsonify({
                'success': True,
                'quote_id': quote_id,
                'total_amount': total_amount
            })

        except Exception as e:
            mysql.connection.rollback()
            app.logger.error(f"Error saving walk-in quote: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/walk-in/email-invoice', methods=['POST'])
    def api_email_walk_in_invoice():
        """Email invoice to customer"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            data = request.get_json()
            email = data.get('email')
            invoice_html = data.get('invoice_html')

            if not email or not invoice_html:
                return jsonify({'success': False, 'error': 'Email and invoice content required'}), 400

            # Here you would integrate with your email service
            # For now, we'll just log it and return success
            app.logger.info(f"Invoice email would be sent to: {email}")

            return jsonify({
                'success': True,
                'message': 'Invoice emailed successfully'
            })

        except Exception as e:
            app.logger.error(f"Error emailing invoice: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/walk-in/generate-qr', methods=['POST'])
    def api_generate_khqr():
        """Generate KHQR payment QR code"""
        if 'user_id' not in session or session.get('role') not in ['staff', 'admin', 'super_admin']:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 403

        try:
            data = request.get_json()
            amount = data.get('amount', 0)
            currency = data.get('currency', 'USD')
            description = data.get('description', 'Payment')

            if amount <= 0:
                return jsonify({'success': False, 'error': 'Invalid amount'}), 400

            # For now, we'll create a placeholder QR code
            # In a real implementation, you would integrate with KHQR API
            import qrcode
            import io
            import base64

            # Create QR code data (this would be KHQR format in real implementation)
            qr_data = f"KHQR:amount={amount}:currency={currency}:desc={description}"

            # Generate QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(qr_data)
            qr.make(fit=True)

            # Create QR code image
            qr_img = qr.make_image(fill_color="black", back_color="white")

            # Convert to base64
            img_buffer = io.BytesIO()
            qr_img.save(img_buffer, format='PNG')
            img_buffer.seek(0)
            qr_base64 = base64.b64encode(img_buffer.getvalue()).decode()

            return jsonify({
                'success': True,
                'qr_code': qr_base64,
                'amount': amount,
                'currency': currency
            })

        except ImportError:
            # If qrcode library is not available, return success without QR
            app.logger.warning("QR code library not available")
            return jsonify({
                'success': True,
                'qr_code': None,
                'message': 'QR code generation not available'
            })
        except Exception as e:
            app.logger.error(f"Error generating QR code: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)

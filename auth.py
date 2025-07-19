from flask import Blueprint, render_template, request, redirect, url_for, flash, session, abort, current_app, jsonify
from werkzeug.security import check_password_hash
from models import User, Product, Order, Report, get_db, Supplier, db
from functools import wraps

auth_bp = Blueprint('auth', __name__, template_folder='templates')

from models import Product, Order
import datetime

def staff_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('role') not in ['staff', 'admin', 'super_admin']:
            abort(403)
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('role') not in ['admin', 'super_admin']:
            abort(403)
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/api/staff/notifications')
@staff_required
def staff_notifications():
    try:
        current_app.logger.info("API /api/staff/notifications called")
        # Fetch low stock products as notifications
        low_stock_products = Product.get_low_stock_products()  # Assuming this method exists
        current_app.logger.info(f"Low stock products fetched: {low_stock_products}")
        notifications = []
        for product in low_stock_products:
            notifications.append({
                'type': 'low_stock',
                'message': f"Low stock alert: {product['name']} has only {product['stock']} items left.",
                'product_id': product['id']
            })
        current_app.logger.info(f"Notifications prepared: {notifications}")
        return jsonify({'success': True, 'notifications': notifications})
    except Exception as e:
        current_app.logger.error(f"Error in /api/staff/notifications: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        
        if not username or not password:
            flash('Username and password are required')
            return redirect(url_for('auth.login'))
            
        try:
            user = User.get_by_username(username)
            current_app.logger.info(f"Login attempt for user: {username}, user data: {user}")
            
            if not user:
                from models import Customer
                customer = None
                # Check if the username is an email
                if '@' in username:
                    customer = Customer.get_by_name_or_email(None, None, username)
                    current_app.logger.info(f"Login attempt for customer (by email): {username}, customer data: {customer}")
                
                if not customer:
                    # If not found by email, try to find customer by splitting username into first and last name
                    name_parts = username.split()
                    if len(name_parts) >= 2:
                        first_name = name_parts[0]
                        last_name = ' '.join(name_parts[1:])
                        customer = Customer.get_by_name_or_email(first_name, last_name, None)
                        current_app.logger.info(f"Login attempt for customer (by name): {username}, customer data: {customer}")
                        if not customer:
                            # Try swapping first and last name
                            customer = Customer.get_by_name_or_email(last_name, first_name, None)
                            current_app.logger.info(f"Swapped name login attempt for customer: {username}, customer data: {customer}")
                    else:
                        # If only one part, try as first name with no last name
                        first_name = username
                        customer = Customer.get_by_name_or_email(first_name, '', None)
                        current_app.logger.info(f"Login attempt for customer (single name): {username}, customer data: {customer}")

                if not customer:
                    flash('Invalid username or password')
                    return redirect(url_for('auth.login'))
                # Verify password for customer
                current_app.logger.info(f"Customer stored password: {customer['password']}")
                current_app.logger.info(f"Provided password: {password}")
                password_match = check_password_hash(customer['password'], password)
                
                # If check_password_hash fails and the stored password is not a scrypt hash (length < 60),
                # try direct comparison (for older, unhashed passwords)
                if not password_match and not customer['password'].startswith('scrypt:'):
                    password_match = (customer['password'] == password)
                
                current_app.logger.info(f"Final password match result for customer {customer['email']}: {password_match}")

                if password_match:
                    session['user_id'] = customer['id']
                    session['username'] = f"{customer['first_name']} {customer['last_name']}"
                    session['role'] = 'customer'
                    current_app.logger.info(f"Customer logged in: {session['username']}")
                    return redirect(url_for('show_dashboard'))
                else:
                    flash('Invalid username or password')
                    return redirect(url_for('auth.login'))
                
            if (check_password_hash(user['password'], password) or
                (len(user['password']) < 60 and user['password'] == password)):

                session['user_id'] = user['id']

                # Check if this is a staff user (has username and role fields) or customer
                if 'username' in user and 'role' in user:
                    # This is a staff/admin user
                    session['username'] = user['username']
                    session['role'] = user['role'].strip().lower()
                    current_app.logger.info(f"Staff user logged in: {session['username']}, role: {session['role']}")

                    if session['role'] in ['staff', 'admin', 'super_admin']:
                        return redirect(url_for('auth.staff_dashboard'))
                    return redirect(url_for('app.root'))
                else:
                    # This is a customer
                    session['username'] = f"{user['first_name']} {user['last_name']}"
                    session['role'] = 'customer'
                    current_app.logger.info(f"Customer logged in: {session['username']}")
                    return redirect(url_for('show_dashboard'))
                
            flash('Invalid username or password')
            
        except Exception as e:
            current_app.logger.error(f"Login failed for user {username}: {e}")
            flash('Login failed. Please try again.')
    
    return render_template('login.html')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    from werkzeug.security import generate_password_hash
    from models import Customer
    if request.method == 'POST':
        print("DEBUG: Entered POST method of register")
        first_name = request.form.get('first_name', '').strip()
        last_name = request.form.get('last_name', '').strip()
        email = request.form.get('email', '').strip()
        phone = request.form.get('phone', '').strip()
        address = request.form.get('address', '').strip()
        password = request.form.get('password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()

        print(f"DEBUG: Received form data: first_name={first_name}, last_name={last_name}, email={email}, phone={phone}, address={address}, password={'***' if password else ''}, confirm_password={'***' if confirm_password else ''}")

        # Basic validation
        if not first_name or not last_name or not email or not password or not confirm_password:
            print("DEBUG: Validation failed - missing required fields")
            flash('Please fill in all required fields.')
            return render_template('Register.html', first_name=first_name, last_name=last_name, email=email, phone=phone, address=address)

        if password != confirm_password:
            print("DEBUG: Validation failed - passwords do not match")
            error_message = 'Passwords do not match.'
            return render_template('Register.html', first_name=first_name, last_name=last_name, email=email, phone=phone, address=address, error=error_message)

        # Check if email already exists
        existing_customer = Customer.get_by_name_or_email('', '', email)
        if existing_customer:
            print("DEBUG: Validation failed - email already registered")
            flash('Email already registered.')
            return render_template('Register.html', first_name=first_name, last_name=last_name, email=email, phone=phone, address=address)

        # Hash password
        hashed_password = generate_password_hash(password)

       # Create new customer
        try:
            print(f"DEBUG: Attempting to create customer with first_name={first_name}, last_name={last_name}, email={email}, phone={phone}, address={address}")
            current_app.logger.info(f"Attempting to create customer with first_name={first_name}, last_name={last_name}, email={email}, phone={phone}, address={address}")
            customer_id = Customer.create(first_name, last_name, email, hashed_password, phone, address)
            print(f"DEBUG: Customer created with ID: {customer_id}")
            current_app.logger.info(f"Customer created with ID: {customer_id}")
            flash('Registration successful. Please log in.')
            return redirect(url_for('auth.login'))
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            print(f"DEBUG: Error during registration: {str(e)}\nTraceback: {tb}")
            current_app.logger.error(f"Error during registration: {str(e)}\nTraceback: {tb}")
            error_message = f"Error during registration: {str(e)}\n{tb}"
            return render_template('Register.html', first_name=first_name, last_name=last_name, email=email, phone=phone, address=address, error=error_message)
    else:
        products = Product.get_all()
        return render_template('Register.html', products=products)

@auth_bp.route('/admin/dashboard')
@staff_required
def staff_dashboard():
    from models import Product, Order, Customer
    from datetime import datetime
    
    # Get products and orders
    products = Product.get_all()
    pending_orders = Order.get_by_status('pending')
    pending_orders_count = len(pending_orders) if pending_orders else 0
    
    # Get customer data
    customers = Customer.get_all()
    
    # New customers count (removed date-based calculation)
    new_customers_count = 0
    
    return render_template('staff_dashboard.html', 
                         products=products,
                         pending_orders_count=pending_orders_count,
                         customers=customers,
                         new_customers_count=new_customers_count)

@auth_bp.route('/staff/dashboard/inventory-data')
@staff_required
def inventory_data():
    from models import Product
    products = Product.get_all()
    in_stock = len([p for p in products if p.stock >= 5])
    low_stock = len([p for p in products if 0 < p.stock < 5])
    out_of_stock = len([p for p in products if p.stock == 0])
    
    return jsonify({
        'success': True,
        'in_stock': in_stock,
        'low_stock': low_stock,
        'out_of_stock': out_of_stock,
        'total': len(products)
    })

@auth_bp.route('/staff/orders')
@staff_required
def staff_orders():
    try:
        status = request.args.get('status')
        date = request.args.get('date')
        search = request.args.get('search', '').strip()
        # Validate search length 1 to 20 if not empty
        if search and not (1 <= len(search) <= 20):
            return render_template('staff_orders.html', orders=[], search=search, error="Search query must be 1 to 20 characters")
        current_app.logger.info(f"Fetching orders with status: {status}, date: {date}, search: {search}")
        orders = Order.get_by_status(status) if status else Order.get_by_status('all')
        current_app.logger.info(f"Fetched {len(orders)} orders")
        # Pre-format order_date as string for template
        for order in orders:
            if 'order_date' in order and hasattr(order['order_date'], 'strftime'):
                order['order_date'] = order['order_date'].strftime('%Y-%m-%d')
        return render_template('staff_orders.html', orders=orders, search=search)
    except ValueError as ve:
        current_app.logger.error(f"Validation error fetching orders: {str(ve)}")
        return render_template('staff_orders.html', orders=[], search=search, error=str(ve))
    except Exception as e:
        current_app.logger.error(f"Error fetching orders: {str(e)}")
        abort(500)

@auth_bp.route('/staff/orders/<int:order_id>/details')
@staff_required
def order_details(order_id):
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        
        try:
            # Get order info
            cur.execute("""
                SELECT o.*, c.first_name, c.last_name, c.email, c.phone
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE o.id = %s
            """, (order_id,))
            order = cur.fetchone()
            
            # Get order items with total amount per item
            cur.execute("""
                SELECT oi.*, p.name as product_name, (oi.quantity * oi.price) as total_amount
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = %s
            """, (order_id,))
            items = cur.fetchall()
            
            if not order:
                abort(404)
                
            return render_template('order_details.html', order=order, items=items)
            
        finally:
            cur.close()
            conn.close()
        
    except Exception as e:
        current_app.logger.error(f"Error fetching order details: {str(e)}")
        abort(500)

# New API route to fetch customer purchase details under a given amount
@auth_bp.route('/staff/api/customer/<int:customer_id>/purchase_details')
@staff_required
def customer_purchase_details(customer_id):
    try:
        amount = float(request.args.get('amount', 0))
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            # Query to get products and quantities customer bought under the amount
            cur.execute("""
                SELECT p.name as product_name, SUM(oi.quantity) as total_quantity
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE o.customer_id = %s AND o.total_amount <= %s
                GROUP BY p.name
            """, (customer_id, amount))
            purchase_details = cur.fetchall()
            return jsonify({'success': True, 'purchase_details': purchase_details})
        finally:
            cur.close()
            conn.close()
    except Exception as e:
        current_app.logger.error(f"Error fetching customer purchase details: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/staff/api/order/<int:order_id>/details')
@staff_required
def order_items_details(order_id):
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT oi.product_id, p.name as product_name, oi.quantity, oi.price, p.original_price
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = %s
            """, (order_id,))
            order_details = cur.fetchall()
            for item in order_details:
                item['price'] = float(item['price']) # Ensure price is a float
                item['original_price'] = float(item['original_price']) if item['original_price'] is not None else None
            return jsonify({'success': True, 'order_details': order_details})
        finally:
            cur.close()
            conn.close()
    except Exception as e:
        current_app.logger.error(f"Error fetching order items details for order {order_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/staff/inventory')
@staff_required
def staff_inventory():
    from models import Product
    brands = Product.get_distinct_brands()
    current_app.logger.info(f"Brands in auth.py: {brands}")
    # Render inventory page without products, products will be fetched via API
    return render_template('staff_inventory.html', brands=brands)

@auth_bp.route('/staff/inventory/search')
@staff_required
def inventory_search():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'success': False, 'products': [], 'error': 'Empty search query'})
    products = Product.search(query)
    return jsonify({'success': True, 'products': products})

@auth_bp.route('/api/staff/inventory', methods=['GET'])
@staff_required
def api_staff_inventory():
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 10))
        sort_by = request.args.get('sort_by', 'id')
        sort_dir = request.args.get('sort_dir', 'asc').lower()
        brand_filter = request.args.get('brand', '').strip()
        if sort_dir not in ['asc', 'desc']:
            sort_dir = 'asc'

        offset = (page - 1) * page_size

        valid_sort_columns = ['id', 'name', 'price', 'original_price', 'stock']
        if sort_by not in valid_sort_columns:
            sort_by = 'id'

        conn = get_db()
        cur = conn.cursor(dictionary=True)

        # Get total count with optional brand filter
        if brand_filter:
            count_query = "SELECT COUNT(*) as total FROM products WHERE name LIKE %s"
            count_params = (f"{brand_filter}%",)
            cur.execute(count_query, count_params)
        else:
            cur.execute("SELECT COUNT(*) as total FROM products")
        total = cur.fetchone()['total']

        # Query with pagination, sorting, and optional brand filter
        if brand_filter:
            query = f"SELECT id, name, description, price, stock, original_price FROM products WHERE name LIKE %s ORDER BY {sort_by} {sort_dir} LIMIT %s OFFSET %s"
            params = (f"{brand_filter}%", page_size, offset)
            cur.execute(query, params)
        else:
            query = f"SELECT id, name, description, price, stock, original_price FROM products ORDER BY {sort_by} {sort_dir} LIMIT %s OFFSET %s"
            cur.execute(query, (page_size, offset))
        products = cur.fetchall()

        cur.close()

        return jsonify({
            'success': True,
            'data': products,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': (total + page_size - 1) // page_size
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Status update endpoint removed - orders are automatically managed

@auth_bp.route('/staff/customers')
@staff_required
def staff_customers():
    from models import Customer
    customers = Customer.get_all()
    return render_template('staff_customers.html', customers=customers)

@auth_bp.route('/staff/customers/<int:customer_id>/orders')
@staff_required
def get_customer_orders(customer_id):
    from models import get_db
    status = request.args.get('status', None)
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            # Build query with optional status filter
            query = """
                SELECT o.id, o.order_date, o.status, o.total_amount
                FROM orders o
                WHERE o.customer_id = %s
            """
            params = [customer_id]
            if status:
                query += " AND LOWER(o.status) = LOWER(%s)"
                params.append(status)
            cur.execute(query, tuple(params))
            orders = cur.fetchall()
            current_app.logger.info(f"Fetched orders for customer {customer_id} with status {status}: {orders}")

            # For each order, get order items
            for order in orders:
                cur.execute("""
                    SELECT oi.id, oi.product_id, oi.quantity, oi.price, p.name as product_name
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = %s
                """, (order['id'],))
                items = cur.fetchall()
                current_app.logger.info(f"Raw SQL result for order {order['id']} items: {items}")
                order['items'] = items

            # Remove the callable check as orders is already a list
            return render_template('customer_orders.html', orders=orders)
        finally:
            cur.close()
            conn.close()
    except Exception as e:
        current_app.logger.error(f"Error fetching customer orders: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/staff/customers/<int:customer_id>/product_count')
@staff_required
def get_customer_product_count(customer_id):
    try:
        cur = current_app.mysql.connection.cursor()
        try:
            cur.execute("""
                SELECT SUM(oi.quantity) as total_products
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                WHERE o.customer_id = %s
            """, (customer_id,))
            result = cur.fetchone()
            total_products = result[0] if result and result[0] is not None else 0
            return jsonify({'success': True, 'total_products': total_products})
        finally:
            cur.close()
    except Exception as e:
        current_app.logger.error(f"Error fetching product count for customer {customer_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/staff/customers/<int:customer_id>/all_orders_status')
@staff_required
def get_all_orders_status(customer_id):
    try:
        cur = current_app.mysql.connection.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT id, status
                FROM orders
                WHERE customer_id = %s
            """, (customer_id,))
            orders = cur.fetchall()
            return jsonify({'success': True, 'orders': orders})
        finally:
            cur.close()
    except Exception as e:
        current_app.logger.error(f"Error fetching all orders status for customer {customer_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/api/orders/today_count')
def today_order_count():
    try:
        cur = current_app.mysql.connection.cursor(dictionary=True)
        cur.execute("""
            SELECT HOUR(order_date) as hour, COUNT(*) as order_count
            FROM orders
            WHERE DATE(order_date) = CURDATE()
            GROUP BY HOUR(order_date)
            ORDER BY HOUR(order_date)
        """)
        data = cur.fetchall()
        cur.close()
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        current_app.logger.error(f"Error fetching today's order count: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/logout')
def logout():
    # Preserve cart items during logout
    cart_items = session.get('cart', [])
    session.clear()
    # Restore cart items after clearing session
    session['cart'] = cart_items
    session.modified = True
    return redirect(url_for('auth.login'))

# Placeholder routes for new sidebar links
from models import Supplier

@auth_bp.route('/staff/suppliers')
@staff_required
def staff_suppliers():
    try:
        suppliers = Supplier.get_all()
    except Exception as e:
        current_app.logger.error(f"Error fetching suppliers: {e}")
        suppliers = []
    return render_template('staff_suppliers.html', suppliers=suppliers)

@auth_bp.route('/staff/reports')
@staff_required
def staff_reports():
    return render_template('staff_reports.html', active_page='reports')

@auth_bp.route('/staff/discounts')
@staff_required
def staff_discounts():
    """Discount management page"""
    from models import Product, Category
    try:
        # Get all categories for dropdown
        categories = Category.get_all()
        # Get distinct brands for dropdown
        brands = Product.get_distinct_brands()
    except Exception as e:
        current_app.logger.error(f"Error fetching data for discounts page: {e}")
        categories = []
        brands = []

    return render_template('staff_discounts.html',
                         categories=categories,
                         brands=brands,
                         active_page='discounts')

import json
from flask import request

@auth_bp.route('/staff/orders/create', methods=['POST'])
@staff_required
def create_order():
    try:
        data = request.get_json()
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        email = data.get('email', '').strip()
        items = data.get('items', [])

        if not first_name or not last_name or not email or not items:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400

        # Set order_date to current datetime automatically
        from datetime import datetime
        order_date = datetime.now()
        order_date_str = order_date.strftime('%Y-%m-%d %H:%M:%S')
        current_app.logger.info(f"DEBUG: Set order_date to current datetime: {order_date_str}")
        print(f"DEBUG PRINT: Set order_date to current datetime: {order_date_str}")

        # Find or create customer
        from models import Customer, Order
        customer = Customer.get_by_name_or_email(first_name, last_name, email)
        if not customer:
            # Create new customer with a default password
            default_password = 'defaultpassword123'
            customer_id = Customer.create(first_name, last_name, email, default_password)
        else:
            customer_id = customer['id']

        # Prepare items for Order.create
        order_items = []
        for item in items:
            product_id = item.get('product_id')
            quantity = item.get('quantity')
            price = item.get('price')
            if not product_id or not quantity or price is None:
                return jsonify({'success': False, 'error': 'Invalid order item data'}), 400
            order_items.append({
                'product_id': product_id,
                'quantity': quantity,
                'price': price
            })

        # Create order with status 'Pending'
        order_id = Order.create(customer_id, order_date, status='Pending', items=order_items)

        return jsonify({'success': True, 'order_id': order_id})
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        current_app.logger.error(f"Error creating order: {str(e)}\n{tb}")
        return jsonify({'success': False, 'error': f'Failed to create order: {str(e)}'}), 500

# Updated API route to include customer_id in monthly sales detail
@auth_bp.route('/auth/staff/api/reports/monthly_sales_detail')
@staff_required
def monthly_sales_detail():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    status = request.args.get('status')  # New optional status filter

    if not start_date or not end_date:
        return jsonify({'success': False, 'error': 'start_date and end_date parameters are required'}), 400

    try:
        # Validate date formats and values
        today = datetime.datetime.today().date()
        start_date_obj = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d').date()

        if start_date_obj > today or end_date_obj > today:
            return jsonify({'success': False, 'error': 'Cannot query future dates'}), 400
            
        if start_date_obj > end_date_obj:
            return jsonify({'success': False, 'error': 'start_date cannot be after end_date'}), 400

        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            # Build query to fetch order and order items details
            query = """
                SELECT o.id as order_id, o.order_date, c.first_name, c.last_name, o.customer_id,
                       oi.product_id, p.name as product_name, oi.quantity, oi.price
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE o.order_date BETWEEN %s AND %s
            """
            params = [start_date, end_date]

            # Add status filter if provided (support multiple statuses)
            if status:
                statuses = [s.strip().lower() for s in status.split(',')]
                placeholders = ','.join(['%s'] * len(statuses))
                query += f" AND LOWER(o.status) IN ({placeholders})"
                params.extend(statuses)

            cur.execute(query, tuple(params))
            sales_detail = cur.fetchall()
            # Format customer name
            for sale in sales_detail:
                sale['customer_name'] = f"{sale['first_name']} {sale['last_name']}"
                # Ensure customer_id is explicitly set, even if it was None from the DB
                sale['customer_id'] = sale.get('customer_id')
                if 'customer_id' not in sale:
                    sale['customer_id'] = None
                del sale['first_name']
                del sale['last_name']
            return jsonify({'success': True, 'sales_detail': sales_detail})
        finally:
            cur.close()
            conn.close()
    except Exception as e:
        current_app.logger.error(f"Error fetching monthly sales detail: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/staff/categories')
@staff_required
def staff_categories():
    from models import Category, db
    categories = db.session.execute(db.select(Category)).scalars().all()
    return render_template('staff_categories.html', title='Categories', categories=categories)

@auth_bp.route('/api/staff/product_brand_counts')
@staff_required
def product_brand_counts():
    try:
        cur = current_app.mysql.connection.cursor(dictionary=True)
        cur.execute("""
            SELECT SUBSTRING_INDEX(name, ' ', 1) as brand, COUNT(*) as count
            FROM products
            GROUP BY brand
            ORDER BY brand
        """)
        results = cur.fetchall()
        cur.close()
        return jsonify({'success': True, 'data': results})
    except Exception as e:
        current_app.logger.error(f"Error fetching product brand counts: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

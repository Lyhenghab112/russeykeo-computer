from flask import Blueprint, render_template, request, redirect, url_for, flash, session, abort, current_app, jsonify
from werkzeug.security import check_password_hash
from models import User, Product, Order, Report, get_db, Supplier, db, Role
from functools import wraps
import random

auth_bp = Blueprint('auth', __name__, template_folder='templates')

from models import Product, Order
import datetime

def staff_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Allow all staff-level roles to access staff areas
        allowed_roles = ['staff', 'admin', 'super_admin', 'manager', 'sales', 'clerk', 'cashier']
        if session.get('role') not in allowed_roles:
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

def super_admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('role') != 'super_admin':
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
            flash('Username and password are required', 'error')
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
                    flash('Invalid username or password', 'error')
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
                    # Check if OTP is enabled for this customer
                    if customer.get('otp_enabled'):
                        # Store customer info in session for OTP verification
                        session['temp_customer_id'] = customer['id']
                        session['temp_customer_email'] = customer['email']
                        session['temp_customer_name'] = f"{customer['first_name']} {customer['last_name']}"
                        
                        # Generate and send initial OTP
                        try:
                            from utils.otp_utils import OTPManager
                            from utils.email_utils import EmailManager
                            
                            otp_code = OTPManager.generate_otp()
                            OTPManager.store_otp(customer['id'], customer['email'], otp_code)
                            EmailManager.send_otp_email(customer['email'], f"{customer['first_name']} {customer['last_name']}", otp_code)
                            
                            flash('OTP code sent to your email. Please check your inbox.', 'success')
                        except Exception as e:
                            current_app.logger.error(f"Error sending initial OTP: {str(e)}")
                            flash('Error sending OTP. Please try again.', 'error')
                        
                        return redirect(url_for('auth.verify_otp'))
                    else:
                        # OTP not enabled, proceed with normal login
                        session['user_id'] = customer['id']
                        session['username'] = f"{customer['first_name']} {customer['last_name']}"
                        session['role'] = 'customer'
                        current_app.logger.info(f"Customer logged in: {session['username']}")
                        return redirect(url_for('show_dashboard'))
                else:
                    flash('Invalid username or password', 'error')
                    return redirect(url_for('auth.login'))
                
            if (check_password_hash(user['password'], password) or
                (len(user['password']) < 60 and user['password'] == password)):

                # Check if this is a staff user (has username and role fields) or customer
                if 'username' in user and 'role' in user:
                    # This is a staff/admin user - redirect them to admin login
                    staff_roles = ['staff', 'admin', 'super_admin', 'manager', 'sales', 'clerk', 'cashier']
                    if user['role'].strip().lower() in staff_roles:
                        flash('Invalid username or password', 'error')
                        return redirect('/admin')
                    
                    # If not a staff role, continue with regular customer login
                    session['user_id'] = user['id']
                    session['username'] = f"{user['first_name']} {user['last_name']}"
                    session['role'] = 'customer'
                    current_app.logger.info(f"Customer logged in: {session['username']}")
                    return redirect(url_for('show_dashboard'))
                else:
                    # This is a customer
                    session['user_id'] = user['id']
                    session['username'] = f"{user['first_name']} {user['last_name']}"
                    session['role'] = 'customer'
                    current_app.logger.info(f"Customer logged in: {session['username']}")
                    return redirect(url_for('show_dashboard'))
                
            flash('Invalid username or password', 'error')
            
        except Exception as e:
            current_app.logger.error(f"Login failed for user {username}: {e}")
            flash('Login failed. Please try again.', 'error')
    
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
            flash('Please fill in all required fields.', 'error')
            return render_template('Register.html', first_name=first_name, last_name=last_name, email=email, phone=phone, address=address)

        if password != confirm_password:
            print("DEBUG: Validation failed - passwords do not match")
            error_message = 'Passwords do not match.'
            return render_template('Register.html', first_name=first_name, last_name=last_name, email=email, phone=phone, address=address, error=error_message)

        # Check if email already exists
        existing_customer = Customer.get_by_name_or_email('', '', email)
        if existing_customer:
            print("DEBUG: Validation failed - email already registered")
            flash('Email already registered.', 'error')
            return render_template('Register.html', first_name=first_name, last_name=last_name, email=email, phone=phone, address=address)

        # Hash password
        hashed_password = generate_password_hash(password)

        # Store registration data temporarily and send OTP for verification
        try:
            print("DEBUG: Starting OTP setup for registration verification...")
            from utils.otp_utils import OTPManager
            from utils.email_utils import EmailManager
            print("DEBUG: OTP modules imported successfully")
            
            # Generate and send OTP for account verification
            print("DEBUG: Generating OTP...")
            otp_code = OTPManager.generate_otp()
            print(f"DEBUG: Generated OTP: {otp_code}")
            
            # Store OTP with temporary email (not customer_id yet)
            print("DEBUG: Storing OTP in database...")
            OTPManager.store_registration_otp(email, otp_code, expiry_minutes=15)  # 15 minutes for registration
            print("DEBUG: OTP stored successfully")
            
            print("DEBUG: Sending registration email...")
            EmailManager.send_registration_otp_email(email, f"{first_name} {last_name}", otp_code)
            print("DEBUG: Registration email sent")
            
            # Store customer info in session for OTP verification (NOT in database yet)
            print("DEBUG: Storing session data...")
            session['temp_registration_data'] = {
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'phone': phone,
                'address': address,
                'hashed_password': hashed_password
            }
            session['temp_customer_email'] = email
            session['temp_customer_name'] = f"{first_name} {last_name}"
            session['registration_otp'] = True  # Flag to indicate this is registration OTP
            print("DEBUG: Session data stored")
            
            print("DEBUG: Redirecting to OTP verification...")
            flash('Please verify your email with the OTP code sent to your inbox to complete registration.', 'success')
            return redirect(url_for('auth.verify_registration_otp'))
            
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            print(f"DEBUG: OTP setup failed: {str(e)}")
            print(f"DEBUG: Traceback: {tb}")
            current_app.logger.error(f"Error setting up OTP for registration: {str(e)}")
            current_app.logger.error(f"Traceback: {tb}")
            flash('Error setting up email verification. Please try again.', 'error')
            return render_template('Register.html', first_name=first_name, last_name=last_name, email=email, phone=phone, address=address)
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
@auth_bp.route('/staff/dashboard')
@staff_required
def staff_dashboard():
    from models import Product, Order, Customer
    from datetime import datetime
    
    # Get products and orders
    products = Product.get_all()
    
    # Get customer data
    customers = Customer.get_all()
    
    # New customers count (removed date-based calculation)
    new_customers_count = 0
    
    return render_template('staff_dashboard.html', 
                         products=products,
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
        search = (request.args.get('search') or '').strip()
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
            # Get order info including payment verification details
            cur.execute("""
                SELECT o.*, c.first_name, c.last_name, c.email, c.phone,
                       o.payment_screenshot_path, o.screenshot_uploaded_at, o.payment_verification_status
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
        sort_dir = request.args.get('sort_dir', 'desc').lower()
        brand_filter = request.args.get('brand', '').strip()
        if sort_dir not in ['asc', 'desc']:
            sort_dir = 'desc'

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
                SELECT o.id, o.order_date, o.status, o.total_amount, o.transaction_id, o.payment_method
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

@auth_bp.route('/customer-forgot-password', methods=['GET', 'POST'])
def customer_forgot_password():
    """Customer forgot password page - sends OTP for password reset verification"""
    if request.method == 'POST':
        try:
            username = request.form.get('username', '').strip()
            
            if not username:
                flash('Please enter your username or email address', 'error')
                return render_template('customer_forgot_password.html')

            # Try to find customer by username (could be name or email)
            from models import Customer
            customer = None
            
            # Check if username is an email
            if '@' in username:
                customer = Customer.get_by_name_or_email(None, None, username)
            
            if not customer:
                # Try to find by name
                name_parts = username.split()
                if len(name_parts) >= 2:
                    first_name = name_parts[0]
                    last_name = ' '.join(name_parts[1:])
                    customer = Customer.get_by_name_or_email(first_name, last_name, None)
                    if not customer:
                        # Try swapping first and last name
                        customer = Customer.get_by_name_or_email(last_name, first_name, None)
                else:
                    # Single name
                    customer = Customer.get_by_name_or_email(username, '', None)

            if not customer:
                flash('Customer not found. Please check your username/email.', 'error')
                return render_template('customer_forgot_password.html')

            # Generate OTP for password reset
            otp_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            
            # Store OTP for password reset
            from utils.otp_utils import OTPManager
            OTPManager.store_password_reset_otp(customer['id'], otp_code, expiry_minutes=15)
            
            # Send OTP email
            try:
                from utils.email_utils import send_otp_email
                send_otp_email(
                    customer['email'],
                    customer['first_name'],
                    otp_code,
                    "Password Reset Verification",
                    "Use this code to reset your password:"
                )
                
                # Store customer info in session for OTP verification
                session['password_reset_customer_id'] = customer['id']
                session['password_reset_customer_email'] = customer['email']
                session['password_reset_customer_name'] = f"{customer['first_name']} {customer['last_name']}"
                session['password_reset_otp'] = True
                
                flash('Password reset OTP sent to your email. Please check your inbox and verify the code.', 'success')
                return redirect(url_for('auth.verify_password_reset_otp'))
                
            except Exception as e:
                current_app.logger.error(f"Error sending password reset OTP email: {e}")
                flash('Error sending OTP. Please try again.', 'error')
                return render_template('customer_forgot_password.html')

        except Exception as e:
            current_app.logger.error(f"Error in forgot password: {e}")
            flash('Error processing request. Please try again.', 'error')

    return render_template('customer_forgot_password.html')

@auth_bp.route('/verify-password-reset-otp', methods=['GET', 'POST'])
def verify_password_reset_otp():
    """Verify OTP for password reset (OTP only, no password fields)"""
    if 'password_reset_customer_id' not in session or not session.get('password_reset_otp'):
        flash('Please request a password reset first', 'error')
        return redirect(url_for('auth.customer_forgot_password'))
    
    if request.method == 'POST':
        try:
            otp_code = request.form.get('otp_code', '').strip()
            
            if not otp_code:
                flash('Please enter the OTP code', 'error')
                return render_template('verify_password_reset_otp.html')
            
            # Verify OTP
            from utils.otp_utils import OTPManager
            customer_email = session['password_reset_customer_email']
            
            if OTPManager.verify_password_reset_otp(customer_email, otp_code):
                # OTP verified successfully, redirect to password change page
                session['otp_verified'] = True
                flash('OTP verified successfully! Now you can set your new password.', 'success')
                return redirect(url_for('auth.change_password_after_otp'))
            else:
                flash('Invalid or expired OTP code. Please try again.', 'error')
                return render_template('verify_password_reset_otp.html')
                
        except Exception as e:
            current_app.logger.error(f"Error in password reset OTP verification: {e}")
            flash('Error processing request. Please try again.', 'error')
    
    return render_template('verify_password_reset_otp.html')

@auth_bp.route('/resend-password-reset-otp', methods=['POST'])
def resend_password_reset_otp():
    """Resend password reset OTP"""
    if 'password_reset_customer_id' not in session or not session.get('password_reset_otp'):
        flash('Please request a password reset first', 'error')
        return redirect(url_for('auth.customer_forgot_password'))
    
    try:
        # Generate new OTP
        otp_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        # Store new OTP
        from utils.otp_utils import OTPManager
        customer_id = session['password_reset_customer_id']
        OTPManager.store_password_reset_otp(customer_id, otp_code, expiry_minutes=15)
        
        # Send new OTP email
        from utils.email_utils import send_otp_email
        customer_email = session['password_reset_customer_email']
        customer_name = session['password_reset_customer_name']
        
        send_otp_email(
            customer_email,
            customer_name,
            otp_code,
            "Password Reset Verification (Resent)",
            "Use this code to reset your password:"
        )
        
        flash('New OTP code sent to your email. Please check your inbox.', 'success')
        return redirect(url_for('auth.verify_password_reset_otp'))
        
    except Exception as e:
        current_app.logger.error(f"Error resending password reset OTP: {e}")
        flash('Error sending OTP. Please try again.', 'error')
        return redirect(url_for('auth.verify_password_reset_otp'))

@auth_bp.route('/change-password-after-otp', methods=['GET', 'POST'])
def change_password_after_otp():
    """Change password after OTP verification"""
    if 'password_reset_customer_id' not in session or not session.get('otp_verified'):
        flash('Please verify your OTP first', 'error')
        return redirect(url_for('auth.customer_forgot_password'))
    
    if request.method == 'POST':
        try:
            new_password = request.form.get('new_password', '').strip()
            confirm_password = request.form.get('confirm_password', '').strip()
            
            if not new_password or not confirm_password:
                flash('Both password fields are required', 'error')
                return render_template('change_password_after_otp.html')
            
            if new_password != confirm_password:
                flash('Passwords do not match', 'error')
                return render_template('change_password_after_otp.html')
            
            if len(new_password) < 8:
                flash('Password must be at least 8 characters long', 'error')
                return render_template('change_password_after_otp.html')
            
            # Update password
            try:
                from models import Customer
                customer_id = session['password_reset_customer_id']
                Customer.update(customer_id, password=new_password)
                
                # Clean up session data
                del session['password_reset_customer_id']
                del session['password_reset_customer_email']
                del session['password_reset_customer_name']
                del session['password_reset_otp']
                del session['otp_verified']
                
                flash('Password reset successfully! You can now log in with your new password.', 'success')
                return redirect(url_for('auth.login'))
                
            except Exception as e:
                current_app.logger.error(f"Error updating password: {e}")
                flash('Error updating password. Please try again.', 'error')
                return render_template('change_password_after_otp.html')
                
        except Exception as e:
            current_app.logger.error(f"Error in password change: {e}")
            flash('Error processing request. Please try again.', 'error')
    
    return render_template('change_password_after_otp.html')

@auth_bp.route('/force-password-change', methods=['GET', 'POST'])
def force_password_change():
    # Check if user has temp_user_id (from force password change) or is a super admin resetting their own password
    if 'temp_user_id' not in session and 'super_admin_reset_user_id' not in session:
        return redirect(url_for('auth.login'))

    if request.method == 'POST':
        try:
            new_password = request.form.get('new_password', '').strip()
            confirm_password = request.form.get('confirm_password', '').strip()

            if not new_password or not confirm_password:
                flash('Both password fields are required', 'error')
                return render_template('force_password_change.html')

            if new_password != confirm_password:
                flash('Passwords do not match', 'error')
                return render_template('force_password_change.html')

            if len(new_password) < 8:
                flash('Password must be at least 8 characters long', 'error')
                return render_template('force_password_change.html')

            # Determine which user ID to use
            user_id = session.get('temp_user_id') or session.get('super_admin_reset_user_id')
            
            # Update password and clear force_password_change flag
            User.update(user_id, password=new_password, force_password_change=False)

            # Complete the login process
            user = User.get_by_id(user_id)
            
            if session.get('temp_user_id'):
                # This was a force password change - complete the login
                session['username'] = session['temp_username']
                session['role'] = user['role'].strip().lower()
                session['user_id'] = session['temp_user_id']
                
                # Clean up temporary session data
                del session['temp_user_id']
                del session['temp_username']
            else:
                # This was a super admin resetting their own password - redirect to login
                del session['super_admin_reset_user_id']
                flash('Password changed successfully! Please log in with your new password.', 'success')
                return redirect(url_for('admin_login'))

            # Update last login time
            User.update_last_login(user['id'])

            flash('Password changed successfully!', 'success')
            return redirect(url_for('auth.staff_dashboard'))

        except Exception as e:
            current_app.logger.error(f"Error changing password: {e}")
            flash('Error changing password. Please try again.', 'error')

    # Determine username to display
    username = session.get('temp_username') or session.get('super_admin_reset_username', 'Super Admin')
    return render_template('force_password_change.html', username=username)

@auth_bp.route('/verify-otp', methods=['GET', 'POST'])
def verify_otp():
    """OTP verification page for existing customers"""
    if 'temp_customer_id' not in session:
        flash('Please login first', 'error')
        return redirect(url_for('auth.login'))
    
    if request.method == 'POST':
        otp_code = request.form.get('otp_code', '').strip()
        
        if not otp_code:
            flash('Please enter the OTP code', 'error')
            return render_template('verify_otp.html')
        
        try:
            from utils.otp_utils import OTPManager
            customer_id = session['temp_customer_id']
            customer_email = session['temp_customer_email']
            
            # Verify OTP
            if OTPManager.verify_stored_otp(customer_id, customer_email, otp_code):
                # OTP verified successfully, complete login
                session['user_id'] = customer_id
                session['username'] = session['temp_customer_name']
                session['role'] = 'customer'
                
                # Clean up temporary session data
                del session['temp_customer_id']
                del session['temp_customer_email']
                del session['temp_customer_name']
                
                current_app.logger.info(f"Customer logged in with OTP: {session['username']}")
                flash('Login successful!', 'success')
                return redirect(url_for('show_dashboard'))
            else:
                flash('Invalid or expired OTP code', 'error')
                return render_template('verify_otp.html')
                
        except Exception as e:
            current_app.logger.error(f"OTP verification error: {str(e)}")
            flash('Error verifying OTP. Please try again.', 'error')
            return render_template('verify_otp.html')
    
    return render_template('verify_otp.html')

@auth_bp.route('/verify-registration-otp', methods=['GET', 'POST'])
def verify_registration_otp():
    """OTP verification page for new account registration"""
    if 'temp_registration_data' not in session or not session.get('registration_otp'):
        flash('Please complete registration first', 'error')
        return redirect(url_for('auth.register'))
    
    if request.method == 'POST':
        otp_code = request.form.get('otp_code', '').strip()
        
        if not otp_code:
            flash('Please enter the OTP code', 'error')
            return render_template('verify_registration_otp.html')
        
        try:
            from utils.otp_utils import OTPManager
            from models import Customer
            customer_email = session['temp_customer_email']
            
            # Verify OTP (using email since customer_id doesn't exist yet)
            if OTPManager.verify_registration_otp(customer_email, otp_code):
                # OTP verified successfully, NOW create the customer account
                try:
                    registration_data = session['temp_registration_data']
                    customer_id = Customer.create(
                        registration_data['first_name'],
                        registration_data['last_name'],
                        registration_data['email'],
                        registration_data['hashed_password'],
                        registration_data['phone'],
                        registration_data['address']
                    )
                    
                    # Enable OTP for the newly created customer
                    conn = get_db()
                    cur = conn.cursor()
                    cur.execute("UPDATE customers SET otp_enabled = TRUE WHERE id = %s", (customer_id,))
                    conn.commit()
                    cur.close()
                    conn.close()
                    
                    # Log in the new customer
                    session['user_id'] = customer_id
                    session['username'] = session['temp_customer_name']
                    session['role'] = 'customer'
                    
                    # Clean up temporary session data
                    del session['temp_registration_data']
                    del session['temp_customer_email']
                    del session['temp_customer_name']
                    del session['registration_otp']
                    
                    current_app.logger.info(f"New customer account created and verified: {session['username']} (ID: {customer_id})")
                    flash('Account created and verified successfully! Welcome to our computer shop!', 'success')
                    return redirect(url_for('show_dashboard'))
                    
                except Exception as e:
                    current_app.logger.error(f"Error creating customer account after OTP verification: {str(e)}")
                    flash('Error creating account. Please try again.', 'error')
                    return render_template('verify_registration_otp.html')
                    
            else:
                flash('Invalid or expired OTP code', 'error')
                return render_template('verify_registration_otp.html')
                
        except Exception as e:
            current_app.logger.error(f"Registration OTP verification error: {str(e)}")
            flash('Error verifying OTP. Please try again.', 'error')
            return render_template('verify_registration_otp.html')
    
    return render_template('verify_registration_otp.html')

@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    """Resend OTP code to customer"""
    if 'temp_customer_id' not in session:
        return jsonify({'success': False, 'error': 'Session expired'})
    
    try:
        from utils.otp_utils import OTPManager
        from utils.email_utils import EmailManager
        
        customer_id = session['temp_customer_id']
        customer_email = session['temp_customer_email']
        customer_name = session['temp_customer_name']
        
        # Generate new OTP
        otp_code = OTPManager.generate_otp()
        
        # Store OTP in database
        OTPManager.store_otp(customer_id, customer_email, otp_code)
        
        # Send OTP via email
        EmailManager.send_otp_email(customer_email, customer_name, otp_code)
        
        return jsonify({'success': True, 'message': 'OTP sent successfully'})
        
    except Exception as e:
        current_app.logger.error(f"Error resending OTP: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to send OTP'})

@auth_bp.route('/resend-registration-otp', methods=['POST'])
def resend_registration_otp():
    """Resend OTP code for new account registration"""
    if 'temp_registration_data' not in session or not session.get('registration_otp'):
        return jsonify({'success': False, 'error': 'Session expired'})
    
    try:
        from utils.otp_utils import OTPManager
        from utils.email_utils import EmailManager
        
        customer_email = session['temp_customer_email']
        customer_name = session['temp_customer_name']
        
        # Generate new OTP with longer expiry for registration
        otp_code = OTPManager.generate_otp()
        OTPManager.store_registration_otp(customer_email, otp_code, expiry_minutes=15)
        
        # Send OTP via email
        EmailManager.send_registration_otp_email(customer_email, customer_name, otp_code)
        
        return jsonify({'success': True, 'message': 'Registration OTP sent successfully'})
        
    except Exception as e:
        current_app.logger.error(f"Error resending registration OTP: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to send OTP'})

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
        order_id = Order.create(customer_id, order_date, status='PENDING', items=order_items)

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

    # Add debugging
    current_app.logger.info(f"Monthly sales detail API called with: start_date={start_date}, end_date={end_date}, status={status}")

    if not start_date or not end_date:
        current_app.logger.error("Missing start_date or end_date parameters")
        return jsonify({'success': False, 'error': 'start_date and end_date parameters are required'}), 400

    try:
        # Validate date formats and values
        today = datetime.datetime.today().date()
        start_date_obj = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d').date()

        current_app.logger.info(f"Parsed dates: start_date_obj={start_date_obj}, end_date_obj={end_date_obj}")

        # Allow 2025 dates since that's where the data exists
        if start_date_obj > datetime.datetime(2025, 12, 31).date() or end_date_obj > datetime.datetime(2025, 12, 31).date():
            current_app.logger.error(f"Date validation failed: dates beyond 2025")
            return jsonify({'success': False, 'error': 'Cannot query dates beyond 2025'}), 400
            
        if start_date_obj > end_date_obj:
            current_app.logger.error(f"Date validation failed: start_date after end_date")
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

            current_app.logger.info(f"Executing query with params: {params}")
            cur.execute(query, tuple(params))
            sales_detail = cur.fetchall()
            current_app.logger.info(f"Query returned {len(sales_detail)} records")
            
            # Format customer name
            for sale in sales_detail:
                sale['customer_name'] = f"{sale['first_name']} {sale['last_name']}"
                # Ensure customer_id is explicitly set, even if it was None from the DB
                sale['customer_id'] = sale.get('customer_id')
                if 'customer_id' not in sale:
                    sale['customer_id'] = None
                del sale['first_name']
                del sale['last_name']
            
            current_app.logger.info(f"Returning {len(sales_detail)} sales records")
            return jsonify({'success': True, 'sales_detail': sales_detail})
        finally:
            cur.close()
            conn.close()
    except Exception as e:
        current_app.logger.error(f"Error fetching monthly sales detail: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/staff/categories', methods=['GET', 'POST'])
@admin_required
def staff_categories():
    from models import Category, db

    if request.method == 'POST':
        try:
            name = request.form.get('name', '').strip()
            description = request.form.get('description', '').strip()
            parent_id = request.form.get('parent_id', '').strip()

            if not name:
                flash('Category name is required', 'error')
                return redirect(url_for('auth.staff_categories'))

            # Convert parent_id to integer if provided, otherwise None
            parent_id = int(parent_id) if parent_id else None

            # Create new category with parent_id
            category_id = Category.create(name, description, parent_id)
            
            if parent_id:
                # Get parent category name for success message
                from models import get_db
                conn = get_db()
                cur = conn.cursor()
                try:
                    cur.execute("SELECT name FROM categories WHERE id = %s", (parent_id,))
                    parent_name = cur.fetchone()
                    parent_name = parent_name[0] if parent_name else "Unknown"
                finally:
                    cur.close()
                    conn.close()
                flash(f'Category "{name}" created successfully as a child of "{parent_name}"!', 'success')
            else:
                flash(f'Category "{name}" created successfully as a parent category!', 'success')

        except ValueError as e:
            flash(str(e), 'error')
        except Exception as e:
            current_app.logger.error(f"Error creating category: {e}")
            flash('Error creating category. Please try again.', 'error')

        return redirect(url_for('auth.staff_categories'))

    # GET request - show categories list
    try:
        categories = Category.get_all_hierarchical()
    except Exception as e:
        current_app.logger.error(f"Error fetching categories: {e}")
        categories = []
        flash('Error loading categories', 'error')

    return render_template('staff_categories.html', categories=categories, active_page='categories')

@auth_bp.route('/api/staff/categories/<int:category_id>/delete', methods=['DELETE'])
@admin_required
def delete_category(category_id):
    from models import Category
    try:
        Category.delete(category_id)
        return jsonify({'success': True, 'message': 'Category deleted successfully'})
    except Exception as e:
        current_app.logger.error(f"Error deleting category: {e}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/api/staff/categories/<int:category_id>/update', methods=['POST'])
@admin_required
def update_category(category_id):
    from models import Category
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        description = data.get('description', '').strip()

        if not name:
            return jsonify({'success': False, 'error': 'Category name is required'})

        Category.update(category_id, name=name, description=description)
        return jsonify({'success': True, 'message': 'Category updated successfully'})
    except Exception as e:
        current_app.logger.error(f"Error updating category: {e}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/api/staff/categories/<int:category_id>/products/count', methods=['GET'])
@admin_required
def get_category_product_count(category_id):
    try:
        from models import Product
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("SELECT COUNT(*) FROM products WHERE category_id = %s", (category_id,))
            count = cur.fetchone()[0]
            return jsonify({'success': True, 'count': count})
        finally:
            cur.close()
            conn.close()
    except Exception as e:
        current_app.logger.error(f"Error getting category product count: {e}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/staff/users', methods=['GET', 'POST'])
@super_admin_required
def staff_users():
    from models import User

    if request.method == 'POST':
        try:
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '').strip()
            role = request.form.get('role', 'staff').strip()
            email = request.form.get('email', '').strip() or None
            full_name = request.form.get('full_name', '').strip() or None

            if not username or not password:
                # Check if this is an AJAX request
                if request.form.get('ajax') == 'true':
                    return jsonify({'success': False, 'error': 'Username and password are required'}), 400
                flash('Username and password are required', 'error')
                return redirect(url_for('auth.staff_users'))

            # Get available roles to validate
            available_roles = Role.get_all()
            valid_role_names = [r['name'] for r in available_roles]

            if role not in valid_role_names:
                # Check if this is an AJAX request
                if request.form.get('ajax') == 'true':
                    return jsonify({'success': False, 'error': 'Invalid role selected'}), 400
                flash('Invalid role selected', 'error')
                return redirect(url_for('auth.staff_users'))

            # Create new user
            user_id = User.create(username, password, role, email, full_name)

            # Check if this is an AJAX request
            if request.form.get('ajax') == 'true':
                try:
                    # Get the role display name
                    role_obj = next((r for r in available_roles if r['name'] == role), None)
                    role_display_name = role_obj['display_name'] if role_obj else role.title()

                    # Return JSON response with user data
                    return jsonify({
                        'success': True,
                        'message': f'User {username} created successfully!',
                        'user': {
                            'id': user_id,
                            'username': username,
                            'full_name': full_name,
                            'email': email,
                            'role': role,
                            'role_display_name': role_display_name,
                            'last_login': None,
                            'is_active': True,
                            'force_password_change': False,
                            'created_at': datetime.datetime.now().isoformat()
                        }
                    })
                except Exception as json_error:
                    current_app.logger.error(f"Error creating JSON response: {json_error}")
                    return jsonify({
                        'success': True,
                        'message': f'User {username} created successfully!',
                        'user': {
                            'id': user_id,
                            'username': username,
                            'full_name': full_name or '',
                            'email': email or '',
                            'role': role,
                            'role_display_name': role.title(),
                            'last_login': None,
                            'is_active': True,
                            'force_password_change': False
                        }
                    })

            flash(f'User {username} created successfully!', 'success')

        except ValueError as e:
            # Check if this is an AJAX request
            if request.form.get('ajax') == 'true':
                return jsonify({'success': False, 'error': str(e)}), 400
            flash(str(e), 'error')
        except Exception as e:
            current_app.logger.error(f"Error creating user: {e}")
            # Check if this is an AJAX request
            if request.form.get('ajax') == 'true':
                return jsonify({'success': False, 'error': 'Error creating user. Please try again.'}), 500
            flash('Error creating user. Please try again.', 'error')

        return redirect(url_for('auth.staff_users'))

    # GET request - show users list
    try:
        users = User.get_all()
        roles = Role.get_all()
    except Exception as e:
        current_app.logger.error(f"Error fetching users: {e}")
        users = []
        roles = []
        flash('Error loading users', 'error')

    return render_template('staff_users.html', users=users, roles=roles, active_page='users')

@auth_bp.route('/api/staff/users/<int:user_id>/delete', methods=['DELETE'])
@super_admin_required
def delete_user(user_id):
    try:
        # Prevent super admin from deleting themselves
        current_user_id = session.get('user_id')
        if user_id == current_user_id:
            return jsonify({'success': False, 'error': 'Cannot delete your own account'})

        # Prevent deletion of any super admin users
        user_to_delete = User.get_by_id(user_id)
        if user_to_delete and user_to_delete.get('role') == 'super_admin':
            return jsonify({'success': False, 'error': 'Cannot delete super admin users for security reasons'})

        User.delete(user_id)
        return jsonify({'success': True, 'message': 'User deleted successfully'})
    except Exception as e:
        current_app.logger.error(f"Error deleting user: {e}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/api/staff/users/<int:user_id>/update', methods=['POST'])
@super_admin_required
def update_user(user_id):
    try:
        data = request.get_json()
        # Handle potential None values safely
        username = data.get('username')
        username = username.strip() if username else ''
        
        role = data.get('role')
        role = role.strip() if role else ''
        
        email = data.get('email')
        email = email.strip() if email else None
        
        full_name = data.get('full_name')
        full_name = full_name.strip() if full_name else None
        
        is_active = data.get('is_active')
        force_password_change = data.get('force_password_change')
        
        if not username:
            return jsonify({'success': False, 'error': 'Username is required'})

        # Get available roles to validate
        available_roles = Role.get_all()
        valid_role_names = [r['name'] for r in available_roles]

        if role not in valid_role_names:
            return jsonify({'success': False, 'error': 'Invalid role'})

        # Prevent super admin from changing their own role completely
        current_user_id = session.get('user_id')
        if user_id == current_user_id:
            # Get current user's role to check if they're super admin
            current_user = User.get_by_id(current_user_id)
            if current_user and current_user.get('role') == 'super_admin':
                return jsonify({'success': False, 'error': 'Super admins cannot change their own role for security reasons'})

        User.update(user_id, username=username, role=role, email=email,
                   full_name=full_name, is_active=is_active,
                   force_password_change=force_password_change)
        return jsonify({'success': True, 'message': 'User updated successfully'})
    except Exception as e:
        current_app.logger.error(f"Error updating user: {e}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/api/staff/users/<int:user_id>/reset-password', methods=['POST'])
@super_admin_required
def reset_user_password(user_id):
    try:
        data = request.get_json()
        old_password = data.get('old_password', '').strip()
        new_password = data.get('new_password', '').strip()

        # Validate inputs
        if not old_password:
            return jsonify({'success': False, 'error': 'Current password is required'})
        
        if not new_password:
            return jsonify({'success': False, 'error': 'New password is required'})

        if len(new_password) < 8:
            return jsonify({'success': False, 'error': 'New password must be at least 8 characters'})

        # Verify the current user's password (raw SQL model)
        current_user_id = session.get('user_id')
        if not current_user_id:
            return jsonify({'success': False, 'error': 'User session not found'})

        # Fetch current user's password hash and verify
        from werkzeug.security import check_password_hash
        stored_hash = User.get_password_hash(current_user_id)
        if not stored_hash:
            return jsonify({'success': False, 'error': 'Current user not found'})

        if not check_password_hash(stored_hash, old_password):
            return jsonify({'success': False, 'error': 'Current password is incorrect'})

        # Reset the target user's password
        User.reset_password(user_id, new_password)
        
        return jsonify({
            'success': True,
            'message': 'Password reset successfully',
            'temporary_password': None
        })
    except Exception as e:
        current_app.logger.error(f"Error resetting password: {e}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/api/staff/users/generate-password', methods=['GET'])
@staff_required
def generate_temporary_password():
    try:
        password = User.generate_temporary_password()
        return jsonify({'success': True, 'password': password})
    except Exception as e:
        current_app.logger.error(f"Error generating password: {e}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/api/staff/users/<int:user_id>/toggle-status', methods=['POST'])
@super_admin_required
def toggle_user_status(user_id):
    try:
        data = request.get_json()
        is_active = data.get('is_active', True)

        # Prevent super admin from deactivating themselves
        current_user_id = session.get('user_id')
        if user_id == current_user_id:
            return jsonify({'success': False, 'error': 'Cannot change your own status'})

        # Prevent deactivation of any super admin users
        user_to_toggle = User.get_by_id(user_id)
        if user_to_toggle and user_to_toggle.get('role') == 'super_admin' and not is_active:
            return jsonify({'success': False, 'error': 'Cannot deactivate super admin users for security reasons'})

        User.update(user_id, is_active=is_active)
        status_text = 'activated' if is_active else 'deactivated'
        return jsonify({'success': True, 'message': f'User {status_text} successfully'})
    except Exception as e:
        current_app.logger.error(f"Error toggling user status: {e}")
        return jsonify({'success': False, 'error': str(e)})





@auth_bp.route('/api/staff/users/<int:user_id>/force-password-change', methods=['POST'])
@super_admin_required
def force_user_password_change(user_id):
    try:
        # Prevent super admin from forcing their own password change
        current_user_id = session.get('user_id')
        if user_id == current_user_id:
            return jsonify({'success': False, 'error': 'Cannot force password change for your own account'})

        User.update(user_id, force_password_change=True)
        return jsonify({'success': True, 'message': 'User will be required to change password on next login'})
    except Exception as e:
        current_app.logger.error(f"Error forcing password change: {e}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/staff/roles', methods=['GET', 'POST'])
@super_admin_required
def staff_roles():
    from models import Role

    if request.method == 'POST':
        try:
            name = request.form.get('name', '').strip().lower()
            display_name = request.form.get('display_name', '').strip()
            description = request.form.get('description', '').strip()
            access_level = int(request.form.get('access_level', 1))

            if not name or not display_name:
                flash('Role name and display name are required', 'error')
                return redirect(url_for('auth.staff_roles'))

            # Create new role
            role_id = Role.create(name, display_name, description, access_level)
            flash(f'Role "{display_name}" created successfully!', 'success')

        except ValueError as e:
            flash(str(e), 'error')
        except Exception as e:
            current_app.logger.error(f"Error creating role: {e}")
            flash('Error creating role. Please try again.', 'error')

        return redirect(url_for('auth.staff_roles'))

    # GET request - show roles list
    try:
        roles = Role.get_all()
    except Exception as e:
        current_app.logger.error(f"Error fetching roles: {e}")
        roles = []
        flash('Error loading roles', 'error')

    return render_template('staff_roles.html', roles=roles, active_page='roles')

@auth_bp.route('/api/staff/roles/<int:role_id>/delete', methods=['DELETE'])
@super_admin_required
def delete_role(role_id):
    try:
        Role.delete(role_id)
        return jsonify({'success': True, 'message': 'Role deleted successfully'})
    except Exception as e:
        current_app.logger.error(f"Error deleting role: {e}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/api/staff/roles/<int:role_id>/update', methods=['POST'])
@super_admin_required
def update_role(role_id):
    try:
        data = request.get_json()
        display_name = data.get('display_name', '').strip()
        description = data.get('description', '').strip()
        access_level = data.get('access_level')

        if not display_name:
            return jsonify({'success': False, 'error': 'Display name is required'})

        Role.update(role_id, display_name=display_name, description=description, access_level=access_level)
        return jsonify({'success': True, 'message': 'Role updated successfully'})
    except Exception as e:
        current_app.logger.error(f"Error updating role: {e}")
        return jsonify({'success': False, 'error': str(e)})

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

@auth_bp.route('/api/staff/customers/<int:customer_id>/toggle-otp', methods=['POST'])
@staff_required
def toggle_customer_otp(customer_id):
    """Enable or disable OTP for a customer"""
    try:
        data = request.get_json()
        enable_otp = data.get('enable_otp', False)
        
        conn = get_db()
        cur = conn.cursor()
        
        try:
            # Update customer OTP status
            cur.execute("""
                UPDATE customers 
                SET otp_enabled = %s 
                WHERE id = %s
            """, (enable_otp, customer_id))
            
            conn.commit()
            
            status = 'enabled' if enable_otp else 'disabled'
            return jsonify({
                'success': True, 
                'message': f'OTP {status} for customer successfully'
            })
            
        finally:
            cur.close()
            conn.close()
            
    except Exception as e:
        current_app.logger.error(f"Error toggling OTP for customer {customer_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@auth_bp.route('/api/staff/customers/<int:customer_id>/otp-status')
@staff_required
def get_customer_otp_status(customer_id):
    """Get OTP status for a customer"""
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        
        try:
            cur.execute("""
                SELECT otp_enabled, otp_attempts, last_otp_attempt, otp_locked_until
                FROM customers 
                WHERE id = %s
            """, (customer_id,))
            
            result = cur.fetchone()
            if result:
                return jsonify({
                    'success': True,
                    'otp_enabled': bool(result['otp_enabled']),
                    'otp_attempts': result['otp_attempts'] or 0,
                    'last_otp_attempt': result['last_otp_attempt'].isoformat() if result['last_otp_attempt'] else None,
                    'otp_locked_until': result['otp_locked_until'].isoformat() if result['otp_locked_until'] else None
                })
            else:
                return jsonify({'success': False, 'error': 'Customer not found'})
                
        finally:
            cur.close()
            conn.close()
            
    except Exception as e:
        current_app.logger.error(f"Error getting OTP status for customer {customer_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

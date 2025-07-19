from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash
from flask import current_app
import mysql.connector
from datetime import datetime
import re

db = SQLAlchemy()

# Database configuration from config.py
from config import Config

def get_db():
    try:
        conn = mysql.connector.connect(
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            host=Config.MYSQL_HOST,
            database=Config.MYSQL_DB,
            # Remove unsupported argument datetime_converter
            use_pure=True
        )
        current_app.logger.info("Database connection established successfully.")
        return conn
    except Exception as e:
        current_app.logger.error(f"Failed to connect to database: {e}")
        raise

def generate_slug(text):
    """Generate a URL-friendly slug from text"""
    if not text:
        return ""

    # Convert to lowercase
    slug = text.lower()

    # Replace spaces and special characters with hyphens
    slug = re.sub(r'[^\w\s-]', '', slug)  # Remove special characters except spaces and hyphens
    slug = re.sub(r'[\s_]+', '-', slug)   # Replace spaces and underscores with hyphens
    slug = re.sub(r'-+', '-', slug)       # Replace multiple hyphens with single hyphen
    slug = slug.strip('-')                # Remove leading/trailing hyphens

    return slug

class Product:
    @staticmethod
    def get_all():
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT p.*, p.stock as stock_quantity, cpu, ram, storage, graphics, display, os, keyboard, battery, weight, p.warranty_id, p.original_price,
                       p.allow_preorder, p.expected_restock_date, p.preorder_limit,
                       c.name as color, cat.name as category_name, w.warranty_name
                FROM products p
                LEFT JOIN colors c ON p.color_id = c.id
                LEFT JOIN categories cat ON p.category_id = cat.id
                LEFT JOIN warranty w ON p.warranty_id = w.warranty_id
            """)
            products = cur.fetchall()
            return products
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_id(product_id):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            current_app.logger.info(f"Fetching product with ID: {product_id}")
            cur.execute("""
                SELECT p.*, p.stock as stock_quantity, cpu, ram, storage, graphics, display, os, keyboard, battery, weight, p.warranty_id, p.original_price,
                       p.allow_preorder, p.expected_restock_date, p.preorder_limit,
                       c.name as color, cat.name as category_name, w.warranty_name,
                       p.photo, p.left_rear_view, p.back_view
                FROM products p
                LEFT JOIN colors c ON p.color_id = c.id
                LEFT JOIN categories cat ON p.category_id = cat.id
                LEFT JOIN warranty w ON p.warranty_id = w.warranty_id
                WHERE p.id = %s
            """, (product_id,))
            product = cur.fetchone()
            current_app.logger.info(f"Product fetched: {product}")
            return product
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_slug(slug):
        """Get product by URL slug generated from product name"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            current_app.logger.info(f"Fetching product with slug: {slug}")
            cur.execute("""
                SELECT p.*, p.stock as stock_quantity, cpu, ram, storage, graphics, display, os, keyboard, battery, weight, p.warranty_id, p.original_price,
                       p.allow_preorder, p.expected_restock_date, p.preorder_limit,
                       c.name as color, cat.name as category_name, w.warranty_name,
                       p.photo, p.left_rear_view, p.back_view
                FROM products p
                LEFT JOIN colors c ON p.color_id = c.id
                LEFT JOIN categories cat ON p.category_id = cat.id
                LEFT JOIN warranty w ON p.warranty_id = w.warranty_id
            """)
            products = cur.fetchall()

            # Find product by matching slug generated from name
            for product in products:
                if generate_slug(product['name']) == slug:
                    current_app.logger.info(f"Product found by slug: {product}")
                    return product

            current_app.logger.info(f"No product found with slug: {slug}")
            return None
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_low_stock_products(threshold=5):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT id, name, stock
                FROM products
                WHERE stock < %s
                ORDER BY stock ASC
            """, (threshold,))
            low_stock_products = cur.fetchall()
            return low_stock_products
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_category(category_id):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT p.*, p.stock as stock_quantity, cpu, ram, storage, graphics, display, os, keyboard, battery, weight, p.warranty_id, p.original_price,
                       p.allow_preorder, p.expected_restock_date, p.preorder_limit,
                       c.name as color, cat.name as category_name, w.warranty_name
                FROM products p
                LEFT JOIN colors c ON p.color_id = c.id
                LEFT JOIN categories cat ON p.category_id = cat.id
                LEFT JOIN warranty w ON p.warranty_id = w.warranty_id
                WHERE p.category_id = %s
            """, (category_id,))
            products = cur.fetchall()
            return products
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_categories(category_ids):
        if not category_ids:
            return []
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            format_strings = ','.join(['%s'] * len(category_ids))
            query = f"""
                SELECT p.*, p.stock as stock_quantity, cpu, ram, storage, graphics, display, os, keyboard, battery, weight, p.warranty_id, p.original_price,
                       c.name as color, cat.name as category_name
                FROM products p
                LEFT JOIN colors c ON p.color_id = c.id
                LEFT JOIN categories cat ON p.category_id = cat.id
                WHERE p.category_id IN ({format_strings})
            """
            cur.execute(query, tuple(category_ids))
            products = cur.fetchall()
            return products
        finally:
            cur.close()
            conn.close()

 

    @staticmethod
    def get_featured(limit=8):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT p.*, p.stock as stock_quantity, cpu, ram, storage, graphics, display, os, keyboard, battery, weight, p.warranty_id, p.original_price, c.name as color, w.warranty_name
                FROM products p
                LEFT JOIN colors c ON p.color_id = c.id
                LEFT JOIN warranty w ON p.warranty_id = w.warranty_id
                ORDER BY p.id DESC
                LIMIT %s
            """, (limit,))
            products = cur.fetchall()
            return products
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update_stock(product_id, quantity):
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute(
                "INSERT INTO inventory (product_id, changes) VALUES (%s, %s)",
                (product_id, quantity)
            )
            conn.commit()
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def reduce_stock(product_id, quantity):
        """Reduce product stock by specified quantity when order is placed."""
        conn = get_db()
        cur = conn.cursor()
        try:
            # First check current stock
            cur.execute("SELECT stock FROM products WHERE id = %s", (product_id,))
            result = cur.fetchone()
            if not result:
                raise ValueError(f"Product with ID {product_id} not found")

            current_stock = result[0]
            if current_stock < quantity:
                raise ValueError(f"Insufficient stock for product {product_id}. Available: {current_stock}, Requested: {quantity}")

            # Reduce stock
            cur.execute(
                "UPDATE products SET stock = stock - %s WHERE id = %s",
                (quantity, product_id)
            )
            conn.commit()

            # Log the stock change in inventory table for tracking
            cur.execute(
                "INSERT INTO inventory (product_id, changes) VALUES (%s, %s)",
                (product_id, -quantity)
            )
            conn.commit()

        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def create(name, description, price, stock, category_id=None, photo=None, warranty_id=None, cpu=None, ram=None, storage=None, graphics=None, display=None, os=None, keyboard=None, battery=None, weight=None, color_id=None, left_rear_view=None, back_view=None, original_price=None):
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO products (name, description, price, stock, category_id, photo, warranty_id, cpu, ram, storage, graphics, display, os, keyboard, battery, weight, color_id, left_rear_view, back_view, original_price)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (name, description, price, stock, category_id, photo, warranty_id, cpu, ram, storage, graphics, display, os, keyboard, battery, weight, color_id, left_rear_view, back_view, original_price)
            )
            conn.commit()
            product_id = cur.lastrowid
            return product_id
        except Exception as e:
            conn.rollback()
            raise ValueError(f"Failed to create product: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update(product_id, name=None, description=None, price=None, stock=None, category_id=None, photo=None, warranty_id=None, cpu=None, ram=None, storage=None, graphics=None, display=None, os=None, keyboard=None, battery=None, weight=None, color_id=None, left_rear_view=None, back_view=None, original_price=None):
        conn = get_db()
        cur = conn.cursor()
        try:
            updates = {}
            if name is not None:
                updates['name'] = name
            if description is not None:
                updates['description'] = description
            if price is not None:
                updates['price'] = price
            if stock is not None:
                updates['stock'] = stock
            if photo is not None:
                updates['photo'] = photo
            if warranty_id is not None:
                updates['warranty_id'] = warranty_id
            if category_id is not None:
                updates['category_id'] = category_id
            if cpu is not None:
                updates['cpu'] = cpu
            if ram is not None:
                updates['ram'] = ram
            if storage is not None:
                updates['storage'] = storage
            if graphics is not None:
                updates['graphics'] = graphics
            if display is not None:
                updates['display'] = display
            if os is not None:
                updates['os'] = os
            if keyboard is not None:
                updates['keyboard'] = keyboard
            if battery is not None:
                updates['battery'] = battery
            if weight is not None:
                updates['weight'] = weight
            if color_id is not None:
                updates['color_id'] = color_id
            if left_rear_view is not None:
                updates['left_rear_view'] = left_rear_view
            if back_view is not None:
                updates['back_view'] = back_view
            if original_price is not None:
                updates['original_price'] = original_price

            if not updates:
                raise ValueError("No fields to update")

            set_clause = ", ".join([f"`{k}` = %s" for k in updates])
            values = list(updates.values()) + [product_id]
            cur.execute(
                f"UPDATE products SET {set_clause} WHERE id = %s",
                values
            )
            conn.commit()
            return cur.rowcount > 0
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def search(query):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            like_query = f"%{query}%"
            cur.execute("""
                SELECT p.*, p.stock as stock_quantity, cpu, ram, storage, display, os, keyboard, battery, weight, p.warranty_id, color_id,
                       c.name as color, cat.name as category_name, w.warranty_name
                FROM products p
                LEFT JOIN colors c ON p.color_id = c.id
                LEFT JOIN categories cat ON p.category_id = cat.id
                LEFT JOIN warranty w ON p.warranty_id = w.warranty_id
                WHERE p.name LIKE %s
            """, (like_query,))
            results = cur.fetchall()
            return results
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_total_products_count():
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("SELECT COUNT(*) FROM products")
            result = cur.fetchone()
            return int(result[0]) if result and result[0] is not None else 0
        finally:
            cur.close()
            conn.close()
        
    @staticmethod
    def get_distinct_brands():
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT DISTINCT SUBSTRING_INDEX(TRIM(name), ' ', 1) AS brand
                FROM products
                WHERE name IS NOT NULL
                AND TRIM(name) != ''
                AND SUBSTRING_INDEX(TRIM(name), ' ', 1) != ''
                ORDER BY brand
            """)
            brands = cur.fetchall()
            return brands
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_brand(brand):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            like_query = f"{brand}%"
            cur.execute("""
                SELECT p.*, p.stock as stock_quantity, cpu, ram, storage, graphics, display, os, keyboard, battery, weight, p.warranty_id, p.original_price,
                       c.name as color, cat.name as category_name, w.warranty_name
                FROM products p
                LEFT JOIN colors c ON p.color_id = c.id
                LEFT JOIN categories cat ON p.category_id = cat.id
                LEFT JOIN warranty w ON p.warranty_id = w.warranty_id
                WHERE p.name LIKE %s
            """, (like_query,))
            products = cur.fetchall()
            return products
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_preorder_count(product_id):
        """Get count of active pre-orders for a product"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT COUNT(*) as preorder_count
                FROM pre_orders
                WHERE product_id = %s
                AND status IN ('pending', 'confirmed', 'partially_paid', 'ready_for_pickup')
            """, (product_id,))
            result = cur.fetchone()
            return result[0] if result else 0
        finally:
            cur.close()
            conn.close()

class Order:
    @staticmethod
    def get_paginated_orders(status=None, date=None, search=None, page=1, page_size=10):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        
        base_query = """
            SELECT o.id, c.first_name, c.last_name, o.status, o.order_date,
                   o.total_amount as total, o.payment_method
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE 1=1
        """
        count_query = """
            SELECT COUNT(*)
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE 1=1
        """
        params = []
        
        if status and status.lower() != 'all':
            base_query += " AND LOWER(o.status) = LOWER(%s)"
            count_query += " AND LOWER(o.status) = LOWER(%s)"
            params.append(status)
            
        if date:
            base_query += " AND DATE(o.order_date) = %s"
            count_query += " AND DATE(o.order_date) = %s"
            params.append(date)
        
        if search:
            if not (1 <= len(search) <= 20):
                raise ValueError("Search query length must be between 1 and 20 characters")
            search_clause = " AND (LOWER(CONCAT(c.first_name, ' ', c.last_name)) LIKE LOWER(%s) OR LOWER(c.first_name) LIKE LOWER(%s) OR LOWER(c.last_name) LIKE LOWER(%s))"
            base_query += search_clause
            count_query += search_clause
            like_search = f"%{search.lower()}%"
            params.extend([like_search, like_search, like_search])
            
        # Get total count
        cur.execute(count_query, params)
        total_orders = cur.fetchone()['COUNT(*)']
        
        # Add pagination to base query
        base_query += " ORDER BY o.order_date DESC LIMIT %s OFFSET %s"
        offset = (page - 1) * page_size
        params.extend([page_size, offset])
        
        print("Executing SQL:", base_query)
        print("With params:", params)
        
        cur.execute(base_query, params)
        orders = cur.fetchall()
        cur.close()
        return orders, total_orders

    @staticmethod
    def get_by_status(status):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            query = """
                SELECT o.id, c.first_name, c.last_name, o.status, o.order_date,
                       o.total_amount as total
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE LOWER(o.status) = LOWER(%s)
                ORDER BY o.order_date DESC
            """
            cur.execute(query, (status,))
            orders = cur.fetchall()
            return orders
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_id(order_id):
        """Get order details by order ID."""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT o.id, o.customer_id, o.order_date, o.total_amount, o.status, o.payment_method
                FROM orders o
                WHERE o.id = %s
            """, (order_id,))
            order = cur.fetchone()
            return order
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def cancel_order(order_id, reason=None, notes=None, staff_username=None):
        """Cancel a completed order and restore inventory"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            # Get order details and validate status
            cur.execute("""
                SELECT id, customer_id, status, total_amount
                FROM orders
                WHERE id = %s
            """, (order_id,))

            order = cur.fetchone()
            if not order:
                raise ValueError(f"Order with ID {order_id} not found")

            if order['status'].upper() != 'PENDING':
                raise ValueError(f"Only pending orders can be cancelled. Current status: {order['status']}")

            # Get order items for inventory restoration
            cur.execute("""
                SELECT oi.id, oi.product_id, oi.quantity, p.name as product_name
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = %s
            """, (order_id,))

            order_items = cur.fetchall()
            cancelled_items = []

            # Restore inventory for each item
            for item in order_items:
                # Restore stock
                cur.execute("""
                    UPDATE products
                    SET stock = stock + %s
                    WHERE id = %s
                """, (item['quantity'], item['product_id']))

                # Log inventory change
                cur.execute("""
                    INSERT INTO inventory (product_id, changes, change_date)
                    VALUES (%s, %s, NOW())
                """, (item['product_id'], item['quantity']))

                cancelled_items.append({
                    'product_name': item['product_name'],
                    'quantity': item['quantity']
                })

                current_app.logger.info(f"Restored {item['quantity']} units of {item['product_name']} to inventory")

            # Update order status to cancelled
            cur.execute("""
                UPDATE orders
                SET status = 'CANCELLED'
                WHERE id = %s
            """, (order_id,))

            conn.commit()
            current_app.logger.info(f"Order {order_id} cancelled successfully by {staff_username}")

            return {
                'cancelled_items': cancelled_items,
                'total_amount': float(order['total_amount'])
            }

        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error cancelling order {order_id}: {str(e)}")
            raise ValueError(f"Order cancellation failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def cancel_order_items(order_id, item_ids, reason=None, notes=None, staff_username=None):
        """Cancel specific items from an order and restore inventory"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            # Get order details and validate status
            cur.execute("""
                SELECT id, customer_id, status, total_amount
                FROM orders
                WHERE id = %s
            """, (order_id,))

            order = cur.fetchone()
            if not order:
                raise ValueError(f"Order with ID {order_id} not found")

            if order['status'].upper() != 'PENDING':
                raise ValueError(f"Only pending orders can be cancelled. Current status: {order['status']}")

            # Get specific order items to cancel
            placeholders = ','.join(['%s'] * len(item_ids))
            cur.execute(f"""
                SELECT oi.id, oi.product_id, oi.quantity, oi.price, p.name as product_name
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = %s AND oi.id IN ({placeholders})
            """, [order_id] + item_ids)

            items_to_cancel = cur.fetchall()
            if not items_to_cancel:
                raise ValueError("No valid items found for cancellation")

            cancelled_items = []
            refund_amount = 0

            # Process each item cancellation
            for item in items_to_cancel:
                # Restore stock
                cur.execute("""
                    UPDATE products
                    SET stock = stock + %s
                    WHERE id = %s
                """, (item['quantity'], item['product_id']))

                # Log inventory change
                cur.execute("""
                    INSERT INTO inventory (product_id, changes, change_date)
                    VALUES (%s, %s, NOW())
                """, (item['product_id'], item['quantity']))

                # Remove the cancelled items from order_items
                cur.execute("""
                    DELETE FROM order_items
                    WHERE id = %s
                """, (item['id'],))

                refund_amount += float(item['price']) * item['quantity']
                cancelled_items.append({
                    'product_name': item['product_name'],
                    'quantity': item['quantity'],
                    'price': float(item['price'])
                })

                current_app.logger.info(f"Cancelled {item['quantity']} units of {item['product_name']} from order {order_id}")

            # Check if all items were cancelled
            cur.execute("""
                SELECT COUNT(*) as remaining_items
                FROM order_items
                WHERE order_id = %s
            """, (order_id,))

            remaining_count = cur.fetchone()['remaining_items']
            order_fully_cancelled = remaining_count == 0

            # Update order status and total amount
            if order_fully_cancelled:
                cur.execute("""
                    UPDATE orders
                    SET status = 'CANCELLED', total_amount = 0
                    WHERE id = %s
                """, (order_id,))
            else:
                new_total = float(order['total_amount']) - refund_amount
                cur.execute("""
                    UPDATE orders
                    SET total_amount = %s
                    WHERE id = %s
                """, (new_total, order_id))

            conn.commit()
            current_app.logger.info(f"Partial cancellation completed for order {order_id} by {staff_username}")

            return {
                'cancelled_items': cancelled_items,
                'refund_amount': refund_amount,
                'order_fully_cancelled': order_fully_cancelled
            }

        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error cancelling order items {order_id}: {str(e)}")
            raise ValueError(f"Order item cancellation failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_order_items(order_id):
        """Get order items for a specific order."""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT oi.product_id, p.name as product_name,
                       oi.quantity, oi.price
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = %s
            """, (order_id,))
            items = cur.fetchall()
            return items
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_completed_orders_by_customer(customer_id):
        """Get completed orders for a customer with product details"""
        if not customer_id:
            return []

        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            # First check if customer exists
            cur.execute("SELECT COUNT(*) as count FROM customers WHERE id = %s", (customer_id,))
            customer_exists = cur.fetchone()['count'] > 0

            if not customer_exists:
                return []

            cur.execute("""
                SELECT o.id, o.order_date, o.total_amount, o.payment_method,
                       oi.product_id, oi.quantity, oi.price,
                       p.name as product_name, p.photo as product_photo
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE o.customer_id = %s AND o.status = 'Completed'
                ORDER BY o.order_date DESC
            """, (customer_id,))

            orders_data = cur.fetchall()

            if not orders_data:
                return []

            # Group by order_id to handle multiple items per order
            orders = {}
            for row in orders_data:
                order_id = row['id']
                if order_id not in orders:
                    orders[order_id] = {
                        'id': row['id'],
                        'order_date': row['order_date'],
                        'total_amount': float(row['total_amount']) if row['total_amount'] else 0.0,
                        'payment_method': row['payment_method'] or 'Unknown',
                        'items': []
                    }

                orders[order_id]['items'].append({
                    'product_id': row['product_id'],
                    'product_name': row['product_name'] or 'Unknown Product',
                    'product_photo': row['product_photo'] or 'default.jpg',
                    'quantity': int(row['quantity']) if row['quantity'] else 0,
                    'price': float(row['price']) if row['price'] else 0.0
                })

            return list(orders.values())
        except Exception as e:
            # Log the error but don't crash
            import logging
            logging.error(f"Error in get_completed_orders_by_customer: {str(e)}")
            return []
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def create(customer_id, order_date, status='Pending', items=None, payment_method='QR Payment'):
        conn = get_db()
        cur = conn.cursor()
        try:
            # Convert order_date to string format 'YYYY-MM-DD HH:MM:SS' if it's a datetime object
            if hasattr(order_date, 'strftime'):
                order_date_str = order_date.strftime('%Y-%m-%d %H:%M:%S')
            else:
                order_date_str = order_date

            cur.execute("""
                INSERT INTO orders (customer_id, order_date, status, total_amount, payment_method)
                VALUES (%s, %s, %s, %s, %s)
            """, (customer_id, order_date_str, status, 0.0, payment_method))
            order_id = cur.lastrowid

            total_amount = 0.0
            if items:
                # First validate stock availability for all items
                for item in items:
                    product_id = item['product_id']
                    quantity = item['quantity']

                    # Check current stock
                    cur.execute("SELECT stock, name FROM products WHERE id = %s", (product_id,))
                    result = cur.fetchone()
                    if not result:
                        raise ValueError(f"Product with ID {product_id} not found")

                    current_stock, product_name = result
                    if current_stock < quantity:
                        raise ValueError(f"Insufficient stock for {product_name}. Available: {current_stock}, Requested: {quantity}")

                # If all items have sufficient stock, proceed with order creation and stock reduction
                for item in items:
                    product_id = item['product_id']
                    quantity = item['quantity']
                    price = item['price']

                    # Insert order item
                    cur.execute("""
                        INSERT INTO order_items (order_id, product_id, quantity, price)
                        VALUES (%s, %s, %s, %s)
                    """, (order_id, product_id, quantity, price))
                    total_amount += quantity * price

                    # Reduce product stock
                    cur.execute(
                        "UPDATE products SET stock = stock - %s WHERE id = %s",
                        (quantity, product_id)
                    )

                    # Log the stock change in inventory table for tracking
                    cur.execute(
                        "INSERT INTO inventory (product_id, changes) VALUES (%s, %s)",
                        (product_id, -quantity)
                    )

            cur.execute("""
                UPDATE orders SET total_amount = %s WHERE id = %s
            """, (total_amount, order_id))

            conn.commit()
            return order_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_status_summary():
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT status, COUNT(*) as count, SUM(total_amount) as total
                FROM orders
                WHERE LOWER(status) NOT IN ('delivered', 'shipped')
                GROUP BY status
            """)
            summary = cur.fetchall()
            for item in summary:
                item['total'] = float(item['total']) if item['total'] is not None else 0.0
            return summary
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_total_amount_all():
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT SUM(total_amount) FROM orders WHERE status = 'Completed'
            """)
            result = cur.fetchone()
            return float(result[0]) if result[0] is not None else 0.0
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_total_completed_amount():
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT SUM(total_amount) FROM orders WHERE status = 'Completed'
            """)
            result = cur.fetchone()
            total_completed_amount = float(result[0]) if result and result[0] is not None else 0.0
            return total_completed_amount
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update_status(order_id, status):
        """Update order status and handle stock restoration for cancelled orders."""
        conn = get_db()
        cur = conn.cursor()
        try:
            # Get current order status
            cur.execute("SELECT status FROM orders WHERE id = %s", (order_id,))
            result = cur.fetchone()
            if not result:
                raise ValueError(f"Order with ID {order_id} not found")

            current_status = result[0]
            status = status.capitalize()
            print(f"Updating order {order_id} status from {current_status} to {status}")

            # If changing to Cancelled status, restore stock
            if status.lower() == 'cancelled' and current_status.lower() != 'cancelled':
                print(f"Restoring stock for cancelled order {order_id}")
                # Get order items to restore stock
                cur.execute("""
                    SELECT product_id, quantity
                    FROM order_items
                    WHERE order_id = %s
                """, (order_id,))
                order_items = cur.fetchall()

                # Restore stock for each item
                for product_id, quantity in order_items:
                    cur.execute(
                        "UPDATE products SET stock = stock + %s WHERE id = %s",
                        (quantity, product_id)
                    )
                    print(f"Restored {quantity} units for product {product_id}")

                    # Log the stock restoration in inventory table
                    cur.execute(
                        "INSERT INTO inventory (product_id, changes) VALUES (%s, %s)",
                        (product_id, quantity)
                    )

            # Update order status
            cur.execute(
                "UPDATE orders SET status = %s WHERE id = %s",
                (status, order_id)
            )
            conn.commit()
        except Exception as e:
            print(f"Exception in update_status: {e}")
            conn.rollback()
            raise
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_total_orders_count():
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("SELECT COUNT(*) FROM orders")
            result = cur.fetchone()
            return int(result[0]) if result[0] is not None else 0
        finally:
            cur.close()
            conn.close()

class Report:
    @staticmethod
    def get_sales(start_date, end_date):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            # Adjust end_date to include the full day by adding one day and using less than comparison
            from datetime import datetime, timedelta
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
            adjusted_start = start_dt.strftime('%Y-%m-%d 00:00:00')
            adjusted_end = end_dt.strftime('%Y-%m-%d 00:00:00')

            cur.execute("""
                SELECT DATE(o.order_date) as date,
                       SUM(oi.quantity * oi.price) as daily_sales
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                WHERE LOWER(o.status) = 'completed'
                AND o.order_date >= %s AND o.order_date < %s
                GROUP BY DATE(o.order_date)
            """, (adjusted_start, adjusted_end))
            sales = cur.fetchall()
            current_app.logger.info(f"Report.get_sales: Fetched {len(sales)} sales records for dates {adjusted_start} to {adjusted_end}.")
            return sales
        except Exception as e:
            current_app.logger.error(f"Error in Report.get_sales: {e}")
            return []
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_monthly_sales_detail(month):
        """
        Fetch detailed sales data for the given month (format: 'YYYY-MM').
        Returns a list of sales details such as order id, date, customer, total amount, etc.
        Includes both completed orders and confirmed pre-orders.
        """
        from sqlalchemy import text
        try:
            start_date = f"{month}-01"
            # Calculate end date as last day of the month
            from datetime import datetime
            import calendar
            year, mon = map(int, month.split('-'))
            last_day = calendar.monthrange(year, mon)[1]
            end_date = f"{month}-{last_day:02d}"

            sales_details = []

            # Get completed orders
            sql = text("""
                SELECT o.id as order_id, o.order_date, c.first_name, c.last_name, o.total_amount
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE o.order_date BETWEEN :start_date AND :end_date
                AND LOWER(o.status) = 'completed'
                ORDER BY o.order_date ASC
            """)
            result = db.session.execute(sql, {'start_date': start_date, 'end_date': end_date})

            for row in result:
                # Calculate grand total and profit for each order
                grand_total_sql = text("""
                    SELECT SUM(quantity * price) as grand_total
                    FROM order_items
                    WHERE order_id = :order_id
                """)
                grand_total_result = db.session.execute(grand_total_sql, {'order_id': row.order_id}).fetchone()
                grand_total = float(grand_total_result.grand_total) if grand_total_result and grand_total_result.grand_total else 0.0

                # Calculate total profit for this order
                profit_sql = text("""
                    SELECT SUM((oi.price - COALESCE(p.original_price, 0)) * oi.quantity) as total_profit
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = :order_id AND p.original_price IS NOT NULL
                """)
                profit_result = db.session.execute(profit_sql, {'order_id': row.order_id}).fetchone()
                total_profit = float(profit_result.total_profit) if profit_result and profit_result.total_profit else 0.0

                sales_details.append({
                    'order_id': row.order_id,
                    'order_date': row.order_date.strftime('%Y-%m-%d'),
                    'customer_name': f"{row.first_name} {row.last_name}",
                    'total_amount': float(row.total_amount),
                    'grand_total': grand_total,
                    'total_profit': total_profit,
                    'type': 'order'
                })

            # Get confirmed pre-orders with actual deposits (exclude $0.00 deposits)
            preorder_sql = text("""
                SELECT po.id as preorder_id, po.updated_date, c.first_name, c.last_name,
                       po.deposit_amount, po.expected_price, po.quantity, p.name as product_name
                FROM pre_orders po
                JOIN customers c ON po.customer_id = c.id
                JOIN products p ON po.product_id = p.id
                WHERE po.updated_date BETWEEN :start_date AND :end_date
                AND po.status IN ('confirmed', 'partially_paid', 'ready_for_pickup')
                AND po.deposit_amount > 0
                ORDER BY po.updated_date ASC
            """)
            preorder_result = db.session.execute(preorder_sql, {'start_date': start_date, 'end_date': end_date})

            for row in preorder_result:
                deposit_amount = float(row.deposit_amount or 0)
                # Estimate profit as 10% of deposit (conservative estimate)
                estimated_profit = deposit_amount * 0.1

                sales_details.append({
                    'order_id': f"PO-{row.preorder_id}",
                    'order_date': row.updated_date.strftime('%Y-%m-%d'),
                    'customer_name': f"{row.first_name} {row.last_name}",
                    'total_amount': deposit_amount,
                    'grand_total': deposit_amount,
                    'total_profit': estimated_profit,
                    'type': 'preorder',
                    'product_name': row.product_name
                })

            # Sort all sales details by date
            sales_details.sort(key=lambda x: x['order_date'])
            return sales_details
        except Exception as e:
            # Log error if needed
            return []

    @staticmethod
    def get_top_products(limit=10):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT
                    p.name,
                    SUM(oi.quantity) as quantity_sold,
                    SUM(oi.quantity * oi.price) as total_revenue
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                WHERE LOWER(o.status) = 'completed'
                GROUP BY p.name
                ORDER BY total_revenue DESC
                LIMIT %s
            """, (limit,))
            top_products = cur.fetchall()
            return top_products
        except Exception as e:
            current_app.logger.error(f"Error in Report.get_top_products: {e}")
            return []
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_revenue_by_category():
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT
                    c.name as category_name,
                    SUM(oi.quantity * oi.price) as total_revenue
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN categories c ON p.category_id = c.id
                JOIN orders o ON oi.order_id = o.id
                WHERE LOWER(o.status) = 'completed'
                GROUP BY c.name
                ORDER BY total_revenue DESC
            """)
            revenue_data = cur.fetchall()
            current_app.logger.info(f"Report.get_revenue_by_category: Fetched {len(revenue_data)} category revenue records.")
            print(f"DEBUG: Revenue by category raw data: {revenue_data}")
            return revenue_data
        except Exception as e:
            current_app.logger.error(f"Error in Report.get_revenue_by_category: {e}")
            return []
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_monthly_sales(start_date, end_date):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            # Get sales from completed orders
            cur.execute("""
                SELECT
                    DATE_FORMAT(o.order_date, '%Y-%m') as month,
                    SUM(oi.quantity * oi.price) as total_sales,
                    SUM(oi.quantity * (oi.price - COALESCE(p.original_price, 0))) as total_profit
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE o.order_date BETWEEN %s AND %s
                AND LOWER(o.status) = 'completed'
                GROUP BY month
                ORDER BY month ASC
            """, (start_date, end_date))

            order_sales = cur.fetchall()

            # Get sales from confirmed pre-orders (deposit payments) - exclude $0.00 deposits
            cur.execute("""
                SELECT
                    DATE_FORMAT(po.updated_date, '%Y-%m') as month,
                    SUM(CASE
                        WHEN po.status IN ('confirmed', 'partially_paid', 'ready_for_pickup')
                        AND po.deposit_amount > 0
                        THEN po.deposit_amount
                        ELSE 0
                    END) as total_sales,
                    SUM(CASE
                        WHEN po.status IN ('confirmed', 'partially_paid', 'ready_for_pickup')
                        AND po.deposit_amount > 0
                        THEN po.deposit_amount * 0.1
                        ELSE 0
                    END) as total_profit
                FROM pre_orders po
                WHERE po.updated_date BETWEEN %s AND %s
                AND po.status IN ('confirmed', 'partially_paid', 'ready_for_pickup')
                AND po.deposit_amount > 0
                GROUP BY month
                ORDER BY month ASC
            """, (start_date, end_date))

            preorder_sales = cur.fetchall()

            # Combine the results
            combined_sales = {}

            # Add order sales
            for sale in order_sales:
                month = sale['month']
                combined_sales[month] = {
                    'month': month,
                    'total_sales': float(sale['total_sales'] or 0),
                    'total_profit': float(sale['total_profit'] or 0)
                }

            # Add pre-order sales
            for sale in preorder_sales:
                month = sale['month']
                if month in combined_sales:
                    combined_sales[month]['total_sales'] += float(sale['total_sales'] or 0)
                    combined_sales[month]['total_profit'] += float(sale['total_profit'] or 0)
                else:
                    combined_sales[month] = {
                        'month': month,
                        'total_sales': float(sale['total_sales'] or 0),
                        'total_profit': float(sale['total_profit'] or 0)
                    }

            # Convert to list and add month labels
            result = []
            for month_data in sorted(combined_sales.values(), key=lambda x: x['month']):
                month_data['month_label'] = month_data['month'].split('-')[1]
                result.append(month_data)

            return result
            db_monthly_sales = cur.fetchall()
            current_app.logger.info(f"Report.get_monthly_sales: start_date={start_date}, end_date={end_date}, raw_data={db_monthly_sales}")
            print(f"DEBUG: Report.get_monthly_sales: start_date={start_date}, end_date={end_date}, raw_data={db_monthly_sales}")

            # Generate list of months between start_date and end_date
            start = datetime.strptime(start_date, '%Y-%m-%d')
            end = datetime.strptime(end_date, '%Y-%m-%d')
            months = []
            current = start.replace(day=1)
            while current <= end:
                months.append(current.strftime('%Y-%m'))
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1)
                else:
                    current = current.replace(month=current.month + 1)

            sales_dict = {sale['month']: {'total_sales': float(sale['total_sales']), 'total_profit': float(sale['total_profit']) if sale['total_profit'] else 0.0} for sale in db_monthly_sales}
            full_range_sales = []
            for month_str in months:
                month_name = datetime.strptime(month_str, '%Y-%m').strftime('%b')
                month_data = sales_dict.get(month_str, {'total_sales': 0.0, 'total_profit': 0.0})
                full_range_sales.append({
                    'month': month_str,
                    'month_label': month_name,
                    'total_sales': month_data['total_sales'],
                    'total_profit': month_data['total_profit']
                })
            
            current_app.logger.info(f"Report.get_monthly_sales: Generated {len(full_range_sales)} monthly sales records.")
            return full_range_sales
        except Exception as e:
            current_app.logger.error(f"Error in Report.get_monthly_sales: {e}")
            return []
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_total_revenue_this_month():
        conn = get_db()
        cur = conn.cursor()
        try:
            # Get revenue from completed orders
            cur.execute("""
                SELECT SUM(oi.quantity * oi.price)
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                WHERE LOWER(o.status) = 'completed'
                AND YEAR(o.order_date) = YEAR(CURDATE())
                AND MONTH(o.order_date) = MONTH(CURDATE())
            """)
            order_result = cur.fetchone()
            order_revenue = float(order_result[0]) if order_result[0] is not None else 0.0

            # Get revenue from confirmed pre-orders (deposit payments) - exclude $0.00 deposits
            cur.execute("""
                SELECT SUM(deposit_amount)
                FROM pre_orders
                WHERE status IN ('confirmed', 'partially_paid', 'ready_for_pickup')
                AND deposit_amount > 0
                AND YEAR(updated_date) = YEAR(CURDATE())
                AND MONTH(updated_date) = MONTH(CURDATE())
            """)
            preorder_result = cur.fetchone()
            preorder_revenue = float(preorder_result[0]) if preorder_result[0] is not None else 0.0

            total_revenue = order_revenue + preorder_revenue
            return total_revenue
        except Exception as e:
            current_app.logger.error(f"Error in Report.get_total_revenue_this_month: {e}")
            return 0.0
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_average_order_value_this_month():
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT AVG(total_amount)
                FROM orders
                WHERE LOWER(status) = 'completed'
                AND YEAR(order_date) = YEAR(CURDATE())
                AND MONTH(order_date) = MONTH(CURDATE())
            """)
            result = cur.fetchone()
            avg_order_value = float(result[0]) if result[0] is not None else 0.0
            return avg_order_value
        except Exception as e:
            current_app.logger.error(f"Error in Report.get_average_order_value_this_month: {e}")
            return 0.0
        finally:
            cur.close()
            conn.close()

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class Customer(Base):
    __tablename__ = 'customers'
    id = Column(Integer, primary_key=True)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(20))
    address = Column(String(255))
    created_at = Column(DateTime)

    @staticmethod
    def create(first_name, last_name, email, password, phone=None, address=None):
        from werkzeug.security import generate_password_hash
        conn = get_db()
        cur = conn.cursor()
        now = datetime.now()
        try:
            current_app.logger.info(f"Customer.create: Password received (first 10 chars): {password[:10]}...")
            # Only hash if the password doesn't appear to be already hashed (e.g., starts with 'scrypt:')
            if not password.startswith('scrypt:'):
                hashed_password = generate_password_hash(password)
                current_app.logger.info(f"Customer.create: Password was plaintext, hashed to: {hashed_password[:10]}...")
            else:
                hashed_password = password
                current_app.logger.info(f"Customer.create: Password already hashed, using as is: {hashed_password[:10]}...")
            
            current_app.logger.info(f"Executing customer insert for {first_name} {last_name} with email {email}")
            cur.execute(
                """INSERT INTO customers
                (first_name, last_name, email, password, phone, address, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (first_name, last_name, email, hashed_password, phone, address, now)
            )
            customer_id = cur.lastrowid
            conn.commit()
            current_app.logger.info(f"Customer insert committed with ID: {customer_id}")
            cur.execute("SELECT created_at FROM customers WHERE id = %s", (customer_id,))
            result = cur.fetchone()
            if result:
                created_at = result[0]
            else:
                created_at = None
            return customer_id
        except mysql.connector.Error as err:
            current_app.logger.error(f"Customer insert failed: {str(err)}")
            conn.rollback()
            if err.errno == 1062:
                raise ValueError("Email already exists")
            raise ValueError(f"Failed to create customer: {str(err)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_name_or_email(first_name, last_name, email):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            customer = None
            if email:
                # Try to find by email first, case-insensitive and trimmed
                current_app.logger.info(f"Attempting to find customer by email: {email}")
                cur.execute("""
                    SELECT id, first_name, last_name, email, password FROM customers
                    WHERE LOWER(TRIM(email)) = LOWER(TRIM(%s))
                    LIMIT 1
                """, (email,))
                customer = cur.fetchone()
                if customer:
                    current_app.logger.info(f"Customer found by email: {customer['email']}")
                    return customer

            # If not found by email, or email was not provided, try by name
            if first_name is not None and last_name is not None:
                current_app.logger.info(f"Attempting to find customer by first_name: {first_name}, last_name: {last_name}")
                cur.execute("""
                    SELECT id, first_name, last_name, email, password FROM customers
                    WHERE LOWER(TRIM(first_name)) = LOWER(TRIM(%s)) AND LOWER(TRIM(last_name)) = LOWER(TRIM(%s))
                    LIMIT 1
                """, (first_name, last_name))
                customer = cur.fetchone()
                if customer:
                    current_app.logger.info(f"Customer found by name: {customer['first_name']} {customer['last_name']}")
                    return customer
            elif first_name is not None and last_name is None: # Handle case where only first name is given
                current_app.logger.info(f"Attempting to find customer by first_name only (searching first_name or last_name): {first_name}")
                cur.execute("""
                    SELECT id, first_name, last_name, email, password FROM customers
                    WHERE LOWER(TRIM(first_name)) = LOWER(TRIM(%s)) OR LOWER(TRIM(last_name)) = LOWER(TRIM(%s))
                    LIMIT 1
                """, (first_name, first_name))
                customer = cur.fetchone()
                if customer:
                    current_app.logger.info(f"Customer found by single name (first_name or last_name match): {customer['first_name']} {customer['last_name']}")
                    return customer

            return None # No customer found
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_all():
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT id, first_name, last_name, email, phone, address, created_at
                FROM customers
                ORDER BY last_name, first_name
            """)
            customers = cur.fetchall()
            return customers
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_id(customer_id):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT id, first_name, last_name, email, phone, address
                FROM customers
                WHERE id = %s
            """, (customer_id,))
            customer = cur.fetchone()
            return customer
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update(customer_id, **kwargs):
        valid_fields = {'first_name', 'last_name', 'email', 'phone', 'address'}
        updates = {k: v for k, v in kwargs.items() if k in valid_fields}

        if not updates:
            raise ValueError("No valid fields to update")

        conn = get_db()
        cur = conn.cursor()
        try:
            set_clause = ", ".join([f"{k} = %s" for k in updates])
            values = list(updates.values()) + [customer_id]

            cur.execute(
                f"UPDATE customers SET {set_clause} WHERE id = %s",
                values
            )
            conn.commit()
            return True
        except mysql.connector.Error as err:
            conn.rollback()
            if err.errno == 1062:
                raise ValueError("Email already exists")
            raise ValueError(f"Failed to update customer: {str(err)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def delete(customer_id):
        """Delete a customer and all related orders and order items."""
        conn = get_db()
        cur = conn.cursor()
        try:
            # Check if customer exists
            cur.execute("SELECT COUNT(*) FROM customers WHERE id = %s", (customer_id,))
            if cur.fetchone()[0] == 0:
                raise ValueError("Customer not found")

            # Get all orders for this customer
            cur.execute("SELECT id FROM orders WHERE customer_id = %s", (customer_id,))
            order_ids = [row[0] for row in cur.fetchall()]

            # Delete order items for all orders
            if order_ids:
                placeholders = ','.join(['%s'] * len(order_ids))
                cur.execute(f"DELETE FROM order_items WHERE order_id IN ({placeholders})", order_ids)
                print(f"Deleted order items for {len(order_ids)} orders")

            # Delete all orders for this customer
            cur.execute("DELETE FROM orders WHERE customer_id = %s", (customer_id,))
            deleted_orders = cur.rowcount
            print(f"Deleted {deleted_orders} orders")

            # Delete the customer
            cur.execute("DELETE FROM customers WHERE id = %s", (customer_id,))
            deleted_customers = cur.rowcount

            conn.commit()

            if deleted_customers == 0:
                raise ValueError("Customer not found or already deleted")

            return True
        except ValueError as e:
            conn.rollback()
            raise e
        except Exception as e:
            conn.rollback()
            print(f"Error deleting customer: {e}")
            raise RuntimeError(f"An unexpected error occurred while deleting the customer: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_orders(customer_id, status=None):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        query = """
            SELECT o.id, o.order_date, o.status,
                   SUM(oi.quantity * oi.price) as total_amount
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.customer_id = %s
            AND LOWER(o.status) NOT IN ('delivered', 'shipped')
        """
        params = [customer_id]
        if status:
            query += " AND LOWER(o.status) = LOWER(%s)"
            params.append(status)
        query += """
            GROUP BY o.id
            ORDER BY o.order_date DESC
        """
        cur.execute(query, params)
        orders = cur.fetchall()

        for order in orders:
            if isinstance(order['order_date'], (datetime,)):
                order['order_date'] = order['order_date'].strftime('%Y-%m-%d')
            cur.execute("""
                SELECT oi.product_id, p.name as product_name, oi.quantity, oi.price
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = %s
            """, (order['id'],))
            items = cur.fetchall()
            current_app.logger.info(f"DEBUG: Raw SQL result for order {order['id']} items: {items}")
            current_app.logger.info(f"DEBUG: Type of items for order {order['id']}: {type(items)}")
            order['items'] = items

        cur.close()
        conn.close()
        return orders

    @staticmethod
    def get_new_customers_this_month():
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT COUNT(*)
                FROM customers
                WHERE YEAR(created_at) = YEAR(CURDATE())
                AND MONTH(created_at) = MONTH(CURDATE())
            """)
            result = cur.fetchone()
            new_customers = int(result[0]) if result[0] is not None else 0
            return new_customers
        except Exception as e:
            current_app.logger.error(f"Error in Customer.get_new_customers_this_month: {e}")
            print(f"Error in Customer.get_new_customers_this_month: {e}")
            return 0
        finally:
            cur.close()
            conn.close()

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

class Category(Base):
    __tablename__ = 'categories'
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)

    def get_product_count(self):
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT COUNT(*) FROM products WHERE category_id = %s
            """, (self.id,))
            result = cur.fetchone()
            return int(result[0]) if result and result[0] is not None else 0
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_all():
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("SELECT id, name FROM categories ORDER BY name")
            categories = cur.fetchall()
            return categories
        finally:
            cur.close()
            conn.close()

class User:
    @staticmethod
    def create(username, password, role='staff'):
        if not password or len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
            
        hashed_password = generate_password_hash(password)
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute(
                "INSERT INTO users (username, password, role) VALUES (%s, %s, %s)",
                (username, hashed_password, role)
            )
            conn.commit()
            return cur.lastrowid
        except Exception as e:
            conn.rollback()
            raise ValueError(f"User creation failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_username(username):
        """Get user by username from users table (for staff/admin) or customer by email from customers table"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            # First try to find in users table (for staff/admin)
            cur.execute("""
                SELECT id, username, password, role
                FROM users
                WHERE username = %s
            """, (username,))
            user = cur.fetchone()
            if user:
                return user

            # If not found in users table, try customers table (for customer login by email)
            cur.execute("""
                SELECT id, first_name, last_name, email, password, phone, address, created_at
                FROM customers
                WHERE email = %s
            """, (username,))
            customer = cur.fetchone()
            return customer
        except Exception as e:
            print(f"Database error in User.get_by_username: {str(e)}")
            return None
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_role(role):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("SELECT * FROM users WHERE role = %s", (role,))
            users = cur.fetchall()
            return users
        except Exception as e:
            print(f"Database error in get_by_role: {str(e)}")
            return None
        finally:
            cur.close()
            conn.close()

class Supplier:
    @staticmethod
    def get_all():
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("SELECT id, name, contact_person, phone, email, address FROM suppliers ORDER BY name")
            suppliers = cur.fetchall()
            return suppliers
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update(supplier_id, name, contact_person, phone, email, address):
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                UPDATE suppliers
                SET name = %s, contact_person = %s, phone = %s, email = %s, address = %s
                WHERE id = %s
            """, (name, contact_person, phone, email, address, supplier_id))
            conn.commit()
            return True
        except Exception as e:
            print(f"Error updating supplier: {e}")
            conn.rollback()
            return False
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def create(name, contact_person, phone, email, address):
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO suppliers (name, contact_person, phone, email, address)
                VALUES (%s, %s, %s, %s, %s)
            """, (name, contact_person, phone, email, address))
            conn.commit()
            return cur.lastrowid
        except Exception as e:
            print(f"Error creating supplier: {e}")
            conn.rollback()
            return None
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def search(query):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            like_query = f"%{query}%"
            cur.execute("""
                SELECT id, name, contact_person, phone, email, address
                FROM suppliers
                WHERE name LIKE %s OR contact_person LIKE %s OR email LIKE %s
                ORDER BY name
            """, (like_query, like_query, like_query))
            results = cur.fetchall()
            return results
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def delete(supplier_id):
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("SELECT COUNT(*) FROM products WHERE supplier_id = %s", (supplier_id,))
            product_count = cur.fetchone()[0]

            if product_count > 0:
                raise ValueError("Cannot delete supplier with associated products.")

            cur.execute("DELETE FROM suppliers WHERE id = %s", (supplier_id,))
            conn.commit()

            if cur.rowcount == 0:
                raise ValueError("Supplier not found or already deleted.")
            
            return True
        except ValueError as e:
            conn.rollback()
            raise e
        except Exception as e:
            conn.rollback()
            print(f"Error deleting supplier: {e}")
            raise RuntimeError("An unexpected error occurred while deleting the supplier.")
        finally:
            cur.close()
            conn.close()

from sqlalchemy import Column, Integer, String

class Color(Base):
    __tablename__ = 'colors'
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)

    @staticmethod
    def get_all():
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("SELECT id, name FROM colors ORDER BY name")
            colors = cur.fetchall()
            return colors
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def create(name):
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("INSERT INTO colors (name) VALUES (%s)", (name,))
            conn.commit()
            color_id = cur.lastrowid
            return color_id
        except Exception as e:
            conn.rollback()
            raise ValueError(f"Color creation failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

class Warranty:
    @staticmethod
    def get_all():
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("SELECT warranty_id, warranty_name FROM warranty ORDER BY warranty_name")
            warranties = cur.fetchall()
            return warranties
        finally:
            cur.close()
            conn.close()
    @staticmethod
    def get_by_id(warranty_id):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("SELECT warranty_id, warranty_name, warranty_duration, warranty_coverage FROM warranty WHERE warranty_id = %s", (warranty_id,))
            warranty = cur.fetchone()
            return warranty
        finally:
            cur.close()
            conn.close()


class Notification:
    @staticmethod
    def create_notification(customer_id, message, notification_type='info', related_id=None):
        """Create a web notification for a customer"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO notifications (customer_id, message, notification_type, related_id, created_date, is_read)
                VALUES (%s, %s, %s, %s, NOW(), FALSE)
            """, (customer_id, message, notification_type, related_id))

            notification_id = cur.lastrowid
            conn.commit()
            current_app.logger.info(f"Notification created for customer {customer_id}: {message}")
            return notification_id

        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error creating notification: {str(e)}")
            raise ValueError(f"Notification creation failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_customer_notifications(customer_id, unread_only=False):
        """Get notifications for a customer"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            query = """
                SELECT id, message, notification_type, related_id, created_date, is_read
                FROM notifications
                WHERE customer_id = %s
            """
            params = [customer_id]

            if unread_only:
                query += " AND is_read = FALSE"

            query += " ORDER BY created_date DESC LIMIT 50"

            cur.execute(query, params)
            notifications = cur.fetchall()
            return notifications

        except Exception as e:
            current_app.logger.error(f"Error fetching notifications: {str(e)}")
            return []
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def mark_as_read(notification_id, customer_id):
        """Mark a notification as read"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                UPDATE notifications
                SET is_read = TRUE
                WHERE id = %s AND customer_id = %s
            """, (notification_id, customer_id))

            conn.commit()
            return cur.rowcount > 0

        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error marking notification as read: {str(e)}")
            return False
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def mark_all_as_read(customer_id):
        """Mark all notifications as read for a customer"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                UPDATE notifications
                SET is_read = TRUE
                WHERE customer_id = %s AND is_read = FALSE
            """, (customer_id,))

            conn.commit()
            return cur.rowcount

        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error marking all notifications as read: {str(e)}")
            return 0
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def clear_all_notifications(customer_id):
        """Clear all notifications for a customer"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                DELETE FROM notifications
                WHERE customer_id = %s
            """, (customer_id,))

            deleted_count = cur.rowcount
            conn.commit()
            return deleted_count

        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error clearing all notifications: {str(e)}")
            return 0
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def cleanup_old_notifications():
        """Delete notifications older than 24 hours"""
        conn = get_db()
        cur = conn.cursor()
        try:
            # Delete notifications older than 24 hours
            cur.execute("""
                DELETE FROM notifications
                WHERE created_at < NOW() - INTERVAL 24 HOUR
            """)

            deleted_count = cur.rowcount
            conn.commit()

            if deleted_count > 0:
                current_app.logger.info(f"Cleaned up {deleted_count} old notifications (older than 24 hours)")

            return deleted_count

        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error cleaning up old notifications: {str(e)}")
            return 0
        finally:
            cur.close()
            conn.close()


class PreOrderPayment:
    @staticmethod
    def create(pre_order_id, payment_amount, payment_type='deposit', payment_method='QR Payment', session_id=None, notes=None):
        """Create a new payment record for a pre-order"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO pre_order_payments (pre_order_id, payment_amount, payment_type,
                                              payment_method, session_id, notes)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (pre_order_id, payment_amount, payment_type, payment_method, session_id, notes))

            payment_id = cur.lastrowid
            conn.commit()
            return payment_id
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_preorder(pre_order_id):
        """Get all payments for a specific pre-order"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT * FROM pre_order_payments
                WHERE pre_order_id = %s
                ORDER BY payment_date ASC
            """, (pre_order_id,))

            payments = cur.fetchall()
            return payments
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_total_paid(pre_order_id):
        """Get total amount paid for a pre-order"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT COALESCE(SUM(payment_amount), 0) as total_paid
                FROM pre_order_payments
                WHERE pre_order_id = %s AND payment_status = 'completed'
            """, (pre_order_id,))

            result = cur.fetchone()
            return float(result[0]) if result else 0.00
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update_status(payment_id, status):
        """Update payment status"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                UPDATE pre_order_payments
                SET payment_status = %s, updated_at = NOW()
                WHERE id = %s
            """, (status, payment_id))

            conn.commit()
            return cur.rowcount > 0
        finally:
            cur.close()
            conn.close()


class PreOrder:
    @staticmethod
    def create(customer_id, product_id, quantity, expected_price=None, deposit_amount=0.00,
               deposit_payment_method=None, expected_availability_date=None, notes=None):
        """Create a new pre-order"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO pre_orders (customer_id, product_id, quantity, expected_price,
                                      deposit_amount, deposit_payment_method, status,
                                      expected_availability_date, notes, created_date)
                VALUES (%s, %s, %s, %s, %s, %s, 'pending', %s, %s, NOW())
            """, (customer_id, product_id, quantity, expected_price, deposit_amount,
                  deposit_payment_method, expected_availability_date, notes))

            pre_order_id = cur.lastrowid
            conn.commit()

            current_app.logger.info(f"Pre-order created: ID {pre_order_id}")
            return pre_order_id
        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error creating pre-order: {str(e)}")
            raise ValueError(f"Pre-order creation failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_id(pre_order_id):
        """Get pre-order by ID with customer and product details"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT po.*,
                       c.first_name, c.last_name, c.email, c.phone,
                       p.name as product_name, p.price as current_price, p.photo as product_photo,
                       p.stock as current_stock
                FROM pre_orders po
                JOIN customers c ON po.customer_id = c.id
                JOIN products p ON po.product_id = p.id
                WHERE po.id = %s
            """, (pre_order_id,))

            pre_order = cur.fetchone()
            return pre_order
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_customer(customer_id, status=None):
        """Get all pre-orders for a customer with payment history, optionally filtered by status"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            base_query = """
                SELECT po.*,
                       p.name as product_name, p.price as current_price, p.photo as product_photo,
                       p.stock as current_stock,
                       COALESCE(po.total_paid, 0) as total_paid
                FROM pre_orders po
                JOIN products p ON po.product_id = p.id
                WHERE po.customer_id = %s
            """

            params = [customer_id]
            if status:
                base_query += " AND po.status = %s"
                params.append(status)

            base_query += " ORDER BY po.created_date DESC"

            cur.execute(base_query, params)
            pre_orders = cur.fetchall()

            # Add payment history for each pre-order
            for preorder in pre_orders:
                preorder['payment_history'] = PreOrderPayment.get_by_preorder(preorder['id'])

            return pre_orders
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_all_paginated(page=1, page_size=20, status=None, product_id=None):
        """Get paginated pre-orders for staff management"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            # Build WHERE clause
            where_conditions = []
            params = []

            if status:
                if isinstance(status, list):
                    # Handle multiple statuses
                    placeholders = ', '.join(['%s'] * len(status))
                    where_conditions.append(f"po.status IN ({placeholders})")
                    params.extend(status)
                else:
                    # Handle single status
                    where_conditions.append("po.status = %s")
                    params.append(status)

            if product_id:
                where_conditions.append("po.product_id = %s")
                params.append(product_id)

            where_clause = ""
            if where_conditions:
                where_clause = "WHERE " + " AND ".join(where_conditions)

            # Count total records
            count_query = f"""
                SELECT COUNT(*) as total
                FROM pre_orders po
                {where_clause}
            """
            cur.execute(count_query, params)
            total_count = cur.fetchone()['total']

            # Get paginated results
            offset = (page - 1) * page_size
            data_query = f"""
                SELECT po.*,
                       c.first_name, c.last_name, c.email, c.phone,
                       p.name as product_name, p.price as current_price, p.photo as product_photo,
                       p.stock as current_stock
                FROM pre_orders po
                JOIN customers c ON po.customer_id = c.id
                JOIN products p ON po.product_id = p.id
                {where_clause}
                ORDER BY po.created_date DESC
                LIMIT %s OFFSET %s
            """

            params.extend([page_size, offset])
            cur.execute(data_query, params)
            pre_orders = cur.fetchall()

            return {
                'pre_orders': pre_orders,
                'total_count': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update_status(pre_order_id, status, notes=None):
        """Update pre-order status"""
        conn = get_db()
        cur = conn.cursor()
        try:
            update_query = """
                UPDATE pre_orders
                SET status = %s, updated_date = NOW()
            """
            params = [status]

            if notes:
                update_query += ", notes = %s"
                params.append(notes)

            update_query += " WHERE id = %s"
            params.append(pre_order_id)

            cur.execute(update_query, params)
            conn.commit()

            if cur.rowcount == 0:
                raise ValueError(f"Pre-order with ID {pre_order_id} not found")

            current_app.logger.info(f"Pre-order {pre_order_id} status updated to {status}")
            return True
        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error updating pre-order status: {str(e)}")
            raise ValueError(f"Status update failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update_deposit_amount(pre_order_id, new_deposit_amount):
        """Update deposit amount for a pre-order"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                UPDATE pre_orders
                SET deposit_amount = %s, updated_date = NOW()
                WHERE id = %s
            """, (new_deposit_amount, pre_order_id))

            conn.commit()

            if cur.rowcount == 0:
                raise ValueError(f"Pre-order with ID {pre_order_id} not found")

            current_app.logger.info(f"Pre-order {pre_order_id} deposit amount updated to ${new_deposit_amount:.2f}")
            return True
        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error updating pre-order deposit amount: {str(e)}")
            raise ValueError(f"Deposit amount update failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update_availability_date(pre_order_id, availability_date):
        """Update expected availability date"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                UPDATE pre_orders
                SET expected_availability_date = %s, updated_date = NOW()
                WHERE id = %s
            """, (availability_date, pre_order_id))

            conn.commit()

            if cur.rowcount == 0:
                raise ValueError(f"Pre-order with ID {pre_order_id} not found")

            return True
        except Exception as e:
            conn.rollback()
            raise ValueError(f"Availability date update failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def add_deposit_payment(pre_order_id, deposit_amount, payment_method):
        """Add or update deposit payment for pre-order"""
        conn = get_db()
        cur = conn.cursor()
        try:
            # Get current deposit amount and total price
            cur.execute("""
                SELECT deposit_amount, expected_price * quantity as total_price,
                       COALESCE(total_paid, 0) as current_paid
                FROM pre_orders WHERE id = %s
            """, (pre_order_id,))
            result = cur.fetchone()
            if not result:
                raise ValueError(f"Pre-order with ID {pre_order_id} not found")

            current_deposit = float(result[0] or 0.00)
            total_price = float(result[1])
            current_paid = float(result[2])
            deposit_amount = float(deposit_amount)
            new_total_deposit = current_deposit + deposit_amount
            new_total_paid = current_paid + deposit_amount

            # Determine payment type
            if current_paid == 0 and new_total_paid >= total_price:
                payment_type = 'full'
            elif current_paid == 0:
                payment_type = 'deposit'
            else:
                payment_type = 'balance'

            # Create payment record
            payment_id = PreOrderPayment.create(
                pre_order_id=pre_order_id,
                payment_amount=deposit_amount,
                payment_type=payment_type,
                payment_method=payment_method,
                notes=f'{payment_type.title()} payment'
            )

            # Update deposit amount and payment method
            cur.execute("""
                UPDATE pre_orders
                SET deposit_amount = %s, deposit_payment_method = %s,
                    status = CASE
                        WHEN status = 'pending' THEN 'confirmed'
                        WHEN status = 'confirmed' THEN 'partially_paid'
                        ELSE status
                    END,
                    updated_date = NOW()
                WHERE id = %s
            """, (new_total_deposit, payment_method, pre_order_id))

            conn.commit()
            current_app.logger.info(f"Deposit payment added to pre-order {pre_order_id}: ${deposit_amount}")
            return new_total_deposit
        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error adding deposit payment: {str(e)}")
            raise ValueError(f"Deposit payment failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_product(product_id, status=None):
        """Get pre-orders for a specific product"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            base_query = """
                SELECT po.*,
                       c.first_name, c.last_name, c.email
                FROM pre_orders po
                JOIN customers c ON po.customer_id = c.id
                WHERE po.product_id = %s
            """

            params = [product_id]
            if status:
                base_query += " AND po.status = %s"
                params.append(status)

            base_query += " ORDER BY po.created_date ASC"  # FIFO order

            cur.execute(base_query, params)
            pre_orders = cur.fetchall()
            return pre_orders
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def cancel_pre_order(pre_order_id, reason=None):
        """Cancel a pre-order"""
        conn = get_db()
        cur = conn.cursor()
        try:
            # Get pre-order details for refund processing
            cur.execute("""
                SELECT deposit_amount, deposit_payment_method, status
                FROM pre_orders
                WHERE id = %s
            """, (pre_order_id,))

            result = cur.fetchone()
            if not result:
                raise ValueError(f"Pre-order with ID {pre_order_id} not found")

            deposit_amount, payment_method, current_status = result

            # Update status to cancelled
            notes_update = f"Cancelled. Reason: {reason}" if reason else "Cancelled"
            cur.execute("""
                UPDATE pre_orders
                SET status = 'cancelled', notes = %s, updated_date = NOW()
                WHERE id = %s
            """, (notes_update, pre_order_id))

            conn.commit()

            # Return refund information if there was a deposit
            refund_info = None
            if deposit_amount and deposit_amount > 0:
                refund_info = {
                    'amount': deposit_amount,
                    'payment_method': payment_method
                }

            current_app.logger.info(f"Pre-order {pre_order_id} cancelled")
            return refund_info
        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error cancelling pre-order: {str(e)}")
            raise ValueError(f"Cancellation failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def mark_ready_for_pickup(pre_order_id, actual_availability_date=None):
        """Mark pre-order as ready for pickup when stock arrives"""
        conn = get_db()
        cur = conn.cursor()
        try:
            if not actual_availability_date:
                actual_availability_date = datetime.now().date()

            cur.execute("""
                UPDATE pre_orders
                SET status = 'ready_for_pickup',
                    actual_availability_date = %s,
                    updated_date = NOW()
                WHERE id = %s AND status IN ('confirmed', 'partially_paid')
            """, (actual_availability_date, pre_order_id))

            conn.commit()

            if cur.rowcount == 0:
                raise ValueError(f"Pre-order {pre_order_id} not found or not in valid status for pickup")

            current_app.logger.info(f"Pre-order {pre_order_id} marked ready for pickup")
            return True
        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error marking pre-order ready: {str(e)}")
            raise ValueError(f"Ready for pickup update failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def complete_pre_order(pre_order_id, final_payment_amount=0.00, final_payment_method=None):
        """Complete pre-order when customer picks up and pays remaining balance"""
        conn = get_db()
        cur = conn.cursor()
        try:
            # Get pre-order details
            cur.execute("""
                SELECT customer_id, product_id, quantity, expected_price, deposit_amount
                FROM pre_orders
                WHERE id = %s AND status = 'ready_for_pickup'
            """, (pre_order_id,))

            result = cur.fetchone()
            if not result:
                raise ValueError(f"Pre-order {pre_order_id} not found or not ready for pickup")

            customer_id, product_id, quantity, expected_price, deposit_amount = result

            # Calculate total amount paid
            total_paid = float(deposit_amount or 0.00) + float(final_payment_amount)

            # Create regular order from pre-order
            order_id = Order.create(
                customer_id=customer_id,
                order_date=datetime.now(),
                status='Completed',
                items=[{
                    'product_id': product_id,
                    'quantity': quantity,
                    'price': expected_price or 0.00
                }],
                payment_method=final_payment_method or 'Cash'
            )

            # Update pre-order status and link to order
            cur.execute("""
                UPDATE pre_orders
                SET status = 'completed', updated_date = NOW()
                WHERE id = %s
            """, (pre_order_id,))

            # Link order to pre-order
            cur.execute("""
                UPDATE orders
                SET pre_order_id = %s
                WHERE id = %s
            """, (pre_order_id, order_id))

            conn.commit()

            current_app.logger.info(f"Pre-order {pre_order_id} completed, order {order_id} created")
            return order_id
        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error completing pre-order: {str(e)}")
            raise ValueError(f"Pre-order completion failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def delete_pre_order(pre_order_id):
        """Delete a pre-order (not allowed for active 'ready_for_pickup' status)"""
        conn = get_db()
        cur = conn.cursor()
        try:
            # First check if pre-order exists and get its status
            cur.execute("""
                SELECT status, deposit_amount, total_paid
                FROM pre_orders
                WHERE id = %s
            """, (pre_order_id,))

            result = cur.fetchone()
            if not result:
                raise ValueError(f"Pre-order with ID {pre_order_id} not found")

            status, deposit_amount, total_paid = result

            # Only prevent deletion of active pre-orders that are ready for pickup
            if status == 'ready_for_pickup':
                raise ValueError(f"Cannot delete pre-order with status '{status}'. Pre-orders ready for pickup cannot be deleted.")

            # Warn if there's payment amount (for audit purposes)
            if (deposit_amount and float(deposit_amount) > 0) or (total_paid and float(total_paid) > 0):
                current_app.logger.warning(f"Deleting pre-order {pre_order_id} with payment history - deposit: ${deposit_amount}, total paid: ${total_paid}")

            # Delete the pre-order (related payments will be deleted automatically due to CASCADE)
            cur.execute("DELETE FROM pre_orders WHERE id = %s", (pre_order_id,))

            if cur.rowcount == 0:
                raise ValueError(f"Failed to delete pre-order {pre_order_id}")

            conn.commit()
            current_app.logger.info(f"Pre-order {pre_order_id} (status: {status}) deleted successfully by staff")
            return True

        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error deleting pre-order {pre_order_id}: {str(e)}")
            raise ValueError(f"Pre-order deletion failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_stats():
        """Get pre-order statistics for dashboard"""
        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)

            # Get counts by status
            cur.execute("""
                SELECT
                    status,
                    COUNT(*) as count
                FROM pre_orders
                WHERE status NOT IN ('completed', 'cancelled')
                GROUP BY status
            """)

            status_counts = {row['status']: row['count'] for row in cur.fetchall()}

            # Calculate totals
            pending = status_counts.get('pending', 0)
            ready = status_counts.get('ready_for_pickup', 0)
            total_active = sum(status_counts.values())

            return {
                'pending': pending,
                'ready': ready,
                'total_active': total_active,
                'confirmed': status_counts.get('confirmed', 0),
                'partially_paid': status_counts.get('partially_paid', 0)
            }

        except Exception as e:
            current_app.logger.error(f"Error getting pre-order stats: {str(e)}")
            return {
                'pending': 0,
                'ready': 0,
                'total_active': 0,
                'confirmed': 0,
                'partially_paid': 0
            }
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def get_recent_for_dashboard(limit=10):
        """Get today's pending and confirmed pre-orders for dashboard table"""
        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)

            cur.execute("""
                SELECT
                    po.id,
                    po.status,
                    po.created_date,
                    c.first_name,
                    c.last_name,
                    p.name as product_name,
                    p.photo as product_photo,
                    p.stock as current_stock
                FROM pre_orders po
                JOIN customers c ON po.customer_id = c.id
                JOIN products p ON po.product_id = p.id
                WHERE po.status IN ('pending', 'confirmed', 'completed')
                AND DATE(po.created_date) = CURDATE()
                ORDER BY po.created_date DESC
                LIMIT %s
            """, (limit,))

            return cur.fetchall()

        except Exception as e:
            current_app.logger.error(f"Error getting today's pre-orders: {str(e)}")
            return []
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()


class PartialCancellation:
    @staticmethod
    def cancel_order_item(order_id, item_id, cancel_quantity, reason, staff_id, notes='', notify_customer=True):
        """Cancel a specific quantity of an order item"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)

        try:
            # Get order item details
            cur.execute("""
                SELECT oi.*, p.name as product_name, p.stock, o.customer_id
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                WHERE oi.id = %s AND oi.order_id = %s
            """, (item_id, order_id))

            item = cur.fetchone()
            if not item:
                return {'success': False, 'error': 'Order item not found'}

            # Check if cancellation quantity is valid
            available_to_cancel = item['quantity']
            if cancel_quantity > available_to_cancel:
                return {'success': False, 'error': f'Cannot cancel {cancel_quantity} items. Only {available_to_cancel} available.'}

            # Calculate refund amount
            refund_amount = float(item['price']) * cancel_quantity

            # Restore inventory - add cancelled quantity back to stock
            cur.execute("""
                UPDATE products
                SET stock = stock + %s
                WHERE id = %s
            """, (cancel_quantity, item['product_id']))

            # Log inventory change
            cur.execute("""
                INSERT INTO inventory (product_id, changes, change_date)
                VALUES (%s, %s, NOW())
            """, (item['product_id'], cancel_quantity))

            # Update order item quantity or remove if fully cancelled
            if cancel_quantity == item['quantity']:
                # Remove the entire order item
                cur.execute("""
                    DELETE FROM order_items
                    WHERE id = %s
                """, (item_id,))
            else:
                # Reduce the quantity
                new_quantity = item['quantity'] - cancel_quantity
                new_total_price = float(item['price']) * new_quantity
                cur.execute("""
                    UPDATE order_items
                    SET quantity = %s
                    WHERE id = %s
                """, (new_quantity, item_id))

            # Update order total amount
            cur.execute("""
                UPDATE orders
                SET total_amount = total_amount - %s
                WHERE id = %s
            """, (refund_amount, order_id))

            # Send customer notification if requested
            if notify_customer:
                message = f"Item '{item['product_name']}' (Quantity: {cancel_quantity}) has been cancelled from your order #{order_id}. Refund amount: ${refund_amount:.2f}"

                # Add to general notifications
                cur.execute("""
                    INSERT INTO notifications (customer_id, message, notification_type, created_date)
                    VALUES (%s, %s, 'order_update', NOW())
                """, (item['customer_id'], message))

            # Check if all items in the order have been cancelled
            cur.execute("""
                SELECT COUNT(*) as remaining_items
                FROM order_items
                WHERE order_id = %s AND quantity > 0
            """, (order_id,))

            remaining_items = cur.fetchone()['remaining_items']

            # If no items remain, delete the order completely
            if remaining_items == 0:
                # Delete any remaining order_items (with 0 quantity)
                cur.execute("DELETE FROM order_items WHERE order_id = %s", (order_id,))

                # Delete the order itself
                cur.execute("DELETE FROM orders WHERE id = %s", (order_id,))

                current_app.logger.info(f"Order {order_id} completely removed - all items were cancelled")

            conn.commit()

            current_app.logger.info(f"Cancelled {cancel_quantity} units of {item['product_name']} from order {order_id}. Refund: ${refund_amount:.2f}")

            return {
                'success': True,
                'refund_amount': refund_amount,
                'cancelled_quantity': cancel_quantity,
                'product_name': item['product_name'],
                'order_deleted': remaining_items == 0
            }

        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error cancelling order item: {str(e)}")
            return {'success': False, 'error': str(e)}
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_cancellation_options(order_id):
        """Get items that can be cancelled in an order"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)

        try:
            # Get order details
            cur.execute("SELECT status FROM orders WHERE id = %s", (order_id,))
            order = cur.fetchone()

            if not order:
                return {'can_cancel': False, 'items': [], 'order_status': None}

            # Only allow cancellations for certain order statuses
            cancellable_statuses = ['pending', 'processing', 'completed']
            can_cancel = order['status'].lower() in cancellable_statuses

            # Get order items with current quantities (after any cancellations)
            cur.execute("""
                SELECT oi.id, oi.product_id, oi.quantity, oi.price,
                       p.name as product_name, p.stock
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = %s
            """, (order_id,))

            items = cur.fetchall()

            # Add cancellation info to each item
            for item in items:
                # The current quantity in order_items is already the available quantity
                # (since we update/delete order_items when cancelling)
                item['available_to_cancel'] = item['quantity']
                item['cancelled_quantity'] = 0  # We don't track this separately since we modify order_items directly
                item['item_status'] = 'active' if item['quantity'] > 0 else 'fully_cancelled'
                item['can_cancel'] = item['available_to_cancel'] > 0
                item['subtotal'] = float(item['price']) * item['quantity']
                item['cancelled_amount'] = 0.0  # Not tracked separately
                item['active_amount'] = float(item['price']) * item['available_to_cancel']

            return {
                'can_cancel': can_cancel,
                'items': items,
                'order_status': order['status']
            }

        except Exception as e:
            current_app.logger.error(f"Error getting cancellation options: {str(e)}")
            return {'can_cancel': False, 'items': [], 'order_status': None}
        finally:
            cur.close()
            conn.close()
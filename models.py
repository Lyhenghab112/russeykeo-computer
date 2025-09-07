from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash
from flask import current_app
import mysql.connector
from datetime import datetime
import re

db = SQLAlchemy()

# Database configuration from config.py
from config import Config

def create_cursor(conn):
    """Create a cursor with dictionary support if available, fallback to regular cursor"""
    try:
        return conn.cursor(dictionary=True)
    except TypeError:
        return conn.cursor()

def get_db():
    try:
        conn = mysql.connector.connect(
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            host=Config.MYSQL_HOST,
            port=Config.MYSQL_PORT,
            database=Config.MYSQL_DB,
            use_pure=True,
            autocommit=True,
            connect_timeout=60,
            auth_plugin='mysql_native_password'
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
    def get_all(include_archived=False, include_deleted=False):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            query = """
                SELECT p.*, p.stock as stock_quantity, cpu, ram, storage, graphics, display, os, keyboard, battery, weight, p.warranty_id, p.original_price,
                       p.allow_preorder, p.expected_restock_date, p.preorder_limit,
                       c.name as color, cat.name as category_name, w.warranty_name
                FROM products p
                LEFT JOIN colors c ON p.color_id = c.id
                LEFT JOIN categories cat ON p.category_id = cat.id
                LEFT JOIN warranty w ON p.warranty_id = w.warranty_id
            """
            conditions = []
            if not include_archived:
                conditions.append("p.archived = FALSE")
            if not include_deleted:
                # Only add deleted condition if the column exists
                # This handles cases where soft delete migration hasn't been run
                try:
                    # Check if deleted column exists
                    cur.execute("SHOW COLUMNS FROM products LIKE 'deleted'")
                    if cur.fetchone():
                        conditions.append("(p.deleted = FALSE OR p.deleted IS NULL)")
                except:
                    # If there's any error checking, just skip the deleted filter
                    pass
            
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            
            # Order by ID descending to show newest products first
            query += " ORDER BY p.id DESC"
                
            cur.execute(query)
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
                WHERE (p.archived IS NULL OR p.archived = FALSE)
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
                WHERE stock < %s AND (archived IS NULL OR archived = FALSE)
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
                WHERE p.category_id = %s AND (p.archived IS NULL OR p.archived = FALSE)
                ORDER BY p.id DESC
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
                WHERE p.category_id IN ({format_strings}) AND (p.archived IS NULL OR p.archived = FALSE)
                ORDER BY p.id DESC
            """
            cur.execute(query, tuple(category_ids))
            products = cur.fetchall()
            return products
        finally:
            cur.close()
            conn.close()

 

    @staticmethod
    def get_featured(limit=8, include_archived=False):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            query = """
                SELECT p.*, p.stock as stock_quantity, cpu, ram, storage, graphics, display, os, keyboard, battery, weight, p.warranty_id, p.original_price, c.name as color, w.warranty_name
                FROM products p
                LEFT JOIN colors c ON p.color_id = c.id
                LEFT JOIN warranty w ON p.warranty_id = w.warranty_id
            """
            if not include_archived:
                query += " WHERE p.archived = FALSE"
            query += """
                ORDER BY p.id DESC
                LIMIT %s
            """
            cur.execute(query, (limit,))
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
    def delete(product_id, force=False):
        """Delete a product and all related records. If force is True, cancel/delete active orders and pre-orders."""
        conn = get_db()
        cur = conn.cursor()
        try:
            # Check if product exists
            cur.execute("SELECT COUNT(*) FROM products WHERE id = %s", (product_id,))
            if cur.fetchone()[0] == 0:
                raise ValueError("Product not found")

            # Check for active orders with this product
            cur.execute("""
                SELECT o.id FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE oi.product_id = %s AND o.status IN ('Pending', 'Processing')
            """, (product_id,))
            active_order_ids = [row[0] for row in cur.fetchall()]

            # Check for active pre-orders with this product
            cur.execute("""
                SELECT id FROM pre_orders
                WHERE product_id = %s AND status IN ('pending', 'ready_for_pickup')
            """, (product_id,))
            active_preorder_ids = [row[0] for row in cur.fetchall()]

            if (active_order_ids or active_preorder_ids) and not force:
                raise ValueError("Cannot delete product with active pre-orders or orders. Please complete or cancel them first.")

            if force:
                # Cancel active orders
                from models import Order, PreOrder, Notification

                for order_id in active_order_ids:
                    try:
                        # Cancel order and restore inventory
                        Order.cancel_order(order_id, reason="Product deleted", notes="Cancelled due to product deletion", staff_username="system")
                        # Notify customer
                        order = Order.get_by_id(order_id)
                        if order:
                            Notification.create_notification(
                                customer_id=order['customer_id'],
                                message=f"Your order #{order_id} has been cancelled because the product was deleted.",
                                notification_type='order_cancelled',
                                related_id=order_id
                            )
                    except Exception as e:
                        current_app.logger.error(f"Failed to cancel order {order_id} during product deletion: {e}")

                # Cancel active pre-orders
                for preorder_id in active_preorder_ids:
                    try:
                        PreOrder.cancel_pre_order(preorder_id, reason="Product deleted")
                        # Notify customer
                        preorder = PreOrder.get_by_id(preorder_id)
                        if preorder:
                            Notification.create_notification(
                                customer_id=preorder['customer_id'],
                                message=f"Your pre-order #{preorder_id} has been cancelled because the product was deleted.",
                                notification_type='preorder_cancelled',
                                related_id=preorder_id
                            )
                    except Exception as e:
                        current_app.logger.error(f"Failed to cancel pre-order {preorder_id} during product deletion: {e}")

            # Delete related records in order (to avoid foreign key constraint violations)

            # Delete inventory records
            cur.execute("DELETE FROM inventory WHERE product_id = %s", (product_id,))
            deleted_inventory = cur.rowcount
            current_app.logger.info(f"Deleted {deleted_inventory} inventory records")

            # Check for historical order items
            cur.execute("SELECT COUNT(*) FROM order_items WHERE product_id = %s", (product_id,))
            order_items_count = cur.fetchone()[0]

            if order_items_count > 0:
                # Instead of deleting order items (which would break order history),
                # we'll prevent deletion to preserve historical data
                raise ValueError(f"Cannot delete product that appears in {order_items_count} order(s). This would break order history.")

            # Instead of deleting the product, mark it as archived
            cur.execute("UPDATE products SET archived = TRUE WHERE id = %s", (product_id,))
            if cur.rowcount == 0:
                raise ValueError("Product not found or already deleted")

            conn.commit()

            current_app.logger.info(f"Product {product_id} archived successfully along with {deleted_inventory} inventory records")
            return True

        except ValueError as e:
            conn.rollback()
            raise e
        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error deleting product: {e}")
            raise RuntimeError(f"An unexpected error occurred while deleting the product: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def delete_with_denormalization(product_id, force=False, staff_user_id=None):
        """
        Delete a product using data denormalization approach.
        Product data is preserved in order_items table before deletion.
        """
        conn = get_db()
        cur = conn.cursor()
        try:
            # Check if product exists
            cur.execute("SELECT name, description FROM products WHERE id = %s", (product_id,))
            product = cur.fetchone()
            if not product:
                raise ValueError("Product not found")
            
            product_name, product_description = product
            
            # Check for active orders/pre-orders if not forcing
            if not force:
                cur.execute("""
                    SELECT COUNT(*) FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    WHERE oi.product_id = %s AND o.status IN ('Pending', 'Processing')
                """, (product_id,))
                if cur.fetchone()[0] > 0:
                    raise ValueError("Cannot delete product with active orders. Use force=True to override.")
            
            # Handle force deletion of active orders/pre-orders
            if force:
                # Cancel active orders
                cur.execute("""
                    SELECT o.id FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    WHERE oi.product_id = %s AND o.status IN ('Pending', 'Processing')
                """, (product_id,))
                active_order_ids = [row[0] for row in cur.fetchall()]

                # Cancel active pre-orders
                cur.execute("""
                    SELECT id FROM pre_orders
                    WHERE product_id = %s AND status IN ('pending', 'ready_for_pickup')
                """, (product_id,))
                active_preorder_ids = [row[0] for row in cur.fetchall()]

                if active_order_ids or active_preorder_ids:
                    from models import Order, PreOrder, Notification

                    for order_id in active_order_ids:
                        try:
                            Order.cancel_order(order_id, reason="Product deleted", notes="Cancelled due to product deletion", staff_username="system")
                            order = Order.get_by_id(order_id)
                            if order:
                                Notification.create_notification(
                                    customer_id=order['customer_id'],
                                    message=f"Your order #{order_id} has been cancelled because the product was deleted.",
                                    notification_type='order_cancelled',
                                    related_id=order_id
                                )
                        except Exception as e:
                            current_app.logger.error(f"Failed to cancel order {order_id} during product deletion: {e}")

                    for preorder_id in active_preorder_ids:
                        try:
                            PreOrder.cancel_pre_order(preorder_id, reason="Product deleted")
                            preorder = PreOrder.get_by_id(preorder_id)
                            if preorder:
                                Notification.create_notification(
                                    customer_id=preorder['customer_id'],
                                    message=f"Your pre-order #{preorder_id} has been cancelled because the product was deleted.",
                                    notification_type='preorder_cancelled',
                                    related_id=preorder_id
                                )
                        except Exception as e:
                            current_app.logger.error(f"Failed to cancel pre-order {preorder_id} during product deletion: {e}")
            
            # Ensure order_items have denormalized data
            cur.execute("""
                UPDATE order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN categories c ON p.category_id = c.id
                SET oi.product_name = COALESCE(oi.product_name, p.name),
                    oi.product_description = COALESCE(oi.product_description, p.description),
                    oi.product_category = COALESCE(oi.product_category, c.name)
                WHERE oi.product_id = %s
            """, (product_id,))
            
            # Delete related records
            cur.execute("DELETE FROM inventory WHERE product_id = %s", (product_id,))
            deleted_inventory = cur.rowcount
            
            # Delete the product (order_items will have NULL product_id but preserved data)
            cur.execute("DELETE FROM products WHERE id = %s", (product_id,))
            
            if cur.rowcount == 0:
                raise ValueError("Product not found or already deleted")
            
            conn.commit()
            current_app.logger.info(f"Product {product_id} ({product_name}) deleted successfully using denormalization approach")
            return True
            
        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error deleting product with denormalization: {e}")
            raise
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def delete_with_soft_delete(product_id, staff_user_id=None):
        """
        Delete a product using soft delete approach.
        Product is marked as deleted but remains in database.
        """
        conn = get_db()
        cur = conn.cursor()
        try:
            # Check if soft delete columns exist first
            cur.execute("SHOW COLUMNS FROM products LIKE 'deleted'")
            if not cur.fetchone():
                raise ValueError("Soft delete functionality not available. Please run the soft delete migration script first.")
            
            # Check if product exists and is not already deleted
            cur.execute("SELECT name FROM products WHERE id = %s AND (deleted = FALSE OR deleted IS NULL)", (product_id,))
            product = cur.fetchone()
            if not product:
                raise ValueError("Product not found or already deleted")
            
            product_name = product[0]
            
            # Mark as deleted
            cur.execute("""
                UPDATE products 
                SET deleted = TRUE, 
                    deleted_at = NOW(), 
                    deleted_by = %s 
                WHERE id = %s
            """, (staff_user_id, product_id))
            
            if cur.rowcount == 0:
                raise ValueError("Failed to mark product as deleted")
            
            conn.commit()
            current_app.logger.info(f"Product {product_id} ({product_name}) soft deleted successfully")
            return True
            
        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error soft deleting product: {e}")
            raise
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def restore_soft_deleted_product(product_id):
        """
        Restore a soft-deleted product.
        """
        conn = get_db()
        cur = conn.cursor()
        try:
            # Check if soft delete columns exist first
            cur.execute("SHOW COLUMNS FROM products LIKE 'deleted'")
            if not cur.fetchone():
                raise ValueError("Soft delete functionality not available. Please run the soft delete migration script first.")
            
            # Check if product exists and is soft deleted
            cur.execute("SELECT name FROM products WHERE id = %s AND deleted = TRUE", (product_id,))
            product = cur.fetchone()
            if not product:
                raise ValueError("Product not found or not deleted")
            
            product_name = product[0]
            
            # Restore the product
            cur.execute("""
                UPDATE products 
                SET deleted = FALSE, 
                    deleted_at = NULL, 
                    deleted_by = NULL 
                WHERE id = %s
            """, (product_id,))
            
            if cur.rowcount == 0:
                raise ValueError("Failed to restore product")
            
            conn.commit()
            current_app.logger.info(f"Product {product_id} ({product_name}) restored successfully")
            return True
            
        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"Error restoring product: {e}")
            raise
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
                WHERE p.name LIKE %s AND (p.archived IS NULL OR p.archived = FALSE)
                ORDER BY p.id DESC
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
            cur.execute("SELECT COUNT(*) FROM products WHERE (archived IS NULL OR archived = FALSE)")
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
                AND (archived IS NULL OR archived = FALSE)
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
                WHERE p.name LIKE %s AND (p.archived IS NULL OR p.archived = FALSE)
                ORDER BY p.id DESC
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
    """
    Order management class.

    Order Status Flow:
    - Pending: Order created, stock reserved, awaiting payment
    - Completed: Payment processed, order fulfilled
    - Cancelled: Order cancelled, stock restored
    """
    @staticmethod
    def get_paginated_orders(status=None, date=None, search=None, approval=None, page=1, page_size=10):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        
        base_query = """
            SELECT o.id, c.first_name, c.last_name, o.status, o.order_date,
                   o.total_amount as total, o.payment_method, o.approval_status
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
        
        # Handle status filtering
        if status and status.lower() != 'all':
            if status.lower() == 'pending':
                # Show only pending orders
                base_query += " AND LOWER(o.status) = 'pending'"
                count_query += " AND LOWER(o.status) = 'pending'"
            else:
                # Show specific status (completed, cancelled, etc.)
                base_query += " AND LOWER(o.status) = LOWER(%s)"
                count_query += " AND LOWER(o.status) = LOWER(%s)"
                params.append(status)
        # No else clause - when status is 'all', show all orders including pending
            
        if date:
            base_query += " AND DATE(o.order_date) = %s"
            count_query += " AND DATE(o.order_date) = %s"
            params.append(date)
        
        if approval and approval.lower() != 'all':
            base_query += " AND o.approval_status = %s"
            count_query += " AND o.approval_status = %s"
            params.append(approval)
        
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
                SELECT o.id, o.customer_id, o.order_date, o.total_amount, o.status, o.payment_method,
                       o.approval_status, o.approval_date, o.approved_by, o.approval_notes,
                       o.volume_discount_rule_id, o.volume_discount_percentage, o.volume_discount_amount,
                       o.transaction_id
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
        """Get order items for a specific order with discount information."""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT oi.product_id, p.name as product_name, p.name as brand,
                       oi.quantity, oi.price,
                       COALESCE(oi.original_price, oi.price) as original_price,
                       COALESCE(oi.discount_percentage, 0) as discount_percentage,
                       COALESCE(oi.discount_amount, 0) as discount_amount,
                       CASE
                           WHEN COALESCE(oi.discount_percentage, 0) > 0 THEN 1
                           ELSE 0
                       END as has_discount
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
                SELECT o.id, o.order_date, o.total_amount, o.payment_method, o.approval_status, o.transaction_id,
                       oi.product_id, oi.quantity, oi.price,
                       p.name as product_name, p.photo as product_photo
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE o.customer_id = %s AND o.status = 'COMPLETED'
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
                        'approval_status': row['approval_status'] or 'Unknown',
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
    def create(customer_id, order_date, status='PENDING', items=None, payment_method='QR Payment', transaction_id=None):
        conn = get_db()
        cur = conn.cursor()
        try:
            # Convert order_date to string format 'YYYY-MM-DD HH:MM:SS' if it's a datetime object
            if hasattr(order_date, 'strftime'):
                order_date_str = order_date.strftime('%Y-%m-%d %H:%M:%S')
            else:
                order_date_str = order_date

            # Set initial approval status and main status based on order type
            # ALL orders require manual approval - no automatic approval
            approval_status = 'Pending Approval'
            # Keep status as 'Pending' until approved

            cur.execute("""
                INSERT INTO orders (customer_id, order_date, status, total_amount, payment_method, approval_status, transaction_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (customer_id, order_date_str, status, 0.0, payment_method, approval_status, transaction_id))
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

                    # Get product's original price, discount information, and denormalized data
                    cur.execute("""
                        SELECT p.original_price, p.price, p.name, p.description, c.name as category_name
                        FROM products p
                        LEFT JOIN categories c ON p.category_id = c.id
                        WHERE p.id = %s
                    """, (product_id,))
                    product_data = cur.fetchone()

                    if product_data:
                        original_price, current_product_price, product_name, product_description, category_name = product_data
                        # Use original_price if available, otherwise use current price as original
                        original_price = original_price if original_price is not None else current_product_price

                        # Calculate discount information
                        discount_amount = max(0, float(original_price) - float(price))
                        discount_percentage = (discount_amount / float(original_price)) * 100 if float(original_price) > 0 else 0
                    else:
                        # Fallback if product not found
                        original_price = price
                        discount_amount = 0
                        discount_percentage = 0
                        product_name = "Unknown Product"
                        product_description = ""
                        category_name = "Unknown Category"

                    # Insert order item with discount information and denormalized product data
                    cur.execute("""
                        INSERT INTO order_items (order_id, product_id, quantity, price, original_price, discount_percentage, discount_amount, product_name, product_description, product_category)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (order_id, product_id, quantity, price, original_price, discount_percentage, discount_amount, product_name, product_description, category_name))
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

            # Calculate and apply volume discount
            volume_discount_rule_id = None
            volume_discount_percentage = 0.0
            volume_discount_amount = 0.0

            if total_amount > 0:
                # Find applicable volume discount rule
                cur.execute("""
                    SELECT id, discount_percentage
                    FROM volume_discount_rules
                    WHERE minimum_amount <= %s AND is_active = TRUE
                    ORDER BY minimum_amount DESC
                    LIMIT 1
                """, (total_amount,))

                volume_rule = cur.fetchone()
                if volume_rule:
                    volume_discount_rule_id, discount_percentage = volume_rule
                    volume_discount_percentage = float(discount_percentage)

                    # Calculate volume discount amount (no maximum limit)
                    volume_discount_amount = total_amount * (volume_discount_percentage / 100)

                    # Apply volume discount to total
                    total_amount -= volume_discount_amount

            cur.execute("""
                UPDATE orders
                SET total_amount = %s, volume_discount_rule_id = %s,
                    volume_discount_percentage = %s, volume_discount_amount = %s
                WHERE id = %s
            """, (total_amount, volume_discount_rule_id, volume_discount_percentage, volume_discount_amount, order_id))

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
                WHERE LOWER(status) NOT IN ('delivered', 'shipped', 'processing')
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
        """Get total amount from orders excluding pending, delivered, shipped, and processing"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT SUM(total_amount) FROM orders
                WHERE LOWER(status) NOT IN ('delivered', 'shipped', 'processing', 'pending')
            """)
            result = cur.fetchone()
            return float(result[0]) if result[0] is not None else 0.0
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_total_completed_amount():
        """Get total amount from COMPLETED orders only"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT SUM(total_amount) FROM orders WHERE status = 'COMPLETED'
            """)
            result = cur.fetchone()
            total_completed_amount = float(result[0]) if result and result[0] is not None else 0.0
            return total_completed_amount
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_pending_orders_count():
        """Get count of pending orders"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT COUNT(*) FROM orders WHERE LOWER(status) = 'pending'
            """)
            result = cur.fetchone()
            return result[0] if result else 0
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

            print(f"Updating order {order_id} status from {current_status} to {status}")

            # If changing to Cancelled status, restore stock only if order was previously Completed
            # (meaning stock was actually reduced)
            if status.lower() == 'cancelled' and current_status.lower() == 'completed':
                print(f"Restoring stock for cancelled completed order {order_id}")
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
            elif status.lower() == 'cancelled' and current_status.lower() == 'pending':
                print(f"Cancelling pending order {order_id} - no stock restoration needed (stock was never reduced)")

            # Update order status (ensure proper capitalization)
            cur.execute(
                "UPDATE orders SET status = %s WHERE id = %s",
                (status.capitalize(), order_id)
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
        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)
            
            start_date = f"{month}-01"
            # Calculate end date as last day of the month
            from datetime import datetime
            import calendar
            year, mon = map(int, month.split('-'))
            last_day = calendar.monthrange(year, mon)[1]
            end_date = f"{month}-{last_day:02d}"

            sales_details = []

            # Get completed orders
            cur.execute("""
                SELECT o.id as order_id, o.order_date, c.first_name, c.last_name, o.total_amount
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE o.order_date BETWEEN %s AND %s
                AND LOWER(o.status) = 'completed'
                ORDER BY o.order_date ASC
            """, (start_date, end_date))
            result = cur.fetchall()

            for row in result:
                # Calculate grand total and profit for each order
                cur.execute("""
                    SELECT SUM(quantity * price) as grand_total
                    FROM order_items
                    WHERE order_id = %s
                """, (row['order_id'],))
                grand_total_result = cur.fetchone()
                grand_total = float(grand_total_result['grand_total']) if grand_total_result and grand_total_result['grand_total'] else 0.0

                # Calculate total profit for this order
                cur.execute("""
                    SELECT SUM((oi.price - p.original_price) * oi.quantity) as total_profit
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = %s
                """, (row['order_id'],))
                profit_result = cur.fetchone()
                total_profit = float(profit_result['total_profit']) if profit_result and profit_result['total_profit'] else 0.0

                # Get product names for this order
                cur.execute("""
                    SELECT GROUP_CONCAT(p.name SEPARATOR ', ') as products
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = %s
                """, (row['order_id'],))
                products_result = cur.fetchone()
                products = products_result['products'] if products_result and products_result['products'] else 'No products'

                sales_details.append({
                    'order_id': row['order_id'],
                    'order_date': row['order_date'].strftime('%Y-%m-%d'),
                    'customer_name': f"{row['first_name']} {row['last_name']}",
                    'total_amount': float(row['total_amount']),
                    'grand_total': grand_total,
                    'total_profit': total_profit,
                    'products': products,
                    'type': 'order'
                })

            # Get confirmed pre-orders with actual deposits (exclude $0.00 deposits)
            cur.execute("""
                SELECT po.id as preorder_id, po.updated_date, c.first_name, c.last_name,
                       po.deposit_amount, po.expected_price, po.quantity, p.name as product_name
                FROM pre_orders po
                JOIN customers c ON po.customer_id = c.id
                JOIN products p ON po.product_id = p.id
                WHERE po.updated_date BETWEEN %s AND %s
                AND po.status IN ('confirmed', 'partially_paid', 'ready_for_pickup')
                AND po.deposit_amount > 0
                ORDER BY po.updated_date ASC
            """, (start_date, end_date))
            preorder_result = cur.fetchall()

            for row in preorder_result:
                deposit_amount = float(row['deposit_amount'] or 0)
                # Estimate profit as 10% of deposit (conservative estimate)
                estimated_profit = deposit_amount * 0.1

                sales_details.append({
                    'order_id': f"PO-{row['preorder_id']}",
                    'order_date': row['updated_date'].strftime('%Y-%m-%d'),
                    'customer_name': f"{row['first_name']} {row['last_name']}",
                    'total_amount': deposit_amount,
                    'grand_total': deposit_amount,
                    'total_profit': estimated_profit,
                    'type': 'preorder',
                    'product_name': row['product_name']
                })

            # Sort all sales details by date
            sales_details.sort(key=lambda x: x['order_date'])
            return sales_details
        except Exception as e:
            # Log error if needed
            current_app.logger.error(f"Error in get_monthly_sales_detail: {e}")
            return []
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()

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
                AND (p.archived IS NULL OR p.archived = FALSE)
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
                AND (p.archived IS NULL OR p.archived = FALSE)
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
                    SUM(oi.quantity * (oi.price - p.original_price)) as total_profit
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE o.order_date BETWEEN %s AND %s
                AND LOWER(o.status) = 'completed'
                AND (p.archived IS NULL OR p.archived = FALSE)
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
                JOIN products p ON po.product_id = p.id
                WHERE po.updated_date BETWEEN %s AND %s
                AND po.status IN ('confirmed', 'partially_paid', 'ready_for_pickup')
                AND po.deposit_amount > 0
                AND (p.archived IS NULL OR p.archived = FALSE)
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
                JOIN products p ON oi.product_id = p.id
                WHERE LOWER(o.status) = 'completed'
                AND YEAR(o.order_date) = YEAR(CURDATE())
                AND MONTH(o.order_date) = MONTH(CURDATE())
                AND (p.archived IS NULL OR p.archived = FALSE)
            """)
            order_result = cur.fetchone()
            order_revenue = float(order_result[0]) if order_result[0] is not None else 0.0

            # Get revenue from confirmed pre-orders (deposit payments) - exclude $0.00 deposits
            cur.execute("""
                SELECT SUM(po.deposit_amount)
                FROM pre_orders po
                JOIN products p ON po.product_id = p.id
                WHERE po.status IN ('confirmed', 'partially_paid', 'ready_for_pickup')
                AND po.deposit_amount > 0
                AND YEAR(po.updated_date) = YEAR(CURDATE())
                AND MONTH(po.updated_date) = MONTH(CURDATE())
                AND (p.archived IS NULL OR p.archived = FALSE)
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
                SELECT AVG(o.total_amount)
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE LOWER(o.status) = 'completed'
                AND YEAR(o.order_date) = YEAR(CURDATE())
                AND MONTH(o.order_date) = MONTH(CURDATE())
                AND (p.archived IS NULL OR p.archived = FALSE)
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

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class CustomerAddress(Base):
    __tablename__ = 'customer_addresses'
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey('customers.id', ondelete='CASCADE'), nullable=False)
    address_type = Column(Enum('home', 'work', 'shop', 'other'), default='home')
    is_default = Column(Boolean, default=False)
    
    # Atomic address components for Cambodia
    house_number = Column(String(50))
    street_name = Column(String(100))
    street_number = Column(String(50))
    village = Column(String(100))
    sangkat = Column(String(100))
    commune = Column(String(100))
    khan = Column(String(100))
    province = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(50), default='Cambodia')
    
    # Additional fields
    building_name = Column(String(100))
    floor_number = Column(String(20))
    unit_number = Column(String(20))
    landmark = Column(String(100))
    delivery_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    is_active = Column(Boolean, default=True)

class Customer(Base):
    __tablename__ = 'customers'
    id = Column(Integer, primary_key=True)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(20))
    address = Column(String(255))
    created_at = Column(DateTime)
    deleted_at = Column(DateTime, nullable=True)

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
    def soft_delete(customer_id):
        """Soft delete a customer by setting deleted_at timestamp"""
        conn = get_db()
        cur = conn.cursor()
        try:
            now = datetime.now()
            cur.execute(
                "UPDATE customers SET deleted_at = %s WHERE id = %s",
                (now, customer_id)
            )
            conn.commit()
            return cur.rowcount > 0
        except mysql.connector.Error as err:
            current_app.logger.error(f"Customer soft delete failed: {str(err)}")
            conn.rollback()
            raise ValueError(f"Failed to soft delete customer: {str(err)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def restore(customer_id):
        """Restore a soft-deleted customer by clearing deleted_at timestamp"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute(
                "UPDATE customers SET deleted_at = NULL WHERE id = %s",
                (customer_id,)
            )
            conn.commit()
            return cur.rowcount > 0
        except mysql.connector.Error as err:
            current_app.logger.error(f"Customer restore failed: {str(err)}")
            conn.rollback()
            raise ValueError(f"Failed to restore customer: {str(err)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_all_active():
        """Get all active (non-deleted) customers"""
        conn = get_db()
        cur = create_cursor(conn)
        try:
            cur.execute("""
                SELECT id, first_name, last_name, email, phone, address, created_at
                FROM customers 
                WHERE deleted_at IS NULL
                ORDER BY first_name, last_name
            """)
            rows = cur.fetchall()
            
            # If not using dictionary cursor, convert to dict format
            if not hasattr(cur, 'description') or not cur.description:
                return rows
            
            if not isinstance(rows[0], dict) if rows else True:
                columns = [desc[0] for desc in cur.description]
                return [dict(zip(columns, row)) for row in rows]
            return rows
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_id_active(customer_id):
        """Get an active customer by ID (excluding soft-deleted)"""
        conn = get_db()
        cur = create_cursor(conn)
        try:
            cur.execute("""
                SELECT id, first_name, last_name, email, phone, address, created_at
                FROM customers 
                WHERE id = %s AND deleted_at IS NULL
            """, (customer_id,))
            row = cur.fetchone()
            
            # If not using dictionary cursor, convert to dict format
            if row and not isinstance(row, dict):
                columns = [desc[0] for desc in cur.description]
                return dict(zip(columns, row))
            return row
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_all():
        """Get all customers (including soft-deleted) - use get_all_active() for active only"""
        conn = get_db()
        cur = create_cursor(conn)
        try:
            cur.execute("""
                SELECT id, first_name, last_name, email, phone, address, created_at, deleted_at
                FROM customers
                ORDER BY last_name, first_name
            """)
            rows = cur.fetchall()
            
            # If not using dictionary cursor, convert to dict format
            if rows and not isinstance(rows[0], dict):
                columns = [desc[0] for desc in cur.description]
                return [dict(zip(columns, row)) for row in rows]
            return rows
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_id(customer_id):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT id, first_name, last_name, email, phone, address, otp_enabled
                FROM customers
                WHERE id = %s
            """, (customer_id,))
            customer = cur.fetchone()
            return customer
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_by_email(email):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT id, first_name, last_name, email, phone, address
                FROM customers
                WHERE email = %s
            """, (email,))
            customer = cur.fetchone()
            return customer
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update(customer_id, **kwargs):
        valid_fields = {'first_name', 'last_name', 'email', 'phone', 'address', 'password'}
        updates = {k: v for k, v in kwargs.items() if k in valid_fields}
        
        # Handle password hashing if password is being updated
        if 'password' in updates:
            from werkzeug.security import generate_password_hash
            updates['password'] = generate_password_hash(updates['password'])

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
        """Soft delete a customer by setting deleted_at timestamp while preserving all data."""
        conn = get_db()
        cur = conn.cursor()
        try:
            # Check if customer exists and is not already deleted
            cur.execute("SELECT deleted_at FROM customers WHERE id = %s", (customer_id,))
            result = cur.fetchone()
            if not result:
                raise ValueError("Customer not found")
            
            if result[0] is not None:
                raise ValueError("Customer is already deleted")

            # Soft delete the customer by setting deleted_at timestamp
            now = datetime.now()
            cur.execute("UPDATE customers SET deleted_at = %s WHERE id = %s", (now, customer_id))
            updated_customers = cur.rowcount

            conn.commit()

            if updated_customers == 0:
                raise ValueError("Customer not found or already deleted")

            print(f"✅ Customer {customer_id} soft deleted successfully")
            print(f"   - Customer data preserved in database")
            print(f"   - Orders and pre-orders remain linked to customer_id")
            print(f"   - Financial data integrity maintained")
            print(f"   - Customer can be restored if needed")

            return True
        except ValueError as e:
            conn.rollback()
            raise e
        except Exception as e:
            conn.rollback()
            print(f"Error soft deleting customer: {e}")
            raise RuntimeError(f"An unexpected error occurred while soft deleting the customer: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_orders(customer_id, status=None):
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        query = """
            SELECT o.id, o.order_date, o.status, o.approval_status, o.transaction_id,
                   SUM(oi.quantity * oi.price) as total_amount
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.customer_id = %s
            AND LOWER(o.status) NOT IN ('delivered', 'shipped', 'pending')
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

class CustomerAddress:
    """Customer Address management with atomic components for Cambodia"""
    
    @staticmethod
    def create(customer_id, address_data, address_type='home', is_default=False):
        """Create a new customer address"""
        conn = get_db()
        cur = conn.cursor()
        try:
            # Process street name to extract street number
            street_name = address_data.get('street_name', '').strip()
            street_number = None
            if street_name:
                import re
                number_match = re.search(r'\d+', street_name)
                if number_match:
                    street_number = number_match.group()
            
            cur.execute("""
                INSERT INTO customer_addresses 
                (customer_id, address_type, is_default, house_number, street_name, 
                 street_number, village, sangkat, commune, khan, province, 
                 postal_code, country, building_name, floor_number, unit_number, 
                 landmark, delivery_notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                customer_id, address_type, is_default,
                address_data.get('house_number', '').strip() or None,
                street_name or None,
                street_number,
                address_data.get('village', '').strip() or None,
                address_data.get('sangkat', '').strip() or None,
                address_data.get('commune', '').strip() or None,
                address_data.get('khan', '').strip() or None,
                address_data.get('province', '').strip() or None,
                address_data.get('postal_code', '').strip() or None,
                address_data.get('country', 'Cambodia'),
                address_data.get('building_name', '').strip() or None,
                address_data.get('floor_number', '').strip() or None,
                address_data.get('unit_number', '').strip() or None,
                address_data.get('landmark', '').strip() or None,
                address_data.get('delivery_notes', '').strip() or None
            ))
            
            address_id = cur.lastrowid
            conn.commit()
            return address_id
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()
    
    @staticmethod
    def get_by_customer_id(customer_id, active_only=True):
        """Get all addresses for a customer"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            query = """
                SELECT * FROM customer_addresses 
                WHERE customer_id = %s
            """
            params = [customer_id]
            
            if active_only:
                query += " AND is_active = TRUE"
            
            query += " ORDER BY is_default DESC, created_at DESC"
            
            cur.execute(query, params)
            return cur.fetchall()
            
        except Exception as e:
            raise e
        finally:
            cur.close()
            conn.close()
    
    @staticmethod
    def get_by_id(address_id):
        """Get address by ID"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT * FROM customer_addresses 
                WHERE id = %s AND is_active = TRUE
            """, (address_id,))
            return cur.fetchone()
            
        except Exception as e:
            raise e
        finally:
            cur.close()
            conn.close()
    
    @staticmethod
    def update(address_id, address_data):
        """Update an existing address"""
        conn = get_db()
        cur = conn.cursor()
        try:
            # Process street name to extract street number
            street_name = address_data.get('street_name', '').strip()
            street_number = None
            if street_name:
                import re
                number_match = re.search(r'\d+', street_name)
                if number_match:
                    street_number = number_match.group()
            
            cur.execute("""
                UPDATE customer_addresses SET
                    house_number = %s,
                    street_name = %s,
                    street_number = %s,
                    village = %s,
                    sangkat = %s,
                    commune = %s,
                    khan = %s,
                    province = %s,
                    postal_code = %s,
                    country = %s,
                    building_name = %s,
                    floor_number = %s,
                    unit_number = %s,
                    landmark = %s,
                    delivery_notes = %s,
                    updated_at = NOW()
                WHERE id = %s AND is_active = TRUE
            """, (
                address_data.get('house_number', '').strip() or None,
                street_name or None,
                street_number,
                address_data.get('village', '').strip() or None,
                address_data.get('sangkat', '').strip() or None,
                address_data.get('commune', '').strip() or None,
                address_data.get('khan', '').strip() or None,
                address_data.get('province', '').strip() or None,
                address_data.get('postal_code', '').strip() or None,
                address_data.get('country', 'Cambodia'),
                address_data.get('building_name', '').strip() or None,
                address_data.get('floor_number', '').strip() or None,
                address_data.get('unit_number', '').strip() or None,
                address_data.get('landmark', '').strip() or None,
                address_data.get('delivery_notes', '').strip() or None,
                address_id
            ))
            
            conn.commit()
            return cur.rowcount > 0
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()
    
    @staticmethod
    def set_default(customer_id, address_id):
        """Set an address as default for a customer"""
        conn = get_db()
        cur = conn.cursor()
        try:
            # First, unset all other default addresses for this customer
            cur.execute("""
                UPDATE customer_addresses 
                SET is_default = FALSE 
                WHERE customer_id = %s
            """, (customer_id,))
            
            # Then set the specified address as default
            cur.execute("""
                UPDATE customer_addresses 
                SET is_default = TRUE 
                WHERE id = %s AND customer_id = %s AND is_active = TRUE
            """, (address_id, customer_id))
            
            conn.commit()
            return cur.rowcount > 0
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()
    
    @staticmethod
    def delete(address_id):
        """Soft delete an address"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                UPDATE customer_addresses 
                SET is_active = FALSE, updated_at = NOW()
                WHERE id = %s
            """, (address_id,))
            
            conn.commit()
            return cur.rowcount > 0
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()
    
    @staticmethod
    def format_display(address):
        """Format address for display"""
        parts = []
        
        if address.get('house_number'):
            parts.append(address['house_number'])
        if address.get('street_name'):
            parts.append(address['street_name'])
        if address.get('village'):
            parts.append(address['village'])
        if address.get('sangkat'):
            parts.append(f"Sangkat {address['sangkat']}")
        if address.get('commune'):
            parts.append(f"Commune {address['commune']}")
        if address.get('khan'):
            parts.append(f"Khan {address['khan']}")
        if address.get('province'):
            parts.append(address['province'])
        if address.get('postal_code'):
            parts.append(address['postal_code'])
        
        return ', '.join(parts)

class Category:
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
            cur.execute("SELECT id, name, description FROM categories ORDER BY name")
            categories = cur.fetchall()
            return categories
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_all_hierarchical():
        """Get all categories in hierarchical structure"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT id, name, description, parent_id, sort_order, is_active
                FROM categories 
                WHERE is_active = TRUE OR is_active IS NULL
                ORDER BY sort_order, name
            """)
            categories = cur.fetchall()
            
            # Build hierarchy
            category_dict = {}
            root_categories = []
            
            # Create category objects
            for cat_data in categories:
                category_dict[cat_data['id']] = cat_data
                cat_data['children'] = []
            
            # Build parent-child relationships
            for category in categories:
                if category['parent_id'] is None:
                    root_categories.append(category)
                else:
                    parent = category_dict.get(category['parent_id'])
                    if parent:
                        parent['children'].append(category)
            
            return root_categories
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def create(name, description=None, parent_id=None):
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute(
                "INSERT INTO categories (name, description, parent_id) VALUES (%s, %s, %s)",
                (name, description, parent_id)
            )
            conn.commit()
            return cur.lastrowid
        except Exception as e:
            conn.rollback()
            raise ValueError(f"Category creation failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def delete(category_id):
        conn = get_db()
        cur = conn.cursor()
        try:
            # Check if category has products
            cur.execute("SELECT COUNT(*) FROM products WHERE category_id = %s", (category_id,))
            product_count = cur.fetchone()[0]

            if product_count > 0:
                raise ValueError(f"Cannot delete category. It has {product_count} products associated with it.")

            cur.execute("DELETE FROM categories WHERE id = %s", (category_id,))
            if cur.rowcount == 0:
                raise ValueError("Category not found")
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise ValueError(f"Category deletion failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update(category_id, name=None, description=None):
        conn = get_db()
        cur = conn.cursor()
        try:
            updates = []
            params = []

            if name:
                updates.append("name = %s")
                params.append(name)

            if description is not None:  # Allow empty description
                updates.append("description = %s")
                params.append(description)

            if not updates:
                raise ValueError("No fields to update")

            params.append(category_id)
            query = f"UPDATE categories SET {', '.join(updates)} WHERE id = %s"

            cur.execute(query, params)
            if cur.rowcount == 0:
                raise ValueError("Category not found")
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise ValueError(f"Category update failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

class User:
    @staticmethod
    def create(username, password, role='staff', email=None, full_name=None):
        if not password or len(password) < 8:
            raise ValueError("Password must be at least 8 characters")

        hashed_password = generate_password_hash(password)
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute(
                "INSERT INTO users (username, password, role, email, full_name, password_changed_at) VALUES (%s, %s, %s, %s, %s, %s)",
                (username, hashed_password, role, email, full_name, datetime.now())
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
                SELECT id, username, password, role, is_active, force_password_change
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

    @staticmethod
    def get_all():
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT id, username, role, email, full_name, created_at,
                       last_login, is_active, password_changed_at, force_password_change
                FROM users
                ORDER BY username
            """)
            users = cur.fetchall()
            return users
        except Exception as e:
            print(f"Database error in get_all: {str(e)}")
            return []
        finally:
            cur.close()
            conn.close()



    @staticmethod
    def delete(user_id):
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
            if cur.rowcount == 0:
                raise ValueError("User not found")
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise ValueError(f"User deletion failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update(user_id, username=None, role=None, password=None, email=None, full_name=None, is_active=None, force_password_change=None):
        conn = get_db()
        cur = conn.cursor()
        try:
            updates = []
            params = []

            if username:
                updates.append("username = %s")
                params.append(username)

            if role:
                updates.append("role = %s")
                params.append(role)

            if password:
                from werkzeug.security import generate_password_hash
                hashed_password = generate_password_hash(password)
                updates.append("password = %s")
                params.append(hashed_password)
                updates.append("password_changed_at = %s")
                params.append(datetime.now())

            if email is not None:
                updates.append("email = %s")
                params.append(email)

            if full_name is not None:
                updates.append("full_name = %s")
                params.append(full_name)

            if is_active is not None:
                updates.append("is_active = %s")
                # Convert boolean to integer for MySQL compatibility
                params.append(1 if is_active else 0)

            if force_password_change is not None:
                updates.append("force_password_change = %s")
                params.append(force_password_change)

            if not updates:
                raise ValueError("No fields to update")

            params.append(user_id)
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"

            cur.execute(query, params)

            if cur.rowcount == 0:
                # Check if the user actually exists
                cur.execute("SELECT id, username FROM users WHERE id = %s", (user_id,))
                existing_user = cur.fetchone()

                if not existing_user:
                    raise ValueError("User not found")
                # If user exists but no rows were updated, the value was already the same - this is OK

            conn.commit()
        except Exception as e:
            conn.rollback()
            raise ValueError(f"User update failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def reset_password(user_id, new_password):
        """Reset a user's password"""
        if not new_password or len(new_password) < 8:
            raise ValueError("Password must be at least 8 characters")

        from werkzeug.security import generate_password_hash
        hashed_password = generate_password_hash(new_password)

        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute(
                "UPDATE users SET password = %s WHERE id = %s",
                (hashed_password, user_id)
            )
            if cur.rowcount == 0:
                raise ValueError("User not found")
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise ValueError(f"Password reset failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def generate_temporary_password():
        """Generate a secure temporary password"""
        import secrets
        import string

        # Generate a 12-character password with letters, digits, and symbols
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(alphabet) for _ in range(12))
        return password

    @staticmethod
    def get_by_id(user_id):
        """Get user by ID"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT id, username, role, email, full_name, created_at,
                       last_login, is_active, password_changed_at, force_password_change
                FROM users
                WHERE id = %s
            """, (user_id,))
            user = cur.fetchone()
            return user
        except Exception as e:
            print(f"Database error in get_by_id: {str(e)}")
            return None
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_password_hash(user_id):
        """Return the stored password hash for a user ID."""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("SELECT password FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            return row[0] if row else None
        except Exception as e:
            print(f"Database error in get_password_hash: {str(e)}")
            return None
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update_last_login(user_id):
        """Update user's last login time"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute(
                "UPDATE users SET last_login = %s WHERE id = %s",
                (datetime.now(), user_id)
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"Error updating last login: {str(e)}")
        finally:
            cur.close()
            conn.close()

class Role:
    @staticmethod
    def get_all():
        """Get all available roles"""
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("""
                SELECT id, name, display_name, description, is_system_role, access_level
                FROM custom_roles
                ORDER BY access_level DESC, name
            """)
            roles = cur.fetchall()
            return roles
        except Exception as e:
            print(f"Database error in Role.get_all: {str(e)}")
            return []
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def create(name, display_name, description=None, access_level=1):
        """Create a new custom role"""
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO custom_roles (name, display_name, description, access_level, is_system_role)
                VALUES (%s, %s, %s, %s, FALSE)
            """, (name, display_name, description, access_level))
            conn.commit()
            return cur.lastrowid
        except Exception as e:
            conn.rollback()
            raise ValueError(f"Role creation failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def delete(role_id):
        """Delete a custom role (only non-system roles)"""
        conn = get_db()
        cur = conn.cursor()
        try:
            # Check if it's a system role
            cur.execute("SELECT is_system_role FROM custom_roles WHERE id = %s", (role_id,))
            result = cur.fetchone()
            if not result:
                raise ValueError("Role not found")
            if result[0]:  # is_system_role is True
                raise ValueError("Cannot delete system roles")

            # Check if any users have this role
            cur.execute("SELECT COUNT(*) FROM users WHERE role = (SELECT name FROM custom_roles WHERE id = %s)", (role_id,))
            user_count = cur.fetchone()[0]
            if user_count > 0:
                raise ValueError(f"Cannot delete role: {user_count} users are assigned to this role")

            cur.execute("DELETE FROM custom_roles WHERE id = %s", (role_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise ValueError(f"Role deletion failed: {str(e)}")
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def update(role_id, display_name=None, description=None, access_level=None):
        """Update a custom role"""
        conn = get_db()
        cur = conn.cursor()
        try:
            updates = []
            params = []

            if display_name:
                updates.append("display_name = %s")
                params.append(display_name)

            if description is not None:
                updates.append("description = %s")
                params.append(description)

            if access_level is not None:
                updates.append("access_level = %s")
                params.append(access_level)

            if not updates:
                raise ValueError("No fields to update")

            params.append(role_id)
            query = f"UPDATE custom_roles SET {', '.join(updates)} WHERE id = %s AND is_system_role = FALSE"

            cur.execute(query, params)
            if cur.rowcount == 0:
                raise ValueError("Role not found or is a system role")
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise ValueError(f"Role update failed: {str(e)}")
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

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

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
                        WHEN status = 'PENDING' THEN 'confirmed'
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
                SET status = 'CANCELLED', notes = %s, updated_date = NOW()
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
                status='COMPLETED',
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
                SET status = 'COMPLETED', updated_date = NOW()
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
        """Get recent pending and confirmed pre-orders for dashboard table"""
        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)

            cur.execute("""
                SELECT
                    po.id,
                    po.status,
                    po.created_date,
                    po.expected_price,
                    po.quantity,
                    c.first_name,
                    c.last_name,
                    p.name as product_name,
                    p.photo as product_photo,
                    p.stock as current_stock
                FROM pre_orders po
                JOIN customers c ON po.customer_id = c.id
                JOIN products p ON po.product_id = p.id
                WHERE (
                    (po.status = 'PENDING' AND DATE(po.created_date) = CURDATE()) OR
                    (po.status = 'confirmed' AND po.created_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) OR
                    (po.status = 'partially_paid' AND po.created_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) OR
                    (po.status = 'ready_for_pickup' AND po.created_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY))
                )
                AND po.status != 'completed'
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
            cancellable_statuses = ['PENDING', 'processing', 'completed']
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


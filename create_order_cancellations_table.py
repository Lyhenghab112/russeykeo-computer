#!/usr/bin/env python3
"""
Create order_cancellations table for tracking cancelled order items
"""

from models import get_db

def create_order_cancellations_table():
    """Create the order_cancellations table"""
    conn = get_db()
    cur = conn.cursor()
    
    try:
        # Create order_cancellations table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS order_cancellations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                product_id INT NOT NULL,
                reason VARCHAR(255) NOT NULL,
                refund_amount DECIMAL(10, 2) NOT NULL,
                cancelled_by VARCHAR(100) NOT NULL,
                cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                INDEX idx_order_id (order_id),
                INDEX idx_product_id (product_id),
                INDEX idx_cancelled_at (cancelled_at)
            )
        """)
        
        conn.commit()
        print("✅ order_cancellations table created successfully!")
        
    except Exception as e:
        print(f"❌ Error creating table: {str(e)}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    create_order_cancellations_table()

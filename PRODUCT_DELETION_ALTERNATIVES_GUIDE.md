# Product Deletion Alternatives Guide

This guide provides three alternative approaches to delete products without affecting order history, as alternatives to the current archiving system.

## Current Problem
Your system currently prevents product deletion when there are existing `order_items` that reference the product to preserve order history. Products are automatically archived instead.

## 3 Alternative Solutions

### 1. Data Denormalization Approach (Recommended)

**How it works:** Store essential product information directly in the `order_items` table so orders remain complete even after product deletion.

**Pros:**
- Complete order history preservation
- True product deletion possible
- Clean database with no "ghost" records
- Order invoices/reports show original product info

**Cons:**
- Increased storage usage
- Data duplication
- Requires migration of existing data

**Implementation Steps:**

1. **Run the database migration:**
   ```bash
   mysql -u your_username -p your_database < scripts/denormalize_order_items.sql
   ```

2. **Update your existing Product model** to use the new deletion method:
   ```python
   # In models.py, replace the existing delete method with:
   from models_product_deletion_alternatives import ProductDeletionAlternatives
   
   @staticmethod
   def delete_denormalized(product_id, force=False, staff_user_id=None):
       return ProductDeletionAlternatives.delete_with_denormalization(
           product_id, force, staff_user_id
       )
   ```

3. **Add the new route to your app:**
   ```python
   # In app.py, add after your existing routes:
   from alternative_deletion_routes import add_alternative_deletion_routes
   add_alternative_deletion_routes(app)
   ```

4. **Update order queries** to use denormalized data:
   ```python
   # Use ProductQueryAlternatives.get_order_items_with_product_info(order_id)
   # instead of joins with products table
   ```

### 2. Soft Delete Approach

**How it works:** Add a `deleted` flag to products and modify queries to exclude deleted products while keeping references intact.

**Pros:**
- Easy to implement
- Reversible (can "undelete")
- No data loss
- Maintains all relationships

**Cons:**
- Database grows over time
- Requires updating all product queries
- "Deleted" products still take up space

**Implementation Steps:**

1. **Run the database migration:**
   ```bash
   mysql -u your_username -p your_database < scripts/add_soft_delete_to_products.sql
   ```

2. **Update your Product model's get_all method:**
   ```python
   @staticmethod
   def get_all(include_archived=False, include_deleted=False):
       conn = get_db()
       cur = conn.cursor(dictionary=True)
       query = "SELECT * FROM products WHERE 1=1"
       
       if not include_archived:
           query += " AND archived = FALSE"
       
       if not include_deleted:
           query += " AND (deleted = FALSE OR deleted IS NULL)"
       
       cur.execute(query)
       products = cur.fetchall()
       cur.close()
       conn.close()
       return products
   ```

3. **Add soft delete route:**
   ```python
   # The route is included in alternative_deletion_routes.py
   # Use: DELETE /staff/inventory/<id>/delete/soft
   ```

4. **Update frontend to show restore option** for soft-deleted products.

### 3. NULL Reference Approach

**How it works:** Allow `product_id` to be NULL in `order_items` and handle the reference gracefully in the application.

**Pros:**
- True product deletion
- Order history preserved through denormalized data
- Clean foreign key handling

**Cons:**
- Most complex to implement
- Requires careful NULL handling in queries
- Potential for data inconsistency if not implemented properly

**Implementation Steps:**

1. **First run denormalization migration:**
   ```bash
   mysql -u your_username -p your_database < scripts/denormalize_order_items.sql
   ```

2. **Then run NULL reference migration:**
   ```bash
   mysql -u your_username -p your_database < scripts/allow_null_product_references.sql
   ```

3. **Update all order-related queries** to handle NULL product_id:
   ```python
   # Use LEFT JOIN instead of JOIN when querying products
   # Use COALESCE to fallback to denormalized data
   ```

4. **Add the deletion route:**
   ```python
   # Use: DELETE /staff/inventory/<id>/delete/null-refs
   ```

## Comparison Table

| Feature | Archiving (Current) | Denormalization | Soft Delete | NULL References |
|---------|-------------------|-----------------|-------------|-----------------|
| True Deletion | ❌ | ✅ | ❌ | ✅ |
| Order History Preserved | ✅ | ✅ | ✅ | ✅ |
| Reversible | ✅ | ❌ | ✅ | ❌ |
| Database Size | Growing | Optimized | Growing | Optimized |
| Implementation Complexity | Simple | Medium | Simple | Complex |
| Query Performance | Good | Good | Good | Requires careful handling |

## Recommendation

**Use the Data Denormalization Approach** because it:
- Provides true product deletion
- Preserves complete order history
- Has manageable implementation complexity
- Offers the best long-term database performance

## Migration Path

If you choose the denormalization approach:

1. **Backup your database first!**
2. Run the denormalization migration during off-peak hours
3. Test thoroughly with a few products
4. Update your application code gradually
5. Monitor for any issues

## Usage Examples

After implementing the denormalization approach:

```python
# Delete a product (will preserve order history through denormalized data)
ProductDeletionAlternatives.delete_with_denormalization(product_id=123, force=True, staff_user_id=1)

# Get order items with graceful handling of deleted products
items = ProductQueryAlternatives.get_order_items_with_product_info(order_id=456)

# Each item will have product_name, product_description, etc. even if product is deleted
```

## Frontend Updates Needed

Update your JavaScript to use the new deletion endpoints:

```javascript
// For denormalized deletion
const response = await fetch(`/staff/inventory/${productId}/delete/denormalized?force=true`, {
    method: 'DELETE'
});

// For soft deletion
const response = await fetch(`/staff/inventory/${productId}/delete/soft`, {
    method: 'DELETE'
});

// For restoring soft-deleted products
const response = await fetch(`/staff/inventory/${productId}/restore`, {
    method: 'POST'
});
```

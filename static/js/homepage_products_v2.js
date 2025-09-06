// Homepage Products with Quantity Selector - Clean Version
// This file handles cart buttons with quantity selector functionality
// Version: 2.1 - Fixed cart button transformation
// Cache bust: 2025-01-09-15:30

console.log('🚀 HOMEPAGE_PRODUCTS_V2.JS LOADED - VERSION 4.4 - QUANTITY SELECTOR KEEPS NUMBER AFTER ADDING');

// Global variables
let cartProductIds = new Set();
let cartQuantitiesCache = null;
let cartQuantitiesPromise = null;

// Product states for different categories
let productStates = {
    laptops: { allProducts: [], isExpanded: false, limits: { lg: 12, md: 6, sm: 6 } },
    desktops: { allProducts: [], isExpanded: false, limits: { lg: 8, md: 4, sm: 4 } },
    accessories: { allProducts: [], isExpanded: false, limits: { lg: 8, md: 4, sm: 4 } }
};

// Parent category IDs
const parentCategories = {
    laptops: 70,
    desktops: 2,
    accessories: 3
};

let categories = {
    laptops: [],
    desktops: [],
    accessories: []
};

// Utility Functions
function generateSlug(text) {
    if (!text) return "";
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function calculateDiscount(product) {
    if (product.original_price && product.price < product.original_price) {
        const savings = product.original_price - product.price;
        const percentage = Math.round((savings / product.original_price) * 100);
        return {
            hasDiscount: true,
            percentage: percentage,
            savings: savings,
            originalPrice: product.original_price,
            salePrice: product.price
        };
    }
    return { hasDiscount: false };
}

function formatDiscountPrice(product) {
    const discount = calculateDiscount(product);
    if (discount.hasDiscount) {
        return {
            originalPriceHtml: `<span class="original-price">$${parseFloat(discount.originalPrice).toFixed(2)}</span>`,
            salePriceHtml: `<span class="sale-price">$${parseFloat(discount.salePrice).toFixed(2)}</span>`,
            savingsHtml: `<div class="savings-text">You Save: $${parseFloat(discount.savings).toFixed(2)}</div>`,
            discountBadge: `<div class="discount-badge">${discount.percentage}% OFF</div>`
        };
    }
    return {
        regularPriceHtml: `<span class="price h5 text-primary">$${parseFloat(product.price).toFixed(2)}</span>`
    };
}

// Cart Functions
async function getAllCartQuantities() {
    if (cartQuantitiesCache) {
        return cartQuantitiesCache;
    }
    
    if (cartQuantitiesPromise) {
        return cartQuantitiesPromise;
    }
    
    cartQuantitiesPromise = fetch('/api/cart/items')
        .then(response => response.json())
        .then(data => {
            console.log('🔍 Cart API response:', data);
            if (data.success && data.cart_items) {
                const quantities = {};
                data.cart_items.forEach(item => {
                    const productId = item.id || item.product_id;
                    if (productId) {
                        quantities[productId] = item.quantity;
                    }
                });
                console.log('🔍 Cart quantities map:', quantities);
                cartQuantitiesCache = quantities;
                return quantities;
            }
            console.log('🔍 No cart items found');
            cartQuantitiesCache = {};
            return {};
        })
        .catch(error => {
            console.error('Error getting cart quantities:', error);
            cartQuantitiesCache = {};
            return {};
        });
    
    return cartQuantitiesPromise;
}

function getCartQuantityForProduct(productId) {
    return getAllCartQuantities().then(quantities => {
        const quantity = quantities[productId] || 0;
        console.log(`🔍 Product ${productId} quantity: ${quantity}`);
        console.log(`🔍 All quantities:`, quantities);
        return quantity;
    });
}

function invalidateCartCache() {
    console.log('🔄 Invalidating cart cache');
    cartQuantitiesCache = null;
    cartQuantitiesPromise = null;
}

// Quantity Selector Functions
function createQuantitySelectorHTML(quantity, productId) {
    return `
        <div class="cart-quantity-selector d-flex align-items-center justify-content-center" style="gap: 4px;">
            <button type="button" class="btn btn-sm btn-outline-secondary cart-quantity-btn" 
                    data-product-id="${productId}" data-action="decrease" 
                    style="padding: 2px 6px; min-width: 24px; height: 24px; font-size: 12px;">
                <i class="bi bi-dash"></i>
            </button>
            <span class="cart-quantity-display" style="min-width: 20px; text-align: center; font-weight: bold; font-size: 12px;">${quantity}</span>
            <button type="button" class="btn btn-sm btn-outline-secondary cart-quantity-btn" 
                    data-product-id="${productId}" data-action="increase" 
                    style="padding: 2px 6px; min-width: 24px; height: 24px; font-size: 12px;">
                <i class="bi bi-plus"></i>
            </button>
        </div>
    `;
}

// Cart Functions
// Function to update cart quantity (main products)
async function updateCartQuantityMainProducts(productId, quantity) {
    console.log(`🛒 AJAX: Updating main products cart quantity for product ${productId} to ${quantity}`);
    
    try {
        let response;
        let data;
        
        if (quantity <= 0) {
            // Use remove endpoint when quantity is 0 or less
            console.log(`🛒 AJAX: Removing main product ${productId} from cart (quantity: ${quantity})`);
            response = await fetch('/api/cart/remove', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    product_id: productId
                })
            });
        } else {
            // Use update endpoint for positive quantities
            response = await fetch('/api/cart/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity
                })
            });
        }

        data = await response.json();
        console.log('🛒 AJAX: Main products update cart response:', data);

        if (data.success) {
            // Invalidate cart cache so fresh data is fetched
            if (typeof invalidateCartCache === 'function') {
                invalidateCartCache();
            }
            
            // Update cart state
            if (typeof cartProductIds !== 'undefined') {
                if (quantity > 0) {
                    cartProductIds.add(productId);
                } else {
                    cartProductIds.delete(productId);
                }
                localStorage.setItem('cartProductIds', JSON.stringify(Array.from(cartProductIds)));
            }
            
            // Update cart badge immediately - show unique products count
            const cartBadge = document.getElementById('cart-badge');
            if (cartBadge) {
                const uniqueProducts = cartProductIds.size;
                if (uniqueProducts > 0) {
                    cartBadge.textContent = uniqueProducts;
                    cartBadge.classList.add('show');
                    localStorage.setItem('cart_count', uniqueProducts.toString());
                    console.log(`🛒 Updated main products cart badge to ${uniqueProducts} unique products`);
                } else {
                    cartBadge.classList.remove('show');
                    localStorage.setItem('cart_count', '0');
                    console.log(`🛒 Hiding main products cart badge - no products`);
                }
            }
            
            // If quantity is 0, also remove from cartProductIds to ensure clean state
            if (quantity <= 0 && cartProductIds.has(productId)) {
                cartProductIds.delete(productId);
                localStorage.setItem('cartProductIds', JSON.stringify(Array.from(cartProductIds)));
                console.log(`🛒 Removed product ${productId} from cartProductIds (quantity: ${quantity})`);
            }
            
            console.log(`🛒 AJAX: Successfully updated main products cart quantity for product ${productId} to ${quantity}`);
            
            // Don't refresh immediately - the display is already correct
            // Only refresh if there's a mismatch
            
            return true;
        } else {
            console.error('🛒 AJAX: Failed to update main products cart quantity:', data.error);
            return false;
        }
    } catch (error) {
        console.error('🛒 AJAX: Network error updating main products cart quantity:', error);
        return false;
    }
}

async function addToCartMainProducts(productId, quantity) {
    console.log(`🛒 Adding ${quantity} of product ${productId} to cart`);
    
    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: quantity
            })
        });

        const data = await response.json();
        console.log('🛒 Add to cart response:', data);

        if (data.success) {
            // Add to cart product IDs
            cartProductIds.add(productId);
            localStorage.setItem('cartProductIds', JSON.stringify(Array.from(cartProductIds)));
            
            // Update cart badge immediately - show unique products count
            const cartBadge = document.getElementById('cart-badge');
            if (cartBadge) {
                const uniqueProducts = cartProductIds.size;
                if (uniqueProducts > 0) {
                    cartBadge.textContent = uniqueProducts;
                    cartBadge.classList.add('show');
                    localStorage.setItem('cart_count', uniqueProducts.toString());
                    console.log(`🛒 Updated cart badge to ${uniqueProducts} unique products`);
                } else {
                    cartBadge.classList.remove('show');
                    localStorage.setItem('cart_count', '0');
                    console.log(`🛒 Hiding cart badge - no products`);
                }
            }
            
            // Show success notification
            showNotification(`Added ${quantity} item(s) to cart!`, 'success');
            
            // Invalidate cart cache
            invalidateCartCache();
            
            return true;
        } else {
            showNotification(data.message || 'Failed to add to cart', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error adding to cart', 'error');
        return false;
    }
}

async function updateCartQuantity(productId, newQuantity) {
    console.log(`🛒 Updating product ${productId} quantity to ${newQuantity}`);
    
    try {
        const response = await fetch('/api/cart/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: newQuantity
            })
        });

        const data = await response.json();
        console.log('🛒 Update cart response:', data);

        if (data.success) {
            if (newQuantity <= 0) {
                cartProductIds.delete(productId);
            } else {
                cartProductIds.add(productId);
            }
            localStorage.setItem('cartProductIds', JSON.stringify(Array.from(cartProductIds)));
            
            // Update cart badge immediately - show unique products count
            const cartBadge = document.getElementById('cart-badge');
            if (cartBadge) {
                const uniqueProducts = cartProductIds.size;
                if (uniqueProducts > 0) {
                    cartBadge.textContent = uniqueProducts;
                    cartBadge.classList.add('show');
                    localStorage.setItem('cart_count', uniqueProducts.toString());
                    console.log(`🛒 Updated cart badge to ${uniqueProducts} unique products`);
                } else {
                    cartBadge.classList.remove('show');
                    localStorage.setItem('cart_count', '0');
                    console.log(`🛒 Hiding cart badge - no products`);
                }
            }
            
            // Invalidate cart cache
            invalidateCartCache();
            
            return true;
        } else {
            showNotification(data.message || 'Failed to update cart', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error updating cart:', error);
        showNotification('Error updating cart', 'error');
        return false;
    }
}

async function removeFromCart(productId) {
    console.log(`🛒 Removing product ${productId} from cart`);
    
    try {
        const response = await fetch('/api/cart/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId
            })
        });

        const data = await response.json();
        console.log('🛒 Remove from cart response:', data);

        if (data.success) {
            cartProductIds.delete(productId);
            localStorage.setItem('cartProductIds', JSON.stringify(Array.from(cartProductIds)));
            
            // Update cart badge immediately - show unique products count
            const cartBadge = document.getElementById('cart-badge');
            if (cartBadge) {
                const uniqueProducts = cartProductIds.size;
                if (uniqueProducts > 0) {
                    cartBadge.textContent = uniqueProducts;
                    cartBadge.classList.add('show');
                    localStorage.setItem('cart_count', uniqueProducts.toString());
                    console.log(`🛒 Updated cart badge to ${uniqueProducts} unique products`);
                } else {
                    cartBadge.classList.remove('show');
                    localStorage.setItem('cart_count', '0');
                    console.log(`🛒 Hiding cart badge - no products`);
                }
            }
            
            // Invalidate cart cache
            invalidateCartCache();
            
            return true;
        } else {
            showNotification(data.message || 'Failed to remove from cart', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        showNotification('Error removing from cart', 'error');
        return false;
    }
}

// Simple button state functions
function refreshAllCartButtonStates() {
    console.log('🔄 Refreshing all cart button states');
    invalidateCartCache(); // Force fresh data
    
    const cartButtons = document.querySelectorAll('.add-to-cart-btn');
    cartButtons.forEach(button => {
        const productId = parseInt(button.getAttribute('data-product-id'));
        if (productId) {
            updateCartButtonDisplay(button, productId);
        }
    });
}

function updateButtonToInCart(button, productId) {
    console.log(`🔄 Updating button to "In Cart" state for product ${productId}`);
    
    // Get the current quantity from cart
    getCartQuantityForProduct(productId).then(quantity => {
        // If quantity is 0 but we know the product is in cartProductIds, assume quantity is 1
        if (quantity === 0 && cartProductIds.has(productId)) {
            quantity = 1;
        }
        
        // Change button appearance to show it's in cart with quantity
        button.innerHTML = `<i class="bi bi-check-circle"></i> (${quantity})`;
        button.title = `${quantity} item(s) in cart - Click to add more`;
        button.style.backgroundColor = '#28a745'; // Keep green
        button.style.color = 'white';
        button.disabled = false;
        
        console.log(`✅ Button updated to "In Cart" state with quantity ${quantity}`);
    }).catch(error => {
        console.error('Error getting quantity for button update:', error);
        // Fallback to simple checkmark if API fails
        button.innerHTML = `<i class="bi bi-check-circle"></i>`;
        button.title = 'In cart - Click to add more';
        button.style.backgroundColor = '#28a745';
        button.style.color = 'white';
        button.disabled = false;
    });
}

// Button transformation functions (keeping for compatibility)
function updateCartButtonDisplay(button, productId) {
    console.log(`🔄 Updating cart button display for product ${productId}`);
    console.log(`🔄 Button element:`, button);
    console.log(`🔄 Button current HTML:`, button.innerHTML);
    
    getCartQuantityForProduct(productId).then(quantity => {
        console.log(`🔍 Product ${productId} has quantity ${quantity} in cart`);
        
        // If quantity is 0 but we know the product is in cartProductIds, assume quantity is 1
        if (quantity === 0 && cartProductIds.has(productId)) {
            console.log(`🔄 Quantity is 0 but product is in cartProductIds, assuming quantity is 1`);
            quantity = 1;
        }
        
        if (quantity > 0) {
            console.log(`🔄 Quantity > 0, transforming to quantity selector`);
            // Transform to quantity selector
            replaceWithCartButton(button, productId, quantity);
        } else {
            console.log(`🔄 Quantity = 0, keeping as Add to Cart button`);
            // Keep as Add to Cart button
            button.innerHTML = `<i class="bi bi-cart-plus"></i>`;
            button.title = 'Add to cart';
            button.disabled = false;
        }
    }).catch(error => {
        console.error(`❌ Error in updateCartButtonDisplay:`, error);
    });
}

function replaceWithCartButton(button, productId, quantity) {
    console.log(`🔄 Replacing button with quantity selector for product ${productId}, quantity: ${quantity}`);
    console.log(`🔄 Button before transformation:`, button);
    console.log(`🔄 Button HTML before:`, button.innerHTML);
    
    // Create quantity selector HTML
    const quantitySelectorHTML = createQuantitySelectorHTML(quantity, productId);
    console.log(`🔄 Quantity selector HTML:`, quantitySelectorHTML);
    
    // Replace button content
    button.innerHTML = quantitySelectorHTML;
    button.className = 'btn cart-quantity-container';
    button.style.width = '80px';
    button.style.height = '36px';
    button.style.padding = '0';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.boxSizing = 'border-box';
    button.disabled = false;
    
    console.log(`🔄 Button after transformation:`, button);
    console.log(`🔄 Button HTML after:`, button.innerHTML);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Setting up cart event listeners');
    
    // Global event delegation for Add to Cart buttons
    document.addEventListener('click', function(e) {
        const cartButton = e.target.closest('.add-to-cart-btn');
        if (cartButton) {
            console.log('🛒 Add to Cart button clicked');
            e.preventDefault();
            e.stopPropagation();
            
            const productId = parseInt(cartButton.getAttribute('data-product-id'));
            console.log(`🛒 Product ID: ${productId}`);
            
            if (productId) {
                // Get quantity from quantity selector
                const quantitySelector = cartButton.closest('.d-flex').querySelector('.quantity-selector-container');
                const quantityDisplay = quantitySelector ? quantitySelector.querySelector('.quantity-display') : null;
                const currentQuantity = quantityDisplay ? parseInt(quantityDisplay.textContent) || 0 : 0;
                
                // If quantity is 0, add 1 item (first time adding)
                if (currentQuantity <= 0) {
                    console.log(`🛒 First time adding product ${productId} to cart - adding 1 item`);
                    addToCartMainProducts(productId, 1).then(success => {
                        console.log(`🛒 Add to cart result: ${success}`);
                        if (success) {
                            console.log(`🛒 Success! Added 1 item to cart`);
                            // Keep the quantity selector number - don't reset to 0
                            // The quantity selector stays as is after adding to cart
                        } else {
                            console.log(`🛒 Failed to add to cart for product ${productId}`);
                        }
                    });
                    return;
                }
                
                console.log(`🛒 Adding ${currentQuantity} items to cart for product ${productId}`);
                
                // Add the current quantity to cart
                addToCartMainProducts(productId, currentQuantity).then(success => {
                    console.log(`🛒 Add to cart result: ${success}`);
                    if (success) {
                        console.log(`🛒 Success! Added ${currentQuantity} items to cart`);
                        // Keep the quantity selector number - don't reset to 0
                        // The quantity selector stays as is after adding to cart
                    } else {
                        console.log(`🛒 Failed to add to cart for product ${productId}`);
                    }
                });
            }
        }
        
        // Handle quantity selector buttons
        const quantityBtn = e.target.closest('.cart-quantity-btn');
        if (quantityBtn) {
            console.log('🔘 Quantity selector button clicked');
            e.preventDefault();
            e.stopPropagation();
            
            const action = quantityBtn.getAttribute('data-action');
            const productId = parseInt(quantityBtn.getAttribute('data-product-id'));
            
            console.log(`🔘 Action: ${action}, Product ID: ${productId}`);
            
            if (productId) {
                // Find the quantity display
                const quantityContainer = quantityBtn.closest('.cart-quantity-container');
                const quantityDisplay = quantityContainer.querySelector('.cart-quantity-display');
                const currentQuantity = quantityDisplay ? parseInt(quantityDisplay.textContent) : 0;
                
                let newQuantity;
                if (action === 'increase') {
                    newQuantity = currentQuantity + 1;
                } else if (action === 'decrease') {
                    newQuantity = Math.max(0, currentQuantity - 1);
                }
                
                console.log(`🔘 Current: ${currentQuantity}, New: ${newQuantity}`);
                
                if (newQuantity !== undefined && newQuantity !== currentQuantity) {
                    // Update cart
                    updateCartQuantity(productId, newQuantity).then(success => {
                        if (success) {
                            // Update display
                            if (quantityDisplay) {
                                quantityDisplay.textContent = newQuantity;
                            }
                            
                            // If quantity is 0, transform back to Add to Cart button
                            if (newQuantity === 0) {
                                const button = quantityBtn.closest('.cart-quantity-container');
                                if (button) {
                                    button.innerHTML = `<i class="bi bi-cart-plus"></i>`;
                                    button.className = 'btn add-to-cart-btn';
                                    button.setAttribute('data-product-id', productId);
                                    button.title = 'Add to cart';
                                }
                            }
                        }
                    });
                }
            }
        }
    });
    
    // Initialize cart button states after products are loaded
    setTimeout(() => {
        console.log('🔄 Initializing cart button states');
        const cartButtons = document.querySelectorAll('.add-to-cart-btn');
        cartButtons.forEach(button => {
            const productId = parseInt(button.getAttribute('data-product-id'));
            if (productId) {
                updateCartButtonDisplay(button, productId);
            }
        });
    }, 1000);
    
    // Refresh button states when page becomes visible (e.g., coming back from cart page)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('🔄 Page became visible, refreshing cart button states');
            setTimeout(() => {
                refreshAllCartButtonStates();
            }, 500);
        }
    });
    
    // Also refresh when window gains focus
    window.addEventListener('focus', function() {
        console.log('🔄 Window gained focus, refreshing cart button states');
        setTimeout(() => {
            refreshAllCartButtonStates();
        }, 500);
    });
    
    // Refresh when page is clicked (in case user comes back from cart)
    document.addEventListener('click', function() {
        // Only refresh if we haven't refreshed recently
        if (!window.lastRefresh || Date.now() - window.lastRefresh > 2000) {
            console.log('🔄 Page clicked, refreshing cart button states');
            setTimeout(() => {
                refreshAllCartButtonStates();
                window.lastRefresh = Date.now();
            }, 1000);
        }
    });
});

// Global function exposures
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.updateCartButtonDisplay = updateCartButtonDisplay;
window.refreshAllCartButtonStates = refreshAllCartButtonStates;

// Manual refresh function for testing
window.refreshCartButtons = function() {
    console.log('🔄 Manual refresh triggered');
    refreshAllCartButtonStates();
};

// Cart operations removed - handled elsewhere

// Legacy cart functions removed - handled elsewhere

// addToCart function removed - handled elsewhere

// updateCartQuantity function removed - handled elsewhere

// removeFromCart function removed - handled elsewhere

// Product Rendering
function renderProducts(containerId, products) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    products.forEach(product => {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-lg-3 col-md-6';

        const cardDiv = document.createElement('div');
        cardDiv.className = 'product-card card h-100';

        // Discount badge
        const discount = calculateDiscount(product);
        if (discount.hasDiscount) {
            cardDiv.classList.add('discount-card');
            const discountBadge = document.createElement('div');
            discountBadge.className = 'discount-badge';
            discountBadge.textContent = `${discount.percentage}% OFF`;
            cardDiv.appendChild(discountBadge);
        }

        // Product image
        const link = document.createElement('a');
        link.href = `/products/${generateSlug(product.name)}`;

        const img = document.createElement('img');
        img.className = 'card-img-top p-3';
        img.alt = product.name;
        img.src = product.photo ? `/static/uploads/products/${product.photo}` : 'https://placehold.co/300x200?text=Product';
        img.style.objectFit = 'contain';

        link.appendChild(img);
        cardDiv.appendChild(link);

        // Card body
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        // Title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'd-flex justify-content-between';

        const title = document.createElement('h5');
        title.className = 'card-title';
        title.textContent = product.name;

        titleDiv.appendChild(title);
        cardBody.appendChild(titleDiv);

        // Price
        const priceDiv = document.createElement('div');
        priceDiv.className = 'd-flex justify-content-between align-items-center';

        const discountInfo = formatDiscountPrice(product);
        if (discountInfo.originalPriceHtml) {
            const priceContainer = document.createElement('div');
            priceContainer.className = 'price-container';
            priceContainer.innerHTML = `
                ${discountInfo.originalPriceHtml}
                ${discountInfo.salePriceHtml}
                ${discountInfo.savingsHtml}
            `;
            priceDiv.appendChild(priceContainer);
        } else {
            const priceSpan = document.createElement('span');
            priceSpan.className = 'price h5 text-primary';
            priceSpan.textContent = `$${parseFloat(product.price).toFixed(2)}`;
            priceDiv.appendChild(priceSpan);
        }

        cardBody.appendChild(priceDiv);

        // Description
        const descDiv = document.createElement('div');
        const descP = document.createElement('p');
        descP.className = 'card-text text-muted';
        descP.textContent = product.description.length > 250 ? product.description.substring(0, 250) + '...' : product.description;

        descDiv.appendChild(descP);
        cardBody.appendChild(descDiv);

        // Action buttons
        const buttonDiv = document.createElement('div');
        buttonDiv.className = 'd-flex gap-2 mt-3 align-items-center';

        const viewButton = document.createElement('button');
            viewButton.className = 'btn btn-primary view-product-btn';
        viewButton.textContent = 'View Product';
        viewButton.setAttribute('data-product-name', product.name);
            viewButton.style.width = '80px';
            viewButton.style.height = '36px';
            viewButton.style.fontSize = '11px';
            viewButton.style.padding = '0';
            viewButton.style.borderRadius = '2px';
            viewButton.style.display = 'flex';
            viewButton.style.alignItems = 'center';
            viewButton.style.justifyContent = 'center';
            viewButton.style.boxSizing = 'border-box';
        
        const cartButton = document.createElement('button');
        cartButton.className = 'btn add-to-cart-btn';
        cartButton.setAttribute('data-product-id', product.id);
        cartButton.style.width = '80px';
        cartButton.style.height = '36px';
        cartButton.style.fontSize = '11px';
        cartButton.style.padding = '0';
        cartButton.style.borderRadius = '2px';
        cartButton.style.display = 'flex';
        cartButton.style.alignItems = 'center';
        cartButton.style.justifyContent = 'center';
        cartButton.style.boxSizing = 'border-box';

                // Simple cart button - no stock/preorder logic
        cartButton.disabled = false;
        cartButton.style.backgroundColor = '#007bff';
        cartButton.style.color = 'white';
                cartButton.style.border = 'none';
                    cartButton.title = 'Add to cart';
        cartButton.innerHTML = `<i class="bi bi-cart-plus"></i>`;

        // Quantity selector (always present)
        const quantitySelector = document.createElement('div');
        quantitySelector.className = 'quantity-selector-container d-flex align-items-center';
        quantitySelector.style.gap = '4px';
        quantitySelector.style.marginLeft = '8px';
        quantitySelector.innerHTML = `
            <button type="button" class="btn btn-sm quantity-btn" 
                    data-product-id="${product.id}" data-action="decrease" 
                    style="background-color: #ffffff; color: #6c757d; border: 1px solid #dee2e6; padding: 0; width: 36px; height: 36px; font-size: 14px; font-weight: 500; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;">
                <i class="bi bi-dash" style="font-size: 12px;"></i>
            </button>
            <span class="quantity-display" style="width: 36px; height: 36px; text-align: center; font-weight: 600; font-size: 14px; color: #495057; background-color: #ffffff; border: 1px solid #dee2e6; padding: 0; border-radius: 2px; margin: 0 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center;">0</span>
            <button type="button" class="btn btn-sm quantity-btn" 
                    data-product-id="${product.id}" data-action="increase" 
                    style="background-color: #ffffff; color: #6c757d; border: 1px solid #dee2e6; padding: 0; width: 36px; height: 36px; font-size: 14px; font-weight: 500; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;">
                <i class="bi bi-plus" style="font-size: 12px;"></i>
            </button>
        `;

        // Add quantity selector event listeners
        const quantityButtons = quantitySelector.querySelectorAll('.quantity-btn');
        quantityButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const action = this.getAttribute('data-action');
                const quantityDisplay = quantitySelector.querySelector('.quantity-display');
                const currentQuantity = parseInt(quantityDisplay.textContent) || 0;
                let newQuantity = currentQuantity;

                if (action === 'increase') {
                    newQuantity = currentQuantity + 1;
                    console.log(`🔘 Increasing to: ${newQuantity}`);
                } else if (action === 'decrease') {
                    newQuantity = Math.max(0, currentQuantity - 1);
                    console.log(`🔘 Decreasing to: ${newQuantity}`);
                }

                // Update the display immediately
                if (newQuantity !== undefined && newQuantity !== currentQuantity) {
                    quantityDisplay.textContent = newQuantity;
                    console.log(`🔍 Updated quantity display to ${newQuantity} (currentQuantity: ${currentQuantity})`);
                    
                    // NEVER update cart from quantity selector - only "Add to Cart" button should add to cart
                    console.log(`🛒 Quantity selector changed to ${newQuantity} - NOT updating cart (display only)`);
                    // Don't update cart - quantity selector is just for display
                }
            });

            // Add hover effects for quantity buttons
            button.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#f8f9fa';
                this.style.borderColor = '#adb5bd';
                this.style.color = '#495057';
                this.style.transform = 'translateY(-1px)';
                this.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
            });

            button.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '#ffffff';
                this.style.borderColor = '#dee2e6';
                this.style.color = '#6c757d';
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            });

            button.addEventListener('mousedown', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
            });

            button.addEventListener('mouseup', function() {
                this.style.transform = 'translateY(-1px)';
                this.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
            });
        });

        buttonDiv.appendChild(viewButton);
        buttonDiv.appendChild(cartButton);
        buttonDiv.appendChild(quantitySelector);
        cardBody.appendChild(buttonDiv);
        
        // Cart button state initialization removed

        cardDiv.appendChild(cardBody);
        colDiv.appendChild(cardDiv);
        container.appendChild(colDiv);
    });

    // Fix layout
    requestAnimationFrame(() => {
        const cards = container.querySelectorAll('.card');
        cards.forEach(card => {
            card.style.minHeight = '400px';
            const cardBody = card.querySelector('.card-body');
            if (cardBody) {
                cardBody.style.display = 'flex';
                cardBody.style.flexDirection = 'column';
                cardBody.style.height = '100%';
            }
            const buttonContainer = card.querySelector('.d-flex');
            if (buttonContainer) {
                buttonContainer.style.marginTop = 'auto';
            }
        });
    });
}

// Category Functions
async function fetchSubcategories(parentCategoryId) {
    try {
        const response = await fetch(`/api/categories/${parentCategoryId}/subcategories`);
        const data = await response.json();
        
        if (data.success) {
            return [parentCategoryId, ...data.subcategories.map(sub => sub.id)];
        } else {
            console.error('Failed to fetch subcategories for parent', parentCategoryId);
            return [parentCategoryId];
        }
    } catch (error) {
        console.error('Error fetching subcategories:', error);
        return [parentCategoryId];
    }
}

function fetchProductsByCategory(categoryId) {
    return fetch(`/staff/categories/${categoryId}/products`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                return data.products;
            } else {
                console.error('Failed to fetch products for category', categoryId);
                return [];
            }
        })
        .catch(error => {
            console.error('Error fetching products:', error);
            return [];
        });
}

function getCurrentLimit(category) {
    const width = window.innerWidth;
    const state = productStates[category];
    if (!state) return 0;

    if (width >= 992) {
        return state.limits.lg;
    } else if (width >= 768) {
        return state.limits.md;
    } else {
        return state.limits.sm;
    }
}

function updateViewMoreButton(category) {
    const viewMoreBtn = document.getElementById(`${category}-view-more-btn`);
    const viewMoreContainer = document.getElementById(`${category}-view-more-container`);

    if (!viewMoreBtn || !viewMoreContainer) return;

    const currentLimit = getCurrentLimit(category);
    const state = productStates[category];
    const hasMoreProducts = state.allProducts.length > currentLimit;

    if (hasMoreProducts) {
        viewMoreContainer.style.display = 'block';
        if (state.isExpanded) {
            viewMoreBtn.textContent = 'View Less';
            viewMoreBtn.className = 'btn btn-outline-secondary';
        } else {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            viewMoreBtn.textContent = `View More ${categoryName}`;
            viewMoreBtn.className = 'btn btn-outline-primary';
        }
    } else {
        viewMoreContainer.style.display = 'none';
    }
}

function renderProductsWithLimit(category) {
    const currentLimit = getCurrentLimit(category);
    const state = productStates[category];
    const productsToShow = state.isExpanded
        ? state.allProducts
        : state.allProducts.slice(0, currentLimit);

    renderProducts(`${category}-products-container`, productsToShow);
    updateViewMoreButton(category);
}

async function loadCategoryProducts() {
    console.log('🔄 Loading category products...');
    
    // Fetch subcategories
    categories.laptops = await fetchSubcategories(parentCategories.laptops);
    categories.desktops = await fetchSubcategories(parentCategories.desktops);
    categories.accessories = await fetchSubcategories(parentCategories.accessories);
    
    // Load laptops
    let laptops = [];
    for (const catId of categories.laptops) {
        const prods = await fetchProductsByCategory(catId);
        laptops = laptops.concat(prods);
    }
    productStates.laptops.allProducts = laptops;
    productStates.laptops.isExpanded = false;
    renderProductsWithLimit('laptops');
    console.log(`✅ Loaded ${laptops.length} laptop products`);

    // Load desktops
    let desktops = [];
    for (const catId of categories.desktops) {
        const prods = await fetchProductsByCategory(catId);
        desktops = desktops.concat(prods);
    }
    productStates.desktops.allProducts = desktops;
    productStates.desktops.isExpanded = false;
    renderProductsWithLimit('desktops');
    console.log(`✅ Loaded ${desktops.length} desktop products`);

    // Load accessories
    let accessories = [];
    for (const catId of categories.accessories) {
        const prods = await fetchProductsByCategory(catId);
        accessories = accessories.concat(prods);
    }
    productStates.accessories.allProducts = accessories;
    productStates.accessories.isExpanded = false;
    renderProductsWithLimit('accessories');
    console.log(`✅ Loaded ${accessories.length} accessory products`);
}

// Cart State Management
async function loadCartProductIds() {
    try {
        // Load cart data for both logged-in and non-logged-in users
        const response = await fetch('/api/cart/items?t=' + Date.now());
        const data = await response.json();

        if (data.success && data.cart_items) {
            cartProductIds.clear();
            data.cart_items.forEach(item => {
                if (item.id) {
                    cartProductIds.add(item.id);
                }
            });
            localStorage.setItem('cartProductIds', JSON.stringify(Array.from(cartProductIds)));

            const uniqueProducts = data.cart_items.length;
            localStorage.setItem('cart_count', uniqueProducts.toString());

            console.log('🛒 Loaded cart product IDs:', Array.from(cartProductIds));
        } else {
            // If no cart items, clear the cart state
            cartProductIds.clear();
            localStorage.removeItem('cartProductIds');
            localStorage.setItem('cart_count', '0');
            console.log('🛒 No cart items found, cleared cart state');
        }
    } catch (error) {
        console.error('Error loading cart product IDs:', error);
        loadCartProductIdsFromStorage();
    }
}

function loadCartProductIdsFromStorage() {
    try {
        const stored = localStorage.getItem('cartProductIds');
        if (stored) {
            const productIds = JSON.parse(stored);
            cartProductIds.clear();
            productIds.forEach(id => cartProductIds.add(id));
            
            const totalItems = productIds.length;
            localStorage.setItem('cart_count', totalItems.toString());
            
            console.log('🛒 Loaded cart product IDs from localStorage:', Array.from(cartProductIds));
        }
    } catch (error) {
        console.error('Error loading cart product IDs from localStorage:', error);
    }
}

function updateCartBadgeImmediate() {
    console.log('🛒 Updating cart badge immediately');
    const cartBadge = document.getElementById('cart-badge');
    if (!cartBadge) {
        console.log('❌ Cart badge element not found!');
        return;
    }

    // Use cartProductIds to show unique products count
    const uniqueProducts = cartProductIds.size;
    console.log('🛒 Unique products in cart:', uniqueProducts);
    
    if (uniqueProducts > 0) {
        cartBadge.textContent = uniqueProducts;
        cartBadge.classList.add('show');
        localStorage.setItem('cart_count', uniqueProducts.toString());
        localStorage.setItem('cart_updated', Date.now().toString());
        console.log('🛒 Showing badge with unique products count:', uniqueProducts);
    } else {
        cartBadge.classList.remove('show');
        localStorage.setItem('cart_count', '0');
        localStorage.setItem('cart_updated', Date.now().toString());
        console.log('🛒 Hiding badge - no unique products');
    }
}

function updateCartBadge() {
    console.log('🛒 Updating cart badge');
    const cartBadge = document.getElementById('cart-badge');
    if (!cartBadge) {
        console.log('❌ Cart badge element not found!');
        return;
    }

    const localCartCount = localStorage.getItem('cart_count');
    console.log('🛒 Local cart count:', localCartCount);
    
    if (localCartCount) {
        const count = parseInt(localCartCount);
        if (count > 0) {
            cartBadge.textContent = count;
            cartBadge.classList.add('show');
            console.log('🛒 Showing badge with count:', count);
        return;
        } else {
            cartBadge.classList.remove('show');
            console.log('🛒 Hiding badge - count is 0');
        }
    }

    // Fallback to API call
    fetch('/api/cart/count')
        .then(response => response.json())
        .then(data => {
            console.log('🛒 API response:', data);
            if (data.success && data.cart_count > 0) {
                cartBadge.textContent = data.cart_count;
                cartBadge.classList.add('show');
                localStorage.setItem('cart_count', data.cart_count.toString());
                console.log('🛒 Showing badge from API with count:', data.cart_count);
            } else {
                cartBadge.classList.remove('show');
                localStorage.setItem('cart_count', '0');
                console.log('🛒 Hiding badge from API - no items');
            }
        })
        .catch(error => {
            console.error('Error updating cart badge:', error);
            cartBadge.classList.remove('show');
        });
}

// updateCartButtonState function removed - handled elsewhere

// Expose updateCartBadgeImmediate globally so other scripts can call it
window.updateCartBadgeImmediate = updateCartBadgeImmediate;

// Notification System
function showNotification(message, type = 'info', showCartButton = false) {
    const existingNotifications = document.querySelectorAll('.cart-notification');
    existingNotifications.forEach(notif => {
        if (notif.dataset.type === type) {
            notif.remove();
        }
    });

    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.dataset.type = type;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        transform: translateX(100%);
        opacity: 0;
    `;

    if (type === 'success') {
        notification.style.backgroundColor = '#28a745';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#dc3545';
    } else {
        notification.style.backgroundColor = '#007bff';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    });

    // Auto remove
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Click Feedback
function addClickFeedback(buttonElement) {
    const originalTransform = buttonElement.style.transform || '';
    buttonElement.style.transform = 'scale(0.95)';
    buttonElement.style.transition = 'transform 0.1s ease';

    setTimeout(() => {
        buttonElement.style.transform = originalTransform;
        setTimeout(() => {
            buttonElement.style.transition = '';
        }, 100);
    }, 100);
}

// Cart button logic removed - handled elsewhere

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Homepage products script loaded');
    
    // Load cart state
    loadCartProductIdsFromStorage();
    
    // Clear cart badge after loading from storage to prevent auto-show
    const cartBadge = document.getElementById('cart-badge');
    if (cartBadge) {
        cartBadge.classList.remove('show');
        cartBadge.textContent = '0';
        console.log('🛒 Cart badge cleared after loading from storage');
    }
    
    // Load products
    loadCartProductIds().then(() => {
        loadCategoryProducts();
        // Don't auto-update cart badge - let user actions control it
        console.log('🛒 Products loaded, cart badge will only show when user adds items');
    });

    // Event listeners
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id.endsWith('-view-more-btn')) {
            e.preventDefault();
            const category = e.target.id.replace('-view-more-btn', '');
            if (productStates[category]) {
                productStates[category].isExpanded = !productStates[category].isExpanded;
                renderProductsWithLimit(category);
                if (productStates[category].isExpanded) {
                    const section = document.querySelector(`#${category}-products-container`).closest('section');
                    if (section) {
                        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }
        }
    });

    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            Object.keys(productStates).forEach(category => {
                if (productStates[category].allProducts.length > 0) {
                    renderProductsWithLimit(category);
                }
            });
        }, 250);
    });

    // Refresh cart state when page becomes visible
    window.addEventListener('focus', function() {
        console.log('🔄 Window focused - refreshing cart state...');
        loadCartProductIds().then(() => {
            Object.keys(productStates).forEach(category => {
                if (productStates[category].allProducts.length > 0) {
                    renderProductsWithLimit(category);
                }
            });
            updateCartBadgeImmediate(); // Use immediate update
        });
    });

    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('🔄 Page visible - refreshing cart state...');
            loadCartProductIds().then(() => {
                Object.keys(productStates).forEach(category => {
                    if (productStates[category].allProducts.length > 0) {
                        renderProductsWithLimit(category);
                    }
                });
                updateCartBadgeImmediate(); // Use immediate update
            });
        }
    });
});

// Expose functions globally (cart functions removed)
// window.updateCartQuantity = updateCartQuantity;
// window.removeFromCart = removeFromCart;
// window.updateCartButtonDisplay = updateCartButtonDisplay;

// Test function to manually trigger button transformation
window.testButtonTransformation = function(productId) {
    console.log('🧪 Testing button transformation for product:', productId);
    const button = document.querySelector(`[data-product-id="${productId}"].add-to-cart-btn`);
    if (button) {
        console.log('🧪 Found button, current state:', button.innerHTML);
        console.log('🧪 Calling updateCartButtonDisplay...');
        updateCartButtonDisplay(button, productId);
        } else {
        console.log('🧪 Button not found for product:', productId);
    }
};
window.debugCartState = function(productId) {
    console.log('🔍 Debug Cart State for product:', productId);
    console.log('🔍 Cart Product IDs:', Array.from(cartProductIds));
    console.log('🔍 Cart Quantities Cache:', cartQuantitiesCache);
    
    getCartQuantityForProduct(productId).then(quantity => {
        console.log('🔍 Product quantity from API:', quantity);
    });
    
    fetch('/api/cart/items')
        .then(response => response.json())
        .then(data => {
            console.log('🔍 Direct cart items API response:', data);
        });
};

// Test function to manually show quantity selector
window.testQuantitySelector = function(productId) {
    console.log('🧪 Testing quantity selector for product:', productId);
    const button = document.querySelector(`[data-product-id="${productId}"].add-to-cart-btn`);
    if (button) {
        console.log('🧪 Found button, updating display...');
        updateCartButtonDisplay(button, productId);
    } else {
        console.log('🧪 Button not found for product:', productId);
    }
};

// Force refresh all cart buttons
window.refreshAllCartButtons = function() {
    console.log('🔄 Refreshing all cart buttons...');
    const buttons = document.querySelectorAll('.add-to-cart-btn');
    buttons.forEach(button => {
        const productId = button.getAttribute('data-product-id');
        if (productId) {
            updateCartButtonDisplay(button, productId);
        }
    });
};

// AJAX function to refresh all quantity displays
window.refreshAllQuantityDisplays = function() {
    console.log('🔄 AJAX: Refreshing all homepage quantity displays...');
    
    // Direct AJAX call to get cart data
    fetch('/api/cart/items')
        .then(response => response.json())
        .then(data => {
            console.log('🔄 AJAX: Homepage cart API response:', data);
            
            if (data.success && data.cart_items) {
                // Create a map of product_id -> quantity
                const cartQuantities = {};
                data.cart_items.forEach(item => {
                    cartQuantities[item.id] = item.quantity;
                });
                console.log('🔄 AJAX: Homepage cart quantities map:', cartQuantities);
                
                // Update all homepage quantity selectors
                const quantitySelectors = document.querySelectorAll('.quantity-selector-container');
                console.log('🔄 AJAX: Found homepage quantity selectors:', quantitySelectors.length);
                
                quantitySelectors.forEach(selector => {
                    const quantityBtn = selector.querySelector('.quantity-btn');
                    if (quantityBtn) {
                        const productId = parseInt(quantityBtn.getAttribute('data-product-id'));
                        const quantity = cartQuantities[productId] || 0;
                        
                        console.log(`🔄 AJAX: Homepage product ${productId} quantity: ${quantity}`);
                        
                        // Update quantity display
                        const quantityDisplay = selector.querySelector('.quantity-display');
                        if (quantityDisplay) {
                            quantityDisplay.textContent = quantity;
                            console.log(`🔄 AJAX: Updated homepage quantity display for product ${productId} to ${quantity}`);
                        }
                        
                        // Update cart button if quantity > 0
                        if (quantity > 0) {
                            const cartButton = selector.closest('.d-flex').querySelector('.add-to-cart-btn');
                            if (cartButton) {
                                cartButton.innerHTML = `
                                    <i class="bi bi-cart-check"></i>
                                    <span class="ms-1">(${quantity})</span>
                                `;
                                cartButton.title = `${quantity} in cart - Click to add more`;
                                console.log(`🔄 AJAX: Updated homepage cart button for product ${productId} to show quantity ${quantity}`);
                            }
                        }
                    }
                });
            } else {
                console.log('🔄 AJAX: No homepage cart items found');
            }
        })
        .catch(error => {
            console.error('🔄 AJAX: Error fetching homepage cart data:', error);
        });
};

// Auto-refresh quantity displays when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for all products to load, then refresh quantity displays
    setTimeout(() => {
        refreshAllQuantityDisplays();
    }, 1000);

    // Test cart API to see if it's working
    setTimeout(() => {
        console.log('🧪 Testing homepage cart API...');
        fetch('/api/cart/items')
            .then(response => response.json())
            .then(data => {
                console.log('🧪 Homepage cart API response:', data);
                if (data.success && data.cart_items) {
                    console.log('🧪 Homepage cart items found:', data.cart_items.length);
                    data.cart_items.forEach(item => {
                        console.log('🧪 Homepage cart item:', item);
                    });
                } else {
                    console.log('🧪 No homepage cart items or API error');
                }
            })
            .catch(error => {
                console.error('🧪 Homepage cart API error:', error);
            });
    }, 2000);
});
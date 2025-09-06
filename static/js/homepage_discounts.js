// Homepage Discount Products JavaScript
console.log('🚀 HOMEPAGE_DISCOUNTS.JS LOADED - VERSION 2.5 - NO GLOBAL CONFLICTS');
let discountCurrentPage = 1;
let discountTotalPages = 1;
let discountIsLoading = false;

// Global variables (shared with homepage_products_v2.js)
// cartProductIds is declared in homepage_products_v2.js

// Cache for cart quantities to avoid multiple API calls (discounts-specific)
let discountCartQuantitiesCache = null;
let discountCartQuantitiesPromise = null;

// Function to get all cart quantities (optimized - single API call)
async function getAllCartQuantities() {
    // Return cached data if available
    if (discountCartQuantitiesCache) {
        return discountCartQuantitiesCache;
    }
    
    // Return existing promise if one is in progress
    if (discountCartQuantitiesPromise) {
        return discountCartQuantitiesPromise;
    }
    
    // Create new promise for cart data
    discountCartQuantitiesPromise = fetch('/api/cart/items')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.cart_items) {
                // Create a map of product_id -> quantity
                const quantities = {};
                data.cart_items.forEach(item => {
                    quantities[item.product_id] = item.quantity;
                });
                discountCartQuantitiesCache = quantities;
                return quantities;
            }
            discountCartQuantitiesCache = {};
            return {};
        })
        .catch(error => {
            console.error('Error getting cart quantities:', error);
            discountCartQuantitiesCache = {};
            return {};
        });
    
    return discountCartQuantitiesPromise;
}

// Function to get cart quantity for a specific product (optimized)
function getCartQuantityForProduct(productId) {
    return getAllCartQuantities().then(quantities => {
        return quantities[productId] || 0;
    });
}

// Function to invalidate cart cache (call after adding/removing items)
function invalidateCartCache() {
    discountCartQuantitiesCache = null;
    discountCartQuantitiesPromise = null;
}

// Function to update cart button display with current quantity
function updateCartButtonDisplay(buttonElement, productId) {
    getCartQuantityForProduct(productId).then(quantity => {
        if (quantity > 0) {
            // Show quantity in cart
            buttonElement.innerHTML = `
                <i class="bi bi-cart-check"></i>
                <span class="ms-1">(${quantity})</span>
            `;
            buttonElement.title = `${quantity} in cart - Click to add more`;
        } else {
            // Show add to cart
            buttonElement.innerHTML = `
                <i class="bi bi-cart-plus"></i>
            `;
            buttonElement.title = 'Add to cart';
        }
    });
}

// Function to update cart button state based on quantity
function updateCartButtonState(cartButton, quantity) {
    // Always keep the button green and clickable like homepage
    cartButton.disabled = false;
    cartButton.style.backgroundColor = '#28a745';
    cartButton.style.color = '#fff';
    cartButton.style.border = 'none';
    cartButton.style.opacity = '1';
    cartButton.style.cursor = 'pointer';
    
    if (quantity <= 0) {
        cartButton.title = 'Add to cart';
    } else {
        cartButton.title = `Add ${quantity} item(s) to cart`;
    }
}

// Cart badge update function
function updateCartBadgeImmediate() {
    console.log('🛒 Updating cart badge immediately');
    const cartBadge = document.getElementById('cart-badge');
    if (!cartBadge) {
        console.log('❌ Cart badge element not found!');
        return;
    }

    // Use cartProductIds to show unique products count
    const uniqueProducts = cartProductIds ? cartProductIds.size : 0;
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

// Function to add item to cart
async function addToCart(productId, buttonElement) {
    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1
            })
        });

        const data = await response.json();

        if (data.success) {
            // Invalidate cart cache so fresh data is fetched
            invalidateCartCache();
            
            // Update the cart button to show new quantity immediately
            updateCartButtonDisplay(buttonElement, productId);
            
            showNotification('Item added to cart successfully!', 'success', false);
        } else {
            showNotification('Error: ' + data.error, 'error', false);
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('An error occurred while adding to cart.', 'error', false);
    }
}

// Function to update cart quantity via AJAX
async function updateCartQuantityAJAX(productId, quantity, buttonElement) {
    console.log(`🛒 AJAX: Updating cart quantity for product ${productId} to ${quantity}`);
    
    try {
        let response;
        let data;
        
        if (quantity <= 0) {
            // Use remove endpoint when quantity is 0 or less
            console.log(`🛒 AJAX: Removing product ${productId} from cart (quantity: ${quantity})`);
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
        console.log('🛒 AJAX: Update cart response:', data);

        if (data.success) {
            // Invalidate cart cache so fresh data is fetched
            invalidateCartCache();
            
            // Update cart state
            if (typeof cartProductIds !== 'undefined') {
                if (quantity > 0) {
                    cartProductIds.add(productId);
                } else {
                    cartProductIds.delete(productId);
                }
                localStorage.setItem('cartProductIds', JSON.stringify(Array.from(cartProductIds)));
            }
            
            // Update cart badge immediately - this is crucial for cart page sync
            if (typeof updateCartBadgeImmediate === 'function') {
                updateCartBadgeImmediate();
            }
            
            // Update cart badge immediately - show unique products count
            const cartBadge = document.getElementById('cart-badge');
            if (cartBadge) {
                const uniqueProducts = cartProductIds ? cartProductIds.size : 0;
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
            
            // If quantity is 0, also remove from cartProductIds to ensure clean state
            if (quantity <= 0 && cartProductIds && cartProductIds.has(productId)) {
                cartProductIds.delete(productId);
                localStorage.setItem('cartProductIds', JSON.stringify(Array.from(cartProductIds)));
                console.log(`🛒 Removed product ${productId} from cartProductIds (quantity: ${quantity})`);
            }
            
            console.log(`🛒 AJAX: Successfully updated cart quantity for product ${productId} to ${quantity}`);
            
            // Don't refresh immediately - the display is already correct
            // Only refresh if there's a mismatch
            
        } else {
            console.error('🛒 AJAX: Failed to update cart quantity:', data.error);
            showNotification('Error updating cart: ' + data.error, 'error', false);
        }
    } catch (error) {
        console.error('🛒 AJAX: Network error updating cart quantity:', error);
        showNotification('Network error updating cart', 'error', false);
    }
}

// Function to add item to cart with quantity (AJAX style)
async function addToCartWithQuantityAJAX(productId, quantity, buttonElement) {
    console.log(`🛒 AJAX: Adding ${quantity} items to cart for product ${productId}`);
    if (!buttonElement) { 
        console.error('❌ Button element not found for product', productId);
        return false; 
    }
    
    try {
        const response = await fetch('/api/cart/add', {
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

        const data = await response.json();
        console.log('🛒 AJAX Add to cart response:', data);

        if (data.success) {
            // Invalidate cart cache so fresh data is fetched
            invalidateCartCache();
            
            // Update cart state
            if (typeof cartProductIds !== 'undefined') {
                cartProductIds.add(productId);
                localStorage.setItem('cartProductIds', JSON.stringify(Array.from(cartProductIds)));
            }
            
            // Update cart badge immediately - show unique products count
            const cartBadge = document.getElementById('cart-badge');
            if (cartBadge) {
                const uniqueProducts = cartProductIds ? cartProductIds.size : 0;
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
            
            // Success state
            buttonElement.innerHTML = '<i class="bi bi-check-circle"></i>';
            buttonElement.style.backgroundColor = '#28a745';
            buttonElement.style.color = 'white';
            buttonElement.style.transform = 'scale(1.1)';
            buttonElement.style.transition = 'all 0.3s ease';
            
            // Update quantity display with cart quantity
            setTimeout(() => {
                getCartQuantityForProduct(productId).then(cartQuantity => {
                    const quantityDisplay = document.querySelector(`[data-product-id="${productId}"]`).closest('.quantity-selector-container')?.querySelector('.quantity-display');
                    if (quantityDisplay) {
                        quantityDisplay.textContent = cartQuantity;
                        quantityDisplay.style.backgroundColor = '#e3f2fd'; // Subtle blue highlight
                        quantityDisplay.style.borderColor = '#2196f3';
                        quantityDisplay.style.color = '#1976d2';
                        console.log(`🔍 AJAX: Updated quantity display to cart quantity: ${cartQuantity}`);
                    }
                });
            }, 100);
            
            showNotification(`${quantity} item(s) added to cart successfully!`, 'success', false);
            
            // Reset button after animation
            setTimeout(() => {
                buttonElement.style.transform = 'scale(1)';
                buttonElement.style.opacity = '1';
                updateCartButtonDisplay(buttonElement, productId);
                
                // Reset quantity display highlight
                const quantityDisplay = document.querySelector(`[data-product-id="${productId}"]`).closest('.quantity-selector-container')?.querySelector('.quantity-display');
                if (quantityDisplay) {
                    quantityDisplay.style.backgroundColor = '#ffffff';
                    quantityDisplay.style.borderColor = '#dee2e6';
                    quantityDisplay.style.color = '#495057';
                }
            }, 1000);
        } else {
            // Error state
            buttonElement.innerHTML = '<i class="bi bi-x-circle"></i>';
            buttonElement.style.backgroundColor = '#dc3545';
            buttonElement.style.color = 'white';
            buttonElement.style.transform = 'scale(1.1)';
            buttonElement.style.transition = 'all 0.3s ease';
            
            showNotification('Error: ' + data.error, 'error', false);
            
            // Reset button after animation
            setTimeout(() => {
                buttonElement.style.transform = 'scale(1)';
                buttonElement.style.opacity = '1';
                updateCartButtonDisplay(buttonElement, productId);
            }, 1000);
        }
    } catch (error) {
        console.error('🛒 AJAX Network error:', error);
        
        // Network error state
        buttonElement.innerHTML = '<i class="bi bi-wifi-off"></i>';
        buttonElement.style.backgroundColor = '#6c757d';
        buttonElement.style.color = 'white';
        buttonElement.style.transform = 'scale(1.1)';
        buttonElement.style.transition = 'all 0.3s ease';
        
        showNotification('Network error. Please check your connection.', 'error', false);
        
        // Reset button after animation
        setTimeout(() => {
            buttonElement.style.transform = 'scale(1)';
            buttonElement.style.opacity = '1';
            updateCartButtonDisplay(buttonElement, productId);
        }, 1000);
    } finally {
        buttonElement.disabled = false;
    }
}

// Helper function to generate slug from product name
function generateSlug(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9 -]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim('-'); // Remove leading/trailing hyphens
}

// Load discount products when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait for cart state to be loaded by homepage_products_v2.js before loading discount products
    if (typeof cartProductIds !== 'undefined') {
        loadDiscountProducts();
    } else {
        // Fallback: wait a bit for cart state to load
        setTimeout(() => {
            loadDiscountProducts();
        }, 100);
    }
    
    // Auto-refresh quantity displays when page loads
    setTimeout(() => {
        refreshDiscountQuantityDisplays();
    }, 1500);

    // Test cart API to see if it's working
    setTimeout(() => {
        console.log('🧪 Testing discount cart API...');
        fetch('/api/cart/items')
            .then(response => response.json())
            .then(data => {
                console.log('🧪 Discount cart API response:', data);
                if (data.success && data.cart_items) {
                    console.log('🧪 Discount cart items found:', data.cart_items.length);
                    data.cart_items.forEach(item => {
                        console.log('🧪 Discount cart item:', item);
                    });
                } else {
                    console.log('🧪 No discount cart items or API error');
                }
            })
            .catch(error => {
                console.error('🧪 Discount cart API error:', error);
            });
    }, 2500);
});

// AJAX function to refresh all discount quantity displays
function refreshDiscountQuantityDisplays() {
    console.log('🔄 AJAX: Refreshing discount quantity displays...');
    
    // Direct AJAX call to get cart data
    fetch('/api/cart/items')
        .then(response => response.json())
        .then(data => {
            console.log('🔄 AJAX: Discount cart API response:', data);
            
            if (data.success && data.cart_items) {
                // Create a map of product_id -> quantity
                const cartQuantities = {};
                data.cart_items.forEach(item => {
                    cartQuantities[item.id] = item.quantity;
                });
                console.log('🔄 AJAX: Discount cart quantities map:', cartQuantities);
                
                // Update all discount quantity selectors
                const quantitySelectors = document.querySelectorAll('#discount-products-container .quantity-selector-container');
                console.log('🔄 AJAX: Found discount quantity selectors:', quantitySelectors.length);
                
                quantitySelectors.forEach(selector => {
                    const quantityBtn = selector.querySelector('.quantity-btn');
                    if (quantityBtn) {
                        const productId = parseInt(quantityBtn.getAttribute('data-product-id'));
                        const quantity = cartQuantities[productId] || 0;
                        
                        console.log(`🔄 AJAX: Discount product ${productId} quantity: ${quantity}`);
                        
                        // Update quantity display
                        const quantityDisplay = selector.querySelector('.quantity-display');
                        if (quantityDisplay) {
                            quantityDisplay.textContent = quantity;
                            console.log(`🔄 AJAX: Updated discount quantity display for product ${productId} to ${quantity}`);
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
                                console.log(`🔄 AJAX: Updated discount cart button for product ${productId} to show quantity ${quantity}`);
                            }
                        }
                    }
                });
            } else {
                console.log('🔄 AJAX: No discount cart items found');
            }
        })
        .catch(error => {
            console.error('🔄 AJAX: Error fetching discount cart data:', error);
        });
}

// Optimized function to update discount section cart button states
function updateDiscountCartButtonStates() {
    if (typeof cartProductIds === 'undefined') return;

    const discountButtons = document.querySelectorAll('#discount-products-container .add-to-cart-btn');
    discountButtons.forEach(button => {
        const productId = parseInt(button.getAttribute('data-product-id'));

        // Skip pre-order buttons and unavailable buttons
        if (button.classList.contains('preorder-btn') ||
            (button.disabled && button.innerHTML.includes('Unavailable'))) {
            return;
        }

        // Use optimized state functions like other sections
        if (cartProductIds.has(productId)) {
            // Only update if not already in "Added" state
            if (!button.innerHTML.includes('bi-check-circle')) {
                if (typeof showAddedState === 'function') {
                    showAddedState(button);
                } else {
                    // Fallback if function not available
                    button.style.backgroundColor = '#28a745';
                    button.innerHTML = `<i class="bi bi-check-circle"></i>`;
                    button.disabled = false;
                }
            }
        } else {
            // Only update if not already in "Add to Cart" state
            if (!button.innerHTML.includes('bi-cart-plus')) {
                if (typeof showDefaultState === 'function') {
                    showDefaultState(button);
                } else {
                    // Fallback if function not available
                    button.style.backgroundColor = '#28a745';
                    button.style.color = '#fff';
                    button.style.border = 'none';
                    button.innerHTML = `<i class="bi bi-cart-plus"></i>`;
                    button.disabled = false;
                }
            }
        }
    });
}

// Make the functions globally available
window.updateDiscountCartButtonStates = updateDiscountCartButtonStates;
// Note: addToCartWithQuantityAJAX is not exposed globally to avoid conflicts with homepage_products_v2.js

async function loadDiscountProducts() {
    console.log('🔄 loadDiscountProducts() called');
    if (discountIsLoading) {
        console.log('⏳ Already loading, skipping...');
        return;
    }

    discountIsLoading = true;
    const container = document.getElementById('discount-products-container');
    const viewMoreContainer = document.getElementById('discount-view-more-container');
    
    console.log('📦 Container found:', !!container);
    console.log('📦 ViewMore container found:', !!viewMoreContainer);

    try {
        // Show loading message
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Loading discount products...</p>';

        const response = await fetch(`/api/products/discounted?limit=12`); // Get more products for View More
        const data = await response.json();

        if (data.success && data.products && data.products.length > 0) {
            console.log('✅ Found discounted products:', data.products.length);
            console.log('✅ Sample product data:', data.products[0]);
            // Store all products
            allDiscountProducts = data.products;

            // Clear container
            container.innerHTML = '';

            // Show only first 4 products initially
            const initialProducts = data.products.slice(0, 4);
            initialProducts.forEach(product => {
                const productCard = createDiscountProductCard(product);
                container.appendChild(productCard);
            });

            // Apply styling fixes like other product sections
            requestAnimationFrame(() => {
                container.offsetHeight;

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

                setTimeout(() => {
                    container.offsetHeight;
                }, 50);
            });

            // Show view more button if there are more than 4 products
            if (allDiscountProducts.length > 4) {
                viewMoreContainer.style.display = 'block';
                const viewMoreBtn = document.getElementById('discount-view-more-btn');
                viewMoreBtn.textContent = 'View More Deals';
                isExpanded = false;
            } else {
                viewMoreContainer.style.display = 'none';
            }

            // Refresh quantity displays after discount products are loaded
            setTimeout(() => {
                refreshDiscountQuantityDisplays();
            }, 500);
        } else {
            console.log('❌ No discounted products found');
            console.log('❌ API Response:', data);
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No discount products available at the moment.</p>';
            viewMoreContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading discount products:', error);
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #dc3545;">Unable to load discount products. Please try again later.</p>';
        viewMoreContainer.style.display = 'none';
    } finally {
        discountIsLoading = false;
    }
}

function createDiscountProductCard(product) {
    const colDiv = document.createElement('div');
    colDiv.className = 'col-lg-3 col-md-6';

    const cardDiv = document.createElement('div');
    cardDiv.className = 'product-card card h-100';
    cardDiv.style.position = 'relative'; // Ensure discount badge positioning works

    // Add discount badge if product has discount
    // Use pre_discount_price for display (the price before discount was applied)
    const originalPrice = parseFloat(product.pre_discount_price || product.original_price || product.price);
    const discountPrice = parseFloat(product.price);
    // Use the stored discount_percentage from database instead of calculating
    const discountPercent = product.discount_percentage ? parseFloat(product.discount_percentage) : 0;

    if (discountPercent > 0) {
        cardDiv.classList.add('discount-card');
        const discountBadge = document.createElement('div');
        discountBadge.className = 'discount-badge';
        discountBadge.textContent = `${discountPercent}% OFF`;
        cardDiv.appendChild(discountBadge);
    }

    const link = document.createElement('a');
    link.href = `/products/${generateSlug(product.name)}`;

    const img = document.createElement('img');
    img.className = 'card-img-top p-3';
    img.alt = product.name;
    img.src = product.photo ? `/static/uploads/products/${product.photo}` : (product.image_url || 'https://placehold.co/300x200?text=Product');
    img.style.objectFit = 'contain';

    link.appendChild(img);
    cardDiv.appendChild(link);

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'd-flex justify-content-between';

    const title = document.createElement('h5');
    title.className = 'card-title';
    title.style.display = '-webkit-box';
    title.style.webkitLineClamp = '1';
    title.style.webkitBoxOrient = 'vertical';
    title.style.overflow = 'hidden';
    title.style.textOverflow = 'ellipsis';
    title.textContent = product.name;

    titleDiv.appendChild(title);
    cardBody.appendChild(titleDiv);

    const priceDiv = document.createElement('div');
    priceDiv.className = 'd-flex justify-content-between align-items-center';

    // Display discount pricing
    if (discountPercent > 0) {
        const priceContainer = document.createElement('div');
        priceContainer.className = 'price-container';
        priceContainer.innerHTML = `
            <span class="original-price text-muted text-decoration-line-through">$${parseFloat(originalPrice).toFixed(2)}</span>
            <span class="sale-price h5 text-primary">$${parseFloat(discountPrice).toFixed(2)}</span>
            <div class="savings-text text-success small">You Save: $${parseFloat(originalPrice - discountPrice).toFixed(2)}</div>
        `;
        priceDiv.appendChild(priceContainer);
    } else {
        const priceSpan = document.createElement('span');
        priceSpan.className = 'price h5 text-primary';
        priceSpan.textContent = `$${parseFloat(product.price).toFixed(2)}`;
        priceDiv.appendChild(priceSpan);
    }

    cardBody.appendChild(priceDiv);

    const descDiv = document.createElement('div');
    const descP = document.createElement('p');
    descP.className = 'card-text text-muted';
    const description = product.description || 'No description available';
    descP.textContent = description.length > 250 ? description.substring(0, 250) + '...' : description;

    descDiv.appendChild(descP);
    cardBody.appendChild(descDiv);

    // Add action buttons
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

    // Quantity selector (always present)
    const quantitySelector = document.createElement('div');
    quantitySelector.className = 'quantity-selector-container d-flex align-items-center';
    quantitySelector.style.gap = '4px';
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

    // Get stock value for cart button logic
    const stock = product.stock || product.stock_quantity || 0;
    const isOutOfStock = stock <= 0;

    if (isOutOfStock) {
        const allowPreorder = product.allow_preorder !== false;
        if (allowPreorder) {
            cartButton.classList.add('preorder-btn');
            cartButton.disabled = false;
            cartButton.style.backgroundColor = '#ffc107';
            cartButton.style.color = '#000';
            cartButton.style.border = 'none';
            cartButton.title = 'Pre-Order this product';
            cartButton.innerHTML = `<i class="bi bi-clock"></i>`;

            // Add click event for stateful pre-order functionality
            cartButton.addEventListener('click', function(e) {
                e.preventDefault();
                console.log(`🔄 Pre-order button click event triggered for product ${product.id}`);
                // Add immediate visual feedback
                addClickFeedback(cartButton);

                // Use state manager for handling click
                if (window.preorderStateManager) {
                    console.log(`🔄 Calling preorderStateManager.handlePreorderButtonClick for product ${product.id}`);
                    window.preorderStateManager.handlePreorderButtonClick(cartButton, product.id, product);
                } else {
                    console.log(`🔄 No preorderStateManager, using fallback modal for product ${product.id}`);
                    // Fallback to original modal
                    openHomepagePreOrderModal(product);
                }
            });
        } else {
            cartButton.style.backgroundColor = '#6c757d';
            cartButton.style.color = '#fff';
            cartButton.style.border = 'none';
            cartButton.disabled = true;
            cartButton.innerHTML = `<i class="bi bi-x-circle"></i> Unavailable`;
        }
    } else {
        // Always show clickable cart button for in-stock items
        // In stock styling
        cartButton.style.backgroundColor = '#28a745'; // Green background for cart
        cartButton.style.color = '#fff'; // White text/icon
        cartButton.style.border = 'none'; // Remove border for solid button

        // Get cart quantity and update button display AND quantity selector
        getCartQuantityForProduct(product.id).then(quantity => {
            if (quantity > 0) {
                // Show quantity in cart
                cartButton.innerHTML = `
                    <i class="bi bi-cart-check"></i>
                    <span class="ms-1">(${quantity})</span>
                `;
                cartButton.title = `${quantity} in cart - Click to add more`;
                
                // Update quantity selector to show cart quantity
                const quantityDisplay = quantitySelector.querySelector('.quantity-display');
                if (quantityDisplay) {
                    quantityDisplay.textContent = quantity;
                    console.log(`🔍 Updated quantity display to cart quantity: ${quantity}`);
                }
            } else {
                // Show add to cart
                cartButton.innerHTML = `
                    <i class="bi bi-cart-plus"></i>
                `;
                cartButton.title = 'Add to cart';
                
                // Keep quantity selector at 0
                const quantityDisplay = quantitySelector.querySelector('.quantity-display');
                if (quantityDisplay) {
                    quantityDisplay.textContent = '0';
                }
            }
        });

        // Add click event listener for add to cart functionality
        cartButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Always use quantity selector logic for consistency
            const quantityDisplay = quantitySelector.querySelector('.quantity-display');
            const currentQuantity = quantityDisplay ? parseInt(quantityDisplay.textContent) || 0 : 0;
            
            // If quantity is 0, add 1 item (first time adding)
            if (currentQuantity <= 0) {
                console.log(`🛒 First time adding product ${product.id} to cart - adding 1 item`);
                
                // Add AJAX loading state
                cartButton.disabled = true;
                cartButton.innerHTML = '<i class="bi bi-hourglass-split"></i>';
                cartButton.style.opacity = '0.7';
                
                // Add 1 item to cart with AJAX
                addToCartWithQuantityAJAX(product.id, 1, cartButton);
            } else {
                // Product already has quantity selected - add that quantity
                console.log(`🛒 Adding ${currentQuantity} items to cart for product ${product.id}`);
                
                // Add AJAX loading state
                cartButton.disabled = true;
                cartButton.innerHTML = '<i class="bi bi-hourglass-split"></i>';
                cartButton.style.opacity = '0.7';
                
                // Add the current quantity to cart with AJAX
                addToCartWithQuantityAJAX(product.id, currentQuantity, cartButton);
            }
        });
    }

    buttonDiv.appendChild(viewButton);
    buttonDiv.appendChild(cartButton);
    buttonDiv.appendChild(quantitySelector);
    cardBody.appendChild(buttonDiv);
    
    // Set initial cart button state - keep green and clickable like homepage
    cartButton.style.backgroundColor = '#28a745';
    cartButton.style.color = '#fff';
    cartButton.style.border = 'none';
    cartButton.disabled = false;
    cartButton.style.opacity = '1';
    cartButton.style.cursor = 'pointer';

    cardDiv.appendChild(cardBody);
    colDiv.appendChild(cardDiv);

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
                
                // Update cart button state based on quantity
                updateCartButtonState(cartButton, newQuantity);
                
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

    return colDiv;
}

// View More/Less button functionality
let discountProductsLoaded = 4; // Track how many products are currently loaded
let allDiscountProducts = []; // Store all products
let isExpanded = false; // Track if showing all products

document.addEventListener('DOMContentLoaded', function() {
    const viewMoreBtn = document.getElementById('discount-view-more-btn');
    if (viewMoreBtn) {
        viewMoreBtn.addEventListener('click', function() {
            if (isExpanded) {
                showLessDiscountProducts();
            } else {
                loadMoreDiscountProducts();
            }
        });
    }
});

async function loadMoreDiscountProducts() {
    if (discountIsLoading) return;

    discountIsLoading = true;
    const container = document.getElementById('discount-products-container');
    const viewMoreBtn = document.getElementById('discount-view-more-btn');

    try {
        // Show loading state on button
        viewMoreBtn.textContent = 'Loading...';
        viewMoreBtn.disabled = true;

        // Clear container and show all products
        container.innerHTML = '';

        allDiscountProducts.forEach(product => {
            const productCard = createDiscountProductCard(product);
            container.appendChild(productCard);
        });

        // Apply styling fixes
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

        // Update button to "View Less"
        viewMoreBtn.textContent = 'View Less';
        viewMoreBtn.disabled = false;
        isExpanded = true;

        // Update cart button states after rendering
        setTimeout(() => {
            updateDiscountCartButtonStates();
            // Also refresh quantity displays after loading more products
            refreshDiscountQuantityDisplays();
        }, 100);

    } catch (error) {
        console.error('Error loading more discount products:', error);
        viewMoreBtn.textContent = 'Try Again';
        viewMoreBtn.disabled = false;
    } finally {
        discountIsLoading = false;
    }
}

function showLessDiscountProducts() {
    if (discountIsLoading) return;

    discountIsLoading = true;
    const container = document.getElementById('discount-products-container');
    const viewMoreBtn = document.getElementById('discount-view-more-btn');

    try {
        // Clear container and show only first 4 products
        container.innerHTML = '';

        const initialProducts = allDiscountProducts.slice(0, 4);
        initialProducts.forEach(product => {
            const productCard = createDiscountProductCard(product);
            container.appendChild(productCard);
        });

        // Apply styling fixes
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

        // Update button to "View More"
        viewMoreBtn.textContent = 'View More Deals';
        isExpanded = false;

        // Refresh quantity displays after showing less products
        setTimeout(() => {
            refreshDiscountQuantityDisplays();
        }, 100);

    } catch (error) {
        console.error('Error showing less discount products:', error);
    } finally {
        discountIsLoading = false;
    }
}

// Add hover effects
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
        }
    `;
    document.head.appendChild(style);
});
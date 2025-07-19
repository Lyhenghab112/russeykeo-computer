
function generateSlug(text) {
    if (!text) return "";

    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')  // Remove special characters except spaces and hyphens
        .replace(/[\s_]+/g, '-')   // Replace spaces and underscores with hyphens
        .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
}

// Discount calculation utilities
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

// Category IDs for laptops, desktops, accessories
const categories = {
    laptops: [1, 5],  // Laptop_Gaming and Laptop_Office
    desktops: [2],
    accessories: [3]
};

// State management for product categories display
let productStates = {
    laptops: {
        allProducts: [],
        isExpanded: false,
        limits: {
            lg: 12, // 3 rows × 4 products (large screens)
            md: 6,  // 3 rows × 2 products (medium screens)
            sm: 6   // 6 rows × 1 product (small screens)
        }
    },
    desktops: {
        allProducts: [],
        isExpanded: false,
        limits: {
            lg: 8,  // 2 rows × 4 products (large screens)
            md: 4,  // 2 rows × 2 products (medium screens)
            sm: 4   // 4 rows × 1 product (small screens)
        }
    },
    accessories: {
        allProducts: [],
        isExpanded: false,
        limits: {
            lg: 8,  // 2 rows × 4 products (large screens)
            md: 4,  // 2 rows × 2 products (medium screens)
            sm: 4   // 4 rows × 1 product (small screens)
        }
    }
};

// Track items that are in cart to maintain "Added" state
let cartProductIds = new Set();

// Helper function to get current screen size limit for any category
function getCurrentLimit(category) {
    const width = window.innerWidth;
    const state = productStates[category];
    if (!state) return 0;

    if (width >= 992) { // lg breakpoint
        return state.limits.lg;
    } else if (width >= 768) { // md breakpoint
        return state.limits.md;
    } else { // sm and below
        return state.limits.sm;
    }
}

// Function to update the View More button state for any category
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

// Enhanced function to render products with limit consideration for any category
function renderProductsWithLimit(category) {
    const currentLimit = getCurrentLimit(category);
    const state = productStates[category];
    const productsToShow = state.isExpanded
        ? state.allProducts
        : state.allProducts.slice(0, currentLimit);

    renderProducts(`${category}-products-container`, productsToShow);
    updateViewMoreButton(category);
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

function renderProducts(containerId, products) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ''; // Clear existing content

    products.forEach(product => {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-lg-3 col-md-6';

        const cardDiv = document.createElement('div');
        cardDiv.className = 'product-card card h-100';

        // Add discount badge if product has discount
        const discount = calculateDiscount(product);
        if (discount.hasDiscount) {
            cardDiv.classList.add('discount-card');
            const discountBadge = document.createElement('div');
            discountBadge.className = 'discount-badge';
            discountBadge.textContent = `${discount.percentage}% OFF`;
            cardDiv.appendChild(discountBadge);
        }

        const link = document.createElement('a');
        link.href = `/products/${generateSlug(product.name)}`;

        const img = document.createElement('img');
        img.className = 'card-img-top p-3';
        img.alt = product.name;
        img.src = product.photo ? `/static/uploads/products/${product.photo}` : 'https://placehold.co/300x200?text=Product';
        img.style.objectFit = 'contain'; // Ensure product images scale nicely

        link.appendChild(img);
        cardDiv.appendChild(link);

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'd-flex justify-content-between';

        const title = document.createElement('h5');
        title.className = 'card-title';
        title.textContent = product.name;

        titleDiv.appendChild(title);
        cardBody.appendChild(titleDiv);

        const priceDiv = document.createElement('div');
        priceDiv.className = 'd-flex justify-content-between align-items-center';

        // Display pricing based on whether product has discount
        const discountInfo = formatDiscountPrice(product);
        if (discountInfo.originalPriceHtml) {
            // Product has discount - show original price, sale price, and savings
            const priceContainer = document.createElement('div');
            priceContainer.className = 'price-container';
            priceContainer.innerHTML = `
                ${discountInfo.originalPriceHtml}
                ${discountInfo.salePriceHtml}
                ${discountInfo.savingsHtml}
            `;
            priceDiv.appendChild(priceContainer);
        } else {
            // Regular pricing
            const priceSpan = document.createElement('span');
            priceSpan.className = 'price h5 text-primary';
            priceSpan.textContent = `$${parseFloat(product.price).toFixed(2)}`;
            priceDiv.appendChild(priceSpan);
        }

        // Get stock value for cart button logic (no visual indicator)
        const stock = product.stock || product.stock_quantity || 0;

        cardBody.appendChild(priceDiv);

        const descDiv = document.createElement('div');
        const descP = document.createElement('p');
        descP.className = 'card-text text-muted';
        descP.textContent = product.description.length > 250 ? product.description.substring(0, 250) + '...' : product.description;

        descDiv.appendChild(descP);
        cardBody.appendChild(descDiv);

        // Add action buttons
        const buttonDiv = document.createElement('div');
        buttonDiv.className = 'd-flex gap-2 mt-3';

        const viewButton = document.createElement('button');
        viewButton.className = 'btn btn-primary view-product-btn flex-fill';
        viewButton.textContent = 'View Product';
        viewButton.setAttribute('data-product-name', product.name);

        const cartButton = document.createElement('button');
        cartButton.className = 'btn add-to-cart-btn flex-fill';
        cartButton.setAttribute('data-product-id', product.id);
        cartButton.style.display = 'inline-flex'; // Ensure button is visible
        cartButton.style.alignItems = 'center'; // Center content
        cartButton.style.justifyContent = 'center'; // Center content

        // Check stock status (using stock variable declared above)
        const isOutOfStock = stock <= 0;

        if (isOutOfStock) {
            // Check if pre-orders are allowed for this product
            const allowPreorder = product.allow_preorder !== false; // Default to true if not specified

            if (allowPreorder) {
                // Add pre-order class for identification
                cartButton.classList.add('preorder-btn');
                cartButton.disabled = false; // Enable button so it can be clicked for pre-order

                // Set initial state (will be updated by state manager)
                cartButton.style.backgroundColor = '#ffc107'; // Yellow background
                cartButton.style.color = '#000'; // Black text/icon for better contrast on yellow
                cartButton.style.border = 'none';
                cartButton.title = 'Pre-Order this product'; // Accessibility
                cartButton.innerHTML = `
                    <i class="bi bi-clock"></i>
                `;

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
                // Unavailable styling
                cartButton.style.backgroundColor = '#6c757d'; // Gray background
                cartButton.style.color = '#fff';
                cartButton.style.border = 'none';
                cartButton.disabled = true; // Disable button
                cartButton.innerHTML = `
                    <i class="bi bi-x-circle"></i> Unavailable
                `;
            }
        } else {
            // Check if this product is already in cart (but only for regular cart buttons, not pre-order buttons)
            if (cartProductIds.has(product.id) && !cartButton.classList.contains('preorder-btn')) {
                // Show "Already in Cart" state for items already in cart
                cartButton.style.backgroundColor = '#6c757d'; // Gray background
                cartButton.style.color = '#fff'; // White text
                cartButton.style.border = 'none';
                cartButton.innerHTML = `
                    <i class="bi bi-check-circle"></i>
                `;
                cartButton.disabled = true; // Disable button to prevent clicks
                cartButton.title = 'This item is already in your cart';
            } else {
                // In stock styling
                cartButton.style.backgroundColor = '#28a745'; // Green background for cart
                cartButton.style.color = '#fff'; // White text/icon
                cartButton.style.border = 'none'; // Remove border for solid button

                // Add Bootstrap cart icon
                cartButton.innerHTML = `
                    <i class="bi bi-cart-plus"></i>
                `;

                // Add click event listener for add to cart functionality
                cartButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    // Add immediate visual feedback
                    addClickFeedback(cartButton);
                    addToCart(product.id, cartButton);
                });
            }
        }

        buttonDiv.appendChild(viewButton);
        buttonDiv.appendChild(cartButton);
        cardBody.appendChild(buttonDiv);

        cardDiv.appendChild(cardBody);
        colDiv.appendChild(cardDiv);

        container.appendChild(colDiv);
    });

    // Force layout recalculation to fix button positioning issues
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

        // Smart pre-order state loading (efficient, cached)
        setTimeout(() => {
            if (typeof smartLoadPreorderStates === 'function') {
                console.log('🔄 Homepage: Loading pre-order states (smart mode)');
                smartLoadPreorderStates();
            }
        }, 100); // Small delay to ensure all buttons are rendered

        setTimeout(() => {
            container.offsetHeight;
        }, 50);
    });
}

async function loadCategoryProducts() {
    // Load laptops with state management
    let laptops = [];
    for (const catId of categories.laptops) {
        const prods = await fetchProductsByCategory(catId);
        laptops = laptops.concat(prods);
    }
    productStates.laptops.allProducts = laptops;
    productStates.laptops.isExpanded = false; // Start in collapsed state
    renderProductsWithLimit('laptops');

    // Load desktops with state management
    let desktops = [];
    for (const catId of categories.desktops) {
        const prods = await fetchProductsByCategory(catId);
        desktops = desktops.concat(prods);
    }
    productStates.desktops.allProducts = desktops;
    productStates.desktops.isExpanded = false; // Start in collapsed state
    renderProductsWithLimit('desktops');

    // Load accessories with state management
    let accessories = [];
    for (const catId of categories.accessories) {
        const prods = await fetchProductsByCategory(catId);
        accessories = accessories.concat(prods);
    }
    productStates.accessories.allProducts = accessories;
    productStates.accessories.isExpanded = false; // Start in collapsed state
    renderProductsWithLimit('accessories');
}

document.addEventListener('DOMContentLoaded', function() {
    // Load cart state from localStorage immediately for faster UI updates
    loadCartProductIdsFromStorage();

    // Load cart items first, then load products to ensure correct button states
    loadCartProductIds().then(() => {
        loadCategoryProducts();
    });

    // Refresh cart state when user returns to the page (e.g., from cart page)
    window.addEventListener('focus', function() {
        console.log('🔄 Window focused - refreshing cart state...');
        updateCartState();
    });

    // Also refresh when page becomes visible (for mobile/tab switching)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('🔄 Page visible - refreshing cart state...');
            updateCartState();
        }
    });

    // Refresh cart state when user navigates back to this page
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            console.log('🔄 Page restored from cache - refreshing cart state...');
            updateCartState();
        }
    });

    // Event listener for View More buttons (all categories)
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id.endsWith('-view-more-btn')) {
            e.preventDefault();

            // Extract category from button ID (e.g., 'laptops-view-more-btn' -> 'laptops')
            const category = e.target.id.replace('-view-more-btn', '');

            if (productStates[category]) {
                productStates[category].isExpanded = !productStates[category].isExpanded;
                renderProductsWithLimit(category);

                // Smooth scroll to top of section if expanding
                if (productStates[category].isExpanded) {
                    const section = document.querySelector(`#${category}-products-container`).closest('section');
                    if (section) {
                        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }
        }
    });

    // Handle window resize to update limits for all categories
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

    // Load cart items first, then load products to ensure correct button states
    loadCartProductIds().then(() => {
        loadCategoryProducts();
    });

    // Refresh cart state when user returns to the page (e.g., from cart page)
    window.addEventListener('focus', function() {
        console.log('🔄 Window focused - refreshing cart state...');
        updateCartState();
    });

    // Also refresh when page becomes visible (for mobile/tab switching)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('🔄 Page visible - refreshing cart state...');
            updateCartState();
        }
    });

    // Refresh cart state when user navigates back to this page
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            console.log('🔄 Page restored from cache - refreshing cart state...');
            updateCartState();
        }
    });
});

// Function to load current cart items and track product IDs
async function loadCartProductIds() {
    try {
        // Check if user is logged in first
        const userResponse = await fetch('/api/user/info');
        const userData = await userResponse.json();

        if (!userData.success || !userData.user) {
            // User not logged in, clear cart tracking and localStorage
            cartProductIds.clear();
            localStorage.removeItem('cartProductIds');
            return;
        }

        // Load cart items from server
        const response = await fetch('/api/cart/items?t=' + Date.now());
        const data = await response.json();

        if (data.success && data.cart_items) {
            // Clear existing cart tracking
            cartProductIds.clear();

            // Add all cart item product IDs to tracking set
            data.cart_items.forEach(item => {
                if (item.id) {
                    cartProductIds.add(item.id);
                }
            });

            // Save to localStorage for persistence across page reloads
            localStorage.setItem('cartProductIds', JSON.stringify(Array.from(cartProductIds)));

            console.log('🛒 Loaded cart product IDs:', Array.from(cartProductIds));
        }
    } catch (error) {
        console.error('Error loading cart product IDs:', error);
        // Fallback to localStorage if server request fails
        loadCartProductIdsFromStorage();
    }
}

// Function to load cart product IDs from localStorage as fallback
function loadCartProductIdsFromStorage() {
    try {
        const stored = localStorage.getItem('cartProductIds');
        if (stored) {
            const productIds = JSON.parse(stored);
            cartProductIds.clear();
            productIds.forEach(id => cartProductIds.add(id));
            console.log('🛒 Loaded cart product IDs from localStorage:', Array.from(cartProductIds));
        }
    } catch (error) {
        console.error('Error loading cart product IDs from localStorage:', error);
    }
}

// Function to refresh all cart button states based on current cart
function refreshCartButtonStates() {
    // Re-render all product categories to update button states
    Object.keys(productStates).forEach(category => {
        if (productStates[category].allProducts.length > 0) {
            renderProductsWithLimit(category);
        }
    });
}

// Function to be called when cart is updated from other pages
async function updateCartState() {
    await loadCartProductIds();
    refreshCartButtonStates();

    // Also update discount products if they exist
    if (typeof window.updateDiscountCartButtonStates === 'function') {
        window.updateDiscountCartButtonStates();
    }
}

// Expose function globally so it can be called from other scripts
window.updateHomepageCartState = updateCartState;

// Add to cart functionality
async function addToCart(productId, buttonElement) {
    try {
        // Check if user is logged in first
        const userResponse = await fetch('/api/user/info');
        const userData = await userResponse.json();

        if (!userData.success || !userData.user) {
            // User not logged in, redirect to login
            alert('Please log in to add items to your cart.');
            window.location.href = '/auth/login';
            return;
        }

        // Remove immediate notification to avoid duplicate notifications

        // Disable button to prevent double clicks
        buttonElement.disabled = true;
        const originalContent = buttonElement.innerHTML;
        buttonElement.innerHTML = '<span>Adding...</span>';

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
            // Add product to cart tracking set
            cartProductIds.add(productId);

            // Save updated cart state to localStorage
            localStorage.setItem('cartProductIds', JSON.stringify(Array.from(cartProductIds)));

            // Change button to show "Added" with check icon
            buttonElement = showAddedState(buttonElement);

            // Show success message without cart link
            showNotification('Item added to cart successfully!', 'success', false);

            // Don't reset button - keep "Added" state persistent
        } else {
            // Show error message
            if (data.error.includes('out of stock')) {
                showNotification(data.error, 'error');
                // Change button to out of stock state
                buttonElement.style.backgroundColor = '#6c757d';
                buttonElement.innerHTML = 'Out of Stock';
                buttonElement.disabled = true;
            } else {
                showNotification(data.error || 'Failed to add item to cart', 'error');
                buttonElement.innerHTML = originalContent;
                buttonElement.disabled = false;
            }
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('An error occurred while adding item to cart', 'error');
        buttonElement.disabled = false;
    }
}

// removeFromCart function removed - toggle functionality disabled
// Items can only be removed from the cart page itself

function showAddedState(buttonElement) {
    // SAFETY CHECK: Don't modify pre-order buttons
    if (buttonElement.classList.contains('preorder-btn')) {
        console.log('🚫 showAddedState: Skipping pre-order button, keeping original state');
        return;
    }

    // Show "Already in Cart" state - disabled and visually distinct
    buttonElement.style.backgroundColor = '#6c757d'; // Gray background
    buttonElement.style.color = '#fff'; // White text
    buttonElement.style.border = 'none';
    buttonElement.innerHTML = `
        <i class="bi bi-check-circle"></i>
    `;
    buttonElement.disabled = true; // Disable button to prevent clicks
    buttonElement.title = 'This item is already in your cart';

    // Remove any existing click event listeners by cloning the element (only if parent exists)
    if (buttonElement.parentNode) {
        const newButton = buttonElement.cloneNode(true);
        buttonElement.parentNode.replaceChild(newButton, buttonElement);
        return newButton; // Return the new button so caller can update their reference
    }

    return buttonElement;
}

function showAddToCartState(buttonElement) {
    // SAFETY CHECK: Don't modify pre-order buttons
    if (buttonElement.classList.contains('preorder-btn')) {
        console.log('🚫 showAddToCartState: Skipping pre-order button, keeping original state');
        return;
    }

    buttonElement.style.backgroundColor = '#28a745'; // Green background for cart
    buttonElement.style.color = '#fff'; // White text/icon
    buttonElement.style.border = 'none'; // Remove border for solid button
    buttonElement.disabled = false;

    // Add Bootstrap cart icon
    buttonElement.innerHTML = `
        <i class="bi bi-cart-plus"></i>
    `;

    // Remove any existing click event listeners by cloning the element (only if parent exists)
    if (buttonElement.parentNode) {
        const newButton = buttonElement.cloneNode(true);
        buttonElement.parentNode.replaceChild(newButton, buttonElement);

        // Add click event listener for add functionality
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            // Add immediate visual feedback
            addClickFeedback(newButton);
            const productId = parseInt(newButton.getAttribute('data-product-id'));
            addToCart(productId, newButton);
        });

        return newButton; // Return the new button so caller can update their reference
    }

    return buttonElement;
}

function resetCartButton(buttonElement, originalContent) {
    buttonElement.innerHTML = originalContent;
    buttonElement.disabled = false;
}

function showNotification(message, type = 'info', showCartButton = false) {
    // Remove any existing notifications of the same type to prevent stacking
    const existingNotifications = document.querySelectorAll('.cart-notification');
    existingNotifications.forEach(notif => {
        if (notif.dataset.type === type) {
            notif.remove();
        }
    });

    // Create notification element
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

    // Set background color based on type
    if (type === 'success') {
        notification.style.backgroundColor = '#28a745';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#dc3545';
    } else {
        notification.style.backgroundColor = '#007bff';
    }

    // Create content container
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '10px';

    // Add message
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    content.appendChild(messageDiv);

    // Add cart button if requested
    if (showCartButton && type === 'success') {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '8px';

        const viewCartBtn = document.createElement('button');
        viewCartBtn.textContent = 'View Cart';
        viewCartBtn.style.cssText = `
            background: white;
            color: #28a745;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
        `;
        viewCartBtn.onclick = () => {
            window.location.href = '/cart';
        };

        const dismissBtn = document.createElement('button');
        dismissBtn.textContent = 'Dismiss';
        dismissBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid white;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        dismissBtn.onclick = () => {
            removeNotification();
        };

        buttonContainer.appendChild(viewCartBtn);
        buttonContainer.appendChild(dismissBtn);
        content.appendChild(buttonContainer);
    }

    notification.appendChild(content);
    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    });

    function removeNotification() {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // Auto remove after appropriate time
    let autoRemoveTime;
    if (type === 'info') {
        autoRemoveTime = 2000; // Quick for "Adding..." messages
    } else if (showCartButton) {
        autoRemoveTime = 5000; // Longer for success with buttons
    } else {
        autoRemoveTime = 3000; // Standard for other messages
    }

    setTimeout(removeNotification, autoRemoveTime);
}

// Add immediate visual feedback when button is clicked
function addClickFeedback(buttonElement) {
    // Store original transform
    const originalTransform = buttonElement.style.transform || '';

    // Add click animation
    buttonElement.style.transform = 'scale(0.95)';
    buttonElement.style.transition = 'transform 0.1s ease';

    // Reset after animation
    setTimeout(() => {
        buttonElement.style.transform = originalTransform;
        setTimeout(() => {
            buttonElement.style.transition = '';
        }, 100);
    }, 100);
}

// Global variable to store current product data for pre-order
let currentHomepageProductData = null;

// Function to open pre-order modal from homepage
function openHomepagePreOrderModal(product) {
    // Store current product data
    currentHomepageProductData = {
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        expected_restock_date: product.expected_restock_date || ''
    };

    // Create and show a simple pre-order modal
    showHomepagePreOrderDialog(product);
}

// Function to show pre-order dialog for homepage
function showHomepagePreOrderDialog(product) {
    // Ensure price is a number
    const price = parseFloat(product.price);

    const depositOptions = [
        {
            value: 25,
            label: `25% Initial Deposit`,
            amount: `$${(price * 0.25).toFixed(2)}`,
            description: 'Pay 25% now, remaining 75% when available'
        },
        {
            value: 50,
            label: `50% Initial Deposit`,
            amount: `$${(price * 0.50).toFixed(2)}`,
            description: 'Pay 50% now, remaining 50% when available'
        },
        {
            value: 100,
            label: `Full Payment`,
            amount: `$${price.toFixed(2)}`,
            description: 'Pay full amount now, no additional payment needed'
        }
    ];

    const optionsHtml = depositOptions.map((option, index) => `
        <div class="form-check mb-2">
            <input class="form-check-input" type="radio" name="homepageDepositOption" id="homepage-deposit${option.value}" value="${option.value}" ${index === 0 ? 'checked' : ''}>
            <label class="form-check-label" for="homepage-deposit${option.value}">
                <strong>${option.label}</strong> - ${option.amount}<br>
                <small class="text-muted">${option.description}</small>
            </label>
        </div>
    `).join('');

    const restockText = product.expected_restock_date && product.expected_restock_date !== 'None' ?
        product.expected_restock_date :
        'To be announced';

    // Get product image
    const productImage = product.photo ?
        `/static/uploads/products/${product.photo}` :
        '/static/images/placeholder-product.jpg';

    // Create modal HTML
    const modalHtml = `
        <div class="modal fade" id="homepagePreorderModal" tabindex="-1" aria-labelledby="homepagePreorderModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title" id="homepagePreorderModalLabel">
                            <i class="bi bi-clock"></i> Place Pre-Order - Initial Deposit
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-4">
                                <img src="${productImage}" alt="${product.name}" class="img-fluid rounded" style="max-height: 200px; object-fit: contain;">
                            </div>
                            <div class="col-md-8">
                                <h4>${product.name}</h4>
                                <p><strong>Price:</strong> <span class="text-primary h5">$${price.toFixed(2)}</span></p>
                                <p><strong>Expected Availability:</strong> <span class="text-muted">${restockText}</span></p>
                            </div>
                        </div>

                        <hr>

                        <!-- Initial Deposit Options -->
                        <div class="mb-4">
                            <h6><i class="bi bi-credit-card"></i> Initial Deposit Options</h6>
                            <div class="alert alert-info">
                                <i class="bi bi-info-circle"></i> Choose your initial deposit amount. Payment will be processed through the cart.
                            </div>
                            ${optionsHtml}
                        </div>

                        <!-- Special Requests -->
                        <div class="mb-4">
                            <label for="homepage-preorder-notes" class="form-label"><strong>Special Requests (Optional)</strong></label>
                            <textarea class="form-control" id="homepage-preorder-notes" rows="3" placeholder="Any special requests or notes..."></textarea>
                        </div>

                        <!-- Pre-order Terms -->
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle"></i>
                            <strong>Pre-order Terms:</strong>
                            <ul class="mb-0 mt-2">
                                <li>You will be notified when the product becomes available</li>
                                <li>Deposits are refundable if you cancel before the product arrives</li>
                                <li>You have 7 days to complete your purchase once notified</li>
                                <li>Prices may be subject to change at time of availability</li>
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-warning" id="homepage-confirm-preorder">
                            <i class="bi bi-clock"></i> Confirm Pre-Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('homepagePreorderModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Add event listener for confirm button
    document.getElementById('homepage-confirm-preorder').addEventListener('click', submitHomepagePreOrder);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('homepagePreorderModal'));
    modal.show();
}

// Function to submit pre-order from homepage
async function submitHomepagePreOrder() {
    try {
        const quantity = 1; // Fixed quantity of 1 for pre-orders
        const depositPercentage = parseInt(document.querySelector('input[name="homepageDepositOption"]:checked').value);
        const notes = document.getElementById('homepage-preorder-notes').value;

        // Calculate the actual deposit amount to be paid
        const totalPrice = currentHomepageProductData.price * quantity;
        const depositAmount = (totalPrice * depositPercentage) / 100;

        const response = await fetch('/api/preorders/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: currentHomepageProductData.id,
                quantity: quantity,
                deposit_percentage: depositPercentage,
                payment_method: null, // Payment will be handled in cart
                notes: notes
            })
        });

        const data = await response.json();

        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('homepagePreorderModal'));
            modal.hide();

            // Update pre-order state
            if (window.preorderStateManager) {
                window.preorderStateManager.setPreorderState(currentHomepageProductData.id, {
                    has_preorder: true,
                    preorder_id: data.pre_order_id,
                    status: 'pending'
                });

                // Update button state immediately
                const preorderBtn = document.querySelector(`[data-product-id="${currentHomepageProductData.id}"].preorder-btn`);
                if (preorderBtn) {
                    window.preorderStateManager.updateButtonState(preorderBtn, currentHomepageProductData.id);
                }
            }

            // Dispatch event for other components
            document.dispatchEvent(new CustomEvent('preorderCreated', {
                detail: {
                    productId: currentHomepageProductData.id,
                    preorderId: data.pre_order_id,
                    status: 'pending'
                }
            }));

            // Pass the deposit amount (not full price) to cart for payment
            const priceForCart = depositAmount / quantity; // Price per item for cart display
            addHomepagePreOrderToCartAndRedirect(data.pre_order_id, currentHomepageProductData.id, currentHomepageProductData.name, quantity, priceForCart);
        } else {
            showNotification('Error placing pre-order: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while placing the pre-order.', 'error');
    }
}

// Function to add pre-order to cart and show success from homepage
async function addHomepagePreOrderToCartAndRedirect(preOrderId, productId, productName, quantity, price) {
    console.log(`🛒 Adding pre-order #${preOrderId} to cart...`);

    try {
        const requestData = {
            preorder_id: preOrderId,
            product_id: productId,
            quantity: quantity,
            price: price
        };

        console.log('🛒 Sending request to add preorder to cart:', requestData);

        const response = await fetch('/api/cart/add-preorder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        console.log('📡 Response status:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('📦 Cart addition result:', result);

            if (result.success) {
                // Success - show success message with cart options
                showNotification('Pre-order added to cart successfully!', 'success');
                return;
            }
        }

        // If we get here, something went wrong - still show success for pre-order creation
        console.warn('Cart addition failed, but pre-order was created');
        showNotification('Pre-order created successfully!', 'success');

    } catch (error) {
        console.error('❌ Error adding pre-order to cart:', error);
        showNotification('Pre-order created successfully!', 'success');
    }
}

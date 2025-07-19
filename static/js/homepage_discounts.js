// Homepage Discount Products JavaScript
let discountCurrentPage = 1;
let discountTotalPages = 1;
let discountIsLoading = false;

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
});

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

// Make the function globally available
window.updateDiscountCartButtonStates = updateDiscountCartButtonStates;

async function loadDiscountProducts() {
    if (discountIsLoading) return;

    discountIsLoading = true;
    const container = document.getElementById('discount-products-container');
    const viewMoreContainer = document.getElementById('discount-view-more-container');

    try {
        // Show loading message
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Loading discount products...</p>';

        const response = await fetch(`/api/products/discounted?limit=12`); // Get more products for View More
        const data = await response.json();

        if (data.success && data.products && data.products.length > 0) {
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
        } else {
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

    // Add discount badge if product has discount
    const originalPrice = parseFloat(product.original_price || product.price);
    const discountPrice = parseFloat(product.price);
    const discountPercent = Math.round(((originalPrice - discountPrice) / originalPrice) * 100);

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
            <span class="original-price">$${parseFloat(originalPrice).toFixed(2)}</span>
            <span class="sale-price">$${parseFloat(discountPrice).toFixed(2)}</span>
            <div class="savings-text">You Save: $${parseFloat(originalPrice - discountPrice).toFixed(2)}</div>
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
    buttonDiv.className = 'd-flex gap-2 mt-3';

    const viewButton = document.createElement('button');
    viewButton.className = 'btn btn-primary view-product-btn flex-fill';
    viewButton.textContent = 'View Product';
    viewButton.setAttribute('data-product-name', product.name);

    const cartButton = document.createElement('button');
    cartButton.className = 'btn add-to-cart-btn flex-fill';
    cartButton.setAttribute('data-product-id', product.id);
    cartButton.style.display = 'inline-flex';
    cartButton.style.alignItems = 'center';
    cartButton.style.justifyContent = 'center';

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
        // Check if this product is already in cart (but only for regular cart buttons, not pre-order buttons)
        if (typeof cartProductIds !== 'undefined' && cartProductIds.has(product.id) && !cartButton.classList.contains('preorder-btn')) {
            // Show "Already in Cart" state for items already in cart
            cartButton.style.backgroundColor = '#6c757d'; // Gray background
            cartButton.style.color = '#fff'; // White text
            cartButton.style.border = 'none';
            cartButton.innerHTML = `<i class="bi bi-check-circle"></i>`;
            cartButton.disabled = true; // Disable button to prevent clicks
            cartButton.title = 'This item is already in your cart';
        } else {
            // In stock styling
            cartButton.style.backgroundColor = '#28a745'; // Green background for cart
            cartButton.style.color = '#fff'; // White text/icon
            cartButton.style.border = 'none'; // Remove border for solid button

            // Add Bootstrap cart icon
            cartButton.innerHTML = `<i class="bi bi-cart-plus"></i>`;

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
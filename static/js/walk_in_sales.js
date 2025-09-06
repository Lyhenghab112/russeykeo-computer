// Walk-in Sales POS System JavaScript

class WalkInSales {
    constructor() {
        this.cart = [];
        this.products = [];
        this.currentPage = 1;
        this.pageSize = 8; // Changed to 8 products per page (2 rows x 4 products)
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.paymentMethod = 'khqr';
        this.totalPages = 1;
        this.totalCount = 0;
        this.isLoading = false;
        this.currentPaymentId = null;
        this.paymentCheckInterval = null;
        this.recentNotifications = new Set(); // Track recent notifications to prevent duplicates
        this.customerInfo = {
            first_name: '',
            last_name: '',
            phone: '',
            email: '',
            address: ''
        };

        // Try to restore cart from localStorage
        this.restoreCartFromStorage();

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadProducts();
        this.updateCartDisplay();
    }

    bindEvents() {
        // Search functionality
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.currentPage = 1;
                this.loadProducts();
            });
        }

        // Category filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = e.target.dataset.category;
                this.currentPage = 1;
                this.loadProducts();
            });
        });

        // Cart actions
        const clearCartBtn = document.getElementById('clear-cart-btn');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => {
                this.clearCart();
            });
        }

        const newSaleBtn = document.getElementById('new-sale-btn');
        if (newSaleBtn) {
            newSaleBtn.addEventListener('click', () => {
                this.newSale();
            });
        }

        // Payment method selection
        document.querySelectorAll('.payment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('active'));
                e.target.closest('.payment-btn').classList.add('active');

                document.querySelectorAll('.payment-details').forEach(d => d.classList.remove('active'));

                this.paymentMethod = e.target.closest('.payment-btn').dataset.method;
                const paymentDetails = document.getElementById(`${this.paymentMethod}-details`);
                if (paymentDetails) {
                    paymentDetails.classList.add('active');
                }

                if (this.paymentMethod === 'khqr') {
                    this.generateQRCode();
                } else {
                    // Clear KHQR payment state when switching to other payment methods
                    this.stopPaymentChecking();
                    this.currentPaymentId = null;
                }
            });
        });

        // Cash payment calculation
        const cashReceivedInput = document.getElementById('cash-received');
        if (cashReceivedInput) {
            cashReceivedInput.addEventListener('input', (e) => {
                this.calculateChange();
            });
        }

        // Process payment
        const processPaymentBtn = document.getElementById('process-payment-btn');
        if (processPaymentBtn) {
            processPaymentBtn.addEventListener('click', () => {
                this.processPayment();
            });
        }

        // Save quote
        const saveQuoteBtn = document.getElementById('save-quote-btn');
        if (saveQuoteBtn) {
            saveQuoteBtn.addEventListener('click', () => {
                this.saveQuote();
            });
        }

        // Modal actions
        const newSaleModalBtn = document.getElementById('new-sale-modal-btn');
        if (newSaleModalBtn) {
            newSaleModalBtn.addEventListener('click', () => {
                this.newSale();
                const successModal = document.getElementById('success-modal');
                if (successModal && typeof bootstrap !== 'undefined') {
                    bootstrap.Modal.getInstance(successModal)?.hide();
                }
            });
        }

        const viewInvoiceBtn = document.getElementById('view-invoice-btn');
        if (viewInvoiceBtn) {
            viewInvoiceBtn.addEventListener('click', () => {
                const successModal = document.getElementById('success-modal');
                const invoiceModal = document.getElementById('invoice-modal');
                if (successModal && invoiceModal && typeof bootstrap !== 'undefined') {
                    bootstrap.Modal.getInstance(successModal)?.hide();
                    bootstrap.Modal.getOrCreateInstance(invoiceModal)?.show();
                }
            });
        }

        const continueShoppingBtn = document.getElementById('continue-shopping-btn');
        if (continueShoppingBtn) {
            continueShoppingBtn.addEventListener('click', () => {
                const successModal = document.getElementById('success-modal');
                if (successModal && typeof bootstrap !== 'undefined') {
                    bootstrap.Modal.getInstance(successModal)?.hide();
                }
                // The cart is already cleared, so user can continue shopping
                this.showNotification('Ready to continue shopping!', 'success');
            });
        }

        const printInvoiceBtn = document.getElementById('print-invoice-btn');
        if (printInvoiceBtn) {
            printInvoiceBtn.addEventListener('click', () => {
                this.printInvoice();
            });
        }

        // Email invoice functionality removed

        // Customer information modal
        const editCustomerBtn = document.getElementById('edit-customer-btn');
        if (editCustomerBtn) {
            editCustomerBtn.addEventListener('click', () => {
                this.showCustomerModal();
            });
        }

        const saveCustomerBtn = document.getElementById('save-customer-btn');
        if (saveCustomerBtn) {
            saveCustomerBtn.addEventListener('click', () => {
                this.saveCustomerInfo();
            });
        }

        const skipCustomerBtn = document.getElementById('skip-customer-btn');
        if (skipCustomerBtn) {
            skipCustomerBtn.addEventListener('click', () => {
                this.skipCustomerInfo();
            });
        }
    }

    async loadProducts() {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            this.showLoading();

            const params = new URLSearchParams({
                page: this.currentPage,
                page_size: this.pageSize,
                q: this.searchQuery,
                category: this.currentCategory !== 'all' ? this.currentCategory : ''
            });

            const response = await fetch(`/api/walk-in/products?${params}`);
            const data = await response.json();

            if (data.success) {
                // Filter products based on category
                let filteredProducts = data.products;

                if (this.currentCategory === 'discounted') {
                    // Filter to show only discounted products
                    filteredProducts = data.products.filter(product => product.has_discount);
                }

                this.products = filteredProducts;
                this.totalPages = data.pagination.total_pages;
                this.totalCount = filteredProducts.length;
                this.renderProducts();
                this.renderPagination(data.pagination);
            } else {
                this.showNotification('Error loading products', 'error');
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.showNotification('Error loading products', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    showLoading() {
        // Create skeleton loading cards for better UX
        const skeletonCards = Array(8).fill().map(() => `
            <div class="skeleton-card">
                <div class="skeleton-image"></div>
                <div class="skeleton-content">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-price"></div>
                    <div class="skeleton-stock"></div>
                </div>
            </div>
        `).join('');

        document.getElementById('products-grid').innerHTML = `
            ${skeletonCards}
            <style>
                .skeleton-card {
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    background: #fff;
                    overflow: hidden;
                    animation: pulse 1.5s ease-in-out infinite;
                }

                .skeleton-image {
                    width: 100%;
                    height: 160px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                }

                .skeleton-content {
                    padding: 20px;
                }

                .skeleton-title {
                    height: 20px;
                    background: #e9ecef;
                    border-radius: 4px;
                    margin-bottom: 12px;
                }

                .skeleton-price {
                    height: 24px;
                    background: #e9ecef;
                    border-radius: 4px;
                    margin-bottom: 12px;
                    width: 60%;
                }

                .skeleton-stock {
                    height: 16px;
                    background: #e9ecef;
                    border-radius: 4px;
                    width: 40%;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
            </style>
        `;

        // Disable pagination during loading
        const paginationContainer = document.getElementById('pagination-container');
        if (paginationContainer) {
            const paginationLinks = paginationContainer.querySelectorAll('.page-link');
            paginationLinks.forEach(link => {
                link.style.pointerEvents = 'none';
                link.style.opacity = '0.6';
            });
        }
    }

    renderProducts() {
        const grid = document.getElementById('products-grid');

        // Re-enable pagination after loading
        const paginationContainer = document.getElementById('pagination-container');
        if (paginationContainer) {
            const paginationLinks = paginationContainer.querySelectorAll('.page-link');
            paginationLinks.forEach(link => {
                link.style.pointerEvents = 'auto';
                link.style.opacity = '1';
            });
        }

        if (this.products.length === 0) {
            grid.innerHTML = `
                <div class="loading-spinner" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: #6c757d;">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 16px; color: #adb5bd;"></i>
                    <p style="margin: 0; font-size: 1.1rem; font-weight: 500;">No products found</p>
                    <small style="color: #6c757d; margin-top: 4px;">Try adjusting your search or filter criteria</small>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.products.map(product => `
            <div class="product-card ${product.stock <= 0 ? 'out-of-stock' : ''} ${product.has_discount ? 'discounted-product' : ''}"
                 data-product-id="${product.id}">
                ${product.has_discount ? '<div class="discount-badge-corner">💰 SALE</div>' : ''}
                <img src="${this.getProductImageUrl(product.photo)}"
                     alt="${product.name}" class="product-image"
                     onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik02MCA2MEgxNDBWMTQwSDYwVjYwWiIgZmlsbD0iI0U5RUNFRiIvPgo8cGF0aCBkPSJNODAgODBIMTIwVjEyMEg4MFY4MFoiIGZpbGw9IiNEMUQ1REIiLz4KPHN2Zz4K'">
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <div class="product-price">
                        ${product.has_discount ? `
                            <div class="price-with-discount">
                                <span class="original-price">$${parseFloat(product.selling_price_before_discount || product.price / (1 - (product.discount_percentage || 0) / 100)).toFixed(2)}</span>
                                <span class="discounted-price">$${parseFloat(product.price).toFixed(2)}</span>
                                <span class="discount-percentage">-${parseFloat(product.discount_percentage || 0).toFixed(0)}%</span>
                            </div>
                        ` : `
                            <span class="regular-price">$${parseFloat(product.price).toFixed(2)}</span>
                        `}
                    </div>
                    <div class="product-stock">
                        <span class="stock-indicator ${this.getStockClass(product.stock)}"></span>
                        ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </div>
                </div>
                ${product.stock > 0 ? `
                    <button class="add-to-cart-btn" onclick="walkInSales.addToCart(${product.id})" title="Add to cart">
                        <i class="fas fa-plus"></i>
                    </button>
                ` : ''}
            </div>
        `).join('');
    }

    getStockClass(stock) {
        if (stock <= 0) return 'out';
        if (stock <= 5) return 'low';
        return '';
    }

    getProductImageUrl(photo) {
        if (!photo) {
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik02MCA2MEgxNDBWMTQwSDYwVjYwWiIgZmlsbD0iI0U5RUNFRiIvPgo8cGF0aCBkPSJNODAgODBIMTIwVjEyMEg4MFY4MFoiIGZpbGw9IiNEMUQ1REIiLz4KPHN2Zz4K';
        }

        // Handle full URLs
        if (photo.startsWith('http')) {
            return photo;
        }

        // Handle absolute paths
        if (photo.startsWith('/')) {
            return photo;
        }

        // Handle relative paths - images are stored in uploads/products, not images/products
        return `/static/uploads/products/${photo}`;
    }

    renderPagination(pagination) {
        const container = document.getElementById('pagination-container');

        if (!container) {
            return;
        }

        if (pagination.total_pages <= 1) {
            container.innerHTML = '';
            return;
        }

        // Clear container and create Bootstrap pagination structure
        container.innerHTML = '';

        const nav = document.createElement('nav');
        nav.setAttribute('aria-label', 'Product pagination');

        const ul = document.createElement('ul');
        ul.className = 'pagination justify-content-center';

        const isMobile = window.innerWidth < 768;
        const maxButtons = isMobile ? 3 : 5;
        const currentPage = pagination.current_page;
        const totalPages = pagination.total_pages;

        // First button
        if (!isMobile) {
            const firstLi = document.createElement('li');
            firstLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
            firstLi.innerHTML = `<a class="page-link" href="#" aria-label="First">First</a>`;
            firstLi.addEventListener('click', e => {
                e.preventDefault();
                if (currentPage > 1) this.goToPage(1);
            });
            ul.appendChild(firstLi);
        }

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
        prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous">«</a>`;
        prevLi.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage > 1) this.goToPage(currentPage - 1);
        });
        ul.appendChild(prevLi);

        // Calculate page range
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        if (endPage === totalPages) {
            startPage = Math.max(1, totalPages - maxButtons + 1);
        }

        // Page number buttons
        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = 'page-item' + (i === currentPage ? ' active' : '');
            li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            li.addEventListener('click', e => {
                e.preventDefault();
                this.goToPage(i);
            });
            ul.appendChild(li);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
        nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next">»</a>`;
        nextLi.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage < totalPages) this.goToPage(currentPage + 1);
        });
        ul.appendChild(nextLi);

        // Last button
        if (!isMobile) {
            const lastLi = document.createElement('li');
            lastLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
            lastLi.innerHTML = `<a class="page-link" href="#" aria-label="Last">Last</a>`;
            lastLi.addEventListener('click', e => {
                e.preventDefault();
                if (currentPage < totalPages) this.goToPage(totalPages);
            });
            ul.appendChild(lastLi);
        }

        nav.appendChild(ul);
        container.appendChild(nav);

        // Add pagination info
        const info = document.createElement('div');
        info.className = 'pagination-info text-center mt-2';
        info.innerHTML = `Showing ${((currentPage - 1) * this.pageSize) + 1}-${Math.min(currentPage * this.pageSize, pagination.total_count)} of ${pagination.total_count} products`;
        container.appendChild(info);
    }

    goToPage(page) {
        if (this.isLoading || page === this.currentPage || page < 1 || page > this.totalPages) {
            return;
        }

        this.currentPage = page;
        this.loadProducts();

        // Scroll to top of products grid for better UX
        const productsGrid = document.getElementById('products-grid');
        if (productsGrid) {
            productsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);

        if (!product || product.stock <= 0) {
            this.showNotification('Product is out of stock', 'error');
            return;
        }

        const existingItem = this.cart.find(item => item.id === productId);

        if (existingItem) {
            if (existingItem.quantity >= product.stock) {
                this.showNotification('Cannot add more items than available stock', 'warning');
                return;
            }
            existingItem.quantity++;
            
            // Update the original price in case discount information has changed
            if (product.has_discount && product.discount_percentage > 0) {
                existingItem.original_price = parseFloat(product.price / (1 - product.discount_percentage / 100));
                existingItem.discount_amount = parseFloat(existingItem.original_price - product.price);
            } else if (product.selling_price_before_discount) {
                existingItem.original_price = parseFloat(product.selling_price_before_discount);
                existingItem.discount_amount = parseFloat(product.selling_price_before_discount - product.price);
            }
        } else {
            // Calculate the correct original price (regular selling price before discount)
            let originalPrice = product.price;
            if (product.has_discount && product.discount_percentage > 0) {
                originalPrice = product.price / (1 - product.discount_percentage / 100);
            } else if (product.selling_price_before_discount) {
                originalPrice = product.selling_price_before_discount;
            }

            // Calculate discount amount based on the correct original price
            let discountAmount = 0;
            if (product.has_discount && product.discount_percentage > 0) {
                discountAmount = originalPrice - product.price;
            }

            this.cart.push({
                id: product.id,
                name: product.name,
                price: parseFloat(product.price),
                original_price: parseFloat(originalPrice),
                discount_percentage: parseFloat(product.discount_percentage || 0),
                discount_amount: parseFloat(discountAmount),
                has_discount: product.has_discount || false,
                quantity: 1,
                stock: product.stock,
                photo: product.photo
            });
        }

        // Add visual feedback to product card
        const productCard = document.querySelector(`[data-product-id="${productId}"]`);
        if (productCard) {
            productCard.classList.add('selected');
            setTimeout(() => {
                productCard.classList.remove('selected');
            }, 1000);
        }

        // Debug logging
        console.log('Cart after adding item:', this.cart);
        console.log('Cart length:', this.cart.length);

        this.updateCartDisplay();
        this.saveCartToStorage();
        
        // Regenerate QR code if KHQR payment is active
        if (this.paymentMethod === 'khqr' && this.currentPaymentId) {
            this.generateQRCode();
        }
        
        this.showNotification(`${product.name} added to cart`, 'success');
    }

    removeFromCart(productId, showNotification = true) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.updateCartDisplay();
        this.saveCartToStorage();
        
        // Regenerate QR code if KHQR payment is active
        if (this.paymentMethod === 'khqr' && this.currentPaymentId) {
            this.generateQRCode();
        }
        
        if (showNotification) {
            this.showNotification('Item removed from cart', 'success');
        }
    }

    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            if (quantity <= 0) {
                // Don't show notification when removing via quantity change
                this.removeFromCart(productId, false);
                this.showNotification('Item quantity updated', 'success');
            } else if (quantity <= item.stock) {
                item.quantity = quantity;
                this.updateCartDisplay();
                this.saveCartToStorage();
                
                // Regenerate QR code if KHQR payment is active
                if (this.paymentMethod === 'khqr' && this.currentPaymentId) {
                    this.generateQRCode();
                }
            } else {
                this.showNotification('Cannot exceed available stock', 'warning');
            }
        }
    }

    updateCartDisplay() {
        const cartItems = document.getElementById('cart-items');
        const cartCount = document.getElementById('cart-count');
        const cartSummary = document.getElementById('cart-summary');
        const customerSection = document.getElementById('customer-section');
        const paymentSection = document.getElementById('payment-section');
        const actionButtons = document.getElementById('action-buttons');

        // Debug logging
        console.log('updateCartDisplay called with cart:', this.cart);
        console.log('Cart length:', this.cart.length);
        console.log('Action buttons element:', actionButtons);

        // Update cart count
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartCount) {
            cartCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
        }

        if (this.cart.length === 0) {
            if (cartItems) {
                cartItems.innerHTML = `
                    <div class="empty-cart">
                        <i class="fas fa-shopping-cart"></i>
                        <p>No items in cart</p>
                        <small>Search and select products to add to cart</small>
                    </div>
                `;
            }
            if (cartSummary) cartSummary.style.display = 'none';
            if (customerSection) customerSection.style.display = 'none';
            if (paymentSection) paymentSection.style.display = 'none';
            if (actionButtons) actionButtons.style.display = 'none';
        } else {
            // Render cart items
            if (cartItems) {
                cartItems.innerHTML = this.cart.map(item => `
                    <div class="cart-item">
                        <img src="${this.getProductImageUrl(item.photo)}"
                             alt="${item.name}" class="cart-item-image"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0yMCAyMEg0MFY0MEgyMFYyMFoiIGZpbGw9IiNFOUVDRUYiLz4KPHN2Zz4K'">
                        <div class="cart-item-info">
                            <div class="cart-item-name">
                                ${item.name}
                                ${item.has_discount ? '<span class="discount-badge">💰 Discounted</span>' : ''}
                            </div>
                            <div class="cart-item-price">
                                ${item.has_discount ?
                                    `<span class="original-price">$${item.original_price.toFixed(2)}</span>
                                     <span class="discounted-price">$${item.price.toFixed(2)} each</span>
                                     <span class="discount-info">-${item.discount_percentage.toFixed(1)}%</span>` :
                                    `$${item.price.toFixed(2)} each`
                                }
                            </div>
                        </div>
                        <div class="cart-item-controls">
                            <button class="quantity-btn" onclick="walkInSales.updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                            <input type="number" class="quantity-input" value="${item.quantity}"
                                   onchange="walkInSales.updateQuantity(${item.id}, parseInt(this.value))" min="1" max="${item.stock}">
                            <button class="quantity-btn" onclick="walkInSales.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                            <button class="remove-item-btn" onclick="walkInSales.removeFromCart(${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
            }

            // Calculate totals with discount information
            const originalTotal = this.cart.reduce((sum, item) => sum + (item.original_price * item.quantity), 0);
            const totalDiscount = this.cart.reduce((sum, item) => sum + (item.discount_amount * item.quantity), 0);
            const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const tax = 0; // No tax for now
            const total = subtotal + tax;
            const hasDiscounts = this.cart.some(item => item.has_discount);

            // Update summary
            const subtotalEl = document.getElementById('subtotal');
            const taxEl = document.getElementById('tax');
            const totalEl = document.getElementById('total');

            // Add discount information to summary if there are discounts
            if (hasDiscounts) {
                const summaryContainer = document.getElementById('cart-summary');
                if (summaryContainer && !summaryContainer.querySelector('.discount-summary')) {
                    const discountSummary = document.createElement('div');
                    discountSummary.className = 'discount-summary';
                    discountSummary.innerHTML = `
                        <div class="summary-row">
                            <span>Original Total:</span>
                            <span class="original-total">$${originalTotal.toFixed(2)}</span>
                        </div>
                        <div class="summary-row discount-row">
                            <span>Total Savings:</span>
                            <span class="discount-total">-$${totalDiscount.toFixed(2)}</span>
                        </div>
                    `;
                    // Insert before the subtotal row
                    const subtotalRow = summaryContainer.querySelector('.summary-row');
                    if (subtotalRow) {
                        summaryContainer.insertBefore(discountSummary, subtotalRow);
                    }
                }
                // Update discount values
                const originalTotalEl = document.querySelector('.original-total');
                const discountTotalEl = document.querySelector('.discount-total');
                if (originalTotalEl) originalTotalEl.textContent = `$${originalTotal.toFixed(2)}`;
                if (discountTotalEl) discountTotalEl.textContent = `-$${totalDiscount.toFixed(2)}`;
            }

            if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
            if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
            if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

            // Show sections
            if (cartSummary) cartSummary.style.display = 'block';
            if (customerSection) customerSection.style.display = 'block';
            if (paymentSection) paymentSection.style.display = 'block';
            if (actionButtons) {
                actionButtons.style.display = 'block';
                console.log('Action buttons shown, display set to block');
            } else {
                console.log('Action buttons element not found!');
            }

            // Auto-generate QR code if KHQR is selected
            if (this.paymentMethod === 'khqr') {
                this.generateQRCode();
            }

            // Update cash change calculation
            this.calculateChange();
        }
    }

    calculateChange() {
        if (this.paymentMethod !== 'cash') return;

        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const cashReceivedInput = document.getElementById('cash-received');
        const cashReceived = cashReceivedInput ? parseFloat(cashReceivedInput.value) || 0 : 0;
        const change = cashReceived - total;

        const changeDisplay = document.getElementById('change-display');
        const changeAmount = document.getElementById('change-amount');

        if (changeDisplay && changeAmount) {
            if (cashReceived > 0) {
                changeDisplay.style.display = 'flex';
                changeAmount.textContent = `$${Math.max(0, change).toFixed(2)}`;

                if (change < 0) {
                    changeAmount.style.color = '#dc3545';
                    changeAmount.textContent = `$${Math.abs(change).toFixed(2)} short`;
                } else {
                    changeAmount.style.color = '#28a745';
                }
            } else {
                changeDisplay.style.display = 'none';
            }
        }
    }

    async generateQRCode() {
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Don't generate QR code if cart is empty
        if (total === 0) {
            return;
        }

        const qrContainer = document.querySelector('.qr-placeholder');
        
        // Show loading state immediately
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div style="background: #3498db; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p style="margin: 0; font-weight: 600;">Generating QR Code...</p>
                    <p style="margin: 4px 0 0 0; font-size: 1.25rem;">$${total.toFixed(2)}</p>
                    <small style="opacity: 0.9;">Please wait...</small>
                </div>
            `;
        }

        try {
            // Generate KHQR payment QR code
            const response = await fetch('/api/walk-in/generate-qr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: total,
                    currency: 'USD',
                    description: 'Walk-in Sale Payment'
                })
            });

            const result = await response.json();

            // Ignore any message field from API to prevent unwanted notifications
            if (result.message) {
                console.log('API message (ignored):', result.message);
            }

            if (qrContainer) {
                if (result.success && result.qr_code) {
                    // Store payment ID for verification
                    this.currentPaymentId = result.payment_id;
                    
                    qrContainer.innerHTML = `
                        <div style="text-align: center;">
                            <img src="data:image/png;base64,${result.qr_code}" alt="KHQR Payment" style="width: 180px; height: 180px; margin-bottom: 16px;">
                            <div style="margin-bottom: 12px;">
                                <p style="margin: 0 0 8px 0; font-size: 1rem; font-weight: 600; color: #2c3e50;">Scan to pay $${total.toFixed(2)}</p>
                                <p style="margin: 0; font-size: 0.875rem; color: #7f8c8d;">Waiting for payment...</p>
                            </div>
                        </div>
                    `;
                    
                    // Start automatic payment checking (silently)
                    this.startPaymentChecking();
                } else if (result.success && result.qr_data) {
                    // QR code image generation failed, but we have QR data
                    // Show QR data as text for manual scanning
                    this.currentPaymentId = result.payment_id;
                    
                    qrContainer.innerHTML = `
                        <div style="background: #f39c12; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                            <i class="fas fa-qrcode" style="font-size: 2rem; margin-bottom: 12px;"></i>
                            <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 1.1rem;">QR Code Generated</p>
                            <p style="margin: 0 0 16px 0; font-size: 1rem;">Amount: $${total.toFixed(2)}</p>
                            <div style="background: rgba(255,255,255,0.2); padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                                <small style="opacity: 0.9; word-break: break-all; font-family: monospace; font-size: 0.75rem;">${result.qr_data}</small>
                            </div>
                        </div>
                    `;
                    
                    // Start automatic payment checking (silently)
                    this.startPaymentChecking();
                } else {
                    qrContainer.innerHTML = `
                        <div style="background: #e74c3c; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 8px;"></i>
                            <p style="margin: 0; font-weight: 600;">QR Generation Failed</p>
                            <p style="margin: 4px 0 0 0; font-size: 1rem;">${result.error || 'Unknown error'}</p>
                            <small style="opacity: 0.9;">Please try again</small>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('QR generation error:', error);
            if (qrContainer) {
                qrContainer.innerHTML = `
                    <div style="background: #e74c3c; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 8px;"></i>
                        <p style="margin: 0; font-weight: 600;">Error</p>
                        <p style="margin: 4px 0 0 0; font-size: 1rem;">Failed to generate QR code</p>
                        <small style="opacity: 0.9;">Please try again</small>
                    </div>
                `;
            }
        }
    }

    async checkPaymentStatus() {
        if (!this.currentPaymentId) {
            this.showNotification('No payment to check', 'error');
            return null;
        }

        try {
            const response = await fetch('/api/walk-in/check-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payment_id: this.currentPaymentId
                })
            });

            const result = await response.json();

            if (result.success) {
                if (result.status === 'completed') {
                    this.showNotification('Payment received!', 'success');
                    return 'completed';
                } else {
                    // Don't show pending status notifications
                    return result.status;
                }
            } else {
                // Only show error notifications
                if (result.error && result.error !== 'Payment still pending') {
                    this.showNotification(result.error, 'error');
                }
                return null;
            }
        } catch (error) {
            console.error('Payment check error:', error);
            this.showNotification('Failed to check payment status', 'error');
            return null;
        }
    }

    startPaymentChecking() {
        // Stop any existing payment checking
        if (this.paymentCheckInterval) {
            clearInterval(this.paymentCheckInterval);
        }

        // Check payment status every 5 seconds (silently - no notifications)
        this.paymentCheckInterval = setInterval(async () => {
            if (this.currentPaymentId) {
                const status = await this.checkPaymentStatus();
                if (status === 'completed') {
                    // Payment completed - handle success
                    this.handleKHQRPaymentSuccess();
                }
            } else {
                // Stop checking if no payment ID
                clearInterval(this.paymentCheckInterval);
            }
        }, 5000);
    }

    stopPaymentChecking() {
        if (this.paymentCheckInterval) {
            clearInterval(this.paymentCheckInterval);
            this.paymentCheckInterval = null;
        }
    }

    async handleKHQRPaymentSuccess() {
        // Stop payment checking
        this.stopPaymentChecking();
        
        // Don't clear payment ID yet - keep it for sale processing
        // this.currentPaymentId = null;
        
        // Replace QR code with success message
        const qrContainer = document.querySelector('.qr-container .qr-placeholder');
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="width: 80px; height: 80px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                        <i class="fas fa-check" style="font-size: 2.5rem; color: white;"></i>
                    </div>
                    <h3 style="color: #10b981; margin: 0 0 10px 0; font-weight: 600;">Payment Successful!</h3>
                    <p style="color: #6b7280; margin: 0; font-size: 1rem;">KHQR payment has been received</p>
                    <p style="color: #059669; margin: 10px 0 0 0; font-weight: 600; font-size: 1.1rem;">Processing sale...</p>
                </div>
            `;
        }
        
        // Show success notification
        this.showNotification('KHQR Payment received successfully!', 'success');
        
        // Process the sale
        await this.processPayment();
    }

    async clearCart() {
        if (this.cart.length === 0) return;

        // Use SweetAlert if available, otherwise fall back to custom modal
        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                title: 'Clear Cart?',
                text: 'This will remove all items from the current sale.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Clear Cart',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                reverseButtons: true
            });

            if (result.isConfirmed) {
                this.cart = [];
                this.stopPaymentChecking();
                this.currentPaymentId = null;
                this.updateCartDisplay();
                this.saveCartToStorage();
                this.showNotification('Cart cleared', 'success');
            }
        } else {
            // Fallback to custom styled confirmation
            this.showCustomConfirmation(
                'Clear Cart?',
                'This will remove all items from the current sale.',
                () => {
                    this.cart = [];
                    this.stopPaymentChecking();
                    this.currentPaymentId = null;
                    this.updateCartDisplay();
                    this.saveCartToStorage();
                    this.showNotification('Cart cleared', 'success');
                }
            );
        }
    }

    newSale() {
        this.cart = [];
        this.customerInfo = {
            first_name: '',
            last_name: '',
            phone: '',
            email: '',
            address: ''
        };
        
        // Clear payment state
        this.stopPaymentChecking();
        this.currentPaymentId = null;
        
        this.updateCartDisplay();
        this.updateCustomerDisplay();
        this.saveCartToStorage();
        document.getElementById('cash-received').value = '';
        this.showNotification('Ready for new sale', 'success');
    }

    showCustomConfirmation(title, message, onConfirm) {
        // Create custom modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        overlay.innerHTML = `
            <div class="custom-modal">
                <div class="custom-modal-header">
                    <i class="fas fa-exclamation-triangle text-warning"></i>
                    <h4>${title}</h4>
                </div>
                <div class="custom-modal-body">
                    <p>${message}</p>
                </div>
                <div class="custom-modal-footer">
                    <button class="btn btn-secondary cancel-btn">Cancel</button>
                    <button class="btn btn-danger confirm-btn">Yes, Clear Cart</button>
                </div>
            </div>
        `;

        // Add styles if not already present
        if (!document.getElementById('custom-modal-styles')) {
            const styles = document.createElement('style');
            styles.id = 'custom-modal-styles';
            styles.textContent = `
                .custom-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIn 0.3s ease;
                }
                .custom-modal {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                    max-width: 420px;
                    width: 90%;
                    animation: slideIn 0.3s ease;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .custom-modal-header {
                    padding: 24px 24px 16px;
                    text-align: center;
                    border-bottom: 1px solid #e9ecef;
                }
                .custom-modal-header i {
                    font-size: 48px;
                    margin-bottom: 12px;
                    display: block;
                }
                .custom-modal-header h4 {
                    margin: 0;
                    color: #495057;
                    font-weight: 600;
                    font-size: 1.25rem;
                }
                .custom-modal-body {
                    padding: 20px 24px;
                    text-align: center;
                    color: #6c757d;
                    line-height: 1.5;
                }
                .custom-modal-footer {
                    padding: 16px 24px 24px;
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }
                .custom-modal-footer .btn {
                    min-width: 100px;
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-weight: 500;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .custom-modal-footer .btn-secondary {
                    background: #6c757d;
                    color: white;
                }
                .custom-modal-footer .btn-secondary:hover {
                    background: #5a6268;
                    transform: translateY(-1px);
                }
                .custom-modal-footer .btn-danger {
                    background: #dc3545;
                    color: white;
                }
                .custom-modal-footer .btn-danger:hover {
                    background: #c82333;
                    transform: translateY(-1px);
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateY(-30px) scale(0.95); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }

        // Add event listeners
        const cancelBtn = overlay.querySelector('.cancel-btn');
        const confirmBtn = overlay.querySelector('.confirm-btn');

        const closeModal = () => {
            overlay.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        };

        cancelBtn.addEventListener('click', closeModal);
        confirmBtn.addEventListener('click', () => {
            onConfirm();
            closeModal();
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Add to DOM
        document.body.appendChild(overlay);
    }

    showCustomerModal() {
        // Populate modal with existing customer info
        document.getElementById('modal-first-name').value = this.customerInfo.first_name || '';
        document.getElementById('modal-last-name').value = this.customerInfo.last_name || '';
        document.getElementById('modal-phone').value = this.customerInfo.phone || '';
        document.getElementById('modal-email').value = this.customerInfo.email || '';
        document.getElementById('modal-address').value = this.customerInfo.address || '';

        // Show the modal
        const customerModal = document.getElementById('customer-modal');
        if (customerModal && typeof bootstrap !== 'undefined') {
            bootstrap.Modal.getOrCreateInstance(customerModal).show();
        }
    }

    saveCustomerInfo() {
        // Get values from modal
        this.customerInfo = {
            first_name: document.getElementById('modal-first-name').value.trim(),
            last_name: document.getElementById('modal-last-name').value.trim(),
            phone: document.getElementById('modal-phone').value.trim(),
            email: document.getElementById('modal-email').value.trim(),
            address: document.getElementById('modal-address').value.trim()
        };

        // Update customer display
        this.updateCustomerDisplay();

        // Hide the modal
        const customerModal = document.getElementById('customer-modal');
        if (customerModal && typeof bootstrap !== 'undefined') {
            bootstrap.Modal.getInstance(customerModal)?.hide();
        }

        this.showNotification('Customer information saved', 'success');
    }

    skipCustomerInfo() {
        // Clear customer info
        this.customerInfo = {
            first_name: '',
            last_name: '',
            phone: '',
            email: '',
            address: ''
        };

        // Update customer display
        this.updateCustomerDisplay();

        // Hide the modal
        const customerModal = document.getElementById('customer-modal');
        if (customerModal && typeof bootstrap !== 'undefined') {
            bootstrap.Modal.getInstance(customerModal)?.hide();
        }

        this.showNotification('Proceeding with anonymous customer', 'success');
    }

    updateCustomerDisplay() {
        const customerNameDisplay = document.querySelector('.customer-name-display');
        const customerDetails = document.getElementById('customer-details');

        if (this.customerInfo.first_name || this.customerInfo.last_name) {
            const fullName = `${this.customerInfo.first_name} ${this.customerInfo.last_name}`.trim();
            customerNameDisplay.textContent = fullName;

            // Show customer details
            let detailsHtml = `<div class="customer-details-content">`;
            if (this.customerInfo.phone) {
                detailsHtml += `<div><i class="fas fa-phone"></i> ${this.customerInfo.phone}</div>`;
            }
            if (this.customerInfo.email) {
                detailsHtml += `<div><i class="fas fa-envelope"></i> ${this.customerInfo.email}</div>`;
            }
            if (this.customerInfo.address) {
                detailsHtml += `<div><i class="fas fa-map-marker-alt"></i> ${this.customerInfo.address}</div>`;
            }
            detailsHtml += `</div>`;

            customerDetails.innerHTML = detailsHtml;
            customerDetails.style.display = 'block';
        } else {
            customerNameDisplay.textContent = 'Walk-in Customer';
            customerDetails.style.display = 'none';
        }
    }

    async processPayment() {
        console.log('processPayment called with cart:', this.cart);
        console.log('Cart length:', this.cart.length);
        
        if (this.cart.length === 0) {
            this.showNotification('Cart is empty', 'error');
            return;
        }

        // Validate payment method specific requirements
        if (this.paymentMethod === 'cash') {
            const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const cashReceived = parseFloat(document.getElementById('cash-received').value) || 0;
            
            if (cashReceived < total) {
                this.showNotification('Insufficient cash received', 'error');
                return;
            }
        } else if (this.paymentMethod === 'khqr') {
            // For KHQR payments, we need to verify payment was received
            if (!this.currentPaymentId) {
                this.showNotification('Please generate QR code first', 'error');
                return;
            }
            
            // Check payment status before processing
            const paymentStatus = await this.checkPaymentStatus();
            if (paymentStatus !== 'completed') {
                this.showNotification('Payment not yet received. Please wait for customer to complete payment.', 'warning');
                return;
            }
        }

        try {
            const saleData = {
                items: this.cart,
                customer: {
                    name: this.customerInfo.first_name && this.customerInfo.last_name
                        ? `${this.customerInfo.first_name} ${this.customerInfo.last_name}`.trim()
                        : this.customerInfo.first_name || 'Walk-in Customer',
                    first_name: this.customerInfo.first_name,
                    last_name: this.customerInfo.last_name,
                    email: this.customerInfo.email,
                    phone: this.customerInfo.phone,
                    address: this.customerInfo.address
                },
                payment_method: this.paymentMethod,
                cash_received: this.paymentMethod === 'cash' ? parseFloat(document.getElementById('cash-received').value) : null
            };

            const response = await fetch('/api/walk-in/process-sale', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saleData)
            });

            const result = await response.json();

            if (result.success) {
                // Clear payment ID after successful sale processing
                this.currentPaymentId = null;
                
                this.generateInvoice(result);
                this.showSuccessModal(result);
            } else {
                this.showNotification(result.error || 'Payment processing failed', 'error');
            }
        } catch (error) {
            console.error('Payment processing error:', error);
            this.showNotification('Payment processing failed', 'error');
        }
    }

    showSuccessModal(result) {
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('success-modal'));
        const summaryDiv = document.getElementById('sale-summary');
        
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        summaryDiv.innerHTML = `
            <div class="summary-row">
                <span>Order ID:</span>
                <span>#${result.order_id}</span>
            </div>
            <div class="summary-row">
                <span>Total Amount:</span>
                <span>$${total.toFixed(2)}</span>
            </div>
            <div class="summary-row">
                <span>Payment Method:</span>
                <span>${this.paymentMethod.toUpperCase()}</span>
            </div>
            ${this.paymentMethod === 'cash' ? `
                <div class="summary-row">
                    <span>Cash Received:</span>
                    <span>$${parseFloat(document.getElementById('cash-received').value).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Change:</span>
                    <span>$${(parseFloat(document.getElementById('cash-received').value) - total).toFixed(2)}</span>
                </div>
            ` : ''}
        `;
        
        modal.show();
        
        // Clear the cart after showing the invoice
        this.cart = [];
        this.customerInfo = {
            first_name: '',
            last_name: '',
            phone: '',
            email: '',
            address: ''
        };
        
        // Update the display to show empty cart state
        this.updateCartDisplay();
        this.saveCartToStorage();
        
        // Clear cash received input
        const cashReceivedInput = document.getElementById('cash-received');
        if (cashReceivedInput) {
            cashReceivedInput.value = '';
        }
    }

    generateInvoice(saleData) {
        const invoiceContent = document.getElementById('invoice-content');

        // Calculate totals with discount information
        const originalTotal = this.cart.reduce((sum, item) => sum + (item.original_price * item.quantity), 0);
        const totalDiscount = this.cart.reduce((sum, item) => sum + (item.discount_amount * item.quantity), 0);
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const subtotal = total;
        const tax = 0; // No tax for now
        const hasDiscounts = this.cart.some(item => item.has_discount);
        const currentDate = new Date().toLocaleDateString();
        const currentTime = new Date().toLocaleTimeString();

        const customerName = this.customerInfo.first_name && this.customerInfo.last_name
            ? `${this.customerInfo.first_name} ${this.customerInfo.last_name}`.trim()
            : this.customerInfo.first_name || 'Walk-in Customer';
        const customerEmail = this.customerInfo.email;
        const customerPhone = this.customerInfo.phone;

        invoiceContent.innerHTML = `
            <div class="invoice-header">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center;">
                        <img src="/static/icons/logo.jpg" alt="RusseyKeo Computer Logo" style="height: 60px; width: auto; margin-right: 16px; border-radius: 8px;">
                        <div>
                            <h2 style="margin: 0; color: #1f2937; font-size: 1.75rem;">RusseyKeo Computer</h2>
                            <p style="margin: 4px 0 0 0; color: #6b7280;">Professional Computer Sales & Service</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <h3 style="margin: 0; color: #3b82f6; font-size: 1.5rem;">INVOICE</h3>
                        <p style="margin: 4px 0 0 0; color: #6b7280;">#${saleData.order_id}</p>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 1rem;">Bill To:</h4>
                        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                            <p style="margin: 0; font-weight: 600; color: #1f2937;">${customerName}</p>
                            ${customerEmail ? `<p style="margin: 4px 0 0 0; color: #6b7280;">${customerEmail}</p>` : ''}
                            ${customerPhone ? `<p style="margin: 4px 0 0 0; color: #6b7280;">${customerPhone}</p>` : ''}
                        </div>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 1rem;">Invoice Details:</h4>
                        <div style="background: #f8fafc; padding: 16px; border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: #6b7280;">Date:</span>
                                <span style="color: #1f2937; font-weight: 500;">${currentDate}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: #6b7280;">Time:</span>
                                <span style="color: #1f2937; font-weight: 500;">${currentTime}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: #6b7280;">Payment:</span>
                                <span style="color: #1f2937; font-weight: 500;">${this.paymentMethod.toUpperCase()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #6b7280;">Status:</span>
                                <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 500;">PAID</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="invoice-items">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #374151; font-weight: 600;">Item Description</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; color: #374151; font-weight: 600;">Qty</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #374151; font-weight: 600;">Original Price</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #374151; font-weight: 600;">Discount</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #374151; font-weight: 600;">Final Price</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #374151; font-weight: 600;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.cart.map((item, index) => `
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 12px; color: #1f2937;">
                                    <div style="font-weight: 500;">
                                        ${item.name}
                                        ${item.has_discount ? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 8px; font-size: 0.7rem; margin-left: 8px;">💰 DISCOUNTED</span>' : ''}
                                    </div>
                                </td>
                                <td style="padding: 12px; text-align: center; color: #6b7280;">${item.quantity}</td>
                                <td style="padding: 12px; text-align: right; color: #6b7280;">
                                    ${item.has_discount ?
                                        `<span style="text-decoration: line-through;">$${item.original_price.toFixed(2)}</span>` :
                                        `$${item.original_price.toFixed(2)}`
                                    }
                                </td>
                                <td style="padding: 12px; text-align: right; color: #10b981; font-weight: 500;">
                                    ${item.has_discount ?
                                        `-${item.discount_percentage.toFixed(1)}%<br><small>(-$${item.discount_amount.toFixed(2)})</small>` :
                                        'No discount'
                                    }
                                </td>
                                <td style="padding: 12px; text-align: right; color: ${item.has_discount ? '#10b981' : '#6b7280'}; font-weight: ${item.has_discount ? '600' : '400'};">
                                    $${item.price.toFixed(2)}
                                </td>
                                <td style="padding: 12px; text-align: right; color: #1f2937; font-weight: 500;">$${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="display: flex; justify-content: flex-end;">
                    <div style="width: 300px;">
                        <div style="background: #f8fafc; padding: 16px; border-radius: 8px;">
                            ${hasDiscounts ? `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="color: #6b7280;">Original Subtotal:</span>
                                    <span style="color: #6b7280; text-decoration: line-through;">$${originalTotal.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="color: #10b981; font-weight: 500;">Total Discount Savings:</span>
                                    <span style="color: #10b981; font-weight: 500;">-$${totalDiscount.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="color: #6b7280;">Final Subtotal:</span>
                                    <span style="color: #1f2937;">$${subtotal.toFixed(2)}</span>
                                </div>
                            ` : `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="color: #6b7280;">Subtotal:</span>
                                    <span style="color: #1f2937;">$${subtotal.toFixed(2)}</span>
                                </div>
                            `}
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: #6b7280;">Tax (0%):</span>
                                <span style="color: #1f2937;">$${tax.toFixed(2)}</span>
                            </div>
                            ${this.paymentMethod === 'cash' ? `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="color: #6b7280;">Cash Received:</span>
                                    <span style="color: #1f2937;">$${parseFloat(document.getElementById('cash-received').value || 0).toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">
                                    <span style="color: #6b7280;">Change:</span>
                                    <span style="color: #10b981; font-weight: 500;">$${(parseFloat(document.getElementById('cash-received').value || 0) - total).toFixed(2)}</span>
                                </div>
                            ` : '<div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;"></div>'}
                            <div style="display: flex; justify-content: space-between; font-size: 1.125rem; font-weight: 700; color: #1f2937;">
                                <span>Total Amount:</span>
                                <span>$${total.toFixed(2)}</span>
                            </div>
                            ${hasDiscounts ? `
                                <div style="margin-top: 12px; padding: 8px; background: #ecfdf5; border-radius: 6px; text-align: center;">
                                    <span style="color: #10b981; font-weight: 600; font-size: 0.875rem;">🎉 You saved $${totalDiscount.toFixed(2)} on this order!</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <div class="invoice-footer" style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #e5e7eb; text-align: center;">
                <div style="margin-bottom: 16px;">
                    <h4 style="margin: 0 0 8px 0; color: #374151;">Thank you for your business!</h4>
                    <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">We appreciate your trust in RusseyKeo Computer products and services.</p>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 24px; font-size: 0.875rem; color: #6b7280;">
                    <div>
                        <strong style="color: #374151;">Contact Information</strong><br>
                        Email: info@computershop.com<br>
                        Phone: +855 12 345 678
                    </div>
                    <div>
                        <strong style="color: #374151;">Return Policy</strong><br>
                        30-day return policy<br>
                        Warranty terms apply
                    </div>
                    <div>
                        <strong style="color: #374151;">Support</strong><br>
                        Technical support available<br>
                        Visit us for assistance
                    </div>
                </div>

                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f3f4f6; font-size: 0.75rem; color: #9ca3af;">
                    Invoice generated on ${currentDate} at ${currentTime} | Computer Shop POS System
                </div>
            </div>
        `;
    }

    printInvoice() {
        // Create a new window for printing only the invoice content
        const invoiceContent = document.getElementById('invoice-content').innerHTML;
        const printWindow = window.open('', '_blank');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background: white;
                        color: #333;
                        line-height: 1.6;
                    }

                    .invoice-header {
                        text-align: center;
                        margin-bottom: 24px;
                        padding-bottom: 16px;
                        border-bottom: 2px solid #e5e7eb;
                    }

                    .invoice-header h2 {
                        margin: 0 0 16px 0;
                        color: #1f2937;
                    }

                    .customer-details {
                        margin-bottom: 24px;
                        padding: 16px;
                        background: #f8fafc;
                        border-radius: 8px;
                    }

                    .customer-details h4 {
                        margin: 0 0 12px 0;
                        color: #374151;
                    }

                    .invoice-items table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 24px;
                    }

                    .invoice-items th,
                    .invoice-items td {
                        padding: 12px;
                        text-align: left;
                        border-bottom: 1px solid #e5e7eb;
                    }

                    .invoice-items th {
                        background: #f8fafc;
                        font-weight: 600;
                        color: #374151;
                    }

                    .invoice-items tfoot th {
                        background: #1f2937;
                        color: white;
                        font-size: 1.125rem;
                    }

                    .invoice-footer {
                        text-align: center;
                        padding-top: 24px;
                        border-top: 2px solid #e5e7eb;
                        color: #6b7280;
                    }

                    .discount-badge {
                        background: #10b981;
                        color: white;
                        padding: 2px 6px;
                        border-radius: 8px;
                        font-size: 0.7rem;
                        margin-left: 8px;
                        font-weight: 600;
                    }

                    .original-price {
                        text-decoration: line-through;
                        color: #6b7280;
                        margin-right: 8px;
                    }

                    .discounted-price {
                        color: #10b981;
                        font-weight: 600;
                    }

                    .discount-info {
                        background: #10b981;
                        color: white;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 0.75rem;
                        margin-left: 6px;
                    }

                    .discount-summary {
                        border-top: 1px solid #e5e7eb;
                        padding-top: 8px;
                        margin-bottom: 8px;
                    }

                    .discount-row {
                        color: #10b981;
                        font-weight: 600;
                    }

                    .discount-total {
                        color: #10b981 !important;
                        font-weight: 600;
                    }

                    .original-total {
                        text-decoration: line-through;
                        color: #6b7280;
                    }

                    @media print {
                        body {
                            margin: 0;
                            padding: 15px;
                        }

                        .invoice-header,
                        .customer-details,
                        .invoice-items,
                        .invoice-footer {
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                ${invoiceContent}
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();

        // Wait for content to load then print
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    }

    // Email invoice functionality removed

    async saveQuote() {
        if (this.cart.length === 0) {
            this.showNotification('Cart is empty', 'error');
            return;
        }

        try {
            const quoteData = {
                items: this.cart,
                customer: {
                    name: this.customerInfo.first_name && this.customerInfo.last_name
                        ? `${this.customerInfo.first_name} ${this.customerInfo.last_name}`.trim()
                        : this.customerInfo.first_name || 'Walk-in Customer',
                    first_name: this.customerInfo.first_name,
                    last_name: this.customerInfo.last_name,
                    email: this.customerInfo.email,
                    phone: this.customerInfo.phone,
                    address: this.customerInfo.address
                }
            };

            const response = await fetch('/api/walk-in/save-quote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(quoteData)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(`Quote saved with ID: ${result.quote_id}`, 'success');
            } else {
                this.showNotification('Failed to save quote', 'error');
            }
        } catch (error) {
            console.error('Save quote error:', error);
            this.showNotification('Failed to save quote', 'error');
        }
    }

    showNotification(message, type = 'success') {
        console.log(`[WalkInSales] Showing notification: "${message}" (${type})`);

        // Use global showMessage function if available, otherwise fallback to custom
        if (typeof window.showMessage === 'function') {
            window.showMessage(message, type);
        } else {
            // Fallback to simple alert if no global function
            console.warn('Global showMessage function not found, using fallback');
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }



    // Restore cart from localStorage
    restoreCartFromStorage() {
        try {
            const savedCart = localStorage.getItem('walkInSalesCart');
            if (savedCart) {
                this.cart = JSON.parse(savedCart);
                console.log('Cart restored from localStorage:', this.cart);
            }
        } catch (error) {
            console.error('Error restoring cart from localStorage:', error);
        }
    }

    // Save cart to localStorage
    saveCartToStorage() {
        try {
            localStorage.setItem('walkInSalesCart', JSON.stringify(this.cart));
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
        }
    }
}

// Initialize the walk-in sales system
let walkInSales;
document.addEventListener('DOMContentLoaded', () => {
    // Prevent multiple instances
    if (walkInSales) {
        console.log('[WalkInSales] Instance already exists, skipping initialization');
        return;
    }

    // Check for global notification functions
    console.log('[WalkInSales] Checking for global notification functions...');
    if (typeof window.showNotification === 'function') {
        console.log('[WalkInSales] Found global showNotification function, backing up and removing');
        window.originalShowNotification = window.showNotification;
        delete window.showNotification;
    }
    if (typeof window.showMessage === 'function') {
        console.log('[WalkInSales] Found global showMessage function');
    }

    console.log('[WalkInSales] Initializing walk-in sales system...');
    walkInSales = new WalkInSales();
});

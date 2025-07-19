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
        this.recentNotifications = new Set(); // Track recent notifications to prevent duplicates

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

        const printInvoiceBtn = document.getElementById('print-invoice-btn');
        if (printInvoiceBtn) {
            printInvoiceBtn.addEventListener('click', () => {
                this.printInvoice();
            });
        }

        const emailInvoiceBtn = document.getElementById('email-invoice-btn');
        if (emailInvoiceBtn) {
            emailInvoiceBtn.addEventListener('click', () => {
                this.emailInvoice();
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
                this.products = data.products;
                this.totalPages = data.pagination.total_pages;
                this.totalCount = data.pagination.total_count;
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
            <div class="product-card ${product.stock <= 0 ? 'out-of-stock' : ''}"
                 data-product-id="${product.id}">
                <img src="${this.getProductImageUrl(product.photo)}"
                     alt="${product.name}" class="product-image"
                     onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik02MCA2MEgxNDBWMTQwSDYwVjYwWiIgZmlsbD0iI0U5RUNFRiIvPgo8cGF0aCBkPSJNODAgODBIMTIwVjEyMEg4MFY4MFoiIGZpbGw9IiNEMUQ1REIiLz4KPHN2Zz4K'">
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
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
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: parseFloat(product.price),
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

        this.updateCartDisplay();
        this.showNotification(`${product.name} added to cart`, 'success');
    }

    removeFromCart(productId, showNotification = true) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.updateCartDisplay();
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
                            <div class="cart-item-name">${item.name}</div>
                            <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
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

            // Calculate totals
            const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const tax = 0; // No tax for now
            const total = subtotal + tax;

            // Update summary
            const subtotalEl = document.getElementById('subtotal');
            const taxEl = document.getElementById('tax');
            const totalEl = document.getElementById('total');

            if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
            if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
            if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

            // Show sections
            if (cartSummary) cartSummary.style.display = 'block';
            if (customerSection) customerSection.style.display = 'block';
            if (paymentSection) paymentSection.style.display = 'block';
            if (actionButtons) actionButtons.style.display = 'block';

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

            const qrContainer = document.querySelector('.qr-placeholder');

            if (qrContainer) {
                if (result.success && result.qr_code) {
                    qrContainer.innerHTML = `
                        <img src="data:image/png;base64,${result.qr_code}" alt="KHQR Payment" style="width: 150px; height: 150px;">
                        <p style="margin-top: 8px; font-size: 0.875rem;">Scan to pay $${total.toFixed(2)}</p>
                    `;
                } else {
                    qrContainer.innerHTML = `
                        <div style="background: #3498db; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                            <i class="fas fa-qrcode" style="font-size: 2rem; margin-bottom: 8px;"></i>
                            <p style="margin: 0; font-weight: 600;">KHQR Payment</p>
                            <p style="margin: 4px 0 0 0; font-size: 1.25rem;">$${total.toFixed(2)}</p>
                            <small style="opacity: 0.9;">QR code will be generated</small>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('QR generation error:', error);
            const qrContainer = document.querySelector('.qr-placeholder');
            if (qrContainer) {
                qrContainer.innerHTML = `
                    <div style="background: #3498db; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                        <i class="fas fa-qrcode" style="font-size: 2rem; margin-bottom: 8px;"></i>
                        <p style="margin: 0; font-weight: 600;">KHQR Payment</p>
                        <p style="margin: 4px 0 0 0; font-size: 1.25rem;">$${total.toFixed(2)}</p>
                        <small style="opacity: 0.9;">Ready for payment</small>
                    </div>
                `;
            }
        }
    }

    clearCart() {
        if (this.cart.length === 0) return;
        
        if (confirm('Are you sure you want to clear the cart?')) {
            this.cart = [];
            this.updateCartDisplay();
            this.showNotification('Cart cleared', 'success');
        }
    }

    newSale() {
        this.cart = [];
        this.updateCartDisplay();
        document.getElementById('customer-name').value = '';
        document.getElementById('customer-email').value = '';
        document.getElementById('customer-phone').value = '';
        document.getElementById('cash-received').value = '';
        this.showNotification('Ready for new sale', 'success');
    }

    async processPayment() {
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
        }

        try {
            const saleData = {
                items: this.cart,
                customer: {
                    name: document.getElementById('customer-name').value,
                    email: document.getElementById('customer-email').value,
                    phone: document.getElementById('customer-phone').value
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
                this.showSuccessModal(result);
                this.generateInvoice(result);
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
    }

    generateInvoice(saleData) {
        const invoiceContent = document.getElementById('invoice-content');
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const subtotal = total;
        const tax = 0; // No tax for now
        const currentDate = new Date().toLocaleDateString();
        const currentTime = new Date().toLocaleTimeString();

        const customerName = document.getElementById('customer-name').value || 'Walk-in Customer';
        const customerEmail = document.getElementById('customer-email').value;
        const customerPhone = document.getElementById('customer-phone').value;

        invoiceContent.innerHTML = `
            <div class="invoice-header">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px;">
                    <div>
                        <h2 style="margin: 0; color: #1f2937; font-size: 1.75rem;">Computer Shop</h2>
                        <p style="margin: 4px 0 0 0; color: #6b7280;">Professional Computer Solutions</p>
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
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #374151; font-weight: 600;">Unit Price</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #374151; font-weight: 600;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.cart.map((item, index) => `
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 12px; color: #1f2937;">
                                    <div style="font-weight: 500;">${item.name}</div>
                                </td>
                                <td style="padding: 12px; text-align: center; color: #6b7280;">${item.quantity}</td>
                                <td style="padding: 12px; text-align: right; color: #6b7280;">$${item.price.toFixed(2)}</td>
                                <td style="padding: 12px; text-align: right; color: #1f2937; font-weight: 500;">$${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="display: flex; justify-content: flex-end;">
                    <div style="width: 300px;">
                        <div style="background: #f8fafc; padding: 16px; border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: #6b7280;">Subtotal:</span>
                                <span style="color: #1f2937;">$${subtotal.toFixed(2)}</span>
                            </div>
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
                        </div>
                    </div>
                </div>
            </div>

            <div class="invoice-footer" style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #e5e7eb; text-align: center;">
                <div style="margin-bottom: 16px;">
                    <h4 style="margin: 0 0 8px 0; color: #374151;">Thank you for your business!</h4>
                    <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">We appreciate your trust in our products and services.</p>
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
        window.print();
    }

    async emailInvoice() {
        const email = document.getElementById('customer-email').value;
        if (!email) {
            this.showNotification('Customer email is required', 'error');
            return;
        }

        try {
            const response = await fetch('/api/walk-in/email-invoice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    invoice_html: document.getElementById('invoice-content').innerHTML
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Invoice emailed successfully', 'success');
            } else {
                this.showNotification('Failed to email invoice', 'error');
            }
        } catch (error) {
            console.error('Email error:', error);
            this.showNotification('Failed to email invoice', 'error');
        }
    }

    async saveQuote() {
        if (this.cart.length === 0) {
            this.showNotification('Cart is empty', 'error');
            return;
        }

        try {
            const quoteData = {
                items: this.cart,
                customer: {
                    name: document.getElementById('customer-name').value,
                    email: document.getElementById('customer-email').value,
                    phone: document.getElementById('customer-phone').value
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

        const container = document.getElementById('notification-container');
        if (!container) {
            console.warn('Notification container not found');
            return;
        }

        // Create a unique key for this notification
        const notificationKey = `${message}-${type}`;

        // Prevent duplicate notifications with the same message within 1 second
        if (this.recentNotifications.has(notificationKey)) {
            console.log(`[WalkInSales] Blocked duplicate notification: "${message}"`);
            return; // Don't show duplicate notification
        }

        // Add to recent notifications and remove after 1 second
        this.recentNotifications.add(notificationKey);
        setTimeout(() => {
            this.recentNotifications.delete(notificationKey);
        }, 1000);

        // Also check for existing notifications in DOM
        const existingNotifications = container.querySelectorAll('.notification');
        for (let existing of existingNotifications) {
            const existingMessage = existing.querySelector('span');
            if (existingMessage && existingMessage.textContent === message) {
                console.log(`[WalkInSales] Blocked duplicate notification in DOM: "${message}"`);
                return; // Don't show duplicate notification
            }
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type} walk-in-notification`;
        notification.setAttribute('data-message', message);

        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle'
        };

        // Create notification content without nested divs to avoid styling conflicts
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 24px; height: 24px; background: var(--notification-color, #10b981); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.875rem;">
                    <i class="fas fa-${icons[type]}"></i>
                </div>
                <span style="color: #1e293b; font-weight: 500; flex: 1;">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 4px; transition: color 0.2s ease;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Set CSS custom property for color
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b'
        };
        notification.style.setProperty('--notification-color', colors[type]);

        // Set initial state for animation
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'transform 0.3s ease-out';
        notification.style.opacity = '1';

        container.appendChild(notification);

        // Trigger entrance animation with a small delay to ensure DOM is ready
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
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

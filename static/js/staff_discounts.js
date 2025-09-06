// Staff Discount Management JavaScript

// Get user role from session
function getUserRole() {
    return window.userRole || 'staff';
}

// Pagination variables
let currentDiscountsPage = 1;
const discountsPageSize = 10;

// Initialize item counter
let discountsItemCounter = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize item counter
    if (window.ItemCounter) {
        discountsItemCounter = new ItemCounter('discounts-container', {
            itemName: 'discounts',
            itemNameSingular: 'discount',
            position: 'bottom',
            className: 'item-counter theme-warning'
        });
    }

    // Initialize the discount management interface
    initializeDiscountManagement();

    // Initialize bulk selection functionality
    initializeBulkSelection();

    // Load initial data
    loadCurrentDiscounts();

    // Set up event listeners
    setupEventListeners();
});

function initializeDiscountManagement() {
    // Tab switching functionality for modal only (main page tabs removed)
    const modalTabButtons = document.querySelectorAll('.discount-tab-btn');
    const modalTabContents = document.querySelectorAll('.discount-tab-content');

    modalTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.dataset.tab;

            // Remove active class from all modal tabs and contents
            modalTabButtons.forEach(btn => btn.classList.remove('active'));
            modalTabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            document.getElementById(`modal-${targetTab}-tab`).classList.add('active');

            // Load volume discount rules when volume tab is activated
            if (targetTab === 'volume') {
                loadVolumeDiscountRules();
            }
        });
    });
}

function setupEventListeners() {
    // Modal forms only (main page forms have been removed)
    // Single product discount form (modal)
    const modalSingleForm = document.getElementById('modal-single-discount-form');
    if (modalSingleForm) {
        modalSingleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            applySmartDiscount();
        });
    }

    // Category discount form (modal)
    const modalCategoryForm = document.getElementById('modal-category-discount-form');
    if (modalCategoryForm) {
        modalCategoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            applyModalCategoryDiscount();
        });
    }

    // Brand discount form (modal)
    const modalBrandForm = document.getElementById('modal-brand-discount-form');
    if (modalBrandForm) {
        modalBrandForm.addEventListener('submit', function(e) {
            e.preventDefault();
            applyModalBrandDiscount();
        });
    }

    // Volume discount form
    const volumeDiscountForm = document.getElementById('volume-discount-form');
    if (volumeDiscountForm) {
        volumeDiscountForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveVolumeDiscountRule();
        });
    }
}

async function loadCurrentDiscounts(page = currentDiscountsPage) {
    currentDiscountsPage = page;
    try {
        const response = await fetch(`/api/staff/discounts/products?page=${currentDiscountsPage}&page_size=${discountsPageSize}`);
        const data = await response.json();

        if (data.success) {
            displayCurrentDiscounts(data.products, data.pagination);
            updateDiscountsItemCounter(data.pagination);
        } else {
            showMessage('Error loading current discounts: ' + data.error, 'error');
            updateDiscountsItemCounter({ total_count: 0, page: 1, total_pages: 0 });
        }
    } catch (error) {
        console.error('Error loading current discounts:', error);
        showMessage('Failed to load current discounts', 'error');
        updateDiscountsItemCounter({ total_count: 0, page: 1, total_pages: 0 });
    }
}



// Update discounts item counter
function updateDiscountsItemCounter(pagination) {
    if (!discountsItemCounter) return;

    const totalItems = pagination.total_count || 0;
    const currentPageNum = pagination.page || currentDiscountsPage;
    const totalPages = pagination.total_pages || Math.ceil(totalItems / discountsPageSize);
    const startItem = totalItems === 0 ? 0 : ((currentPageNum - 1) * discountsPageSize) + 1;
    const endItem = Math.min(currentPageNum * discountsPageSize, totalItems);

    discountsItemCounter.update({
        totalItems: totalItems,
        currentPage: currentPageNum,
        pageSize: discountsPageSize,
        totalPages: totalPages,
        startItem: startItem,
        endItem: endItem
    });
}

function displayCurrentDiscounts(products, pagination = null) {
    const container = document.getElementById('current-discounts-table');
    const mobileContainer = document.getElementById('mobile-discounts-list');
    const removeAllBtn = document.getElementById('remove-all-discounts-btn');
    const paginationContainer = document.getElementById('discounts-pagination');

    // Button visibility logic

    // Store current data for responsive re-rendering
    window.currentDiscountsData = { products, pagination };



    if (products.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No products currently on discount</p>';
        if (mobileContainer) mobileContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No products currently on discount</p>';
        if (removeAllBtn) {
            removeAllBtn.style.display = 'none';
        }
        paginationContainer.innerHTML = '';
        return;
    }

    // Show the remove all button when there are discounts (only if it exists and user has permission)
            if (removeAllBtn && getUserRole() !== 'staff') {
            removeAllBtn.style.display = 'inline-flex';
        } else if (removeAllBtn) {
            removeAllBtn.style.display = 'none';
        }

    // Desktop table
    let html = `
        <table class="discounts-table">
            <thead>
                <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Supplier Cost</th>
                    <th>Selling Price Before Discount</th>
                    <th>Discounted Price</th>
                    <th>Discount</th>
                    <th>Savings</th>
                    <th>Stock</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    products.forEach(product => {
        html += `
            <tr>
                <td><strong>${product.name}</strong></td>
                <td>${product.category_name || 'N/A'}</td>
                <td>$${parseFloat(product.supplier_cost || product.original_price).toFixed(2)}</td>
                <td>$${parseFloat(product.selling_price_before_discount || product.original_price).toFixed(2)}</td>
                <td><strong>$${parseFloat(product.price).toFixed(2)}</strong></td>
                <td><span class="discount-badge">${product.discount_percentage}% OFF</span></td>
                <td><span class="savings-amount">$${parseFloat(product.savings_amount).toFixed(2)}</span></td>
                <td>${product.stock}</td>
                <td>
                    ${getUserRole() !== 'staff' ? `
                    <button class="remove-discount-btn" onclick="removeDiscount(${product.id})">
                        <i class="fas fa-times"></i> Remove
                    </button>
                    ` : '<span class="text-muted">View Only</span>'}
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Mobile cards
    if (mobileContainer) {
        let mobileHtml = '';
        products.forEach(product => {
            mobileHtml += `
                <div class="mobile-discount-card">
                    <div class="product-info">
                        <p><strong>${product.name}</strong></p>
                        <p><strong>Category:</strong> ${product.category_name || 'N/A'}</p>
                        <p><strong>Stock:</strong> ${product.stock}</p>
                    </div>
                    <div class="discount-info">
                        <div>
                            <p><strong>Supplier Cost:</strong> $${parseFloat(product.supplier_cost || product.original_price).toFixed(2)}</p>
                            <p><strong>Selling Price:</strong> $${parseFloat(product.selling_price_before_discount || product.original_price).toFixed(2)}</p>
                            <p><strong>Discounted Price:</strong> $${parseFloat(product.price).toFixed(2)}</p>
                            <p><strong>Savings:</strong> <span class="savings-amount">$${parseFloat(product.savings_amount).toFixed(2)}</span></p>
                        </div>
                        <span class="discount-badge">${product.discount_percentage}% OFF</span>
                    </div>
                    ${getUserRole() !== 'staff' ? `
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-danger remove-discount-btn" onclick="removeDiscount(${product.id})">
                            <i class="fas fa-times"></i> Remove
                        </button>
                    </div>
                    ` : '<div class="text-muted text-center mt-2">View Only</div>'}
                </div>
            `;
        });
        mobileContainer.innerHTML = mobileHtml;
    }

    // Render pagination if pagination data is available
    if (pagination) {
        renderDiscountsPagination(pagination.total_count, currentDiscountsPage);
    } else {
        paginationContainer.innerHTML = '';
    }
}

// Render pagination for discounts table
function renderDiscountsPagination(totalCount, currentPage) {
    const paginationContainer = document.getElementById('discounts-pagination');
    const totalPages = Math.ceil(totalCount / discountsPageSize);

    paginationContainer.innerHTML = '';

    if (totalPages <= 1) {
        return;
    }

    const isMobile = window.innerWidth < 768;
    const maxButtons = isMobile ? 3 : 5;

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">«</a>`;
    prevLi.addEventListener('click', e => {
        e.preventDefault();
        if (currentPage > 1) loadCurrentDiscounts(currentPage - 1);
    });
    paginationContainer.appendChild(prevLi);

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
        li.innerHTML = `<a class="page-link" href="#" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">${i}</a>`;
        li.addEventListener('click', e => {
            e.preventDefault();
            loadCurrentDiscounts(i);
        });
        paginationContainer.appendChild(li);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">»</a>`;
    nextLi.addEventListener('click', e => {
        e.preventDefault();
        if (currentPage < totalPages) loadCurrentDiscounts(currentPage + 1);
    });
    paginationContainer.appendChild(nextLi);

    // Load More button for mobile when there are more pages
    if (isMobile && totalPages > endPage) {
        const loadMoreLi = document.createElement('li');
        loadMoreLi.className = 'page-item';
        loadMoreLi.innerHTML = `<a class="page-link" href="#" style="padding: 6px 10px; font-size: 0.9rem;">Load More</a>`;
        loadMoreLi.addEventListener('click', e => {
            e.preventDefault();
            loadCurrentDiscounts(currentPage + 1);
        });
        paginationContainer.appendChild(loadMoreLi);
    }
}



async function applySingleDiscount() {
    const form = document.getElementById('single-discount-form');
    const formData = new FormData(form);
    
    const data = {
        product_id: parseInt(formData.get('product_id')),
        discount_percentage: parseFloat(formData.get('discount_percentage'))
    };
    
    if (!data.product_id || !data.discount_percentage) {
        showMessage('Please select a product and enter a discount percentage', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/staff/discounts/apply-single', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(result.message, 'success');
            form.reset();
            loadCurrentDiscounts();
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error applying discount:', error);
        showMessage('Failed to apply discount', 'error');
    }
}

async function applyCategoryDiscount() {
    const form = document.getElementById('category-discount-form');
    const formData = new FormData(form);
    
    const data = {
        category_id: parseInt(formData.get('category_id')),
        discount_percentage: parseFloat(formData.get('discount_percentage'))
    };
    
    if (!data.category_id || !data.discount_percentage) {
        showMessage('Please select a category and enter a discount percentage', 'error');
        return;
    }
    
    // Show confirmation for bulk action
    const categoryName = document.querySelector(`#category-select option[value="${data.category_id}"]`).textContent;
    const confirmed = await showConfirmation(
        `Apply ${data.discount_percentage}% discount to ALL products in "${categoryName}" category?`
    );
    
    if (!confirmed) return;
    
    try {
        const response = await fetch('/api/staff/discounts/apply-category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(result.message, 'success');
            form.reset();
            loadCurrentDiscounts();
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error applying category discount:', error);
        showMessage('Failed to apply category discount', 'error');
    }
}

async function applyBrandDiscount() {
    const form = document.getElementById('brand-discount-form');
    const formData = new FormData(form);
    
    const data = {
        brand_name: formData.get('brand_name'),
        discount_percentage: parseFloat(formData.get('discount_percentage'))
    };
    
    if (!data.brand_name || !data.discount_percentage) {
        showMessage('Please select a brand and enter a discount percentage', 'error');
        return;
    }
    
    if (data.discount_percentage < 1 || data.discount_percentage > 50) {
        showMessage('Discount percentage must be between 1% and 50%', 'error');
        return;
    }
    
    // Show confirmation for bulk action
    const confirmed = await showConfirmation(
        `Apply ${data.discount_percentage}% discount to ALL ${data.brand_name} products?`
    );
    
    if (!confirmed) return;
    
    try {
        const response = await fetch('/api/staff/discounts/apply-brand', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(result.message, 'success');
            form.reset();
            loadCurrentDiscounts();
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error applying brand discount:', error);
        showMessage('Failed to apply brand discount', 'error');
    }
}

async function removeDiscount(productId) {
    const confirmed = await showConfirmation('Remove discount from this product? This will restore the original selling price.');
    if (!confirmed) return;
    
    try {
        const response = await fetch('/api/staff/discounts/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ product_id: productId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(result.message, 'success');
            // Auto-refresh the list to show the updated state
            try {
                loadCurrentDiscounts();
            } catch (refreshError) {
                console.warn('Auto-refresh failed, but discount was removed successfully:', refreshError);
                // Manual refresh button is available if needed
            }
        } else {
            showMessage('Error: ' + result.error, 'error');
            // Even if there's an error, try to refresh to show current state
            setTimeout(() => {
                try {
                    loadCurrentDiscounts();
                } catch (refreshError) {
                    console.warn('Delayed refresh failed:', refreshError);
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Error removing discount:', error);
        showMessage('Failed to remove discount', 'error');
    }
}

// showMessage function is now provided by staff_messages.js
// This provides backward compatibility while using the standardized system

function showConfirmation(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmation-modal');
        const messageElement = document.getElementById('confirmation-message');
        const confirmButton = document.getElementById('confirm-action-btn');
        
        messageElement.textContent = message;
        modal.style.display = 'flex';
        
        const handleConfirm = () => {
            modal.style.display = 'none';
            confirmButton.removeEventListener('click', handleConfirm);
            resolve(true);
        };
        
        confirmButton.addEventListener('click', handleConfirm);
    });
}

function closeConfirmationModal() {
    document.getElementById('confirmation-modal').style.display = 'none';
}

// Quick action functions
async function applyQuickDiscount(percentage) {
    const confirmed = await showConfirmation(
        `Apply ${percentage}% discount to ALL products? This will override existing discounts.`
    );
    
    if (!confirmed) return;
    
    showMessage('Applying discount to all products...', 'success');
    
    // Apply to all categories (assuming categories 1, 2, 3 exist)
    const categories = [1, 2, 3]; // Laptops, Desktops, Accessories
    
    for (const categoryId of categories) {
        try {
            await fetch('/api/staff/discounts/apply-category', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    category_id: categoryId,
                    discount_percentage: percentage
                })
            });
        } catch (error) {
            console.error(`Error applying discount to category ${categoryId}:`, error);
        }
    }
    
    showMessage(`${percentage}% discount applied to all products!`, 'success');
    loadCurrentDiscounts();
}

// Modal Control Functions
function openDiscountModal() {
    const modal = document.getElementById('discount-modal');
    if (!modal) {
        console.warn('Discount modal not found - user may not have permission to access discount management');
        return;
    }
    modal.style.display = 'flex';

    // Load products for modal dropdown
    loadModalProductsForSelection();

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeDiscountModal() {
    const modal = document.getElementById('discount-modal');
    if (!modal) return;

    modal.style.display = 'none';

    // Restore body scroll
    document.body.style.overflow = 'auto';
}

// Modal Form Functions
// Smart Discount Function - Handles Both Single and Bulk
async function applySmartDiscount() {
    const form = document.getElementById('modal-single-discount-form');
    const formData = new FormData(form);
    const discountPercentage = parseFloat(formData.get('discount_percentage'));

    if (!discountPercentage || discountPercentage <= 0 || discountPercentage >= 100) {
        showMessage('Please enter a valid discount percentage (1-99)', 'error');
        return;
    }

    // Check if we have bulk selections
    if (selectedProducts.size > 0) {
        // Apply bulk discount
        await applyBulkDiscountLogic(discountPercentage);
    } else {
        // Apply single product discount
        const productId = parseInt(formData.get('product_id'));
        if (!productId) {
            showMessage('Please select a product first', 'error');
            return;
        }
        await applySingleDiscountLogic(productId, discountPercentage);
    }
}

// Single Product Discount Logic
async function applySingleDiscountLogic(productId, discountPercentage) {
    const applyBtn = document.getElementById('apply-discount-btn');

    // Show loading state
    if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
    }

    try {
        const response = await fetch('/api/staff/discounts/apply-single', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId,
                discount_percentage: discountPercentage
            })
        });

        const result = await response.json();

        if (result.success) {
            showMessage(result.message, 'success');

            // Reset form and close modal
            const form = document.getElementById('modal-single-discount-form');
            if (form) form.reset();

            // Refresh the discounts list to show the new discount
            loadCurrentDiscounts();
            closeDiscountModal();
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error applying single discount:', error);
        showMessage('Failed to apply discount', 'error');
    } finally {
        // Reset button state
        if (applyBtn) {
            applyBtn.disabled = false;
            updateApplyButtonText();
        }
    }
}

// Bulk Discount Logic (reused from previous bulk function)
async function applyBulkDiscountLogic(discountPercentage) {
    const applyBtn = document.getElementById('apply-discount-btn');

    // Show loading state
    if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
    }

    try {
        const productIds = [...selectedProducts].map(p => parseInt(p.id));

        const response = await fetch('/api/staff/discounts/apply-bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_ids: productIds,
                discount_percentage: discountPercentage
            })
        });

        const result = await response.json();

        if (result.success) {
            showMessage(`Bulk discount of ${discountPercentage}% applied to ${selectedProducts.size} products successfully!`, 'success');

            // Clear selections and form
            clearAllSelections();
            const form = document.getElementById('modal-single-discount-form');
            if (form) form.reset();

            // Refresh data
            loadCurrentDiscounts();

            // Refresh search results to show updated prices
            const searchInput = document.getElementById('modal-product-search');
            if (searchInput && searchInput.value) {
                performSearch();
            }

        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error applying bulk discount:', error);
        showMessage('Failed to apply bulk discount', 'error');
    } finally {
        // Reset button state
        if (applyBtn) {
            applyBtn.disabled = false;
            updateApplyButtonText();
        }
    }
}

async function applyModalCategoryDiscount() {
    const form = document.getElementById('modal-category-discount-form');
    const formData = new FormData(form);

    const data = {
        category_id: parseInt(formData.get('category_id')),
        discount_percentage: parseFloat(formData.get('discount_percentage'))
    };

    if (!data.category_id || !data.discount_percentage) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    if (data.discount_percentage < 1 || data.discount_percentage > 50) {
        showMessage('Discount percentage must be between 1% and 50%', 'error');
        return;
    }

    try {
        const response = await fetch('/api/staff/discounts/apply-category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showMessage(result.message, 'success');
            form.reset();
            loadCurrentDiscounts();
            loadModalProductsForSelection();
            closeDiscountModal();
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error applying category discount:', error);
        showMessage('Failed to apply category discount', 'error');
    }
}

async function applyModalBrandDiscount() {
    const form = document.getElementById('modal-brand-discount-form');
    const formData = new FormData(form);

    const data = {
        brand_name: formData.get('brand_name'),
        discount_percentage: parseFloat(formData.get('discount_percentage'))
    };

    if (!data.brand_name || !data.discount_percentage) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

            if (data.discount_percentage < 1 || data.discount_percentage > 50) {
            showMessage('Discount percentage must be between 1% and 50%', 'error');
            return;
        }

    try {
        const response = await fetch('/api/staff/discounts/apply-brand', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showMessage(result.message, 'success');
            form.reset();
            loadCurrentDiscounts();
            loadModalProductsForSelection();
            closeDiscountModal();
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error applying brand discount:', error);
        showMessage('Failed to apply brand discount', 'error');
    }
}

// Product search state
let searchState = {
    currentSearch: '',
    currentCategory: '',
    currentOffset: 0,
    totalResults: 0,
    currentLimit: 10,
    currentPage: 1,
    totalPages: 1,
    discountOnly: false,
    isLoading: false,
    searchTimeout: null,
    categories: [],
    recentlyUsed: []
};

async function loadModalProductsForSelection() {
    try {
        // Load recently used products and discount counts
        await loadRecentlyUsedProducts();
        await loadDiscountCounts();

        // Initialize search interface
        initializeProductSearch();

        // Don't show recently used by default - only when user clicks the filter button

    } catch (error) {
        console.error('Error loading products for modal:', error);
    }
}

async function loadDiscountCounts() {
    try {
        // Get count of all discounted products
        const response = await fetch('/api/staff/discounts/search-products?discount_only=true&limit=1');
        const data = await response.json();

        if (data.success) {
            updateFilterCounts(searchState.recentlyUsed.length, data.total);
        }
    } catch (error) {
        console.error('Error loading discount counts:', error);
    }
}

function updateFilterCounts(recentCount, discountCount) {
    const recentCountSpan = document.getElementById('recent-count');
    const discountCountSpan = document.getElementById('discount-count');

    if (recentCountSpan) {
        recentCountSpan.textContent = `(${recentCount})`;
    }

    if (discountCountSpan) {
        discountCountSpan.textContent = `(${discountCount})`;
    }
}

async function loadRecentlyUsedProducts() {
    try {
        const response = await fetch('/api/staff/discounts/recently-used');
        const data = await response.json();

        if (data.success && data.products.length > 0) {
            searchState.recentlyUsed = data.products;
            displayRecentlyUsedProducts();
        }
    } catch (error) {
        console.error('Error loading recently used products:', error);
    }
}

function displayRecentlyUsedProducts() {
    const list = document.getElementById('recently-used-list');

    if (!list || searchState.recentlyUsed.length === 0) return;

    list.innerHTML = '';

    searchState.recentlyUsed.forEach(product => {
        const item = document.createElement('div');
        item.className = 'recently-used-item';
        item.dataset.productId = product.id;

        item.innerHTML = `
            <div class="recently-used-name">${product.name}</div>
            <div class="recently-used-price">$${parseFloat(product.price).toFixed(2)}</div>
        `;

        item.addEventListener('click', () => {
            selectProduct(product);
        });

        list.appendChild(item);
    });
}



function initializeProductSearch() {
    const searchInput = document.getElementById('modal-product-search');
    const changeProductBtn = document.getElementById('change-product');
    const recentFilterBtn = document.getElementById('recent-filter-btn');
    const discountFilterBtn = document.getElementById('discount-filter-btn');
    const closeRecentBtn = document.getElementById('close-recent-btn');
    const resultsPerPageSelect = document.getElementById('results-per-page-select');

    if (!searchInput) return;

    // Search input event listener with debouncing
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        // Clear previous timeout
        if (searchState.searchTimeout) {
            clearTimeout(searchState.searchTimeout);
        }

        // Debounce search
        searchState.searchTimeout = setTimeout(() => {
            searchState.currentSearch = query;
            resetPagination();

            // Clear quick filter states when actively searching
            if (query.length > 0) {
                clearQuickFilterStates();
                hideRecentlyUsedSection();
            }

            if (query.length >= 2 || query.length === 0) {
                performProductSearch();
            } else if (query.length === 0) {
                hideSearchResults();
                // Don't automatically show recently used - user must click the filter button
            }
        }, 300);
    });

    // Quick filter buttons
    if (recentFilterBtn) {
        recentFilterBtn.addEventListener('click', () => {
            toggleQuickFilter('recent');
        });
    }

    if (discountFilterBtn) {
        discountFilterBtn.addEventListener('click', () => {
            toggleQuickFilter('discount');
        });
    }

    if (closeRecentBtn) {
        closeRecentBtn.addEventListener('click', () => {
            hideRecentlyUsedSection();
            clearQuickFilterStates();
        });
    }

    // Results per page selector
    if (resultsPerPageSelect) {
        resultsPerPageSelect.addEventListener('change', (e) => {
            searchState.currentLimit = parseInt(e.target.value);
            resetPagination();
            performProductSearch();
        });
    }

    // Bootstrap pagination will be handled by dynamically created elements
    // Event delegation for pagination clicks
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
        paginationContainer.addEventListener('click', handlePaginationClick);
    }



    // Change product button
    if (changeProductBtn) {
        changeProductBtn.addEventListener('click', () => {
            showSearchInterface();
        });
    }
}

function resetPagination() {
    searchState.currentOffset = 0;
    searchState.currentPage = 1;
}

function toggleQuickFilter(filterType) {
    const recentBtn = document.getElementById('recent-filter-btn');
    const discountBtn = document.getElementById('discount-filter-btn');

    if (filterType === 'recent') {
        // Check if already active - if so, deactivate
        if (recentBtn.classList.contains('active')) {
            recentBtn.classList.remove('active');
            hideRecentlyUsedSection();
            hideSearchResults();
            return;
        }

        // Activate recent filter
        clearQuickFilterStates();
        if (searchState.recentlyUsed.length > 0) {
            recentBtn.classList.add('active');
            showRecentlyUsedSection();
            hideSearchResults();
            searchState.discountOnly = false;
        }
    } else if (filterType === 'discount') {
        // Check if already active - if so, deactivate
        if (discountBtn.classList.contains('active')) {
            discountBtn.classList.remove('active');
            searchState.discountOnly = false;
            hideSearchResults();

            // Don't automatically show recently used - user must click the filter button
            return;
        }

        // Activate discount filter
        clearQuickFilterStates();
        discountBtn.classList.add('active');
        searchState.discountOnly = true;
        hideRecentlyUsedSection();
        resetPagination();

        // Trigger search to show discounted products
        if (searchState.currentSearch.length >= 2 || searchState.currentSearch.length === 0) {
            performProductSearch();
        } else {
            // If no search term, show all discounted products
            searchState.currentSearch = '';
            performProductSearch();
        }
    }
}

function clearQuickFilterStates() {
    const recentBtn = document.getElementById('recent-filter-btn');
    const discountBtn = document.getElementById('discount-filter-btn');

    if (recentBtn) recentBtn.classList.remove('active');
    if (discountBtn) discountBtn.classList.remove('active');

    searchState.discountOnly = false;
}

function showRecentlyUsedSection() {
    const section = document.getElementById('recently-used-section');
    if (section && searchState.recentlyUsed.length > 0) {
        section.style.display = 'block';
    }
}

function hideRecentlyUsedSection() {
    const section = document.getElementById('recently-used-section');
    if (section) {
        section.style.display = 'none';
    }
}

async function performProductSearch() {
    if (searchState.isLoading) return;

    searchState.isLoading = true;

    try {
        const params = new URLSearchParams({
            search: searchState.currentSearch,
            category_id: searchState.currentCategory,
            discount_only: searchState.discountOnly,
            limit: searchState.currentLimit,
            offset: searchState.currentOffset
        });

        const response = await fetch(`/api/staff/discounts/search-products?${params}`);
        const data = await response.json();

        if (data.success) {
            searchState.totalResults = data.total;
            searchState.totalPages = Math.ceil(data.total / searchState.currentLimit);

            displaySearchResults(data.products);
            updatePaginationControls();
        } else {
            showMessage('Error searching products: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error searching products:', error);
        showMessage('Failed to search products', 'error');
    } finally {
        searchState.isLoading = false;
    }
}

async function performProductSearchWithLoading() {
    if (searchState.isLoading) return;

    // Show loading state
    showPaginationLoading();

    try {
        await performProductSearch();

        // Smooth scroll to top of results
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    } finally {
        hidePaginationLoading();
    }
}

function displaySearchResults(products) {
    const resultsContainer = document.getElementById('search-results');
    const resultsList = document.getElementById('search-results-list');
    const resultsHeader = document.querySelector('.results-count');

    if (!resultsContainer || !resultsList) return;

    // Add loading class for smooth transition
    resultsList.classList.add('loading');

    // Small delay for smooth transition
    setTimeout(() => {
        // Clear previous results
        resultsList.innerHTML = '';

        // Update header
        if (resultsHeader) {
            const startIndex = searchState.currentOffset + 1;
            const endIndex = Math.min(searchState.currentOffset + products.length, searchState.totalResults);
            resultsHeader.textContent = `Search Results: (showing ${startIndex}-${endIndex} of ${searchState.totalResults})`;
        }

        // Add products with staggered animation
        products.forEach((product, index) => {
            setTimeout(() => {
                const item = createSearchResultItem(product);
                item.style.opacity = '0';
                item.style.transform = 'translateY(10px)';
                resultsList.appendChild(item);

                // Animate in
                setTimeout(() => {
                    item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, 10);
            }, index * 50); // Stagger by 50ms
        });

        // Remove loading class
        resultsList.classList.remove('loading');

        // Show results container
        resultsContainer.style.display = 'block';
    }, 100);
}

function appendSearchResults(products) {
    const resultsList = document.getElementById('search-results-list');
    const resultsHeader = document.querySelector('.results-count');

    if (!resultsList) return;

    // Update header
    if (resultsHeader) {
        const currentCount = resultsList.children.length;
        const newCount = currentCount + products.length;
        resultsHeader.textContent = `Search Results: (showing ${newCount} of ${searchState.totalResults})`;
    }

    // Add new products
    products.forEach(product => {
        const item = createSearchResultItem(product);
        resultsList.appendChild(item);
    });
}

function createSearchResultItem(product) {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.dataset.productId = product.id;

    const hasDiscount = product.original_price && parseFloat(product.original_price) > parseFloat(product.price);

    if (hasDiscount) {
        item.classList.add('has-discount');
    }

    // Calculate stock status
    const stock = parseInt(product.stock) || 0;
    let stockClass = 'out-of-stock';
    let stockText = 'Out of Stock';

    if (stock > 10) {
        stockClass = 'in-stock';
        stockText = `${stock} in stock`;
    } else if (stock > 0) {
        stockClass = 'low-stock';
        stockText = `${stock} left`;
    }

    // Build price display
    let priceHtml = `<div class="search-result-price">$${parseFloat(product.price).toFixed(2)}</div>`;

    if (hasDiscount) {
        const discountPercent = Math.round(((parseFloat(product.original_price) - parseFloat(product.price)) / parseFloat(product.original_price)) * 100);
        priceHtml += `<div class="search-result-original-price">$${parseFloat(product.original_price).toFixed(2)}</div>`;
        priceHtml += `<div class="search-result-discount-badge">${discountPercent}% OFF</div>`;
    }

    item.innerHTML = `
        <div class="product-selection">
            <input type="checkbox" class="product-checkbox" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}">
        </div>
        <div class="search-result-info">
            <div class="search-result-name">${product.name}</div>
            <div class="search-result-category">${product.category_name || 'No Category'}</div>
            <div class="search-result-stock ${stockClass}">${stockText}</div>
        </div>
        <div class="search-result-price-container">
            ${priceHtml}
        </div>
    `;

    // Handle checkbox clicks (prevent event bubbling)
    const checkbox = item.querySelector('.product-checkbox');
    checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        handleProductSelection(checkbox, product);
    });

    // Handle item clicks (for single selection)
    item.addEventListener('click', () => {
        selectProduct(product);
    });

    return item;
}

function selectProduct(product) {
    // Set hidden input value
    const hiddenInput = document.getElementById('modal-product-id');
    if (hiddenInput) {
        hiddenInput.value = product.id;
    }

    // Update selected product display
    const selectedContainer = document.getElementById('selected-product');
    const nameSpan = document.querySelector('.selected-product-name');
    const priceSpan = document.querySelector('.selected-product-price');

    if (selectedContainer && nameSpan && priceSpan) {
        // Store product ID in the container for preset buttons
        selectedContainer.dataset.productId = product.id;

        nameSpan.textContent = product.name;
        priceSpan.textContent = `$${parseFloat(product.price).toFixed(2)}`;
        selectedContainer.style.display = 'flex';
    }

    // Track product usage for recently used
    trackProductUsage(product.id);

    // Hide search interface
    hideSearchResults();
    hideRecentlyUsed();

    // Clear search input
    const searchInput = document.getElementById('modal-product-search');
    if (searchInput) {
        searchInput.value = '';
    }

    // Update apply button text
    updateApplyButtonText();
}

function hideRecentlyUsed() {
    const section = document.getElementById('recently-used-section');
    if (section) {
        section.style.display = 'none';
    }
}

function showSearchInterface() {
    const selectedContainer = document.getElementById('selected-product');
    const searchInput = document.getElementById('modal-product-search');

    if (selectedContainer) {
        selectedContainer.style.display = 'none';
    }

    // Clear any active filters - don't show recently used by default
    clearQuickFilterStates();

    if (searchInput) {
        searchInput.focus();
    }

    // Clear hidden input
    const hiddenInput = document.getElementById('modal-product-id');
    if (hiddenInput) {
        hiddenInput.value = '';
    }
}

function hideSearchResults() {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
}

function updatePaginationControls() {
    const footer = document.getElementById('search-results-footer');
    const paginationContainer = document.getElementById('pagination-container');
    const paginationInfo = document.getElementById('pagination-info-text');

    if (!footer || !paginationContainer) return;

    // Show footer if there are results
    if (searchState.totalResults > 0 && searchState.totalPages > 1) {
        footer.style.display = 'block';

        // Update pagination info
        if (paginationInfo) {
            const startIndex = searchState.currentOffset + 1;
            const endIndex = Math.min(searchState.currentOffset + searchState.currentLimit, searchState.totalResults);
            paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${searchState.totalResults} results`;
        }

        // Generate Bootstrap pagination
        generateBootstrapPagination();
    } else {
        footer.style.display = 'none';
    }
}

function generateBootstrapPagination() {
    const container = document.getElementById('pagination-container');
    if (!container) return;

    const currentPage = searchState.currentPage;
    const totalPages = searchState.totalPages;
    const isLoading = searchState.isLoading;

    let paginationHTML = '';

    // First page button
    paginationHTML += `
        <li class="page-item page-first ${currentPage === 1 || isLoading ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="1" aria-label="First">
                <i class="fas fa-angle-double-left"></i>
            </a>
        </li>
    `;

    // Previous page button
    paginationHTML += `
        <li class="page-item page-prev ${currentPage === 1 || isLoading ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                <i class="fas fa-angle-left"></i>
            </a>
        </li>
    `;

    // Calculate page range to show
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Add ellipsis before if needed
    if (startPage > 1) {
        paginationHTML += `
            <li class="page-item ${isLoading ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="1">1</a>
            </li>
        `;
        if (startPage > 2) {
            paginationHTML += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        const classes = `page-item ${isActive ? 'active page-current' : ''} ${isLoading ? 'loading' : ''} page-adjacent`;

        paginationHTML += `
            <li class="${classes}">
                <a class="page-link" href="#" data-page="${i}">
                    ${isLoading && isActive ? '<i class="fas fa-spinner fa-spin"></i>' : i}
                </a>
            </li>
        `;
    }

    // Add ellipsis after if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
        paginationHTML += `
            <li class="page-item ${isLoading ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
            </li>
        `;
    }

    // Next page button
    paginationHTML += `
        <li class="page-item page-next ${currentPage === totalPages || isLoading ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                <i class="fas fa-angle-right"></i>
            </a>
        </li>
    `;

    // Last page button
    paginationHTML += `
        <li class="page-item page-last ${currentPage === totalPages || isLoading ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${totalPages}" aria-label="Last">
                <i class="fas fa-angle-double-right"></i>
            </a>
        </li>
    `;

    container.innerHTML = paginationHTML;
}

function handlePaginationClick(event) {
    event.preventDefault();

    const target = event.target.closest('a.page-link');
    if (!target || searchState.isLoading) return;

    const pageItem = target.closest('.page-item');
    if (pageItem.classList.contains('disabled') || pageItem.classList.contains('active')) return;

    const targetPage = parseInt(target.dataset.page);
    if (isNaN(targetPage) || targetPage < 1 || targetPage > searchState.totalPages) return;

    // Update search state
    searchState.currentPage = targetPage;
    searchState.currentOffset = (targetPage - 1) * searchState.currentLimit;

    // Perform search with loading
    performProductSearchWithLoading();
}

function showPaginationLoading() {
    // Update pagination to show loading state
    generateBootstrapPagination();
}

function hidePaginationLoading() {
    // Update pagination controls will restore normal state
    updatePaginationControls();
}

async function trackProductUsage(productId) {
    try {
        await fetch('/api/staff/discounts/track-usage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ product_id: productId })
        });
    } catch (error) {
        console.error('Error tracking product usage:', error);
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('discount-modal-overlay')) {
        closeDiscountModal();
    }
});

// Volume Discount Management Functions
async function loadVolumeDiscountRules() {
    try {
        console.log('Loading volume discount rules...');
        const response = await fetch('/api/staff/volume-discounts');
        const data = await response.json();
        console.log('Volume discount rules response:', data);

        if (data.success) {
            console.log(`Found ${data.rules.length} active volume discount rules:`, data.rules);
            renderVolumeDiscountRules(data.rules);
        } else {
            console.error('Failed to load volume discount rules:', data.error);
            document.getElementById('volume-rules-container').innerHTML =
                '<p style="color: red;">Error loading volume discount rules.</p>';
        }
    } catch (error) {
        console.error('Error loading volume discount rules:', error);
        document.getElementById('volume-rules-container').innerHTML =
            '<p style="color: red;">Error loading volume discount rules.</p>';
    }
}

function renderVolumeDiscountRules(rules) {
    const container = document.getElementById('volume-rules-container');

    if (!rules || rules.length === 0) {
        container.innerHTML = '<p>No volume discount rules found. <a href="#" onclick="openAddVolumeRuleModal()">Add your first rule</a></p>';
        return;
    }

    let html = '<div class="volume-rules-list">';

    rules.forEach(rule => {
        html += `
            <div class="volume-rule-card" data-rule-id="${rule.id}">
                <div class="rule-header">
                    <div class="rule-info">
                        <h5>${rule.name}</h5>
                        <p class="rule-description">${rule.description || 'No description'}</p>
                    </div>
                    <div class="rule-actions">
                        <button class="btn btn-sm btn-danger" onclick="deleteVolumeRule(${rule.id}, '${rule.name}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                <div class="rule-details">
                    <div class="rule-detail">
                        <span class="detail-label">Minimum Amount:</span>
                        <span class="detail-value">$${rule.minimum_amount.toFixed(2)}</span>
                    </div>
                    <div class="rule-detail">
                        <span class="detail-label">Discount:</span>
                        <span class="detail-value">${rule.discount_percentage}%</span>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Add new volume rule modal (add-only, no editing)
window.openAddVolumeRuleModal = function openAddVolumeRuleModal() {
    document.getElementById('volume-discount-form').reset();
    document.getElementById('volume-discount-modal').style.display = 'flex';
    
    // Clear validation states
    const inputGroups = document.querySelectorAll('#volume-discount-modal .modern-input-group');
    inputGroups.forEach(group => {
        group.classList.remove('valid', 'error', 'has-value');
        const input = group.querySelector('.modern-input, .modern-textarea');
        if (input) {
            input.classList.remove('has-value');
        }
    });
}

// Close volume discount modal
window.closeVolumeDiscountModal = function closeVolumeDiscountModal() {
    document.getElementById('volume-discount-modal').style.display = 'none';
    document.getElementById('volume-discount-form').reset();
    
    // Clear validation states
    const inputGroups = document.querySelectorAll('#volume-discount-modal .modern-input-group');
    inputGroups.forEach(group => {
        group.classList.remove('valid', 'error', 'has-value');
        const input = group.querySelector('.modern-input, .modern-textarea');
        if (input) {
            input.classList.remove('has-value');
        }
    });
}





async function saveVolumeDiscountRule() {
    const formData = new FormData(document.getElementById('volume-discount-form'));

    const data = {
        name: formData.get('name'),
        minimum_amount: parseFloat(formData.get('minimum_amount')),
        discount_percentage: parseFloat(formData.get('discount_percentage')),
        description: formData.get('description')
    };

    try {
        const response = await fetch('/api/staff/volume-discounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showMessage(result.message, 'success');
            closeVolumeDiscountModal();
            loadVolumeDiscountRules();
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error saving volume discount rule:', error);
        showMessage('Error saving volume discount rule', 'error');
    }
}



// Make sure function is globally accessible
window.deleteVolumeRule = async function deleteVolumeRule(ruleId, ruleName) {
    console.log(`Attempting to delete volume discount rule: ID=${ruleId}, Name="${ruleName}"`);
    
    const confirmed = await showConfirmation(`Are you sure you want to delete the volume discount rule "${ruleName}"?`);
    if (!confirmed) {
        console.log('Delete operation cancelled by user');
        return;
    }

    try {
        console.log(`Sending DELETE request to /api/staff/volume-discounts/${ruleId}`);
        
        const response = await fetch(`/api/staff/volume-discounts/${ruleId}`, {
            method: 'DELETE'
        });

        console.log(`Response status: ${response.status}`);
        const result = await response.json();
        console.log('Response result:', result);

        if (result.success) {
            showMessage(result.message, 'success');
            console.log('Rule deleted successfully, reloading volume discount rules...');
            
            // Add a small delay to ensure the database transaction is committed
            await new Promise(resolve => setTimeout(resolve, 100));
            
            try {
                await loadVolumeDiscountRules();
                console.log('Volume discount rules reloaded successfully');
            } catch (reloadError) {
                console.error('Error reloading volume discount rules:', reloadError);
                showMessage('Rule deleted but failed to refresh the list', 'warning');
            }
        } else {
            showMessage('Error: ' + result.error, 'error');
            console.error('Delete failed:', result.error);
        }
    } catch (error) {
        console.error('Error deleting volume discount rule:', error);
        showMessage('Error deleting volume discount rule', 'error');
    }
}



// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeDiscountModal();
        closeVolumeDiscountModal();
    }
});

// Close volume discount modal when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const volumeModal = document.getElementById('volume-discount-modal');
    if (volumeModal) {
        volumeModal.addEventListener('click', function(e) {
            if (e.target === volumeModal) {
                closeVolumeDiscountModal();
            }
        });
    }
});

async function clearAllDiscounts() {
    const confirmed = await showConfirmation(
        'Remove ALL discounts? This will restore all products to their original selling prices. This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    try {
        console.log('Starting clearAllDiscounts function...');
        showMessage('Removing all discounts...', 'success');
        
        // Use the new efficient endpoint that removes all discounts at once
        console.log('Calling /api/staff/discounts/remove-all endpoint...');
        const response = await fetch('/api/staff/discounts/remove-all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response data:', result);
        
        if (result.success) {
            if (result.count > 0) {
                showMessage(`Successfully removed discounts from ${result.count} products!`, 'success');
                console.log(`Successfully removed discounts from ${result.count} products`);
            } else {
                showMessage('No discounts were removed', 'info');
                console.log('No discounts were removed');
            }
        } else {
            showMessage('Error: ' + result.error, 'error');
            console.error('API returned error:', result.error);
        }
        
        console.log('Reloading current discounts...');
        loadCurrentDiscounts();
    } catch (error) {
        console.error('Error clearing all discounts:', error);
        showMessage('Failed to clear all discounts', 'error');
    }
}

// Bulk Selection Functionality
let selectedProducts = new Set();

function initializeBulkSelection() {
    // Select All button
    const selectAllBtn = document.getElementById('select-all-btn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllProducts);
    }

    // Clear All button
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', clearAllSelections);
    }


}

function handleProductSelection(checkbox, product) {
    const productId = product.id;

    if (checkbox.checked) {
        selectedProducts.add({
            id: productId,
            name: product.name,
            price: product.price,
            category: product.category_name || 'No Category'
        });
    } else {
        selectedProducts.delete([...selectedProducts].find(p => p.id == productId));
    }

    updateBulkSelectionUI();
}

function selectAllProducts() {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            checkbox.checked = true;
            const productId = checkbox.dataset.productId;
            const productName = checkbox.dataset.productName;
            const productPrice = checkbox.dataset.productPrice;

            selectedProducts.add({
                id: productId,
                name: productName,
                price: productPrice,
                category: 'Unknown'
            });
        }
    });

    updateBulkSelectionUI();
}

function clearAllSelections() {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    selectedProducts.clear();
    updateBulkSelectionUI();
}

function updateBulkSelectionUI() {
    const count = selectedProducts.size;

    // Update selection info in search header
    const bulkSelectionInfo = document.getElementById('bulk-selection-info');
    const selectedCountSpan = document.querySelector('.selected-count strong');

    if (count > 0) {
        if (bulkSelectionInfo) bulkSelectionInfo.style.display = 'flex';
        if (selectedCountSpan) selectedCountSpan.textContent = count;

        // Show bulk operations section
        showBulkOperations();
    } else {
        if (bulkSelectionInfo) bulkSelectionInfo.style.display = 'none';

        // Hide bulk operations section
        hideBulkOperations();
    }

    // Update bulk operations section
    updateBulkOperationsSection();

    // Update the apply button text
    updateApplyButtonText();
}

function showBulkOperations() {
    const bulkOperations = document.getElementById('bulk-operations');
    if (bulkOperations) {
        bulkOperations.style.display = 'block';
    }
}

function hideBulkOperations() {
    const bulkOperations = document.getElementById('bulk-operations');
    if (bulkOperations) {
        bulkOperations.style.display = 'none';
    }
}

function updateBulkOperationsSection() {
    const count = selectedProducts.size;

    // Update count displays
    const bulkSelectedCount = document.querySelector('.bulk-selected-count');
    const bulkCountSpan = document.querySelector('.bulk-count');

    if (bulkSelectedCount) {
        bulkSelectedCount.textContent = `${count} product${count !== 1 ? 's' : ''} selected`;
    }

    if (bulkCountSpan) {
        bulkCountSpan.textContent = count;
    }

    // Update selected products list
    updateBulkProductsList();
}

function updateBulkProductsList() {
    const container = document.getElementById('bulk-selected-products');
    if (!container) return;

    container.innerHTML = '';

    if (selectedProducts.size === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6c757d;">No products selected</div>';
        return;
    }

    selectedProducts.forEach(product => {
        const item = document.createElement('div');
        item.className = 'bulk-product-item';
        item.innerHTML = `
            <div class="bulk-product-info">
                <div class="bulk-product-name">${product.name}</div>
                <div class="bulk-product-price">$${parseFloat(product.price).toFixed(2)}</div>
            </div>
            <button type="button" class="bulk-remove-btn" data-product-id="${product.id}" title="Remove from selection">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add remove button functionality
        const removeBtn = item.querySelector('.bulk-remove-btn');
        removeBtn.addEventListener('click', () => {
            removeFromBulkSelection(product.id);
        });

        container.appendChild(item);
    });
}

function removeFromBulkSelection(productId) {
    // Remove from selected products
    selectedProducts.delete([...selectedProducts].find(p => p.id == productId));

    // Uncheck the checkbox
    const checkbox = document.querySelector(`.product-checkbox[data-product-id="${productId}"]`);
    if (checkbox) {
        checkbox.checked = false;
    }

    updateBulkSelectionUI();
}

// Update Apply Button Text Based on Selection State
function updateApplyButtonText() {
    const applyBtn = document.getElementById('apply-discount-btn');

    if (!applyBtn) return;

    const bulkCount = selectedProducts.size;

    if (bulkCount > 0) {
        // Bulk mode
        applyBtn.innerHTML = `<i class="fas fa-percentage"></i> <span id="apply-discount-text">Apply to ${bulkCount} Product${bulkCount !== 1 ? 's' : ''}</span>`;
        applyBtn.className = 'btn btn-success'; // Change to green for bulk
    } else {
        // Single mode
        applyBtn.innerHTML = `<i class="fas fa-percentage"></i> <span id="apply-discount-text">Apply Discount</span>`;
        applyBtn.className = 'btn btn-primary'; // Blue for single
    }
}

// Responsive handling
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Re-render current data to adjust for screen size changes
        if (window.currentDiscountsData) {
            displayCurrentDiscounts(window.currentDiscountsData.products, window.currentDiscountsData.pagination);
        }
    }, 100);
});



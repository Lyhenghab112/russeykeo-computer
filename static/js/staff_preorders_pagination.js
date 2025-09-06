document.addEventListener('DOMContentLoaded', () => {
    const preordersTableBody = document.querySelector('tbody');
    const mobilePreordersList = document.getElementById('mobile-preorders-list');
    const paginationContainer = document.querySelector('.pagination');
    const statusFilter = document.getElementById('status-filter');

    let currentPage = 1;
    const pageSize = 10;

    // Initialize item counter
    let preordersItemCounter = null;
    if (window.ItemCounter) {
        preordersItemCounter = new ItemCounter('preorders-container', {
            itemName: 'pre-orders',
            itemNameSingular: 'pre-order',
            position: 'bottom',
            className: 'item-counter theme-success'
        });
    }

    // Fetch pre-orders with AJAX
    async function fetchPreorders(page = 1) {
        currentPage = page;
        const status = statusFilter ? statusFilter.value : '';

        const params = new URLSearchParams({
            page: page,
            page_size: pageSize,
            status: status,
            ajax: 'true'
        });

        try {
            const response = await fetch(`/api/staff/preorders?${params}`);
            const data = await response.json();

            if (data.success) {
                renderPreorders(data.preorders, data.pagination);
                renderPagination(data.pagination.total_count, currentPage);
                updatePreordersItemCounter(data.pagination);
            } else {
                console.error('Error fetching pre-orders:', data.error);
                preordersTableBody.innerHTML = '<tr><td colspan="9" class="text-center">Error loading pre-orders.</td></tr>';
                if (mobilePreordersList) mobilePreordersList.innerHTML = '<p class="text-center">Error loading pre-orders.</p>';
                updatePreordersItemCounter({ total_count: 0, page: 1, total_pages: 0 });
            }
        } catch (error) {
            console.error('Error:', error);
            preordersTableBody.innerHTML = '<tr><td colspan="9" class="text-center">Error loading pre-orders.</td></tr>';
            if (mobilePreordersList) mobilePreordersList.innerHTML = '<p class="text-center">Error loading pre-orders.</p>';
            updatePreordersItemCounter({ total_count: 0, page: 1, total_pages: 0 });
        }
    }

    // Update pre-orders item counter
    function updatePreordersItemCounter(pagination) {
        if (!preordersItemCounter) return;

        const totalItems = pagination.total_count || 0;
        const currentPageNum = pagination.page || currentPage;
        const totalPages = pagination.total_pages || Math.ceil(totalItems / pageSize);
        const startItem = totalItems === 0 ? 0 : ((currentPageNum - 1) * pageSize) + 1;
        const endItem = Math.min(currentPageNum * pageSize, totalItems);

        preordersItemCounter.update({
            totalItems: totalItems,
            currentPage: currentPageNum,
            pageSize: pageSize,
            totalPages: totalPages,
            startItem: startItem,
            endItem: endItem
        });
    }

    // Render pre-orders table and mobile cards
    function renderPreorders(preorders, pagination) {
        const isMobile = window.innerWidth < 768;
        
        // Store current data for responsive re-rendering
        window.currentPreordersData = preorders;
        
        if (preorders.length === 0) {
            preordersTableBody.innerHTML = '<tr><td colspan="9" class="text-center">No pre-orders found.</td></tr>';
            if (mobilePreordersList) mobilePreordersList.innerHTML = '<p class="text-center">No pre-orders found.</p>';
            return;
        }

        // Desktop table rows
        preordersTableBody.innerHTML = '';
        preorders.forEach(preorder => {
            const row = document.createElement('tr');
            row.className = 'preorder-row';
            row.innerHTML = `
                <td style="padding: 12px; text-align: left; border-bottom: 1px solid #888;">
                    <strong>#${preorder.id}</strong>
                </td>
                <td style="padding: 12px; text-align: left; border-bottom: 1px solid #888;">
                    <div>
                        <strong>${preorder.first_name} ${preorder.last_name}</strong>
                    </div>
                    <small class="text-muted">${preorder.email}</small><br>
                    <small class="text-muted">${preorder.phone || ''}</small>
                </td>
                <td style="padding: 12px; text-align: left; border-bottom: 1px solid #888;">
                    <div class="d-flex align-items-center">
                        <img src="/static/uploads/products/${preorder.product_photo || 'default.jpg'}"
                             alt="${preorder.product_name}"
                             class="product-image me-2"
                             style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                        <div>
                            <strong>${preorder.product_name}</strong><br>
                            <small class="text-muted">Current Stock: ${preorder.current_stock || 0}</small>
                        </div>
                    </div>
                </td>
                <td style="padding: 12px; text-align: left; border-bottom: 1px solid #888;">${preorder.quantity}</td>
                <td style="padding: 12px; text-align: left; border-bottom: 1px solid #888;">$${(parseFloat(preorder.expected_price) * parseInt(preorder.quantity)).toFixed(2)}</td>
                <td style="padding: 12px; text-align: left; border-bottom: 1px solid #888;">
                    ${preorder.deposit_amount && parseFloat(preorder.deposit_amount) > 0 ?
                        `<span class="text-success">$${parseFloat(preorder.deposit_amount).toFixed(2)}</span><br>
                         <small class="text-muted">${preorder.deposit_payment_method || ''}</small>` :
                        '<span class="text-muted">No deposit</span>'
                    }
                </td>
                <td style="padding: 12px; text-align: left; border-bottom: 1px solid #888;">
                    ${getStatusBadge(preorder.status)}
                </td>
                <td style="padding: 12px; text-align: left; border-bottom: 1px solid #888;">
                    <div>${formatDate(preorder.created_date)}</div>
                    <small class="text-muted">${formatTime(preorder.created_date)}</small>
                </td>
                <td style="padding: 12px; text-align: left; border-bottom: 1px solid #888;">
                    ${getActionButtons(preorder)}
                </td>
            `;
            preordersTableBody.appendChild(row);
        });

        // Mobile cards
        if (mobilePreordersList) {
            mobilePreordersList.innerHTML = '';
            preorders.forEach(preorder => {
                const card = document.createElement('div');
                card.className = 'mobile-preorder-card';
                card.innerHTML = `
                    <div class="preorder-header">
                        <div>
                            <h6><strong>Pre-Order #${preorder.id}</strong></h6>
                            <p><strong>Customer:</strong> ${preorder.first_name} ${preorder.last_name}</p>
                            <p><strong>Email:</strong> ${preorder.email}</p>
                            ${preorder.phone ? `<p><strong>Phone:</strong> ${preorder.phone}</p>` : ''}
                        </div>
                        ${getStatusBadge(preorder.status)}
                    </div>
                    <div class="preorder-product">
                        <img src="/static/uploads/products/${preorder.product_photo || 'default.jpg'}"
                             alt="${preorder.product_name}"
                             style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                        <div>
                            <p><strong>${preorder.product_name}</strong></p>
                            <p><strong>Quantity:</strong> ${preorder.quantity}</p>
                            <p><strong>Expected Price:</strong> $${(parseFloat(preorder.expected_price) * parseInt(preorder.quantity)).toFixed(2)}</p>
                            <p><strong>Stock:</strong> ${preorder.current_stock || 0}</p>
                        </div>
                    </div>
                    <div class="preorder-details">
                        <p><strong>Deposit:</strong> ${preorder.deposit_amount && parseFloat(preorder.deposit_amount) > 0 ?
                            `$${parseFloat(preorder.deposit_amount).toFixed(2)} (${preorder.deposit_payment_method || ''})` :
                            'No deposit'}</p>
                        <p><strong>Created:</strong> ${formatDate(preorder.created_date)} ${formatTime(preorder.created_date)}</p>
                    </div>
                    <div class="action-buttons">
                        ${getActionButtons(preorder)}
                    </div>
                `;
                mobilePreordersList.appendChild(card);
            });
        }
    }

    // Helper function to get status badge HTML
    function getStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge bg-warning text-dark status-badge"><i class="bi bi-hourglass-split"></i> Pending</span>',
            'confirmed': '<span class="badge bg-info status-badge"><i class="bi bi-check-circle"></i> Confirmed</span>',
            'partially_paid': '<span class="badge bg-primary status-badge"><i class="bi bi-credit-card"></i> Partially Paid</span>',
            'ready_for_pickup': '<span class="badge bg-success status-badge"><i class="bi bi-box-seam"></i> Ready</span>',
            'completed': '<span class="badge bg-success status-badge"><i class="bi bi-check-all"></i> Completed</span>',
            'cancelled': '<span class="badge bg-danger status-badge"><i class="bi bi-x-circle"></i> Cancelled</span>'
        };
        return badges[status] || `<span class="badge bg-secondary status-badge">${status}</span>`;
    }

    // Helper function to get action buttons HTML
    function getActionButtons(preorder) {
        const isMobile = window.innerWidth < 768;
        let buttons = `<button type="button" class="btn btn-info btn-sm" onclick="showPreOrderDetails('${preorder.id}')" title="View pre-order details" style="padding: ${isMobile ? '4px 8px' : '6px 12px'}; font-size: ${isMobile ? '0.8rem' : '0.9rem'};">
                        <i class="bi bi-eye"></i> View Details
                       </button>`;

        if (preorder.status === 'confirmed') {
            buttons += `<button type="button" class="btn btn-primary btn-sm" onclick="markReady('${preorder.id}')" title="Mark as ready for pickup" style="padding: ${isMobile ? '4px 8px' : '6px 12px'}; font-size: ${isMobile ? '0.8rem' : '0.9rem'};">
                         <i class="bi bi-box-seam"></i> Mark Ready
                        </button>`;
        } else if (preorder.status === 'ready_for_pickup') {
            buttons += `<button type="button" class="btn btn-success btn-sm" onclick="completePreOrder('${preorder.id}')" title="Complete pre-order" style="padding: ${isMobile ? '4px 8px' : '6px 12px'}; font-size: ${isMobile ? '0.8rem' : '0.9rem'};">
                         <i class="bi bi-check-all"></i> Complete
                        </button>`;
        }

        return `<div class="btn-group-vertical btn-group-sm">${buttons}</div>`;
    }

    // Helper functions for date/time formatting
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US');
    }

    function formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    // Responsive pagination
    function renderPagination(totalCount, currentPage) {
        const totalPages = Math.ceil(totalCount / pageSize);
        const paginationParent = paginationContainer?.parentElement;
        
        if (!paginationParent) return;
        
        paginationParent.innerHTML = '';
        if (totalPages <= 1) return;

        const isMobile = window.innerWidth < 768;
        const maxButtons = isMobile ? 3 : 5;

        const nav = document.createElement('nav');
        nav.className = 'mt-4';
        const ul = document.createElement('ul');
        ul.className = 'pagination justify-content-center';

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
        prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">«</a>`;
        prevLi.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage > 1) fetchPreorders(currentPage - 1);
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
            li.innerHTML = `<a class="page-link" href="#" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">${i}</a>`;
            li.addEventListener('click', e => {
                e.preventDefault();
                fetchPreorders(i);
            });
            ul.appendChild(li);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
        nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">»</a>`;
        nextLi.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage < totalPages) fetchPreorders(currentPage + 1);
        });
        ul.appendChild(nextLi);

        // Load More button for mobile when there are more pages
        if (isMobile && totalPages > endPage) {
            const loadMoreLi = document.createElement('li');
            loadMoreLi.className = 'page-item';
            loadMoreLi.innerHTML = `<a class="page-link" href="#" style="padding: 6px 10px; font-size: 0.9rem;">Load More</a>`;
            loadMoreLi.addEventListener('click', e => {
                e.preventDefault();
                fetchPreorders(currentPage + 1);
            });
            ul.appendChild(loadMoreLi);
        }

        nav.appendChild(ul);
        paginationParent.appendChild(nav);
    }

    // Status filter change handler
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            fetchPreorders(1);
        });
    }

    // Responsive handling
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.currentPreordersData) {
                renderPreorders(window.currentPreordersData, null);
            }
        }, 100);
    });

    // Initial load - only if we're on the staff preorders page
    if (preordersTableBody) {
        fetchPreorders(1);
    }
});

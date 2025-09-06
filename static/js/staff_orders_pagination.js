document.addEventListener('DOMContentLoaded', () => {
    const ordersTableBody = document.querySelector('tbody');
    const paginationContainer = document.getElementById('pagination');
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const dateFilter = document.getElementById('date-filter');
    // Apply filters button removed - filters now work immediately

    let currentPage = 1;
    const pageSize = 10;
    
    // Auto-apply completed filter on page load
    if (statusFilter && statusFilter.value === 'completed') {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            fetchOrders(1);
        }, 100);
    }

    function fetchOrders(page = 1) {
        const search = searchInput.value.trim();
        const status = statusFilter.value;
        const date = dateFilter.value;
        const approval = document.getElementById('approval-filter')?.value || 'all';

        const params = new URLSearchParams({
            page: page,
            page_size: pageSize,
            search: search,
            status: status,
            date: date,
            approval: approval
        });

        fetch(`/auth/staff/api/orders?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                console.log('API response:', data);
                if (data.success) {
                    renderOrders(data.orders);
                    renderPagination(data.total_orders, page);
                    currentPage = page; // Update current page
                } else {
                    ordersTableBody.innerHTML = '<tr><td colspan="10">Failed to load orders.</td></tr>';
                    paginationContainer.innerHTML = '';
                }
            })
            .catch(error => {
                console.error('Error fetching orders:', error);
                ordersTableBody.innerHTML = '<tr><td colspan="10">Error loading orders.</td></tr>';
                paginationContainer.innerHTML = '';
            });
    }

    // Make fetchOrders available globally for immediate filtering
    window.fetchOrdersFromPagination = fetchOrders;

    function renderOrders(orders) {
        const mobileOrdersList = document.getElementById('mobile-orders-list');
        const isMobile = window.innerWidth < 768;

        if (!orders || orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="10">No orders found.</td></tr>';
            if (mobileOrdersList) mobileOrdersList.innerHTML = '<p class="text-center">No orders found.</p>';
            return;
        }

        ordersTableBody.innerHTML = '';
        if (mobileOrdersList) mobileOrdersList.innerHTML = '';

        // Store current data for responsive re-rendering
        window.currentOrdersData = orders;

        orders.forEach((order, index) => {
            const serialNumber = (currentPage - 1) * pageSize + index + 1;

            // Desktop table row
            const tr = document.createElement('tr');

            // Create status badges
            const mainStatusBadge = getMainStatusBadge(order.status);

            // Create action buttons
            const actionButtons = getOrderActionButtons(order);

            // Create approval status badge
            const approvalStatusBadge = getApprovalStatusBadge(order.approval_status, order.status);

            tr.innerHTML = `
                <td>${serialNumber}</td>
                <td>${order.id}</td>
                <td>${order.first_name} ${order.last_name}</td>
                <td>${order.order_date}</td>
                <td>$${order.total.toFixed(2)}</td>
                <td>${order.payment_method || 'QR Payment'}</td>
                <td style="text-align: center;">${mainStatusBadge}</td>
                <td style="text-align: center;">${approvalStatusBadge}</td>
                <td>${actionButtons}</td>
            `;
            ordersTableBody.appendChild(tr);

            // Mobile card
            if (mobileOrdersList) {
                const card = document.createElement('div');
                card.className = 'mobile-card';

                const mainStatusBadge = getMainStatusBadge(order.status);
                const approvalStatusBadge = getApprovalStatusBadge(order.approval_status, order.status);

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <p><strong>Order #${order.id}</strong></p>
                            <p><strong>Customer:</strong> ${order.first_name} ${order.last_name}</p>
                            <p><strong>Date:</strong> ${order.order_date}</p>
                            <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
                            <p><strong>Payment:</strong> ${order.payment_method || 'QR Payment'}</p>
                            <p><strong>Payment Status:</strong> ${mainStatusBadge}</p>
                            <p><strong>Approval Status:</strong> ${approvalStatusBadge}</p>
                        </div>
                    </div>
                    <div class="action-buttons" style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <a href="/auth/staff/orders/${order.id}/details" class="btn btn-primary btn-sm">Details</a>
                        ${order.status.toLowerCase() !== 'cancelled' && order.status.toLowerCase() !== 'pending' && order.approval_status === 'Pending Approval' ?
                            `<button type="button" class="btn btn-success btn-sm" onclick="approveOrder(${order.id})">Confirm</button>
                             <button type="button" class="btn btn-danger btn-sm" onclick="rejectOrder(${order.id})">Reject</button>` :
                            ''
                        }
                    </div>
                `;
                mobileOrdersList.appendChild(card);
            }
        });

        // Status change handling removed - orders are automatically managed
    }

    function renderPagination(totalOrders, currentPage) {
        const totalPages = Math.ceil(totalOrders / pageSize);
        paginationContainer.innerHTML = '';

        if (totalPages <= 1) return;

        const isMobile = window.innerWidth < 768;
        const maxButtons = isMobile ? 3 : 5;

        // First button
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
        firstLi.innerHTML = `<a class="page-link" href="#" aria-label="First" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">First</a>`;
        firstLi.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage > 1) fetchOrders(1);
        });
        paginationContainer.appendChild(firstLi);

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
        prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">«</a>`;
        prevLi.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage > 1) fetchOrders(currentPage - 1);
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
                fetchOrders(i);
            });
            paginationContainer.appendChild(li);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
        nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">»</a>`;
        nextLi.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage < totalPages) fetchOrders(currentPage + 1);
        });
        paginationContainer.appendChild(nextLi);

        // Last button
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
        lastLi.innerHTML = `<a class="page-link" href="#" aria-label="Last" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">Last</a>`;
        lastLi.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage < totalPages) fetchOrders(totalPages);
        });
        paginationContainer.appendChild(lastLi);
    }

    // updateOrderStatus function removed - orders are automatically managed

    // Apply filters button removed - filters now trigger immediately via onchange events

    // Responsive handling
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Re-render current data to adjust for screen size changes
            if (window.currentOrdersData) {
                renderOrders(window.currentOrdersData);
            }
        }, 100);
    });

    // Initial fetch
    fetchOrders(currentPage);
});

// Helper functions for status badges and action buttons
function getMainStatusBadge(status) {
    const statusColors = {
        'pending': '#ffc107',
        'completed': '#28a745',
        'cancelled': '#dc3545'
    };
    const color = statusColors[status.toLowerCase()] || '#6c757d';
    return `<span style="background-color: ${color}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

function getApprovalStatusBadge(approvalStatus, orderStatus) {
    // Don't show approval status for cancelled orders
    if (orderStatus && orderStatus.toLowerCase() === 'cancelled') {
        return '<span style="color: #6c757d; font-size: 12px;">N/A</span>';
    }

    if (!approvalStatus) {
        return '<span style="color: #6c757d; font-size: 12px;">N/A</span>';
    }

    const approvalColors = {
        'Pending Approval': '#ffc107',
        'Approved': '#28a745',
        'Rejected': '#dc3545'
    };
    const color = approvalColors[approvalStatus] || '#6c757d';
    return `<span style="background-color: ${color}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">${approvalStatus}</span>`;
}

function getOrderActionButtons(order) {
    let buttons = '<div style="display: flex; flex-direction: column; gap: 5px; min-width: 120px;">';

    // Always show Details button
    buttons += `<a href="/auth/staff/orders/${order.id}/details" class="btn btn-primary btn-sm" style="width: 100%; text-align: center;">Details</a>`;

    // Debug logging
    console.log('🔍 Order debug info:', {
        id: order.id,
        status: order.status,
        approval_status: order.approval_status,
        userRole: window.userRole
    });

    // Add approval buttons for orders that need approval:
    // - Not cancelled
    // - Payment status is COMPLETED (not pending)
    // - Approval status is 'Pending Approval' (not already approved)
    console.log('Order status:', order.status, 'Approval status:', order.approval_status, 'User role:', window.userRole);
    if (order.status.toLowerCase() !== 'cancelled' && 
        order.status.toLowerCase() !== 'pending' &&
        order.approval_status === 'Pending Approval') {
        console.log('✅ Adding approval buttons for order:', order.id);
        buttons += `<button type="button" class="btn btn-success btn-sm" onclick="approveOrder(${order.id})" style="width: 100%;">Confirm</button>`;
        buttons += `<button type="button" class="btn btn-danger btn-sm" onclick="rejectOrder(${order.id})" style="width: 100%;">Reject</button>`;
    } else {
        console.log('❌ Skipping approval buttons for order:', order.id, '- Status:', order.status, 'Approval:', order.approval_status);
    }

    buttons += '</div>';
    return buttons;
}

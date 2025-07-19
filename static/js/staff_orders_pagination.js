document.addEventListener('DOMContentLoaded', () => {
    const ordersTableBody = document.querySelector('tbody');
    const paginationContainer = document.getElementById('pagination');
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const dateFilter = document.getElementById('date-filter');
    const applyFiltersBtn = document.getElementById('apply-filters');

    let currentPage = 1;
    const pageSize = 10;

    function fetchOrders(page = 1) {
        const search = searchInput.value.trim();
        const status = statusFilter.value;
        const date = dateFilter.value;

        const params = new URLSearchParams({
            page: page,
            page_size: pageSize,
            search: search,
            status: status,
            date: date
        });

        fetch(`/auth/staff/api/orders?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                console.log('API response:', data);
                if (data.success) {
                    renderOrders(data.orders);
                    renderPagination(data.total_orders, page);
                } else {
                    ordersTableBody.innerHTML = '<tr><td colspan="8">Failed to load orders.</td></tr>';
                    paginationContainer.innerHTML = '';
                }
            })
            .catch(error => {
                console.error('Error fetching orders:', error);
                ordersTableBody.innerHTML = '<tr><td colspan="8">Error loading orders.</td></tr>';
                paginationContainer.innerHTML = '';
            });
    }

    function renderOrders(orders) {
        const mobileOrdersList = document.getElementById('mobile-orders-list');
        const isMobile = window.innerWidth < 768;

        if (!orders || orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="8">No orders found.</td></tr>';
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
            tr.innerHTML = `
                <td>${serialNumber}</td>
                <td>${order.id}</td>
                <td>${order.first_name} ${order.last_name}</td>
                <td>${order.order_date}</td>
                <td>$${order.total.toFixed(2)}</td>
                <td>${order.payment_method || 'QR Payment'}</td>
                <td>
                    <span class="status-badge status-${order.status.toLowerCase()}">
                        ${order.status.charAt(0).toUpperCase() + order.status.slice(1).toLowerCase()}
                    </span>
                </td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 5px; min-width: 120px;">
                        <a href="/auth/staff/orders/${order.id}/details" class="btn btn-primary btn-sm" style="width: 100%; text-align: center;">Details</a>
                        ${order.status.toLowerCase() === 'pending' ?
                            `<button type="button" class="btn btn-danger btn-sm" onclick="cancelOrder(${order.id})" style="width: 100%;">Cancel Order</button>` :
                            ''
                        }
                    </div>
                </td>
            `;
            ordersTableBody.appendChild(tr);

            // Mobile card
            if (mobileOrdersList) {
                const card = document.createElement('div');
                card.className = 'mobile-card';
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <p><strong>Order #${order.id}</strong></p>
                            <p><strong>Customer:</strong> ${order.first_name} ${order.last_name}</p>
                            <p><strong>Date:</strong> ${order.order_date}</p>
                            <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
                            <p><strong>Payment:</strong> ${order.payment_method || 'QR Payment'}</p>
                        </div>
                        <span class="status-badge status-${order.status.toLowerCase()}">
                            ${order.status.charAt(0).toUpperCase() + order.status.slice(1).toLowerCase()}
                        </span>
                    </div>
                    <div class="action-buttons">
                        <a href="/auth/staff/orders/${order.id}/details" class="btn btn-primary btn-sm">Details</a>
                        ${order.status.toLowerCase() === 'pending' ?
                            `<button type="button" class="btn btn-danger btn-sm" onclick="cancelOrder(${order.id})">Cancel</button>` :
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

    applyFiltersBtn.addEventListener('click', () => {
        fetchOrders(1);
    });

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

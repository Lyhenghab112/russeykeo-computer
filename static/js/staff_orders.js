// Make applyFilters function global so it can be called from HTML onchange attributes
function applyFilters() {
    // Use the pagination script's fetchOrders function to avoid page refresh
    if (typeof window.fetchOrdersFromPagination === 'function') {
        window.fetchOrdersFromPagination(1); // Reset to page 1 when filtering
    } else {
        // Fallback to page refresh if pagination script isn't loaded
        const status = document.getElementById('status-filter').value;
        const date = document.getElementById('date-filter').value;
        const search = document.getElementById('search-input').value.trim();

        let url = '/auth/staff/orders';
        const params = new URLSearchParams();

        if (status && status !== 'all') {
            params.append('status', status);
        }
        if (date) {
            params.append('date', date);
        }
        if (search) {
            params.append('search', search);
        }

        // Append a large page size to try and fetch all orders
        params.append('page_size', '10000');

        if (params.toString()) {
            url += '?' + params.toString();
        }

        window.location.href = url;
    }
}

document.addEventListener('DOMContentLoaded', function() {

    document.getElementById('search-btn').addEventListener('click', applyFilters);

    // Add immediate search functionality
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 500); // Wait 500ms after user stops typing
    });

    // Also trigger search on Enter key
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            applyFilters();
        }
    });

    // Set initial filter values from URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('status')) {
        document.getElementById('status-filter').value = urlParams.get('status');
    }
    if (urlParams.has('date')) {
        document.getElementById('date-filter').value = urlParams.get('date');
    }
    if (urlParams.has('approval')) {
        document.getElementById('approval-filter').value = urlParams.get('approval');
    }

    // Handle details button clicks
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const orderId = this.dataset.orderId;
            window.location.href = `/staff/orders/${orderId}/details`;
        });
    });


});

// Order cancellation function
function cancelOrder(orderId) {
    // Create a custom modal for cancellation
    const modalHtml = `
        <div id="cancelModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%;">
                <h3 style="margin-bottom: 20px; color: #dc3545;">Cancel Order #${orderId}</h3>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Reason for cancellation:</label>
                    <select id="cancelReason" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="Out of stock">Out of stock</option>
                        <option value="Customer request">Customer request</option>
                        <option value="Payment issue">Payment issue</option>
                        <option value="Supplier issue">Supplier issue</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Additional notes (optional):</label>
                    <textarea id="cancelNotes" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 80px;" placeholder="Enter any additional details..."></textarea>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
                    <p style="margin: 0; color: #dc3545; font-weight: bold;">This action cannot be undone.</p>
                </div>
                <div style="text-align: right;">
                    <button onclick="closeCancelModal()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin-right: 10px; cursor: pointer;">Cancel</button>
                    <button onclick="confirmCancellation(${orderId})" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Confirm Cancellation</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeCancelModal() {
    const modal = document.getElementById('cancelModal');
    if (modal) {
        modal.remove();
    }
}

function confirmCancellation(orderId) {
    const reason = document.getElementById('cancelReason').value;
    const notes = document.getElementById('cancelNotes').value;

    // Disable the confirm button to prevent double-clicks
    const confirmBtn = document.querySelector(`button[onclick="confirmCancellation(${orderId})"]`);
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Cancelling...';
    }

    fetch(`/api/staff/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            reason: reason,
            notes: notes
        })
    })
    .then(response => response.json())
    .then(data => {
        closeCancelModal();
        if (data.success) {
            // Show single success notification
            showNotification('Order cancelled successfully! Customer has been notified.', 'success');
            
            // Refresh the Money Insight Widget dashboard to update totals
            if (window.refreshMoneyInsightDashboard) {
                window.refreshMoneyInsightDashboard();
            }
            
            setTimeout(() => location.reload(), 1500); // Refresh after showing notification
        } else {
            showNotification('Error cancelling order: ' + data.error, 'error');
        }
    })
    .catch(error => {
        closeCancelModal();
        console.error('Error:', error);
        showNotification('Error cancelling order', 'error');
    });
}

// showNotification function is now provided by staff_messages.js
// This provides backward compatibility while using the standardized system

// Order approval functions
async function approveOrder(orderId) {
    try {
        const response = await fetch(`/api/orders/${orderId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();

        if (result.success) {
            showMessage('✅ Order approved successfully!', 'success');
            // Refresh the orders list to update the UI
            if (typeof window.fetchOrdersFromPagination === 'function') {
                window.fetchOrdersFromPagination(1);
            }
        } else {
            showMessage('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error approving order:', error);
        showMessage('❌ An error occurred while approving the order.', 'error');
    }
}

async function rejectOrder(orderId) {
    try {
        const response = await fetch(`/api/orders/${orderId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();

        if (result.success) {
            showMessage('✅ Order rejected successfully!', 'success');
            // Refresh the orders list to update the UI
            if (typeof window.fetchOrdersFromPagination === 'function') {
                window.fetchOrdersFromPagination(1);
            }
        } else {
            showMessage('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error rejecting order:', error);
        showMessage('❌ An error occurred while rejecting the order.', 'error');
    }
}

async function completeOrder(orderId) {
    try {
        const response = await fetch(`/api/orders/${orderId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();

        if (result.success) {
            showMessage('✅ Order marked as completed successfully!', 'success');
            // Refresh the orders list to update the UI
            if (typeof window.fetchOrdersFromPagination === 'function') {
                window.fetchOrdersFromPagination(1);
            }
        } else {
            showMessage('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error completing order:', error);
        showMessage('❌ An error occurred while completing the order.', 'error');
    }
}

function showMessage(message, type) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data="dismiss" aria-label="close"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
    
    // Handle close button
    notification.querySelector('.btn-close').addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}

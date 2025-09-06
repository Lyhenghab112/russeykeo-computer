function showOrderDetails(hourIndex) {
    // Show loading modal or message
    const modal = document.getElementById('todaysOrdersDetailModal');
    const modalTitle = document.getElementById('todaysOrdersDetailTitle');
    const modalContent = document.getElementById('todaysOrdersDetailContent');

    modalTitle.textContent = `Sale Details for ${formatHour(hourIndex)}`;
    modalContent.innerHTML = '<p>Loading sale details...</p>';
    modal.style.display = 'block';

    // Fetch sale details from backend API
    fetch(`/api/orders/today_details?hour=${hourIndex}`)
        .then(response => response.json())
        .then(data => {
            console.log('Fetched orders data:', data.orders); // Debug log
            if (data.success && data.orders && data.orders.length > 0) {
                let html = '<table style="width: 100%; border-collapse: collapse;">';
                html += '<thead><tr><th style="border: 1px solid #ddd; padding: 8px;">Order ID</th><th style="border: 1px solid #ddd; padding: 8px;">Customer</th><th style="border: 1px solid #ddd; padding: 8px;">Total</th><th style="border: 1px solid #ddd; padding: 8px;">Action</th></tr></thead>';
                html += '<tbody>';
                let grandTotalSum = 0;
                data.orders.forEach(order => {
                    // Calculate grand total for this order by summing quantity * price of items
                    let orderGrandTotal = 0;
                    order.items.forEach(item => {
                        orderGrandTotal += item.quantity * item.price;
                    });
                    html += `<tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${order.id}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${order.customer_name}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">$${order.total_amount.toFixed(2)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">
                            <button class="detail-button" data-order-id="${order.id}" style="background-color: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Detail</button>
                        </td>
                    </tr>`;
                    grandTotalSum += orderGrandTotal;
                });
                html += '</tbody>';
                // Add footer row for grand total sum
                html += `<tfoot>
                    <tr>
                        <td colspan="2" style="border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: right;">Grand Total</td>
                        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">$${grandTotalSum.toFixed(2)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;"></td>
                    </tr>
                </tfoot></table>`;
                modalContent.innerHTML = html;
            } else {
                modalContent.innerHTML = '<p>No sale details available for this hour.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching sale details:', error);
            modalContent.innerHTML = '<p>Error loading sale details.</p>';
        });
}

// Helper function to format hour index to 12-hour format with AM/PM
function formatHour(hour) {
    let hour12 = hour % 12;
    if (hour12 === 0) hour12 = 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${hour12}:00 ${ampm}`;
}

// Helper function to format full timestamp to 12-hour format with AM/PM
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    if (hours === 0) hours = 12;

    const minutesStr = minutes.toString().padStart(2, '0');
    return `${hours}:${minutesStr} ${ampm}`;
}

// Close modal when clicking outside modal content or on close button
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('todaysOrdersDetailModal');
    const closeButton = document.getElementById('todaysOrdersDetailClose');

    closeButton.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Add event listener for detail buttons (event delegation)
    document.getElementById('todaysOrdersDetailContent').addEventListener('click', function(event) {
        if (event.target && event.target.classList.contains('detail-button')) {
            const orderId = event.target.getAttribute('data-order-id');
            fetchOrderDetails(orderId);
        }
    });

    // Add close button event listener for product details modal
    const productModal = document.getElementById('productDetailsModal');
    const productCloseButton = document.getElementById('productDetailsClose');
    productCloseButton.onclick = () => {
        productModal.style.display = 'none';
    };

    // Close product modal when clicking outside modal content
    window.addEventListener('click', (event) => {
        if (event.target === productModal) {
            productModal.style.display = 'none';
        }
    });
});

// Function to show product details modal
function showProductDetails(orderId) {
    const productModal = document.getElementById('productDetailsModal');
    const productModalTitle = document.getElementById('productDetailsTitle');
    const productModalContent = document.getElementById('productDetailsContent');

    productModalTitle.textContent = `Products in Order #${orderId}`;
    productModalContent.innerHTML = '<p>Loading product details...</p>';
    productModal.style.display = 'block';

    fetch(`/api/orders/today_details/${orderId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.products && data.products.length > 0) {
                let html = '<table style="width: 100%; border-collapse: collapse;">';
                html += '<thead><tr><th style="border: 1px solid #ddd; padding: 8px;">Product Name</th><th style="border: 1px solid #ddd; padding: 8px;">Quantity</th><th style="border: 1px solid #ddd; padding: 8px;">Price</th><th style="border: 1px solid #ddd; padding: 8px;">Original Price</th><th style="border: 1px solid #ddd; padding: 8px;">Total Amount</th></tr></thead>';
                html += '<tbody>';
                let totalPriceSum = 0;
                let totalProfit = 0;
                data.products.forEach(product => {
                    const totalPrice = product.quantity * product.price;
                    totalPriceSum += totalPrice;

                    // Calculate profit for this item
                    let originalPriceDisplay = 'N/A';
                    let itemProfit = 0;
                    if (product.original_price) {
                        originalPriceDisplay = `$${product.original_price.toFixed(2)}`;
                        itemProfit = (product.price - product.original_price) * product.quantity;
                        totalProfit += itemProfit;
                    }

                    html += `<tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${product.product_name}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${product.quantity}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">$${product.price.toFixed(2)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${originalPriceDisplay}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">$${totalPrice.toFixed(2)}</td>
                    </tr>`;
                });
                html += '</tbody>';
                // Add footer row for total price sum
                html += `<tfoot>
                    <tr>
                        <td colspan="4" style="border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: right;">Grand Total</td>
                        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">$${totalPriceSum.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="4" style="border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: right; color: ${totalProfit >= 0 ? 'green' : 'red'};">Total Profit</td>
                        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; color: ${totalProfit >= 0 ? 'green' : 'red'};">$${totalProfit.toFixed(2)}</td>
                    </tr>
                </tfoot></table>`;
                productModalContent.innerHTML = html;
            } else {
                productModalContent.innerHTML = '<p>No product details available for this order.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching product details:', error);
            productModalContent.innerHTML = '<p>Error loading product details.</p>';
        });
}

document.addEventListener('DOMContentLoaded', () => {
    const chartContainer = document.querySelector('.chart-container');
    const messageEl = document.getElementById('todaysOrdersMessage');

    function fetchAndRender() {
        fetch('/api/orders/today_count')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data.length > 0) {
                    messageEl.style.display = 'none';

                    // Create detailed view instead of chart
                    renderDetailedOrdersView(data.data);
                } else {
                    messageEl.style.display = 'block';
                    chartContainer.innerHTML = '<p id="todaysOrdersMessage" style="text-align: center; margin-top: 20px;">No order data available for today.</p>';
                }
            })
            .catch(error => {
                console.error('Error fetching today\'s orders count:', error);
                messageEl.style.display = 'block';
                chartContainer.innerHTML = '<p id="todaysOrdersMessage" style="text-align: center; margin-top: 20px;">Error loading order data.</p>';
            });
    }

    function renderDetailedOrdersView(hourlyData) {
        // Create a container for the detailed view
        let detailsContainer = document.getElementById('todaysOrdersDetails');
        if (!detailsContainer) {
            detailsContainer = document.createElement('div');
            detailsContainer.id = 'todaysOrdersDetails';
            detailsContainer.style.cssText = `
                height: 100%;
                overflow: hidden;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                display: flex;
                flex-direction: column;
            `;
            chartContainer.innerHTML = '';
            chartContainer.appendChild(detailsContainer);
        }

        // Fetch detailed orders for each hour that has orders
        const hoursWithOrders = hourlyData.filter(h => h.order_count > 0);

        if (hoursWithOrders.length === 0) {
            detailsContainer.innerHTML = '<p style="text-align: center; padding: 20px;">No orders found for today.</p>';
            return;
        }

        detailsContainer.innerHTML = '<p style="text-align: center; padding: 10px;">Loading detailed order information...</p>';

        // Fetch detailed information for all hours with orders
        Promise.all(
            hoursWithOrders.map(hourData =>
                fetch(`/api/orders/today_details?hour=${hourData.hour}`)
                    .then(response => response.json())
                    .then(data => ({
                        hour: hourData.hour,
                        orderCount: hourData.order_count,
                        details: data
                    }))
            )
        ).then(allHourDetails => {
            renderAllOrdersTable(allHourDetails, detailsContainer);
        }).catch(error => {
            console.error('Error fetching detailed orders:', error);
            detailsContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: red;">Error loading detailed order information.</p>';
        });
    }

    function getPaymentStatus(orderStatus) {
        // Map order status to payment status
        if (orderStatus && orderStatus.toLowerCase() === 'completed') {
            return 'Success';
        } else if (orderStatus && orderStatus.toLowerCase() === 'cancelled') {
            return 'Cancelled';
        } else {
            return 'Pending';
        }
    }

    function getPaymentStatusStyle(paymentStatus) {
        // Return styling for payment status
        if (paymentStatus === 'Success') {
            return 'color: #28a745; font-weight: bold;'; // Green for success
        } else if (paymentStatus === 'Cancelled') {
            return 'color: #dc3545; font-weight: bold;'; // Red for cancelled
        } else {
            return 'color: #ffc107; font-weight: bold;'; // Orange for pending
        }
    }

    function renderAllOrdersTable(allHourDetails, container) {
        let html = `
            <div style="padding: 15px; height: 100%; display: flex; flex-direction: column;">
                <h4 style="margin-top: 0; margin-bottom: 15px; color: #333; flex-shrink: 0;"></h4>
                <div style="flex: 1; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; background: white; min-height: 0; max-height: 400px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead style="position: sticky; top: 0; background: white; z-index: 10;">
                            <tr style="background-color: #f8f9fa;">
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f8f9fa;">Time</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f8f9fa;">Order ID</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f8f9fa;">Customer</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: right; background-color: #f8f9fa;">Total</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: center; background-color: #f8f9fa;">Payment Method</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: center; background-color: #f8f9fa;">Payment Status</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: center; background-color: #f8f9fa;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        let grandTotal = 0;
        let totalOrders = 0;

        // Reverse the order to show most recent hours first
        const reversedHourDetails = [...allHourDetails].reverse();

        reversedHourDetails.forEach(hourInfo => {
            if (hourInfo.details.success && hourInfo.details.orders && hourInfo.details.orders.length > 0) {
                // Reverse the orders within each hour to show most recent orders first
                const reversedOrders = [...hourInfo.details.orders].reverse();

                reversedOrders.forEach((order, index) => {
                    html += `<tr style="border-bottom: 1px solid #eee;">`;

                    // Display individual order timestamp instead of grouped hour
                    const orderTimestamp = order.order_date || order.timestamp;
                    const timeLabel = orderTimestamp ? formatTimestamp(orderTimestamp) : formatHour(hourInfo.hour);

                    html += `<td style="border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa; font-weight: bold;">${timeLabel}</td>`;

                    const paymentStatus = getPaymentStatus(order.status);
                    const paymentStatusStyle = getPaymentStatusStyle(paymentStatus);

                    html += `
                        <td style="border: 1px solid #ddd; padding: 8px;">#${order.id}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${order.customer_name}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${order.total_amount.toFixed(2)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${order.payment_method || 'QR Payment'}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; ${paymentStatusStyle}">${paymentStatus}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">
                            <button class="detail-button" data-order-id="${order.id}"
                                style="background-color: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">
                                View Details
                            </button>
                        </td>
                    </tr>`;

                    grandTotal += parseFloat(order.total_amount);
                    totalOrders++;
                });
            }
        });

        html += `
                        </tbody>
                    </table>
                </div>
                <!-- Summary footer outside scrollable area -->
                <div style="margin-top: 10px; padding: 12px; background-color: #e9ecef; border-radius: 4px; border: 1px solid #ddd; flex-shrink: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-weight: bold;">
                        <span style="color: #333;">Total Orders: ${totalOrders}</span>
                        <span style="color: #28a745; font-size: 16px;">Grand Total: $${grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Add event listeners for detail buttons
        container.addEventListener('click', function(event) {
            if (event.target && event.target.classList.contains('detail-button')) {
                const orderId = event.target.getAttribute('data-order-id');
                showProductDetails(orderId);
            }
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

    fetchAndRender();

    // Refresh the data every 5 minutes (300000 ms)
    setInterval(fetchAndRender, 300000);
});

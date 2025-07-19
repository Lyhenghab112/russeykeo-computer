/**
 * Monthly Revenue Widget JavaScript
 * Handles the "This Month Revenue" table functionality
 */

// Global variable to store monthly revenue data
let monthlyRevenueData = [];

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the monthly revenue widget
    initializeMonthlyRevenue();

    function initializeMonthlyRevenue() {
        console.log('Initializing Monthly Revenue widget...');

        // Fetch and render current month revenue data
        fetchCurrentMonthRevenue();

        // Set up CSV export button
        const exportButton = document.getElementById('exportMonthlyRevenueCSV');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                console.log('Export button clicked, data:', monthlyRevenueData);
                exportMonthlyRevenueToCSV(monthlyRevenueData);
            });
        } else {
            console.error('Export button not found with ID: exportMonthlyRevenueCSV');
        }
    }

    function fetchCurrentMonthRevenue() {
        console.log('Fetching current month revenue data...');

        fetch('/auth/staff/api/reports/current_month_revenue')
            .then(response => response.json())
            .then(data => {
                console.log("Current month revenue data:", data);
                if (data.success && data.revenue.length > 0) {
                    monthlyRevenueData = data.revenue;
                    renderMonthlyRevenueTable(monthlyRevenueData);
                    hideMessage();
                } else {
                    console.error('Failed to fetch current month revenue:', data.error || 'No data received');
                    showMessage('No revenue data available for this month.');
                    clearTable();
                }
            })
            .catch(error => {
                console.error('Error fetching current month revenue:', error);
                showMessage('Error loading revenue data.');
                clearTable();
            });
    }

    function renderMonthlyRevenueTable(revenue) {
        const tableBody = document.getElementById('monthlyRevenueTable');
        if (!tableBody) {
            console.error("Table element with ID 'monthlyRevenueTable' not found.");
            return;
        }

        try {
            // Clear existing content
            tableBody.innerHTML = '';

            if (revenue.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="3">No revenue data available for this month.</td></tr>';
                return;
            }

            // Sort revenue by date
            revenue.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Calculate totals
            let totalOrders = 0;
            let totalRevenue = 0;

            // Populate table rows
            revenue.forEach(day => {
                totalOrders += day.orders_count;
                totalRevenue += day.daily_revenue;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${day.date_formatted}</td>
                    <td>${day.orders_count}</td>
                    <td>$${day.daily_revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                `;

                // Add click handler for row details
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    showDayDetailModal(day.date, day.date_formatted);
                });

                tableBody.appendChild(row);
            });

            // Add total row
            const totalRow = document.createElement('tr');
            totalRow.className = 'total-row';
            totalRow.innerHTML = `
                <td><strong>Total</strong></td>
                <td><strong>${totalOrders}</strong></td>
                <td><strong>$${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
            `;
            tableBody.appendChild(totalRow);

            // Apply CSS class to table for styling
            const table = tableBody.closest('table');
            if (table && !table.classList.contains('this-month-revenue-table')) {
                table.classList.add('this-month-revenue-table');
            }

        } catch (error) {
            console.error("Error creating monthly revenue table:", error);
            tableBody.innerHTML = '<tr><td colspan="3">Error loading revenue data.</td></tr>';
        }
    }

    function showDayDetailModal(date, dateFormatted) {
        console.log(`Showing details for ${dateFormatted} (${date})`);
        
        // Fetch detailed sales for this specific day
        fetch(`/auth/staff/api/reports/daily_sales_detail?date=${date}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    createDayDetailModal(dateFormatted, data.sales_detail);
                } else {
                    alert('Failed to fetch sales details: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error fetching sales details:', error);
                alert('Error fetching sales details: ' + error);
            });
    }

    function createDayDetailModal(dateFormatted, salesData) {
        // Create backdrop
        let backdrop = document.getElementById('monthlyRevenueBackdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'monthlyRevenueBackdrop';
            backdrop.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background-color: rgba(0, 0, 0, 0.5) !important;
                z-index: 9999 !important;
                display: none !important;
            `;
            backdrop.onclick = () => {
                backdrop.style.display = 'none';
                const modal = document.getElementById('monthlyRevenueModal');
                if (modal) modal.style.display = 'none';
            };
            document.body.appendChild(backdrop);
        }

        let modal = document.getElementById('monthlyRevenueModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'monthlyRevenueModal';
            modal.style.cssText = `
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                background: white !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
                z-index: 10000 !important;
                max-width: 90% !important;
                max-height: 80% !important;
                overflow-y: auto !important;
                padding: 20px !important;
                display: none !important;
            `;
            document.body.appendChild(modal);
        }

        // Clear modal content
        modal.innerHTML = '';

        // Add title
        const title = document.createElement('h3');
        title.textContent = `Sales Details - ${dateFormatted}`;
        title.style.marginBottom = '20px';
        modal.appendChild(title);

        // Add close button
        const closeButton = document.createElement('span');
        closeButton.innerHTML = '&times;';
        closeButton.style.cssText = `
            position: absolute !important;
            top: 10px !important;
            right: 15px !important;
            font-size: 24px !important;
            cursor: pointer !important;
            color: #666 !important;
        `;
        closeButton.onclick = () => {
            backdrop.style.display = 'none';
            modal.style.display = 'none';
        };
        modal.appendChild(closeButton);

        // Create table for sales details
        const table = document.createElement('table');
        table.style.cssText = `
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 10px !important;
        `;

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Order ID</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Customer</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Total</th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Actions</th>
        `;
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        
        if (salesData.length === 0) {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = '<td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: center;">No sales data for this day</td>';
            tbody.appendChild(noDataRow);
        } else {
            salesData.forEach(sale => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="border: 1px solid #ddd; padding: 8px;">${sale.order_id}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${sale.customer_name}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">$${parseFloat(sale.grand_total).toFixed(2)}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">
                        <button onclick="showOrderDetailsModal(${sale.order_id})"
                                style="background-color: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                            Detail
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        table.appendChild(tbody);
        modal.appendChild(table);

        // Show modal
        backdrop.style.display = 'block';
        modal.style.display = 'block';
    }

    function exportMonthlyRevenueToCSV(data) {
        console.log('exportMonthlyRevenueToCSV called with data:', data);

        if (!data || data.length === 0) {
            alert('No revenue data to export.');
            return;
        }

        const csvRows = [];
        csvRows.push(['Date', 'Orders Count', 'Daily Revenue']);

        data.forEach(item => {
            csvRows.push([
                item.date_formatted,
                item.orders_count,
                item.daily_revenue.toFixed(2)
            ]);
        });

        console.log('CSV rows prepared:', csvRows);
        downloadCSV(csvRows, 'this_month_revenue.csv');
    }

    function downloadCSV(csvRows, filename) {
        console.log('downloadCSV called with filename:', filename);

        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        console.log('CSV content:', csvContent);

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        document.body.appendChild(a);

        console.log('Triggering download...');
        a.click();

        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log('Download completed');
    }

    function showMessage(message) {
        const messageElement = document.getElementById('monthlyRevenueMessage');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.style.display = 'block';
        }
    }

    function hideMessage() {
        const messageElement = document.getElementById('monthlyRevenueMessage');
        if (messageElement) {
            messageElement.style.display = 'none';
        }
    }

    function clearTable() {
        const tableBody = document.getElementById('monthlyRevenueTable');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="3">No data available</td></tr>';
        }
    }
});

// Function to show order details modal
function showOrderDetailsModal(orderId) {
    fetch(`/auth/staff/api/order/${orderId}/details`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayOrderDetailsModal(orderId, data.order_details);
            } else {
                alert('Failed to fetch order details: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error fetching order details:', error);
            alert('Error fetching order details: ' + error);
        });
}

// Function to display the order details modal
function displayOrderDetailsModal(orderId, orderDetails) {
    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 15000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 800px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    closeBtn.onclick = () => document.body.removeChild(backdrop);

    // Modal title
    const title = document.createElement('h3');
    title.textContent = `Order Details - #${orderId}`;
    title.style.cssText = `
        margin: 0 0 20px 0;
        color: #333;
        border-bottom: 2px solid #007bff;
        padding-bottom: 10px;
    `;

    // Create table for order items
    const table = document.createElement('table');
    table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
    `;

    // Table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr style="background-color: #f8f9fa;">
            <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Product</th>
            <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Quantity</th>
            <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Unit Price</th>
            <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Original Price</th>
            <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Total</th>
        </tr>
    `;

    // Table body
    const tbody = document.createElement('tbody');
    let grandTotal = 0;
    let totalProfit = 0;

    orderDetails.forEach(item => {
        const itemTotal = item.quantity * item.price;
        grandTotal += itemTotal;

        // Calculate profit for this item
        let originalPriceDisplay = 'N/A';
        let itemProfit = 0;
        if (item.original_price) {
            originalPriceDisplay = `$${parseFloat(item.original_price).toFixed(2)}`;
            itemProfit = (item.price - item.original_price) * item.quantity;
            totalProfit += itemProfit;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="border: 1px solid #ddd; padding: 12px;">${item.product_name}</td>
            <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${item.quantity}</td>
            <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">$${parseFloat(item.price).toFixed(2)}</td>
            <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">${originalPriceDisplay}</td>
            <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">$${itemTotal.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });

    // Grand total row
    const totalRow = document.createElement('tr');
    totalRow.style.cssText = `
        background-color: #f8f9fa;
        font-weight: bold;
    `;
    totalRow.innerHTML = `
        <td colspan="4" style="border: 1px solid #ddd; padding: 12px; text-align: right;">Grand Total:</td>
        <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">$${grandTotal.toFixed(2)}</td>
    `;
    tbody.appendChild(totalRow);

    // Total profit row
    const profitRow = document.createElement('tr');
    profitRow.style.cssText = `
        background-color: #f8f9fa;
        font-weight: bold;
    `;
    const profitColor = totalProfit >= 0 ? 'green' : 'red';
    profitRow.innerHTML = `
        <td colspan="4" style="border: 1px solid #ddd; padding: 12px; text-align: right; color: ${profitColor};">Total Profit:</td>
        <td style="border: 1px solid #ddd; padding: 12px; text-align: right; color: ${profitColor};">$${totalProfit.toFixed(2)}</td>
    `;
    tbody.appendChild(profitRow);

    table.appendChild(thead);
    table.appendChild(tbody);

    // Assemble modal
    modal.appendChild(closeBtn);
    modal.appendChild(title);
    modal.appendChild(table);
    backdrop.appendChild(modal);

    // Add to page
    document.body.appendChild(backdrop);

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            document.body.removeChild(backdrop);
        }
    });
}

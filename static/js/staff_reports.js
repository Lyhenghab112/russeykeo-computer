// Global variables to store data for CSV export
let salesTrendsData = [];
let topProductsData = [];
let revenueByCategoryData = [];
let monthlySalesData = [];
let monthlyRevenueData = [];

document.addEventListener('DOMContentLoaded', function() {

    // Fetch and render sales trends
    fetch('/auth/staff/api/reports/sales_trends')
        .then(response => response.json())
        .then(data => {
            console.log("Sales trends data:", data);
            if (data.success && data.trends.length > 0) {
                salesTrendsData = data.trends;
                renderSalesTrendsChart(salesTrendsData);
                document.getElementById('salesTrendsMessage').style.display = 'none';
            } else {
                console.error('Failed to fetch sales trends:', data.error || 'No data received');
                document.getElementById('salesTrendsChart').style.display = 'none';
                document.getElementById('salesTrendsMessage').style.display = 'block';
            }
        });

    // Fetch and render monthly sales overview
    function fetchMonthlySales(startDate, endDate) {
        const url = `/auth/staff/api/reports/monthly_sales?start_date=${startDate}&end_date=${endDate}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.sales.length > 0) {
                    monthlySalesData = data.sales;
                    window.monthlySalesData = monthlySalesData; // For CSV export
                    renderMonthlySalesChart(monthlySalesData);
                    const messageEl = document.getElementById('monthlySalesMessage');
                    if (messageEl) messageEl.style.display = 'none';
                } else {
                    console.error('Failed to fetch monthly sales:', data.error || 'No data received');
                    const chartEl = document.getElementById('monthlySalesChart');
                    const messageEl = document.getElementById('monthlySalesMessage');
                    if (chartEl) chartEl.style.display = 'none';
                    if (messageEl) messageEl.style.display = 'block';
                }
            });
    }
    // Initial fetch for Jan to June 2025
    fetchMonthlySales('2025-01-01', '2025-06-30');

    // Fetch and render top-selling products
    fetch('/auth/staff/api/reports/top_products')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.products.length > 0) {
                topProductsData = data.products;
                populateTopProductsTable(topProductsData);
            } else {
                console.error('Failed to fetch top products:', data.error || 'No data received');
                const tableBody = document.getElementById('topProductsTable');
                tableBody.innerHTML = '<tr><td colspan="3">No top selling products data available.</td></tr>';
            }
        });

    // Fetch and render monthly revenue
    fetch('/auth/staff/api/reports/monthly_revenue')
        .then(response => response.json())
        .then(data => {
            console.log("Monthly revenue data:", data);
            if (data.success && data.revenue.length > 0) {
                monthlyRevenueData = data.revenue;
                renderMonthlyRevenueChart(monthlyRevenueData);
                document.getElementById('monthlyRevenueMessage').style.display = 'none';
            } else {
                console.error('Failed to fetch monthly revenue:', data.error || 'No data received');
                document.getElementById('monthlyRevenueChart').style.display = 'none';
                document.getElementById('monthlyRevenueMessage').style.display = 'block';
            }
        });

    // Fetch and render revenue by category
    fetch('/auth/staff/api/reports/revenue_by_category')
        .then(response => response.json())
        .then(data => {
        if (data.success && data.categories.length > 0) {
                revenueByCategoryData = data.categories;
                populateRevenueByCategoryTable(revenueByCategoryData);
                document.getElementById('revenueByCategoryMessage').style.display = 'none';
            } else {
                console.error('Failed to fetch revenue by category:', data.error || 'No data received');
                // Hide the table and show message
                const tableBody = document.getElementById('revenueByCategoryTable');
                if (tableBody) {
                    tableBody.innerHTML = '<tr><td colspan="2">No category revenue data available.</td></tr>';
                }
                document.getElementById('revenueByCategoryMessage').style.display = 'block';
            }
        });

    // Add event listeners for export buttons
    const exportSalesTrendsBtn = document.getElementById('exportSalesTrendsCSV');
    if (exportSalesTrendsBtn) {
        exportSalesTrendsBtn.addEventListener('click', () => {
            console.log('Export Sales Trends clicked, data:', salesTrendsData);
            exportSalesTrendsToCSV(salesTrendsData);
        });
    }

    const exportMonthlySalesBtn = document.getElementById('exportMonthlySalesCSV');
    if (exportMonthlySalesBtn) {
        exportMonthlySalesBtn.addEventListener('click', () => {
            console.log('Export Monthly Sales clicked, data:', monthlySalesData);
            exportMonthlySalesToCSV();
        });
    }

    const exportTopProductsBtn = document.getElementById('exportTopProductsCSV');
    if (exportTopProductsBtn) {
        exportTopProductsBtn.addEventListener('click', () => {
            console.log('Export Top Products clicked, data:', topProductsData);
            exportTopProductsToCSV(topProductsData);
        });
    }

    const exportRevenueByCategoryBtn = document.getElementById('exportRevenueByCategoryCSV');
    if (exportRevenueByCategoryBtn) {
        exportRevenueByCategoryBtn.addEventListener('click', () => {
            console.log('Export Revenue by Category clicked, data:', revenueByCategoryData);
            exportRevenueByCategoryToCSV(revenueByCategoryData);
        });
    }

    const exportMonthlyRevenueBtn = document.getElementById('exportMonthlyRevenueCSV');
    if (exportMonthlyRevenueBtn) {
        exportMonthlyRevenueBtn.addEventListener('click', () => {
            console.log('Export Monthly Revenue clicked, data:', monthlyRevenueData);
            exportMonthlyRevenueToCSV(monthlyRevenueData);
        });
    }
    // Function to render the Orders chart
    function renderOrdersChart(orders) {
        const ctx = document.getElementById('ordersChart');
        if (!ctx) {
            console.error("Canvas element with ID 'ordersChart' not found.");
            return;
        }
        const chartInstance = Chart.getChart(ctx); // Get existing chart instance
        if (chartInstance) {
            chartInstance.destroy(); // Destroy it if it exists
        }

        try {
            const labels = orders.map(order => order.status);
            const data = orders.map(order => order.count);

            new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Orders',
                        data: data,
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.2)', // completed
                            'rgba(255, 206, 86, 0.2)',  // pending
                            'rgba(255, 99, 132, 0.2)',  // cancelled
                            'rgba(153, 102, 255, 0.2)' // processing
                        ],
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(153, 102, 255, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: {
                            display: false // Hide legend as colors are intuitive
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Error creating orders chart:", error);
        }
    }

    // Fetch orders data
    fetch('/auth/staff/api/reports/orders_data')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.orders && data.orders.length > 0) {
                renderOrdersChart(data.orders);
                // Update pending orders count
                // The selector needs to be more robust. Let's assume the paragraph is directly within the widget.
                const ordersWidget = document.querySelector('.widget:has(h2:contains("Orders"))');
                if (ordersWidget) {
                    const pendingOrdersParagraph = ordersWidget.querySelector('p');
                    if (pendingOrdersParagraph && pendingOrdersParagraph.textContent.includes('Pending Orders:')) {
                        pendingOrdersParagraph.textContent = `Pending Orders: ${data.pending_orders_count}`;
                    } else {
                        // If the paragraph doesn't exist or has different text, we might need to create it or find it differently.
                        // For now, let's log a warning.
                        console.warn("Could not find or update the 'Pending Orders:' paragraph.");
                    }
                } else {
                    console.warn("Could not find the 'Orders' widget to update pending orders count.");
                }
            } else {
                console.error('Failed to fetch orders data:', data.error || 'No data received');
                // Optionally display a message if no orders data is available
                const ordersChartCanvas = document.getElementById('ordersChart');
                if (ordersChartCanvas) {
                    const ordersWidgetContent = ordersChartCanvas.closest('.widget-content');
                    if (ordersWidgetContent) {
                        ordersWidgetContent.innerHTML = '<p>No order data available.</p>';
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error fetching orders data:', error);
            const ordersChartCanvas = document.getElementById('ordersChart');
            if (ordersChartCanvas) {
                const ordersWidgetContent = ordersChartCanvas.closest('.widget-content');
                if (ordersWidgetContent) {
                    ordersWidgetContent.innerHTML = '<p>Error loading order data.</p>';
                }
            }
        });
});

// New function to render monthly sales chart
function renderMonthlySalesChart(sales) {
    const ctx = document.getElementById('monthlySalesChart');
    if (!ctx) {
        console.log("Canvas element with ID 'monthlySalesChart' not found. Chart rendering skipped.");
        return;
    }
    const chartInstance = Chart.getChart(ctx); // Get existing chart instance
    if (chartInstance) {
        chartInstance.destroy(); // Destroy it if it exists
    }

    try {
        // Sort sales by month string in 'YYYY-MM' format before rendering
        sales.sort((a, b) => {
            return a.month.localeCompare(b.month);
        });

        new Chart(ctx.getContext('2d'), {
            type: 'bar',  // Changed to 'bar' for bar chart
            data: {
                labels: sales.map(s => s.month),  // Use full month string YYYY-MM for unique labels
                datasets: [{
                    label: 'Total Sales',
                    data: sales.map(s => s.total_sales),
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (evt, elements) => {
                    if (elements.length > 0) {
                        const chart = elements[0].element.$context.chart;
                        const index = elements[0].index;
                        const month = chart.data.labels[index];
                        // Instead of navigating, fetch detailed sales data and show modal
                        fetch(`/auth/staff/api/reports/monthly_sales_detail?month=${month}`)
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    showMonthlySalesDetailModal(month, data.sales_detail);
                                } else {
                                    alert('Failed to fetch sales details: ' + data.error);
                                }
                            })
                            .catch(error => {
                                alert('Error fetching sales details: ' + error);
                            });
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error creating monthly sales chart:", error);
    }
}

function renderSalesTrendsChart(trends) {
    const ctx = document.getElementById('salesTrendsChart');
    if (!ctx) {
        console.error("Canvas element with ID 'salesTrendsChart' not found.");
        return;
    }
    const chartInstance = Chart.getChart(ctx); // Get existing chart instance
    if (chartInstance) {
        chartInstance.destroy(); // Destroy it if it exists
    }

    try {
        new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: trends.map(t => t.date),
            datasets: [{
                label: 'Daily Sales',
                data: trends.map(t => t.daily_sales),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Allow chart to fill container
            scales: {
                x: {
                 },
                 y: {

                }
            },
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
    } catch (error) {
        console.error("Error creating sales trends chart:", error);
    }
}

function renderMonthlyRevenueChart(revenue) {
    const ctx = document.getElementById('monthlyRevenueChart');
    if (!ctx) {
        console.error("Canvas element with ID 'monthlyRevenueChart' not found.");
        return;
    }
    const chartInstance = Chart.getChart(ctx); // Get existing chart instance
    if (chartInstance) {
        chartInstance.destroy(); // Destroy it if it exists
    }

    try {
        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: revenue.map(r => r.month_label),
                datasets: [{
                    label: 'Monthly Revenue',
                    data: revenue.map(r => r.monthly_revenue),
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (evt, elements) => {
                    if (elements.length > 0) {
                        const chart = elements[0].element.$context.chart;
                        const index = elements[0].index;
                        const month = revenue[index].month;
                        const monthLabel = revenue[index].month_label;
                        const monthlyRevenue = revenue[index].monthly_revenue;
                        // Show detailed revenue breakdown for the selected month
                        showMonthlyRevenueDetail(month, monthLabel, monthlyRevenue);
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Revenue: $' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error creating monthly revenue chart:", error);
    }
}

function populateRevenueByCategoryTable(categories) {
    const tableBody = document.getElementById('revenueByCategoryTable');
    tableBody.innerHTML = ''; // Clear existing data

    if (categories.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="2">No data available</td></tr>';
        return;
    }

    categories.forEach(category => {
        const row = `
            <tr>
                <td>${category.category_name}</td>
                <td>$${parseFloat(category.total_revenue).toFixed(2)}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function populateTopProductsTable(products) {
    const tableBody = document.getElementById('topProductsTable');
    tableBody.innerHTML = ''; // Clear existing data

    if (products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3">No data available</td></tr>';
        return;
    }

    products.forEach(product => {
        const row = `
            <tr>
                <td>${product.name}</td>
                <td>${product.quantity_sold}</td>
                <td>$${parseFloat(product.total_revenue).toFixed(2)}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// Export functions for CSV download

function exportSalesTrendsToCSV(data) {
    console.log('exportSalesTrendsToCSV called with data:', data);
    if (!data || data.length === 0) {
        alert('No sales trends data to export.');
        return;
    }
    const csvRows = [];
    csvRows.push(['Date', 'Daily Sales']);
    data.forEach(item => {
        csvRows.push([item.date, item.daily_sales]);
    });
    console.log('Sales trends CSV rows:', csvRows);
    downloadCSV(csvRows, 'sales_trends.csv');
}

function exportMonthlySalesToCSV() {
    console.log('exportMonthlySalesToCSV called');
    console.log('window.monthlySalesData:', window.monthlySalesData);
    console.log('global monthlySalesData:', monthlySalesData);

    const dataToUse = monthlySalesData.length > 0 ? monthlySalesData : window.monthlySalesData;

    if (!dataToUse || dataToUse.length === 0) {
        alert('No monthly sales data to export.');
        return;
    }
    const csvRows = [];
    csvRows.push(['Month', 'Total Sales']);
    dataToUse.forEach(item => {
        csvRows.push([item.month, item.total_sales]);
    });
    console.log('Monthly sales CSV rows:', csvRows);
    downloadCSV(csvRows, 'monthly_sales.csv');
}

function exportTopProductsToCSV(data) {
    console.log('exportTopProductsToCSV called with data:', data);
    if (!data || data.length === 0) {
        alert('No top products data to export.');
        return;
    }
    const csvRows = [];
    csvRows.push(['Product', 'Quantity Sold', 'Total Revenue']);
    data.forEach(item => {
        csvRows.push([item.name, item.quantity_sold, item.total_revenue]);
    });
    console.log('Top products CSV rows:', csvRows);
    downloadCSV(csvRows, 'top_products.csv');
}

function exportRevenueByCategoryToCSV(data) {
    console.log('exportRevenueByCategoryToCSV called with data:', data);
    if (!data || data.length === 0) {
        alert('No revenue by category data to export.');
        return;
    }
    const csvRows = [];
    csvRows.push(['Category', 'Total Revenue']);
    data.forEach(item => {
        csvRows.push([item.category_name, item.total_revenue]);
    });
    console.log('Revenue by category CSV rows:', csvRows);
    downloadCSV(csvRows, 'revenue_by_category.csv');
}

function exportMonthlyRevenueToCSV(data) {
    console.log('exportMonthlyRevenueToCSV called with data:', data);
    if (!data || data.length === 0) {
        alert('No monthly revenue data to export.');
        return;
    }
    const csvRows = [];
    csvRows.push(['Month', 'Monthly Revenue']);
    data.forEach(item => {
        csvRows.push([item.month_label, item.monthly_revenue]);
    });
    console.log('Monthly revenue CSV rows:', csvRows);
    downloadCSV(csvRows, 'monthly_revenue_jan_to_june.csv');
}

function downloadCSV(rows, filename) {
    console.log('downloadCSV called with filename:', filename);
    console.log('CSV rows:', rows);

    const csvContent = rows.map(e => e.map(v => `"${v}"`).join(',')).join('\n');
    console.log('CSV content:', csvContent);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);

    console.log('Triggering download for:', filename);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Download completed for:', filename);
}

function showMonthlySalesDetailModal(month, salesDetail) {
    console.log("Sales detail data received:", salesDetail);

    // Create backdrop
    let backdrop = document.getElementById('modalBackdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'modalBackdrop';
        backdrop.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
          
            z-index: 9999 !important;
            display: none !important;
        `;
        backdrop.onclick = () => {
            backdrop.style.display = 'none';
            const modal = document.getElementById('monthlySalesDetailModal');
            if (modal) modal.style.display = 'none';
        };
        document.body.appendChild(backdrop);
    }

    let modal = document.getElementById('monthlySalesDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'monthlySalesDetailModal';
        modal.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background-color: white !important;
            border: 1px solid #ccc !important;
            border-radius: 8px !important;
            padding: 20px !important;
            z-index: 10000 !important;
            max-height: 80vh !important;
            overflow-y: auto !important;
            width: 80vw !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
            display: none !important;
        `;
        document.body.appendChild(modal);
    }

    modal.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = `Sales Details for ${month}`;
    modal.appendChild(title);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.marginBottom = '10px';
    closeButton.onclick = () => {
        modal.style.display = 'none';
        backdrop.style.display = 'none';
    };
    modal.appendChild(closeButton);


    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['#', 'Order ID', 'Order Date', 'Customer Name', 'Grand Total', 'Total Profit', 'Actions'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.border = '1px solid #ccc';
        th.style.padding = '8px';
        th.style.textAlign = 'left';
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let grandTotalSum = 0;
    let totalProfitSum = 0;
    salesDetail.forEach((sale, index) => {
        const row = document.createElement('tr');

        // Format profit with color coding
        const profitColor = sale.total_profit >= 0 ? 'green' : 'red';
        const profitDisplay = `$${sale.total_profit.toFixed(2)}`;

        const cells = [index + 1, sale.order_id, sale.order_date, sale.customer_name, `$${sale.grand_total.toFixed(2)}`];
        cells.forEach((text, cellIndex) => {
            const td = document.createElement('td');
            td.textContent = text;
            td.style.border = '1px solid #ccc';
            td.style.padding = '8px';
            // Center align numeric columns
            if (cellIndex === 0 || cellIndex === 1 || cellIndex === 4) {
                td.style.textAlign = 'center';
            }
            row.appendChild(td);
        });

        // Add profit cell with color coding
        const profitTd = document.createElement('td');
        profitTd.textContent = profitDisplay;
        profitTd.style.border = '1px solid #ccc';
        profitTd.style.padding = '8px';
        profitTd.style.color = profitColor;
        profitTd.style.fontWeight = 'bold';
        profitTd.style.textAlign = 'center';
        row.appendChild(profitTd);

        // Add detail button cell
        const detailTd = document.createElement('td');
        detailTd.style.border = '1px solid #ccc';
        detailTd.style.padding = '8px';
        detailTd.style.textAlign = 'center';
        const detailButton = document.createElement('button');
        detailButton.textContent = 'Detail';
        detailButton.style.backgroundColor = '#28a745';
        detailButton.style.color = 'white';
        detailButton.style.border = 'none';
        detailButton.style.padding = '5px 10px';
        detailButton.style.borderRadius = '3px';
        detailButton.style.cursor = 'pointer';
        detailButton.style.fontSize = '12px';
            detailButton.addEventListener('click', () => {
                // Call a new function to fetch order details instead of customer purchase details
                fetchOrderDetails(sale.order_id);
            });
        detailTd.appendChild(detailButton);
        row.appendChild(detailTd);

        tbody.appendChild(row);

        grandTotalSum += sale.grand_total;
        totalProfitSum += sale.total_profit;
    });

    // Add grand total row below all sales
    const totalRow = document.createElement('tr');
    const totalLabelTd = document.createElement('td');
    totalLabelTd.textContent = 'Grand Total for Month';
    totalLabelTd.style.border = '1px solid #ccc';
    totalLabelTd.style.padding = '8px';
    totalLabelTd.style.fontWeight = 'bold';
    totalLabelTd.style.textAlign = 'right';
    totalLabelTd.colSpan = 4;  // Span columns 1-4 (#, Order ID, Order Date, Customer Name)
    totalRow.appendChild(totalLabelTd);

    const totalValueTd = document.createElement('td');
    totalValueTd.textContent = `$${grandTotalSum.toFixed(2)}`;
    totalValueTd.style.border = '1px solid #ccc';
    totalValueTd.style.padding = '8px';
    totalValueTd.style.fontWeight = 'bold';
    totalValueTd.style.textAlign = 'center';
    totalRow.appendChild(totalValueTd);

    // Empty cell for profit column
    const emptyTd = document.createElement('td');
    emptyTd.style.border = '1px solid #ccc';
    emptyTd.style.padding = '8px';
    totalRow.appendChild(emptyTd);

    // Empty cell for actions column
    const emptyActionsTd = document.createElement('td');
    emptyActionsTd.style.border = '1px solid #ccc';
    emptyActionsTd.style.padding = '8px';
    totalRow.appendChild(emptyActionsTd);

    tbody.appendChild(totalRow);

    // Add total profit row
    const profitRow = document.createElement('tr');
    const profitLabelTd = document.createElement('td');
    profitLabelTd.textContent = 'Total Profit for Month';
    profitLabelTd.style.border = '1px solid #ccc';
    profitLabelTd.style.padding = '8px';
    profitLabelTd.style.fontWeight = 'bold';
    profitLabelTd.style.textAlign = 'right';
    profitLabelTd.style.color = totalProfitSum >= 0 ? 'green' : 'red';
    profitLabelTd.colSpan = 5;  // Span columns 1-5 (#, Order ID, Order Date, Customer Name, Grand Total)
    profitRow.appendChild(profitLabelTd);

    const profitValueTd = document.createElement('td');
    profitValueTd.textContent = `$${totalProfitSum.toFixed(2)}`;
    profitValueTd.style.border = '1px solid #ccc';
    profitValueTd.style.padding = '8px';
    profitValueTd.style.fontWeight = 'bold';
    profitValueTd.style.textAlign = 'center';
    profitValueTd.style.color = totalProfitSum >= 0 ? 'green' : 'red';
    profitRow.appendChild(profitValueTd);

    // Empty cell for actions column
    const emptyProfitActionsTd = document.createElement('td');
    emptyProfitActionsTd.style.border = '1px solid #ccc';
    emptyProfitActionsTd.style.padding = '8px';
    profitRow.appendChild(emptyProfitActionsTd);

    tbody.appendChild(profitRow);

    table.appendChild(tbody);

    modal.appendChild(table);

    backdrop.style.display = 'block';
    modal.style.display = 'block';
}

// New function to fetch and show order details
function fetchOrderDetails(orderId) {
    // Check if this is a pre-order (starts with "PO-")
    if (orderId.toString().startsWith('PO-')) {
        // Extract the numeric ID from "PO-24" format
        const preOrderId = orderId.toString().replace('PO-', '');
        fetch(`/auth/staff/api/pre_order/${preOrderId}/details`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showPreOrderDetailsModal(orderId, data.pre_order);
                } else {
                    alert('Failed to fetch pre-order details: ' + data.error);
                }
            })
            .catch(error => {
                alert('Error fetching pre-order details: ' + error);
            });
    } else {
        // Regular order
        fetch(`/auth/staff/api/order/${orderId}/details`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showOrderDetailsModal(orderId, data.order_details);
                } else {
                    alert('Failed to fetch order details: ' + data.error);
                }
            })
            .catch(error => {
                alert('Error fetching order details: ' + error);
            });
    }
}

// New modal to show order details
function showOrderDetailsModal(orderId, orderDetails) {
    // Create backdrop
    let backdrop = document.getElementById('orderDetailsBackdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'orderDetailsBackdrop';
        backdrop.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background-color: rgb(255, 255, 255) !important;
            z-index: 10000 !important;
            display: none !important;
        `;
        backdrop.onclick = () => {
            backdrop.style.display = 'none';
            const modal = document.getElementById('orderDetailsModal');
            if (modal) modal.style.display = 'none';
        };
        document.body.appendChild(backdrop);
    }

    let modal = document.getElementById('orderDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'orderDetailsModal';
        modal.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background-color: rgb(255, 252, 252) !important;
            border: 1px solid #ccc !important;
            border-radius: 8px !important;
            padding: 20px !important;
            z-index: 10001 !important;
            max-height: 80vh !important;
            overflow-y: auto !important;
            width: 60vw !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
            display: none !important;
        `;
        document.body.appendChild(modal);
    }

    modal.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = `Details for Order ID: ${orderId}`;
    modal.appendChild(title);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.marginBottom = '10px';
    closeButton.onclick = () => {
        modal.style.display = 'none';
        backdrop.style.display = 'none';
    };
    modal.appendChild(closeButton);


    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Product Name', 'Quantity', 'Price', 'Original Price', 'Total Amount'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.border = '1px solid #ccc';
        th.style.padding = '8px';
        th.style.textAlign = 'left';
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let grandTotal = 0;
    let totalProfit = 0;
    orderDetails.forEach(item => {
        const row = document.createElement('tr');
        const totalAmount = item.quantity * item.price;
        grandTotal += totalAmount;

        // Calculate profit for this item
        let originalPriceDisplay = 'N/A';
        let itemProfit = 0;
        if (item.original_price) {
            originalPriceDisplay = `$${item.original_price.toFixed(2)}`;
            itemProfit = (item.price - item.original_price) * item.quantity;
            totalProfit += itemProfit;
        }

        [item.product_name, item.quantity, `$${item.price.toFixed(2)}`, originalPriceDisplay, `$${totalAmount.toFixed(2)}`].forEach(text => {
            const td = document.createElement('td');
            td.textContent = text;
            td.style.border = '1px solid #ccc';
            td.style.padding = '8px';
            row.appendChild(td);
        });
        tbody.appendChild(row);
    });

    // Add grand total row
    const totalRow = document.createElement('tr');
    const totalLabelTd = document.createElement('td');
    totalLabelTd.textContent = 'Grand Total';
    totalLabelTd.style.border = '1px solid #ccc';
    totalLabelTd.style.padding = '8px';
    totalLabelTd.style.fontWeight = 'bold';
    totalLabelTd.colSpan = 4;
    totalRow.appendChild(totalLabelTd);

    const totalValueTd = document.createElement('td');
    totalValueTd.textContent = `$${grandTotal.toFixed(2)}`;
    totalValueTd.style.border = '1px solid #ccc';
    totalValueTd.style.padding = '8px';
    totalValueTd.style.fontWeight = 'bold';
    totalRow.appendChild(totalValueTd);

    tbody.appendChild(totalRow);

    // Add total profit row
    const profitRow = document.createElement('tr');
    const profitLabelTd = document.createElement('td');
    profitLabelTd.textContent = 'Total Profit';
    profitLabelTd.style.border = '1px solid #ccc';
    profitLabelTd.style.padding = '8px';
    profitLabelTd.style.fontWeight = 'bold';
    profitLabelTd.style.color = totalProfit >= 0 ? 'green' : 'red';
    profitLabelTd.colSpan = 4;
    profitRow.appendChild(profitLabelTd);

    const profitValueTd = document.createElement('td');
    profitValueTd.textContent = `$${totalProfit.toFixed(2)}`;
    profitValueTd.style.border = '1px solid #ccc';
    profitValueTd.style.padding = '8px';
    profitValueTd.style.fontWeight = 'bold';
    profitValueTd.style.color = totalProfit >= 0 ? 'green' : 'red';
    profitRow.appendChild(profitValueTd);

    tbody.appendChild(profitRow);

    table.appendChild(tbody);

    modal.appendChild(table);

    backdrop.style.display = 'block';
    modal.style.display = 'block';
}

// New modal to show pre-order details
function showPreOrderDetailsModal(preOrderId, preOrderDetails) {
    // Create backdrop
    let backdrop = document.getElementById('preOrderDetailsBackdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'preOrderDetailsBackdrop';
        backdrop.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background-color: rgb(255, 255, 255) !important;
            z-index: 10000 !important;
            display: none !important;
        `;
        backdrop.onclick = () => {
            backdrop.style.display = 'none';
            const modal = document.getElementById('preOrderDetailsModal');
            if (modal) modal.style.display = 'none';
        };
        document.body.appendChild(backdrop);
    }

    let modal = document.getElementById('preOrderDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'preOrderDetailsModal';
        modal.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background-color: rgb(255, 252, 252) !important;
            border: 1px solid #ccc !important;
            border-radius: 8px !important;
            padding: 20px !important;
            z-index: 10001 !important;
            max-height: 80vh !important;
            overflow-y: auto !important;
            width: 60vw !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
            display: none !important;
        `;
        document.body.appendChild(modal);
    }

    modal.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = `Pre-Order Details: ${preOrderId}`;
    title.style.color = '#007bff';
    modal.appendChild(title);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.marginBottom = '15px';
    closeButton.style.backgroundColor = '#6c757d';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.padding = '8px 16px';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => {
        modal.style.display = 'none';
        backdrop.style.display = 'none';
    };
    modal.appendChild(closeButton);

    // Pre-order information section
    const infoSection = document.createElement('div');
    infoSection.style.marginBottom = '20px';
    infoSection.style.padding = '15px';
    infoSection.style.backgroundColor = '#f8f9fa';
    infoSection.style.borderRadius = '5px';
    infoSection.style.border = '1px solid #dee2e6';

    const infoTitle = document.createElement('h4');
    infoTitle.textContent = 'Pre-Order Information';
    infoTitle.style.marginBottom = '10px';
    infoTitle.style.color = '#495057';
    infoSection.appendChild(infoTitle);

    const infoTable = document.createElement('table');
    infoTable.style.width = '100%';
    infoTable.style.borderCollapse = 'collapse';

    const infoData = [
        ['Customer', `${preOrderDetails.first_name} ${preOrderDetails.last_name}`],
        ['Email', preOrderDetails.email],
        ['Phone', preOrderDetails.phone || 'N/A'],
        ['Product', preOrderDetails.product_name],
        ['Quantity', preOrderDetails.quantity],
        ['Expected Price', `$${parseFloat(preOrderDetails.expected_price).toFixed(2)}`],
        ['Deposit Amount', `$${parseFloat(preOrderDetails.deposit_amount || 0).toFixed(2)}`],
        ['Status', preOrderDetails.status.charAt(0).toUpperCase() + preOrderDetails.status.slice(1).replace('_', ' ')],
        ['Created Date', new Date(preOrderDetails.created_date).toLocaleDateString()],
        ['Updated Date', new Date(preOrderDetails.updated_date).toLocaleDateString()]
    ];

    infoData.forEach(([label, value]) => {
        const row = document.createElement('tr');

        const labelTd = document.createElement('td');
        labelTd.textContent = label + ':';
        labelTd.style.border = '1px solid #dee2e6';
        labelTd.style.padding = '8px';
        labelTd.style.fontWeight = 'bold';
        labelTd.style.backgroundColor = '#e9ecef';
        labelTd.style.width = '30%';
        row.appendChild(labelTd);

        const valueTd = document.createElement('td');
        valueTd.textContent = value;
        valueTd.style.border = '1px solid #dee2e6';
        valueTd.style.padding = '8px';
        row.appendChild(valueTd);

        infoTable.appendChild(row);
    });

    infoSection.appendChild(infoTable);
    modal.appendChild(infoSection);

    // Calculate totals
    const totalPrice = parseFloat(preOrderDetails.expected_price) * parseInt(preOrderDetails.quantity);
    const depositAmount = parseFloat(preOrderDetails.deposit_amount || 0);
    const remainingBalance = totalPrice - depositAmount;

    // Financial summary section
    const financialSection = document.createElement('div');
    financialSection.style.padding = '15px';
    financialSection.style.backgroundColor = '#e8f5e8';
    financialSection.style.borderRadius = '5px';
    financialSection.style.border = '1px solid #c3e6c3';

    const financialTitle = document.createElement('h4');
    financialTitle.textContent = 'Financial Summary';
    financialTitle.style.marginBottom = '10px';
    financialTitle.style.color = '#155724';
    financialSection.appendChild(financialTitle);

    const financialTable = document.createElement('table');
    financialTable.style.width = '100%';
    financialTable.style.borderCollapse = 'collapse';

    const financialData = [
        ['Total Expected Price', `$${totalPrice.toFixed(2)}`],
        ['Deposit Paid', `$${depositAmount.toFixed(2)}`],
        ['Remaining Balance', `$${remainingBalance.toFixed(2)}`],
        ['Payment Progress', `${totalPrice > 0 ? ((depositAmount / totalPrice) * 100).toFixed(1) : 0}%`]
    ];

    financialData.forEach(([label, value]) => {
        const row = document.createElement('tr');

        const labelTd = document.createElement('td');
        labelTd.textContent = label + ':';
        labelTd.style.border = '1px solid #c3e6c3';
        labelTd.style.padding = '8px';
        labelTd.style.fontWeight = 'bold';
        labelTd.style.backgroundColor = '#d4edda';
        labelTd.style.width = '30%';
        row.appendChild(labelTd);

        const valueTd = document.createElement('td');
        valueTd.textContent = value;
        valueTd.style.border = '1px solid #c3e6c3';
        valueTd.style.padding = '8px';
        valueTd.style.fontWeight = 'bold';
        if (label === 'Remaining Balance' && remainingBalance > 0) {
            valueTd.style.color = '#dc3545';
        } else if (label === 'Deposit Paid' && depositAmount > 0) {
            valueTd.style.color = '#28a745';
        }
        row.appendChild(valueTd);

        financialTable.appendChild(row);
    });

    financialSection.appendChild(financialTable);
    modal.appendChild(financialSection);

    backdrop.style.display = 'block';
    modal.style.display = 'block';
}

// Function to show monthly revenue detail popup
function showMonthlyRevenueDetail(month, monthLabel, revenue) {
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
            background-color: white !important;
            border: 1px solid #ccc !important;
            border-radius: 8px !important;
            padding: 20px !important;
            z-index: 10000 !important;
            max-height: 80vh !important;
            overflow-y: auto !important;
            width: 60vw !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
            display: none !important;
        `;
        document.body.appendChild(modal);
    }

    modal.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = `Revenue Details for ${monthLabel} 2025`;
    modal.appendChild(title);

    const closeButton = document.createElement('button');
    closeButton.textContent = '✕';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '15px';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#666';
    closeButton.onclick = () => {
        modal.style.display = 'none';
        backdrop.style.display = 'none';
    };
    modal.appendChild(closeButton);

    const revenueInfo = document.createElement('div');
    revenueInfo.style.marginBottom = '20px';
    revenueInfo.style.padding = '15px';
    revenueInfo.style.backgroundColor = '#f8f9fa';
    revenueInfo.style.borderRadius = '5px';
    revenueInfo.innerHTML = `
        <h4 style="margin: 0 0 10px 0; color: #28a745;">Total Revenue for ${monthLabel}: $${revenue.toLocaleString()}</h4>
        <p style="margin: 0; color: #666;">This shows the total revenue generated from all completed orders in ${monthLabel} 2025.</p>
        <p style="margin: 10px 0 0 0; color: #666;"><strong>Note:</strong> Click on any month bar to see detailed breakdown for that specific month.</p>
    `;
    modal.appendChild(revenueInfo);

    // Add a button to view detailed sales for this month
    const detailButton = document.createElement('button');
    detailButton.textContent = 'View Detailed Sales';
    detailButton.style.backgroundColor = '#28a745';
    detailButton.style.color = 'white';
    detailButton.style.border = 'none';
    detailButton.style.padding = '10px 20px';
    detailButton.style.borderRadius = '5px';
    detailButton.style.cursor = 'pointer';
    detailButton.style.marginTop = '10px';
    detailButton.onclick = () => {
        // Use existing monthly sales detail functionality
        fetch(`/auth/staff/api/reports/monthly_sales_detail?month=${month}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    modal.style.display = 'none';
                    backdrop.style.display = 'none';
                    showMonthlySalesDetailModal(month, data.sales_detail);
                } else {
                    alert('Failed to fetch sales details: ' + data.error);
                }
            })
            .catch(error => {
                alert('Error fetching sales details: ' + error);
            });
    };
    modal.appendChild(detailButton);

    backdrop.style.display = 'block';
    modal.style.display = 'block';
}

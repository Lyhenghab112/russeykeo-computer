/**
 * Top Selling Products Widget JavaScript
 * Handles the "Top Selling Products" table functionality
 */

// Global variable to store top selling products data
let topSellingProductsData = [];

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the top selling products widget
    initializeTopSellingProducts();

    function initializeTopSellingProducts() {
        console.log('Initializing Top Selling Products widget...');
        
        // Fetch and render top selling products data
        fetchTopSellingProducts();
        
        // Set up CSV export button
        const exportButton = document.getElementById('exportTopSellingProductsCSV');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                console.log('Export button clicked, data:', topSellingProductsData);
                exportTopSellingProductsToCSV(topSellingProductsData);
            });
        } else {
            console.error('Export button not found with ID: exportTopSellingProductsCSV');
        }
    }

    function fetchTopSellingProducts() {
        console.log('Fetching top selling products data...');
        
        fetch('/auth/staff/api/reports/top_products')
            .then(response => response.json())
            .then(data => {
                console.log("Top selling products data:", data);
                if (data.success && data.products.length > 0) {
                    topSellingProductsData = data.products;
                    renderTopSellingProductsTable(topSellingProductsData);
                    hideMessage();
                } else {
                    console.error('Failed to fetch top selling products:', data.error || 'No data received');
                    showMessage('No top selling products data available.');
                    clearTable();
                }
            })
            .catch(error => {
                console.error('Error fetching top selling products:', error);
                showMessage('Error loading top selling products data.');
                clearTable();
            });
    }

    function renderTopSellingProductsTable(products) {
        const tableBody = document.getElementById('topSellingProductsTable');
        if (!tableBody) {
            console.error("Table element with ID 'topSellingProductsTable' not found.");
            return;
        }

        try {
            // Clear existing content
            tableBody.innerHTML = '';

            if (products.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="3">No top selling products data available.</td></tr>';
                return;
            }

            // Sort products by quantity sold (descending) and take only top 3
            products.sort((a, b) => b.quantity_sold - a.quantity_sold);
            const top3Products = products.slice(0, 3);

            // Populate table rows
            top3Products.forEach((product, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${product.name}</strong></td>
                    <td><strong>${product.quantity_sold}</strong></td>
                    <td><strong>$${parseFloat(product.total_revenue).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                `;

                // Add hover effect and click functionality
                row.style.cursor = 'pointer';
                row.addEventListener('mouseenter', () => {
                    row.style.backgroundColor = '#f8f9fa';
                });
                row.addEventListener('mouseleave', () => {
                    row.style.backgroundColor = '';
                });

                // Add click handler to show product purchase history
                row.addEventListener('click', () => {
                    showProductPurchaseHistoryModal(product.name);
                });

                tableBody.appendChild(row);
            });

            console.log(`Successfully rendered ${top3Products.length} top selling products (top 3 of ${products.length} total)`);

        } catch (error) {
            console.error("Error creating top selling products table:", error);
            tableBody.innerHTML = '<tr><td colspan="3">Error loading top selling products data.</td></tr>';
        }
    }

    function exportTopSellingProductsToCSV(data) {
        console.log('exportTopSellingProductsToCSV called with data:', data);
        
        if (!data || data.length === 0) {
            alert('No top selling products data to export.');
            return;
        }

        const csvRows = [];
        csvRows.push(['Product Name', 'Quantity Sold', 'Total Revenue']);
        
        data.forEach(product => {
            csvRows.push([
                product.name,
                product.quantity_sold,
                parseFloat(product.total_revenue).toFixed(2)
            ]);
        });

        console.log('Top selling products CSV rows prepared:', csvRows);
        downloadCSV(csvRows, 'top_selling_products.csv');
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
        const messageElement = document.getElementById('topSellingProductsMessage');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.style.display = 'block';
        }
    }

    function hideMessage() {
        const messageElement = document.getElementById('topSellingProductsMessage');
        if (messageElement) {
            messageElement.style.display = 'none';
        }
    }

    function clearTable() {
        const tableBody = document.getElementById('topSellingProductsTable');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="3">No data available</td></tr>';
        }
    }

    function showProductPurchaseHistoryModal(productName) {
        console.log(`Showing purchase history for product: ${productName}`);

        // Fetch detailed purchase history for this specific product
        fetch(`/auth/staff/api/reports/product_purchase_history?product_name=${encodeURIComponent(productName)}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    createProductPurchaseHistoryModal(data.product_stats, data.purchase_history);
                } else {
                    alert(`No purchase history found for product: ${productName}`);
                }
            })
            .catch(error => {
                console.error('Error fetching product purchase history:', error);
                alert('Error fetching product purchase history: ' + error);
            });
    }

    function createProductPurchaseHistoryModal(productStats, purchaseHistory) {
        // Create backdrop
        let backdrop = document.getElementById('productPurchaseHistoryBackdrop');
        if (backdrop) {
            document.body.removeChild(backdrop);
        }

        backdrop = document.createElement('div');
        backdrop.id = 'productPurchaseHistoryBackdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 20000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 90%;
            max-height: 90%;
            overflow-y: auto;
            padding: 20px;
            position: relative;
        `;

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            top: -15px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            z-index: 1;
        `;
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(backdrop);
        });

        // Create title
        const title = document.createElement('h3');
        title.textContent = `Purchase History - ${productStats.product_name}`;
        title.style.cssText = `
            margin: 20px 0 20px 0;
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        `;

        // Create statistics section
        const statsSection = document.createElement('div');
        statsSection.style.cssText = `
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
        `;

        statsSection.innerHTML = `
            <h4 style="margin: 0 0 15px 0; color: #333;">Product Statistics</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                <div><strong>Total Quantity Sold:</strong> ${productStats.total_quantity_sold.toLocaleString('en-US')}</div>
                <div><strong>Total Orders:</strong> ${productStats.total_orders.toLocaleString('en-US')}</div>
                <div><strong>Total Revenue:</strong> $${productStats.total_revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div><strong>Current Price:</strong> $${productStats.current_price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div><strong>Average Selling Price:</strong> $${productStats.average_selling_price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div><strong>First Purchase:</strong> ${productStats.first_purchase_date ? new Date(productStats.first_purchase_date).toLocaleDateString() : 'N/A'}</div>
            </div>
        `;

        // Create purchase history title
        const historyTitle = document.createElement('h4');
        historyTitle.textContent = `Recent Purchase History (Last 20 Orders)`;
        historyTitle.style.cssText = `
            margin: 0 0 15px 0;
            color: #333;
        `;

        // Create table
        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        `;

        // Create table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr style="background-color: #f8f9fa;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Order ID</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Date</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Customer</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Quantity</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Unit Price</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Total</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Status</th>
            </tr>
        `;

        // Create table body
        const tbody = document.createElement('tbody');
        purchaseHistory.forEach((purchase, index) => {
            const row = document.createElement('tr');
            row.style.cssText = `
                ${index % 2 === 0 ? 'background-color: #f9f9f9;' : 'background-color: white;'}
            `;
            row.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 8px;">${purchase.order_id}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${purchase.order_date ? new Date(purchase.order_date).toLocaleDateString() : 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${purchase.customer_name}</td>
                <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${purchase.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">$${purchase.unit_price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">$${purchase.total_amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style="border: 1px solid #ddd; padding: 8px;"><span style="background-color: ${purchase.status.toLowerCase() === 'completed' ? '#d4edda' : '#fff3cd'}; padding: 2px 6px; border-radius: 3px; font-size: 12px;">${purchase.status}</span></td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);

        // Assemble modal
        modal.appendChild(closeBtn);
        modal.appendChild(title);
        modal.appendChild(statsSection);
        modal.appendChild(historyTitle);
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
});

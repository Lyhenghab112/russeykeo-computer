/**
 * Top Selling Products by Category Widget JavaScript
 * Handles the "Top Selling Products by Category" table functionality
 */

// Global variable to store top selling products by category data
let topSellingProductsByCategoryData = [];

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the top selling products by category widget
    initializeTopSellingProductsByCategory();

    function initializeTopSellingProductsByCategory() {
        console.log('Initializing Top Selling Products by Category widget...');
        
        // Fetch and render top selling products by category data
        fetchTopSellingProductsByCategory();
        
        // Set up CSV export button
        const exportButton = document.getElementById('exportTopSellingProductsByCategoryCSV');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                console.log('Export button clicked, data:', topSellingProductsByCategoryData);
                exportTopSellingProductsByCategoryToCSV(topSellingProductsByCategoryData);
            });
        } else {
            console.error('Export button not found with ID: exportTopSellingProductsByCategoryCSV');
        }
    }

    function fetchTopSellingProductsByCategory() {
        console.log('Fetching top selling products by category data...');

        fetch('/auth/staff/api/reports/top_selling_products_by_category')
            .then(response => response.json())
            .then(data => {
                console.log("Top selling products by category data:", data);
                if (data.success && data.categories.length > 0) {
                    topSellingProductsByCategoryData = data.categories;
                    renderTopSellingProductsByCategoryTable(topSellingProductsByCategoryData);
                    hideMessage();
                } else {
                    console.error('Failed to fetch top selling products by category:', data.error || 'No data received');
                    showMessage('No top selling products by category data available.');
                    clearTable();
                }
            })
            .catch(error => {
                console.error('Error fetching top selling products by category:', error);
                showMessage('Error loading top selling products by category data.');
                clearTable();
            });
    }

    function renderTopSellingProductsByCategoryTable(categories) {
        const tableBody = document.getElementById('topSellingProductsByCategoryTable');
        if (!tableBody) {
            console.error("Table element with ID 'topSellingProductsByCategoryTable' not found.");
            return;
        }

        try {
            // Clear existing content
            tableBody.innerHTML = '';

            if (categories.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="3">No top selling products by category data available.</td></tr>';
                return;
            }

            // Sort categories by total revenue (descending)
            categories.sort((a, b) => parseFloat(b.total_revenue) - parseFloat(a.total_revenue));

            // Render each category with actual quantity and revenue data
            categories.forEach((category, index) => {
                const row = document.createElement('tr');

                // Now we have actual quantity data from the new API endpoint
                const totalProductsSold = category.total_products_sold || 0;

                row.innerHTML = `
                    <td><strong>${category.category_name}</strong></td>
                    <td><strong>${totalProductsSold.toLocaleString('en-US')}</strong></td>
                    <td><strong>$${parseFloat(category.total_revenue).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                `;

                // Add hover effect and click functionality
                row.style.cursor = 'pointer';
                row.addEventListener('mouseenter', () => {
                    row.style.backgroundColor = '#f8f9fa';
                });
                row.addEventListener('mouseleave', () => {
                    row.style.backgroundColor = '';
                });

                // Add click handler to show category products detail
                row.addEventListener('click', () => {
                    showCategoryProductsModal(category.category_name);
                });

                tableBody.appendChild(row);
            });

            console.log(`Successfully rendered ${categories.length} top selling product categories`);

        } catch (error) {
            console.error("Error creating top selling products by category table:", error);
            tableBody.innerHTML = '<tr><td colspan="3">Error loading top selling products by category data.</td></tr>';
        }
    }

    function exportTopSellingProductsByCategoryToCSV(data) {
        console.log('exportTopSellingProductsByCategoryToCSV called with data:', data);
        
        if (!data || data.length === 0) {
            alert('No top selling products by category data to export.');
            return;
        }

        const csvRows = [];
        csvRows.push(['Category Name', 'Total Products Sold', 'Total Revenue']);
        
        data.forEach(category => {
            csvRows.push([
                category.category_name,
                category.total_products_sold || 0,
                parseFloat(category.total_revenue).toFixed(2)
            ]);
        });

        console.log('Top selling products by category CSV rows prepared:', csvRows);
        downloadCSV(csvRows, 'top_selling_products_by_category.csv');
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
        const messageElement = document.getElementById('topSellingProductsByCategoryMessage');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.style.display = 'block';
        }
    }

    function hideMessage() {
        const messageElement = document.getElementById('topSellingProductsByCategoryMessage');
        if (messageElement) {
            messageElement.style.display = 'none';
        }
    }

    function clearTable() {
        const tableBody = document.getElementById('topSellingProductsByCategoryTable');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="3">No data available</td></tr>';
        }
    }

    function showCategoryProductsModal(categoryName) {
        console.log(`Showing top products for category: ${categoryName}`);

        // Fetch detailed products for this specific category
        fetch(`/auth/staff/api/reports/category_products_detail?category_name=${encodeURIComponent(categoryName)}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.products.length > 0) {
                    createCategoryProductsModal(categoryName, data.products);
                } else {
                    alert(`No products found for category: ${categoryName}`);
                }
            })
            .catch(error => {
                console.error('Error fetching category products:', error);
                alert('Error fetching category products: ' + error);
            });
    }

    function createCategoryProductsModal(categoryName, productsData) {
        // Create backdrop
        let backdrop = document.getElementById('categoryProductsBackdrop');
        if (backdrop) {
            document.body.removeChild(backdrop);
        }

        backdrop = document.createElement('div');
        backdrop.id = 'categoryProductsBackdrop';
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

        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 80%;
            max-height: 80%;
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
        title.textContent = `Top Selling Products - ${categoryName}`;
        title.style.cssText = `
            margin: 20px 0 20px 0;
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
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
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Product Name</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Quantity Sold</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Total Revenue</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Avg Price</th>
            </tr>
        `;

        // Create table body
        const tbody = document.createElement('tbody');
        productsData.forEach((product, index) => {
            const row = document.createElement('tr');
            row.style.cssText = `
                ${index % 2 === 0 ? 'background-color: #f9f9f9;' : 'background-color: white;'}
            `;
            row.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 12px; font-weight: bold;">${product.product_name}</td>
                <td style="border: 1px solid #ddd; padding: 12px; font-weight: bold;">${product.total_quantity_sold.toLocaleString('en-US')}</td>
                <td style="border: 1px solid #ddd; padding: 12px; font-weight: bold;">$${product.total_revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style="border: 1px solid #ddd; padding: 12px; font-weight: bold;">$${product.average_price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            `;
            tbody.appendChild(row);
        });

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
});

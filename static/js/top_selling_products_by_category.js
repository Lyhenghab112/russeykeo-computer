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
        
        // Set up PDF export button
        const exportButton = document.getElementById('exportTopSellingProductsByCategoryPDF');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                console.log('Export button clicked, data:', topSellingProductsByCategoryData);
                exportTopSellingProductsByCategoryToPDF(topSellingProductsByCategoryData);
            });
        } else {
            console.error('Export button not found with ID: exportTopSellingProductsByCategoryPDF');
        }
        
        // Make summary cards clickable
        setTimeout(() => makeCategorySummaryCardsClickable(), 500);
    }

    function fetchTopSellingProductsByCategory() {
        console.log('Fetching top selling products by category data...');

        fetch('/auth/staff/api/reports/top_selling_products_by_category')
            .then(response => {
                console.log('API response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log("Top selling products by category data:", data);
                if (data.success && data.categories && data.categories.length > 0) {
                    console.log(`Successfully received ${data.categories.length} categories`);
                    topSellingProductsByCategoryData = data.categories;
                    renderTopSellingProductsByCategoryTable(topSellingProductsByCategoryData);
                    hideMessage();
                } else {
                    console.error('Failed to fetch top selling products by category:', data.error || 'No data received');
                    console.log('Data structure:', data);
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
        console.log('renderTopSellingProductsByCategoryTable called with categories:', categories);
        const tableBody = document.getElementById('topSellingProductsByCategoryTable');
        console.log('Table body element found:', tableBody);
        if (!tableBody) {
            console.error("Table element with ID 'topSellingProductsByCategoryTable' not found.");
            return;
        }

        try {
            // Clear existing content
            tableBody.innerHTML = '';

            if (categories.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5">No category performance data available.</td></tr>';
                return;
            }

            // Sort categories by total revenue (descending)
            categories.sort((a, b) => parseFloat(b.total_revenue) - parseFloat(a.total_revenue));

            // Calculate and update summary metrics
            if (categories && categories.length > 0) {
                updateCategorySummaryCards(categories);
            }

            // Render each category with enhanced data
            console.log('Rendering categories in table...');
            categories.forEach((category, index) => {
                console.log(`Rendering category ${index + 1}:`, category);
                
                const row = document.createElement('tr');

                // Now we have actual quantity data from the new API endpoint
                const totalProductsSold = category.total_products_sold || 0;
                const totalRevenue = parseFloat(category.total_revenue);

                console.log(`Category ${category.category_name}: ${totalProductsSold} products, $${totalRevenue} revenue`);

                // Calculate performance rating
                const totalRevenueSum = categories.reduce((sum, cat) => sum + parseFloat(cat.total_revenue), 0);
                const revenuePercentage = (totalRevenue / totalRevenueSum) * 100;
                let performanceClass = 'performance-poor';
                let performanceText = 'Poor';
                
                if (revenuePercentage >= 30) {
                    performanceClass = 'performance-excellent';
                    performanceText = 'Excellent';
                } else if (revenuePercentage >= 20) {
                    performanceClass = 'performance-good';
                    performanceText = 'Good';
                } else if (revenuePercentage >= 10) {
                    performanceClass = 'performance-average';
                    performanceText = 'Average';
                }

                // Check if this is the best category
                const maxRevenue = Math.max(...categories.map(cat => parseFloat(cat.total_revenue)));
                const isBestCategory = totalRevenue === maxRevenue;

                const rowHTML = `
                    <td class="category-column">
                        <div class="category-info">
                            <strong>${category.category_name}</strong>
                            ${isBestCategory ? ' <i class="fas fa-crown" style="color: #ffd700; margin-left: 8px;" title="Best Category"></i>' : ''}
                        </div>
                    </td>
                    <td class="products-column"><strong>${totalProductsSold.toLocaleString('en-US')}</strong></td>
                    <td class="revenue-column"><strong>$${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                    <td class="performance-column">
                        <span class="performance-indicator ${performanceClass}">${performanceText}</span>
                    </td>
                    <td class="actions-column">
                        <button class="btn btn-view-details" onclick="showCategoryDetails('${category.category_name}', ${totalProductsSold}, ${totalRevenue})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-export-product" onclick="exportCategoryToPDF('${category.category_name}', ${totalProductsSold}, ${totalRevenue})">
                            <i class="fas fa-file-pdf"></i> Export
                        </button>
                    </td>
                `;
                
                console.log('Row HTML created:', rowHTML);
                row.innerHTML = rowHTML;

                tableBody.appendChild(row);
                console.log(`Added row for category: ${category.category_name}`);
            });

            console.log(`Successfully rendered ${categories.length} top selling product categories`);

        } catch (error) {
            console.error("Error creating top selling products by category table:", error);
            tableBody.innerHTML = '<tr><td colspan="5">Error loading category performance data.</td></tr>';
        }
    }

    function exportTopSellingProductsByCategoryToPDF(data) {
        console.log('exportTopSellingProductsByCategoryToPDF called with data:', data);

        if (!data || data.length === 0) {
            alert('No top selling products by category data to export.');
            return;
        }

        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(18);
        doc.text('Top Selling Products by Category Report', 14, 22);

        // Add generation date
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);

        // Prepare table data
        const tableData = data.map(category => [
            category.category_name,
            (category.total_products_sold || 0).toString(),
            `$${parseFloat(category.total_revenue).toFixed(2)}`
        ]);

        // Add table
        doc.autoTable({
            head: [['Category Name', 'Total Products Sold', 'Total Revenue']],
            body: tableData,
            startY: 40,
            styles: {
                fontSize: 10,
                cellPadding: 3
            },
            headStyles: {
                fillColor: [66, 139, 202],
                textColor: 255
            }
        });

        // Calculate totals
        const totalProducts = data.reduce((sum, category) => sum + (category.total_products_sold || 0), 0);
        const totalRevenue = data.reduce((sum, category) => sum + parseFloat(category.total_revenue), 0);

        // Add summary
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text(`Total Products Sold: ${totalProducts}`, 14, finalY);
        doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 14, finalY + 10);

        // Save the PDF
        doc.save('top_selling_products_by_category.pdf');
        console.log('PDF download completed');
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

    // Update category summary cards
    function updateCategorySummaryCards(categories) {
        console.log('Updating category summary cards with data:', categories);
        
        if (!categories || categories.length === 0) {
            console.log('No categories data to update summary cards');
            return;
        }

        const totalCategories = categories.length;
        const totalProductsSold = categories.reduce((sum, cat) => sum + (cat.total_products_sold || 0), 0);
        const totalRevenue = categories.reduce((sum, cat) => sum + parseFloat(cat.total_revenue), 0);
        const bestCategory = categories.reduce((best, current) => 
            parseFloat(current.total_revenue) > parseFloat(best.total_revenue) ? current : best
        ).category_name;

        console.log('Calculated metrics:', {
            totalCategories,
            totalProductsSold,
            totalRevenue,
            bestCategory
        });

        // Update total categories card
        const totalCategoriesEl = document.getElementById('totalCategories');
        if (totalCategoriesEl) {
            totalCategoriesEl.textContent = totalCategories;
            console.log('Updated totalCategories element');
        } else {
            console.error('totalCategories element not found');
        }

        // Update total products sold card
        const totalProductsSoldEl = document.getElementById('totalProductsSold');
        if (totalProductsSoldEl) {
            totalProductsSoldEl.textContent = totalProductsSold.toLocaleString();
            console.log('Updated totalProductsSold element');
        } else {
            console.error('totalProductsSold element not found');
        }

        // Update total revenue card
        const totalRevenueEl = document.getElementById('totalCategoryRevenue');
        if (totalRevenueEl) {
            totalRevenueEl.textContent = `$${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            console.log('Updated totalCategoryRevenue element');
        } else {
            console.error('totalCategoryRevenue element not found');
        }

        // Update best category card
        const bestCategoryEl = document.getElementById('bestCategory');
        if (bestCategoryEl) {
            bestCategoryEl.textContent = bestCategory;
            console.log('Updated bestCategory element');
        } else {
            console.error('bestCategory element not found');
        }

        // Store data for later use
        window.categoryPerformanceData = {
            totalCategories,
            totalProductsSold,
            totalRevenue,
            bestCategory,
            categories
        };
        
        console.log('Category summary cards updated successfully');
    }

    // Make category summary cards clickable
    function makeCategorySummaryCardsClickable() {
        // Total Categories card
        const totalCategoriesCard = document.querySelector('.category-performance-widget .category-summary-card.total-categories');
        if (totalCategoriesCard) {
            totalCategoriesCard.onclick = () => showCategoryBreakdown();
        }
        
        // Total Products Sold card
        const totalProductsSoldCard = document.querySelector('.category-performance-widget .category-summary-card.total-products-sold');
        if (totalProductsSoldCard) {
            totalProductsSoldCard.onclick = () => showProductsBreakdown();
        }
        
        // Total Revenue card
        const totalRevenueCard = document.querySelector('.category-performance-widget .category-summary-card.total-category-revenue');
        if (totalRevenueCard) {
            totalRevenueCard.onclick = () => showRevenueBreakdown();
        }
        
        // Best Category card
        const bestCategoryCard = document.querySelector('.category-performance-widget .category-performance-widget .category-summary-card.best-category');
        if (bestCategoryCard) {
            bestCategoryCard.onclick = () => showBestCategoryBreakdown();
        }
    }

    // Show category breakdown
    function showCategoryBreakdown() {
        if (!window.categoryPerformanceData) {
            alert('No category data available');
            return;
        }
        
        const { totalCategories, totalProductsSold, totalRevenue, bestCategory } = window.categoryPerformanceData;
        
        // Create a simple popup
        const popup = document.createElement('div');
        popup.className = 'summary-popup';
        popup.innerHTML = `
            <div class="summary-popup-content">
                <div class="summary-popup-header">
                    <h5><i class="fas fa-tags"></i> Category Overview</h5>
                </div>
                
                <div class="summary-popup-body">
                    <div class="category-breakdown-section">
                        <h6><i class="fas fa-chart-pie"></i> Category Analysis</h6>
                        
                        <div class="category-stats">
                            <div class="stat-item">
                                <span class="stat-label">Total Categories:</span>
                                <span class="stat-value">${totalCategories}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Total Products Sold:</span>
                                <span class="stat-value">${totalProductsSold.toLocaleString()}</span>
                            </div>
                            <div class="stat-label">Total Revenue:</span>
                                <span class="stat-value">$${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Best Category:</span>
                                <span class="stat-value">${bestCategory}</span>
                            </div>
                        </div>
                        
                        <div class="category-insights">
                            <h6><i class="fas fa-lightbulb"></i> Key Insights</h6>
                            <ul>
                                <li>Average products per category: ${(totalProductsSold / totalCategories).toFixed(1)}</li>
                                <li>Average revenue per category: $${(totalRevenue / totalCategories).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</li>
                                <li>Best performing category: ${bestCategory}</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="summary-popup-footer">
                    <button class="btn btn-secondary" onclick="closeSummaryPopup(this)">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(popup);
        
        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'summary-popup-backdrop';
        backdrop.onclick = () => closeSummaryPopup(popup);
        document.body.appendChild(backdrop);
        
        // Show popup
        setTimeout(() => popup.classList.add('show'), 10);
    }

    // Show products breakdown
    function showProductsBreakdown() {
        if (!window.categoryPerformanceData) {
            alert('No category data available');
            return;
        }
        
        const { totalCategories, totalProductsSold, totalRevenue, bestCategory, categories } = window.categoryPerformanceData;
        
        const popup = document.createElement('div');
        popup.className = 'summary-popup';
        popup.innerHTML = `
            <div class="summary-popup-content">
                <div class="summary-popup-header">
                    <h5><i class="fas fa-box"></i> Products Analysis</h5>
                </div>
                
                <div class="summary-popup-body">
                    <div class="products-breakdown-section">
                        <h6><i class="fas fa-chart-bar"></i> Products Performance</h6>
                        
                        <div class="products-stats">
                            <div class="stat-item">
                                <span class="stat-label">Total Products Sold:</span>
                                <span class="stat-value">${totalProductsSold.toLocaleString()}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Categories with Sales:</span>
                                <span class="stat-value">${totalCategories}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Average Products per Category:</span>
                                <span class="stat-value">${(totalProductsSold / totalCategories).toFixed(1)}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Total Revenue:</span>
                                <span class="stat-value">$${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                        </div>
                        
                        <div class="products-insights">
                            <h6><i class="fas fa-lightbulb"></i> Product Trends</h6>
                            <ul>
                                <li>Products generate an average of $${(totalRevenue / totalProductsSold).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} each</li>
                                <li>Category product volume: ${(totalProductsSold / totalCategories).toFixed(1)} products</li>
                                <li>Revenue per product: $${(totalRevenue / totalProductsSold).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="summary-popup-footer">
                    <button class="btn btn-secondary" onclick="closeSummaryPopup(this)">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        const backdrop = document.createElement('div');
        backdrop.className = 'summary-popup-backdrop';
        backdrop.onclick = () => closeSummaryPopup(popup);
        document.body.appendChild(backdrop);
        
        setTimeout(() => popup.classList.add('show'), 10);
    }

    // Show revenue breakdown
    function showRevenueBreakdown() {
        if (!window.categoryPerformanceData) {
            alert('No category data available');
            return;
        }
        
        const { totalCategories, totalProductsSold, totalRevenue, bestCategory, categories } = window.categoryPerformanceData;
        
        const popup = document.createElement('div');
        popup.className = 'summary-popup';
        popup.innerHTML = `
            <div class="summary-popup-content">
                <div class="summary-popup-header">
                    <h5><i class="fas fa-dollar-sign"></i> Revenue Analysis</h5>
                </div>
                
                <div class="summary-popup-body">
                    <div class="revenue-breakdown-section">
                        <h6><i class="fas fa-chart-line"></i> Revenue Breakdown</h6>
                        
                        <div class="revenue-stats">
                            <div class="stat-item">
                                <span class="stat-label">Total Revenue:</span>
                                <span class="stat-value">$${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Categories with Revenue:</span>
                                <span class="stat-value">${totalCategories}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Average Revenue per Category:</span>
                                <span class="stat-value">$${(totalRevenue / totalCategories).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Best Category:</span>
                                <span class="stat-value">${bestCategory}</span>
                            </div>
                        </div>
                        
                        <div class="revenue-insights">
                            <h6><i class="fas fa-trending-up"></i> Revenue Patterns</h6>
                            <ul>
                                <li>Category average: $${(totalRevenue / totalCategories).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</li>
                                <li>Best performance: ${bestCategory}</li>
                                <li>Revenue consistency: ${totalCategories > 0 ? 'Good' : 'Needs improvement'}</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="summary-popup-footer">
                    <button class="btn btn-secondary" onclick="closeSummaryPopup(this)">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        const backdrop = document.createElement('div');
        backdrop.className = 'summary-popup-backdrop';
        backdrop.onclick = () => closeSummaryPopup(popup);
        document.body.appendChild(backdrop);
        
        setTimeout(() => popup.classList.add('show'), 10);
    }

    // Show best category breakdown
    function showBestCategoryBreakdown() {
        if (!window.categoryPerformanceData) {
            alert('No category data available');
            return;
        }
        
        const { totalCategories, totalProductsSold, totalRevenue, bestCategory, categories } = window.categoryPerformanceData;
        
        if (!bestCategory) {
            alert('No best category data available');
            return;
        }
        
        const bestCategoryData = categories.find(cat => cat.category_name === bestCategory);
        
        const popup = document.createElement('div');
        popup.className = 'summary-popup';
        popup.innerHTML = `
            <div class="summary-popup-content">
                <div class="summary-popup-header">
                    <h5><i class="fas fa-trophy"></i> Best Category Analysis</h5>
                </div>
                
                <div class="summary-popup-body">
                    <div class="best-category-breakdown-section">
                        <h6><i class="fas fa-star"></i> Best Category: ${bestCategory}</h6>
                        
                        <div class="best-category-stats">
                            <div class="stat-item">
                                <span class="stat-label">Category:</span>
                                <span class="stat-value">${bestCategory}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Products Sold:</span>
                                <span class="stat-value">${bestCategoryData.total_products_sold.toLocaleString()}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Revenue:</span>
                                <span class="stat-value">$${bestCategoryData.total_revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Performance:</span>
                                <span class="stat-value">Top Revenue Category</span>
                            </div>
                        </div>
                        
                        <div class="best-category-insights">
                            <h6><i class="fas fa-lightbulb"></i> Why This Category?</h6>
                            <ul>
                                <li>Highest revenue performance across all categories</li>
                                <li>Represents peak sales activity</li>
                                <li>Good category for promotions and marketing</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="summary-popup-footer">
                    <button class="btn btn-secondary" onclick="closeSummaryPopup(this)">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        const backdrop = document.createElement('div');
        backdrop.className = 'summary-popup-backdrop';
        backdrop.onclick = () => closeSummaryPopup(popup);
        document.body.appendChild(backdrop);
        
        setTimeout(() => popup.classList.add('show'), 10);
    }

    });

// Global functions for category widget (accessible from onclick attributes)
window.showCategoryDetails = function(categoryName, productsSold, revenue) {
    // Create a custom popup instead of using alert()
    const popup = document.createElement('div');
    popup.className = 'summary-popup';
    popup.innerHTML = `
        <div class="summary-popup-content">
            <div class="summary-popup-header">
                <h5><i class="fas fa-tags"></i> Category Details</h5>
            </div>
            
            <div class="summary-popup-body">
                <div class="category-details-section">
                    <h6><i class="fas fa-chart-bar"></i> ${categoryName} Performance</h6>
                    
                    <div class="category-stats">
                        <div class="stat-item">
                            <span class="stat-label">Category:</span>
                            <span class="stat-value">${categoryName}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Products Sold:</span>
                            <span class="stat-value">${productsSold.toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Total Revenue:</span>
                            <span class="stat-value">$${revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Average Revenue per Product:</span>
                            <span class="stat-value">$${(revenue / productsSold).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    </div>
                    
                    <div class="category-insights">
                        <h6><i class="fas fa-lightbulb"></i> Key Insights</h6>
                        <ul>
                            <li>${categoryName} generated ${productsSold} product sales</li>
                            <li>Total revenue: $${revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</li>
                            <li>Average revenue per product: $${(revenue / productsSold).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</li>
                        </ul>
                    </div>
                    
                    <div class="products-list-section">
                        <h6><i class="fas fa-list"></i> Top Products in ${categoryName}</h6>
                        <div class="loading-products">
                            <i class="fas fa-spinner fa-spin"></i> Loading products...
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="summary-popup-footer">
                <button class="btn btn-export-product" onclick="exportCategoryDetailsToPDF('${categoryName}', ${productsSold}, ${revenue})">
                    <i class="fas fa-file-pdf"></i> Export to PDF
                </button>
                <button class="btn btn-secondary" onclick="closeSummaryPopup(this)">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(popup);
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'summary-popup-backdrop';
    backdrop.onclick = () => closeSummaryPopup(popup);
    document.body.appendChild(backdrop);
    
    // Show popup
    setTimeout(() => popup.classList.add('show'), 10);
    
    // Fetch and display products for this category
    fetchCategoryProducts(categoryName, popup);
};

// Function to fetch and display products for a specific category
window.fetchCategoryProducts = function(categoryName, popup) {
    console.log(`Fetching products for category: ${categoryName}`);
    
    fetch(`/auth/staff/api/reports/category_products_detail?category_name=${encodeURIComponent(categoryName)}`)
        .then(response => response.json())
        .then(data => {
            console.log(`Products data for ${categoryName}:`, data);
            
            if (data.success && data.products && data.products.length > 0) {
                displayCategoryProducts(data.products, popup);
            } else {
                displayNoProductsMessage(popup);
            }
        })
        .catch(error => {
            console.error(`Error fetching products for ${categoryName}:`, error);
            displayErrorLoadingProducts(popup);
        });
};

// Function to display products in the modal
window.displayCategoryProducts = function(products, popup) {
    const productsSection = popup.querySelector('.products-list-section');
    
    if (!productsSection) {
        console.error('Products section not found in popup');
        return;
    }
    
    // Create products table
    const productsHTML = `
        <div class="products-table-container">
            <table class="products-table">
                <thead>
                    <tr>
                        <th>Product Name</th>
                        <th>Quantity Sold</th>
                        <th>Total Revenue</th>
                        <th>Average Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(product => `
                        <tr>
                            <td class="product-name">
                                <strong>${product.product_name}</strong>
                            </td>
                            <td class="quantity-sold">
                                ${product.total_quantity_sold.toLocaleString()}
                            </td>
                            <td class="total-revenue">
                                $${product.total_revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                            <td class="average-price">
                                $${product.average_price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    productsSection.innerHTML = `
        <h6><i class="fas fa-list"></i> Top Products in ${products[0]?.category_name || 'Category'}</h6>
        ${productsHTML}
    `;
    
    console.log(`Displayed ${products.length} products for category`);
};

// Function to display no products message
window.displayNoProductsMessage = function(popup) {
    const productsSection = popup.querySelector('.products-list-section');
    
    if (productsSection) {
        productsSection.innerHTML = `
            <h6><i class="fas fa-list"></i> Products in Category</h6>
            <div class="no-products-message">
                <i class="fas fa-info-circle"></i> No products found for this category.
            </div>
        `;
    }
};

// Function to display error loading products
window.displayErrorLoadingProducts = function(popup) {
    const productsSection = popup.querySelector('.products-list-section');
    
    if (productsSection) {
        productsSection.innerHTML = `
            <h6><i class="fas fa-list"></i> Products in Category</h6>
            <div class="error-loading-products">
                <i class="fas fa-exclamation-triangle"></i> Error loading products. Please try again.
            </div>
        `;
    }
};

// Function to export category details to PDF
window.exportCategoryDetailsToPDF = function(categoryName, productsSold, revenue) {
    console.log(`Exporting category details to PDF for: ${categoryName}`);
    
    // Get the current products data from the modal
    const popup = document.querySelector('.summary-popup.show');
    if (!popup) {
        console.error('No active popup found');
        return;
    }
    
    const productsTable = popup.querySelector('.products-table tbody');
    if (!productsTable) {
        console.error('Products table not found');
        return;
    }
    
    // Extract products data from the table
    const products = [];
    const rows = productsTable.querySelectorAll('tr');
    
            rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                const productName = cells[0].textContent.trim();
                const quantitySold = parseInt(cells[1].textContent.replace(/,/g, '')) || 0;
                const totalRevenue = parseFloat(cells[2].textContent.replace(/[$,]/g, '')) || 0;
                const averagePrice = parseFloat(cells[3].textContent.replace(/[$,]/g, '')) || 0;
                
                products.push({
                    product_name: productName,
                    total_quantity_sold: quantitySold,
                    total_revenue: totalRevenue,
                    average_price: averagePrice
                });
            }
        });
    
    console.log(`Extracted ${products.length} products for PDF export:`, products);
    
    // Generate the PDF
    generateCategoryDetailsPDF(categoryName, productsSold, revenue, products);
};

// Function to generate detailed category PDF
window.generateCategoryDetailsPDF = function(categoryName, productsSold, revenue, products) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set document properties
        doc.setProperties({
            title: `${categoryName} Detailed Performance Report`,
            subject: 'Category Performance Analysis with Product Breakdown',
            author: 'Russeykeo Computer',
            creator: 'Sales Dashboard'
        });
        
        // Add header
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text(`${categoryName} Performance Report`, 105, 20, { align: 'center' });
        
        // Add company info
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text('Russeykeo Computer - Sales Analytics Report', 105, 30, { align: 'center' });
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 37, { align: 'center' });
        
        // Add category summary
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Category Summary', 20, 55);
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Category: ${categoryName}`, 20, 65);
        doc.text(`Total Products Sold: ${productsSold.toLocaleString()}`, 20, 75);
        doc.text(`Total Revenue: $${revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 20, 85);
        doc.text(`Average Revenue per Product: $${(revenue / productsSold).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 20, 95);
        
        // Add products table
        if (products && products.length > 0) {
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text('Top Products Breakdown', 20, 115);
            
            // Prepare table data
            const tableData = products.map(product => [
                product.product_name,
                product.total_quantity_sold.toString(),
                `$${product.total_revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
                `$${product.average_price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
            ]);
            
            // Add table headers
            const headers = ['Product Name', 'Quantity Sold', 'Total Revenue', 'Average Price'];
            
            // Generate table using autoTable
            doc.autoTable({
                head: [headers],
                body: tableData,
                startY: 125,
                margin: { top: 20 },
                styles: {
                    fontSize: 10,
                    cellPadding: 5
                },
                headStyles: {
                    fillColor: [79, 70, 229],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                columnStyles: {
                    0: { cellWidth: 80 }, // Product Name
                    1: { cellWidth: 25, halign: 'center' }, // Quantity
                    2: { cellWidth: 30, halign: 'right' }, // Revenue
                    3: { cellWidth: 30, halign: 'right' }  // Average Price
                }
            });
        }
        
        // Add footer
        const finalY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Report generated by Russeykeo Computer Sales Dashboard', 105, finalY, { align: 'center' });
        
        // Save the PDF
        const fileName = `${categoryName.replace(/[^a-zA-Z0-9]/g, '_')}_Performance_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        console.log(`PDF generated successfully: ${fileName}`);
        
    } catch (error) {
        console.error('Error generating category details PDF:', error);
        alert('Error generating PDF. Please try again.');
    }
};

window.exportCategoryToPDF = function(categoryName, productsSold, revenue) {
    // Create a custom popup instead of using alert()
    const popup = document.createElement('div');
    popup.className = 'summary-popup';
    popup.innerHTML = `
        <div class="summary-popup-content">
            <div class="summary-popup-header">
                <h5><i class="fas fa-file-pdf"></i> Export Category Data</h5>
            </div>
            
            <div class="summary-popup-body">
                <div class="export-category-section">
                    <h6><i class="fas fa-download"></i> Export ${categoryName} to PDF</h6>
                    
                    <div class="export-stats">
                        <div class="stat-item">
                            <span class="stat-label">Category:</span>
                            <span class="stat-value">${categoryName}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Products Sold:</span>
                            <span class="stat-value">${productsSold.toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Revenue:</span>
                            <span class="stat-value">$${revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    </div>
                    
                    <div class="export-actions">
                        <p><i class="fas fa-info-circle"></i> This will generate a detailed PDF report for ${categoryName}.</p>
                        <p>The report will include product details, revenue breakdown, and performance metrics.</p>
                        </div>
                </div>
            </div>
            
            <div class="summary-popup-footer">
                <button class="btn btn-secondary" onclick="closeSummaryPopup(this)">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button class="btn btn-success" onclick="generateCategoryPDF('${categoryName}', ${productsSold}, ${revenue})">
                    <i class="fas fa-file-pdf"></i> Generate PDF
                </button>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(popup);
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'summary-popup-backdrop';
    backdrop.onclick = () => closeSummaryPopup(popup);
    document.body.appendChild(backdrop);
    
    // Show popup
    setTimeout(() => popup.classList.add('show'), 10);
};

window.generateCategoryPDF = function(categoryName, productsSold, revenue) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set document properties
        doc.setProperties({
            title: `${categoryName} Performance Report`,
            subject: 'Category Performance Analysis',
            author: 'Russeykeo Computer',
            creator: 'Sales Dashboard'
        });
        
        // Add header
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text(`${categoryName} Performance Report`, 105, 20, { align: 'center' });
        
        // Add category info
        doc.setFontSize(16);
        doc.setFont(undefined, 'normal');
        doc.text(`Category Analysis Report`, 105, 35, { align: 'center' });
        
        // Add company info
        doc.setFontSize(12);
        doc.text('Russeykeo Computer', 105, 50, { align: 'center' });
        doc.text('Sales Analytics Report', 105, 60, { align: 'center' });
        
        // Add category data
        const categoryData = [
            ['Metric', 'Value'],
            ['Category', categoryName],
            ['Products Sold', productsSold.toString()],
            ['Total Revenue', `$${revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
            ['Average Revenue per Product', `$${(revenue / productsSold).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
            ['Report Generated', new Date().toLocaleDateString()]
        ];
        
        doc.autoTable({
            startY: 80,
            head: [['Metric', 'Value']],
            body: categoryData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 12, fontStyle: 'bold' },
            bodyStyles: { fontSize: 11 },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        
        // Add footer
        const finalY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.text('Generated on: ' + new Date().toLocaleDateString(), 20, finalY);
        doc.text('Russeykeo Computer - Sales Analytics Report', 105, finalY, { align: 'center' });
        
        doc.save(`${categoryName.toLowerCase()}_performance_report_${new Date().getFullYear()}.pdf`);
        
        // Close the popup after successful export
        closeSummaryPopup(document.querySelector('.summary-popup'));
        
    } catch (error) {
        console.error('Error generating category PDF:', error);
        alert('Error generating PDF. Please try again.');
    }
};

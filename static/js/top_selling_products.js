/**
 * Enhanced Top Selling Products Widget JavaScript
 * Handles the "Top Selling Products" table functionality with enhanced features
 */

// Global variables
let topSellingProductsData = [];
let currentSortBy = 'revenue';
let currentSearchTerm = '';
let isChartView = false;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the enhanced top selling products widget
    initializeEnhancedTopSellingProducts();
});

function initializeEnhancedTopSellingProducts() {
    console.log('Initializing Enhanced Top Selling Products widget...');
        
        // Fetch and render top selling products data
        fetchTopSellingProducts();
        
    // Set up event listeners
    setupEventListeners();
    
    // Initialize Chart.js if available
    if (typeof Chart !== 'undefined') {
        initializeChart();
    }
}

function closeProductDetailsModal() {
    const modal = document.getElementById('productDetailsModal');
    if (modal) {
        hideModal(modal);
    }
    
    // Clear stored product data
    if (window.currentProductForExport) {
        delete window.currentProductForExport;
    }
    
    // Clear stored summary data
    if (window.currentSummaryData) {
        delete window.currentSummaryData;
    }
}

function setupEventListeners() {
    // Export button
    const exportButton = document.getElementById('exportTopSellingProductsPDF');
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            console.log('Export button clicked, data:', topSellingProductsData);
            exportTopSellingProductsToPDF(topSellingProductsData);
        });
    }

    // Chart/Table toggle button
    const toggleButton = document.getElementById('toggleTopProductsView');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleView);
    }

    // Sort dropdown
    const sortSelect = document.getElementById('topProductsSortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSortBy = e.target.value;
            renderTopSellingProductsTable(topSellingProductsData);
        });
    }

    // Search input
    const searchInput = document.getElementById('topProductsSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value.toLowerCase();
            renderTopSellingProductsTable(topSellingProductsData);
        });
    }

    // Modal export button
    const modalExportButton = document.getElementById('exportProductDetails');
    if (modalExportButton) {
        modalExportButton.addEventListener('click', () => {
            // Check if this is a summary breakdown export
            if (window.currentSummaryData) {
                // Export summary breakdown data
                exportSummaryBreakdown(window.currentSummaryData);
            } else if (window.currentProductForExport) {
                // Export individual product data
                exportProductData(window.currentProductForExport.name, window.currentProductForExport);
            } else {
                // Fallback: try to get from modal title
                const modalTitle = document.getElementById('productDetailsModalLabel');
                if (modalTitle) {
                    const titleText = modalTitle.textContent || '';
                    if (titleText.includes('Revenue Breakdown')) {
                        // Export revenue summary
                        exportRevenueSummary(topSellingProductsData);
                    } else if (titleText.includes('Products Sales Breakdown')) {
                        // Export products summary
                        exportProductsSummary(topSellingProductsData);
                    } else if (titleText.includes('Price Analysis')) {
                        // Export price summary
                        exportPriceSummary(topSellingProductsData);
                    } else {
                        // Try to find individual product
                        const productName = titleText.replace('Product Details - ', '').trim();
                        const product = topSellingProductsData.find(p => p.name === productName);
                        if (product) {
                            exportProductData(product.name, product);
                        } else {
                            alert('No data available for export. Please try opening the details again.');
                        }
                    }
                } else {
                    alert('No data available for export. Please try opening the details again.');
                }
            }
        });
    }

    // Modal close button
    const modalCloseButton = document.querySelector('[data-bs-dismiss="modal"]');
    if (modalCloseButton) {
        modalCloseButton.addEventListener('click', closeProductDetailsModal);
    }

    // Close modal when clicking outside
    const modal = document.getElementById('productDetailsModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeProductDetailsModal();
            }
        });
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
                updateSummaryCards(topSellingProductsData);
                renderTopSellingProductsTable(topSellingProductsData);
                if (typeof Chart !== 'undefined') {
                    updateChart(topSellingProductsData);
                }
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

function updateSummaryCards(products) {
    const totalRevenue = products.reduce((sum, product) => sum + parseFloat(product.total_revenue), 0);
    const totalProducts = products.reduce((sum, product) => sum + parseInt(product.quantity_sold), 0);
    const avgPrice = totalProducts > 0 ? totalRevenue / totalProducts : 0;

    // Update summary cards
    const totalRevenueEl = document.getElementById('totalRevenue');
    const totalProductsEl = document.getElementById('totalProducts');
    const avgPriceEl = document.getElementById('avgPrice');

    if (totalRevenueEl) totalRevenueEl.textContent = `$${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (totalProductsEl) totalProductsEl.textContent = totalProducts.toLocaleString('en-US');
    if (avgPriceEl) avgPriceEl.textContent = `$${avgPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    // Make summary cards clickable
    makeSummaryCardsClickable(products, totalRevenue, totalProducts, avgPrice);
}

function makeSummaryCardsClickable(products, totalRevenue, totalProducts, avgPrice) {
    // Total Revenue Card
    const revenueCard = document.querySelector('.summary-card.total-revenue');
    if (revenueCard) {
        revenueCard.style.cursor = 'pointer';
        revenueCard.addEventListener('click', () => showRevenueBreakdown(products, totalRevenue));
    }

    // Total Products Card
    const productsCard = document.querySelector('.summary-card.total-products');
    if (productsCard) {
        productsCard.style.cursor = 'pointer';
        productsCard.addEventListener('click', () => showProductsBreakdown(products, totalProducts));
    }

    // Average Price Card
    const avgPriceCard = document.querySelector('.summary-card.avg-price');
    if (avgPriceCard) {
        avgPriceCard.style.cursor = 'pointer';
        avgPriceCard.addEventListener('click', () => showPriceAnalysis(products, avgPrice));
    }
}

function showRevenueBreakdown(products, totalRevenue) {
    if (!products || products.length === 0) {
        alert('No product data available for revenue analysis.');
        return;
    }

    const modal = document.getElementById('productDetailsModal');
    const modalTitle = document.getElementById('productDetailsModalLabel');
    const modalBody = modal.querySelector('.product-details-content');
    const exportButton = document.getElementById('exportProductDetails');

    if (!modal || !modalTitle || !modalBody) {
        console.error('Modal elements not found');
        return;
    }

    // Store summary data for export
    window.currentSummaryData = {
        type: 'revenue',
        products: products,
        totalRevenue: totalRevenue,
        title: 'Revenue Breakdown Analysis'
    };

    modalTitle.innerHTML = `<i class="fas fa-dollar-sign"></i> Money Made Analysis`;

    // Sort products by revenue
    const sortedProducts = [...products].sort((a, b) => parseFloat(b.total_revenue) - parseFloat(a.total_revenue));
    
    modalBody.innerHTML = `
        <div class="detail-section">
            <h6><i class="fas fa-chart-pie"></i> How Much Money We Made</h6>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Total Money Made:</span>
                    <span class="detail-value text-success">$${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Number of Products:</span>
                    <span class="detail-value">${products.length}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Average Money per Product:</span>
                    <span class="detail-value">$${(totalRevenue / products.length).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h6><i class="fas fa-trophy"></i> Our Best Money Makers</h6>
            <div class="detail-grid">
                ${sortedProducts.slice(0, 5).map((product, index) => `
                    <div class="detail-item">
                        <span class="detail-label">#${index + 1} ${product.name.substring(0, 30)}${product.name.length > 30 ? '...' : ''}</span>
                        <span class="detail-value text-success">$${parseFloat(product.total_revenue).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="detail-section">
            <h6><i class="fas fa-lightbulb"></i> What This Tells Us</h6>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Our Top Product:</span>
                    <span class="detail-value">${sortedProducts[0]?.name || 'None'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Money Range:</span>
                    <span class="detail-value">$${parseFloat(sortedProducts[sortedProducts.length - 1]?.total_revenue || 0).toLocaleString()} - $${parseFloat(sortedProducts[0]?.total_revenue || 0).toLocaleString()}</span>
                </div>
            </div>
        </div>
    `;

    // Show/hide export button based on data availability
    if (exportButton) {
        if (products && products.length > 0 && totalRevenue > 0) {
            exportButton.style.display = 'inline-block';
            exportButton.disabled = false;
        } else {
            exportButton.style.display = 'none';
        }
    }

    // Show modal
    showModal(modal);
}

function showProductsBreakdown(products, totalProducts) {
    if (!products || products.length === 0) {
        alert('No product data available for sales analysis.');
        return;
    }

    const modal = document.getElementById('productDetailsModal');
    const modalTitle = document.getElementById('productDetailsModalLabel');
    const modalBody = modal.querySelector('.product-details-content');
    const exportButton = document.getElementById('exportProductDetails');

    if (!modal || !modalTitle || !modalBody) {
        console.error('Modal elements not found');
        return;
    }

    // Store summary data for export
    window.currentSummaryData = {
        type: 'products',
        products: products,
        totalProducts: totalProducts,
        title: 'Products Sales Breakdown'
    };

    modalTitle.innerHTML = `<i class="fas fa-box"></i> How Many We Sold`;

    // Sort products by quantity sold
    const sortedProducts = [...products].sort((a, b) => parseInt(b.quantity_sold) - parseInt(a.quantity_sold));
    
    modalBody.innerHTML = `
        <div class="detail-section">
            <h6><i class="fas fa-chart-bar"></i> Sales Numbers Overview</h6>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Total Items Sold:</span>
                    <span class="detail-value text-success">${totalProducts.toLocaleString()}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Different Products:</span>
                    <span class="detail-value">${products.length}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Average Sales per Product:</span>
                    <span class="detail-value">${Math.round(totalProducts / products.length).toLocaleString()}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h6><i class="fas fa-fire"></i> Our Most Popular Products</h6>
            <div class="detail-grid">
                ${sortedProducts.slice(0, 5).map((product, index) => `
                    <div class="detail-item">
                        <span class="detail-label">#${index + 1} ${product.name.substring(0, 30)}${product.name.length > 30 ? '...' : ''}</span>
                        <span class="detail-value text-success">${parseInt(product.quantity_sold).toLocaleString()} sold</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="detail-section">
            <h6><i class="fas fa-chart-line"></i> Sales Breakdown</h6>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Top 5 Products:</span>
                    <span class="detail-value">${Math.round((sortedProducts.slice(0, 5).reduce((sum, p) => sum + parseInt(p.quantity_sold), 0) / totalProducts) * 100)}% of all sales</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Most Popular:</span>
                    <span class="detail-value">${sortedProducts[0]?.name || 'None'}</span>
                </div>
            </div>
        </div>
    `;

    // Show/hide export button based on data availability
    if (exportButton) {
        if (products && products.length > 0 && totalProducts > 0) {
            exportButton.style.display = 'inline-block';
            exportButton.disabled = false;
        } else {
            exportButton.style.display = 'none';
        }
    }

    // Show modal
    showModal(modal);
}

function showPriceAnalysis(products, avgPrice) {
    if (!products || products.length === 0) {
        alert('No product data available for price analysis.');
        return;
    }

    const modal = document.getElementById('productDetailsModal');
    const modalTitle = document.getElementById('productDetailsModalLabel');
    const modalBody = modal.querySelector('.product-details-content');
    const exportButton = document.getElementById('exportProductDetails');

    if (!modal || !modalTitle || !modalBody) {
        console.error('Modal elements not found');
        return;
    }

    // Store summary data for export
    window.currentSummaryData = {
        type: 'price',
        products: products,
        avgPrice: avgPrice,
        title: 'Price Analysis'
    };

    modalTitle.innerHTML = `<i class="fas fa-tag"></i> Price Check`;

    // Calculate price statistics
    const prices = products.map(p => parseFloat(p.total_revenue) / parseInt(p.quantity_sold));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    // Sort products by price
    const sortedByPrice = [...products].sort((a, b) => {
        const priceA = parseFloat(a.total_revenue) / parseInt(a.quantity_sold);
        const priceB = parseFloat(b.total_revenue) / parseInt(b.quantity_sold);
        return priceB - priceA;
    });
    
    modalBody.innerHTML = `
        <div class="detail-section">
            <h6><i class="fas fa-chart-area"></i> Price Information</h6>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Average Price:</span>
                    <span class="detail-value text-success">$${avgPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Price Range:</span>
                    <span class="detail-value">$${minPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} - $${maxPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Price Difference:</span>
                    <span class="detail-value">$${priceRange.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h6><i class="fas fa-crown"></i> Our Most Expensive Products</h6>
            <div class="detail-grid">
                ${sortedByPrice.slice(0, 5).map((product, index) => {
                    const price = parseFloat(product.total_revenue) / parseInt(product.quantity_sold);
                    return `
                        <div class="detail-item">
                            <span class="detail-label">#${index + 1} ${product.name.substring(0, 30)}${product.name.length > 30 ? '...' : ''}</span>
                            <span class="detail-value text-success">$${price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        
        <div class="detail-section">
            <h6><i class="fas fa-lightbulb"></i> What This Means</h6>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Price Level:</span>
                    <span class="detail-value">${avgPrice > 1000 ? 'High-End' : avgPrice > 500 ? 'Mid-Range' : 'Budget'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Market Position:</span>
                    <span class="detail-value">${avgPrice > maxPrice * 0.8 ? 'Premium' : avgPrice > maxPrice * 0.5 ? 'Standard' : 'Value'}</span>
                </div>
            </div>
        </div>
    `;

    // Show/hide export button based on data availability
    if (exportButton) {
        if (products && products.length > 0 && avgPrice > 0) {
            exportButton.style.display = 'inline-block';
            exportButton.disabled = false;
        } else {
            exportButton.style.display = 'none';
        }
    }

    // Show modal
    showModal(modal);
}

function toggleView() {
    const chartContainer = document.getElementById('topProductsChartContainer');
    const tableContainer = document.getElementById('topProductsTableContainer');
    const toggleButton = document.getElementById('toggleTopProductsView');
    
    if (!chartContainer || !tableContainer || !toggleButton) {
        console.error('Required elements not found for view toggle');
        return;
    }

    if (isChartView) {
        // Switch to table view
        chartContainer.style.display = 'none';
        tableContainer.style.display = 'block';
        toggleButton.innerHTML = '<i class="fas fa-chart-bar"></i> Chart View';
        isChartView = false;
    } else {
        // Switch to chart view
        tableContainer.style.display = 'none';
        chartContainer.style.display = 'block';
        toggleButton.innerHTML = '<i class="fas fa-table"></i> Table View';
        isChartView = true;
        
        // Initialize chart if not already done
        if (!window.topProductsChart) {
            initializeChart();
        }
        
        // Update chart with current data
        if (window.topProductsChart && topSellingProductsData.length > 0) {
            updateChart(topSellingProductsData);
        }
    }
}

function initializeChart() {
    console.log('Initializing chart...');
    
    const ctx = document.getElementById('topProductsChart');
    if (!ctx) {
        console.error('Chart canvas element not found');
        return;
    }

    try {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library not loaded');
            return;
        }

        // Create chart with clickable bars
        window.topProductsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue',
                    data: [],
                    backgroundColor: 'rgba(52, 152, 219, 0.8)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(52, 152, 219, 1)',
                    hoverBorderColor: 'rgba(52, 152, 219, 1)',
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 2,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return `Revenue: $${parseFloat(context.parsed.y).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                            },
                            afterLabel: function(context) {
                                return 'Click for details';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const productData = topSellingProductsData[index];
                        if (productData) {
                            showProductDetailsFromChart(productData);
                        }
                    }
                },
                onHover: function(event, elements) {
                    const canvas = event.native.target;
                    if (elements.length > 0) {
                        canvas.style.cursor = 'pointer';
                    } else {
                        canvas.style.cursor = 'default';
                    }
                }
            }
        });

        console.log('Chart initialized successfully');

        // Add click instruction text below chart
        const chartContainer = document.getElementById('topProductsChartContainer');
        if (chartContainer) {
            // Remove existing instructions if any
            const existingInstructions = chartContainer.querySelector('.chart-instructions');
            if (existingInstructions) {
                existingInstructions.remove();
            }

            const instructionText = document.createElement('div');
            instructionText.className = 'chart-instructions';
            instructionText.innerHTML = '<i class="fas fa-mouse-pointer"></i> Click on any bar to see product details';
            instructionText.style.cssText = `
                text-align: center;
                color: #6c757d;
                font-size: 0.9em;
                margin-top: 10px;
                font-style: italic;
            `;
            chartContainer.appendChild(instructionText);
        }

    } catch (error) {
        console.error('Error initializing chart:', error);
        // Show error message to user
        const chartContainer = document.getElementById('topProductsChartContainer');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2em; color: #ffc107; margin-bottom: 15px;"></i>
                    <p>Chart could not be loaded. Please try refreshing the page.</p>
                    <small>Error: ${error.message}</small>
                </div>
            `;
        }
    }
}

function updateChart(products) {
    if (!window.topProductsChart) {
        console.log('Chart not initialized, initializing now...');
        initializeChart();
        return;
    }

    try {
        if (!products || products.length === 0) {
            console.log('No products data to display in chart');
            return;
        }

        // Sort products by revenue for better chart visualization
        const sortedProducts = [...products].sort((a, b) => parseFloat(b.total_revenue) - parseFloat(a.total_revenue));
        
        // Prepare chart data
        const labels = sortedProducts.map(product => {
            // Truncate long product names for better display
            const name = product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name;
            return name;
        });
        
        const data = sortedProducts.map(product => parseFloat(product.total_revenue));

        // Update chart data
        window.topProductsChart.data.labels = labels;
        window.topProductsChart.data.datasets[0].data = data;
        
        // Update chart
        window.topProductsChart.update('none'); // Use 'none' mode for better performance
        
        console.log('Chart updated successfully with', products.length, 'products');
        
    } catch (error) {
        console.error('Error updating chart:', error);
        // Show error message in chart container
        const chartContainer = document.getElementById('topProductsChartContainer');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2em; color: #ffc107; margin-bottom: 15px;"></i>
                    <p>Chart could not be updated. Please try refreshing the page.</p>
                    <small>Error: ${error.message}</small>
                </div>
            `;
        }
    }
}

    function renderTopSellingProductsTable(products) {
        const tableBody = document.getElementById('topSellingProductsTable');
    if (!tableBody) return;

    // Filter and sort products
    let filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(currentSearchTerm)
    );

    // Sort products
    filteredProducts.sort((a, b) => {
        switch (currentSortBy) {
            case 'revenue':
                return parseFloat(b.total_revenue) - parseFloat(a.total_revenue);
            case 'quantity':
                return parseInt(b.quantity_sold) - parseInt(a.quantity_sold);
            case 'name':
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });

    // Clear table
            tableBody.innerHTML = '';

    if (filteredProducts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="no-data-message">No products found matching your search.</td></tr>';
                return;
            }

    // Render products
    filteredProducts.forEach((product, index) => {
        const avgPrice = parseFloat(product.total_revenue) / parseInt(product.quantity_sold);
        const row = `
            <tr data-product-id="${product.id || index}" class="product-row">
                <td>${index + 1}</td>
                <td>
                    <div class="product-info">
                        <strong>${product.name}</strong>
                        <small class="text-muted d-block">ID: ${product.id || 'N/A'}</small>
                    </div>
                </td>
                <td class="text-center">
                    <span class="badge badge-primary">${parseInt(product.quantity_sold).toLocaleString()}</span>
                </td>
                <td class="text-success">
                    <strong>$${parseFloat(product.total_revenue).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                </td>
                <td class="text-center">
                    $${avgPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-view-details" onclick="viewProductDetails('${product.name}', ${JSON.stringify(product).replace(/"/g, '&quot;')})">
                            <i class="fas fa-eye"></i> Details
                        </button>
                        <button class="btn-export-product" onclick="exportProductData('${product.name}', ${JSON.stringify(product).replace(/"/g, '&quot;')})">
                            <i class="fas fa-download"></i> Export
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });

    // Add click handlers for product rows
    addProductRowHandlers();
}

function addProductRowHandlers() {
    const productRows = document.querySelectorAll('.product-row');
    productRows.forEach(row => {
        row.addEventListener('click', (e) => {
            if (!e.target.closest('.action-buttons')) {
                const productId = row.dataset.productId;
                const product = topSellingProductsData.find(p => p.id == productId || p.name === row.querySelector('td:nth-child(2) strong').textContent);
                if (product) {
                    viewProductDetails(product.name, product);
                }
            }
        });
    });
}

function viewProductDetails(productName, productData) {
    const modal = document.getElementById('productDetailsModal');
    const modalTitle = document.getElementById('productDetailsModalLabel');
    
    if (!modal || !modalTitle) {
        console.error('Modal elements not found');
        return;
    }
    
    const modalBody = modal.querySelector('.product-details-content');
    if (!modalBody) {
        console.error('Modal body not found');
        return;
    }

    modalTitle.innerHTML = `<i class="fas fa-info-circle"></i> Product Details - ${productName}`;

    const avgPrice = parseFloat(productData.total_revenue) / parseInt(productData.quantity_sold);
    
    modalBody.innerHTML = `
        <div class="detail-section">
            <h6><i class="fas fa-chart-line"></i> Sales Performance</h6>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Total Revenue:</span>
                    <span class="detail-value text-success">$${parseFloat(productData.total_revenue).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Quantity Sold:</span>
                    <span class="detail-value">${parseInt(productData.quantity_sold).toLocaleString()}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Average Price:</span>
                    <span class="detail-value">$${avgPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Product Name:</span>
                    <span class="detail-value">${productData.name}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h6><i class="fas fa-lightbulb"></i> Insights</h6>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Revenue per Unit:</span>
                    <span class="detail-value">$${avgPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Performance Rank:</span>
                    <span class="detail-value">#${topSellingProductsData.findIndex(p => p.name === productData.name) + 1}</span>
                </div>
            </div>
        </div>
    `;

    // Store current product data for export
    window.currentProductForExport = productData;

    // Show modal using Bootstrap 5 API with proper options
    try {
        // Remove any existing modal instances
        if (window.currentModal) {
            window.currentModal.dispose();
        }
        
        // Create new modal instance with proper options
        window.currentModal = new bootstrap.Modal(modal, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
        
        // Show the modal
        window.currentModal.show();
        
        // Ensure modal is properly positioned
        modal.style.display = 'block';
        modal.classList.add('show');
        
        // Force reflow to ensure proper rendering
        modal.offsetHeight;
        
    } catch (error) {
        console.error('Error showing modal:', error);
        // Fallback: show modal manually
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Add backdrop manually if needed
        let backdrop = document.querySelector('.modal-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
        }
    }
}

function showProductDetailsFromChart(productData) {
    const modal = document.getElementById('productDetailsModal');
    const modalTitle = document.getElementById('productDetailsModalLabel');
    const modalBody = modal.querySelector('.product-details-content');

    if (!modal || !modalTitle || !modalBody) {
        console.error('Modal elements not found');
        return;
    }

    // Store current product data for export
    window.currentProductForExport = productData;

    modalTitle.innerHTML = `<i class="fas fa-info-circle"></i> Product Details - ${productData.name}`;

    const avgPrice = parseFloat(productData.total_revenue) / parseInt(productData.quantity_sold);
    
    modalBody.innerHTML = `
        <div class="detail-section">
            <h6><i class="fas fa-chart-line"></i> Sales Performance</h6>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Total Money Made:</span>
                    <span class="detail-value text-success">$${parseFloat(productData.total_revenue).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">How Many Sold:</span>
                    <span class="detail-value">${parseInt(productData.quantity_sold).toLocaleString()}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Average Price:</span>
                    <span class="detail-value">$${avgPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Product Name:</span>
                    <span class="detail-value">${productData.name}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h6><i class="fas fa-lightbulb"></i> What This Tells Us</h6>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Money per Unit:</span>
                    <span class="detail-value">$${avgPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Performance Rank:</span>
                    <span class="detail-value">#${topSellingProductsData.findIndex(p => p.name === productData.name) + 1}</span>
                </div>
            </div>
        </div>
    `;

    // Show modal
    showModal(modal);
    
    // Wait a bit for modal to be fully rendered, then load orders
    setTimeout(() => {
        console.log('🎯 About to call loadProductOrders with:', productData.name);
        console.log('🔍 Modal body element:', modalBody);
        console.log('🔍 Modal element:', modal);
        
        // Check if orderListSection exists in the modal
        const orderListSection = modal.querySelector('#orderListSection');
        console.log('🔍 orderListSection found in modal:', orderListSection);
        
        if (orderListSection) {
            console.log('✅ orderListSection found, loading orders...');
            loadProductOrders(productData.name);
        } else {
            console.error('❌ orderListSection not found in modal!');
            // Try to find it in the document
            const globalOrderListSection = document.getElementById('orderListSection');
            console.log('🔍 Global orderListSection found:', globalOrderListSection);
            
            if (globalOrderListSection) {
                console.log('✅ Global orderListSection found, loading orders...');
                loadProductOrders(productData.name);
            } else {
                console.error('❌ No orderListSection found anywhere!');
            }
        }
    }, 500); // Increased timeout to 500ms
}

async function exportProductData(productName, productData) {
    // Generate detailed PDF report with order list and profit data
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add logo at the top left
        try {
            const logoBase64 = await loadLogoAsBase64();
            if (logoBase64) {
                doc.addImage(logoBase64, 'JPEG', 20, 10, 35, 28, undefined, 'FAST');
            }
        } catch (logoError) {
            console.log('Logo loading failed, continuing without logo');
        }
        
        // Add company header (adjusted position for logo)
        doc.setFontSize(24);
        doc.setTextColor(52, 152, 219);
        doc.text('Russeykeo Computer', 70, 25);
        
        // Add report title
        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80);
        doc.text('Product Performance Report', 20, 50);
        
        // Add product name
        doc.setFontSize(16);
        doc.setTextColor(52, 73, 94);
        doc.text(`Product: ${productName}`, 20, 70);
        
        // Add generation date
        doc.setFontSize(12);
        doc.setTextColor(127, 140, 141);
        doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 85);
        
        // Add summary section
        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text('Performance Summary', 20, 105);
        
        const avgPrice = parseFloat(productData.total_revenue) / parseInt(productData.quantity_sold);
        const performanceRank = topSellingProductsData.findIndex(p => p.name === productData.name) + 1;
        const totalProfit = parseFloat(productData.total_revenue) * 0.15; // 15% profit margin
        
        // Summary table with profit
        const summaryData = [
            ['Total Revenue', `$${parseFloat(productData.total_revenue).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
            ['Quantity Sold', parseInt(productData.quantity_sold).toLocaleString()],
            ['Average Price', `$${avgPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
            ['Performance Rank', `#${performanceRank}`],
            ['Total Profit (15%)', `$${totalProfit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`]
        ];
        
        doc.autoTable({
            head: [['Metric', 'Value']],
            body: summaryData,
            startY: 115,
            styles: {
                fontSize: 11,
                cellPadding: 8
            },
            headStyles: {
                fillColor: [52, 152, 219],
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250]
            }
        });
        
        // Add order list section if available
        if (allProductOrdersData && allProductOrdersData.length > 0) {
            const orderListY = doc.lastAutoTable.finalY + 20;
            doc.setFontSize(14);
            doc.setTextColor(44, 62, 80);
            doc.text('Order Details', 20, orderListY);
            
            // Prepare order data for table
            const orderTableData = allProductOrdersData.map(order => [
                order.order_id,
                order.customer_name,
                order.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A',
                order.quantity,
                `$${order.unit_price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
                `$${order.total_amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
                `$${order.estimated_profit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
            ]);
            
            doc.autoTable({
                head: [['Order ID', 'Customer', 'Date', 'Qty', 'Unit Price', 'Total', 'Profit']],
                body: orderTableData,
                startY: orderListY + 10,
                styles: {
                    fontSize: 9,
                    cellPadding: 4
                },
                headStyles: {
                    fillColor: [52, 152, 219],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250]
                },
                columnStyles: {
                    0: { cellWidth: 25 }, // Order ID
                    1: { cellWidth: 35 }, // Customer
                    2: { cellWidth: 25 }, // Date
                    3: { cellWidth: 15 }, // Qty
                    4: { cellWidth: 25 }, // Unit Price
                    5: { cellWidth: 25 }, // Total
                    6: { cellWidth: 25 }  // Profit
                }
            });
        }
        
        // Add insights section
        const finalY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text('Recommendations', 20, finalY);
        
        doc.setFontSize(11);
        doc.setTextColor(52, 73, 94);
        
        let recY = finalY + 10;
        
        // Generate recommendations based on performance
        if (performanceRank <= 3) {
            doc.text('* Consider increasing inventory for this high-performing product', 20, recY);
            recY += 6;
            doc.text('* Use as a featured product in marketing campaigns', 20, recY);
            recY += 6;
            doc.text('* Monitor stock levels closely to avoid stockouts', 20, recY);
        } else {
            doc.text('* Analyze pricing strategy to improve competitiveness', 20, recY);
            recY += 6;
            doc.text('* Consider promotional activities to boost sales', 20, recY);
            recY += 6;
            doc.text('* Review product positioning and marketing approach', 20, recY);
        }
        
        // Add footer
        doc.setFontSize(10);
        doc.setTextColor(127, 140, 141);
        doc.text('Russeykeo Computer - Sales Analytics Report', 20, recY + 15);
        doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, 20, recY + 25);
        
        // Save PDF with descriptive filename
        const filename = `${productName.replace(/[^a-zA-Z0-9]/g, '_')}_detailed_report.pdf`;
        doc.save(filename);
        
        console.log('PDF export completed successfully');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF report. Please try again.');
    }
}

function downloadCSV(rows, filename) {
    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function hideMessage() {
    const messageEl = document.getElementById('topSellingProductsMessage');
    if (messageEl) messageEl.style.display = 'none';
}

function showMessage(message) {
    const messageEl = document.getElementById('topSellingProductsMessage');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.style.display = 'block';
    }
}

function clearTable() {
    const tableBody = document.getElementById('topSellingProductsTable');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="6" class="no-data-message">No data available</td></tr>';
    }
}

// Export function for PDF generation
function exportTopSellingProductsToPDF(data) {
    if (!data || data.length === 0) {
        alert('No data to export.');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(20);
        doc.text('Top Selling Products Report', 20, 20);
        
        // Add date
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
        
        // Add table
        const tableData = data.map((product, index) => [
            index + 1,
            product.name,
            product.quantity_sold,
            `$${parseFloat(product.total_revenue).toFixed(2)}`
        ]);

        doc.autoTable({
            head: [['#', 'Product Name', 'Quantity Sold', 'Total Revenue']],
            body: tableData,
            startY: 50,
            styles: {
                fontSize: 10,
                cellPadding: 5
            },
            headStyles: {
                fillColor: [52, 152, 219],
                textColor: 255
            }
        });

        // Save PDF
        doc.save('top_selling_products_report.pdf');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    }
}

// Summary export functions
function exportSummaryBreakdown(summaryData) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add company header
        doc.setFontSize(24);
        doc.setTextColor(52, 152, 219);
        doc.text('Russeykeo Computer', 20, 20);
        
        // Add report title
        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80);
        doc.text(summaryData.title, 20, 40);
        
        // Add generation date
        doc.setFontSize(12);
        doc.setTextColor(127, 140, 141);
        doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 55);
        
        let currentY = 70;
        
        switch (summaryData.type) {
            case 'revenue':
                currentY = exportRevenueSummaryContent(doc, summaryData, currentY);
                break;
            case 'products':
                currentY = exportProductsSummaryContent(doc, summaryData, currentY);
                break;
            case 'price':
                currentY = exportPriceSummaryContent(doc, summaryData, currentY);
                break;
        }
        
        // Add footer
        doc.setFontSize(10);
        doc.setTextColor(127, 140, 141);
        doc.text('Russeykeo Computer - Sales Analytics Report', 20, currentY + 10);
        doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, 20, currentY + 20);
        
        // Save PDF
        const filename = `${summaryData.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        
        console.log('Summary PDF export completed successfully');
        
    } catch (error) {
        console.error('Error generating summary PDF:', error);
        alert('Error generating PDF report. Please try again.');
    }
}

function exportRevenueSummaryContent(doc, summaryData, startY) {
    let currentY = startY;
    
    // Revenue Overview
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('How Much Money We Made', 20, currentY);
    
    const overviewData = [
        ['Total Money Made', `$${summaryData.totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
        ['Number of Products', summaryData.products.length.toString()],
        ['Average Money per Product', `$${(summaryData.totalRevenue / summaryData.products.length).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`]
    ];
    
    doc.autoTable({
        head: [['What We Track', 'Amount']],
        body: overviewData,
        startY: currentY + 10,
        styles: { fontSize: 11, cellPadding: 8 },
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 250] }
    });
    
    currentY = doc.lastAutoTable.finalY + 20;
    
    // Top Revenue Generators
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('Our Best Money Makers', 20, currentY);
    
    const sortedProducts = [...summaryData.products].sort((a, b) => parseFloat(b.total_revenue) - parseFloat(a.total_revenue));
    const topProductsData = sortedProducts.slice(0, 5).map((product, index) => [
        `#${index + 1}`,
        product.name.substring(0, 40),
        `$${parseFloat(product.total_revenue).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
    ]);
    
    doc.autoTable({
        head: [['Rank', 'Product Name', 'Money Made']],
        body: topProductsData,
        startY: currentY + 10,
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 250] }
    });
    
    return doc.lastAutoTable.finalY + 20;
}

function exportProductsSummaryContent(doc, summaryData, startY) {
    let currentY = startY;
    
    // Sales Overview
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('Sales Numbers Overview', 20, currentY);
    
    const overviewData = [
        ['Total Items Sold', summaryData.totalProducts.toLocaleString()],
        ['Different Products', summaryData.products.length.toString()],
        ['Average Sales per Product', Math.round(summaryData.totalProducts / summaryData.products.length).toLocaleString()]
    ];
    
    doc.autoTable({
        head: [['What We Track', 'Number']],
        body: overviewData,
        startY: currentY + 10,
        styles: { fontSize: 11, cellPadding: 8 },
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 250] }
    });
    
    currentY = doc.lastAutoTable.finalY + 20;
    
    // Best Selling Products
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('Our Most Popular Products', 20, currentY);
    
    const sortedProducts = [...summaryData.products].sort((a, b) => parseInt(b.quantity_sold) - parseInt(a.quantity_sold));
    const topProductsData = sortedProducts.slice(0, 5).map((product, index) => [
        `#${index + 1}`,
        product.name.substring(0, 40),
        `${parseInt(product.quantity_sold).toLocaleString()} sold`
    ]);
    
    doc.autoTable({
        head: [['Rank', 'Product Name', 'How Many Sold']],
        body: topProductsData,
        startY: currentY + 10,
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 250] }
    });
    
    return doc.lastAutoTable.finalY + 20;
}

function exportPriceSummaryContent(doc, summaryData, startY) {
    let currentY = startY;
    
    // Price Statistics
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('Price Information', 20, currentY);
    
    const prices = summaryData.products.map(p => parseFloat(p.total_revenue) / parseInt(p.quantity_sold));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    const overviewData = [
        ['Average Price', `$${summaryData.avgPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
        ['Price Range', `$${minPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} - $${maxPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
        ['Price Difference', `$${priceRange.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`]
    ];
    
    doc.autoTable({
        head: [['What We Track', 'Price']],
        body: overviewData,
        startY: currentY + 10,
        styles: { fontSize: 11, cellPadding: 8 },
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 250] }
    });
    
    currentY = doc.lastAutoTable.finalY + 20;
    
    // Premium Products
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('Our Most Expensive Products', 20, currentY);
    
    const sortedByPrice = [...summaryData.products].sort((a, b) => {
        const priceA = parseFloat(a.total_revenue) / parseInt(a.quantity_sold);
        const priceB = parseFloat(b.total_revenue) / parseInt(b.quantity_sold);
        return priceB - priceA;
    });
    
    const topPriceData = sortedByPrice.slice(0, 5).map((product, index) => {
        const price = parseFloat(product.total_revenue) / parseInt(product.quantity_sold);
        return [
            `#${index + 1}`,
            product.name.substring(0, 40),
            `$${price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
        ];
    });
    
    doc.autoTable({
        head: [['Rank', 'Product Name', 'Price']],
        body: topPriceData,
        startY: currentY + 10,
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 250] }
    });
    
    return doc.lastAutoTable.finalY + 20;
}

// Legacy functions for backward compatibility
function exportRevenueSummary(data) {
    exportSummaryBreakdown({
        type: 'revenue',
        products: data,
        totalRevenue: data.reduce((sum, p) => sum + parseFloat(p.total_revenue), 0),
        title: 'Revenue Breakdown Analysis'
    });
}

function exportProductsSummary(data) {
    exportSummaryBreakdown({
        type: 'products',
        products: data,
        totalProducts: data.reduce((sum, p) => sum + parseInt(p.quantity_sold), 0),
        title: 'Products Sales Breakdown'
    });
}

function exportPriceSummary(data) {
    const totalRevenue = data.reduce((sum, p) => sum + parseFloat(p.total_revenue), 0);
    const totalProducts = data.reduce((sum, p) => sum + parseInt(p.quantity_sold), 0);
    const avgPrice = totalProducts > 0 ? totalRevenue / totalProducts : 0;
    
    exportSummaryBreakdown({
        type: 'price',
        products: data,
        avgPrice: avgPrice,
        title: 'Price Analysis'
    });
}

// Helper function to show modal safely
function showModal(modal) {
    try {
        // Clean up any existing modal instances
        if (window.currentModal && typeof window.currentModal.dispose === 'function') {
            try {
                window.currentModal.dispose();
            } catch (e) {
                console.warn('Error disposing previous modal:', e);
            }
        }
        
        // Reset modal state
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        
        // Remove any existing backdrop
        const existingBackdrop = document.querySelector('.modal-backdrop');
        if (existingBackdrop) {
            existingBackdrop.remove();
        }
        
        // Create new modal instance
        window.currentModal = new bootstrap.Modal(modal, { 
            backdrop: true, 
            keyboard: true, 
            focus: true 
        });
        
        // Show modal
        window.currentModal.show();
        
    } catch (error) {
        console.error('Error showing modal with Bootstrap:', error);
        // Fallback to basic modal display
        try {
            modal.style.display = 'block';
            modal.classList.add('show');
            document.body.classList.add('modal-open');
            
            // Add backdrop manually
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            backdrop.style.zIndex = '1055';
            document.body.appendChild(backdrop);
            
            // Handle backdrop click
            backdrop.addEventListener('click', () => hideModal(modal));
            
        } catch (fallbackError) {
            console.error('Fallback modal display failed:', fallbackError);
        }
    }
}

// Helper function to hide modal safely
function hideModal(modal) {
    try {
        if (window.currentModal && typeof window.currentModal.hide === 'function') {
            window.currentModal.hide();
        } else {
            // Manual hide
            modal.style.display = 'none';
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
            
            // Remove backdrop
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
        }
    } catch (error) {
        console.error('Error hiding modal:', error);
        // Force hide
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    }
}

// Clean up modal when page unloads
window.addEventListener('beforeunload', () => {
    if (window.currentModal && typeof window.currentModal.dispose === 'function') {
        try {
            window.currentModal.dispose();
        } catch (e) {
            console.warn('Error disposing modal on unload:', e);
        }
    }
});

// Handle modal close button clicks
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('productDetailsModal');
    if (modal) {
        const closeButtons = modal.querySelectorAll('[data-bs-dismiss="modal"], .btn-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                hideModal(modal);
            });
        });
        
        // Handle modal backdrop clicks
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal);
            }
        });
    }
});

// ===== PRODUCT ORDERS FUNCTIONALITY =====

// Helper function to load logo as Base64
async function loadLogoAsBase64() {
    try {
        const response = await fetch('/static/icons/logo.jpg');
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.log('Error loading logo:', error);
        return null;
    }
}

// Global pagination variables for product orders
let currentProductPage = 1;
let totalProductPages = 1;
let ordersPerProductPage = 10;
let allProductOrdersData = [];
let currentProductForPagination = '';

// Function to load product orders
async function loadProductOrders(productName) {
    try {
        console.log('🚀 Loading orders for product:', productName);
        console.log('🔍 Looking for orderListSection element...');
        
        // Add a simple test to see if this function is being called
        alert('loadProductOrders function called for: ' + productName);
        
        const orderListSection = document.getElementById('orderListSection');
        console.log('📋 orderListSection found:', orderListSection);
        
        if (!orderListSection) {
            console.error('❌ orderListSection element not found!');
            alert('orderListSection element not found!');
            return;
        }
        
        console.log('🌐 Fetching from API...');
        const response = await fetch(`/auth/staff/api/reports/product_orders?product_name=${encodeURIComponent(productName)}`);
        console.log('📡 API Response status:', response.status);
        
        const data = await response.json();
        console.log('📊 API Response data:', data);
        
        if (data.success) {
            allProductOrdersData = data.orders;
            currentProductForPagination = productName;
            currentProductPage = 1;
            totalProductPages = Math.ceil(allProductOrdersData.length / ordersPerProductPage);
            
            console.log('✅ Orders loaded successfully:', allProductOrdersData.length, 'orders');
            console.log('📄 Total pages:', totalProductPages);
            
            // Show order list section
            orderListSection.style.display = 'block';
            console.log('👁️ Order list section shown');
            
            // Display orders for current page
            displayProductOrdersForCurrentPage();
            updateProductPaginationControls();
            
        } else {
            console.error('❌ Failed to load product orders:', data.error);
            // Show error message or hide order section
            orderListSection.style.display = 'none';
        }
        
    } catch (error) {
        console.error('💥 Error loading product orders:', error);
        // Hide order section on error
        const orderListSection = document.getElementById('orderListSection');
        if (orderListSection) {
            orderListSection.style.display = 'none';
        }
    }
}

// Function to display orders for current page
function displayProductOrdersForCurrentPage() {
    console.log('🎯 Displaying orders for current page...');
    console.log('📊 Current page:', currentProductPage);
    console.log('📋 Total orders:', allProductOrdersData.length);
    
    const tableBody = document.getElementById('productOrdersTableBody');
    console.log('📋 Table body element found:', tableBody);
    
    if (!tableBody) {
        console.error('❌ productOrdersTableBody element not found!');
        return;
    }
    
    const startIndex = (currentProductPage - 1) * ordersPerProductPage;
    const endIndex = startIndex + ordersPerProductPage;
    const currentPageOrders = allProductOrdersData.slice(startIndex, endIndex);
    
    console.log('📄 Orders for current page:', currentPageOrders.length);
    console.log('📄 Orders data:', currentPageOrders);
    
    if (currentPageOrders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No orders found</td></tr>';
        console.log('📝 Displayed "No orders found" message');
        return;
    }
    
    const ordersHTML = currentPageOrders.map(order => `
        <tr>
            <td>${order.order_id}</td>
            <td>${order.customer_name}</td>
            <td>${order.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A'}</td>
            <td>${order.quantity}</td>
            <td>$${order.unit_price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>$${order.total_amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="text-success">$${order.estimated_profit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
        </tr>
    `).join('');
    
    tableBody.innerHTML = ordersHTML;
    console.log('✅ Orders table populated with', currentPageOrders.length, 'rows');
}

// Function to update pagination controls
function updateProductPaginationControls() {
    console.log('🎛️ Updating pagination controls...');
    console.log('📄 Total pages:', totalProductPages);
    
    const pageNumbersContainer = document.getElementById('productPageNumbers');
    console.log('🎛️ Page numbers container found:', pageNumbersContainer);
    
    if (!pageNumbersContainer) {
        console.error('❌ productPageNumbers element not found!');
        return;
    }
    
    if (totalProductPages <= 1) {
        pageNumbersContainer.innerHTML = '';
        console.log('📄 Single page, no pagination needed');
        return;
    }
    
    const pageNumbers = generateProductPageNumbers();
    pageNumbersContainer.innerHTML = pageNumbers;
    console.log('✅ Pagination controls updated');
}

// Function to generate page number buttons
function generateProductPageNumbers() {
    let pageNumbersHTML = '';
    
    for (let i = 1; i <= totalProductPages; i++) {
        const isActive = i === currentProductPage;
        pageNumbersHTML += `
            <button class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-primary'}" 
                    onclick="goToProductPage(${i})">
                ${i}
            </button>
        `;
    }
    
    return pageNumbersHTML;
}

// Function to change page
function changeProductPage(direction) {
    if (direction === 'prev' && currentProductPage > 1) {
        currentProductPage--;
    } else if (direction === 'next' && currentProductPage < totalProductPages) {
        currentProductPage++;
    }
    
    displayProductOrdersForCurrentPage();
    updateProductPaginationControls();
}

// Function to go to specific page
function goToProductPage(pageNumber) {
    if (pageNumber >= 1 && pageNumber <= totalProductPages) {
        currentProductPage = pageNumber;
        displayProductOrdersForCurrentPage();
        updateProductPaginationControls();
    }
}

// Function to change orders per page
function changeProductOrdersPerPage() {
    const select = document.getElementById('productOrdersPerPage');
    if (select) {
        ordersPerProductPage = parseInt(select.value);
        currentProductPage = 1;
        totalProductPages = Math.ceil(allProductOrdersData.length / ordersPerProductPage);
        displayProductOrdersForCurrentPage();
        updateProductPaginationControls();
    }
}

// Add event listener for orders per page change
document.addEventListener('DOMContentLoaded', () => {
    const ordersPerPageSelect = document.getElementById('productOrdersPerPage');
    if (ordersPerPageSelect) {
        ordersPerPageSelect.addEventListener('change', changeProductOrdersPerPage);
    }
});
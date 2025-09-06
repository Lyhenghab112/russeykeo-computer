// Yearly Revenue Widget JavaScript
// This file handles the "This Year Revenue" widget functionality

// Global variable to store current year
let currentYear = 2025;

// Global pagination variables
let currentPage = 1;
let totalPages = 1;
let ordersPerPage = 10;
let allOrdersData = [];
let currentMonthForPagination = '';

// Year selector functions
window.toggleYearSelector = function() {
    const dropdown = document.getElementById('yearSelectorDropdown');
    const button = document.getElementById('yearlyRevenueYearBtn');
    
    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
        button.classList.add('open');
    } else {
        dropdown.style.display = 'none';
        button.classList.remove('open');
    }
};

window.selectYear = function(year) {
    currentYear = year;
    
    // Update the button text
    document.getElementById('yearlyRevenueYear').textContent = year;
    
    // Close the dropdown
    document.getElementById('yearSelectorDropdown').style.display = 'none';
    document.getElementById('yearlyRevenueYearBtn').classList.remove('open');
    
    // Update active state in dropdown
    const options = document.querySelectorAll('.year-option');
    options.forEach(option => {
        option.classList.remove('active');
        if (option.textContent == year) {
            option.classList.add('active');
        }
    });
    
    // Reload data for the selected year
    fetchYearlyRevenue();
};

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const yearSelector = document.querySelector('.year-selector');
    const dropdown = document.getElementById('yearSelectorDropdown');
    const button = document.getElementById('yearlyRevenueYearBtn');
    
    if (yearSelector && dropdown && button && !yearSelector.contains(event.target)) {
        dropdown.style.display = 'none';
        button.classList.remove('open');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Yearly Revenue widget...');
    
    // Initialize the yearly revenue widget
    initializeYearlyRevenue();
    
    // Set up PDF export button
    const exportButton = document.getElementById('exportYearlyRevenuePDF');
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            console.log('Yearly export button clicked');
            exportYearlyRevenueToPDF();
        });
    } else {
        console.error('Yearly export button not found with ID: exportYearlyRevenuePDF');
    }


});

// Initialize yearly revenue widget
function initializeYearlyRevenue() {
    console.log('Initializing Yearly Revenue widget...');
    
    // Fetch and render yearly revenue data
    fetchYearlyRevenue();
    
    // Make summary cards clickable
    makeYearlySummaryCardsClickable();
}

// Fetch yearly revenue data
function fetchYearlyRevenue() {
    console.log('Fetching yearly revenue data for year:', currentYear);
    
    // Call the monthly revenue API to get real data for the selected year
    fetch(`/auth/staff/api/reports/monthly_revenue?year=${currentYear}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Monthly revenue data:', data);
            console.log('Data structure:', JSON.stringify(data, null, 2));
            
            if (data.success && data.revenue) {
                // Transform the data to match our expected format
                const transformedData = transformMonthlyDataToYearly(data.revenue);
                console.log('Transformed data:', transformedData);
                updateYearlyRevenueUI(transformedData);
            } else {
                // Fallback to mock data if API fails
                console.warn('API returned no data, using fallback');
                useFallbackData();
            }
        })
        .catch(error => {
            console.error('Error fetching yearly revenue data:', error);
            // Fallback to mock data if API fails
            useFallbackData();
        });
}

// Transform monthly revenue data to yearly format
function transformMonthlyDataToYearly(monthsData) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const transformedMonths = [];
    let totalRevenue = 0;
    let totalOrders = 0;
    
    // Get current date to determine which months have occurred
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-based (0 = January)
    
    // Only process months that have occurred or have actual data
    monthsData.forEach((monthData, index) => {
        // Check if this month has occurred or if we have data for it
        const monthHasOccurred = index <= currentMonth;
        const monthHasData = monthData.monthly_revenue > 0 || monthData.orders_count > 0;
        
        if (monthHasOccurred || monthHasData) {
            const revenue = monthData.monthly_revenue || 0;
            const orders = monthData.orders_count || 0;
            
            transformedMonths.push({
                month: monthNames[index],
                orders: orders,
                revenue: revenue,
                trend: index > 0 ? (revenue > transformedMonths[index - 1].revenue ? 'up' : 'down') : 'neutral'
            });
            
            totalRevenue += revenue;
            totalOrders += orders;
        }
    });
    
    return {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        months: transformedMonths
    };
}

// Fallback to mock data if API fails
function useFallbackData() {
    // Get current date to determine which months have occurred
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-based (0 = January)
    
    // Only include months that have occurred
    const availableMonths = [
            { month: 'January', orders: 98, revenue: 125000.00, trend: 'up' },
            { month: 'February', orders: 87, revenue: 112000.00, trend: 'down' },
            { month: 'March', orders: 105, revenue: 135000.00, trend: 'up' },
            { month: 'April', orders: 92, revenue: 118000.00, trend: 'down' },
            { month: 'May', orders: 115, revenue: 148000.00, trend: 'up' },
            { month: 'June', orders: 108, revenue: 139000.00, trend: 'down' },
            { month: 'July', orders: 125, revenue: 162000.00, trend: 'up' },
        { month: 'August', orders: 118, revenue: 151000.00, trend: 'up' }
    ];
    
    // Filter to only show months that have occurred
    const filteredMonths = availableMonths.filter((_, index) => index <= currentMonth);
    
    // Calculate totals from filtered months
    const totalRevenue = filteredMonths.reduce((sum, month) => sum + month.revenue, 0);
    const totalOrders = filteredMonths.reduce((sum, month) => sum + month.orders, 0);
    
    const mockYearlyData = {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        months: filteredMonths
    };
    
    updateYearlyRevenueUI(mockYearlyData);
}

// Update yearly revenue UI
function updateYearlyRevenueUI(data) {
    console.log('Updating yearly revenue UI with data:', data);
    
    // Update the year display
    const yearElement = document.getElementById('yearlyRevenueYear');
    if (yearElement) {
        yearElement.textContent = currentYear;
    }
    
    // Update summary cards
    updateYearlySummaryCards(data);
    
    // Update yearly revenue table
    updateYearlyRevenueTable(data.months);
    
    // Make summary cards clickable
    makeYearlySummaryCardsClickable();
}

// Update yearly summary cards
function updateYearlySummaryCards(data) {
    const totalRevenue = data.total_revenue;
    const totalOrders = data.total_orders;
    const monthsCount = data.months.length;
    const bestMonth = data.months.reduce((best, current) => 
        current.revenue > best.revenue ? current : best
    ).month;
    
    // Summary cards removed - no need to update card values
    
    // Store data for later use
    window.yearlyRevenueData = {
        totalRevenue,
        totalOrders,
        monthsCount,
        bestMonth,
        months: data.months
    };
}

// Update yearly revenue table
function updateYearlyRevenueTable(months) {
    const tableBody = document.getElementById('yearlyRevenueTable');
    if (!tableBody) {
        console.error('Yearly revenue table body not found');
        return;
    }
    
    if (!months || months.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="no-data-message">No yearly revenue data available</td></tr>';
        return;
    }
    
    const tableRows = months.map(month => {
        const trendIcon = month.trend === 'up' ? '↗' : month.trend === 'down' ? '↘' : '→';
        const trendClass = month.trend === 'up' ? 'trend-up' : month.trend === 'down' ? 'trend-down' : 'trend-neutral';
        
        return `
            <tr>
                <td class="date-column">${month.month}</td>
                <td class="orders-column">${month.orders}</td>
                <td class="revenue-column">$${month.revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td class="trend-column">
                    <span class="trend-indicator ${trendClass}">${trendIcon}</span>
                </td>
                <td class="actions-column">
                    <div class="action-buttons">
                        <button class="btn btn-view-details" onclick="showMonthDetails('${month.month}', ${month.orders}, ${month.revenue})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-export-pdf" onclick="exportMonthToPDF('${month.month}', ${month.orders}, ${month.revenue})">
                            <i class="fas fa-file-pdf"></i> Export
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = tableRows;
}

// Make yearly summary cards clickable - CARDS REMOVED
function makeYearlySummaryCardsClickable() {
    // All summary cards have been removed from the HTML
    // No click functionality needed
    console.log('Yearly revenue summary cards removed - no click functionality needed');
}

// Unused card functions removed - cards no longer exist

// Show month details with custom popup
function showMonthDetails(month, orders, revenue) {
    // Create a custom popup instead of using alert()
    const popup = document.createElement('div');
    popup.className = 'summary-popup';
    popup.innerHTML = `
        <div class="summary-popup-content">
            <div class="summary-popup-header">
                <h5><i class="fas fa-calendar-alt"></i> ${month} Orders</h5>
            </div>
            
            <div class="summary-popup-body">
                <div class="month-performance-section">
                    <h6><i class="fas fa-chart-bar"></i> ${month} Performance</h6>
                    
                    <div class="month-stats">
                        <div class="stat-item">
                            <span class="stat-label">Month:</span>
                            <span class="stat-value">${month}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Total Orders:</span>
                            <span class="stat-value">${orders.toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Total Revenue:</span>
                            <span class="stat-value">$${revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Average Order Value:</span>
                            <span class="stat-value">$${(revenue / orders).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </div>
                
                <div class="month-orders-section">
                    <h6><i class="fas fa-shopping-cart"></i> Orders for ${month}</h6>
                    <div class="orders-table-container">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading order details for ${month}...</p>
                        </div>
                    </div>
                    <div class="pagination-controls" style="display: none;">
                        <div class="pagination-info">
                            <span class="pagination-text">Showing page <span class="current-page">1</span> of <span class="total-pages">1</span></span>
                        </div>
                        <div class="pagination-settings">
                            <label for="ordersPerPage">Orders per page:</label>
                            <select id="ordersPerPage" onchange="changeOrdersPerPage()" class="form-select form-select-sm" style="width: auto; display: inline-block; margin-left: 10px;">
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                        <div class="pagination-buttons">
                            <button class="btn btn-sm btn-outline-secondary" onclick="changePage(-1)" disabled>
                                «
                            </button>
                            <span class="page-numbers"></span>
                            <button class="btn btn-sm btn-outline-secondary" onclick="changePage(1)" disabled>
                                »
                            </button>
                        </div>
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
    console.log('Popup added to DOM');
    
    // Verify pagination controls exist
    const paginationControls = popup.querySelector('.pagination-controls');
    console.log('Pagination controls in popup:', paginationControls);
    if (paginationControls) {
        const prevBtn = paginationControls.querySelector('.pagination-buttons .btn:first-child');
        const nextBtn = paginationControls.querySelector('.pagination-buttons .btn:last-child');
        const pageNumbers = paginationControls.querySelector('.page-numbers');
        console.log('Prev button:', prevBtn);
        console.log('Next button:', nextBtn);
        console.log('Page numbers:', pageNumbers);
    }
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'summary-popup-backdrop';
    backdrop.onclick = () => closeSummaryPopup(popup);
    document.body.appendChild(backdrop);
    
    // Show popup
    setTimeout(() => {
        popup.classList.add('show');
        console.log('Popup shown, classList:', popup.classList.toString());
        console.log('Popup element:', popup);
        
        // Check if popup is visible
        const computedStyle = window.getComputedStyle(popup);
        console.log('Popup display style:', computedStyle.display);
        console.log('Popup visibility style:', computedStyle.visibility);
        console.log('Popup opacity style:', computedStyle.opacity);
        
        // Check pagination controls again after showing
        const paginationControls = popup.querySelector('.pagination-controls');
        console.log('Pagination controls after showing popup:', paginationControls);
        if (paginationControls) {
            console.log('Pagination controls display style:', window.getComputedStyle(paginationControls).display);
        }
    }, 10);
    
    // Fetch real order data for this month
    fetchMonthOrderDetails(month, orders, revenue, popup);
}

// Fetch real order details for a specific month
function fetchMonthOrderDetails(month, orders, revenue, popup) {
    console.log('Fetching order details for month:', month, 'year:', currentYear);
    
    // Reset pagination for new month
    currentPage = 1;
    currentMonthForPagination = month;
    
    // Calculate start and end dates for the month
    const year = currentYear; // Use the selected year
    const monthNumber = getMonthNumber(month);
    const startDate = `${year}-${monthNumber}-01`;
    
    // Calculate last day of the month
    const lastDay = new Date(year, parseInt(monthNumber), 0).getDate();
    const endDate = `${year}-${monthNumber}-${lastDay.toString().padStart(2, '0')}`;
    
    console.log('API call parameters:', { startDate, endDate, year, monthNumber });
    
    // Check if we have any orders for this month first
    if (orders === 0) {
        // No orders for this month, show message directly
        displayNoOrdersMessage(month, popup);
        return;
    }
    
    // Call the simplified monthly sales detail API
    const monthParam = `${year}-${monthNumber}`;
    console.log('=== API CALL DEBUG ===');
    console.log('Month parameter being sent:', monthParam);
    console.log('Year:', year);
    console.log('Month number:', monthNumber);
    console.log('Full API URL:', `/auth/staff/api/reports/monthly_sales_detail?month=${monthParam}`);
    console.log('=== END API CALL DEBUG ===');
    
    fetch(`/auth/staff/api/reports/monthly_sales_detail?month=${monthParam}`)
        .then(response => {
            console.log('=== API RESPONSE DEBUG ===');
            console.log('API response status:', response.status);
            console.log('API response headers:', response.headers);
            console.log('Response OK:', response.ok);
            console.log('Response type:', response.type);
            console.log('Response URL:', response.url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('=== API RESPONSE DEBUG ===');
            console.log('Full API response:', data);
            console.log('Response success:', data.success);
            console.log('Sales detail exists:', !!data.sales_detail);
            console.log('Sales detail type:', typeof data.sales_detail);
            console.log('Sales detail length:', data.sales_detail ? data.sales_detail.length : 'undefined');
            console.log('First item sample:', data.sales_detail ? data.sales_detail[0] : 'no data');
            console.log('=== END API DEBUG ===');
            
            if (data.success && data.sales_detail && data.sales_detail.length > 0) {
                console.log('✅ Data validation passed - processing orders');
                console.log('Sales detail count:', data.sales_detail.length);
                console.log('First order sample:', data.sales_detail[0]);
                
                // Store all orders data for pagination
                allOrdersData = data.sales_detail;
                totalPages = Math.ceil(allOrdersData.length / ordersPerPage);
                
                console.log('=== PAGINATION SETUP DEBUG ===');
                console.log('Stored orders data:', allOrdersData);
                console.log('Data length:', allOrdersData.length);
                console.log('Calculated total pages:', totalPages);
                console.log('Orders per page:', ordersPerPage);
                console.log('=== END PAGINATION DEBUG ===');
                
                // Display first page
                displayOrdersForCurrentPage();
                
                // Show pagination controls if more than one page
                const paginationControls = popup.querySelector('.pagination-controls');
                if (totalPages > 1) {
                    paginationControls.style.display = 'block';
                    updatePaginationControls();
                } else {
                    // Still show pagination info even for single page
                    paginationControls.style.display = 'block';
                    updatePaginationControls();
                }
            } else {
                console.log('❌ Data validation failed');
                console.log('Success flag:', data.success);
                console.log('Sales detail exists:', !!data.sales_detail);
                console.log('Sales detail length:', data.sales_detail ? data.sales_detail.length : 'undefined');
                console.log('Data structure:', JSON.stringify(data, null, 2));
                
                // No orders found, show message
                displayNoOrdersMessage(month, popup);
            }
        })
        .catch(error => {
            console.error('❌ Error fetching monthly sales detail:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            
            // Try the simple endpoint as a fallback
            console.log('🔄 Trying simple endpoint as fallback...');
            const simpleMonthParam = `${year}-${monthNumber}`;
            fetch(`/auth/staff/api/reports/monthly_sales_detail_simple?month=${simpleMonthParam}`)
                .then(response => response.json())
                .then(simpleData => {
                    console.log('Simple endpoint response:', simpleData);
                    if (simpleData.success && simpleData.sales_detail && simpleData.sales_detail.length > 0) {
                        console.log('✅ Simple endpoint worked! Using this data');
                        allOrdersData = simpleData.sales_detail;
                        totalPages = Math.ceil(allOrdersData.length / ordersPerPage);
                        displayOrdersForCurrentPage();
                        
                        const paginationControls = popup.querySelector('.pagination-controls');
                        paginationControls.style.display = 'block';
                        updatePaginationControls();
                    } else {
                        console.log('❌ Simple endpoint also failed');
                        displayErrorMessage(month, popup, error);
                    }
                })
                .catch(simpleError => {
                    console.error('❌ Simple endpoint also failed:', simpleError);
            displayErrorMessage(month, popup, error);
                });
        });
}

// Display real order details from API
function displayRealMonthOrderDetails(salesData, month, orders, revenue, popup) {
    const ordersTableContainer = popup.querySelector('.orders-table-container');
    
    console.log('Displaying real month order details:', { month, orders, revenue, salesDataCount: salesData.length });
    
    if (!salesData || salesData.length === 0) {
        ordersTableContainer.innerHTML = `
            <div class="no-orders-message">
                <i class="fas fa-info-circle"></i>
                <p>No completed orders found for ${month} ${currentYear}.</p>
                <p class="text-muted">This might be because there are no orders in this month or the data is not available.</p>
            </div>
        `;
        
        // Still store empty data for export
        window.currentMonthData = {
            month: month,
            orders: orders,
            revenue: revenue,
            ordersList: []
        };
        
        console.log('No sales data available, stored empty orders list');
        return;
    }
    
    // Sort orders by date
    const sortedOrders = salesData.sort((a, b) => new Date(a.order_date) - new Date(b.order_date));
    
    // Limit to first 10 orders for display
    const displayOrders = sortedOrders.slice(0, 10);
    
    ordersTableContainer.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Products</th>
                    <th>Total</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${displayOrders.map(order => `
                    <tr>
                        <td>${order.order_id}</td>
                        <td>${order.customer_name}</td>
                        <td>${order.products}</td>
                        <td>$${order.grand_total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td>${new Date(order.order_date).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${sortedOrders.length > 10 ? `<p class="text-muted mt-2">Showing first 10 of ${sortedOrders.length} orders</p>` : ''}
    `;
    
    // Store current month data for export
    window.currentMonthData = {
        month: month,
        orders: orders,
        revenue: revenue,
        ordersList: sortedOrders
    };
    
    console.log('Stored current month data:', window.currentMonthData);
    console.log('Orders list length:', window.currentMonthData.ordersList.length);
}

// Display message when no orders found
function displayNoOrdersMessage(month, popup) {
    const ordersTableContainer = popup.querySelector('.orders-table-container');
    ordersTableContainer.innerHTML = `
        <div class="no-orders-message">
            <i class="fas fa-info-circle"></i>
            <p>No completed orders found for ${month} ${currentYear}.</p>
        </div>
    `;
}

// Display error message
function displayErrorMessage(month, popup, error) {
    const ordersTableContainer = popup.querySelector('.orders-table-container');
    ordersTableContainer.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error loading orders for ${month}: ${error.message}</p>
        </div>
    `;
}

// Helper function to get month number
function getMonthNumber(monthName) {
    const months = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    return months[monthName] || '01';
}

// Function to close the summary popup
function closeSummaryPopup(element) {
    console.log('closeSummaryPopup called with element:', element);
    
    let popup;
    if (element && element.classList && element.classList.contains('summary-popup')) {
        popup = element;
        console.log('Element is the popup');
    } else if (element && element.closest) {
        popup = element.closest('.summary-popup');
        console.log('Found popup via closest:', popup);
    } else {
        popup = document.querySelector('.summary-popup');
        console.log('Found popup via querySelector:', popup);
    }
    
    if (popup) {
        console.log('Closing popup:', popup);
        popup.classList.remove('show');
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
                console.log('Popup removed from DOM');
            }
        }, 300);
    } else {
        console.log('No popup found to close');
    }
    
    // Remove backdrop
    const backdrop = document.querySelector('.summary-popup-backdrop');
    if (backdrop) {
        backdrop.remove();
        console.log('Backdrop removed');
    }
}

// Export month orders to PDF
window.exportMonthOrdersToPDF = function(month, orders, revenue) {
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert('PDF library not loaded. Please try again.');
            return;
        }

        // Create new PDF document
        const doc = new jsPDF();
        
        // Set document properties
        doc.setProperties({
            title: `${month} Orders Report`,
            subject: 'Monthly Orders Analysis with Customer Details',
            author: 'Russeykeo Computer',
            creator: 'Sales Dashboard'
        });

        // Add logo at the top
        try {
            // Create a logo placeholder with company branding
            doc.setFillColor(52, 152, 219); // Blue color for logo background
            doc.rect(85, 10, 40, 20, 'F');
            doc.setTextColor(255, 255, 255); // White text
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('RC', 105, 22, { align: 'center' }); // Russeykeo Computer initials
            doc.text('COMPUTER', 105, 30, { align: 'center' });
            
            console.log('Company logo placeholder added successfully');
        } catch (logoError) {
            console.log('Logo not available, continuing without it');
        }

        // Add header
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text(`${month} Orders Report`, 105, 40, { align: 'center' });
        
        // Add company info
        doc.setFontSize(16);
        doc.setFont(undefined, 'normal');
        doc.text('Russeykeo Computer', 105, 55, { align: 'center' });
        doc.text('Sales Analytics Report', 105, 65, { align: 'center' });
        
        // Add month summary
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Monthly Summary', 20, 85);
        
        const summaryData = [
            ['Metric', 'Value'],
            ['Month', month],
            ['Total Orders', orders.toString()],
            ['Total Revenue', `$${revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
            ['Total Profit', 'Calculating...'], // Will be updated with actual profit data
            ['Profit Margin', 'Calculating...'], // Will be updated with actual profit margin
            ['Average Order Value', `$${(revenue / orders).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
            ['Report Generated', new Date().toLocaleDateString()]
        ];
        
        doc.autoTable({
            startY: 75,
            head: [['Metric', 'Value']],
            body: summaryData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 12, fontStyle: 'bold' },
            bodyStyles: { fontSize: 11 },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        
        // Add orders table
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Orders Details', 20, 140);
        
        // Use real order data if available, otherwise show message
        let ordersTableData = [];
        let ordersSectionTitle = 'Orders Details';
        
        if (window.currentMonthData && window.currentMonthData.ordersList) {
            // Use real order data
            ordersTableData = window.currentMonthData.ordersList.map(order => [
                order.order_id,
                order.customer_name,
                order.products,
                `$${order.grand_total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
                new Date(order.order_date).toLocaleDateString()
            ]);
        } else {
            // No real data available, show message
            ordersTableData = [['No order data available', '', '', '', '']];
            ordersSectionTitle = 'Orders Details (Data not available)';
        }
        
        doc.autoTable({
            startY: 150,
            head: [['Order ID', 'Customer', 'Products', 'Total', 'Date']],
            body: ordersTableData,
            theme: 'grid',
            headStyles: { fillColor: [52, 73, 94], textColor: 255, fontSize: 10, fontStyle: 'bold' },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [248, 249, 250] },
            columnStyles: {
                0: { cellWidth: 25 }, // Order ID
                1: { cellWidth: 35 }, // Customer
                2: { cellWidth: 50 }, // Products
                3: { cellWidth: 25 }, // Total
                4: { cellWidth: 25 }  // Date
            }
        });
        
        // Add insights section
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Key Insights', 20, doc.lastAutoTable.finalY + 20);
        
        const actualOrders = window.currentMonthData && window.currentMonthData.ordersList ? window.currentMonthData.ordersList.length : 0;
        const insights = [
            `* ${month} generated ${actualOrders} completed orders`,
            `* Total revenue: $${revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
            `* Average order value: $${(revenue / actualOrders || 1).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
            `* Revenue per day: $${(revenue / 30).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
            `* Orders per day: ${(actualOrders / 30).toFixed(1)}`
        ];
        
        insights.forEach((insight, index) => {
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(insight, 20, doc.lastAutoTable.finalY + 35 + (index * 8));
        });
        
        // Add footer
        const finalY = doc.lastAutoTable.finalY + 80;
        doc.setFontSize(10);
        doc.text('Generated on: ' + new Date().toLocaleDateString(), 20, finalY);
        doc.text('Russeykeo Computer - Detailed Orders Report', 105, finalY, { align: 'center' });
        
        // Save the PDF
        doc.save(`${month.toLowerCase()}_orders_report_${new Date().getFullYear()}.pdf`);
        
        // Close the popup after successful export
        closeSummaryPopup(document.querySelector('.summary-popup'));
        
    } catch (error) {
        console.error('Error generating month orders PDF:', error);
        alert('Error generating PDF. Please try again.');
    }
};

// Export month to PDF with custom popup
function exportMonthToPDF(month, orders, revenue) {
    // Create a custom popup instead of using alert()
    const popup = document.createElement('div');
    popup.className = 'summary-popup';
    popup.innerHTML = `
        <div class="summary-popup-content">
            <div class="summary-popup-header">
                <h5><i class="fas fa-file-pdf"></i> Export Month Data</h5>
            </div>
            
            <div class="summary-popup-body">
                <div class="export-month-section">
                    <h6><i class="fas fa-download"></i> Export ${month} to PDF</h6>
                    
                    <div class="export-stats">
                        <div class="stat-item">
                            <span class="stat-label">Month:</span>
                            <span class="stat-value">${month}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Orders:</span>
                            <span class="stat-value">${orders.toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Revenue:</span>
                            <span class="stat-value">$${revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    </div>
                    
                    <div class="export-actions">
                        <p><i class="fas fa-info-circle"></i> This will generate a detailed PDF report for ${month} ${new Date().getFullYear()}.</p>
                        <p>The report will include order details, revenue breakdown, and performance metrics.</p>
                    </div>
                </div>
            </div>
            
            <div class="summary-popup-footer">
                <button class="btn btn-secondary" onclick="closeSummaryPopup(this)">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button class="btn btn-success" onclick="generateMonthPDF('${month}', ${orders}, ${revenue})">
                    <i class="fas fa-file-pdf"></i> Export to PDF
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

// Generate month PDF (actual PDF generation) with detailed order information
async function generateMonthPDF(month, orders, revenue) {
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert('PDF library not loaded. Please try again.');
            return;
        }

        console.log('Generating PDF for month:', month);
        console.log('Current month data:', window.currentMonthData);

        // Check if we have order data, if not, try to fetch it
        if (!window.currentMonthData || !window.currentMonthData.ordersList || window.currentMonthData.ordersList.length === 0) {
            console.log('No order data available, attempting to fetch...');
            
            // Show loading message
            const popup = document.querySelector('.summary-popup');
            if (popup) {
                const exportButton = popup.querySelector('.btn-success');
                const originalText = exportButton.innerHTML;
                exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching Data...';
                exportButton.disabled = true;
                
                // Fetch the data first
                try {
                    const data = await fetchMonthOrderDetailsForExport(month, orders, revenue);
                    if (data && data.length > 0) {
                        // Update the global data
                        window.currentMonthData = {
                            month: month,
                            orders: orders,
                            revenue: revenue,
                            ordersList: data
                        };
                        // Now generate the PDF
                        await generateMonthPDFWithData(month, orders, revenue, data);
                    } else {
                        // Generate PDF without detailed data
                        await generateMonthPDFWithData(month, orders, revenue, []);
                    }
                } catch (error) {
                    console.error('Error fetching data for export:', error);
                    // Generate PDF without detailed data
                    await generateMonthPDFWithData(month, orders, revenue, []);
                } finally {
                    // Restore button
                    exportButton.innerHTML = originalText;
                    exportButton.disabled = false;
                }
                
            }
        }

        // If we have data, generate PDF immediately
        await generateMonthPDFWithData(month, orders, revenue, window.currentMonthData.ordersList || []);
        
    } catch (error) {
        console.error('Error in generateMonthPDF:', error);
        alert('Error generating PDF. Please try again.');
    }
}

// Fetch month order details specifically for export
async function fetchMonthOrderDetailsForExport(month, orders, revenue) {
    try {
        const year = currentYear;
        const monthNumber = getMonthNumber(month);
        const monthParam = `${year}-${monthNumber}`;
        
        console.log('Fetching export data for month:', monthParam);
        
        // Fetch month order details
        const response = await fetch(`/auth/staff/api/reports/monthly_sales_detail?month=${monthParam}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Export data response:', data);
        
        if (data.success && data.sales_detail && data.sales_detail.length > 0) {
            return data.sales_detail;
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error fetching export data:', error);
        return [];
    }
}

// Fetch month profit data for the summary
async function fetchMonthProfitData(month, year, ordersRevenue) {
    try {
        const monthNumber = getMonthNumber(month);
        const monthParam = `${year}-${monthNumber}`;
        
        console.log('Fetching profit data for month:', monthParam);
        console.log('Orders revenue for margin calculation:', ordersRevenue);
        
        const response = await fetch(`/auth/staff/api/reports/monthly_sales?start_date=${year}-${monthNumber}-01&end_date=${year}-${monthNumber}-31`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Profit data response:', data);
        
        if (data.success && data.sales && data.sales.length > 0) {
            // Find the month data
            const monthData = data.sales.find(sale => sale.month === monthParam);
            if (monthData) {
                const totalProfit = monthData.total_profit || 0;
                // Use the orders revenue for margin calculation, not the API revenue
                const revenueForMargin = ordersRevenue || monthData.total_sales || 0;
                const profitMargin = revenueForMargin > 0 ? ((totalProfit / revenueForMargin) * 100) : 0;
                
                console.log('Profit calculation:', {
                    totalProfit,
                    revenueForMargin,
                    profitMargin,
                    apiRevenue: monthData.total_sales
                });
                
                return {
                    total_profit: totalProfit,
                    profit_margin: profitMargin
                };
            }
        }
        
        return { total_profit: 0, profit_margin: 0 };
    } catch (error) {
        console.error('Error fetching profit data:', error);
        return { total_profit: 0, profit_margin: 0 };
    }
}

// Fetch yearly profit data for the summary
async function fetchYearlyProfitData(year) {
    try {
        console.log('Fetching yearly profit data for year:', year);
        
        const response = await fetch(`/auth/staff/api/reports/monthly_sales?start_date=${year}-01-01&end_date=${year}-12-31`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Yearly profit data response:', data);
        
        if (data.success && data.sales && data.sales.length > 0) {
            // Calculate yearly totals
            const totalRevenue = data.sales.reduce((sum, sale) => sum + (sale.total_sales || 0), 0);
            const totalProfit = data.sales.reduce((sum, sale) => sum + (sale.total_profit || 0), 0);
            const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;
            
            return {
                total_profit: totalProfit,
                profit_margin: profitMargin,
                monthly_breakdown: data.sales.map(sale => ({
                    month: sale.month,
                    profit: sale.total_profit || 0,
                    revenue: sale.total_sales || 0
                }))
            };
        }
        
        return { total_profit: 0, profit_margin: 0, monthly_breakdown: [] };
    } catch (error) {
        console.error('Error fetching yearly profit data:', error);
        return { total_profit: 0, profit_margin: 0, monthly_breakdown: [] };
    }
}

// Function to load and convert logo to base64
async function loadLogoAsBase64() {
    try {
        const response = await fetch('/static/icons/logo.jpg');
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error loading logo:', error);
        return null;
    }
}

// Generate month PDF with the provided data
async function generateMonthPDFWithData(month, orders, revenue, ordersList) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set document properties
        doc.setProperties({
            title: `${month} Orders Report`,
            subject: 'Monthly Orders Analysis with Customer Details',
            author: 'Russeykeo Computer',
            creator: 'Sales Dashboard'
        });

        // Add logo at the top left
        try {
            console.log('Attempting to add logo at position (20, 10) - LEFT CORNER');
            
            // Try to load the actual logo image
            const logoBase64 = await loadLogoAsBase64();
            if (logoBase64) {
                console.log('Logo loaded successfully, adding to PDF at LEFT CORNER (20, 10)');
                doc.addImage(logoBase64, 'JPEG', 20, 10, 35, 28, undefined, 'FAST'); // Smaller size: 35x28
                console.log('Logo added successfully to PDF at LEFT CORNER');
            } else {
                // Fallback to logo placeholder if image loading fails
                console.log('Logo loading failed, adding placeholder at LEFT CORNER (20, 10)');
                doc.setFillColor(52, 152, 219); // Blue color for logo background
                doc.rect(20, 10, 35, 28, 'F'); // Smaller size: 35x28
                doc.setTextColor(255, 255, 255); // White text
                doc.setFontSize(10); // Adjusted font size for smaller area
                doc.setFont(undefined, 'bold');
                doc.text('RC', 37.5, 22, { align: 'center' }); // Russeykeo Computer initials, centered in smaller area
                doc.text('COMP', 37.5, 30, { align: 'center' }); // Text positioned for smaller area
                console.log('Logo placeholder added as fallback at LEFT CORNER');
            }
        } catch (logoError) {
            console.log('Logo not available, continuing without it');
            // Fallback to logo placeholder
            console.log('Adding fallback placeholder at LEFT CORNER (20, 10)');
            doc.setFillColor(52, 152, 219);
            doc.rect(20, 10, 35, 28, 'F'); // Smaller size: 35x28
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10); // Adjusted font size for smaller area
            doc.setFont(undefined, 'bold');
            doc.text('RC', 37.5, 22, { align: 'center' }); // Text positioned for smaller area
            doc.text('COMP', 37.5, 30, { align: 'center' }); // Text positioned for smaller area
        }
        
        // Add header
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text(`${month} Orders Report`, 105, 40, { align: 'center' });
        
        // Add company info
        doc.setFontSize(16);
        doc.setFont(undefined, 'normal');
        doc.text('Russeykeo Computer', 105, 55, { align: 'center' });
        doc.text('Sales Analytics Report', 105, 65, { align: 'center' });
        
        // Add month summary
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Monthly Summary', 20, 85);
        
        // Fetch profit data for this month
        const profitData = await fetchMonthProfitData(month, currentYear, revenue);
        
        console.log('Revenue comparison for month:', month);
        console.log('Orders revenue (from orders list):', revenue);
        console.log('Profit data received:', profitData);
        
        const summaryData = [
            ['Metric', 'Value'],
            ['Month', month],
            ['Total Orders', orders.toString()],
            ['Total Revenue', `$${revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
            ['Total Profit', `$${profitData.total_profit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
            ['Profit Margin', `${profitData.profit_margin.toFixed(1)}%`],
            ['Average Order Value', `$${(revenue / orders).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
            ['Report Generated', new Date().toLocaleDateString()]
        ];
        
        doc.autoTable({
            startY: 95,
            head: [['Metric', 'Value']],
            body: summaryData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 12, fontStyle: 'bold' },
            bodyStyles: { fontSize: 11 },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        
        // Add orders table - position it after the summary table with proper spacing
        const summaryTableEndY = doc.lastAutoTable.finalY;
        const ordersTableStartY = summaryTableEndY + 20; // Add 20px spacing
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Orders Details', 20, ordersTableStartY - 10);
        
        // Use the provided order data
        let ordersTableData = [];
        
        if (ordersList && ordersList.length > 0) {
            console.log('Orders data received:', ordersList);
            
            // Use real order data
            ordersTableData = ordersList.map(order => {
                console.log('Processing order:', order);
                console.log('Products field:', order.products);
                
                // Handle missing products field - use fallback text
                let productsText = order.products;
                if (!productsText || productsText === '') {
                    if (order.type === 'preorder' && order.product_name) {
                        productsText = order.product_name;
                    } else {
                        productsText = 'Products not available';
                    }
                }
                
                return [
                    order.order_id,
                    order.customer_name,
                    productsText,
                    `$${order.grand_total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
                    order.total_profit ? `$${order.total_profit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'N/A',
                    new Date(order.order_date).toLocaleDateString()
                ];
            });
        } else {
            // No order data available
            ordersTableData = [['No order data available', '', '', '', '', '']];
        }
        
        doc.autoTable({
            startY: ordersTableStartY,
            head: [['Order ID', 'Customer', 'Products', 'Total', 'Profit', 'Date']],
            body: ordersTableData,
            theme: 'grid',
            headStyles: { fillColor: [52, 73, 94], textColor: 255, fontSize: 10, fontStyle: 'bold' },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [248, 249, 250] },
            columnStyles: {
                0: { cellWidth: 25 }, // Order ID - increased from 20
                1: { cellWidth: 35 }, // Customer - increased from 30
                2: { cellWidth: 60 }, // Products - increased from 45 to show full names
                3: { cellWidth: 25 }, // Total - increased from 20
                4: { cellWidth: 25 }, // Profit - increased from 20
                5: { cellWidth: 25 }  // Date - increased from 20
            }
        });
        
        // Add footer
        const finalY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.text('Generated on: ' + new Date().toLocaleDateString(), 20, finalY);
        doc.text('Russeykeo Computer - Detailed Orders Report', 105, finalY, { align: 'center' });
        
        // Save the PDF
        doc.save(`${month.toLowerCase()}_orders_report_${new Date().getFullYear()}.pdf`);
        
        console.log('Month PDF generated successfully with data');
        
        // Close the popup after successful export
        const popup = document.querySelector('.summary-popup');
        if (popup) {
            closeSummaryPopup(popup);
        }
        
    } catch (error) {
        console.error('Error generating month PDF with data:', error);
        alert('Error generating PDF. Please try again.');
    }
}

// Export yearly revenue to PDF with detailed order information
async function exportYearlyRevenueToPDF() {
    if (!window.yearlyRevenueData) {
        alert('No yearly data available for export');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const { totalRevenue, totalOrders, monthsCount, bestMonth, months } = window.yearlyRevenueData;
        
        // Set document properties
        doc.setProperties({
            title: 'Yearly Revenue Report',
            subject: 'Annual Revenue Analysis',
            author: 'Russeykeo Computer',
            creator: 'Sales Dashboard'
        });

        // Add logo at the top left
        try {
            // Try to load the actual logo image
            const logoBase64 = await loadLogoAsBase64();
            if (logoBase64) {
                console.log('Logo loaded successfully, adding to PDF at LEFT CORNER');
                doc.addImage(logoBase64, 'JPEG', 20, 10, 35, 28, undefined, 'FAST');
            } else {
                // Fallback to logo placeholder if image loading fails
                console.log('Logo loading failed, adding placeholder at LEFT CORNER');
                doc.setFillColor(52, 152, 219); // Blue color for logo background
                doc.rect(20, 10, 35, 28, 'F'); // Smaller size: 35x28
                doc.setTextColor(255, 255, 255); // White text
                doc.setFontSize(10); // Adjusted font size for smaller area
                doc.setFont(undefined, 'bold');
                doc.text('RC', 37.5, 22, { align: 'center' }); // Russeykeo Computer initials, centered in smaller area
                doc.text('COMP', 37.5, 30, { align: 'center' }); // Text positioned for smaller area
            }
        } catch (logoError) {
            console.log('Logo not available, continuing without it');
        }
        
        // Add header
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text('Yearly Revenue Report', 105, 40, { align: 'center' });
        
        // Add year info
        doc.setFontSize(16);
        doc.setFont(undefined, 'normal');
        doc.text('2025 Annual Summary', 105, 55, { align: 'center' });
        
        // Add company info
        doc.setFontSize(12);
        doc.text('Russeykeo Computer', 105, 70, { align: 'center' });
        doc.text('Sales Analytics Report', 105, 80, { align: 'center' });
        
        // Add summary data
        const summaryData = [
            ['Metric', 'Value'],
            ['Total Revenue', `$${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
            ['Total Orders', totalOrders.toString()],
            ['Total Profit', 'Calculating...'], // Will be updated with actual profit data
            ['Profit Margin', 'Calculating...'], // Will be updated with actual profit margin
            ['Months with Sales', monthsCount.toString()],
            ['Best Month', bestMonth || 'N/A'],
            ['Average Monthly Revenue', `$${(totalRevenue / monthsCount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`]
        ];
        
        doc.autoTable({
            startY: 100,
            head: [['Metric', 'Value']],
            body: summaryData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 12, fontStyle: 'bold' },
            bodyStyles: { fontSize: 11 },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        
        // Fetch profit data for this year
        const profitData = await fetchYearlyProfitData(currentYear);
        
        // Update summary data with real profit information
        summaryData[3][1] = `$${profitData.total_profit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        summaryData[4][1] = `${profitData.profit_margin.toFixed(1)}%`;
        
        // Recreate the summary table with updated profit data
        doc.autoTable({
            startY: 100,
            head: [['Metric', 'Value']],
            body: summaryData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 12, fontStyle: 'bold' },
            bodyStyles: { fontSize: 11 },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        
        // Add monthly breakdown
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Monthly Breakdown', 20, 180);
        
        // Create monthly data with profit information
        const monthlyData = [];
        if (profitData.monthly_breakdown && profitData.monthly_breakdown.length > 0) {
            console.log('=== MONTHLY PROFIT CALCULATION DEBUG ===');
            console.log('Profit data monthly breakdown:', profitData.monthly_breakdown);
            console.log('Available months:', months);
            
            // Use real profit data from API
            for (const month of months) {
                const monthKey = `${currentYear}-${getMonthNumber(month.month)}`;
                const monthProfit = profitData.monthly_breakdown.find(m => m.month === monthKey);
                
                console.log(`Month: ${month.month}, Key: ${monthKey}, Profit:`, monthProfit);
                
                monthlyData.push([
            month.month,
            month.orders.toString(),
            `$${month.revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
                    monthProfit ? `$${monthProfit.profit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '$0.00'
                ]);
            }
            console.log('Final monthly data with profit:', monthlyData);
            console.log('=== END PROFIT CALCULATION DEBUG ===');
        } else {
            console.log('⚠️ No profit breakdown data available, using fallback');
            // Fallback to basic data if profit data not available
            monthlyData = months.map(month => [
                month.month,
                month.orders.toString(),
                `$${month.revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
                'Calculating...'
            ]);
        }
        
        doc.autoTable({
            startY: 190,
            head: [['Month', 'Orders', 'Revenue', 'Profit']],
            body: monthlyData,
            theme: 'grid',
            headStyles: { fillColor: [52, 73, 94], textColor: 255, fontSize: 11, fontStyle: 'bold' },
            bodyStyles: { fontSize: 10 },
            alternateRowStyles: { fillColor: [248, 249, 250] },
            columnStyles: {
                0: { cellWidth: 35 }, // Month
                1: { cellWidth: 25 }, // Orders
                2: { cellWidth: 45 }, // Revenue
                3: { cellWidth: 45 }  // Profit
            }
        });
        
        // Add footer
        const finalY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.text('Generated on: ' + new Date().toLocaleDateString(), 20, finalY);
        doc.text('Russeykeo Computer - Sales Analytics Report', 105, finalY, { align: 'center' });
        
        doc.save('yearly_revenue_report_2025.pdf');
        
    } catch (error) {
        console.error('Error generating yearly revenue PDF:', error);
        alert('Error generating PDF. Please try again.');
    }
}

// Function to change orders per page
function changeOrdersPerPage() {
    console.log('changeOrdersPerPage called');
    const select = document.getElementById('ordersPerPage');
    console.log('Select element:', select);
    console.log('Select value:', select ? select.value : 'no select found');
    
    ordersPerPage = parseInt(select.value);
    console.log('New orders per page:', ordersPerPage);
    
    // Reset to first page
    currentPage = 1;
    console.log('Reset to page 1');
    
    // Recalculate total pages
    totalPages = Math.ceil(allOrdersData.length / ordersPerPage);
    console.log('Recalculated total pages:', totalPages);
    console.log('Total orders data length:', allOrdersData.length);
    
    // Update display
    displayOrdersForCurrentPage();
    updatePaginationControls();
    
    // Show/hide pagination controls based on new page count
    // Find pagination controls within the current popup context
    const popup = document.querySelector('.summary-popup.show') || document.querySelector('.summary-popup');
    console.log('Found popup:', popup);
    const paginationControls = popup ? popup.querySelector('.pagination-controls') : document.querySelector('.pagination-controls');
    console.log('Found pagination controls:', paginationControls);
    
    if (paginationControls) {
        if (totalPages > 1) {
            paginationControls.style.display = 'block';
            console.log('Showing pagination controls (multiple pages)');
        } else {
            paginationControls.style.display = 'block'; // Always show for single page info
            console.log('Showing pagination controls (single page)');
        }
    } else {
        console.log('No pagination controls found');
    }
}

// Function to change page
function changePage(direction) {
    console.log('changePage called with direction:', direction);
    console.log('Current page before change:', currentPage);
    console.log('Total pages:', totalPages);
    
    const newPage = currentPage + direction;
    console.log('New page would be:', newPage);
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        console.log('Page changed to:', currentPage);
        displayOrdersForCurrentPage();
        updatePaginationControls();
    } else {
        console.log('Page change rejected - out of bounds');
    }
}

// Function to go to specific page
function goToPage(pageNumber) {
    console.log('goToPage called with page number:', pageNumber);
    console.log('Current page before change:', currentPage);
    console.log('Total pages:', totalPages);
    
    if (pageNumber >= 1 && pageNumber <= totalPages) {
        currentPage = pageNumber;
        console.log('Page changed to:', currentPage);
        displayOrdersForCurrentPage();
        updatePaginationControls();
    } else {
        console.log('Page change rejected - out of bounds');
    }
}

// Function to display orders for current page
function displayOrdersForCurrentPage() {
    if (!allOrdersData || allOrdersData.length === 0) {
        console.log('No orders data available for pagination');
        return;
    }
    
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const pageOrders = allOrdersData.slice(startIndex, endIndex);
    
    console.log('Displaying orders for page:', currentPage);
    console.log('Total orders:', allOrdersData.length);
    console.log('Orders per page:', ordersPerPage);
    console.log('Page orders:', pageOrders);
    
    displayOrdersTable(pageOrders);
    updatePaginationInfo();
}

// Function to update pagination controls
function updatePaginationControls() {
    // Find pagination controls within the current popup context
    const popup = document.querySelector('.summary-popup.show') || document.querySelector('.summary-popup');
    if (!popup) return;
    
    const prevBtn = popup.querySelector('.pagination-buttons .btn:first-child');
    const nextBtn = popup.querySelector('.pagination-buttons .btn:last-child');
    const pageNumbers = popup.querySelector('.page-numbers');
    
    if (!prevBtn || !nextBtn || !pageNumbers) return;
    
    // Update button states
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    
    // Update page numbers - show all pages in a clean row
    pageNumbers.innerHTML = '';
    
    // Show all page numbers
    for (let i = 1; i <= totalPages; i++) {
        addPageButton(i, pageNumbers);
    }
}

// Helper function to add page button
function addPageButton(pageNum, container) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `btn btn-sm ${pageNum === currentPage ? 'btn-primary' : 'btn-outline-primary'}`;
    pageBtn.textContent = pageNum;
    pageBtn.onclick = () => goToPage(pageNum);
    container.appendChild(pageBtn);
}

// Function to update pagination info
function updatePaginationInfo() {
    // Find pagination info within the current popup context
    const popup = document.querySelector('.summary-popup.show') || document.querySelector('.summary-popup');
    if (!popup) return;
    
    const currentPageSpan = popup.querySelector('.current-page');
    const totalPagesSpan = popup.querySelector('.total-pages');
    const totalOrdersSpan = popup.querySelector('.total-orders');
    
    console.log('Updating pagination info:');
    console.log('Current page:', currentPage);
    console.log('Total pages:', totalPages);
    console.log('Total orders:', allOrdersData.length);
    console.log('All orders data:', allOrdersData);
    
    if (currentPageSpan) currentPageSpan.textContent = currentPage;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPages;
    if (totalOrdersSpan) totalOrdersSpan.textContent = allOrdersData.length || 0;
}

// Function to display orders table
function displayOrdersTable(orders) {
    // Find the orders table container within the current popup context
    const popup = document.querySelector('.summary-popup.show') || document.querySelector('.summary-popup');
    if (!popup) return;
    
    const container = popup.querySelector('.orders-table-container');
    
    if (!container) return;
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="no-orders"><p>No orders found for this month.</p></div>';
        return;
    }
    
    const table = `
        <table class="table table-striped table-hover">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Products</th>
                    <th>Total</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(order => `
                    <tr>
                        <td>${order.order_id}</td>
                        <td>${order.customer_name}</td>
                        <td>${order.products || 'No products data'}</td>
                        <td>$${order.grand_total ? order.grand_total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</td>
                        <td>${new Date(order.order_date).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}



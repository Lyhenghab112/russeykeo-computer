document.addEventListener('DOMContentLoaded', function() {
    const btnAllMonths = document.getElementById('btnAllMonths');
    const btnCurrentMonth = document.getElementById('btnCurrentMonth');
    const btnTodayRevenue = document.getElementById('btnTodayRevenue');
    const allMonthsAmountEl = document.getElementById('allMonthsAmount');
    const currentMonthAmountEl = document.getElementById('currentMonthAmount');
    const todayRevenueAmountEl = document.getElementById('todayRevenueAmount');
    const allMonthsProfitEl = document.getElementById('allMonthsProfit');
    const currentMonthProfitEl = document.getElementById('currentMonthProfit');
    const todayRevenueProfitEl = document.getElementById('todayRevenueProfit');

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Custom notification function with better styling
    function showCustomNotification(title, message, type = 'info') {
        // Remove existing notification if any
        const existingNotification = document.querySelector('.custom-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification container
        const notification = document.createElement('div');
        notification.className = 'custom-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 350px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            border-left: 4px solid ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
            animation: slideInRight 0.3s ease-out;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 16px 20px 12px;
            background: ${type === 'error' ? '#fef2f2' : type === 'success' ? '#f0fdf4' : '#eff6ff'};
            border-bottom: 1px solid ${type === 'error' ? '#fecaca' : type === 'success' ? '#dcfce7' : '#dbeafe'};
        `;

        const titleEl = document.createElement('div');
        titleEl.textContent = title;
        titleEl.style.cssText = `
            font-weight: 600;
            font-size: 16px;
            color: ${type === 'error' ? '#991b1b' : type === 'success' ? '#166534' : '#1e40af'};
            margin-bottom: 4px;
        `;

        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            font-size: 14px;
            color: ${type === 'error' ? '#7f1d1d' : type === 'success' ? '#15803d' : '#1e3a8a'};
            line-height: 1.4;
        `;

        header.appendChild(titleEl);
        header.appendChild(messageEl);

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 12px;
            right: 16px;
            background: none;
            border: none;
            font-size: 20px;
            color: #6b7280;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s;
        `;
        closeBtn.onmouseover = () => {
            closeBtn.style.background = '#f3f4f6';
            closeBtn.style.color = '#374151';
        };
        closeBtn.onmouseout = () => {
            closeBtn.style.background = 'none';
            closeBtn.style.color = '#6b7280';
        };
        closeBtn.onclick = () => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        };

        // Add elements to notification
        notification.appendChild(header);
        notification.appendChild(closeBtn);

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);

        // Add CSS animations
        if (!document.querySelector('#custom-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'custom-notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Helper function to get customer name from different data structures
    function getCustomerName(sale) {
        // Try different possible field names for customer names
        if (sale.customer_name) {
            return sale.customer_name;
        }
        if (sale.name) {
            return sale.name;
        }
        if (sale.first_name || sale.last_name) {
            const firstName = sale.first_name || '';
            const lastName = sale.last_name || '';
            return `${firstName} ${lastName}`.trim();
        }
        if (sale.customer_first_name || sale.customer_last_name) {
            const firstName = sale.customer_first_name || '';
            const lastName = sale.customer_last_name || '';
            return `${firstName} ${lastName}`.trim();
        }
        // If no name found, try to get from customer_id or show a placeholder
        if (sale.customer_id) {
            return `Customer #${sale.customer_id}`;
        }
        return 'Unknown Customer';
    }

    async function fetchTotalSalesAndProfit(startDate, endDate) {
        try {
            const response = await fetch(`/auth/staff/api/reports/monthly_sales?start_date=${startDate}&end_date=${endDate}`);
            const data = await response.json();
            if (data.success && data.sales.length > 0) {
                const totalSales = data.sales.reduce((sum, item) => sum + item.total_sales, 0);
                const totalProfit = data.sales.reduce((sum, item) => sum + item.total_profit, 0);
                return { sales: totalSales, profit: totalProfit };
            }
            return { sales: 0, profit: 0 };
        } catch {
            return { sales: 0, profit: 0 };
        }
    }

    async function fetchTodayRevenue() {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const response = await fetch(`/auth/staff/api/reports/today_revenue?date=${today}`);
            const data = await response.json();
            if (data.success) {
                return { sales: data.total_revenue || 0, profit: data.total_profit || 0 };
            }
            return { sales: 0, profit: 0 };
        } catch {
            return { sales: 0, profit: 0 };
        }
    }

    async function updateAmounts() {
        const now = new Date();
        const year = now.getFullYear();
        const currentMonthIndex = now.getMonth();

        // Date range for all months: Jan 1 to end of current month
        const allStartDate = `${year}-01-01`;
        const allEndDate = new Date(year, currentMonthIndex + 1, 0).toISOString().slice(0,10);

        // Date range for current month
        const startDate = new Date(year, currentMonthIndex, 1).toISOString().slice(0,10);
        const endDate = new Date(year, currentMonthIndex + 1, 0).toISOString().slice(0,10);

        const allData = await fetchTotalSalesAndProfit(allStartDate, allEndDate);
        const currentData = await fetchTotalSalesAndProfit(startDate, endDate);
        const todayData = await fetchTodayRevenue();

        // Update revenue amounts
        if (allMonthsAmountEl) {
            allMonthsAmountEl.textContent = `$${allData.sales.toLocaleString()}`;
        }
        if (currentMonthAmountEl) {
            currentMonthAmountEl.textContent = `$${currentData.sales.toLocaleString()}`;
        }
        if (todayRevenueAmountEl) {
            todayRevenueAmountEl.textContent = `$${todayData.sales.toLocaleString()}`;
        }

        // Update profit amounts and percentages
        if (allMonthsProfitEl) {
            const allProfitPercentage = allData.sales > 0 ? ((allData.profit / allData.sales) * 100).toFixed(1) : 0;
            allMonthsProfitEl.textContent = `Total Save: $${allData.profit.toLocaleString()} (${allProfitPercentage}%)`;
            allMonthsProfitEl.className = `monthly-sales-toggle-profit ${allData.profit >= 0 ? 'positive' : 'negative'}`;
        }
        if (currentMonthProfitEl) {
            const currentProfitPercentage = currentData.sales > 0 ? ((currentData.profit / currentData.sales) * 100).toFixed(1) : 0;
            currentMonthProfitEl.textContent = `Total Save for Month: $${currentData.profit.toLocaleString()} (${currentProfitPercentage}%)`;
            currentMonthProfitEl.className = `monthly-sales-toggle-profit ${currentData.profit >= 0 ? 'positive' : 'negative'}`;
        }
        if (todayRevenueProfitEl) {
            const todayProfitPercentage = todayData.sales > 0 ? ((todayData.profit / todayData.sales) * 100).toFixed(1) : 0;
            todayRevenueProfitEl.textContent = `Total Save Today: $${todayData.profit.toLocaleString()} (${todayProfitPercentage}%)`;
            todayRevenueProfitEl.className = `monthly-sales-toggle-profit ${todayData.profit >= 0 ? 'positive' : 'negative'}`;
        }
    }

    function setActiveButton(activeBtn) {
        // Remove active class from all buttons
        const allButtons = document.querySelectorAll('.monthly-sales-toggle-button');
        allButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to the clicked button
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    // Function to show sales detail popup for all months
    function showAllMonthsSalesDetail() {
        const now = new Date();
        const currentMonthIndex = now.getMonth();
        const year = now.getFullYear();
        const months = [];
        for (let m = 0; m <= currentMonthIndex; m++) {
            months.push(`${year}-${(m + 1).toString().padStart(2, '0')}`);
        }
        showSalesDetailModal(months.join(', '), months);
    }

    // Function to show sales detail popup for current month
    function showCurrentMonthSalesDetail() {
        const now = new Date();
        const month = now.toISOString().slice(0,7);
        const monthName = monthNames[now.getMonth()];
        showSalesDetailModal(`${monthName} ${now.getFullYear()}`, [month]);
    }

    // Function to show sales detail popup for today
    async function showTodayRevenueDetail() {
        try {
            const today = new Date().toISOString().slice(0,10);
            const todayFormatted = new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            // Fetch today's sales data directly
            const response = await fetch(`/auth/staff/api/reports/daily_sales_detail?date=${today}`);
            const data = await response.json();
            
            if (data.success && data.sales_detail && data.sales_detail.length > 0) {
                                 // Transform the data to match the expected format
                 const transformedSales = data.sales_detail.map(sale => ({
                     ...sale,
                     total_profit: sale.total_profit || 0 // Use actual profit, default to 0 if not available
                 }));
                createMoneyInsightModal(`Today's Revenue - ${todayFormatted}`, transformedSales);
            } else {
                showCustomNotification('No sales recorded for today', 'Sales will appear here once orders are placed', 'info');
            }
        } catch (error) {
            console.error('Error fetching today\'s sales details:', error);
            showCustomNotification('Error', 'Failed to load today\'s sales details. Please try again.', 'error');
        }
    }

    if (btnAllMonths) {
        btnAllMonths.addEventListener('click', () => {
            setActiveButton(btnAllMonths);
            showAllMonthsSalesDetail();
        });
    }

    if (btnCurrentMonth) {
        btnCurrentMonth.addEventListener('click', () => {
            setActiveButton(btnCurrentMonth);
            showCurrentMonthSalesDetail();
        });
    }

    if (btnTodayRevenue) {
        btnTodayRevenue.addEventListener('click', () => {
            setActiveButton(btnTodayRevenue);
            showTodayRevenueDetail();
        });
    }

    // Initialize with default active state
    if (btnAllMonths) {
        setActiveButton(btnAllMonths);
    }

    // New clean Money Insight modal function
    async function showSalesDetailModal(periodTitle, months) {
        try {
            let allSales = [];
            
            // Fetch data for each month
            for (const month of months) {
                const response = await fetch(`/auth/staff/api/reports/monthly_sales_detail?month=${month}`);
                const data = await response.json();
                if (data.success && data.sales_detail) {
                    allSales = allSales.concat(data.sales_detail);
                }
            }

            if (allSales.length === 0) {
                showCustomNotification('No Data', 'No sales data available for the selected period.', 'info');
                return;
            }

            // Create and show modal
            createMoneyInsightModal(periodTitle, allSales);
            
        } catch (error) {
            console.error('Error fetching sales details:', error);
            showCustomNotification('Error', 'Failed to load sales details. Please try again.', 'error');
        }
    }

    // Create the Money Insight modal
    function createMoneyInsightModal(periodTitle, salesData) {
        // Remove existing modal if any
        const existingModal = document.getElementById('moneyInsightModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Pagination variables
        let currentPage = 1;
        let ordersPerPage = 10;
        let totalPages = Math.ceil(salesData.length / ordersPerPage);
        let allSalesData = salesData;

        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'moneyInsightBackdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.25);
            z-index: 10000;
            display: block;
        `;
        backdrop.onclick = () => {
            // Remove both backdrop and modal
            if (backdrop && backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
            }
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'moneyInsightModal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            padding: 0;
            z-index: 10001;
            max-height: 85vh;
            overflow-y: auto;
            width: 90vw;
            max-width: 1200px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 0;
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
            background: #f9fafb;
        `;

        // Create left section with title and PDF export button
        const leftSection = document.createElement('div');
        leftSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 16px;
        `;

        const title = document.createElement('h3');
        title.textContent = `RusseyKeo Computer - ${periodTitle}`;
        title.style.cssText = `
            margin: 0;
            color: #111827;
            font-size: 16px;
            font-weight: 600;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // Create PDF Export Button
        const pdfExportBtn = document.createElement('button');
        pdfExportBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
            <span style="margin-left: 4px; font-size: 12px;">PDF</span>
        `;
        pdfExportBtn.style.cssText = `
            background: #ffffff;
            color: #374151;
            border: 1px solid #d1d5db;
            padding: 6px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 60px;
            height: 32px;
        `;
        pdfExportBtn.onmouseover = () => {
            pdfExportBtn.style.backgroundColor = '#f9fafb';
            pdfExportBtn.style.borderColor = '#9ca3af';
        };
        pdfExportBtn.onmouseout = () => {
            pdfExportBtn.style.backgroundColor = '#ffffff';
            pdfExportBtn.style.borderColor = '#d1d5db';
        };
        pdfExportBtn.onclick = async () => {
            console.log('PDF Export clicked for period:', periodTitle);
            
            // For "This Month" reports, use the dashboard totals to ensure consistency
            if (periodTitle.includes('Aug 2025') || periodTitle.includes('This Month') || periodTitle.includes('Current Month')) {
                console.log('Detected This Month report, fetching dashboard totals...');
                try {
                    const now = new Date();
                    const year = now.getFullYear();
                    const currentMonthIndex = now.getMonth();
                    const startDate = new Date(year, currentMonthIndex, 1).toISOString().slice(0,10);
                    const endDate = new Date(year, currentMonthIndex + 1, 0).toISOString().slice(0,10);
                    
                    // Get the dashboard totals for this month
                    const response = await fetch(`/auth/staff/api/reports/monthly_sales?start_date=${startDate}&end_date=${endDate}`);
                    const data = await response.json();
                    
                    if (data.success && data.sales.length > 0) {
                        const dashboardTotal = data.sales[0].total_sales;
                        const dashboardProfit = data.sales[0].total_profit;
                        console.log('Dashboard totals for month:', { dashboardTotal, dashboardProfit });
                        
                        // Create a modified dataset with the correct totals
                        const modifiedData = allSalesData.map(sale => ({...sale}));
                        
                        // Add dashboard totals to the data for PDF calculation
                        modifiedData.dashboardTotals = {
                            grandTotal: dashboardTotal,
                            totalProfit: dashboardProfit
                        };
                        
                        exportToPDF(periodTitle, modifiedData);
                        return;
                    }
                } catch (error) {
                    console.error('Error fetching dashboard totals:', error);
                }
            }
            
            // For "Today's Orders" reports, use today's dashboard totals
            if (periodTitle.includes('Today') || periodTitle.includes('Today\'s Orders') || periodTitle.includes('Current Day')) {
                console.log('Detected Today report, fetching dashboard totals...');
                try {
                    const today = new Date().toISOString().slice(0,10);
                    
                    // Get today's dashboard totals
                    const response = await fetch(`/auth/staff/api/reports/today_revenue`);
                    const data = await response.json();

                    if (data.success) {
                        const dashboardTotal = data.total_revenue;
                        const dashboardProfit = data.total_profit;
                        console.log('Dashboard totals for today:', { dashboardTotal, dashboardProfit });

                        // Create a modified dataset with the correct totals
                        const modifiedData = allSalesData.map(sale => ({...sale}));

                        // Add dashboard totals to the data for PDF calculation
                        modifiedData.dashboardTotals = {
                            grandTotal: dashboardTotal,
                            totalProfit: dashboardProfit
                        };

                        exportToPDF(periodTitle, modifiedData);
                        return;
                    }
                } catch (error) {
                    console.error('Error fetching today\'s dashboard totals:', error);
                }
            }
            
            // For "This Year" reports, use the dashboard totals to ensure consistency
            if (periodTitle.includes('All Time') || periodTitle.includes('All Months') || periodTitle.includes('This Year') || periodTitle.includes('2025')) {
                console.log('Detected This Year report, fetching dashboard totals...');
                try {
                    const now = new Date();
                    const year = now.getFullYear();
                    const startDate = `${year}-01-01`;
                    const endDate = new Date(year, 11, 31).toISOString().slice(0,10);
                    
                    console.log('Fetching year data from:', startDate, 'to', endDate);
                    
                    // Get the dashboard totals for this year
                    const response = await fetch(`/auth/staff/api/reports/monthly_sales?start_date=${startDate}&end_date=${endDate}`);
                    const data = await response.json();
                    
                    if (data.success && data.sales.length > 0) {
                        // Sum up all months for the year
                        const dashboardTotal = data.sales.reduce((sum, item) => sum + item.total_sales, 0);
                        const dashboardProfit = data.sales.reduce((sum, item) => sum + item.total_profit, 0);
                        console.log('Dashboard totals for year:', { dashboardTotal, dashboardProfit });
                        
                        // Create a modified dataset with the correct totals
                        const modifiedData = allSalesData.map(sale => ({...sale}));
                        
                        // Add dashboard totals to the data for PDF calculation
                        modifiedData.dashboardTotals = {
                            grandTotal: dashboardTotal,
                            totalProfit: dashboardProfit
                        };
                        
                        exportToPDF(periodTitle, modifiedData);
                        return;
                    }
                } catch (error) {
                    console.error('Error fetching dashboard totals:', error);
                }
            }
            
            console.log('Using modal data for PDF export');
            // For other reports, use the modal data as usual
            exportToPDF(periodTitle, allSalesData);
        };

        // Create CSV Export Button
        const csvExportBtn = document.createElement('button');
        csvExportBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
            <span style="margin-left: 4px; font-size: 12px;">CSV</span>
        `;
        csvExportBtn.style.cssText = `
            background: #ffffff;
            color: #374151;
            border: 1px solid #d1d5db;
            padding: 6px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 60px;
            height: 32px;
            margin-left: 8px;
        `;
        csvExportBtn.onmouseover = () => {
            csvExportBtn.style.backgroundColor = '#f9fafb';
            csvExportBtn.style.borderColor = '#9ca3af';
        };
        csvExportBtn.onmouseout = () => {
            csvExportBtn.style.backgroundColor = '#ffffff';
            csvExportBtn.style.borderColor = '#d1d5db';
        };
        csvExportBtn.onclick = async () => {
            console.log('CSV Export clicked for period:', periodTitle);

            // For "This Month" reports, use the dashboard totals to ensure consistency
            if (periodTitle.includes('Aug 2025') || periodTitle.includes('This Month') || periodTitle.includes('Current Month')) {
                console.log('Detected This Month report, fetching dashboard totals...');
                try {
                    const now = new Date();
                    const year = now.getFullYear();
                    const currentMonthIndex = now.getMonth();
                    const startDate = new Date(year, currentMonthIndex, 1).toISOString().slice(0,10);
                    const endDate = new Date(year, currentMonthIndex + 1, 0).toISOString().slice(0,10);

                    // Get the dashboard totals for this month
                    const response = await fetch(`/auth/staff/api/reports/monthly_sales?start_date=${startDate}&end_date=${endDate}`);
                    const data = await response.json();

                    if (data.success && data.sales.length > 0) {
                        const dashboardTotal = data.sales[0].total_sales;
                        const dashboardProfit = data.sales[0].total_profit;
                        console.log('Dashboard totals for month:', { dashboardTotal, dashboardProfit });

                        // Create a modified dataset with the correct totals
                        const modifiedData = allSalesData.map(sale => ({...sale}));

                        // Add dashboard totals to the data for CSV calculation
                        modifiedData.dashboardTotals = {
                            grandTotal: dashboardTotal,
                            totalProfit: dashboardProfit
                        };

                        exportToCSV(periodTitle, modifiedData);
                        return;
                    }
                } catch (error) {
                    console.error('Error fetching dashboard totals:', error);
                }
            }

            // For "Today's Orders" reports, use today's dashboard totals
            if (periodTitle.includes('Today') || periodTitle.includes('Today\'s Orders') || periodTitle.includes('Current Day')) {
                console.log('Detected Today report, fetching dashboard totals...');
                try {
                    const today = new Date().toISOString().slice(0,10);
                    
                    // Get today's dashboard totals
                    const response = await fetch(`/auth/staff/api/reports/today_revenue`);
                    const data = await response.json();

                    if (data.success) {
                        const dashboardTotal = data.total_revenue;
                        const dashboardProfit = data.total_profit;
                        console.log('Dashboard totals for today:', { dashboardTotal, dashboardProfit });

                        // Create a modified dataset with the correct totals
                        const modifiedData = allSalesData.map(sale => ({...sale}));

                        // Add dashboard totals to the data for CSV calculation
                        modifiedData.dashboardTotals = {
                            grandTotal: dashboardTotal,
                            totalProfit: dashboardProfit
                        };

                        exportToCSV(periodTitle, modifiedData);
                        return;
                    }
                } catch (error) {
                    console.error('Error fetching today\'s dashboard totals:', error);
                }
            }

            // For "This Year" reports, use the dashboard totals to ensure consistency
            if (periodTitle.includes('All Time') || periodTitle.includes('All Months') || periodTitle.includes('This Year') || periodTitle.includes('2025')) {
                console.log('Detected This Year report, fetching dashboard totals...');
                try {
                    const now = new Date();
                    const year = now.getFullYear();
                    const startDate = `${year}-01-01`;
                    const endDate = new Date(year, 11, 31).toISOString().slice(0,10);

                    console.log('Fetching year data from:', startDate, 'to', endDate);

                    // Get the dashboard totals for this year
                    const response = await fetch(`/auth/staff/api/reports/monthly_sales?start_date=${startDate}&end_date=${endDate}`);
                    const data = await response.json();

                    if (data.success && data.sales.length > 0) {
                        // Sum up all months for the year
                        const dashboardTotal = data.sales.reduce((sum, item) => sum + item.total_sales, 0);
                        const dashboardProfit = data.sales.reduce((sum, item) => sum + item.total_profit, 0);
                        console.log('Dashboard totals for year:', { dashboardTotal, dashboardProfit });

                        // Create a modified dataset with the correct totals
                        const modifiedData = allSalesData.map(sale => ({...sale}));

                        // Add dashboard totals to the data for CSV calculation
                        modifiedData.dashboardTotals = {
                            grandTotal: dashboardTotal,
                            totalProfit: dashboardProfit
                        };

                        exportToCSV(periodTitle, modifiedData);
                        return;
                    }
                } catch (error) {
                    console.error('Error fetching dashboard totals:', error);
                }
            }

            console.log('Using modal data for CSV export');
            // For other reports, use the modal data as usual
            exportToCSV(periodTitle, allSalesData);
        };

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.cssText = `
            background: transparent;
            border: none;
            font-size: 20px;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
            border-radius: 3px;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
        `;
        closeButton.onmouseover = () => {
            closeButton.style.backgroundColor = '#f3f4f6';
            closeButton.style.color = '#374151';
        };
        closeButton.onmouseout = () => {
            closeButton.style.backgroundColor = 'transparent';
            closeButton.style.color = '#6b7280';
        };
        closeButton.onclick = () => {
            // Remove both backdrop and modal
            if (backdrop && backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
            }
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };

        leftSection.appendChild(title);
        leftSection.appendChild(pdfExportBtn);
        leftSection.appendChild(csvExportBtn);
        header.appendChild(leftSection);
        header.appendChild(closeButton);
        modal.appendChild(header);

        // Create content container
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = `
            padding: 24px;
        `;

        // Create table
        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            margin-top: 0;
            font-size: 13px;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            table-layout: fixed;
        `;

        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.cssText = `
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
        `;

        ['#', 'Order ID', 'Order Date', 'Customer Name', 'Product Name', 'Grand Total', 'Total Profit', 'Actions'].forEach((text, index) => {
            const th = document.createElement('th');
            th.textContent = text;
            
            // Set specific column widths
            let width = 'auto';
            if (index === 0) width = '50px';        // #
            else if (index === 1) width = '100px';  // Order ID
            else if (index === 2) width = '120px';  // Order Date
            else if (index === 3) width = '150px';  // Customer Name
            else if (index === 4) width = '300px';  // Product Name (much wider!)
            else if (index === 5) width = '100px';  // Grand Total
            else if (index === 6) width = '100px';  // Total Profit
            else if (index === 7) width = '80px';   // Actions
            
            th.style.cssText = `
                border: none;
                padding: 12px 16px;
                text-align: left;
                font-weight: 600;
                font-size: 11px;
                color: #374151;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                line-height: 1;
                width: ${width};
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            `;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        let grandTotalSum = 0;
        let totalProfitSum = 0;

        // Function to display orders for current page
        function displayOrdersForCurrentPage() {
            tbody.innerHTML = '';
            grandTotalSum = 0;
            totalProfitSum = 0;
            
            const startIndex = (currentPage - 1) * ordersPerPage;
            const endIndex = startIndex + ordersPerPage;
            const currentPageData = allSalesData.slice(startIndex, endIndex);

            currentPageData.forEach((sale, index) => {
            const row = document.createElement('tr');
            row.style.cssText = `
                background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};
                transition: background-color 0.15s ease;
                border-bottom: 1px solid #f3f4f6;
            `;
            row.onmouseover = () => {
                row.style.backgroundColor = '#f0f9ff';
            };
            row.onmouseout = () => {
                row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
            };

                         // Calculate totals
             const grandTotal = sale.grand_total || sale.total || 0;
             const profit = sale.total_profit || 0; // Use actual profit, default to 0 if not available
             grandTotalSum += grandTotal;
             totalProfitSum += profit;

            // Format profit with color coding
            const profitColor = profit >= 0 ? '#166534' : '#991b1b';
            const profitDisplay = `$${profit.toFixed(2)}`;

            // Create table cells
            const cells = [
                (index + 1).toString(),
                sale.order_id || 'N/A',
                sale.order_date || 'N/A',
                getCustomerName(sale),
                sale.products || 'N/A',
                `$${grandTotal.toFixed(2)}`,
                profitDisplay
            ];

            cells.forEach((text, cellIndex) => {
                const td = document.createElement('td');
                td.textContent = text;
                td.style.cssText = `
                    border: none;
                    padding: 12px 16px;
                    font-size: 13px;
                    color: #374151;
                    line-height: 1.4;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                `;
                
                // Center align numeric columns
                if (cellIndex === 0 || cellIndex === 1 || cellIndex === 5) {
                    td.style.textAlign = 'center';
                }
                
                // Special handling for Product Name column (index 4)
                if (cellIndex === 4) {
                    td.style.whiteSpace = 'normal';
                    td.style.wordWrap = 'break-word';
                    td.style.maxWidth = '300px';
                    td.title = text; // Show full text on hover
                }
                
                // Color code profit
                if (cellIndex === 6) {
                    td.style.color = profitColor;
                    td.style.fontWeight = '600';
                    td.style.textAlign = 'center';
                }
                
                row.appendChild(td);
            });

            // Add detail button cell
            const detailTd = document.createElement('td');
            detailTd.style.cssText = `
                border: none;
                padding: 12px 16px;
                text-align: center;
            `;
            
            const detailButton = document.createElement('button');
            detailButton.textContent = 'View';
            detailButton.style.cssText = `
                background-color: #ffffff;
                color: #374151;
                border: 1px solid #d1d5db;
                padding: 4px 8px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 11px;
                font-weight: 500;
                transition: all 0.15s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            `;
            detailButton.onmouseover = () => {
                detailButton.style.backgroundColor = '#f9fafb';
                detailButton.style.borderColor = '#9ca3af';
            };
            detailButton.onmouseout = () => {
                detailButton.style.backgroundColor = '#ffffff';
                detailButton.style.borderColor = '#d1d5db';
            };
            detailButton.onclick = () => {
                // Show order details in a professional modal instead of alert
                showOrderDetailModal(sale, grandTotal, profit);
            };
            
            detailTd.appendChild(detailButton);
            row.appendChild(detailTd);
            tbody.appendChild(row);
        });
    }

        // Add grand total row
        const totalRow = document.createElement('tr');
        totalRow.style.cssText = `
            background: #f8fafc;
            border-top: 1px solid #e5e7eb;
        `;
        
        const totalLabelTd = document.createElement('td');
        totalLabelTd.textContent = 'Grand Total for Period';
        totalLabelTd.style.cssText = `
            border: none;
            padding: 16px;
            font-weight: 600;
            text-align: right;
            font-size: 13px;
            color: #111827;
        `;
        totalLabelTd.colSpan = 5;
        totalRow.appendChild(totalLabelTd);

        const totalValueTd = document.createElement('td');
        totalValueTd.textContent = `$${grandTotalSum.toFixed(2)}`;
        totalValueTd.style.cssText = `
            border: none;
            padding: 16px;
            font-weight: 600;
            text-align: center;
            font-size: 13px;
            color: #111827;
        `;
        totalRow.appendChild(totalValueTd);

        // Empty cells for profit and actions
        const emptyProfitTd = document.createElement('td');
        emptyProfitTd.style.cssText = `border: none; padding: 16px;`;
        totalRow.appendChild(emptyProfitTd);

        const emptyActionsTd = document.createElement('td');
        emptyActionsTd.style.cssText = `border: none; padding: 16px;`;
        totalRow.appendChild(emptyActionsTd);

        tbody.appendChild(totalRow);

        // Add total profit row
        const profitRow = document.createElement('tr');
        const profitColor = totalProfitSum >= 0 ? '#166534' : '#991b1b';
        const profitBgColor = totalProfitSum >= 0 ? '#f0fdf4' : '#fef2f2';
        profitRow.style.cssText = `
            background: ${profitBgColor};
            border-top: 1px solid #e5e7eb;
        `;
        
        const profitLabelTd = document.createElement('td');
        profitLabelTd.textContent = 'Total Profit for Period';
        profitLabelTd.style.cssText = `
            border: none;
            padding: 16px;
            font-weight: 600;
            text-align: right;
            font-size: 13px;
            color: ${profitColor};
        `;
        profitLabelTd.colSpan = 6;
        profitRow.appendChild(profitLabelTd);

        const profitValueTd = document.createElement('td');
        profitValueTd.textContent = `$${totalProfitSum.toFixed(2)}`;
        profitValueTd.style.cssText = `
            border: none;
            padding: 16px;
            font-weight: 600;
            text-align: center;
            font-size: 13px;
            color: ${profitColor};
        `;
        profitRow.appendChild(profitValueTd);

        // Empty cell for actions
        const emptyProfitActionsTd = document.createElement('td');
        emptyProfitActionsTd.style.cssText = `border: none; padding: 16px;`;
        profitRow.appendChild(emptyProfitActionsTd);

        tbody.appendChild(profitRow);
        table.appendChild(tbody);
        contentContainer.appendChild(table);

        // Add pagination controls
        if (totalPages > 1) {
            const paginationContainer = document.createElement('div');
            paginationContainer.style.cssText = `
                display: flex;
                justify-content: center;
                align-items: center;
                margin-top: 20px;
                gap: 8px;
            `;

            // Previous button
            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '‹';
            prevBtn.style.cssText = `
                padding: 8px 10px;
                border: 1px solid #d1d5db;
                background: ${currentPage === 1 ? '#f3f4f6' : '#ffffff'};
                color: ${currentPage === 1 ? '#9ca3af' : '#374151'};
                border-radius: 4px;
                cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'};
                font-size: 16px;
                font-weight: bold;
                transition: all 0.2s ease;
                min-width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            prevBtn.onclick = () => {
                if (currentPage > 1) {
                    currentPage--;
                    displayOrdersForCurrentPage();
                    updatePaginationControls();
                }
            };

            // Page numbers - show only 5 at a time
            const pageNumbersContainer = document.createElement('div');
            pageNumbersContainer.style.cssText = `
                display: flex;
                gap: 4px;
            `;

            // Calculate which 5 page numbers to show
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            
            // Adjust start page if we're near the end
            if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
            }

            // Show first page if not in range
            if (startPage > 1) {
                const firstBtn = document.createElement('button');
                firstBtn.textContent = '1';
                firstBtn.style.cssText = `
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    background: #ffffff;
                    color: #374151;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    min-width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                firstBtn.onclick = () => {
                    currentPage = 1;
                    displayOrdersForCurrentPage();
                    updatePaginationControls();
                };
                pageNumbersContainer.appendChild(firstBtn);

                // Add ellipsis if there's a gap
                if (startPage > 2) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    ellipsis.style.cssText = `
                        padding: 8px 4px;
                        color: #6b7280;
                        font-size: 14px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-width: 36px;
                        height: 36px;
                    `;
                    pageNumbersContainer.appendChild(ellipsis);
                }
            }

            // Show the 5 page numbers
            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.textContent = i;
                pageBtn.style.cssText = `
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    background: ${i === currentPage ? '#3b82f6' : '#ffffff'};
                    color: ${i === currentPage ? '#ffffff' : '#374151'};
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    min-width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                pageBtn.onclick = () => {
                    currentPage = i;
                    displayOrdersForCurrentPage();
                    updatePaginationControls();
                };
                pageNumbersContainer.appendChild(pageBtn);
            }

            // Show last page if not in range
            if (endPage < totalPages) {
                // Add ellipsis if there's a gap
                if (endPage < totalPages - 1) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    ellipsis.style.cssText = `
                        padding: 8px 4px;
                        color: #6b7280;
                        font-size: 14px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-width: 36px;
                        height: 36px;
                    `;
                    pageNumbersContainer.appendChild(ellipsis);
                }

                const lastBtn = document.createElement('button');
                lastBtn.textContent = totalPages;
                lastBtn.style.cssText = `
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    background: #ffffff;
                    color: #374151;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    min-width: 36px;
                    height: 36px;
                    display: flex;
                        align-items: center;
                        justify-content: center;
                `;
                lastBtn.onclick = () => {
                    currentPage = totalPages;
                    displayOrdersForCurrentPage();
                    updatePaginationControls();
                };
                pageNumbersContainer.appendChild(lastBtn);
            }

            // Next button
            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '›';
            nextBtn.style.cssText = `
                padding: 8px 10px;
                border: 1px solid #d1d5db;
                background: ${currentPage === totalPages ? '#f3f4f6' : '#ffffff'};
                color: ${currentPage === totalPages ? '#9ca3af' : '#374151'};
                border-radius: 4px;
                cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'};
                font-size: 16px;
                font-weight: bold;
                transition: all 0.2s ease;
                min-width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            nextBtn.onclick = () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    displayOrdersForCurrentPage();
                    updatePaginationControls();
                }
            };

            // Update pagination controls function
            function updatePaginationControls() {
                // Update previous button
                prevBtn.style.background = currentPage === 1 ? '#f3f4f6' : '#ffffff';
                prevBtn.style.color = currentPage === 1 ? '#9ca3af' : '#374151';
                prevBtn.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';

                // Update next button
                nextBtn.style.background = currentPage === totalPages ? '#f3f4f6' : '#ffffff';
                nextBtn.style.color = currentPage === totalPages ? '#9ca3af' : '#374151';
                nextBtn.style.cursor = currentPage === totalPages ? 'not-allowed' : 'pointer';

                // Clear and rebuild page numbers to show correct range
                pageNumbersContainer.innerHTML = '';
                
                // Calculate which 5 page numbers to show
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, startPage + 4);
                
                // Adjust start page if we're near the end
                if (endPage - startPage < 4) {
                    startPage = Math.max(1, endPage - 4);
                }

                // Show first page if not in range
                if (startPage > 1) {
                    const firstBtn = document.createElement('button');
                    firstBtn.textContent = '1';
                    firstBtn.style.cssText = `
                        padding: 8px 12px;
                        border: 1px solid #d1d5db;
                        background: #ffffff;
                        color: #374151;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s ease;
                        min-width: 36px;
                        height: 36px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    `;
                    firstBtn.onclick = () => {
                        currentPage = 1;
                        displayOrdersForCurrentPage();
                        updatePaginationControls();
                    };
                    pageNumbersContainer.appendChild(firstBtn);

                    // Add ellipsis if there's a gap
                    if (startPage > 2) {
                        const ellipsis = document.createElement('span');
                        ellipsis.textContent = '...';
                        ellipsis.style.cssText = `
                            padding: 8px 4px;
                            color: #6b7280;
                            font-size: 14px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-width: 36px;
                            height: 36px;
                        `;
                        pageNumbersContainer.appendChild(ellipsis);
                    }
                }

                // Show the 5 page numbers
                for (let i = startPage; i <= endPage; i++) {
                    const pageBtn = document.createElement('button');
                    pageBtn.textContent = i;
                    pageBtn.style.cssText = `
                        padding: 8px 12px;
                        border: 1px solid #d1d5db;
                        background: ${i === currentPage ? '#3b82f6' : '#ffffff'};
                        color: ${i === currentPage ? '#ffffff' : '#374151'};
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s ease;
                        min-width: 36px;
                        height: 36px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    `;
                    pageBtn.onclick = () => {
                        currentPage = i;
                        displayOrdersForCurrentPage();
                        updatePaginationControls();
                    };
                    pageNumbersContainer.appendChild(pageBtn);
                }

                // Show last page if not in range
                if (endPage < totalPages) {
                    // Add ellipsis if there's a gap
                    if (endPage < totalPages - 1) {
                        const ellipsis = document.createElement('span');
                        ellipsis.textContent = '...';
                        ellipsis.style.cssText = `
                            padding: 8px 4px;
                            color: #6b7280;
                            font-size: 14px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-width: 36px;
                            height: 36px;
                        `;
                        pageNumbersContainer.appendChild(ellipsis);
                    }

                    const lastBtn = document.createElement('button');
                    lastBtn.textContent = totalPages;
                    lastBtn.style.cssText = `
                        padding: 8px 12px;
                        border: 1px solid #d1d5db;
                        background: #ffffff;
                        color: #374151;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s ease;
                        min-width: 36px;
                        height: 36px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    `;
                    lastBtn.onclick = () => {
                        currentPage = totalPages;
                        displayOrdersForCurrentPage();
                        updatePaginationControls();
                    };
                    pageNumbersContainer.appendChild(lastBtn);
                }
            }

            paginationContainer.appendChild(prevBtn);
            paginationContainer.appendChild(pageNumbersContainer);
            paginationContainer.appendChild(nextBtn);
            contentContainer.appendChild(paginationContainer);
        }

        modal.appendChild(contentContainer);

        // Initialize the first page display
        displayOrdersForCurrentPage();

        // Add to DOM
        document.body.appendChild(backdrop);
        document.body.appendChild(modal);
    }

    // Professional Order Detail Modal
    async function showOrderDetailModal(sale, grandTotal, profit) {
        // Remove existing order detail modal if any
        const existingModal = document.getElementById('orderDetailModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'orderDetailBackdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.25);
            z-index: 10002;
            display: block;
        `;
        backdrop.onclick = () => {
            if (backdrop && backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
            }
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'orderDetailModal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            padding: 0;
            z-index: 10003;
            width: 90vw;
            max-width: 800px;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 0;
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
            background: #f9fafb;
        `;

        const title = document.createElement('h3');
        title.textContent = `Order Details - #${sale.order_id}`;
        title.style.cssText = `
            margin: 0;
            color: #111827;
            font-size: 16px;
            font-weight: 600;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.cssText = `
            background: transparent;
            border: none;
            font-size: 20px;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
            border-radius: 3px;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
        `;
        closeButton.onmouseover = () => {
            closeButton.style.backgroundColor = '#f3f4f6';
            closeButton.style.color = '#374151';
        };
        closeButton.onmouseout = () => {
            closeButton.style.backgroundColor = 'transparent';
            closeButton.style.color = '#6b7280';
        };
        closeButton.onclick = () => {
            if (backdrop && backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
            }
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };

        header.appendChild(title);
        header.appendChild(closeButton);
        modal.appendChild(header);

        // Create content
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 24px;
        `;

        // Get customer name using the same function
        const customerName = getCustomerName(sale);

        // Create order summary section
        const summarySection = document.createElement('div');
        summarySection.style.cssText = `
            margin-bottom: 24px;
            padding: 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
        `;

        const summaryTitle = document.createElement('h4');
        summaryTitle.textContent = 'Order Summary';
        summaryTitle.style.cssText = `
            margin: 0 0 16px 0;
            color: #1e293b;
            font-size: 14px;
            font-weight: 600;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        summarySection.appendChild(summaryTitle);

        // Create order summary details
        const summaryDetails = [
            { label: 'Order ID', value: sale.order_id || 'N/A' },
            { label: 'Order Date', value: sale.order_date || 'N/A' },
            { label: 'Customer Name', value: customerName },
            { label: 'Grand Total', value: `$${grandTotal.toFixed(2)}` },
            { label: 'Total Profit', value: `$${profit.toFixed(2)}` }
        ];

        summaryDetails.forEach(detail => {
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #e2e8f0;
            `;

            const label = document.createElement('span');
            label.textContent = detail.label;
            label.style.cssText = `
                font-weight: 600;
                color: #475569;
                font-size: 13px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

            const value = document.createElement('span');
            value.textContent = detail.value;
            value.style.cssText = `
                color: #1e293b;
                font-size: 13px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

            // Color code profit
            if (detail.label === 'Total Profit') {
                const profitColor = profit >= 0 ? '#166534' : '#991b1b';
                value.style.color = profitColor;
                value.style.fontWeight = '600';
            }

            row.appendChild(label);
            row.appendChild(value);
            summarySection.appendChild(row);
        });

        content.appendChild(summarySection);

        // Create products section
        const productsSection = document.createElement('div');
        productsSection.style.cssText = `
            margin-bottom: 24px;
        `;

        const productsTitle = document.createElement('h4');
        productsTitle.textContent = 'Products Ordered';
        productsTitle.style.cssText = `
            margin: 0 0 16px 0;
            color: #1e293b;
            font-size: 14px;
            font-weight: 600;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        productsSection.appendChild(productsTitle);

        // Create products table
        const productsTable = document.createElement('table');
        productsTable.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // Create table header
        const productsThead = document.createElement('thead');
        const productsHeaderRow = document.createElement('tr');
        productsHeaderRow.style.cssText = `
            background: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
        `;

        ['#', 'Product Name', 'Quantity', 'Unit Price', 'Total', 'Profit'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            th.style.cssText = `
                border: none;
                padding: 10px 12px;
                text-align: left;
                font-weight: 600;
                font-size: 11px;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                line-height: 1;
            `;
            productsHeaderRow.appendChild(th);
        });
        productsThead.appendChild(productsHeaderRow);
        productsTable.appendChild(productsThead);

        // Create table body
        const productsTbody = document.createElement('tbody');
        productsTbody.id = 'productsTableBody';
        productsTable.appendChild(productsTbody);

        // Add loading state
        const loadingRow = document.createElement('tr');
        loadingRow.style.cssText = `
            background-color: #ffffff;
            border-bottom: 1px solid #f1f5f9;
        `;
        const loadingCell = document.createElement('td');
        loadingCell.textContent = 'Loading products...';
        loadingCell.style.cssText = `
            border: none;
            padding: 20px 12px;
            text-align: center;
            color: #64748b;
            font-size: 13px;
            font-style: italic;
        `;
        loadingCell.colSpan = 6;
        loadingRow.appendChild(loadingCell);
        productsTbody.appendChild(loadingRow);

        productsSection.appendChild(productsTable);
        content.appendChild(productsSection);

        // Add footer with close button
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            padding: 20px 24px;
            border-top: 1px solid #e5e7eb;
            background: #f9fafb;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            background-color: #ffffff;
            color: #374151;
            border: 1px solid #d1d5db;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.15s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        closeBtn.onmouseover = () => {
            closeBtn.style.backgroundColor = '#f9fafb';
            closeBtn.style.borderColor = '#9ca3af';
        };
        closeBtn.onmouseout = () => {
            closeBtn.style.backgroundColor = '#ffffff';
            closeBtn.style.borderColor = '#d1d5db';
        };
        closeBtn.onclick = () => {
            if (backdrop && backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
            }
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };

        footer.appendChild(closeBtn);
        modal.appendChild(content);
        modal.appendChild(footer);

        // Add to DOM
        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        // Fetch and display products
        try {
            console.log('Fetching products for order:', sale.order_id);
            const response = await fetch(`/auth/staff/api/order/${sale.order_id}/items`);
            const data = await response.json();
            console.log('API response:', data);
            
            if (data.success && data.items && data.items.length > 0) {
                console.log('Products found:', data.items);
                // Clear loading state
                productsTbody.innerHTML = '';
                
                // Add products to table
                data.items.forEach((item, index) => {
                    const row = document.createElement('tr');
                    row.style.cssText = `
                        background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};
                        border-bottom: 1px solid #f1f5f9;
                    `;

                    const cells = [
                        (index + 1).toString(),
                        item.product_name || 'Unknown Product',
                        item.quantity || '1',
                        `$${(item.unit_price || 0).toFixed(2)}`,
                        `$${((item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}`,
                        `$${((item.unit_price || 0) * (item.quantity || 1) * 0.15).toFixed(2)}` // 15% profit
                    ];

                    cells.forEach((text, cellIndex) => {
                        const td = document.createElement('td');
                        td.textContent = text;
                        td.style.cssText = `
                            border: none;
                            padding: 10px 12px;
                            font-size: 12px;
                            color: #1e293b;
                            line-height: 1.4;
                        `;
                        
                        // Center align numeric columns
                        if (cellIndex === 0 || cellIndex === 2 || cellIndex === 3 || cellIndex === 4 || cellIndex === 5) {
                            td.style.textAlign = 'center';
                        }
                        
                        // Color code profit column
                        if (cellIndex === 5) {
                            const profit = (item.unit_price || 0) * (item.quantity || 1) * 0.15;
                            const profitColor = profit >= 0 ? '#166534' : '#991b1b';
                            td.style.color = profitColor;
                            td.style.fontWeight = '600';
                        }
                        
                        row.appendChild(td);
                    });

                    productsTbody.appendChild(row);
                });
            } else {
                console.log('No products found or API error:', data);
                // No products found
                productsTbody.innerHTML = '';
                const noProductsRow = document.createElement('tr');
                noProductsRow.style.cssText = `
                    background-color: #ffffff;
                    border-bottom: 1px solid #f1f5f9;
                `;
                const noProductsCell = document.createElement('td');
                noProductsCell.textContent = 'No products found for this order';
                noProductsCell.style.cssText = `
                    border: none;
                    padding: 20px 12px;
                    text-align: center;
                    color: #64748b;
                    font-size: 13px;
                    font-style: italic;
                `;
                noProductsCell.colSpan = 6;
                noProductsRow.appendChild(noProductsCell);
                productsTbody.appendChild(noProductsRow);
            }
        } catch (error) {
            console.error('Error fetching order items:', error);
            // Show error state
            productsTbody.innerHTML = '';
            const errorRow = document.createElement('tr');
            errorRow.style.cssText = `
                background-color: #fef2f2;
                border-bottom: 1px solid #fecaca;
            `;
            const errorCell = document.createElement('td');
            errorCell.textContent = 'Error loading products';
            errorCell.style.cssText = `
                border: none;
                padding: 20px 12px;
                text-align: center;
                color: #991b1b;
                font-size: 13px;
            `;
                            errorCell.colSpan = 6;
            errorRow.appendChild(errorCell);
            productsTbody.appendChild(errorRow);
        }
    }

    // PDF Export Function
    function exportToPDF(periodTitle, salesData) {
        try {
            // Check if jsPDF is available
            if (!window.jspdf || !window.jspdf.jsPDF) {
                alert('PDF generation library not available. Please refresh the page and try again.');
                return;
            }

            // Create new PDF document using the same pattern as other parts of the system
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            
            // Set font
            doc.setFont('helvetica');
            
            // Add shop logo at the top
            try {
                // Try to load the shop logo from the static folder
                const logoImg = new Image();
                logoImg.src = '/static/icons/logo.jpg'; // Shop logo path
                
                logoImg.onload = function() {
                    // Add logo to PDF (position: top left corner, size: 25x25mm to avoid interference)
                    doc.addImage(logoImg, 'JPEG', 10, 10, 25, 25);
                    
                    // Add title to the right of logo (centered on the page)
                    doc.setFontSize(20);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Computer RusseyKeo', 105, 30, { align: 'center' });
                    
                    // Add period title
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'normal');
                    doc.text(periodTitle, 105, 40, { align: 'center' });
                    
                    // Add date (moved down slightly to avoid logo interference)
                    const currentDate = new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    doc.setFontSize(10);
                    doc.text(`Generated on: ${currentDate}`, 105, 55, { align: 'center' });
                    
                                         // Add table headers
                     const headers = ['#', 'Order ID', 'Order Date', 'Customer Name', 'Product Name', 'Grand Total', 'Total Profit'];
                     const columnWidths = [7, 16, 30, 30, 60, 22, 25];
                     
                     // Calculate total width needed for all columns
                     const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
                     
                     // Center the table on the page (A4 width is 210mm)
                     const pageWidth = 210;
                     const leftMargin = (pageWidth - totalWidth) / 2;
                     let xPos = leftMargin;
                     
                     // Draw header row with blue background (no borders)
                     doc.setFillColor(59, 130, 246); // Blue color matching the image
                     doc.rect(leftMargin, 70, totalWidth, 8, 'F');
                    
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(255, 255, 255); // White text for header
                    headers.forEach((header, index) => {
                        // Left-align text in each column (cleaner style)
                        doc.text(header, xPos + 5, 76);
                        xPos += columnWidths[index];
                    });
                    
                    // Reset text color for data rows
                    doc.setTextColor(0, 0, 0);
                    
                                         // Add data rows
                     let yPos = 85;
                     let rowNumber = 1;
                     let grandTotalSum = 0;
                     let totalProfitSum = 0;
                     
                     // Check if we have dashboard totals to use instead of calculating from orders
                     if (salesData.dashboardTotals) {
                         grandTotalSum = salesData.dashboardTotals.grandTotal;
                         totalProfitSum = salesData.dashboardTotals.totalProfit;
                     } else {
                         // Calculate totals from individual orders (fallback)
                         salesData.forEach((sale, index) => {
                             const grandTotal = sale.grand_total || sale.total || 0;
                             const profit = sale.total_profit || 0;
                             grandTotalSum += grandTotal;
                             totalProfitSum += profit;
                         });
                     }
                     
                     salesData.forEach((sale, index) => {
                         // Check if we need a new page
                         if (yPos > 270) {
                             doc.addPage();
                             yPos = 20;
                             
                             // Don't add logo to new pages - just continue with data
                         }
                         
                         const customerName = getCustomerName(sale);
                         const grandTotal = sale.grand_total || sale.total || 0;
                         const profit = sale.total_profit || 0; // Use actual profit, default to 0 if not available
                        
                         // White background for all data rows (clean, no borders)
                         doc.setFillColor(255, 255, 255);
                         doc.rect(leftMargin, yPos - 2, totalWidth, 8, 'F');
                         
                         // Draw row data
                         doc.setFontSize(8);
                         doc.setFont('helvetica', 'normal');
                         
                         const rowData = [
                             rowNumber.toString(),
                             (sale.order_id || 'N/A').toString(),
                             (sale.order_date || 'N/A').toString(),
                             customerName.toString(),
                             (sale.products || 'N/A').toString(),
                             `$${grandTotal.toFixed(2)}`,
                             `$${profit.toFixed(2)}`
                         ];
                        
                         // Reset xPos for each row to ensure proper column alignment
                         let xPos = leftMargin;
                         rowData.forEach((text, colIndex) => {
                             // Ensure text is a string
                             const textString = text.toString();
                             
                             // Truncate long text for customer name
                             if (colIndex === 3 && textString.length > 15) {
                                 text = textString.substring(0, 12) + '...';
                             }
                             
                             // Truncate long text for product name
                             if (colIndex === 4 && textString.length > 35) {
                                 text = textString.substring(0, 32) + '...';
                             }
                             
                             // Ensure xPos is calculated correctly for each column
                             const currentXPos = leftMargin + columnWidths.slice(0, colIndex).reduce((sum, width) => sum + width, 0);
                             
                             // Left-align text in each column (cleaner style)
                             doc.text(text, currentXPos + 5, yPos);
                         });
                        
                        yPos += 8;
                        rowNumber++;
                    });
                    
                                    // Add clear summary section
                yPos += 10;
                
                // Grand Total Row
                doc.setFillColor(248, 250, 252); // Light blue background
                doc.rect(leftMargin, yPos - 2, totalWidth, 8, 'F');
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('GRAND TOTAL:', leftMargin + 5, yPos + 2);
                doc.text(`$${grandTotalSum.toFixed(2)}`, leftMargin + totalWidth - 25, yPos + 2, { align: 'right' });
                
                // Total Profit Row
                yPos += 10;
                doc.setFillColor(240, 240, 240); // Light grey background
                doc.rect(leftMargin, yPos - 2, totalWidth, 8, 'F');
                doc.text('TOTAL PROFIT:', leftMargin + 5, yPos + 2);
                doc.text(`$${totalProfitSum.toFixed(2)}`, leftMargin + totalWidth - 25, yPos + 2, { align: 'right' });
                
                // Profit Percentage Row
                yPos += 10;
                doc.setFillColor(240, 240, 240); // Light grey
                doc.rect(leftMargin, yPos - 2, totalWidth, 8, 'F');
                const profitPercentage = grandTotalSum > 0 ? ((totalProfitSum / grandTotalSum) * 100).toFixed(1) : 0;
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('PROFIT MARGIN:', leftMargin + 5, yPos + 2);
                doc.text(`${profitPercentage}%`, leftMargin + totalWidth - 25, yPos + 2, { align: 'right' });
                    
                    // Save the PDF
                    const fileName = `Money_Insight_${periodTitle.replace(/[^a-zA-Z0,9]/g, '_')}.pdf`;
                    doc.save(fileName);
                };
                
                logoImg.onerror = function() {
                    // If logo fails to load, continue without it
                    generatePDFWithoutLogo();
                };
                
            } catch (error) {
                // If logo loading fails, generate PDF without it
                generatePDFWithoutLogo();
            }
            
            // Function to generate PDF without logo
            function generatePDFWithoutLogo() {
                // Add title
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.text('Money Insight Report', 105, 30, { align: 'center' });
                
                // Add period title
                doc.setFontSize(14);
                doc.setFont('helvetica', 'normal');
                doc.text(periodTitle, 105, 40, { align: 'center' });
                
                // Add date
                const currentDate = new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                doc.setFontSize(10);
                doc.text(`Generated on: ${currentDate}`, 105, 55, { align: 'center' });
                
                 // Add table headers
                 const headers = ['#', 'Order ID', 'Order Date', 'Customer Name', 'Product Name', 'Grand Total', 'Total Profit'];
                 const columnWidths = [7, 16, 30, 30, 60, 22, 25];
                 
                 // Calculate total width needed for all columns
                 const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
                 
                 // Center the table on the page (A4 width is 210mm)
                 const pageWidth = 210;
                 const leftMargin = (pageWidth - totalWidth) / 2;
                 
                 // Draw header row with blue background (no borders)
                 doc.setFillColor(59, 130, 246); // Blue color matching the image
                 doc.rect(leftMargin, 70, totalWidth, 8, 'F');
                 
                 doc.setFontSize(9);
                 doc.setFont('helvetica', 'bold');
                 doc.setTextColor(255, 255, 255); // White text for header
                 
                 // Draw headers with proper positioning
                 let xPos = leftMargin;
                 headers.forEach((header, index) => {
                     // Left-align text in each column (cleaner style)
                     doc.text(header, xPos + 5, 76);
                     xPos += columnWidths[index];
                 });
                 
                 // Reset text color for data rows
                 doc.setTextColor(0, 0, 0);
                 
                 // Add data rows
                 let yPos = 85;
                 let rowNumber = 1;
                 let grandTotalSum = 0;
                 let totalProfitSum = 0;
                 
                 salesData.forEach((sale, index) => {
                     // Check if we need a new page
                     if (yPos > 270) {
                         doc.addPage();
                         yPos = 20;
                     }
                     
                     const customerName = getCustomerName(sale);
                     const grandTotal = sale.grand_total || sale.total || 0;
                     const profit = sale.total_profit || 0; // Use actual profit, default to 0 if not available
                     
                     grandTotalSum += grandTotal;
                     totalProfitSum += profit;
                     
                     // White background for all data rows
                     doc.setFillColor(255, 255, 255);
                     doc.rect(leftMargin, yPos - 2, totalWidth, 8, 'F');
                     
                     // Draw row data
                     doc.setFontSize(8);
                     doc.setFont('helvetica', 'normal');
                     
                     const rowData = [
                         rowNumber.toString(),
                         (sale.order_id || 'N/A').toString(),
                         (sale.order_date || 'N/A').toString(),
                         customerName.toString(),
                         (sale.products || 'N/A').toString(),
                         `$${grandTotal.toFixed(2)}`,
                         `$${profit.toFixed(2)}`
                     ];
                      
                     // Reset xPos for each row to ensure proper column alignment
                     rowData.forEach((text, colIndex) => {
                         // Ensure text is a string
                         const textString = text.toString();
                         
                         // Truncate long text for customer name
                         if (colIndex === 3 && textString.length > 15) {
                             text = textString.substring(0, 12) + '...';
                         }
                         
                         // Truncate long text for product name
                         if (colIndex === 4 && textString.length > 35) {
                             text = textString.substring(0, 32) + '...';
                         }
                         
                         // Ensure xPos is calculated correctly for each column
                         const currentXPos = leftMargin + columnWidths.slice(0, colIndex).reduce((sum, width) => sum + width, 0);
                         
                         // Left-align text in each column (cleaner style)
                         doc.text(text, currentXPos + 5, yPos);
                     });
                     
                     yPos += 8;
                     rowNumber++;
                 });
                
                // Add clear summary section
                yPos += 10;
                
                // Grand Total Row
                doc.setFillColor(248, 250, 252); // Light blue background
                doc.rect(leftMargin, yPos - 2, totalWidth, 8, 'F');
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('GRAND TOTAL:', leftMargin + 5, yPos + 2);
                doc.text(`$${grandTotalSum.toFixed(2)}`, leftMargin + 112, yPos + 2);
                
                // Total Profit Row
                yPos += 10;
                doc.setFillColor(240, 240, 240); // Light grey background
                doc.rect(leftMargin, yPos - 2, totalWidth, 8, 'F');
                doc.text('TOTAL PROFIT:', leftMargin + 5, yPos + 2);
                doc.text(`$${totalProfitSum.toFixed(2)}`, leftMargin + totalWidth - 25, yPos + 2, { align: 'right' });
                
                // Profit Percentage Row
                yPos += 10;
                doc.setFillColor(240, 240, 240); // Light grey
                doc.rect(leftMargin, yPos - 2, totalWidth, 8, 'F');
                const profitPercentage = grandTotalSum > 0 ? ((totalProfitSum / grandTotalSum) * 100).toFixed(1) : 0;
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('PROFIT MARGIN:', leftMargin + 5, yPos + 2);
                doc.text(`${profitPercentage}%`, leftMargin + totalWidth - 25, yPos + 2, { align: 'right' });
                
                // Save the PDF
                const fileName = `Money_Insight_${periodTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
                doc.save(fileName);
                

            }
            
        } catch (error) {
            console.error('PDF export error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                jsPDFAvailable: typeof jsPDF !== 'undefined',
                windowJspdf: !!window.jspdf,
                windowJspdfJsPDF: !!(window.jspdf && window.jspdf.jsPDF)
            });
            alert(`PDF export failed: ${error.message}. Please check console for details.`);
        }
    }

    // CSV Export Function
    function exportToCSV(periodTitle, salesData) {
        try {
            console.log('CSV Export called with:', { periodTitle, salesDataLength: salesData.length, hasDashboardTotals: !!salesData.dashboardTotals });
            console.log('First few sales items:', salesData.slice(0, 3));
            
            const headers = ['#', 'Order ID', 'Order Date', 'Customer Name', 'Product Name', 'Grand Total', 'Total Profit'];
            const rows = [];
            let rowNumber = 1;
            let grandTotalSum = 0;
            let totalProfitSum = 0;

            // Check if we have dashboard totals to use instead of calculating from orders
            if (salesData.dashboardTotals) {
                grandTotalSum = salesData.dashboardTotals.grandTotal;
                totalProfitSum = salesData.dashboardTotals.totalProfit;
            }

            // Add data rows
            salesData.forEach(sale => {
                const customerName = getCustomerName(sale);
                const grandTotal = sale.grand_total || sale.total || 0;
                const profit = sale.total_profit || 0;
                
                // Only add to sum if not using dashboard totals
                if (!salesData.dashboardTotals) {
                    grandTotalSum += grandTotal;
                    totalProfitSum += profit;
                }

                // Format profit with Excel-compatible negative numbers and currency (Excel will auto-color these)
                const profitDisplay = profit < 0 ? `($${Math.abs(profit).toFixed(2)})` : `$${profit.toFixed(2)}`;
                
                console.log('CSV Row:', { 
                    sale: sale, 
                    profit: profit, 
                    profitType: typeof profit,
                    profitDisplay: profitDisplay, 
                    isNegative: profit < 0,
                    rawProfit: sale.total_profit
                });

                rows.push([
                    rowNumber.toString(),
                    sale.order_id || 'N/A',
                    sale.order_date || 'N/A',
                    customerName,
                    sale.products || 'N/A',
                    `$${grandTotal.toFixed(2)}`,
                    profitDisplay
                ]);
                rowNumber++;
            });

            // Add summary rows
            rows.push([]); // Empty row for spacing
            rows.push(['SUMMARY', '', '', '', '', '', '']);
            rows.push(['GRAND TOTAL', '', '', '', '', `$${grandTotalSum.toFixed(2)}`, '']);
            
            // Format total profit with Excel-compatible negative numbers and currency
            const totalProfitDisplay = totalProfitSum < 0 ? `($${Math.abs(totalProfitSum).toFixed(2)})` : `$${totalProfitSum.toFixed(2)}`;
            rows.push(['TOTAL PROFIT', '', '', '', '', totalProfitDisplay, '']);
            
            // Calculate profit margin
            const profitMargin = grandTotalSum > 0 ? ((totalProfitSum / grandTotalSum) * 100).toFixed(1) : 0;
            rows.push(['PROFIT MARGIN', '', '', '', '', `${profitMargin}%`, '']);

            // Create CSV content with proper escaping
            const csvContent = [headers.join(',')]
                .concat(rows.map(row => 
                    row.map(cell => {
                        // Escape quotes and wrap in quotes if contains comma, quote, or newline
                        const cellStr = String(cell);
                        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                            return `"${cellStr.replace(/"/g, '""')}"`;
                        }
                        return cellStr;
                    }).join(',')
                ))
                .join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Money_Insight_${periodTitle.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('CSV export error:', error);
            alert(`CSV export failed: ${error.message}. Please check console for details.`);
        }
    }

    // Initialize
    updateAmounts();
    
    // Make updateAmounts available globally so it can be called from other scripts
    window.refreshMoneyInsightDashboard = updateAmounts;
});

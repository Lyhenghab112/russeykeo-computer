document.addEventListener('DOMContentLoaded', function() {
    const btnAllMonths = document.getElementById('btnAllMonths');
    const btnCurrentMonth = document.getElementById('btnCurrentMonth');
    const allMonthsAmountEl = document.getElementById('allMonthsAmount');
    const currentMonthAmountEl = document.getElementById('currentMonthAmount');
    const allMonthsProfitEl = document.getElementById('allMonthsProfit');
    const currentMonthProfitEl = document.getElementById('currentMonthProfit');
    const allMonthsLabelEl = btnAllMonths ? btnAllMonths.querySelector('.monthly-sales-toggle-label') : null;
    const currentMonthLabelEl = btnCurrentMonth ? btnCurrentMonth.querySelector('.monthly-sales-toggle-label') : null;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

    async function updateAmounts() {
        const now = new Date();
        const year = now.getFullYear();
        const currentMonthIndex = now.getMonth();

        // Set dynamic labels
        if (allMonthsLabelEl) {
            allMonthsLabelEl.textContent = `Total Earning`;
        }
        if (currentMonthLabelEl) {
            currentMonthLabelEl.textContent = `Total Income for Month`;
        }

        // Date range for all months: Jan 1 to end of current month
        const allStartDate = `${year}-01-01`;
        const allEndDate = new Date(year, currentMonthIndex + 1, 0).toISOString().slice(0,10);

        // Date range for current month
        const startDate = new Date(year, currentMonthIndex, 1).toISOString().slice(0,10);
        const endDate = new Date(year, currentMonthIndex + 1, 0).toISOString().slice(0,10);

        console.log(`Current month calculation: year=${year}, currentMonthIndex=${currentMonthIndex}`);
        console.log(`Current month dates: startDate=${startDate}, endDate=${endDate}`);

        const allData = await fetchTotalSalesAndProfit(allStartDate, allEndDate);
        const currentData = await fetchTotalSalesAndProfit(startDate, endDate);

        // Update revenue amounts
        if (allMonthsAmountEl) {
            allMonthsAmountEl.textContent = `$${allData.sales.toLocaleString()}`;
        }
        if (currentMonthAmountEl) {
            currentMonthAmountEl.textContent = `$${currentData.sales.toLocaleString()}`;
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
    }

    function setActiveButton(activeBtn) {
        btnAllMonths.classList.remove('active');
        btnCurrentMonth.classList.remove('active');
        activeBtn.classList.add('active');
    }

    // Function to show sales detail popup for all months
    function showAllMonthsSalesDetail() {
        if (window.showSalesDetailPopup) {
            // List months from Jan to current month
            const now = new Date();
            const currentMonthIndex = now.getMonth();
            const year = now.getFullYear();
            const months = [];
            for (let m = 0; m <= currentMonthIndex; m++) {
                months.push(`${year}-${(m + 1).toString().padStart(2, '0')}`);
            }
            window.showSalesDetailPopup(months, 'completed');
        } else {
            console.log('showSalesDetailPopup function is not defined.');
        }
    }

    // Function to show sales detail popup for current month
    function showCurrentMonthSalesDetail() {
        const now = new Date();
        const month = now.toISOString().slice(0,7);
        if (window.showSalesDetailPopup) {
            window.showSalesDetailPopup([month], 'completed');
        } else {
            console.log('showSalesDetailPopup function is not defined.');
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

    async function showSalesDetailPopup(months, status) {
        try {
            let allSales = [];
            for (const month of months) {
                let url = `/auth/staff/api/reports/monthly_sales_detail?month=${month}`;
                if (status) {
                    const statuses = status.split(',');
                    for (const stat of statuses) {
                        const response = await fetch(`${url}&status=${stat.trim()}`);
                        const data = await response.json();
                        if (data.success && data.sales_detail) {
                            allSales = allSales.concat(data.sales_detail);
                        }
                    }
                } else {
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data.success && data.sales_detail) {
                        allSales = allSales.concat(data.sales_detail);
                    }
                }
            }
            // Deduplicate sales by order_id
            const uniqueSalesMap = new Map();
            allSales.forEach(sale => {
                uniqueSalesMap.set(sale.order_id, sale);
            });
            const uniqueSales = Array.from(uniqueSalesMap.values());

            if (uniqueSales.length > 0) {
                window.showMonthlySalesDetailModal(months.join(', '), uniqueSales);
            } else {
                alert('No sales data available for the selected period.');
            }
        } catch (error) {
            console.error('Error fetching sales details:', error);
            alert('Error loading sales details.');
        }
    }

    window.showSalesDetailPopup = showSalesDetailPopup;

    updateAmounts();
});

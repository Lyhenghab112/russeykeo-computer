document.addEventListener('DOMContentLoaded', function() {
    // Only run dashboard scripts on the dashboard page
    if (!window.location.pathname.includes('/auth/admin/dashboard') && !window.location.pathname.includes('/dashboard')) {
        return;
    }

    // Close modal when close button clicked
    const closeBtn = document.getElementById('closeFilteredOrdersModal');
    const modal = document.getElementById('filteredOrdersModal');
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Close modal when clicking outside modal content
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    /**
     * Helper function to destroy an existing Chart.js instance if it exists.
     * Prevents multiple charts on the same canvas and memory leaks.
     * @param {string} chartId - The ID of the canvas element.
     */
    function destroyChartIfExists(chartId) {
        const existingChart = Chart.getChart(chartId);
        if (existingChart) {
            existingChart.destroy();
        }
    }

    // --- Slideshow Functionality ---
    /**
     * Initializes and controls the advertisement slideshow.
     */
    function initializeSlideshow() {
        const slides = document.querySelectorAll('.hero-section');
        const dots = document.querySelectorAll('.dot');
        let currentSlide = 0;
        let slideInterval; // Stores the interval ID for auto-rotation

        // Exit if no slides or navigation dots are found
        if (!slides.length || !dots.length) {
            console.warn('Slideshow: No slides or navigation dots found. Skipping slideshow initialization.');
            return;
        }

        /**
         * Updates the active slide and corresponding navigation dot.
         */
        function updateActiveSlide(newSlide) {
            if (newSlide === undefined) newSlide = currentSlide;

            if (newSlide === currentSlide) return;

            // Animate current slide out
            if (slides[currentSlide]) {
                slides[currentSlide].classList.remove('animate-in');
                slides[currentSlide].classList.add('animate-out');
                // Remove hiding slide after animation to keep it visible for overlap
                slides[currentSlide].addEventListener('animationend', function handler() {
                    slides[currentSlide].classList.remove('animate-out');
                    // slides[currentSlide].style.display = 'none'; // Removed to keep slide visible
                    slides[currentSlide].removeEventListener('animationend', handler);
                });
            }
            // Animate new slide in
            if (slides[newSlide]) {
                slides[newSlide].style.display = 'flex';
                slides[newSlide].classList.remove('animate-out');
                slides[newSlide].classList.add('animate-in');
            }

            dots.forEach(dot => dot.classList.remove('active'));
            if (dots[newSlide]) {
                dots[newSlide].classList.add('active');
            }

            currentSlide = newSlide;
        }

        /**
         * Starts or restarts the auto-rotation of the slideshow.
         */
        function startSlideshow() {
            // Clear any existing interval to prevent multiple intervals running simultaneously
            if (slideInterval) {
                clearInterval(slideInterval);
            }
            // Set a new interval to advance slides every 5 seconds
            slideInterval = setInterval(() => {
                const nextSlide = (currentSlide + 1) % slides.length; // Loop back to the first slide
                updateActiveSlide(nextSlide);
            }, 3000);
        }

        // Initialize by showing the first slide immediately
        updateActiveSlide();
        // Start the auto-rotation
        startSlideshow();

        // Add event listeners to navigation dots for manual control
        dots.forEach((dot, index) => {
            dot.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default link behavior
                // currentSlide = index; // Remove direct assignment here
                updateActiveSlide(index); // Update the display with clicked index
                // Do not restart the slideshow interval on manual click to keep it automatic
                // startSlideshow(); // Reset the auto-rotation timer
            });
        });
    }

    // --- Monthly Sales Chart Functionality (with simulated data as per user's latest immersive) ---
    /**
     * Renders the monthly sales chart using provided data.
     * @param {Array<Object>} salesData - An array of objects, each with 'month' and 'sales' properties.
     */
    function renderMonthlySalesChart(salesData) {
        const monthlySalesChartElement = document.getElementById('monthlySalesChart');
        const monthlySalesMessageElement = document.getElementById('monthlySalesMessage');

        // Ensure chart elements exist before attempting to render
        if (!monthlySalesChartElement) {
            console.error("Monthly Sales Chart: Canvas element not found.");
            return;
        }
        if (!monthlySalesMessageElement) {
             console.warn("Monthly Sales Chart: Message element not found. Proceeding without message handling.");
        }

        // Check if sales data exists and has entries
        if (salesData && salesData.length > 0) {
            // Hide the 'no data' message and show the canvas
            monthlySalesMessageElement.style.display = 'none';
            monthlySalesChartElement.style.display = 'block';

            // Prepare labels (months) and data (sales figures) for the chart
            const labels = salesData.map(item => item.month);
            const data = salesData.map(item => item.total_sales !== undefined ? item.total_sales : item.sales);

            // Destroy any existing chart instance on the canvas before creating a new one
            destroyChartIfExists('monthlySalesChart');

            // Create a new bar chart using Chart.js
            const chart = new Chart(monthlySalesChartElement, {
                type: 'bar', // Type of chart (e.g., 'bar', 'line', 'pie')
                data: {
                    labels: labels, // X-axis labels
                    datasets: [{
                        label: 'Total Sales', // Dataset label
                        data: data, // Actual sales data
                        backgroundColor: 'rgba(75, 192, 192, 0.6)', // Bar color
                        borderColor: 'rgba(75, 192, 192, 1)', // Bar border color
                        borderWidth: 1 // Bar border width
                    }]
                },
                options: {
                    responsive: true, // Chart resizes with its container
                    maintainAspectRatio: false, // Allows height control via CSS
                    scales: {
                        y: {
                            beginAtZero: true, // Y-axis starts from 0
                            title: {
                                display: true, // Display Y-axis title
                                text: 'Sales Amount ($)' // Y-axis title text
                            },
                            ticks: {
                                // Format Y-axis ticks as currency
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        },
                        x: {
                            title: {
                                display: true, // Display X-axis title
                                text: 'Month' // X-axis title text
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            // Customize tooltip display for currency
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    return label + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                                }
                            }
                        },
                        legend: {
                            display: true // Display legend for the dataset
                        }
                    }
                }
            });
        } else {
            // If no data, hide the canvas and show the 'no data' message
            monthlySalesMessageElement.style.display = 'block';
            monthlySalesChartElement.style.display = 'none';
            // Ensure any existing chart is also destroyed
            destroyChartIfExists('monthlySalesChart');
        }
    }

    /**
     * Initializes the monthly sales chart with simulated data.
     */
    function initializeMonthlySalesChartWithSimulatedData() {
        // --- Simulated data (as per the monthly-sales-chart-js immersive) ---
        const salesData = [
            { month: 'January', sales: 12000 },
            { month: 'February', sales: 19000 },
            { month: 'March', sales: 3000 },
            { month: 'April', sales: 5000 },
            { month: 'May', sales: 2000 },
            { month: 'June', sales: 30000 },
            { month: 'July', sales: 22000 },
            { month: 'August', sales: 18000 },
            { month: 'September', sales: 25000 },
            { month: 'October', sales: 17000 },
            { month: 'November', sales: 28000 },
            { month: 'December', sales: 35000 }
        ];

        // Uncomment the line below to test the "No data available" message
        // const salesData = [];

        const chartInstance = renderMonthlySalesChart(salesData);
        addMonthlySalesChartClickHandler(chartInstance);
    }

    // --- KPI Fetching and Display ---
    /**
     * Fetches Key Performance Indicators (KPIs) from an API and updates the DOM.
     */
    function fetchAndDisplayKpis() {
        const totalRevenueEl = document.getElementById('totalRevenue');
        const newCustomersEl = document.getElementById('newCustomers');
        const averageOrderValueEl = document.getElementById('averageOrderValue');

        // Exit if no KPI elements are present
        if (!totalRevenueEl && !newCustomersEl && !averageOrderValueEl) {
            console.warn("KPI elements not found. Skipping KPI fetch.");
            return;
        }

        fetch('/auth/staff/api/kpis')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Update KPI elements with fetched data, defaulting to 0 or 'Error'
                    if (totalRevenueEl) totalRevenueEl.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.total_revenue || 0);
                    if (newCustomersEl) newCustomersEl.textContent = data.new_customers || 0;
                    if (averageOrderValueEl) averageOrderValueEl.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.average_order_value || 0);
                } else {
                    console.error('Failed to fetch KPIs:', data.error || 'No data received');
                    // Display 'Error' if fetching fails
                    if (totalRevenueEl) totalRevenueEl.textContent = 'Error';
                    if (newCustomersEl) newCustomersEl.textContent = 'Error';
                    if (averageOrderValueEl) averageOrderValueEl.textContent = 'Error';
                }
            })
            .catch(error => {
                console.error('Error loading KPIs:', error);
                // Display 'Error' on network or parsing errors
                if (totalRevenueEl) totalRevenueEl.textContent = 'Error';
                if (newCustomersEl) newCustomersEl.textContent = 'Error';
                if (averageOrderValueEl) averageOrderValueEl.textContent = 'Error';
            });
    }

    // --- Inventory Chart Functionality ---
    /**
     * Renders the product name count list with badges.
     * @param {Array} productNameCounts - Array of objects with 'name' and 'count' properties.
     */
    function renderProductNameCountList(productNameCounts) {
        const container = document.getElementById('product-name-count-list');
        if (!container) {
            console.warn("Product Name Count List: Container element not found.");
            return;
        }

        container.innerHTML = ''; // Clear previous content

        const ul = document.createElement('ul');
        ul.className = 'product-name-count-list';

        productNameCounts.forEach(item => {
            const li = document.createElement('li');
            li.className = 'product-name-count-item';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = item.name;
            nameSpan.className = 'product-name';

            const countSpan = document.createElement('span');
            countSpan.textContent = item.count > 50 ? '50+' : item.count;
            countSpan.className = 'product-count-badge';

            li.appendChild(nameSpan);
            li.appendChild(countSpan);
            ul.appendChild(li);
        });

        container.appendChild(ul);
    }

    /**
     * Fetches product name counts from the API and renders the list.
     */
    function fetchAndDisplayProductNameCounts() {
        console.log("Fetching product name counts...");
        fetch('/api/inventory/stats')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Received product name counts data:", data);
                if (!data) {
                    console.error('Failed to fetch product name counts: No data received');
                    return;
                }
                // Transform data to expected format for renderProductNameCountList
                const formattedData = data.map(item => ({
                    name: item.category || 'Unknown',
                    count: item.total_products || 0
                }));
                renderProductNameCountList(formattedData);
            })
            .catch(error => {
                console.error('Error fetching product name counts:', error);
            });
    }

    /**
     * Fetches inventory statistics from an API and renders the chart.
     */
function fetchInventoryStats() {
    if (!document.getElementById('inventoryChart')) {
        return; // Exit if chart element is not present
    }

    fetch('/auth/api/inventory/product_stats')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("API Response:", data);
            if (!data.success || !Array.isArray(data.brands)) {
                console.error('Inventory product stats API did not return expected data:', data);
                renderInventoryChartWithBrands([]); // Render with empty data if format is wrong
                return;
            }
            renderInventoryChartWithBrands(data.brands);
        })
        .catch(error => {
            console.error('Error loading inventory product stats data:', error);
            renderInventoryChartWithBrands([]); // Render with empty data on error
        });
}

/**
 * Renders the inventory pie chart with brand names and low stock product counts.
 * @param {Array} brands - Array of brand objects with 'brand' and 'low_stock_count' properties.
 */
function renderInventoryChartWithBrands(brands) {
    const ctx = document.getElementById('inventoryChart');
    if (!ctx) {
        console.warn("Inventory Chart: Canvas element 'inventoryChart' not found.");
        return;
    }

    // Destroy previous chart instance if any
    destroyChartIfExists('inventoryChart');

    const labels = brands.map(b => b.brand);
    const data = brands.map(b => b.low_stock_count);

    new Chart(ctx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Low Stock Products by Brand',
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)',
                    'rgba(255, 159, 64, 0.5)',
                    'rgba(199, 199, 199, 0.5)',
                    'rgba(83, 102, 255, 0.5)',
                    'rgba(255, 99, 255, 0.5)',
                    'rgba(99, 255, 132, 0.5)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(199, 199, 199, 1)',
                    'rgba(83, 102, 255, 1)',
                    'rgba(255, 99, 255, 1)',
                    'rgba(99, 255, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}

    // --- Notifications Fetching and Display ---
    /**
     * Fetches notifications from an API and displays them in the designated container.
     */
function fetchAndDisplayNotifications() {
        const container = document.getElementById('notifications-container');
        if (!container) {
            console.warn("Notifications container element not found. Skipping notifications fetch.");
            return;
        }
        console.log("Fetching notifications from /api/staff/notifications...");
        fetch('/api/staff/notifications')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Notifications data received:", data);
                if (!data.success) {
                    container.innerHTML = '<p>Error loading notifications.</p>';
                    console.error('Failed to fetch notifications:', data.error || 'No data received');
                    return;
                }
let notifications = data.notifications; // Get all notifications first
const lowStockNotifications = notifications.filter(note => note.type === 'low_stock').slice(0, 10); // Filter for low stock and then limit to 8

if (lowStockNotifications.length === 0) {
    // If no low stock notifications are returned, display a message indicating that.
    container.innerHTML = '<p>No low stock notifications at this time.</p>';
    return;
}

const ul = document.createElement('ul');
ul.style.listStyleType = 'none';
ul.style.padding = '0';

lowStockNotifications.forEach(note => {
    const li = document.createElement('li');
    li.style.marginBottom = '10px';
    let message = note.message;

    // Remove prefixes for cleaner display
    message = message.replace(/^(Out of stock alert:|Low stock alert:|In stock alert:)\s*/i, '');

    if (note.type === 'out_of_stock' || note.type === 'low_stock') {
        // Create clickable link for red notifications
        const link = document.createElement('a');
        link.href = `/auth/staff/inventory?product_id=${note.product_id}`;
        link.textContent = message;
        link.style.color = 'red';
        link.style.textDecoration = 'underline';
        li.appendChild(link);
    } else if (note.type === 'in_stock') {
        li.style.color = 'green';
        li.textContent = message;
    } else {
        li.style.color = 'black'; // Default color
        li.textContent = message;
    }

    ul.appendChild(li);
});

container.innerHTML = ''; // Clear previous content
container.appendChild(ul); // Append the ul to the container
            })
            .catch(error => {
                if (container) {
                    container.innerHTML = '<p>Error loading notifications.</p>';
                }
                console.error('Error fetching notifications:', error);
            });
    }

    // --- Product Name Count List Fetching and Display ---
    /**
     * Renders the product name count list with badges.
     * @param {Array} productNameCounts - Array of objects with 'name' and 'count' properties.
     */
    function renderProductNameCountList(productNameCounts) {
        const container = document.getElementById('product-name-count-list');
        if (!container) {
            console.warn("Product Name Count List: Container element not found.");
            return;
        }

        container.innerHTML = ''; // Clear previous content

        const ul = document.createElement('ul');
        ul.className = 'product-name-count-list';

        productNameCounts.forEach(item => {
            const li = document.createElement('li');
            li.className = 'product-name-count-item';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = item.name;
            nameSpan.className = 'product-name';

            const countSpan = document.createElement('span');
            countSpan.textContent = item.count > 50 ? '50+' : item.count;
            countSpan.className = 'product-count-badge';

            li.appendChild(nameSpan);
            li.appendChild(countSpan);
            ul.appendChild(li);
        });

        container.appendChild(ul);
    }

    /**
     * Fetches product name counts from the API and renders the list.
     */
    function fetchAndDisplayProductNameCounts() {
        fetch('/api/staff/product_name_counts')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    console.error('Failed to fetch product name counts:', data.error || 'No data received');
                    return;
                }
                renderProductNameCountList(data.data);
            })
            .catch(error => {
                console.error('Error fetching product name counts:', error);
            });
    }

    // --- Product Brand Count List Fetching and Display ---
    /**
     * Renders the product brand count list with badges and collapsible product names.
     * @param {Array} productBrandCounts - Array of objects with 'brand' and 'count' properties.
     */
    function renderProductBrandCountList(productBrandCounts) {
        const container = document.getElementById('product-name-count-list');
        if (!container) {
            console.warn("Product Brand Count List: Container element not found.");
            return;
        }

        container.innerHTML = ''; // Clear previous content

        productBrandCounts.forEach(item => {
            // Create panel container
            const panel = document.createElement('div');
            panel.className = 'brand-panel';

            // Create header div
            const header = document.createElement('div');
            header.className = 'brand-panel-header';

            // Create brand name span
            const brandName = document.createElement('span');
            brandName.className = 'brand-name';
            brandName.textContent = item.name;

            // Create product count span
            const productCount = document.createElement('span');
            productCount.className = 'product-count';
            productCount.textContent = `${item.count > 50 ? '50+' : item.count} Products`;

            // Create toggle icon
            const toggleIcon = document.createElement('span');
            toggleIcon.className = 'toggle-icon';
            toggleIcon.textContent = '▼';

            // Append brand name, count, and toggle to header
            header.appendChild(brandName);
            header.appendChild(productCount);
            header.appendChild(toggleIcon);

            // Create content div (initially hidden)
            const content = document.createElement('div');
            content.className = 'brand-panel-content';
            content.style.display = 'none';

            // Add click event to toggle content visibility
            header.addEventListener('click', () => {
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    toggleIcon.textContent = '▲';
                    // Fetch and display products under this brand
                    fetchProductsByBrand(item.name, content);
                } else {
                    content.style.display = 'none';
                    toggleIcon.textContent = '▼';
                    content.innerHTML = ''; // Clear content when collapsed
                }
            });

            // Append header and content to panel
            panel.appendChild(header);
            panel.appendChild(content);

            // Append panel to container
            container.appendChild(panel);
        });
    }

    /**
     * Fetches product brand counts from the API and renders the list.
     */
    function fetchAndDisplayProductBrandCounts() {
        fetch('/api/staff/product_names_with_brand_counts')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    console.error('Failed to fetch product brand counts:', data.error || 'No data received');
                    return;
                }
                renderProductBrandCountList(data.data);
            })
            .catch(error => {
                console.error('Error fetching product brand counts:', error);
            });
    }

    /**
     * Filters the product name count list based on the filter input.
     */
    function filterProductNameCountList() {
        const filterInput = document.getElementById('inventory-filter');
        const filterValue = filterInput.value.toLowerCase();
        const listItems = document.querySelectorAll('.product-name-count-item');

        listItems.forEach(item => {
            const nameSpan = item.querySelector('.product-name');
            if (nameSpan) {
                const nameText = nameSpan.textContent.toLowerCase();
                if (nameText.includes(filterValue)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            }
        });
    }

    // --- Initialize all dashboard functionalities when the DOM is fully loaded ---
    document.addEventListener('DOMContentLoaded', function() {
        initializeSlideshow();
        initializeMonthlySalesChartWithSimulatedData(); // Uses simulated data from the provided immersive
        fetchAndDisplayKpis();
        fetchInventoryStats();
        fetchAndDisplayNotifications();
        fetchOrdersStatusSummary();
        fetchAndDisplayProductNameCounts();

        // Add event listener for filter input
        const filterInput = document.getElementById('inventory-filter');
        if (filterInput) {
            filterInput.addEventListener('input', filterProductNameCountList);
        }

        initializeCalendar();
    });

    // --- Orders Chart Functionality ---
    /**
     * Renders the orders bar chart based on status summary data.
     * @param {Object} summaryData - An object mapping order statuses to their counts.
     */
    function renderOrdersChart(summaryData) {
        const ctx = document.getElementById('ordersChart');
        if (!ctx) {
            console.warn("Orders Chart: Canvas element 'ordersChart' not found.");
            return;
        }

        // Destroy previous chart instance if any
        destroyChartIfExists('ordersChart');

        const statuses = Object.keys(summaryData);
        const counts = Object.values(summaryData);

        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: statuses,
                datasets: [{
                    label: 'Orders by Status',
                    data: counts,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1 // Ensure integer steps for counts
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // No legend needed for single dataset bar chart
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Count: ${context.raw}`;
                            }
                        }
                    }
                },
                onClick: function(evt, elements) {
                    if (elements.length > 0) {
                        const chart = this;
                        const index = elements[0].index;
                        const status = chart.data.labels[index].toLowerCase();

                        // Show modal and fetch filtered orders for the clicked status
                        const modal = document.getElementById('filteredOrdersModal');
                        const modalContent = document.getElementById('filteredOrdersContent');
                        modal.style.display = 'block';
                        modalContent.innerHTML = '<p>Loading orders...</p>';

                        fetch(`/api/staff/orders?status=${status}`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                }
                                return response.json();
                            })
                            .then(data => {
                                if (!data.success || !Array.isArray(data.orders)) {
                                    modalContent.innerHTML = '<p>Error loading orders.</p>';
                                    return;
                                }
                                if (data.orders.length === 0) {
                                    modalContent.innerHTML = '<p>No orders found for this status.</p>';
                                    return;
                                }

                                // Build orders table with sequential numbering
                                let tableHtml = '<table style="width:100%; border-collapse: collapse;">';
                                tableHtml += '<thead><tr><th>#</th><th>Order ID</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>';
                                data.orders.forEach((order, index) => {
                                    tableHtml += `<tr style="border-bottom: 1px solid #ddd;">
                                        <td>${index + 1}</td>
                                        <td>${order.id}</td>
                                        <td>${order.customer_name}</td>
                                        <td>${order.date}</td>
                                        <td>${order.status}</td>
                                        <td>${order.total}</td>
                                    </tr>`;
                                });
                                tableHtml += '</tbody></table>';
                                modalContent.innerHTML = tableHtml;
                            });
                    }
                }
            }
        });
    }

    // --- Monthly Sales Chart Click Handler ---
    /**
     * Adds click event listener to the monthly sales chart to show sales details modal.
     * @param {Chart} chartInstance - The Chart.js instance of the monthly sales chart.
     */
    function addMonthlySalesChartClickHandler(chartInstance) {
        const modal = document.getElementById('salesDetailsModal');
        const modalContent = document.getElementById('salesDetailsContent');
        const modalTitle = document.getElementById('salesDetailsTitle');
        if (!modal || !modalContent || !modalTitle) {
            console.warn('Sales Details modal elements not found.');
            return;
        }

        chartInstance.options.onClick = function(evt, elements) {
            if (elements.length > 0) {
                const index = elements[0].index;
                const month = chartInstance.data.labels[index];

                // Show modal and fetch sales details for the clicked month
                modal.style.display = 'block';
                modalTitle.textContent = `Sales Details for ${month}`;
                modalContent.innerHTML = '<p>Loading sales details...</p>';

                fetch(`/api/staff/api/reports/monthly_sales_detail?month=${month}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (!data.success || !Array.isArray(data.sales_detail)) {
                            modalContent.innerHTML = '<p>Error loading sales details.</p>';
                            return;
                        }
                        if (data.sales_detail.length === 0) {
                            modalContent.innerHTML = '<p>No sales details found for this month.</p>';
                            return;
                        }

                        // Build sales details table with sequential numbering
                        let tableHtml = '<table style="width:100%; border-collapse: collapse;">';
                        tableHtml += '<thead><tr><th>#</th><th>Order ID</th><th>Order Date</th><th>Customer Name</th><th>Total Amount</th></tr></thead><tbody>';
                        data.sales_detail.forEach((sale, index) => {
                            tableHtml += `<tr style="border-bottom: 1px solid #ddd;">
                                <td>${index + 1}</td>
                                <td>${sale.order_id}</td>
                                <td>${sale.order_date}</td>
                                <td>${sale.customer_name}</td>
                                <td>${sale.total_amount}</td>
                            </tr>`;
                        });
                        tableHtml += '</tbody></table>';
                        modalContent.innerHTML = tableHtml;
                    })
                    .catch(error => {
                        modalContent.innerHTML = '<p>Error loading sales details.</p>';
                        console.error('Error fetching sales details:', error);
                    });
            }
        };
    }

    // Modify initializeMonthlySalesChartWithSimulatedData to add click handler

    /**
     * Fetches order status summary from an API and renders the chart.
     */
    function fetchOrdersStatusSummary() {
        if (!document.getElementById('ordersChart')) {
            return; // Exit if chart element is not present
        }

        // Using the test endpoint as per your original code
        fetch('/api/staff/orders/status_summary')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.success || !data.summary) {
                    console.error('Orders status summary API error or missing data:', data);
                    renderOrdersChart({}); // Render empty chart on error
                    return;
                }
                // Transform array of summary objects to object mapping
                const summaryObj = {};
                data.summary.forEach(item => {
                    const status = item.status.toLowerCase();
                    if (status !== 'delivered' && status !== 'shipped') {
                        summaryObj[status] = item.count;
                    }
                });
                // Remove 'processing' status from the summary object if present
                if (summaryObj.hasOwnProperty('processing')) {
                    delete summaryObj['processing'];
                }
                renderOrdersChart(summaryObj);
            })
            .catch(error => {
                console.error('Error loading orders status summary data:', error);
                renderOrdersChart({}); // Render empty chart on error
            });
    }

    // --- Calendar Functionality ---
    /**
     * Initializes and renders the calendar.
     */
    function initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) {
            console.warn("Calendar element not found. Skipping calendar initialization.");
            return;
        }

        let currentMonth = new Date().getMonth();
        let currentYear = new Date().getFullYear();

        /**
         * Renders the calendar for the specified month and year.
         * @param {number} month - The month (0-11).
         * @param {number} year - The full year.
         */
        function renderCalendar(month, year) {
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const numDays = lastDay.getDate();
            const startDay = firstDay.getDay(); // 0 for Sunday, 1 for Monday, etc.

            let calendarHtml = `
                <div class="header">
                    <button id="prevMonth"><</button>
                    <span>${monthNames[month]} ${year}</span>
                    <button id="nextMonth">></button>
                </div>
                <div class="days-of-week">
                    ${dayNames.map(day => `<div>${day}</div>`).join('')}
                </div>
                <div class="dates">
            `;

            // Add empty divs for days before the 1st of the month
            for (let i = 0; i < startDay; i++) {
                calendarHtml += '<div class="empty"></div>';
            }

            // Add days of the month, highlighting today's date
            for (let day = 1; day <= numDays; day++) {
                const today = new Date();
                const isToday = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) ? 'today' : '';
                calendarHtml += `<div class="${isToday}">${day}</div>`;
            }

            calendarHtml += `</div>`;
            calendarEl.innerHTML = calendarHtml;
        } // End of renderCalendar function

        // Initial render of the calendar
        renderCalendar(currentMonth, currentYear);

        // Attach event listeners ONCE after the initial render
        const prevMonthBtn = document.getElementById('prevMonth');
        const nextMonthBtn = document.getElementById('nextMonth');

        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
                renderCalendar(currentMonth, currentYear);
            });
        }

        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                renderCalendar(currentMonth, currentYear);
            });
        }
    } // End of initializeCalendar function

    // --- Initialize all dashboard functionalities when the DOM is fully loaded ---
    initializeSlideshow();
    initializeMonthlySalesChartWithSimulatedData(); // Uses simulated data from the provided immersive
    fetchAndDisplayKpis();
    fetchInventoryStats();
    fetchAndDisplayNotifications();
    fetchOrdersStatusSummary();
    fetchAndDisplayProductNameCounts();
    initializeCalendar();
});

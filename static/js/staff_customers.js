
// Customer management with pagination
document.addEventListener('DOMContentLoaded', function() {
    const customersTableBody = document.querySelector('#customersTable tbody');
    const paginationContainer = document.querySelector('#pagination');
    const searchInput = document.querySelector('#customerSearchInput');
    console.log('Search input element found:', searchInput);
    if (!searchInput) {
        console.error('Search input element not found!');
    }
    const addCustomerBtn = document.querySelector('#addCustomerBtn');

    let currentPage = 1;
    const pageSize = 10;
    let searchQuery = '';

    // Global modal instance to prevent backdrop issues
    let customerModalInstance = null;
    
    // Checkbox and export functionality
function initializeCheckboxes() {
    const selectAllCheckbox = document.getElementById('selectAllCustomers');
    const customerCheckboxes = document.querySelectorAll('.customer-checkbox:not(#selectAllCustomers)');
    const exportSelectedBtn = document.getElementById('exportSelectedBtn');
    
    // Select all functionality
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            customerCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            updateExportButtonState();
        });
    }
    
    // Individual checkbox functionality
    customerCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateExportButtonState();
            updateSelectAllState();
        });
    });
    
    // Export selected functionality
    if (exportSelectedBtn) {
        exportSelectedBtn.addEventListener('click', exportSelectedCustomers);
    }
    
    // Export all functionality
    const exportAllBtn = document.getElementById('exportAllBtn');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', exportAllCustomers);
    }
}

function updateExportButtonState() {
    const exportSelectedBtn = document.getElementById('exportSelectedBtn');
    const checkedCheckboxes = document.querySelectorAll('.customer-checkbox:not(#selectAllCustomers):checked');
    
    if (exportSelectedBtn) {
        exportSelectedBtn.disabled = checkedCheckboxes.length === 0;
    }
}

function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('selectAllCustomers');
    const customerCheckboxes = document.querySelectorAll('.customer-checkbox:not(#selectAllCustomers)');
    const checkedCount = document.querySelectorAll('.customer-checkbox:not(#selectAllCustomers):checked').length;
    
    if (selectAllCheckbox) {
        if (checkedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === customerCheckboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
}

function exportSelectedCustomers() {
    const checkedCheckboxes = document.querySelectorAll('.customer-checkbox:not(#selectAllCustomers):checked');
    const selectedIds = Array.from(checkedCheckboxes).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        showMessage('Please select customers to export', 'warning');
        return;
    }
    
    showMessage(`Preparing export for ${selectedIds.length} selected customers...`, 'info');
    exportCustomersToCSV(selectedIds);
}

function exportAllCustomers() {
    const totalCustomers = document.querySelectorAll('.customer-checkbox:not(#selectAllCustomers)').length;
    
    if (totalCustomers === 0) {
        showMessage('No customers to export', 'warning');
        return;
    }
    
    showMessage(`Preparing export for all ${totalCustomers} customers...`, 'info');
    exportCustomersToCSV('all');
}

// Function to export customers to CSV
async function exportCustomersToCSV(customerIds) {
    try {
        // Show loading message
        showMessage('Generating CSV file...', 'info');
        
        // Prepare the request
        const requestData = {
            customer_ids: customerIds === 'all' ? 'all' : customerIds
        };
        
        // Make API call to get customer data
        const response = await fetch('/staff/customers/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get the CSV data
        const csvData = await response.text();
        
        // Create and download the CSV file
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showMessage('CSV file downloaded successfully!', 'success');
        } else {
            // Fallback for older browsers
            showMessage('CSV data ready. Copy and paste into a text file.', 'info');
            console.log('CSV Data:', csvData);
        }
        
    } catch (error) {
        console.error('Export error:', error);
        showMessage('Error exporting customers: ' + error.message, 'error');
    }
}

// Initialize modal with proper event handling
function initializeCustomerModal() {
        const modalElement = document.getElementById('customerModal');
        if (modalElement && !customerModalInstance) {
            customerModalInstance = new bootstrap.Modal(modalElement);
            
            // Add event listeners for proper cleanup
            modalElement.addEventListener('hidden.bs.modal', function() {
                // Clean up any lingering backdrop
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
                
                // Reset body classes
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            });
        }
    }

    // Initialize item counter
    let customersItemCounter = null;
    if (window.ItemCounter) {
        customersItemCounter = new ItemCounter('customers-container', {
            itemName: 'customers',
            itemNameSingular: 'customer',
            position: 'bottom',
            className: 'item-counter theme-info'
        });
    }
    
    // Initialize the customer modal
    initializeCustomerModal();
    
    // Initialize checkboxes and export functionality
    initializeCheckboxes();
    
    // Manual cleanup function for modal issues
    function cleanupModalBackdrop() {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
    
    // Make cleanup function globally accessible
    window.cleanupModalBackdrop = cleanupModalBackdrop;

    // Fetch customers with pagination
    function fetchCustomers(page = 1, search = '') {
        const params = new URLSearchParams({
            page: page,
            per_page: pageSize,
            search: search
        });

        console.log('Fetching customers with params:', {
            page: page,
            per_page: pageSize,
            search: search,
            searchHasSpaces: search.includes(' ')
        });

        fetch(`/staff/customers/api?${params}`)
            .then(response => response.json())
            .then(data => {
                console.log('Received customer data:', data);
                renderCustomersTable(data.customers);
                renderPagination(data.total, page);
                updateCustomersItemCounter(data.total, page);
                updateTotalCustomerCount(data.total);
                currentPage = page;
                searchQuery = search;
            })
            .catch(error => {
                console.error('Error fetching customers:', error);
                customersTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading customers</td></tr>';
                updateCustomersItemCounter(0, 1);
            });
    }

    // Update customers item counter
    function updateTotalCustomerCount(totalCustomers) {
    const totalCountElement = document.getElementById('totalCustomerCount');
    if (totalCountElement) {
        totalCountElement.textContent = totalCustomers;
    }
}

    function updateCustomersItemCounter(totalCustomers, currentPageNum) {
        if (!customersItemCounter) return;

        const totalPages = Math.ceil(totalCustomers / pageSize);
        const startItem = totalCustomers === 0 ? 0 : ((currentPageNum - 1) * pageSize) + 1;
        const endItem = Math.min(currentPageNum * pageSize, totalCustomers);

        customersItemCounter.update({
            totalItems: totalCustomers,
            currentPage: currentPageNum,
            pageSize: pageSize,
            totalPages: totalPages,
            startItem: startItem,
            endItem: endItem
        });
    }

    // Render customers table and mobile cards
    function renderCustomersTable(customers) {
        const mobileCustomersList = document.getElementById('mobile-customers-list');
        const isMobile = window.innerWidth < 768;

        // Store current data for responsive re-rendering
        window.currentCustomersData = customers;

        if (customers.length === 0) {
            customersTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No customers found.</td></tr>';
            if (mobileCustomersList) mobileCustomersList.innerHTML = '<p class="text-center">No customers found.</p>';
            return;
        }

        // Render desktop table
        customersTableBody.innerHTML = customers.map(customer => `
            <tr>
                <td>
                    <input type="checkbox" class="customer-checkbox" value="${customer.id}">
                </td>
                <td>${customer.id}</td>
                <td>${customer.first_name} ${customer.last_name}</td>
                <td>${customer.email}</td>
                <td>${customer.phone || ''}</td>
                <td>
                    <div class="action-buttons">
                        <button type="button" class="btn btn-sm btn-info view-orders-btn" data-customer-id="${customer.id}">Orders</button>
                        <button type="button" class="btn btn-sm btn-primary edit-customer-btn" data-customer-id="${customer.id}">Edit</button>
                        <button type="button" class="btn btn-sm btn-danger delete-customer-btn" data-customer-id="${customer.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Render mobile cards
        if (mobileCustomersList) {
            mobileCustomersList.innerHTML = customers.map(customer => `
                <div class="mobile-card">
                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <input type="checkbox" class="customer-checkbox" value="${customer.id}">
                            <span><strong>ID:</strong> ${customer.id}</span>
                        </div>
                        <p><strong>Name:</strong> ${customer.first_name} ${customer.last_name}</p>
                        <p><strong>Email:</strong> ${customer.email}</p>
                        <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
                    </div>
                    <div class="action-buttons">
                        <button type="button" class="btn btn-sm btn-info view-orders-btn" data-customer-id="${customer.id}">Orders</button>
                        <button type="button" class="btn btn-sm btn-primary edit-customer-btn" data-customer-id="${customer.id}">Edit</button>
                        <button type="button" class="btn btn-sm btn-danger delete-customer-btn" data-customer-id="${customer.id}">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        // Re-attach event listeners
        attachEventListeners();
        
        // Re-initialize checkboxes after table is rendered
        initializeCheckboxes();
    }

    // Render pagination with responsive design (matching inventory page style)
    function renderPagination(totalCustomers, currentPage) {
        const totalPages = Math.ceil(totalCustomers / pageSize);
        paginationContainer.innerHTML = '';

        if (totalPages <= 1) return;

        const isMobile = window.innerWidth < 768;
        const maxButtons = isMobile ? 3 : 5;

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
        prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">«</a>`;
        prevLi.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage > 1) fetchCustomers(currentPage - 1, searchQuery);
        });
        paginationContainer.appendChild(prevLi);

        // Calculate page range
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        if (endPage === totalPages) {
            startPage = Math.max(1, totalPages - maxButtons + 1);
        }

        // Page number buttons
        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = 'page-item' + (i === currentPage ? ' active' : '');
            li.innerHTML = `<a class="page-link" href="#" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">${i}</a>`;
            li.addEventListener('click', e => {
                e.preventDefault();
                fetchCustomers(i, searchQuery);
            });
            paginationContainer.appendChild(li);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
        nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next" style="padding: ${isMobile ? '6px 10px' : '8px 12px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">»</a>`;
        nextLi.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage < totalPages) fetchCustomers(currentPage + 1, searchQuery);
        });
        paginationContainer.appendChild(nextLi);

        // Load More button for mobile when there are more pages
        if (isMobile && totalPages > endPage) {
            const loadMoreLi = document.createElement('li');
            loadMoreLi.className = 'page-item';
            loadMoreLi.innerHTML = `<a class="page-link" href="#" style="padding: 6px 10px; font-size: 0.9rem;">Load More</a>`;
            loadMoreLi.addEventListener('click', e => {
                e.preventDefault();
                fetchCustomers(currentPage + 1, searchQuery);
            });
            paginationContainer.appendChild(loadMoreLi);
        }
    }

    // Attach event listeners to action buttons
    function attachEventListeners() {
        document.querySelectorAll('.view-orders-btn').forEach(button => {
            button.addEventListener('click', function() {
                const customerId = this.dataset.customerId;
                showCustomerOrders(customerId);
            });
        });

        document.querySelectorAll('.edit-customer-btn').forEach(button => {
            button.addEventListener('click', function() {
                const customerId = this.dataset.customerId;
                editCustomer(customerId);
            });
        });

        document.querySelectorAll('.delete-customer-btn').forEach(button => {
            button.addEventListener('click', function() {
                const customerId = this.dataset.customerId;
                deleteCustomer(customerId);
            });
        });
    }

    // Search functionality
    let searchTimeout;
    if (searchInput) {
        console.log('Attaching search input event listener to:', searchInput);
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                // Don't trim the search value to allow spaces in names like "John Doe"
                const searchValue = this.value;
                console.log('Search input event triggered:', {
                    value: searchValue,
                    length: searchValue.length,
                    hasSpaces: searchValue.includes(' ')
                });
                fetchCustomers(1, searchValue);
            }, 300);
        });
        console.log('Search input event listener attached successfully');
        
        // Also add a keyup event listener as a backup
        searchInput.addEventListener('keyup', function() {
            console.log('Keyup event on search input:', this.value);
        });
    } else {
        console.error('Cannot attach search input event listener - searchInput is null');
    }

    // Responsive handling
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Re-render current data to adjust for screen size changes
            if (window.currentCustomersData) {
                renderCustomersTable(window.currentCustomersData);
            }
        }, 100);
    });

    // Add Customer button functionality
    if (addCustomerBtn) {
        addCustomerBtn.addEventListener('click', function() {
            // Clear the form
            document.getElementById('customerId').value = '';
            document.getElementById('firstName').value = '';
            document.getElementById('lastName').value = '';
            document.getElementById('email').value = '';
            document.getElementById('phone').value = '';
            document.getElementById('address').value = '';
            document.getElementById('password').value = '';
            document.getElementById('modalTitle').textContent = 'Add New Customer';

            // Show password field for new customer
            const passwordField = document.getElementById('password');
            const passwordHelp = document.getElementById('passwordHelp');
            const passwordContainer = document.getElementById('passwordContainer');
            passwordContainer.style.display = 'block';
            passwordField.placeholder = 'Enter password for new customer';
            passwordField.required = true;
            passwordHelp.textContent = 'Required for new customers';

            // Get or create modal instance
            if (!customerModalInstance) {
                customerModalInstance = new bootstrap.Modal(document.getElementById('customerModal'));
            }
            customerModalInstance.show();
        });
    }

    // View Deleted Customers button functionality
    const viewDeletedCustomersBtn = document.getElementById('viewDeletedCustomersBtn');
    if (viewDeletedCustomersBtn) {
        viewDeletedCustomersBtn.addEventListener('click', function() {
            viewDeletedCustomers();
        });
    }

    // Save Customer form handling
    const saveCustomerBtn = document.getElementById('saveCustomerBtn');
    if (saveCustomerBtn) {
        saveCustomerBtn.addEventListener('click', async function() {
            const customerId = document.getElementById('customerId').value;
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const address = document.getElementById('address').value.trim();
            const password = document.getElementById('password').value;

            // Basic validation
            if (!firstName || !lastName || !email) {
                showMessage('Please fill in all required fields (First Name, Last Name, Email)', 'error');
                return;
            }

            if (!customerId && !password) {
                showMessage('Password is required for new customers', 'error');
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showMessage('Please enter a valid email address', 'error');
                return;
            }

            const payload = {
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone: phone,
                address: address
            };

            // Only include password for new customers
            if (!customerId) {
                payload.password = password;
            }

            let url = '/staff/customers';
            let method = 'POST';

            if (customerId) {
                url = `/staff/customers/${customerId}`;
                method = 'PUT';
            }

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (data.success) {
                    showMessage(customerId ? 'Customer updated successfully!' : 'Customer added successfully!', 'success');

                    // Close the modal
                    if (customerModalInstance) {
                        customerModalInstance.hide();
                    }

                    // Refresh the customer list
                    fetchCustomers(currentPage, searchQuery);
                } else {
                    showMessage('Error saving customer: ' + (data.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showMessage('Error saving customer', 'error');
            }
        });
    }

    // Responsive handling
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.currentCustomersData) {
                renderCustomersTable(window.currentCustomersData);
            }
        }, 100);
    });

    // Initialize page
    fetchCustomers(1);

    // Customer operations functions
    async function showCustomerOrders(customerId) {
        // Create a temporary loading modal
        const loadingOverlay = document.createElement('div');
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(2px);
        `;

        loadingOverlay.innerHTML = `
            <div style="
                background: white;
                border-radius: 12px;
                padding: 32px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 3px solid #e5e7eb;
                    border-top: 3px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                "></div>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Loading customer orders...</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;

        document.body.appendChild(loadingOverlay);

        try {
            // Fetch customer details and orders
            const [customerResponse, ordersResponse] = await Promise.all([
                fetch(`/staff/customers/${customerId}`),
                fetch(`/staff/customers/${customerId}/orders`)
            ]);

            const customerData = await customerResponse.json();
            const ordersData = await ordersResponse.json();

            // Remove loading overlay
            document.body.removeChild(loadingOverlay);

            if (!customerData.success || !ordersData.success) {
                showMessage('Error loading customer orders: ' + (customerData.error || ordersData.error), 'error');
                return;
            }

            const customer = customerData.customer;
            const orders = ordersData.orders || [];

            // Create and show orders modal
            showCustomerOrdersModal(customer, orders);

        } catch (error) {
            // Remove loading overlay on error
            if (document.body.contains(loadingOverlay)) {
                document.body.removeChild(loadingOverlay);
            }
            console.error('Error:', error);
            showMessage('Error loading customer orders', 'error');
        }
    }

    async function editCustomer(customerId) {
        try {
            const response = await fetch(`/staff/customers/${customerId}`);
            const data = await response.json();

            if (data.success) {
                const customer = data.customer;

                // Populate the modal form
                document.getElementById('customerId').value = customer.id;
                document.getElementById('firstName').value = customer.first_name || '';
                document.getElementById('lastName').value = customer.last_name || '';
                document.getElementById('email').value = customer.email || '';
                document.getElementById('phone').value = customer.phone || '';
                document.getElementById('address').value = customer.address || '';
                document.getElementById('password').value = ''; // Clear password field for editing
                document.getElementById('modalTitle').textContent = 'Edit Customer';

                // Hide password field when editing (not needed)
                const passwordField = document.getElementById('password');
                const passwordHelp = document.getElementById('passwordHelp');
                const passwordContainer = document.getElementById('passwordContainer');
                passwordContainer.style.display = 'none';

                // Get or create modal instance
                if (!customerModalInstance) {
                    customerModalInstance = new bootstrap.Modal(document.getElementById('customerModal'));
                }
                customerModalInstance.show();
            } else {
                showMessage('Error loading customer: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error loading customer details', 'error');
        }
    }

    async function deleteCustomer(customerId) {
        const confirmed = await showDeleteConfirmation('Soft Delete Customer', 'Are you sure you want to delete this customer? This will hide the customer from the main list but preserve all their orders and financial data. The customer can be restored later if needed.');
        if (confirmed) {
            try {
                const response = await fetch(`/staff/customers/${customerId}`, {
                    method: 'DELETE',
                });
                const data = await response.json();

                if (data.success) {
                    showMessage('Customer soft deleted successfully. All orders and financial data have been preserved.', 'success');
                    // Refresh the customer list
                    fetchCustomers(currentPage, searchQuery);
                } else {
                    showMessage('Error deleting customer: ' + (data.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showMessage('Error deleting customer', 'error');
            }
        }
    }

    // Show customer orders in a modal popup
    function showCustomerOrdersModal(customer, orders) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'customer-orders-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(2px);
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'customer-orders-modal';
        modal.setAttribute('data-customer-id', customer.id);
        const isMobile = window.innerWidth < 768;
        modal.style.cssText = `
            background: white;
            border-radius: ${isMobile ? '12px 12px 0 0' : '12px'};
            padding: 0;
            max-width: ${isMobile ? '100%' : '900px'};
            width: ${isMobile ? '100%' : '95%'};
            max-height: ${isMobile ? '100vh' : '90vh'};
            ${isMobile ? 'height: 100vh; position: fixed; bottom: 0; left: 0; right: 0;' : ''}
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            transform: ${isMobile ? 'translateY(100%)' : 'scale(0.9)'};
            transition: transform 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // Create modal header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 24px 24px 16px 24px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            background: white;
            border-radius: 12px 12px 0 0;
            z-index: 1;
        `;

        header.innerHTML = `
            <div>
                <h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">
                    Orders for ${customer.first_name} ${customer.last_name}
                </h3>
                <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
                    ${customer.email} ${customer.phone ? '• ' + customer.phone : ''}
                </p>
            </div>
            <button class="close-btn" style="
                background: none;
                border: none;
                font-size: 24px;
                color: #6b7280;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
            ">&times;</button>
        `;

        // Create modal body
        const body = document.createElement('div');
        body.style.cssText = `
            padding: 16px 24px 24px 24px;
        `;

        if (orders.length === 0) {
            body.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #6b7280;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                    <h4 style="margin: 0 0 8px 0; color: #374151;">No Orders Found</h4>
                    <p style="margin: 0;">This customer hasn't placed any orders yet.</p>
                </div>
            `;
        } else {
            // Create orders list
            const ordersHtml = orders.map(order => {
                const orderDate = new Date(order.order_date).toLocaleDateString();
                const statusColor = getOrderStatusColor(order.status);

                const isMobileView = window.innerWidth < 768;
                return `
                    <div style="
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: ${isMobileView ? '12px' : '16px'};
                        margin-bottom: 12px;
                        background: #f9fafb;
                    ">
                        <div style="display: ${isMobileView ? 'block' : 'flex'}; justify-content: space-between; align-items: ${isMobileView ? 'flex-start' : 'center'}; margin-bottom: 12px;">
                            <div style="margin-bottom: ${isMobileView ? '8px' : '0'};">
                                <h4 style="margin: 0; font-size: 16px; color: #111827;">
                                    Order #${order.id}
                                </h4>
                                <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
                                    ${orderDate}
                                </p>
                            </div>
                            <div style="text-align: ${isMobileView ? 'left' : 'right'};">
                                <span style="
                                    background: ${statusColor};
                                    color: white;
                                    padding: 4px 12px;
                                    border-radius: 16px;
                                    font-size: 12px;
                                    font-weight: 500;
                                    display: inline-block;
                                    margin-bottom: 4px;
                                ">${order.status}</span>
                                <p style="margin: 4px 0 0 0; font-weight: 600; color: #111827; font-size: 16px;">
                                    $${parseFloat(order.total_amount || 0).toFixed(2)}
                                </p>
                            </div>
                        </div>
                        ${order.items && order.items.length > 0 ? `
                            <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
                                <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">Items (${order.items.length}):</h5>
                                <div style="margin: 0; color: #6b7280; font-size: 14px;">
                                    ${order.items.map(item => `
                                        <div style="
                                            display: flex;
                                            justify-content: space-between;
                                            align-items: center;
                                            padding: 6px 0;
                                            border-bottom: 1px solid #f3f4f6;
                                        ">
                                            <span style="flex: 1;">${item.product_name || 'Unknown Product'}</span>
                                            <span style="margin: 0 8px; color: #9ca3af;">×${item.quantity || 1}</span>
                                            <span style="font-weight: 500; color: #111827;">$${parseFloat(item.price || 0).toFixed(2)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : `
                            <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center; color: #9ca3af; font-style: italic;">
                                No items found for this order
                            </div>
                        `}
                        ${order.approval_status && order.approval_status === 'Pending Approval' && order.status.toLowerCase() !== 'cancelled' ? `
                            <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
                                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                    <button onclick="approveOrder(${order.id})" class="btn btn-success btn-sm" style="font-size: 12px;">
                                        <i class="fas fa-check"></i> Confirm
                                    </button>
                                    <button onclick="rejectOrder(${order.id})" class="btn btn-danger btn-sm" style="font-size: 12px;">
                                        <i class="fas fa-times"></i> Reject
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            body.innerHTML = `
                <div style="margin-bottom: 16px;">
                    <h4 style="margin: 0; font-size: 16px; color: #374151;">
                        ${orders.length} Order${orders.length !== 1 ? 's' : ''} Found
                    </h4>
                </div>
                ${ordersHtml}
            `;
        }

        // Assemble modal
        modal.appendChild(header);
        modal.appendChild(body);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            modal.style.transform = isMobile ? 'translateY(0)' : 'scale(1)';
        });

        // Add close functionality
        const closeBtn = header.querySelector('.close-btn');
        const cleanup = () => {
            modal.style.transform = isMobile ? 'translateY(100%)' : 'scale(0.9)';
            overlay.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        };

        closeBtn.addEventListener('click', cleanup);
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.backgroundColor = '#f3f4f6';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.backgroundColor = 'transparent';
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
            }
        });

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    // Helper function to get order status colors
    function getOrderStatusColor(status) {
        const colors = {
    
            'completed': '#10b981',
            'cancelled': '#ef4444',
            'shipped': '#8b5cf6',
            'delivered': '#059669'
        };
        return colors[status?.toLowerCase()] || '#6b7280';
    }

    // Professional delete confirmation modal
    function showDeleteConfirmation(title, message) {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'delete-confirmation-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(2px);
            `;

            // Create modal content
            const modal = document.createElement('div');
            modal.className = 'delete-confirmation-modal';
            modal.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 0;
                max-width: 420px;
                width: 90%;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                transform: scale(0.9);
                transition: transform 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

            modal.innerHTML = `
                <div style="padding: 24px 24px 16px 24px; text-align: center;">
                    <div style="width: 64px; height: 64px; background: #fee2e2; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                        <svg width="32" height="32" fill="#dc2626" viewBox="0 0 24 24">
                            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                        </svg>
                    </div>
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #111827;">${title}</h3>
                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">${message}</p>
                </div>
                <div style="padding: 16px 24px 24px 24px; display: flex; gap: 12px; justify-content: center;">
                    <button class="cancel-btn" style="
                        background: #f3f4f6;
                        color: #374151;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        font-weight: 500;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                        min-width: 80px;
                    ">Cancel</button>
                    <button class="delete-btn" style="
                        background: #dc2626;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        font-weight: 500;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                        min-width: 80px;
                    ">Delete</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Animate in
            requestAnimationFrame(() => {
                modal.style.transform = 'scale(1)';
            });

            // Add hover effects
            const cancelBtn = modal.querySelector('.cancel-btn');
            const deleteBtn = modal.querySelector('.delete-btn');

            cancelBtn.addEventListener('mouseenter', () => {
                cancelBtn.style.backgroundColor = '#e5e7eb';
            });
            cancelBtn.addEventListener('mouseleave', () => {
                cancelBtn.style.backgroundColor = '#f3f4f6';
            });

            deleteBtn.addEventListener('mouseenter', () => {
                deleteBtn.style.backgroundColor = '#b91c1c';
            });
            deleteBtn.addEventListener('mouseleave', () => {
                deleteBtn.style.backgroundColor = '#dc2626';
            });

            // Handle button clicks
            const cleanup = () => {
                modal.style.transform = 'scale(0.9)';
                overlay.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(overlay);
                }, 200);
            };

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            deleteBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            });

            // Close on Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    // Function to approve an order
    async function approveOrder(orderId) {
        try {
            const response = await fetch(`/api/orders/${orderId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            if (result.success) {
                showMessage('Order approved successfully!', 'success');
                // Refresh the customer orders modal
                const customerId = document.querySelector('.customer-orders-modal').getAttribute('data-customer-id');
                if (customerId) {
                    showCustomerOrders(parseInt(customerId));
                }
            } else {
                showMessage('Failed to approve order: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error approving order:', error);
            showMessage('Error approving order', 'error');
        }
    }

    // Function to reject an order
    async function rejectOrder(orderId) {
        try {
            const response = await fetch(`/api/orders/${orderId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            if (result.success) {
                showMessage('Order rejected successfully!', 'success');
                // Refresh the customer orders modal
                const customerId = document.querySelector('.customer-orders-modal').getAttribute('data-customer-id');
                if (customerId) {
                    showCustomerOrders(parseInt(customerId));
                }
            } else {
                showMessage('Failed to reject order: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error rejecting order:', error);
            showMessage('Error rejecting order', 'error');
        }
    }

    // Function to view deleted customers
    async function viewDeletedCustomers() {
        try {
            const response = await fetch('/staff/customers/deleted');
            const data = await response.json();

            if (data.success) {
                showDeletedCustomersModal(data.customers);
            } else {
                showMessage('Error loading deleted customers: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error loading deleted customers', 'error');
        }
    }

    // Function to restore a customer
    async function restoreCustomer(customerId) {
        try {
            const response = await fetch(`/staff/customers/${customerId}/restore`, {
                method: 'POST',
            });
            const data = await response.json();

            if (data.success) {
                showMessage('Customer restored successfully!', 'success');
                // Close the deleted customers modal and refresh the main list
                const modal = document.querySelector('.deleted-customers-overlay');
                if (modal) {
                    modal.remove();
                }
                fetchCustomers(currentPage, searchQuery);
            } else {
                showMessage('Error restoring customer: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error restoring customer', 'error');
        }
    }

    // Function to show deleted customers modal
    function showDeletedCustomersModal(deletedCustomers) {
        // Remove existing modal if any
        const existingModal = document.querySelector('.deleted-customers-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'deleted-customers-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(2px);
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'deleted-customers-modal';
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 0;
            max-width: 900px;
            width: 95%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            transform: scale(0.9);
            transition: transform 0.2s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // Create modal header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 24px 24px 16px 24px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            background: white;
            border-radius: 12px 12px 0 0;
            z-index: 1;
        `;

        header.innerHTML = `
            <div>
                <h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">
                    Deleted Customers
                </h3>
                <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
                    These customers have been soft deleted but their orders and financial data are preserved
                </p>
            </div>
            <button class="close-btn" style="
                background: none;
                border: none;
                font-size: 24px;
                color: #6b7280;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
            ">&times;</button>
        `;

        // Create modal body
        const body = document.createElement('div');
        body.style.cssText = `
            padding: 16px 24px 24px 24px;
        `;

        if (deletedCustomers.length === 0) {
            body.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #6b7280;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🗑️</div>
                    <h4 style="margin: 0 0 8px 0; color: #374151;">No Deleted Customers</h4>
                    <p style="margin: 0;">All customers are currently active.</p>
                </div>
            `;
        } else {
            // Create deleted customers list
            const customersHtml = deletedCustomers.map(customer => {
                const deletedDate = new Date(customer.deleted_at).toLocaleDateString();
                const createdDate = new Date(customer.created_at).toLocaleDateString();
                
                return `
                    <div style="
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 16px;
                        margin-bottom: 12px;
                        background: #f9fafb;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div>
                                <h4 style="margin: 0; font-size: 16px; color: #111827;">
                                    ${customer.first_name} ${customer.last_name}
                                </h4>
                                <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
                                    ${customer.email} ${customer.phone ? '• ' + customer.phone : ''}
                                </p>
                            </div>
                            <div style="text-align: right;">
                                <span style="
                                    background: #ef4444;
                                    color: white;
                                    padding: 4px 12px;
                                    border-radius: 16px;
                                    font-size: 12px;
                                    font-weight: 500;
                                    display: inline-block;
                                    margin-bottom: 8px;
                                ">Deleted ${deletedDate}</span>
                                <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 12px;">
                                    Created: ${createdDate}
                                </p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; justify-content: flex-end;">
                            <button class="btn btn-success btn-sm restore-customer-btn" data-customer-id="${customer.id}" style="font-size: 12px;">
                                <i class="fas fa-undo"></i> Restore Customer
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            body.innerHTML = `
                <div style="margin-bottom: 16px;">
                    <h4 style="margin: 0; font-size: 16px; color: #374151;">
                        ${deletedCustomers.length} Deleted Customer${deletedCustomers.length !== 1 ? 's' : ''}
                    </h4>
                </div>
                ${customersHtml}
            `;
        }

        // Assemble modal
        modal.appendChild(header);
        modal.appendChild(body);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            modal.style.transform = 'scale(1)';
        });

        // Add event delegation for restore buttons
        body.addEventListener('click', (e) => {
            if (e.target.closest('.restore-customer-btn')) {
                const customerId = e.target.closest('.restore-customer-btn').dataset.customerId;
                restoreCustomer(customerId);
            }
        });

        // Add close functionality
        const closeBtn = header.querySelector('.close-btn');
        const cleanup = () => {
            modal.style.transform = 'scale(0.9)';
            overlay.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 200);
        };

        closeBtn.addEventListener('click', cleanup);
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.backgroundColor = '#f3f4f6';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.backgroundColor = 'transparent';
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
            }
        });

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    // Function to show messages - using standardized notification system
    function showMessage(message, type = 'info') {
        // Use the global showMessage function if available (from staff_messages.js)
        if (typeof window.showMessage === 'function') {
            window.showMessage(message, type);
        } else {
            // Fallback to simple alert if global function not available
            console.warn('Global showMessage function not found, using fallback');
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    // Add keyboard shortcut for modal cleanup (Ctrl+Shift+M)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'M') {
            e.preventDefault();
            cleanupModalBackdrop();
            console.log('Modal backdrop cleaned up manually');
        }
    });
    
    // Add emergency cleanup on page visibility change
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Page is being hidden, clean up any lingering modals
            setTimeout(cleanupModalBackdrop, 100);
        }
    });
    
    // Initialize export orders functionality
    initializeExportOrders();
});

// Helper function to parse CSV line with proper quote handling
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last field
    result.push(current.trim());
    
    // Remove quotes from each field
    return result.map(field => field.replace(/^"|"$/g, ''));
}

// Export Orders Functionality
function initializeExportOrders() {
    const exportOrdersCSVBtn = document.getElementById('exportOrdersCSVBtn');
    const exportOrdersPDFBtn = document.getElementById('exportOrdersPDFBtn');
    
    if (exportOrdersCSVBtn) {
        exportOrdersCSVBtn.addEventListener('click', () => exportCustomerOrders('csv'));
    }
    
    if (exportOrdersPDFBtn) {
        exportOrdersPDFBtn.addEventListener('click', () => exportCustomerOrders('pdf'));
    }
}

async function exportCustomerOrders(format) {
    const checkedCheckboxes = document.querySelectorAll('.customer-checkbox:not(#selectAllCustomers):checked');
    const selectedIds = Array.from(checkedCheckboxes).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        showMessage('Please select customers to export orders for', 'warning');
        return;
    }
    
    try {
        showMessage(`Preparing ${format.toUpperCase()} export for ${selectedIds.length} customers...`, 'info');
        
        const requestData = {
            customer_ids: selectedIds,
            format: format
        };
        
        const response = await fetch('/staff/customers/export-orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        if (format === 'pdf') {
            // Generate PDF client-side using jsPDF
            const csvData = await response.text();
            generateCustomerOrdersPDF(csvData, selectedIds.length);
        } else {
            // Handle CSV download
            const csvData = await response.text();
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `customer_orders_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showMessage('CSV file downloaded successfully!', 'success');
        }
        
    } catch (error) {
        console.error('Export orders error:', error);
        showMessage('Error exporting customer orders: ' + error.message, 'error');
    }
}

function generateCustomerOrdersPDF(csvData, customerCount) {
    try {
        // Check if jsPDF is available
        if (!window.jspdf || !window.jspdf.jsPDF) {
            showMessage('PDF generation library not available. Please refresh the page and try again.', 'error');
            return;
        }

        // Parse CSV data properly handling quoted values
        const lines = csvData.split('\n');
        const headers = parseCSVLine(lines[0]);
        const data = lines.slice(1).filter(line => line.trim() !== '');

        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        // Set document properties
        doc.setProperties({
            title: 'Customer Orders Report',
            subject: 'Customer Orders Export',
            author: 'Computer Shop System',
            creator: 'Computer Shop System'
        });

        // Add shop logo - simpler approach
        try {
            // Try to add logo directly - this should work better
            doc.addImage('/static/icons/logo.jpg', 'JPEG', 15, 15, 20, 20);
        } catch (e) {
            console.log('Logo not available:', e);
        }

        // Add shop name at top
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('Russeykeo Computer', 105, 25, { align: 'center' });

        // Add customer name (get from first row data)
        const firstRow = data[0];
        if (firstRow) {
            const customerValues = parseCSVLine(firstRow);
            const customerName = customerValues[1] || 'Unknown Customer';
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(`Customer: ${customerName}`, 105, 40, { align: 'center' });
        }

        // Add subtitle
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, 50, { align: 'center' });
        doc.text(`Total Orders: ${data.length}`, 105, 60, { align: 'center' });

        // Prepare table data
        const tableData = data.map(line => {
            const values = parseCSVLine(line);
            // Ensure we have all 10 columns in the correct order
            return [
                values[0] || '', // Customer ID
                values[1] || '', // Customer Name
                values[2] || '', // Email
                values[3] || '', // Phone
                values[4] || '', // Address
                values[5] || '', // Product Names
                values[6] || '', // Order ID
                values[7] || '', // Order Date
                values[8] || '', // Total Amount
                values[9] || ''  // Status
            ];
        });

        // Create table - positioned below the header text and centered
        doc.autoTable({
            head: [headers],
            body: tableData,
            startY: 75, // Start below the header text (adjusted for new layout)
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center' // Center header text
            },
            columnStyles: {
                0: { cellWidth: 12 }, // Customer ID
                1: { cellWidth: 20 }, // Customer Name
                2: { cellWidth: 25 }, // Email
                3: { cellWidth: 16 }, // Phone
                4: { cellWidth: 20 }, // Address
                5: { cellWidth: 30 }, // Product Names
                6: { cellWidth: 12 }, // Order ID
                7: { cellWidth: 20 }, // Order Date
                8: { cellWidth: 16 }, // Total Amount
                9: { cellWidth: 16 }  // Status
            },
            margin: { top: 60, right: 10, bottom: 20, left: 10 }, // Smaller margins
            halign: 'center', // Center the table horizontally
            tableWidth: 190, // Fixed width for better centering
            styles: {
                fontSize: 8,
                cellPadding: 2,
                halign: 'center', // Center text in cells
                overflow: 'linebreak' // Handle long text better
            }
        });

        // Save the PDF
        const filename = `customer_orders_export_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);

        showMessage('PDF file generated successfully!', 'success');

    } catch (error) {
        console.error('PDF generation error:', error);
        showMessage('Error generating PDF: ' + error.message, 'error');
    }
}
// JavaScript functions for staff page

function showCompletedOrdersCount(customerId) {
    const modalElement = document.getElementById('completedOrdersModal');
    const modalBody = document.getElementById('completedOrdersCountBody');
    
    // Only proceed if both elements exist
    if (!modalElement || !modalBody) {
        console.warn('Completed orders modal elements not found on this page');
        return;
    }
    
    const modal = new bootstrap.Modal(modalElement);
    modalBody.textContent = 'Loading...';

    fetch(`/staff/customers/${customerId}/orders/completed_count`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                modalBody.textContent = `Completed Orders Count: ${data.completed_count}`;
            } else {
                modalBody.textContent = 'Failed to load completed orders count.';
            }
        })
        .catch(error => {
            modalBody.textContent = 'Error loading completed orders count.';
            console.error('Error fetching completed orders count:', error);
        });
    modal.show();
}

function showCustomerOrders(customerId) {
    const modalElement = document.getElementById('customerOrdersModal');
    const modalBody = document.getElementById('customerOrdersModalBody');
    
    // Only proceed if both elements exist
    if (!modalElement || !modalBody) {
        console.warn('Customer orders modal elements not found on this page');
        return;
    }
    
    const modal = new bootstrap.Modal(modalElement);
    modalBody.innerHTML = 'Loading...';

    fetch(`/staff/customers/${customerId}/orders`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let ordersHtml = `
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Order Date</th>
                                <th>Status</th>
                                <th>Total Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.orders.map(order => `
                                <tr>
                                    <td>${order.id}</td>
                                    <td>${order.order_date}</td>
                                    <td>${order.status}</td>
                                    <td>${order.total_amount}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
                modalBody.innerHTML = ordersHtml;
            } else {
                modalBody.textContent = 'Failed to load customer orders.';
            }
        })
        .catch(error => {
            modalBody.textContent = 'Error loading customer orders.';
            console.error('Error fetching customer orders:', error);
        });

    modal.show();
}

// Client-side search for customers table (only when not on the customers page)
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('customerSearchInput');
    const table = document.getElementById('customersTable');
    
    // Only proceed if both elements exist AND we're not on the customers page
    // (customers page has its own server-side search implementation)
    if (searchInput && table && !window.location.pathname.includes('/customers')) {
        const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');

        searchInput.addEventListener('input', function() {
            const filter = searchInput.value.toLowerCase();

            for (let i = 0; i < rows.length; i++) {
                const nameCell = rows[i].getElementsByTagName('td')[1];
                const emailCell = rows[i].getElementsByTagName('td')[2];
                const nameText = nameCell.textContent.toLowerCase();
                const emailText = emailCell.textContent.toLowerCase();

                if (nameText.includes(filter) || emailText.includes(filter)) {
                    rows[i].style.display = '';
                } else {
                    rows[i].style.display = 'none';
                }
            }
        });
    }

    // Add New Customer button click handler
    const addCustomerBtn = document.getElementById('addCustomerBtn');
    const customerModalElement = document.getElementById('customerModal');
    let customerModal = null;
    if (customerModalElement) {
        customerModal = new bootstrap.Modal(customerModalElement);
    }

    if (addCustomerBtn && customerModal) {
        addCustomerBtn.addEventListener('click', function() {
            // Clear form fields
            const customerForm = document.getElementById('customerForm');
            const customerId = document.getElementById('customerId');
            const modalTitle = document.getElementById('modalTitle');
            
            if (customerForm && customerId && modalTitle) {
                customerForm.reset();
                customerId.value = '';
                // Set modal title
                modalTitle.textContent = 'Add Customer';
                // Show modal
                customerModal.show();
            }
        });
    }

    // Handle customer form submission
    const saveCustomerBtn = document.getElementById('saveCustomerBtn');
    if (saveCustomerBtn && customerModal) {
        saveCustomerBtn.addEventListener('click', function() {
            const customerId = document.getElementById('customerId');
            const firstName = document.getElementById('firstName');
            const lastName = document.getElementById('lastName');
            const email = document.getElementById('email');
            const phone = document.getElementById('phone');
            const address = document.getElementById('address');
            const password = document.getElementById('password');
            
            if (!customerId || !firstName || !lastName || !email || !password) {
                console.warn('Required customer form elements not found');
                return;
            }

            const firstNameValue = firstName.value.trim();
            const lastNameValue = lastName.value.trim();
            const emailValue = email.value.trim();
            const phoneValue = phone ? phone.value.trim() : '';
            const addressValue = address ? address.value.trim() : '';
            const passwordValue = password.value;

            if (!firstNameValue || !lastNameValue || !emailValue || !passwordValue) {
                alert('First Name, Last Name, Email, and Password are required.');
                return;
            }

            const payload = {
                first_name: firstNameValue,
                last_name: lastNameValue,
                email: emailValue,
                phone: phoneValue,
                address: addressValue,
                password: passwordValue
            };

            let url = '/staff/customers';
            let method = 'POST';

            if (customerId.value) {
                url = `/staff/customers/${customerId.value}`;
                method = 'PUT';
            }

            fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Customer saved successfully.');
                    customerModal.hide();
                    // Optionally, refresh the page or update the customers table
                    location.reload();
                } else {
                    alert('Error saving customer: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                alert('Error saving customer: ' + error);
                console.error('Error:', error);
            });
        });
    }

    // Function to edit customer
window.editCustomer = function(customerId) {
    fetch(`/staff/customers/${customerId}`)
        .then(response => response.json())
    .then(data => {
        if (data.success) {
            const customer = data.customer;
            document.getElementById('customerId').value = customer.id;
            document.getElementById('firstName').value = customer.first_name || '';
            document.getElementById('lastName').value = customer.last_name || '';
            document.getElementById('email').value = customer.email || '';
            document.getElementById('phone').value = customer.phone || '';
            document.getElementById('address').value = customer.address || '';
            document.getElementById('modalTitle').textContent = 'Edit Customer';
            if (customerModal) {
                customerModal.show();
            }
        } else {
            alert('Error saving customer: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        alert('Error saving customer: ' + error);
        console.error('Error:', error);
    });
}

document.querySelectorAll('.delete-customer-btn').forEach(button => {
    button.addEventListener('click', async function () {
        const customerId = this.dataset.customerId;
        const confirmed = await showDeleteConfirmation('Delete Customer', 'Are you sure you want to delete this customer? This action cannot be undone.');
        if (confirmed) {
            fetch(`/staff/customers/${customerId}`, {
                method: 'DELETE',
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage('Customer deleted successfully.', 'success');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    showMessage('Error deleting customer: ' + (data.error || 'Unknown error'), 'error');
                }
            })
            .catch(error => {
                showMessage('Error deleting customer: ' + error, 'error');
                console.error('Error:', error);
            });
        }
    });
});
});

function showCategoryProducts(categoryId) {
    const modalElement = document.getElementById('categoryProductsModal');
    const modalBody = document.getElementById('categoryProductsModalBody');
    
    // Only proceed if both elements exist
    if (!modalElement || !modalBody) {
        console.warn('Category products modal elements not found on this page');
        return;
    }
    
    const modal = new bootstrap.Modal(modalElement);
    modalBody.innerHTML = 'Loading...';

    fetch(`/staff/categories/${categoryId}/products`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let productsHtml = `
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Price</th>
                                <th>Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.products.map(product => `
                                <tr>
                                    <td>${product.name}</td>
                                    <td>${product.description}</td>
                                    <td>${product.price}</td>
                                    <td>${product.stock}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
                modalBody.innerHTML = productsHtml;
            } else {
                modalBody.textContent = 'Failed to load category products.';
            }
        })
        .catch(error => {
            modalBody.textContent = 'Error loading category products.';
            console.error('Error fetching category products:', error);
        });

    modal.show();
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.btn-info').forEach(button => {
        button.addEventListener('click', function () {
            const categoryId = this.dataset.categoryId;
            showCategoryProducts(categoryId);
        });
    });
});

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

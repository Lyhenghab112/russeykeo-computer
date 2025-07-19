document.addEventListener('DOMContentLoaded', function() {
    let productsList = [];

    // Fetch products list for autocomplete
    function fetchProductsList() {
        console.log('Fetching products list for autocomplete...');
        return fetch('/staff/inventory/search?q=&page=1&page_size=1000&sort_by=id&sort_dir=asc')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Products list fetched:', data.products);
                    productsList = data.products;
                } else {
                    alert('Failed to load products for autocomplete');
                    console.error('Failed to load products:', data);
                }
            })
            .catch(error => {
                alert('Error loading products for autocomplete: ' + error);
                console.error('Error:', error);
            });
    }

    // Status update handling removed - orders are automatically managed

    // Filter handling
    function applyFilters() {
        const status = document.getElementById('status-filter').value;
        const date = document.getElementById('date-filter').value;
        const search = document.getElementById('search-input').value.trim();
        
        let url = '/auth/staff/orders';
        const params = new URLSearchParams();
        
        if (status && status !== 'all') {
            params.append('status', status);
        }
        if (date) {
            params.append('date', date);
        }
        if (search) {
            params.append('search', search);
        }
        
        // Append a large page size to try and fetch all orders
        params.append('page_size', '10000');

        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        window.location.href = url;
    }

    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('search-btn').addEventListener('click', applyFilters);

    // Set initial filter values from URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('status')) {
        document.getElementById('status-filter').value = urlParams.get('status');
    }
    if (urlParams.has('date')) {
        document.getElementById('date-filter').value = urlParams.get('date');
    }

    // Handle details button clicks
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const orderId = this.dataset.orderId;
            window.location.href = `/staff/orders/${orderId}/details`;
        });
    });

    // Add New Order modal handling
    const openAddOrderModalBtn = document.getElementById('openAddOrderModalBtn');
    const addOrderModal = new bootstrap.Modal(document.getElementById('addOrderModal'));
    const addOrderForm = document.getElementById('addOrderForm');
    const addOrderItemBtn = document.getElementById('addOrderItemBtn');
    const orderItemsContainer = document.getElementById('orderItemsContainer');

    // Create datalist element for product autocomplete
    const productDatalist = document.createElement('datalist');
    productDatalist.id = 'products-list';
    document.body.appendChild(productDatalist);

    // Populate datalist options
    function populateProductDatalist() {
        console.log('Populating product datalist with products:', productsList);
        productDatalist.innerHTML = '';
        productsList.forEach(product => {
            const option = document.createElement('option');
            option.value = product.name;
            productDatalist.appendChild(option);
        });
    }

    // Function to create a new order item input group with autocomplete and price autofill
    function createOrderItem() {
        const div = document.createElement('div');
        div.classList.add('order-item');
        div.style.display = 'flex';
        div.style.gap = '10px';
        div.style.marginBottom = '10px';

        const productInput = document.createElement('input');
        productInput.type = 'text';
        productInput.name = 'product_name[]';
        productInput.placeholder = 'Product Name';
        productInput.required = true;
        productInput.classList.add('form-control');
        productInput.style.flex = '3';
        productInput.style.minWidth = '150px';
        productInput.setAttribute('list', 'products-list');

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.name = 'quantity[]';
        quantityInput.placeholder = 'Quantity';
        quantityInput.min = '1';
        quantityInput.required = true;
        quantityInput.classList.add('form-control');
        quantityInput.style.flex = '2';
        quantityInput.style.minWidth = '100px';

        const priceInput = document.createElement('input');
        priceInput.type = 'number';
        priceInput.name = 'price[]';
        priceInput.placeholder = 'Price';
        priceInput.min = '0';
        priceInput.step = '0.01';
        priceInput.required = true;
        priceInput.classList.add('form-control');
        priceInput.style.flex = '2';
        priceInput.style.minWidth = '100px';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = 'Remove';
        removeBtn.classList.add('btn', 'btn-danger');
        removeBtn.style.flex = '0 0 auto';
        removeBtn.addEventListener('click', () => {
            div.remove();
        });

        // Autofill price when product name changes
        productInput.addEventListener('input', () => {
            console.log('Product input changed:', productInput.value);
            const product = productsList.find(p => p.name === productInput.value);
            if (product) {
                console.log('Product found, autofilling price:', product.price);
                priceInput.value = product.price.toFixed(2);
            } else {
                console.log('Product not found, clearing price input');
                priceInput.value = '';
            }
        });

        div.appendChild(productInput);
        div.appendChild(quantityInput);
        div.appendChild(priceInput);
        div.appendChild(removeBtn);

        return div;
    }

    // Fetch products list and populate datalist before showing modal
    openAddOrderModalBtn.addEventListener('click', () => {
        fetchProductsList().then(() => {
            populateProductDatalist();
            addOrderModal.show();
        });
    });

    addOrderItemBtn.addEventListener('click', () => {
        const orderItem = createOrderItem();
        orderItemsContainer.appendChild(orderItem);
    });

    // Initialize with one order item input group
    addOrderItemBtn.click();

    // Handle form submission
    addOrderForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Collect form data
        const firstName = document.getElementById('firstNameInput').value.trim();
        const lastName = document.getElementById('lastNameInput').value.trim();
        const email = document.getElementById('emailInput').value.trim();
        const orderDate = document.getElementById('orderDateInput').value;

        if (!firstName || !lastName || !email || !orderDate) {
            alert('Please fill in all required fields.');
            return;
        }

        // Collect order items
        const orderItems = [];
        const orderItemDivs = orderItemsContainer.querySelectorAll('.order-item');
        for (const div of orderItemDivs) {
            const productName = div.querySelector('input[name="product_name[]"]').value.trim();
            const quantityStr = div.querySelector('input[name="quantity[]"]').value;
            const priceStr = div.querySelector('input[name="price[]"]').value;

            if (!productName || !quantityStr || !priceStr) {
                alert('Please fill in all order item fields.');
                return;
            }

            const quantity = parseInt(quantityStr, 10);
            const price = parseFloat(priceStr);

            if (isNaN(quantity) || quantity <= 0) {
                alert('Quantity must be a positive number.');
                return;
            }
            if (isNaN(price) || price < 0) {
                alert('Price must be a non-negative number.');
                return;
            }

            // Find product_id by product_name
            const product = productsList.find(p => p.name === productName);
            if (!product) {
                alert('Product "' + productName + '" not found in product list.');
                return;
            }

            orderItems.push({
                product_id: product.id,
                quantity: quantity,
                price: price
            });
        }

        if (orderItems.length === 0) {
            alert('Please add at least one order item.');
            return;
        }

        // Prepare payload
        const payload = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            order_date: orderDate,
            items: orderItems
        };

        // Send POST request to create order
        fetch('/staff/orders/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Order created successfully! Order ID: ' + data.order_id);
                addOrderModal.hide();
                addOrderForm.reset();
                orderItemsContainer.innerHTML = '';
                addOrderItemBtn.click();
            } else {
                alert('Failed to create order: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            alert('Error creating order: ' + error);
        });
    });
});

// Order cancellation function
function cancelOrder(orderId) {
    // Create a custom modal for cancellation
    const modalHtml = `
        <div id="cancelModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%;">
                <h3 style="margin-bottom: 20px; color: #dc3545;">Cancel Order #${orderId}</h3>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Reason for cancellation:</label>
                    <select id="cancelReason" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="Out of stock">Out of stock</option>
                        <option value="Customer request">Customer request</option>
                        <option value="Payment issue">Payment issue</option>
                        <option value="Supplier issue">Supplier issue</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Additional notes (optional):</label>
                    <textarea id="cancelNotes" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 80px;" placeholder="Enter any additional details..."></textarea>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
                    <p style="margin: 0; color: #dc3545; font-weight: bold;">This action cannot be undone.</p>
                </div>
                <div style="text-align: right;">
                    <button onclick="closeCancelModal()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin-right: 10px; cursor: pointer;">Cancel</button>
                    <button onclick="confirmCancellation(${orderId})" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Confirm Cancellation</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeCancelModal() {
    const modal = document.getElementById('cancelModal');
    if (modal) {
        modal.remove();
    }
}

function confirmCancellation(orderId) {
    const reason = document.getElementById('cancelReason').value;
    const notes = document.getElementById('cancelNotes').value;

    // Disable the confirm button to prevent double-clicks
    const confirmBtn = event.target;
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Cancelling...';

    fetch(`/api/staff/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            reason: reason,
            notes: notes
        })
    })
    .then(response => response.json())
    .then(data => {
        closeCancelModal();
        if (data.success) {
            // Show single success notification
            showNotification('Order cancelled successfully! Customer has been notified.', 'success');
            setTimeout(() => location.reload(), 1500); // Refresh after showing notification
        } else {
            showNotification('Error cancelling order: ' + data.error, 'error');
        }
    })
    .catch(error => {
        closeCancelModal();
        console.error('Error:', error);
        showNotification('Error cancelling order', 'error');
    });
}

// showNotification function is now provided by staff_messages.js
// This provides backward compatibility while using the standardized system

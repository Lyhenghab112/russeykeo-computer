// Customer History & Recognition JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeCustomerHistory();
});

function initializeCustomerHistory() {
    // Search functionality
    const searchBtn = document.getElementById('search-customer-btn');
    const searchInput = document.getElementById('customer-search-input');
    const recentBtn = document.getElementById('show-recent-customers-btn');
    const exportBtn = document.getElementById('exportCustomerHistoryCSV');

    if (searchBtn) {
        searchBtn.addEventListener('click', searchCustomer);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchCustomer();
            }
        });
    }

    if (recentBtn) {
        recentBtn.addEventListener('click', showRecentCustomers);
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportCustomerHistory);
    }

    // Load recent customers by default
    showRecentCustomers();
}

async function searchCustomer() {
    const searchInput = document.getElementById('customer-search-input');
    const query = searchInput.value.trim();

    if (!query) {
        showMessage('Please enter a customer name, email, or phone number', 'warning');
        return;
    }

    try {
        showLoading(true);
        
        const response = await fetch(`/api/staff/customers/search?q=${encodeURIComponent(query)}`);
        const result = await response.json();

        if (result.success && result.customers.length > 0) {
            // If multiple customers found, show selection
            if (result.customers.length > 1) {
                showCustomerSelection(result.customers);
            } else {
                // Single customer found, load their history
                loadCustomerHistory(result.customers[0].id);
            }
        } else {
            showNoResults();
        }
    } catch (error) {
        console.error('Error searching customer:', error);
        showMessage('Failed to search customers', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadCustomerHistory(customerId) {
    try {
        showLoading(true);
        
        const response = await fetch(`/api/staff/customers/${customerId}/discount-history`);
        const result = await response.json();

        if (result.success) {
            displayCustomerHistory(result.customer, result.history, result.insights);
        } else {
            showMessage('Failed to load customer history', 'error');
        }
    } catch (error) {
        console.error('Error loading customer history:', error);
        showMessage('Failed to load customer history', 'error');
    } finally {
        showLoading(false);
    }
}

function displayCustomerHistory(customer, history, insights) {
    // Hide other sections
    hideAllSections();
    
    // Show customer history results
    const resultsSection = document.getElementById('customer-history-results');
    if (resultsSection) {
        resultsSection.style.display = 'block';
    }

    // Populate customer info card
    populateCustomerInfo(customer);
    
    // Populate discount history table
    populateDiscountHistory(history);
    
    // Populate insights
    populateCustomerInsights(insights);
    
    // Generate pricing suggestions
    generatePricingSuggestions(customer, insights);
}

function populateCustomerInfo(customer) {
    const infoCard = document.getElementById('customer-info-card');
    if (!infoCard) return;

    infoCard.innerHTML = `
        <div class="customer-info-header">
            <div class="customer-name">${customer.name}</div>
            <div class="customer-id">ID: ${customer.id}</div>
        </div>
        <div class="customer-details">
            <div><strong>Email:</strong> ${customer.email || 'Not provided'}</div>
            <div><strong>Phone:</strong> ${customer.phone || 'Not provided'}</div>
            <div><strong>Member Since:</strong> ${formatDate(customer.created_at)}</div>
            <div><strong>Total Orders:</strong> ${customer.total_orders || 0}</div>
        </div>
    `;
}

function populateDiscountHistory(history) {
    const tableBody = document.getElementById('discount-history-table-body');
    if (!tableBody) return;

    if (!history || history.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No discount history found</td></tr>';
        return;
    }

    tableBody.innerHTML = history.map(item => `
        <tr>
            <td>${formatDate(item.date)}</td>
            <td>${item.product_name}</td>
            <td>$${parseFloat(item.original_price).toFixed(2)}</td>
            <td>${item.discount_percentage}%</td>
            <td>$${parseFloat(item.final_price).toFixed(2)}</td>
            <td>$${parseFloat(item.savings).toFixed(2)}</td>
            <td>${item.staff_name || 'Unknown'}</td>
        </tr>
    `).join('');
}

function populateCustomerInsights(insights) {
    // Most common discount
    const commonDiscount = document.getElementById('common-discount');
    if (commonDiscount) {
        commonDiscount.textContent = insights.most_common_discount ? 
            `${insights.most_common_discount}%` : 'None';
    }

    // Total purchases
    const totalPurchases = document.getElementById('total-purchases');
    if (totalPurchases) {
        totalPurchases.textContent = insights.total_purchases || '0';
    }

    // Total savings
    const totalSavings = document.getElementById('total-savings');
    if (totalSavings) {
        totalSavings.textContent = insights.total_savings ? 
            `$${parseFloat(insights.total_savings).toFixed(2)}` : '$0.00';
    }

    // Last visit
    const lastVisit = document.getElementById('last-visit');
    if (lastVisit) {
        lastVisit.textContent = insights.last_visit ? 
            formatDate(insights.last_visit) : 'Never';
    }
}

function generatePricingSuggestions(customer, insights) {
    const suggestionDiv = document.getElementById('pricing-suggestion');
    if (!suggestionDiv) return;

    let suggestions = [];

    if (insights.most_common_discount) {
        suggestions.push(`This customer typically receives ${insights.most_common_discount}% discounts`);
    }

    if (insights.total_purchases >= 5) {
        suggestions.push('Regular customer - consider VIP pricing');
    }

    if (insights.average_discount > 15) {
        suggestions.push('High-value customer - eligible for premium discounts');
    }

    if (suggestions.length === 0) {
        suggestions.push('New customer - standard pricing applies');
    }

    suggestionDiv.innerHTML = suggestions.map(suggestion => 
        `<div class="suggestion-item"><i class="fas fa-lightbulb"></i> ${suggestion}</div>`
    ).join('');
}

async function showRecentCustomers() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/staff/customers/recent-activity');
        const result = await response.json();

        if (result.success) {
            displayRecentCustomers(result.customers);
        } else {
            showMessage('Failed to load recent customers', 'error');
        }
    } catch (error) {
        console.error('Error loading recent customers:', error);
        showMessage('Failed to load recent customers', 'error');
    } finally {
        showLoading(false);
    }
}

function displayRecentCustomers(customers) {
    // Hide other sections
    hideAllSections();
    
    // Show recent activity section
    const recentSection = document.getElementById('recent-customer-activity');
    if (recentSection) {
        recentSection.style.display = 'block';
    }

    const customersList = document.getElementById('recent-customers-list');
    if (!customersList) return;

    if (!customers || customers.length === 0) {
        customersList.innerHTML = '<div class="no-results-message"><p>No recent customer activity found</p></div>';
        return;
    }

    customersList.innerHTML = customers.map(customer => `
        <div class="recent-customer-item" onclick="loadCustomerHistory(${customer.id})">
            <div class="recent-customer-info">
                <div class="recent-customer-name">${customer.name}</div>
                <div class="recent-customer-details">
                    ${customer.email || 'No email'} • Last visit: ${formatDate(customer.last_visit)}
                </div>
            </div>
            <div class="recent-customer-stats">
                <div>${customer.discount_count || 0} discounts</div>
                <div>Avg: ${customer.avg_discount || 0}%</div>
            </div>
        </div>
    `).join('');
}

function showCustomerSelection(customers) {
    // Implementation for multiple customer selection
    // For now, just load the first customer
    if (customers.length > 0) {
        loadCustomerHistory(customers[0].id);
    }
}

function hideAllSections() {
    const sections = [
        'customer-history-results',
        'recent-customer-activity', 
        'no-customer-results'
    ];
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });
}

function showNoResults() {
    hideAllSections();
    const noResults = document.getElementById('no-customer-results');
    if (noResults) {
        noResults.style.display = 'block';
    }
}

function showLoading(show) {
    // Add loading indicator logic here
    const searchBtn = document.getElementById('search-customer-btn');
    if (searchBtn) {
        if (show) {
            searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
            searchBtn.disabled = true;
        } else {
            searchBtn.innerHTML = '<i class="fas fa-search"></i> Search';
            searchBtn.disabled = false;
        }
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showMessage(message, type = 'info') {
    // Reuse the notification system from other pages
    console.log(`${type.toUpperCase()}: ${message}`);
    // TODO: Implement proper notification system
}

async function exportCustomerHistory() {
    // TODO: Implement CSV export functionality
    showMessage('Export functionality coming soon', 'info');
}

document.addEventListener('DOMContentLoaded', function () {
    const brandButtons = document.querySelectorAll('.brand-btn');
    
    // Add click event listeners to brand buttons
    brandButtons.forEach(brandBtn => {
        brandBtn.addEventListener('click', function() {
            const brand = this.getAttribute('data-brand');
            
            // Remove active class from all brand buttons
            brandButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Filter products by brand
            filterProductsByBrand(brand);
        });
    });
    
    // Function to filter products by brand
    function filterProductsByBrand(brand) {
        // Get the product search input
        const searchInput = document.getElementById('product-search');
        
        // Update the search input with the brand name
        if (searchInput) {
            searchInput.value = brand;
            
            // Trigger the search functionality
            if (typeof walkInSales !== 'undefined' && walkInSales.searchProducts) {
                walkInSales.searchProducts();
            } else {
                // Fallback: trigger input event
                const event = new Event('input', { bubbles: true });
                searchInput.dispatchEvent(event);
            }
        }
        
        // Show notification
        showBrandFilterNotification(brand);
    }
    
    // Function to show notification when brand filter is applied
    function showBrandFilterNotification(brand) {
        const notificationContainer = document.getElementById('notification-container');
        if (notificationContainer) {
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.innerHTML = `
                <i class="fas fa-filter"></i>
                <span>Filtering products by ${brand.toUpperCase()} brand</span>
            `;
            
            notificationContainer.appendChild(notification);
            
            // Remove notification after 3 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }
    }
    
    // Function to clear brand filter
    function clearBrandFilter() {
        brandButtons.forEach(btn => btn.classList.remove('active'));
        
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.value = '';
            
            // Trigger the search functionality
            if (typeof walkInSales !== 'undefined' && walkInSales.searchProducts) {
                walkInSales.searchProducts();
            } else {
                // Fallback: trigger input event
                const event = new Event('input', { bubbles: true });
                searchInput.dispatchEvent(event);
            }
        }
    }
    
    // Add clear filter functionality to the search input
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // If search input is cleared, also clear brand filter
            if (this.value === '') {
                brandButtons.forEach(btn => btn.classList.remove('active'));
            }
        });
    }
    
    // Expose clearBrandFilter function globally for use in other scripts
    window.clearBrandFilter = clearBrandFilter;
});

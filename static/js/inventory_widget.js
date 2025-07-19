
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('product-name-count-list');
    const lastUpdatedEl = document.getElementById('lastUpdated');

    if (!container) {
        console.warn("Inventory Widget: Container element not found.");
        return;
    }

    // Fetch product counts by brand
    fetch('/api/staff/product_brand_counts')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                console.error('Failed to fetch product brand counts:', data.error || 'No data received');
                container.innerHTML = '<p style="font-size: 0.8em;">No inventory data available.</p>';
                return;
            }
            renderProductBrandCountButtons(data.data);
            if (lastUpdatedEl) {
                const now = new Date();
                lastUpdatedEl.textContent = `Last updated: ${now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`;
            }
        })
        .catch(error => {
            console.error('Error fetching product brand counts:', error);
            container.innerHTML = '<p style="font-size: 0.8em;">Error loading inventory.</p>';
        });

    function renderProductBrandCountButtons(productBrandCounts) {
        container.innerHTML = ''; // Clear previous content

        productBrandCounts.forEach(item => {
            // Create button for each brand
            const button = document.createElement('button');
            button.className = 'brand-btn';

            // Create icon span
            const iconSpan = document.createElement('span');
            iconSpan.className = 'brand-icon fas fa-box';

            // Create brand name container
            const brandNameContainer = document.createElement('div');
            brandNameContainer.className = 'brand-name-container';

            // Split brand name into words
            const brandWords = item.brand.split(' ');

            // Create first line span
            const firstLine = document.createElement('span');
            firstLine.className = 'brand-name-line1';
            firstLine.textContent = brandWords[0] || '';

            // Create product count span
            const productCount = document.createElement('span');
            productCount.className = 'product-count';
            productCount.textContent = `${item.count}`; // Exact count

            // Create second line span
            const secondLine = document.createElement('span');
            secondLine.className = 'brand-name-line2';
            secondLine.textContent = brandWords.slice(1).join(' ') || '';

            // Append lines and count to brand name container
            brandNameContainer.appendChild(firstLine);
            brandNameContainer.appendChild(productCount);
            brandNameContainer.appendChild(secondLine);

            // Append icon and brand name container to button
            button.appendChild(iconSpan);
            button.appendChild(brandNameContainer);

            // Make button clickable to navigate to inventory filtered by brand
            button.addEventListener('click', () => {
                const brandQuery = encodeURIComponent(item.brand);
                window.location.href = `/auth/staff/inventory?q=${brandQuery}`;
            });

            // Append button to container
            container.appendChild(button);
        });
    }
});

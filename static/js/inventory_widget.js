
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

        // Brand-specific icons and colors
        const brandConfig = {
            'ASUS': { icon: 'fas fa-laptop', gradient: 'linear-gradient(135deg, #0066cc, #004499)' },
            'MSI': { icon: 'fas fa-laptop', gradient: 'linear-gradient(135deg, #ff0000, #cc0000)' },
            'HP': { icon: 'fas fa-building', gradient: 'linear-gradient(135deg, #0096d6, #0073a6)' },
            'Dell': { icon: 'fas fa-desktop', gradient: 'linear-gradient(135deg, #007db8, #005a85)' },
            'Lenovo': { icon: 'fas fa-laptop-code', gradient: 'linear-gradient(135deg, #e31837, #b31229)' },
            'Samsung': { icon: 'fas fa-tv', gradient: 'linear-gradient(135deg, #1428a0, #0f1f78)' },
            'Razer': { icon: 'fas fa-skull', gradient: 'linear-gradient(135deg, #00ff00, #00cc00)' },
            'Acer': { icon: 'fas fa-computer', gradient: 'linear-gradient(135deg, #83b735, #6a9429)' },
            'MK': { icon: 'fas fa-laptop', gradient: 'linear-gradient(135deg, #0096d6, #0073a6)' },
            'Logitech': { icon: 'fas fa-mouse', gradient: 'linear-gradient(135deg, #00b8fc, #0093c7)' },
            'Intel': { icon: 'fas fa-microchip', gradient: 'linear-gradient(135deg, #0071c5, #005a9e)' },
            'NVIDIA': { icon: 'fas fa-cube', gradient: 'linear-gradient(135deg, #76b900, #5e9400)' },
            'Corsair': { icon: 'fas fa-memory', gradient: 'linear-gradient(135deg, #ffcc00, #e6b800)' },
            'Seagate': { icon: 'fas fa-hdd', gradient: 'linear-gradient(135deg, #00aeef, #0088bd)' },
            'ProBook': { icon: 'fas fa-briefcase', gradient: 'linear-gradient(135deg, #0096d6, #0073a6)' },
            'Modern': { icon: 'fas fa-laptop', gradient: 'linear-gradient(135deg, #ff0000, #cc0000)' }
        };

        productBrandCounts.forEach((item, index) => {
            // Create button for each brand
            const button = document.createElement('button');
            button.className = 'brand-btn';
            
            // Add staggered animation delay
            button.style.animationDelay = `${index * 0.1}s`;

            // Get brand config or use default
            const config = brandConfig[item.brand] || { 
                icon: 'fas fa-cube', 
                gradient: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' 
            };

            // Create icon span with brand-specific styling
            const iconSpan = document.createElement('span');
            iconSpan.className = 'brand-icon';
            iconSpan.style.background = config.gradient;
            iconSpan.innerHTML = `<i class="${config.icon}"></i>`;

            // Create brand name container
            const brandNameContainer = document.createElement('div');
            brandNameContainer.className = 'brand-name-container';

            // Split brand name into words
            const brandWords = item.brand.split(' ');

            // Create first line span (main brand name)
            const firstLine = document.createElement('span');
            firstLine.className = 'brand-name-line1';
            firstLine.textContent = brandWords[0] || '';

            // Create second line span (additional words)
            const secondLine = document.createElement('span');
            secondLine.className = 'brand-name-line2';
            secondLine.textContent = brandWords.slice(1).join(' ') || '';

            // Create product count span with animation
            const productCount = document.createElement('span');
            productCount.className = 'product-count';
            productCount.textContent = `${item.count} Products`;
            
            // Add pulsing animation for high count items
            if (item.count > 30) {
                productCount.style.animation = 'pulse 2s infinite';
            }

            // Append elements to brand name container
            brandNameContainer.appendChild(firstLine);
            if (secondLine.textContent) {
                brandNameContainer.appendChild(secondLine);
            }
            brandNameContainer.appendChild(productCount);

            // Append icon and brand name container to button
            button.appendChild(iconSpan);
            button.appendChild(brandNameContainer);

            // Add hover effect data attribute
            button.setAttribute('data-brand', item.brand);
            button.setAttribute('data-count', item.count);

            // Make button clickable to navigate to inventory filtered by brand
            button.addEventListener('click', () => {
                const brandQuery = encodeURIComponent(item.brand);
                window.location.href = `/auth/staff/inventory?q=${brandQuery}`;
            });

            // Add entrance animation
            button.style.opacity = '0';
            button.style.transform = 'translateY(20px)';
            
            // Append button to container
            container.appendChild(button);
            
            // Trigger entrance animation
            setTimeout(() => {
                button.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                button.style.opacity = '1';
                button.style.transform = 'translateY(0)';
            }, index * 100);
        });

        // Add CSS for pulse animation if not exists
        if (!document.getElementById('brand-animations')) {
            const style = document.createElement('style');
            style.id = 'brand-animations';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
            `;
            document.head.appendChild(style);
        }
    }
});

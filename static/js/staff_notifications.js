document.addEventListener('DOMContentLoaded', function() {
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
                const lowStockNotifications = notifications.filter(note => note.type === 'low_stock').slice(0, 10); // Filter for low stock only and limit to 10

                if (lowStockNotifications.length === 0) {
                    // If no low stock notifications are returned, display a message indicating that.
                    container.innerHTML = '<p>No low stock notifications at this time.</p>';
                    return;
                }

                const notificationsContainer = document.createElement('div');
                notificationsContainer.className = 'enhanced-notifications';

                lowStockNotifications.forEach(note => {
                    const notificationCard = document.createElement('div');
                    notificationCard.className = 'notification-card';
                    
                    let message = note.message;
                    // Remove prefixes for cleaner display
                    message = message.replace(/^(Out of stock alert:|Low stock alert:|In stock alert:)\s*/i, '');
                    
                    // Extract product name and stock info
                    const stockMatch = message.match(/has only (\d+) items? left/);
                    const stockCount = stockMatch ? parseInt(stockMatch[1]) : 0;
                    const productName = message.replace(/ has only \d+ items? left\.?/, '');
                    
                    // Determine notification type and styling
                    let notificationType, icon, stockText;
                    if (note.type === 'out_of_stock' || stockCount === 0) {
                        notificationType = 'critical';
                        icon = 'fas fa-exclamation-triangle';
                        stockText = 'Out of Stock';
                    } else if (note.type === 'low_stock' || stockCount <= 5) {
                        notificationType = 'warning';
                        icon = 'fas fa-exclamation-circle';
                        stockText = `${stockCount} left`;
                    } else {
                        notificationType = 'info';
                        icon = 'fas fa-info-circle';
                        stockText = 'In Stock';
                    }
                    
                    notificationCard.className += ` ${notificationType}`;
                    
                    notificationCard.innerHTML = `
                        <div class="notification-content">
                            <div class="notification-icon">
                                <i class="${icon}"></i>
                            </div>
                            <div class="notification-details">
                                <div class="product-name">${productName}</div>
                                <div class="stock-info">
                                    <span class="stock-count">${stockText}</span>
                                </div>
                            </div>
                            <div class="notification-actions">
                                <a href="/auth/staff/inventory?product_id=${note.product_id}" class="action-btn">
                                    <i class="fas fa-cog"></i> Manage
                                </a>
                            </div>
                        </div>
                    `;
                    
                    notificationsContainer.appendChild(notificationCard);
                });

                container.innerHTML = ''; // Clear previous content
                container.appendChild(notificationsContainer); // Append the enhanced notifications container
            })
            .catch(error => {
                if (container) {
                    container.innerHTML = '<p>Error loading notifications.</p>';
                }
                console.error('Error fetching notifications:', error);
            });
    }

    fetchAndDisplayNotifications();
});

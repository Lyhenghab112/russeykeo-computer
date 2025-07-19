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

    fetchAndDisplayNotifications();
});

/**
 * Unified Notification System for Computer Shop
 * Provides consistent notifications across all pages
 */

class UnifiedNotifications {
    constructor() {
        this.notifications = new Map();
        this.notificationCounter = 0;
        this.init();
    }

    init() {
        // Add CSS styles if not already present
        this.addStyles();
    }

    addStyles() {
        if (document.getElementById('unified-notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'unified-notification-styles';
        style.textContent = `
            .unified-notification {
                position: fixed;
                top: 24px;
                right: 24px;
                padding: 20px 24px;
                border-radius: 16px;
                color: #1f2937;
                font-weight: 500;
                z-index: 10000;
                max-width: 420px;
                min-width: 340px;
                background: #ffffff;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                border: 1px solid rgba(0, 0, 0, 0.05);
                transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                transform: translateX(100%);
                opacity: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                font-size: 15px;
                line-height: 1.5;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
            }

            .unified-notification.show {
                transform: translateX(0);
                opacity: 1;
            }

            .unified-notification.hide {
                transform: translateX(100%);
                opacity: 0;
            }

            .unified-notification.success {
                border-left: 4px solid #10b981;
                background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
            }

            .unified-notification.error {
                border-left: 4px solid #ef4444;
                background: linear-gradient(135deg, #fef2f2 0%, #fef2f2 100%);
            }

            .unified-notification.warning {
                border-left: 4px solid #f59e0b;
                background: linear-gradient(135deg, #fffbeb 0%, #fefce8 100%);
            }

            .unified-notification.info {
                border-left: 4px solid #3b82f6;
                background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
            }

            .unified-notification-content {
                display: flex;
                align-items: flex-start;
                gap: 16px;
            }

            .unified-notification-icon {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                margin-top: 2px;
                font-size: 16px;
                font-weight: 600;
            }

            .unified-notification.success .unified-notification-icon {
                background: #dcfce7;
                color: #166534;
            }

            .unified-notification.error .unified-notification-icon {
                background: #fee2e2;
                color: #991b1b;
            }

            .unified-notification.warning .unified-notification-icon {
                background: #fef3c7;
                color: #92400e;
            }

            .unified-notification.info .unified-notification-icon {
                background: #dbeafe;
                color: #1e40af;
            }

            .unified-notification-body {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .unified-notification-message {
                margin: 0;
                font-weight: 500;
            }

            .unified-notification-actions {
                display: flex;
                gap: 12px;
                margin-top: 16px;
            }

            .unified-notification-btn {
                padding: 10px 20px;
                border-radius: 10px;
                border: none;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                letter-spacing: 0.025em;
                white-space: nowrap;
            }

            .unified-notification-btn.primary {
                background: #3b82f6;
                color: #ffffff;
                box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
            }

            .unified-notification-btn.primary:hover {
                background: #2563eb;
                transform: translateY(-2px);
                box-shadow: 0 8px 15px -3px rgba(59, 130, 246, 0.4);
            }

            .unified-notification-btn.secondary {
                background: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
            }

            .unified-notification-btn.secondary:hover {
                background: #e5e7eb;
                border-color: #9ca3af;
                transform: translateY(-1px);
            }

            .unified-notification-close {
                position: absolute;
                top: 12px;
                right: 12px;
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                padding: 6px;
                border-radius: 8px;
                font-size: 18px;
                line-height: 1;
                transition: all 0.2s ease;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .unified-notification-close:hover {
                background: #f3f4f6;
                color: #374151;
            }

            /* Stack multiple notifications */
            .unified-notification:nth-child(n+2) {
                top: calc(20px + (80px * var(--notification-index, 0)));
            }

            /* Mobile responsive */
            @media (max-width: 640px) {
                .unified-notification {
                    left: 16px;
                    right: 16px;
                    max-width: none;
                    min-width: auto;
                    transform: translateY(-100%);
                    top: 16px;
                    padding: 18px 20px;
                    border-radius: 14px;
                }

                .unified-notification.show {
                    transform: translateY(0);
                }

                .unified-notification.hide {
                    transform: translateY(-100%);
                }

                .unified-notification:nth-child(n+2) {
                    top: calc(16px + (80px * var(--notification-index, 0)));
                }

                .unified-notification-content {
                    gap: 14px;
                }

                .unified-notification-icon {
                    width: 28px;
                    height: 28px;
                    font-size: 14px;
                }

                .unified-notification-actions {
                    flex-direction: column;
                    gap: 8px;
                }

                .unified-notification-btn {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Show a notification
     * @param {string} message - The notification message
     * @param {string} type - Type: 'success', 'error', 'warning', 'info'
     * @param {Object} options - Additional options
     */
    show(message, type = 'info', options = {}) {
        const {
            duration = this.getDefaultDuration(type),
            actions = [],
            showClose = true,
            persistent = false
        } = options;

        // Remove existing notifications of the same type to prevent spam
        this.removeByType(type);

        const notificationId = ++this.notificationCounter;
        const notification = this.createNotification(notificationId, message, type, {
            actions,
            showClose,
            persistent
        });

        document.body.appendChild(notification);
        this.notifications.set(notificationId, notification);

        // Update notification positions
        this.updatePositions();

        // Show notification
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto-remove if not persistent
        if (!persistent && duration > 0) {
            setTimeout(() => {
                this.remove(notificationId);
            }, duration);
        }

        return notificationId;
    }

    createNotification(id, message, type, options) {
        const notification = document.createElement('div');
        notification.className = `unified-notification ${type}`;
        notification.dataset.notificationId = id;

        const icon = this.getIcon(type);
        
        notification.innerHTML = `
            <div class="unified-notification-content">
                <div class="unified-notification-icon">
                    ${icon}
                </div>
                <div class="unified-notification-body">
                    <div class="unified-notification-message">${message}</div>
                    ${options.actions.length > 0 ? this.createActions(options.actions) : ''}
                </div>
            </div>
            ${options.showClose ? '<button class="unified-notification-close" onclick="window.unifiedNotifications.remove(' + id + ')">&times;</button>' : ''}
        `;

        return notification;
    }

    createActions(actions) {
        const actionsHtml = actions.map(action => {
            const btnClass = action.primary ? 'primary' : 'secondary';
            const onclick = action.onclick ? `onclick="${action.onclick}"` : '';
            const href = action.href ? `href="${action.href}"` : '';
            const tag = action.href ? 'a' : 'button';
            
            return `<${tag} class="unified-notification-btn ${btnClass}" ${onclick} ${href}>${action.text}</${tag}>`;
        }).join('');

        return `<div class="unified-notification-actions">${actionsHtml}</div>`;
    }

    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '!',
            info: 'i'
        };
        return icons[type] || icons.info;
    }

    getDefaultDuration(type) {
        const durations = {
            success: 4000,
            error: 6000,
            warning: 5000,
            info: 4000
        };
        return durations[type] || 4000;
    }

    remove(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (!notification) return;

        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(notificationId);
            this.updatePositions();
        }, 400);
    }

    removeByType(type) {
        this.notifications.forEach((notification, id) => {
            if (notification.classList.contains(type)) {
                this.remove(id);
            }
        });
    }

    removeAll() {
        this.notifications.forEach((notification, id) => {
            this.remove(id);
        });
    }

    updatePositions() {
        let index = 0;
        this.notifications.forEach(notification => {
            notification.style.setProperty('--notification-index', index);
            index++;
        });
    }

    // Convenience methods
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', options);
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    // Special method for login required notifications
    loginRequired(message = '🔒 Please sign in to add items to your cart and complete your purchase.', redirectUrl = '/auth/login') {
        return this.warning(message, {
            duration: 6000, // Auto-hide after 6 seconds
            actions: [
                {
                    text: 'Sign In',
                    primary: true,
                    href: redirectUrl
                },
                {
                    text: 'Continue Browsing',
                    onclick: `window.unifiedNotifications.remove(this.closest('.unified-notification').dataset.notificationId)`
                }
            ]
        });
    }
}

// Initialize global instance
window.unifiedNotifications = new UnifiedNotifications();

// Backward compatibility aliases
window.showNotification = (message, type, options) => window.unifiedNotifications.show(message, type, options);
window.showLoginRequired = (message, redirectUrl) => window.unifiedNotifications.loginRequired(message, redirectUrl);

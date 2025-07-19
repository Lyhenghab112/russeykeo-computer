/**
 * Standardized Staff Message System
 * This file provides consistent notification functionality across all staff dashboard pages
 * 
 * Usage:
 * showMessage('Success message', 'success');
 * showMessage('Error message', 'error');
 * showMessage('Warning message', 'warning');
 * showMessage('Info message', 'info');
 */

// Global notification configuration
const NOTIFICATION_CONFIG = {
    autoHideDelay: 5000, // 5 seconds
    maxMessages: 5, // Maximum number of messages to show at once
    enableCloseButton: false, // Disabled close button
    enableHoverPause: true
};

// Message type to icon mapping
const MESSAGE_ICONS = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle',
    loading: 'fas fa-spinner fa-spin'
};

/**
 * Initialize the notification system
 * Creates the message container if it doesn't exist
 */
function initializeNotificationSystem() {
    let container = document.getElementById('message-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'message-container';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Show a notification message
 * @param {string} message - The message to display
 * @param {string} type - The message type (success, error, warning, info, loading)
 * @param {Object} options - Optional configuration
 */
function showMessage(message, type = 'info', options = {}) {
    // Validate message type
    const validTypes = ['success', 'error', 'warning', 'info', 'loading'];
    if (!validTypes.includes(type)) {
        console.warn(`Invalid message type: ${type}. Using 'info' instead.`);
        type = 'info';
    }

    // Get or create container
    const container = initializeNotificationSystem();
    
    // Limit number of messages
    const existingMessages = container.querySelectorAll('.message');
    if (existingMessages.length >= NOTIFICATION_CONFIG.maxMessages) {
        // Remove oldest message
        existingMessages[0].remove();
    }

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    // Create message content
    const icon = MESSAGE_ICONS[type] || MESSAGE_ICONS.info;
    let messageHTML = `<i class="${icon}"></i>`;

    // Add message text
    messageHTML += `<span class="message-text">${escapeHtml(message)}</span>`;

    messageDiv.innerHTML = messageHTML;
    
    // Add to container
    container.appendChild(messageDiv);
    
    // Auto-hide functionality
    const autoHideDelay = options.autoHide !== false ? 
        (options.delay || NOTIFICATION_CONFIG.autoHideDelay) : null;
    
    if (autoHideDelay) {
        let timeoutId = setTimeout(() => {
            removeMessage(messageDiv);
        }, autoHideDelay);
        
        // Pause auto-hide on hover if enabled
        if (NOTIFICATION_CONFIG.enableHoverPause) {
            messageDiv.addEventListener('mouseenter', () => {
                clearTimeout(timeoutId);
            });
            
            messageDiv.addEventListener('mouseleave', () => {
                timeoutId = setTimeout(() => {
                    removeMessage(messageDiv);
                }, autoHideDelay);
            });
        }
        
        // Store timeout ID for potential cancellation
        messageDiv.dataset.timeoutId = timeoutId;
    }
    
    return messageDiv;
}

// closeMessage function removed - no longer needed without close buttons

/**
 * Remove a message with animation
 * @param {HTMLElement} messageDiv - The message element to remove
 */
function removeMessage(messageDiv) {
    if (!messageDiv || !messageDiv.parentNode) return;
    
    // Clear any pending timeout
    if (messageDiv.dataset.timeoutId) {
        clearTimeout(parseInt(messageDiv.dataset.timeoutId));
    }
    
    // Add fade-out animation
    messageDiv.classList.add('fade-out');
    
    // Remove after animation completes
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 300); // Match CSS animation duration
}

/**
 * Clear all messages
 */
function clearAllMessages() {
    const container = document.getElementById('message-container');
    if (container) {
        const messages = container.querySelectorAll('.message');
        messages.forEach(message => removeMessage(message));
    }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Convenience methods for different message types
 */
function showSuccess(message, options = {}) {
    return showMessage(message, 'success', options);
}

function showError(message, options = {}) {
    return showMessage(message, 'error', options);
}

function showWarning(message, options = {}) {
    return showMessage(message, 'warning', options);
}

function showInfo(message, options = {}) {
    return showMessage(message, 'info', options);
}

function showLoading(message, options = {}) {
    return showMessage(message, 'loading', { autoHide: false, closable: false, ...options });
}

/**
 * Backward compatibility aliases
 * These maintain compatibility with existing code that uses showNotification
 */
function showNotification(message, type) {
    // Map old type names to new ones if needed
    const typeMap = {
        'success': 'success',
        'error': 'error',
        'danger': 'error',
        'warning': 'warning',
        'info': 'info'
    };
    
    const mappedType = typeMap[type] || 'info';
    return showMessage(message, mappedType);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeNotificationSystem();
});

// Test function for debugging (can be called from browser console)
function testNotifications() {
    showMessage('This is a test success message with some longer text to verify proper wrapping and display formatting works correctly across multiple lines.', 'success');
    setTimeout(() => showMessage('This is a test error message', 'error'), 1000);
    setTimeout(() => showMessage('This is a test warning message', 'warning'), 2000);
    setTimeout(() => showMessage('This is a test info message', 'info'), 3000);
}

// Export functions for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showMessage,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showLoading,
        showNotification,
        clearAllMessages
    };
}

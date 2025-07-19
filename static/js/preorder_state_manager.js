/**
 * Pre-Order State Management System
 * Handles stateful pre-order buttons with persistence and synchronization
 */

class PreOrderStateManager {
    constructor() {
        this.preorderStates = new Map(); // product_id -> {has_preorder, preorder_id, status}
        this.isLoggedIn = false;
        this.serverStateLoaded = false; // Flag to track if we've loaded from server
        this.lastServerCheck = 0; // Timestamp of last server check
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
        this.init();
    }

    async init() {
        console.log('🔄 Pre-Order State Manager initializing...');
        await this.checkLoginStatus();

        if (this.isLoggedIn) {
            // Try to load from cache first
            const hasCachedData = this.loadStateFromStorage();
            if (!hasCachedData) {
                console.log('💡 No valid cache, will load from server when needed');
            }
        }

        console.log('✅ Pre-Order State Manager initialized');
    }

    /**
     * Check if user is logged in
     */
    async checkLoginStatus() {
        try {
            console.log('🔍 TIMING: checkLoginStatus() called at', new Date().toISOString());
            const response = await fetch('/api/user/info');
            const data = await response.json();
            this.isLoggedIn = data.success && data.user;

            console.log('🔍 TIMING: Login check completed at', new Date().toISOString(), 'Result:', this.isLoggedIn);

            if (this.isLoggedIn) {
                console.log('✅ User is logged in, enabling pre-order state management');
            } else {
                console.log('❌ User not logged in, pre-order state management disabled');
            }
        } catch (error) {
            console.error('Error checking login status:', error);
            this.isLoggedIn = false;
        }
    }

    /**
     * Load pre-order states from localStorage with cache validation
     */
    loadStateFromStorage() {
        try {
            const saved = localStorage.getItem('preorderStates');
            const cacheTime = localStorage.getItem('preorderStatesTime');

            if (saved && cacheTime) {
                const age = Date.now() - parseInt(cacheTime);
                if (age < this.cacheExpiry) {
                    const parsed = JSON.parse(saved);
                    this.preorderStates = new Map(Object.entries(parsed));
                    this.lastServerCheck = parseInt(cacheTime);
                    console.log('📦 Loaded cached pre-order states (age:', Math.round(age/1000), 'seconds)');
                    return true; // Cache is valid
                } else {
                    console.log('📦 Cache expired, will refresh from server');
                    localStorage.removeItem('preorderStates');
                    localStorage.removeItem('preorderStatesTime');
                }
            }
            return false; // No valid cache
        } catch (error) {
            console.error('❌ Error loading pre-order states from storage:', error);
            this.preorderStates = new Map();
            localStorage.removeItem('preorderStates');
            localStorage.removeItem('preorderStatesTime');
            return false;
        }
    }

    /**
     * Save pre-order states to localStorage with timestamp
     */
    saveStateToStorage() {
        try {
            const stateObj = Object.fromEntries(this.preorderStates);
            const timestamp = Date.now();
            localStorage.setItem('preorderStates', JSON.stringify(stateObj));
            localStorage.setItem('preorderStatesTime', timestamp.toString());
            this.lastServerCheck = timestamp;
            console.log('💾 Saved pre-order states with timestamp');
        } catch (error) {
            console.error('Error saving pre-order states to storage:', error);
        }
    }



    /**
     * Load pre-order states from server for given product IDs
     */
    async loadStatesFromServer(productIds) {
        if (!productIds || productIds.length === 0) {
            console.log('🔄 No product IDs provided for state loading');
            return {};
        }

        if (!this.isLoggedIn) {
            console.log('🔄 User not logged in - ensuring all buttons show default state');
            // Clear any existing states since user is not logged in
            this.preorderStates.clear();
            this.serverStateLoaded = true; // Mark as loaded so we don't keep trying
            return {};
        }

        try {
            console.log(`🔄 Loading pre-order states from server for products: ${productIds.join(',')}`);
            const response = await fetch(`/api/preorders/status?product_ids=${productIds.join(',')}`);
            const data = await response.json();

            if (data.success) {
                console.log('📦 DETAILED SERVER RESPONSE:', JSON.stringify(data.preorder_status, null, 2));

                // Log each product's status in detail
                for (const [productId, status] of Object.entries(data.preorder_status)) {
                    console.log(`🔍 PRODUCT ${productId} STATUS:`, {
                        has_preorder: status.has_preorder,
                        preorder_id: status.preorder_id,
                        status: status.status,
                        raw_data: status
                    });
                }

                // Clear existing states for these products first to ensure clean state
                productIds.forEach(id => {
                    this.preorderStates.delete(String(id));
                });

                // Only set states for products that actually have pre-orders
                for (const [productId, status] of Object.entries(data.preorder_status)) {
                    if (status.has_preorder) {
                        this.preorderStates.set(productId, status);
                        console.log(`📦 CONFIRMED: Product ${productId} has active pre-order:`, status);
                    } else {
                        console.log(`🟡 CONFIRMED: Product ${productId} has NO pre-order`);
                    }
                }

                // Save to localStorage
                this.saveStateToStorage();

                // Mark that we've loaded server state
                this.serverStateLoaded = true;

                console.log('✅ Final pre-order states:', Object.fromEntries(this.preorderStates));
                return data.preorder_status;
            } else {
                console.error('❌ Failed to load pre-order states from server:', data.error);
                // TEMPORARILY DISABLED: Fallback to localStorage if server fails
                // if (!this.serverStateLoaded) {
                //     this.loadStateFromStorage();
                // }
                console.log('🚫 DEBUGGING: localStorage fallback disabled to prevent auto-tick');
                return {};
            }
        } catch (error) {
            console.error('❌ Error loading pre-order states from server:', error);
            // TEMPORARILY DISABLED: Fallback to localStorage if server fails
            // if (!this.serverStateLoaded) {
            //     this.loadStateFromStorage();
            // }
            console.log('🚫 DEBUGGING: localStorage fallback disabled to prevent auto-tick');
            return {};
        }
    }

    /**
     * Get pre-order state for a product
     */
    getPreorderState(productId) {
        return this.preorderStates.get(String(productId)) || { has_preorder: false };
    }

    /**
     * Set pre-order state for a product
     */
    setPreorderState(productId, state) {
        this.preorderStates.set(String(productId), state);
        this.saveStateToStorage();
        
        // Notify other components about state change
        this.notifyStateChange(productId, state);
    }

    /**
     * Remove pre-order state for a product
     */
    removePreorderState(productId) {
        this.preorderStates.delete(String(productId));
        this.saveStateToStorage();
        
        // Notify other components about state change
        this.notifyStateChange(productId, { has_preorder: false });
    }

    /**
     * Cancel a pre-order
     */
    async cancelPreorder(preorderId, productId) {
        if (!this.isLoggedIn) {
            throw new Error('Please log in to cancel pre-orders');
        }

        try {
            // Step 1: Cancel the pre-order in the database
            const response = await fetch(`/api/preorders/${preorderId}/cancel`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (data.success) {
                // Step 2: Remove pre-order item from cart
                try {
                    const cartResponse = await fetch('/api/cart/remove-preorder', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            preorder_id: preorderId
                        })
                    });

                    const cartData = await cartResponse.json();
                    if (cartData.success) {
                        console.log(`🛒 Pre-order ${preorderId} removed from cart`);

                        // Update cart display and count
                        this.updateCartDisplay();
                    } else {
                        console.warn(`⚠️ Failed to remove pre-order ${preorderId} from cart:`, cartData.error);
                    }
                } catch (cartError) {
                    console.warn(`⚠️ Error removing pre-order ${preorderId} from cart:`, cartError);
                    // Don't throw error here - pre-order cancellation was successful
                }

                // Step 3: Remove from local state
                console.log(`🔄 Removing pre-order state for product ${productId} before:`, this.getPreorderState(productId));
                this.removePreorderState(productId);
                console.log(`🔄 Pre-order state for product ${productId} after removal:`, this.getPreorderState(productId));
                console.log(`✅ Pre-order ${preorderId} cancelled successfully and removed from cart`);
                return data;
            } else {
                throw new Error(data.error || 'Failed to cancel pre-order');
            }
        } catch (error) {
            console.error('Error cancelling pre-order:', error);
            throw error;
        }
    }

    /**
     * Update cart display after pre-order changes
     */
    updateCartDisplay() {
        // Try different cart update functions that might exist
        const cartUpdateFunctions = [
            'updateCart',
            'updateCartCount',
            'refreshCart',
            'loadCart',
            'updateCartDisplay'
        ];

        let updated = false;
        cartUpdateFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                try {
                    window[funcName]();
                    console.log(`🛒 Updated cart using ${funcName}()`);
                    updated = true;
                } catch (error) {
                    console.warn(`⚠️ Error calling ${funcName}():`, error);
                }
            }
        });

        if (!updated) {
            console.log('🛒 No cart update functions found, dispatching cart change event');
            // Dispatch a custom event for cart changes
            document.dispatchEvent(new CustomEvent('cartChanged', {
                detail: { action: 'preorder_removed' }
            }));
        }
    }

    /**
     * Notify other components about state changes
     */
    notifyStateChange(productId, state) {
        // Dispatch custom event for other components to listen to
        const event = new CustomEvent('preorderStateChanged', {
            detail: { productId, state }
        });
        document.dispatchEvent(event);
    }

    /**
     * Update button appearance based on pre-order state
     */
    updateButtonState(button, productId) {
        if (!button) {
            console.warn(`⚠️ updateButtonState: Button not found for product ${productId}`);
            return;
        }

        // Only update pre-order buttons, not regular cart buttons
        if (!button.classList.contains('preorder-btn')) {
            console.warn(`⚠️ updateButtonState: Button for product ${productId} is not a pre-order button`);
            return;
        }

        const state = this.getPreorderState(productId);
        console.log(`🔄 DETAILED: Updating button state for product ${productId}:`, {
            state: state,
            has_preorder: state.has_preorder,
            preorder_id: state.preorder_id,
            status: state.status,
            stateType: typeof state.has_preorder,
            stateValue: state.has_preorder,
            allStates: Object.fromEntries(this.preorderStates)
        });

        // EXPLICIT check for has_preorder being exactly true
        if (state.has_preorder === true) {
            // Green state - pre-ordered
            button.style.backgroundColor = '#28a745'; // Green
            button.style.color = '#fff';
            button.innerHTML = '<i class="bi bi-check-circle"></i>';
            button.title = 'Pre-ordered - Click to cancel';
            button.classList.add('preordered');
            button.disabled = false; // Ensure button remains clickable for cancellation
            console.log(`✅ CONFIRMED: Set product ${productId} to GREEN (pre-ordered) state`);
        } else {
            // Yellow state - available for pre-order
            button.style.backgroundColor = '#ffc107'; // Yellow
            button.style.color = '#000';
            button.innerHTML = '<i class="bi bi-clock"></i>';
            button.title = 'Pre-Order this product';
            button.classList.remove('preordered');
            button.disabled = false; // Ensure button remains clickable for pre-ordering
            console.log(`🟡 CONFIRMED: Set product ${productId} to YELLOW (available) state - has_preorder was:`, state.has_preorder);
        }
    }

    /**
     * Handle pre-order button click
     */
    async handlePreorderButtonClick(button, productId, productData) {
        console.log(`🔄 Pre-order button clicked for product ${productId}`, {
            button: button,
            disabled: button.disabled,
            classList: Array.from(button.classList),
            innerHTML: button.innerHTML
        });

        if (!this.isLoggedIn) {
            alert('Please log in to place pre-orders');
            return;
        }

        const state = this.getPreorderState(productId);
        console.log(`🔄 Current pre-order state for product ${productId}:`, state);

        if (state.has_preorder) {
            // Cancel existing pre-order
            console.log(`🔄 Attempting to cancel pre-order ${state.preorder_id} for product ${productId}`);
            if (confirm('Are you sure you want to cancel this pre-order?')) {
                try {
                    await this.cancelPreorder(state.preorder_id, productId);
                    this.updateButtonState(button, productId);

                    // Show success message
                    this.showNotification('Pre-order cancelled and removed from cart', 'success');
                } catch (error) {
                    console.error(`❌ Error cancelling pre-order:`, error);
                    this.showNotification('Failed to cancel pre-order: ' + error.message, 'error');
                }
            }
        } else {
            // Create new pre-order - open modal
            console.log(`🔄 Opening pre-order modal for product ${productId}`);
            if (typeof openHomepagePreOrderModal === 'function') {
                openHomepagePreOrderModal(productData);
            } else if (typeof openPreOrderModal === 'function') {
                openPreOrderModal(button);
            } else {
                console.error('No pre-order modal function available');
            }
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            // Fallback to alert
            alert(message);
        }
    }

    /**
     * Refresh states for all visible products (FIXED VERSION)
     */
    async refreshAllStates() {
        if (!this.isLoggedIn) {
            console.log('🔄 refreshAllStates: User not logged in, skipping refresh');
            return;
        }

        console.log('🔄 refreshAllStates: Starting state refresh...');

        // Get all product IDs from visible pre-order buttons
        const buttons = document.querySelectorAll('[data-product-id].preorder-btn');
        const productIds = Array.from(buttons)
            .map(btn => btn.getAttribute('data-product-id'))
            .filter(id => id)
            .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

        if (productIds.length > 0) {
            const serverStates = await this.loadStatesFromServer(productIds);

            // Only update buttons that have confirmed pre-orders from server
            buttons.forEach(button => {
                const productId = button.getAttribute('data-product-id');
                if (serverStates && serverStates[productId] && serverStates[productId].has_preorder === true) {
                    console.log(`✅ refreshAllStates: Product ${productId} has confirmed pre-order, updating to green`);
                    this.updateButtonState(button, productId);
                } else {
                    console.log(`🟡 refreshAllStates: Product ${productId} has no pre-order, keeping yellow`);
                }
            });
        }
    }

    /**
     * Clear all pre-order states (for debugging)
     */
    clearAllStates() {
        this.preorderStates.clear();
        localStorage.removeItem('preorderStates');
        this.serverStateLoaded = false;
        console.log('🧹 Cleared all pre-order states');
    }
}

// Create global instance
window.preorderStateManager = new PreOrderStateManager();
console.log('✅ PreOrderStateManager re-enabled with cart button fix');

// DISABLED: Auto-refresh to prevent database spam
// document.addEventListener('visibilitychange', function() {
//     if (!document.hidden && window.preorderStateManager && window.preorderStateManager.isLoggedIn) {
//         console.log('🔄 Page visible and user logged in, refreshing pre-order states...');
//         window.preorderStateManager.refreshAllStates();
//     }
// });
console.log('🚫 PERFORMANCE: Auto-refresh on visibility change disabled');

// Listen for pre-order creation events to update state
document.addEventListener('preorderCreated', function(event) {
    if (window.preorderStateManager && event.detail) {
        const { productId, preorderId, status } = event.detail;
        window.preorderStateManager.setPreorderState(productId, {
            has_preorder: true,
            preorder_id: preorderId,
            status: status || 'pending'
        });
    }
});

// Smart refresh on focus (uses cache, prevents spam)
window.addEventListener('focus', function() {
    if (window.preorderStateManager && window.preorderStateManager.isLoggedIn) {
        const cacheAge = Date.now() - window.preorderStateManager.lastServerCheck;
        if (cacheAge > 60000) { // Only refresh if cache is older than 1 minute
            console.log('🔄 Window focused, cache is old, smart refreshing...');
            if (typeof smartLoadPreorderStates === 'function') {
                smartLoadPreorderStates();
            }
        } else {
            console.log('🔄 Window focused, cache is fresh, no refresh needed');
        }
    }
});

// Smart storage sync (uses cache validation)
window.addEventListener('storage', function(event) {
    if (event.key === 'preorderStates' && window.preorderStateManager && window.preorderStateManager.isLoggedIn) {
        console.log('🔄 Pre-order states changed in another tab, syncing...');
        window.preorderStateManager.loadStateFromStorage();
        // Apply states to current page buttons
        if (typeof smartLoadPreorderStates === 'function') {
            smartLoadPreorderStates();
        }
    }
});

// Global debugging functions
window.debugPreorderStates = function() {
    if (window.preorderStateManager) {
        console.log('🔍 Current pre-order states:', Object.fromEntries(window.preorderStateManager.preorderStates));
        console.log('🔍 localStorage preorderStates:', localStorage.getItem('preorderStates'));
        console.log('🔍 User logged in:', window.preorderStateManager.isLoggedIn);
        console.log('🔍 Server state loaded:', window.preorderStateManager.serverStateLoaded);
    }
};

window.clearPreorderStates = function() {
    if (window.preorderStateManager) {
        window.preorderStateManager.clearAllStates();
        console.log('🧹 Pre-order states cleared. Refresh the page to see default yellow buttons.');
    }
};

// Clear localStorage completely and force yellow buttons
window.emergencyReset = function() {
    localStorage.removeItem('preorderStates');
    localStorage.removeItem('cartProductIds');
    if (window.preorderStateManager) {
        window.preorderStateManager.preorderStates.clear();
    }
    if (typeof forceYellowButtons === 'function') {
        forceYellowButtons();
    }
    console.log('🚨 EMERGENCY RESET: All localStorage cleared, buttons forced to yellow');
};

// Check what the server is returning for specific products
window.checkServerPreorders = async function(productIds) {
    if (!productIds) {
        // Get all visible pre-order button product IDs
        const buttons = document.querySelectorAll('.preorder-btn[data-product-id]');
        productIds = Array.from(buttons).map(btn => btn.getAttribute('data-product-id'));
    }

    console.log('🔍 Checking server pre-orders for products:', productIds);

    try {
        const response = await fetch(`/api/preorders/status?product_ids=${productIds.join(',')}`);
        const data = await response.json();

        console.log('🔍 RAW SERVER RESPONSE:', data);

        if (data.success) {
            console.log('🔍 PRE-ORDER STATUS BREAKDOWN:');
            for (const [productId, status] of Object.entries(data.preorder_status)) {
                console.log(`Product ${productId}:`, status);
            }
        }

        return data;
    } catch (error) {
        console.error('Error checking server pre-orders:', error);
    }
};

// Manual function to load pre-order states (only when needed)
window.loadPreorderStates = async function() {
    if (!window.preorderStateManager) {
        console.log('❌ State manager not available');
        return;
    }

    const buttons = document.querySelectorAll('.preorder-btn[data-product-id]');
    const productIds = Array.from(buttons).map(btn => btn.getAttribute('data-product-id'));

    if (productIds.length === 0) {
        console.log('🔍 No pre-order buttons found on page');
        return;
    }

    console.log('🔄 MANUAL: Loading pre-order states for products:', productIds);

    const serverStates = await window.preorderStateManager.loadStatesFromServer(productIds);

    buttons.forEach(button => {
        const productId = button.getAttribute('data-product-id');
        if (serverStates && serverStates[productId] && serverStates[productId].has_preorder === true) {
            console.log(`✅ MANUAL: Product ${productId} has confirmed pre-order, updating to green`);
            window.preorderStateManager.updateButtonState(button, productId);
        } else {
            console.log(`🟡 MANUAL: Product ${productId} has no pre-order, keeping yellow`);
        }
    });
};

// Smart state loading - only loads when needed, uses cache
window.smartLoadPreorderStates = async function() {
    if (!window.preorderStateManager || !window.preorderStateManager.isLoggedIn) {
        console.log('🔄 User not logged in, keeping buttons yellow');
        return;
    }

    const buttons = document.querySelectorAll('.preorder-btn[data-product-id]');
    if (buttons.length === 0) {
        console.log('🔍 No pre-order buttons found');
        return;
    }

    const productIds = Array.from(buttons).map(btn => btn.getAttribute('data-product-id'));
    console.log('🔄 Smart loading states for', productIds.length, 'products');

    // Check if we need to refresh from server
    const cacheAge = Date.now() - window.preorderStateManager.lastServerCheck;
    const needsRefresh = cacheAge > window.preorderStateManager.cacheExpiry;

    if (needsRefresh) {
        console.log('🔄 Cache expired, loading fresh data from server');
        await window.preorderStateManager.loadStatesFromServer(productIds);
    } else {
        console.log('📦 Using cached data (age:', Math.round(cacheAge/1000), 'seconds)');
    }

    // Apply states to buttons
    buttons.forEach(button => {
        const productId = button.getAttribute('data-product-id');
        const state = window.preorderStateManager.getPreorderState(productId);

        if (state.has_preorder) {
            console.log(`✅ Product ${productId} has pre-order, showing green`);
            window.preorderStateManager.updateButtonState(button, productId);
        } else {
            console.log(`🟡 Product ${productId} no pre-order, keeping yellow`);
        }
    });
};

// Show summary of current state
window.preorderSummary = function() {
    console.log('📊 SMART PRE-ORDER SYSTEM SUMMARY:');
    console.log('✅ Smart state loading: ENABLED (efficient, cached)');
    console.log('⚡ Cache duration: 5 minutes');
    console.log('🔄 Auto-refresh: Only when cache expires');
    console.log('🟡 Default state: YELLOW (until real states load)');
    console.log('🟢 Persistent state: GREEN buttons stay green across page loads');

    if (window.preorderStateManager) {
        const cacheAge = Date.now() - window.preorderStateManager.lastServerCheck;
        console.log('📦 Cache age:', Math.round(cacheAge/1000), 'seconds');
        console.log('👤 User logged in:', window.preorderStateManager.isLoggedIn);
        console.log('📊 Cached states:', Object.fromEntries(window.preorderStateManager.preorderStates));
    }

    const buttons = document.querySelectorAll('.preorder-btn');
    console.log(`🔍 Found ${buttons.length} pre-order buttons on current page`);

    console.log('💡 Available commands:');
    console.log('   - smartLoadPreorderStates() - Smart load with caching');
    console.log('   - forceYellowButtons() - Force all buttons to yellow');
    console.log('   - emergencyReset() - Clear all data and reset');
    console.log('   - debugCategoryPage() - Debug category page issues');
};

// Debug function for category page issues
window.debugCategoryPage = function() {
    console.log('🔍 CATEGORY PAGE DEBUG:');
    console.log('State manager available:', !!window.preorderStateManager);
    console.log('Smart load function available:', typeof smartLoadPreorderStates);
    console.log('User logged in:', window.preorderStateManager?.isLoggedIn);

    const buttons = document.querySelectorAll('.preorder-btn[data-product-id]');
    console.log(`Found ${buttons.length} pre-order buttons`);

    buttons.forEach((btn, index) => {
        const productId = btn.getAttribute('data-product-id');
        const bgColor = btn.style.backgroundColor;
        console.log(`Button ${index + 1}: Product ${productId}, Color: ${bgColor}`);
    });

    if (window.preorderStateManager) {
        console.log('Current states:', Object.fromEntries(window.preorderStateManager.preorderStates));
    }
};

// Force all pre-order buttons to yellow state (for debugging)
window.forceYellowButtons = function() {
    const buttons = document.querySelectorAll('.preorder-btn');
    console.log(`🟡 Forcing ${buttons.length} pre-order buttons to yellow state`);

    buttons.forEach((button, index) => {
        const productId = button.getAttribute('data-product-id');
        button.style.backgroundColor = '#ffc107'; // Yellow
        button.style.color = '#000'; // Black
        button.innerHTML = '<i class="bi bi-clock"></i>';
        button.title = 'Pre-Order this product';
        button.classList.remove('preordered');
        button.disabled = false; // Ensure clickable
        console.log(`🟡 Button ${index + 1} (Product ${productId}) forced to yellow`);
    });
};

// Debug function to test button clickability
window.testPreorderButtons = function() {
    const buttons = document.querySelectorAll('.preorder-btn');
    console.log(`🔍 Testing ${buttons.length} pre-order buttons:`);

    buttons.forEach((button, index) => {
        const productId = button.getAttribute('data-product-id');
        console.log(`🔍 Button ${index + 1} (Product ${productId}):`, {
            disabled: button.disabled,
            classList: Array.from(button.classList),
            innerHTML: button.innerHTML.trim(),
            hasEventListeners: button.onclick !== null || button.addEventListener !== undefined,
            style: {
                backgroundColor: button.style.backgroundColor,
                color: button.style.color
            }
        });

        // Test if button responds to programmatic click
        try {
            button.click();
            console.log(`✅ Button ${index + 1} click() worked`);
        } catch (error) {
            console.error(`❌ Button ${index + 1} click() failed:`, error);
        }
    });
};

// Debug function to check all pre-order buttons on page
window.checkPreorderButtons = function() {
    const buttons = document.querySelectorAll('.preorder-btn');
    console.log(`🔍 Found ${buttons.length} pre-order buttons on page:`);

    buttons.forEach((button, index) => {
        const productId = button.getAttribute('data-product-id');
        const bgColor = button.style.backgroundColor;
        const innerHTML = button.innerHTML;
        const state = window.preorderStateManager ? window.preorderStateManager.getPreorderState(productId) : 'No state manager';

        console.log(`🔍 Button ${index + 1}:`, {
            productId,
            backgroundColor: bgColor,
            innerHTML: innerHTML.trim(),
            state: state
        });
    });
};

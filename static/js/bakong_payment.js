/**
 * Bakong Payment System JavaScript Module
 * 
 * Handles QR code payment flow, modal display, and payment status monitoring
 * following the existing UI patterns and user preferences.
 */

class BakongPayment {
    constructor() {
        this.paymentModal = null;
        this.paymentSession = null;

        this.initializeModal();
    }
    
    /**
     * Initialize the payment modal with consistent styling
     */
    initializeModal() {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'bakong-payment-modal';
        backdrop.className = 'modal';
        backdrop.style.cssText = `
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            overflow: auto;
        `;
        
        // Create modal content with white background and professional styling
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background-color: #fff;
            margin: 5% auto;
            padding: 20px;
            border: 1px solid #888;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            position: relative;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        
        // Create close button (minimalist design without colored background)
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.className = 'close-button';
        closeButton.style.cssText = `
            position: absolute;
            right: 15px;
            top: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            z-index: 1;
        `;
        
        // Create modal header
        const header = document.createElement('div');
        header.style.cssText = `
            text-align: center;
            margin-bottom: 20px;
            padding-right: 30px;
        `;
        header.innerHTML = `
            <h2 style="margin: 0; color: #333;">💳 ACLEDA Bank Payment</h2>
            <p style="margin: 5px 0 0 0; color: #666; font-weight: bold;">Ly Heng Hab - Computer Shop</p>
            <p style="margin: 5px 0 0 0; color: #888; font-size: 14px;">Scan QR code with your mobile banking app</p>
        `;
        
        // Create QR code container
        const qrContainer = document.createElement('div');
        qrContainer.id = 'qr-code-container';
        qrContainer.style.cssText = `
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            border: 2px dashed #ddd;
            border-radius: 8px;
            background-color: #fafafa;
        `;
        
        // Create payment details section
        const paymentDetails = document.createElement('div');
        paymentDetails.id = 'payment-details';
        paymentDetails.style.cssText = `
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        `;
        
        // Create status section
        const statusSection = document.createElement('div');
        statusSection.id = 'payment-status';
        statusSection.style.cssText = `
            text-align: center;
            margin: 15px 0;
        `;
        
        // Create action buttons container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 20px;
        `;
        
        // Create cancel button (gray)
        const cancelButton = document.createElement('button');
        cancelButton.id = 'cancel-payment-btn';
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
            background: #6c757d;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            min-width: 100px;
        `;
        
        // Create payment completed button (green - following user preference)
        const completedButton = document.createElement('button');
        completedButton.id = 'payment-completed-btn';
        completedButton.textContent = '✅ Payment Completed';
        completedButton.style.cssText = `
            background: #28a745;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            min-width: 150px;
            font-weight: bold;
        `;
        
        // Add hover effects
        cancelButton.addEventListener('mouseenter', () => {
            cancelButton.style.backgroundColor = '#5a6268';
        });
        cancelButton.addEventListener('mouseleave', () => {
            cancelButton.style.backgroundColor = '#6c757d';
        });
        
        completedButton.addEventListener('mouseenter', () => {
            completedButton.style.backgroundColor = '#218838';
        });
        completedButton.addEventListener('mouseleave', () => {
            completedButton.style.backgroundColor = '#28a745';
        });

        // Assemble modal
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(completedButton);
        
        modalContent.appendChild(closeButton);
        modalContent.appendChild(header);
        modalContent.appendChild(paymentDetails);
        modalContent.appendChild(qrContainer);
        modalContent.appendChild(statusSection);
        modalContent.appendChild(buttonContainer);
        
        backdrop.appendChild(modalContent);
        document.body.appendChild(backdrop);
        
        this.paymentModal = backdrop;
        
        // Add event listeners
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners for modal interactions
     */
    setupEventListeners() {
        const closeButton = this.paymentModal.querySelector('.close-button');
        const cancelButton = this.paymentModal.querySelector('#cancel-payment-btn');
        const completedButton = this.paymentModal.querySelector('#payment-completed-btn');

        // Close modal events
        closeButton.addEventListener('click', () => this.closePayment());
        cancelButton.addEventListener('click', () => this.cancelPayment());

        // Payment completed - confirm and create invoice
        completedButton.addEventListener('click', () => this.confirmPaymentAndCreateInvoice());
        
        // Close modal when clicking outside
        this.paymentModal.addEventListener('click', (event) => {
            if (event.target === this.paymentModal) {
                this.closePayment();
            }
        });
    }
    
    /**
     * Start payment process with cart data
     */
    async startPayment(cartItems, customerInfo, totalAmount) {
        try {
            this.showLoadingState();
            
            // Create payment session
            const response = await fetch('/api/payment/create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cart_items: cartItems,
                    customer_info: customerInfo,
                    total_amount: totalAmount
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Payment session created:', data.session);
                this.paymentSession = data.session;
                this.displayPaymentModal(data.session);
                return Promise.resolve(data.session);
            } else {
                this.showError('Failed to create payment session: ' + data.error);
                return Promise.reject(new Error(data.error));
            }
        } catch (error) {
            console.error('Payment error:', error);
            this.showError('An error occurred while starting payment.');
            return Promise.reject(error);
        }
    }
    
    /**
     * Display the payment modal with QR code and details
     */
    displayPaymentModal(session) {
        // Update payment details
        const detailsContainer = this.paymentModal.querySelector('#payment-details');
        detailsContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                <div><strong>Amount:</strong></div>
                <div>$${session.total_amount.toFixed(2)}</div>
                <div><strong>Reference:</strong></div>
                <div style="font-family: monospace; font-size: 12px;">${session.qr_data.reference_id}</div>
                <div><strong>Expires:</strong></div>
                <div>${this.formatExpiryTime(session.qr_data.expires_at)}</div>
            </div>
        `;
        
        // Display QR code with ACLEDA Bank styling
        const qrContainer = this.paymentModal.querySelector('#qr-code-container');
        qrContainer.innerHTML = `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border: 2px solid #e9ecef;">
                <img src="data:image/png;base64,${session.qr_data.qr_image_base64}"
                     alt="ACLEDA Bank QR Code - Ly Heng Hab"
                     style="max-width: 280px; max-height: 280px; border: 2px solid #ddd; border-radius: 8px; background: white; padding: 10px;">
                <div style="margin-top: 15px;">
                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #333;">
                        💰 Pay: $${session.total_amount.toFixed(2)} USD
                    </p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
                        📱 Works with: ACLEDA Mobile, ABA, Wing, Pi Pay
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #888;">
                        Scan → Verify Amount → Pay → Show Confirmation
                    </p>
                </div>
            </div>
        `;
        
        // Update status
        this.updatePaymentStatus('Scan QR code and pay, then click "Payment Completed"', 'pending');

        // Show modal
        this.paymentModal.style.display = 'block';
    }
    
    /**
     * Show loading state
     */
    showLoadingState() {
        const qrContainer = this.paymentModal.querySelector('#qr-code-container');
        qrContainer.innerHTML = `
            <div style="padding: 40px;">
                <div style="font-size: 18px; color: #666;">Generating QR Code...</div>
                <div style="margin-top: 10px; font-size: 14px; color: #999;">Please wait</div>
            </div>
        `;
        
        this.paymentModal.style.display = 'block';
    }
    
    /**
     * Update payment status display
     */
    updatePaymentStatus(message, status) {
        const statusContainer = this.paymentModal.querySelector('#payment-status');
        
        let statusColor = '#666';
        let statusIcon = '⏳';
        
        switch (status) {
            case 'pending':
                statusColor = '#ffc107';
                statusIcon = '⏳';
                break;
            case 'completed':
                statusColor = '#28a745';
                statusIcon = '✅';
                break;
            case 'failed':
                statusColor = '#dc3545';
                statusIcon = '❌';
                break;
            case 'expired':
                statusColor = '#6c757d';
                statusIcon = '⏰';
                break;
        }
        
        statusContainer.innerHTML = `
            <div style="color: ${statusColor}; font-size: 16px;">
                ${statusIcon} ${message}
            </div>
        `;
    }
    
    /**
     * Format expiry time for display
     */
    formatExpiryTime(expiryIso) {
        const expiry = new Date(expiryIso);
        let hours = expiry.getHours();
        const minutes = expiry.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        if (hours === 0) hours = 12;

        const minutesStr = minutes.toString().padStart(2, '0');
        return `${hours}:${minutesStr} ${ampm}`;
    }
    
    /**
     * Start monitoring payment status
     */
    startStatusMonitoring() {
        this.statusCheckInterval = setInterval(() => {
            this.checkPaymentStatus();
        }, 5000); // Check every 5 seconds
    }
    
    /**
     * Start timeout timer with countdown display
     */
    startTimeoutTimer() {
        const timeoutMs = this.paymentTimeoutMinutes * 60 * 1000;
        const startTime = Date.now();

        // Update countdown every second
        const countdownInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = timeoutMs - elapsed;

            if (remaining <= 0) {
                clearInterval(countdownInterval);
                this.handlePaymentTimeout();
                return;
            }

            // Update countdown display
            this.updateCountdown(remaining);
        }, 1000);

        this.timeoutTimer = setTimeout(() => {
            clearInterval(countdownInterval);
            this.handlePaymentTimeout();
        }, timeoutMs);

        // Store countdown interval for cleanup
        this.countdownInterval = countdownInterval;
    }

    /**
     * Update countdown display
     */
    updateCountdown(remainingMs) {
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);

        const statusContainer = this.paymentModal.querySelector('#payment-status');
        const countdownText = `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;

        // Update or add countdown display
        let countdownElement = statusContainer.querySelector('.countdown');
        if (!countdownElement) {
            countdownElement = document.createElement('div');
            countdownElement.className = 'countdown';
            countdownElement.style.cssText = `
                font-size: 12px;
                color: #666;
                margin-top: 5px;
            `;
            statusContainer.appendChild(countdownElement);
        }

        countdownElement.textContent = countdownText;

        // Change color when time is running low (last 2 minutes)
        if (remainingMs < 120000) {
            countdownElement.style.color = '#dc3545';
        }
    }
    
    /**
     * Check payment status
     */
    async checkPaymentStatus() {
        if (!this.paymentSession) return;
        
        try {
            const response = await fetch(`/api/payment/status/${this.paymentSession.id}`);
            const data = await response.json();
            
            if (data.success) {
                const status = data.status;
                
                if (status === 'completed') {
                    this.handlePaymentSuccess(data);
                } else if (status === 'failed') {
                    this.handlePaymentFailure(data);
                } else if (status === 'expired') {
                    this.handlePaymentTimeout();
                }
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    }
    
    /**
     * Handle successful payment
     */
    handlePaymentSuccess(data) {
        this.stopMonitoring();
        this.updatePaymentStatus('Payment successful!', 'completed');
        
        setTimeout(() => {
            this.closePayment();
            // Trigger cart clear and redirect
            if (window.handlePaymentSuccess) {
                window.handlePaymentSuccess(data);
            }
        }, 2000);
    }
    
    /**
     * Handle payment failure
     */
    handlePaymentFailure(data) {
        this.stopMonitoring();
        this.updatePaymentStatus('Payment failed. Please try again.', 'failed');
    }
    
    /**
     * Handle payment timeout
     */
    handlePaymentTimeout() {
        this.stopMonitoring();
        this.updatePaymentStatus('Payment expired. Please try again.', 'expired');
    }
    
    /**
     * Stop monitoring and timers
     */
    stopMonitoring() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }

        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer);
            this.timeoutTimer = null;
        }

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
    
    /**
     * Cancel payment
     */
    async cancelPayment() {
        if (this.paymentSession) {
            try {
                await fetch(`/api/payment/cancel/${this.paymentSession.id}`, {
                    method: 'POST'
                });
            } catch (error) {
                console.error('Cancel payment error:', error);
            }
        }
        
        this.closePayment();
    }
    
    /**
     * Close payment modal
     */
    closePayment() {
        this.paymentModal.style.display = 'none';
        this.paymentSession = null;
    }

    /**
     * Confirm payment and create invoice
     */
    async confirmPaymentAndCreateInvoice() {
        console.log('🔧 Payment confirmation started');
        console.log('📋 Payment session:', this.paymentSession);

        if (!this.paymentSession) {
            this.showError('No payment session found');
            return;
        }

        if (!this.paymentSession.id) {
            this.showError('No session ID found');
            return;
        }

        try {
            // Update status to show pending
            this.updatePaymentStatus('Processing payment confirmation...', 'pending');

            // Disable the button to prevent double-clicks
            const completedButton = this.paymentModal.querySelector('#payment-completed-btn');
            completedButton.disabled = true;
            completedButton.textContent = 'Processing...';

            console.log(`🔗 Confirming payment for session: ${this.paymentSession.id}`);

            // Confirm payment with server
            const response = await fetch(`/api/payment/confirm/${this.paymentSession.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            console.log('💰 Payment confirmation response:', data);

            if (data.success) {
                // Payment confirmed, redirect to appropriate invoice
                this.updatePaymentStatus('Payment confirmed! Redirecting to invoice...', 'completed');

                // Clear cart after successful payment confirmation
                this.clearCart();

                // Determine invoice URL based on payment type
                let invoiceUrl;
                if (data.payment_type === 'mixed_cart') {
                    // Mixed cart payment - redirect to mixed cart summary
                    if (data.order_id && data.preorder_id) {
                        invoiceUrl = `/mixed-cart/summary/${data.order_id}/${data.preorder_id}`;
                        console.log(`🧾 Mixed cart: Redirecting to summary: ${invoiceUrl}`);

                        // Show notification about both order and pre-orders
                        this.updatePaymentStatus(
                            `Payment confirmed! Order created and ${data.preorder_count || 1} pre-order(s) processed. Redirecting to summary...`,
                            'completed'
                        );
                    } else if (data.order_id) {
                        // Fallback to order invoice if no pre-order ID
                        invoiceUrl = `/invoice/${data.order_id}`;
                        console.log(`🧾 Mixed cart (fallback): Redirecting to order invoice: ${invoiceUrl}`);
                    } else if (data.preorder_id) {
                        // Fallback to pre-order invoice if no order ID
                        invoiceUrl = `/preorder/invoice/${data.preorder_id}`;
                        console.log(`🧾 Mixed cart (fallback): Redirecting to pre-order invoice: ${invoiceUrl}`);
                    } else {
                        console.error('❌ Mixed cart but no order_id or preorder_id found');
                        this.showError('Payment confirmed but unable to redirect to invoice');
                        return;
                    }
                } else if (data.payment_type === 'preorder' && data.preorder_id) {
                    // Pre-order payment - redirect to pre-order invoice
                    invoiceUrl = `/preorder/invoice/${data.preorder_id}`;
                    console.log(`🧾 Redirecting to pre-order invoice: ${invoiceUrl}`);
                } else if (data.order_id) {
                    // Regular order payment - redirect to order invoice
                    invoiceUrl = `/invoice/${data.order_id}`;
                    console.log(`🧾 Redirecting to order invoice: ${invoiceUrl}`);
                } else {
                    console.error('❌ No order_id or preorder_id found in response');
                    this.showError('Payment confirmed but unable to redirect to invoice');
                    return;
                }

                // Close modal and redirect to invoice
                setTimeout(() => {
                    this.closePayment();
                    console.log(`🔗 About to redirect to: ${invoiceUrl}`);
                    console.log(`📍 Current URL: ${window.location.href}`);
                    window.location.href = invoiceUrl;
                }, 1500);
            } else {
                console.error('❌ Payment confirmation failed:', data.error);
                this.showError('Failed to confirm payment: ' + data.error);
                // Re-enable button
                completedButton.disabled = false;
                completedButton.textContent = '✅ Payment Completed';
            }

        } catch (error) {
            console.error('Error confirming payment:', error);
            this.showError('An error occurred while confirming payment.');

            // Re-enable button
            const completedButton = this.paymentModal.querySelector('#payment-completed-btn');
            completedButton.disabled = false;
            completedButton.textContent = '✅ Payment Completed';
        }
    }

    /**
     * Clear cart after successful payment
     */
    async clearCart() {
        try {
            const response = await fetch('/api/cart/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();
            if (data.success) {
                console.log('🛒 Cart cleared after successful payment');
                // Update cart display if the function exists
                if (typeof updateCart === 'function') {
                    updateCart();
                }
            } else {
                console.error('Failed to clear cart:', data.error);
            }
        } catch (error) {
            console.error('Error clearing cart:', error);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        // Use unified notifications if available, otherwise fall back to alert
        if (window.unifiedNotifications) {
            window.unifiedNotifications.error(message);
        } else {
            alert(message);
        }
    }
}

// Initialize global payment handler
window.bakongPayment = new BakongPayment();

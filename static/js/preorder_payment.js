/**
 * Pre-Order QR Payment System
 * Handles QR code payment processing for pre-orders
 * Similar to bakong_payment.js but specifically for pre-orders
 */

class PreOrderPayment {
    constructor() {
        this.paymentModal = null;
        this.currentSession = null;
        this.statusCheckInterval = null;
        this.init();
    }

    init() {
        this.createPaymentModal();
        console.log('🔄 Pre-Order Payment System initialized');
    }

    /**
     * Create the payment modal HTML structure
     */
    createPaymentModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('preorder-payment-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal container
        const modal = document.createElement('div');
        modal.id = 'preorder-payment-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            z-index: 10000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            backdrop-filter: blur(5px);
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background-color: white;
            margin: 2% auto;
            padding: 0;
            border-radius: 15px;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            position: relative;
        `;

        // Create close button
        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            position: absolute;
            right: 15px;
            top: 10px;
            cursor: pointer;
            z-index: 1;
        `;
        closeBtn.onclick = () => this.closePayment();

        // Create modal header
        const header = document.createElement('div');
        header.style.cssText = `
            text-align: center;
            margin-bottom: 20px;
            padding: 20px 20px 0 20px;
            padding-right: 50px;
        `;
        header.innerHTML = `
            <h2 style="margin: 0; color: #333;">💳 Pre-Order Payment</h2>
            <p style="margin: 5px 0 0 0; color: #666; font-weight: bold;">ACLEDA Bank QR Payment</p>
            <p style="margin: 5px 0 0 0; color: #888; font-size: 14px;">Scan QR code with your mobile banking app</p>
        `;

        // Create QR code container
        const qrContainer = document.createElement('div');
        qrContainer.id = 'preorder-qr-code-container';
        qrContainer.style.cssText = `
            text-align: center;
            margin: 20px;
            padding: 20px;
            border: 2px dashed #ddd;
            border-radius: 8px;
            background-color: #fafafa;
        `;

        // Create status container
        const statusContainer = document.createElement('div');
        statusContainer.id = 'preorder-payment-status';
        statusContainer.style.cssText = `
            text-align: center;
            margin: 20px;
            padding: 15px;
            border-radius: 8px;
            background-color: #f8f9fa;
        `;

        // Create action buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            text-align: center;
            padding: 20px;
            border-top: 1px solid #eee;
        `;
        buttonContainer.innerHTML = `
            <button id="preorder-confirm-payment-btn" 
                    style="background: #28a745; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-size: 16px; cursor: pointer; margin-right: 10px;">
                ✅ Payment Completed
            </button>
            <button id="preorder-cancel-payment-btn" 
                    style="background: #dc3545; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-size: 16px; cursor: pointer;">
                ❌ Cancel
            </button>
        `;

        // Assemble modal
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(header);
        modalContent.appendChild(qrContainer);
        modalContent.appendChild(statusContainer);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);

        // Add to document
        document.body.appendChild(modal);
        this.paymentModal = modal;

        // Add event listeners
        document.getElementById('preorder-confirm-payment-btn').onclick = () => this.confirmPayment();
        document.getElementById('preorder-cancel-payment-btn').onclick = () => this.closePayment();

        // Close modal when clicking outside
        modal.onclick = (event) => {
            if (event.target === modal) {
                this.closePayment();
            }
        };
    }

    /**
     * Start payment process for a pre-order
     */
    async startPayment(preOrderId, paymentAmount, paymentType = 'deposit') {
        try {
            console.log(`🔄 Starting pre-order payment: ${preOrderId}, Amount: $${paymentAmount}, Type: ${paymentType}`);
            
            this.showLoadingState();

            // Create payment session
            const response = await fetch('/api/preorder/payment/qr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pre_order_id: preOrderId,
                    payment_amount: paymentAmount,
                    payment_type: paymentType
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to create payment session');
            }

            this.currentSession = data.session;
            this.displayQRCode(data.session);
            this.startStatusChecking();

        } catch (error) {
            console.error('❌ Payment error:', error);
            alert('Error starting payment: ' + error.message);
            this.closePayment();
        }
    }

    /**
     * Display QR code in the modal
     */
    displayQRCode(session) {
        const qrContainer = this.paymentModal.querySelector('#preorder-qr-code-container');
        const paymentAmount = session.payment_amount || session.total_amount;
        
        qrContainer.innerHTML = `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border: 2px solid #e9ecef;">
                <img src="data:image/png;base64,${session.qr_data.qr_image_base64}"
                     alt="ACLEDA Bank QR Code - Pre-Order Payment"
                     style="max-width: 280px; max-height: 280px; border: 2px solid #ddd; border-radius: 8px; background: white; padding: 10px;">
                <div style="margin-top: 15px;">
                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #333;">
                        💰 Pay: $${paymentAmount.toFixed(2)} USD
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

        this.updatePaymentStatus('Scan QR code and pay, then click "Payment Completed"', 'pending');
        this.paymentModal.style.display = 'block';
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const qrContainer = this.paymentModal.querySelector('#preorder-qr-code-container');
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
        const statusContainer = this.paymentModal.querySelector('#preorder-payment-status');
        
        let statusColor = '#6c757d';
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
        }
        
        statusContainer.innerHTML = `
            <div style="color: ${statusColor}; font-weight: bold;">
                ${statusIcon} ${message}
            </div>
        `;
    }

    /**
     * Start checking payment status
     */
    startStatusChecking() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }
        
        this.statusCheckInterval = setInterval(() => {
            this.checkPaymentStatus();
        }, 3000); // Check every 3 seconds
    }

    /**
     * Check payment status with server
     */
    async checkPaymentStatus() {
        if (!this.currentSession) return;
        
        try {
            const response = await fetch(`/api/payment/status/${this.currentSession.id}`);
            const data = await response.json();
            
            if (data.success && data.status === 'expired') {
                this.updatePaymentStatus('Payment session expired. Please try again.', 'failed');
                this.stopStatusChecking();
            }
        } catch (error) {
            console.error('Error checking payment status:', error);
        }
    }

    /**
     * Confirm payment completion
     */
    async confirmPayment() {
        if (!this.currentSession) {
            alert('No active payment session');
            return;
        }

        try {
            this.updatePaymentStatus('Processing payment confirmation...', 'pending');

            const response = await fetch('/api/preorder/payment/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.currentSession.id
                })
            });

            const data = await response.json();

            if (data.success) {
                this.updatePaymentStatus('Payment confirmed successfully!', 'completed');

                setTimeout(() => {
                    this.closePayment();
                    // Redirect to pre-order invoice page
                    if (data.pre_order_id || data.preorder_id) {
                        const preorderId = data.pre_order_id || data.preorder_id;
                        window.location.href = `/preorder/invoice/${preorderId}`;
                    } else {
                        // Fallback: reload page to show updated pre-order status
                        window.location.reload();
                    }
                }, 2000);
            } else {
                throw new Error(data.error || 'Payment confirmation failed');
            }

        } catch (error) {
            console.error('❌ Payment confirmation error:', error);
            this.updatePaymentStatus('Payment confirmation failed: ' + error.message, 'failed');
        }
    }

    /**
     * Stop status checking
     */
    stopStatusChecking() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }

    /**
     * Close payment modal
     */
    closePayment() {
        this.stopStatusChecking();
        this.currentSession = null;
        
        if (this.paymentModal) {
            this.paymentModal.style.display = 'none';
        }
    }
}

// Initialize pre-order payment system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.preorderPayment = new PreOrderPayment();
});

// Helper function to start pre-order payment (called from HTML)
function startPreOrderPayment(preOrderId, paymentAmount, paymentType = 'deposit') {
    if (window.preorderPayment) {
        window.preorderPayment.startPayment(preOrderId, paymentAmount, paymentType);
    } else {
        console.error('Pre-order payment system not initialized');
    }
}

/**
 * KHQR Payment Handler
 * Handles KHQR payment flow with QR code generation and payment verification
 */

class KHQRPayment {
    constructor() {
        this.currentPayment = null;
        this.statusCheckInterval = null;
        this.successCallback = null;
        this.errorCallback = null;
        
        console.log('🔥 KHQR Payment system initialized');
    }

    /**
     * Set success callback function
     */
    setSuccessCallback(callback) {
        this.successCallback = callback;
    }

    /**
     * Set error callback function
     */
    setErrorCallback(callback) {
        this.errorCallback = callback;
    }

    /**
     * Check if test button should be shown (for development)
     */
    shouldShowTestButton() {
        // Show test button if URL contains ?test=true or if in development
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('test') === 'true' || window.location.hostname === 'localhost';
    }

    /**
     * Start KHQR payment process
     */
    async startPayment(amount, currency = 'USD', referenceId = null) {
        try {
            console.log(`🔄 Starting KHQR payment: ${amount} ${currency}`);
            
            // Create payment
            const response = await fetch('/api/khqr/create-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amount,
                    currency: currency,
                    reference_id: referenceId || `KHQR_${Date.now()}`
                })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to create payment');
            }

            console.log('✅ KHQR payment created:', result);

            // Store current payment info
            this.currentPayment = result;

            // Show payment modal
            this.showPaymentModal(result);

            // Start checking payment status after 10 seconds
            setTimeout(() => {
                this.startStatusChecking();
            }, 10000);

        } catch (error) {
            console.error('❌ Error starting KHQR payment:', error);
            this.onPaymentError(error.message);
        }
    }

    /**
     * Show payment modal with QR code
     */
    showPaymentModal(paymentData) {
        // Remove existing modal if any
        const existingModal = document.getElementById('khqr-payment-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalHTML = `
            <div id="khqr-payment-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: Arial, sans-serif;
            ">
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 15px;
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                ">
                    <h2 style="margin: 0 0 20px 0; color: #2c5aa0;">KHQR Payment</h2>
                    
                    <div style="margin: 20px 0;">
                        <div style="font-size: 24px; font-weight: bold; color: #333;">
                            ${paymentData.currency} ${paymentData.amount}
                        </div>
                        <div style="font-size: 14px; color: #666; margin-top: 5px;">
                            Reference: ${paymentData.reference_id}
                        </div>
                    </div>

                    <div id="khqr-qr-container" style="margin: 20px 0;">
                        <!-- QR code will be inserted here -->
                    </div>

                    <div id="khqr-status" style="
                        margin: 20px 0;
                        padding: 10px;
                        background-color: #fff3cd;
                        border: 1px solid #ffeaa7;
                        border-radius: 5px;
                        color: #856404;
                    ">
                        ⏳ Waiting for payment...
                    </div>

                    <div style="margin-top: 20px;">
                        ${this.shouldShowTestButton() ? `
                        <button onclick="window.khqrPayment.testPayment()" style="
                            background-color: #ffc107;
                            color: #212529;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                            margin-right: 10px;
                        ">🧪 Test Payment</button>
                        ` : ''}
                        <button onclick="window.khqrPayment.cancelPayment()" style="
                            background-color: #6c757d;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Cancel Payment</button>
                    </div>

                    <div style="margin-top: 15px; font-size: 12px; color: #666;">
                        <strong>Compatible Apps:</strong><br>
                        ACLEDA Mobile • ABA Mobile • Wing Bank • Pi Pay
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Generate QR code
        this.generateQRCode(paymentData.qr_data);
    }

    /**
     * Generate QR code using QRCode.js library
     */
    generateQRCode(qrData) {
        const container = document.getElementById('khqr-qr-container');
        if (!container) return;

        // Clear container
        container.innerHTML = '';

        // Check if QRCode library is available
        if (typeof QRCode !== 'undefined') {
            // Use QRCode.js library if available
            new QRCode(container, {
                text: qrData,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
        } else {
            // Fallback: Use online QR code generator
            const qrImg = document.createElement('img');
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
            qrImg.style.width = '200px';
            qrImg.style.height = '200px';
            qrImg.style.border = '1px solid #ddd';
            container.appendChild(qrImg);
        }

        // Add scan instruction
        const instruction = document.createElement('div');
        instruction.style.marginTop = '10px';
        instruction.style.fontSize = '14px';
        instruction.style.color = '#666';
        instruction.innerHTML = '📱 Scan QR code to pay';
        container.appendChild(instruction);
    }

    /**
     * Start checking payment status
     */
    startStatusChecking() {
        if (!this.currentPayment) return;

        console.log('🔍 Starting payment status checking...');

        this.statusCheckInterval = setInterval(async () => {
            await this.checkPaymentStatus();
        }, 3000); // Check every 3 seconds
    }

    /**
     * Check payment status
     */
    async checkPaymentStatus() {
        if (!this.currentPayment) return;

        try {
            console.log(`🔍 Checking payment status for: ${this.currentPayment.payment_id}`);
            
            const response = await fetch(`/api/khqr/check-payment/${this.currentPayment.payment_id}`);
            const result = await response.json();

            if (!result.success) {
                console.error('❌ Error checking payment status:', result.error);
                return;
            }

            console.log('📊 Payment status:', result.status);

            if (result.status === 'completed') {
                console.log('🎉 Payment completed!');
                this.onPaymentSuccess(result);
            } else if (result.status === 'failed') {
                console.log('❌ Payment failed');
                this.onPaymentError('Payment failed');
            } else if (result.status === 'expired') {
                console.log('⏰ Payment expired');
                this.onPaymentError('Payment session expired');
            }
            // If status is 'pending', continue checking

        } catch (error) {
            console.error('❌ Error checking payment status:', error);
        }
    }

    /**
     * Handle successful payment
     */
    onPaymentSuccess(result) {
        console.log('🎉 Payment success handler called with result:', result);

        // Stop status checking
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }

        // Update status display
        const statusElement = document.getElementById('khqr-status');
        if (statusElement) {
            statusElement.style.backgroundColor = '#d4edda';
            statusElement.style.borderColor = '#c3e6cb';
            statusElement.style.color = '#155724';
            statusElement.innerHTML = '✅ Payment Successful!';
        }

        // Close modal after 2 seconds
        setTimeout(() => {
            this.closeModal();
        }, 2000);

        // Call success callback
        if (this.successCallback) {
            console.log('📞 Calling success callback with result:', result);
            this.successCallback(result);
        } else {
            console.log('⚠️ No success callback defined');
        }

        // Reset current payment
        this.currentPayment = null;
    }

    /**
     * Handle payment error
     */
    onPaymentError(errorMessage) {
        // Stop status checking
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }

        // Update status display
        const statusElement = document.getElementById('khqr-status');
        if (statusElement) {
            statusElement.style.backgroundColor = '#f8d7da';
            statusElement.style.borderColor = '#f5c6cb';
            statusElement.style.color = '#721c24';
            statusElement.innerHTML = `❌ ${errorMessage}`;
        }

        // Call error callback
        if (this.errorCallback) {
            this.errorCallback(errorMessage);
        }

        console.error('❌ KHQR Payment error:', errorMessage);
    }

    /**
     * Test payment - simulate successful payment
     */
    async testPayment() {
        console.log('🧪 Testing KHQR payment...');

        try {
            // Stop any existing status checking
            if (this.statusCheckInterval) {
                clearInterval(this.statusCheckInterval);
                this.statusCheckInterval = null;
            }

            // Create test order via API
            const response = await fetch('/api/khqr/test-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: this.currentPayment ? this.currentPayment.amount : 0.01
                })
            });

            const result = await response.json();
            console.log('🧪 Test order API response:', result);

            if (result.success) {
                // Simulate successful payment
                const testResult = {
                    success: true,
                    status: 'completed',
                    payment_id: this.currentPayment ? this.currentPayment.payment_id : 'TEST_' + Date.now(),
                    order_id: result.order_id,
                    amount: result.amount,
                    currency: result.currency,
                    reference_id: result.reference_id,
                    completed_at: new Date().toISOString(),
                    invoice_url: result.invoice_url
                };

                console.log('🧪 Simulating payment success with result:', testResult);
                this.onPaymentSuccess(testResult);
            } else {
                console.error('❌ Test order creation failed:', result.error);
                this.onPaymentError(`Test failed: ${result.error}`);
            }

        } catch (error) {
            console.error('❌ Error in test payment:', error);
            this.onPaymentError(`Test error: ${error.message}`);
        }
    }

    /**
     * Cancel payment
     */
    cancelPayment() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }

        this.currentPayment = null;
        this.closeModal();
    }

    /**
     * Close payment modal
     */
    closeModal() {
        const modal = document.getElementById('khqr-payment-modal');
        if (modal) {
            modal.remove();
        }
    }
}

// Create global instance
window.khqrPayment = new KHQRPayment();

console.log('🚀 KHQR Payment JavaScript loaded successfully');

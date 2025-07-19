/**
 * SweetAlert2-Style Custom Modal Notification System
 * Modern, attractive modal notifications with animations and customization
 */

class SweetAlert {
    constructor() {
        this.currentAlert = null;
        this.queue = [];
        this.isShowing = false;
    }

    /**
     * Show a custom alert modal
     * @param {Object} options - Alert configuration
     */
    fire(options = {}) {
        const config = {
            title: options.title || '',
            text: options.text || '',
            html: options.html || '',
            icon: options.icon || 'info', // success, error, warning, info, question
            showConfirmButton: options.showConfirmButton !== false,
            showCancelButton: options.showCancelButton || false,
            confirmButtonText: options.confirmButtonText || 'OK',
            cancelButtonText: options.cancelButtonText || 'Cancel',
            confirmButtonColor: options.confirmButtonColor || 'confirm',
            cancelButtonColor: options.cancelButtonColor || 'cancel',
            allowOutsideClick: options.allowOutsideClick !== false,
            allowEscapeKey: options.allowEscapeKey !== false,
            showCloseButton: options.showCloseButton || false,
            timer: options.timer || null,
            input: options.input || null, // text, email, password, textarea, select, radio, checkbox
            inputPlaceholder: options.inputPlaceholder || '',
            inputValue: options.inputValue || '',
            preConfirm: options.preConfirm || null,
            onOpen: options.onOpen || null,
            onClose: options.onClose || null,
            customClass: options.customClass || {},
            ...options
        };

        return new Promise((resolve, reject) => {
            if (this.isShowing) {
                this.queue.push({ config, resolve, reject });
                return;
            }

            this.showAlert(config, resolve, reject);
        });
    }

    showAlert(config, resolve, reject) {
        this.isShowing = true;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'sweet-alert-overlay';
        
        // Create alert container
        const alert = document.createElement('div');
        alert.className = 'sweet-alert';
        
        // Build alert content
        let alertHTML = '';
        
        // Header
        alertHTML += '<div class="sweet-alert-header">';
        
        // Icon
        if (config.icon) {
            const iconSymbols = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ',
                question: '?'
            };
            alertHTML += `<div class="sweet-alert-icon ${config.icon}">${iconSymbols[config.icon] || iconSymbols.info}</div>`;
        }
        
        // Title
        if (config.title) {
            alertHTML += `<h2 class="sweet-alert-title">${config.title}</h2>`;
        }
        
        // Text
        if (config.text) {
            alertHTML += `<p class="sweet-alert-text">${config.text}</p>`;
        }
        
        alertHTML += '</div>';
        
        // Body
        if (config.html || config.input) {
            alertHTML += '<div class="sweet-alert-body">';
            
            if (config.html) {
                alertHTML += `<div class="sweet-alert-html">${config.html}</div>`;
            }
            
            if (config.input) {
                alertHTML += this.createInput(config);
            }
            
            alertHTML += '</div>';
        }
        
        // Footer
        if (config.showConfirmButton || config.showCancelButton) {
            alertHTML += '<div class="sweet-alert-footer">';
            
            if (config.showCancelButton) {
                alertHTML += `<button class="sweet-alert-btn ${config.cancelButtonColor}" data-action="cancel">${config.cancelButtonText}</button>`;
            }
            
            if (config.showConfirmButton) {
                alertHTML += `<button class="sweet-alert-btn ${config.confirmButtonColor}" data-action="confirm">${config.confirmButtonText}</button>`;
            }
            
            alertHTML += '</div>';
        }
        
        // Close button
        if (config.showCloseButton) {
            alertHTML += '<button class="sweet-alert-close" data-action="close">&times;</button>';
        }
        
        alert.innerHTML = alertHTML;
        overlay.appendChild(alert);
        document.body.appendChild(overlay);
        
        this.currentAlert = overlay;
        
        // Show with animation
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);
        
        // Set up event listeners
        this.setupEventListeners(overlay, config, resolve, reject);
        
        // Auto-close timer
        if (config.timer) {
            setTimeout(() => {
                this.close(resolve, { isConfirmed: false, isDismissed: true, dismiss: 'timer' });
            }, config.timer);
        }
        
        // Call onOpen callback
        if (config.onOpen) {
            config.onOpen(alert);
        }
    }

    createInput(config) {
        const inputTypes = {
            text: `<input type="text" class="sweet-alert-input" placeholder="${config.inputPlaceholder}" value="${config.inputValue}">`,
            email: `<input type="email" class="sweet-alert-input" placeholder="${config.inputPlaceholder}" value="${config.inputValue}">`,
            password: `<input type="password" class="sweet-alert-input" placeholder="${config.inputPlaceholder}" value="${config.inputValue}">`,
            textarea: `<textarea class="sweet-alert-input" placeholder="${config.inputPlaceholder}" rows="4">${config.inputValue}</textarea>`
        };
        
        return inputTypes[config.input] || inputTypes.text;
    }

    setupEventListeners(overlay, config, resolve, reject) {
        // Button clicks
        overlay.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            
            if (action === 'confirm') {
                this.handleConfirm(config, resolve, reject);
            } else if (action === 'cancel' || action === 'close') {
                this.close(resolve, { isConfirmed: false, isDismissed: true, dismiss: action });
            }
        });
        
        // Outside click
        if (config.allowOutsideClick) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.close(resolve, { isConfirmed: false, isDismissed: true, dismiss: 'overlay' });
                }
            });
        }
        
        // Escape key
        if (config.allowEscapeKey) {
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escapeHandler);
                    this.close(resolve, { isConfirmed: false, isDismissed: true, dismiss: 'esc' });
                }
            };
            document.addEventListener('keydown', escapeHandler);
        }
    }

    handleConfirm(config, resolve, reject) {
        let inputValue = null;
        
        if (config.input) {
            const inputElement = this.currentAlert.querySelector('.sweet-alert-input');
            inputValue = inputElement ? inputElement.value : null;
        }
        
        if (config.preConfirm) {
            const result = config.preConfirm(inputValue);
            if (result === false) {
                return; // Prevent closing
            }
        }
        
        this.close(resolve, { 
            isConfirmed: true, 
            isDismissed: false, 
            value: inputValue 
        });
    }

    close(resolve, result) {
        if (!this.currentAlert) return;
        
        const overlay = this.currentAlert;
        overlay.classList.remove('show');
        
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            this.currentAlert = null;
            this.isShowing = false;
            
            // Process queue
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                setTimeout(() => {
                    this.showAlert(next.config, next.resolve, next.reject);
                }, 100);
            }
        }, 300);
        
        resolve(result);
    }

    // Convenience methods
    success(title, text, options = {}) {
        return this.fire({
            title,
            text,
            icon: 'success',
            confirmButtonColor: 'success',
            ...options
        });
    }

    error(title, text, options = {}) {
        return this.fire({
            title,
            text,
            icon: 'error',
            confirmButtonColor: 'danger',
            ...options
        });
    }

    warning(title, text, options = {}) {
        return this.fire({
            title,
            text,
            icon: 'warning',
            confirmButtonColor: 'warning',
            ...options
        });
    }

    info(title, text, options = {}) {
        return this.fire({
            title,
            text,
            icon: 'info',
            ...options
        });
    }

    question(title, text, options = {}) {
        return this.fire({
            title,
            text,
            icon: 'question',
            showCancelButton: true,
            ...options
        });
    }

    // Cart-specific method
    cartSuccess(message, showViewCart = true) {
        const options = {
            title: 'Success!',
            text: message,
            icon: 'success',
            confirmButtonColor: 'success'
        };

        if (showViewCart) {
            options.showCancelButton = true;
            options.confirmButtonText = 'View Cart';
            options.cancelButtonText = 'Continue Shopping';
            
            return this.fire(options).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/cart';
                }
                return result;
            });
        }

        return this.fire(options);
    }
}

// Initialize global SweetAlert instance
const Swal = new SweetAlert();

// Make it available globally
window.Swal = Swal;
window.sweetAlert = Swal;

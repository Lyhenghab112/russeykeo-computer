/**
 * Modern Forms JavaScript - Handles floating labels, validation, and animations
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeModernForms();
});

function initializeModernForms() {
    // Initialize floating labels
    initFloatingLabels();
    
    // Initialize validation
    initFormValidation();
    
    // Initialize file inputs
    initFileInputs();
    
    // Initialize modern selects
    initModernSelects();
}

/**
 * Floating Labels Functionality
 */
function initFloatingLabels() {
    const modernInputs = document.querySelectorAll('.modern-input, .modern-textarea, .modern-select');
    
    modernInputs.forEach(input => {
        // Handle initial state (page load with pre-filled values)
        updateLabelState(input);
        
        // Handle input events
        input.addEventListener('input', () => updateLabelState(input));
        input.addEventListener('change', () => updateLabelState(input));
        input.addEventListener('blur', () => updateLabelState(input));
        input.addEventListener('focus', () => updateLabelState(input));
        
        // Handle browser autofill
        setTimeout(() => updateLabelState(input), 100);
    });
}

function updateLabelState(input) {
    const inputGroup = input.closest('.modern-input-group');
    if (!inputGroup) return;
    
    // Check if input has value (including autofilled values and select options)
    let hasValue = false;
    
    if (input.tagName.toLowerCase() === 'select') {
        hasValue = input.value !== '' && input.value !== null;
    } else {
        hasValue = input.value !== '' || input.matches(':valid') || input.matches(':-webkit-autofill');
    }
    
    if (hasValue) {
        input.classList.add('has-value');
        inputGroup.classList.add('has-value');
    } else {
        input.classList.remove('has-value');
        inputGroup.classList.remove('has-value');
    }
}

/**
 * Form Validation
 */
function initFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('.modern-input, .modern-textarea, .modern-select');
        
        inputs.forEach(input => {
            // Real-time validation on input
            input.addEventListener('input', () => validateInput(input));
            input.addEventListener('blur', () => validateInput(input));
            input.addEventListener('change', () => validateInput(input));
        });
        
        // Form submission validation
        form.addEventListener('submit', (e) => {
            let isValid = true;
            
            inputs.forEach(input => {
                if (!validateInput(input)) {
                    isValid = false;
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                
                // Focus first invalid input
                const firstInvalid = form.querySelector('.modern-input-group.error .modern-input, .modern-input-group.error .modern-textarea, .modern-input-group.error .modern-select');
                if (firstInvalid) {
                    firstInvalid.focus();
                    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    });
}

function validateInput(input) {
    const inputGroup = input.closest('.modern-input-group');
    if (!inputGroup) return true;
    
    let isValid = true;
    let errorMessage = '';
    
    // Required field validation
    if (input.hasAttribute('required') && (!input.value || input.value.trim() === '')) {
        isValid = false;
        errorMessage = getFieldName(input) + ' is required';
    }
    
    // Email validation
    else if (input.type === 'email' && input.value && !isValidEmail(input.value)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address';
    }
    
    // Number validation
    else if (input.type === 'number' && input.value) {
        const num = parseFloat(input.value);
        if (isNaN(num)) {
            isValid = false;
            errorMessage = 'Please enter a valid number';
        } else if (input.hasAttribute('min') && num < parseFloat(input.getAttribute('min'))) {
            isValid = false;
            errorMessage = `Minimum value is ${input.getAttribute('min')}`;
        } else if (input.hasAttribute('max') && num > parseFloat(input.getAttribute('max'))) {
            isValid = false;
            errorMessage = `Maximum value is ${input.getAttribute('max')}`;
        }
    }
    
    // Price validation (special case)
    else if (input.name === 'price' && input.value) {
        const price = parseFloat(input.value);
        if (price <= 0) {
            isValid = false;
            errorMessage = 'Price must be greater than 0';
        }
    }
    
    // Update UI based on validation result
    updateValidationState(inputGroup, isValid, errorMessage);
    
    return isValid;
}

function updateValidationState(inputGroup, isValid, errorMessage) {
    const errorDiv = inputGroup.querySelector('.error-message');
    
    // Remove existing states
    inputGroup.classList.remove('valid', 'error');
    
    if (isValid) {
        inputGroup.classList.add('valid');
    } else {
        inputGroup.classList.add('error');
        if (errorDiv && errorMessage) {
            errorDiv.textContent = errorMessage;
        }
    }
}

function getFieldName(input) {
    const label = input.closest('.modern-input-group').querySelector('.modern-label');
    if (label) {
        return label.textContent.replace('*', '').trim();
    }
    return 'This field';
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * File Input Enhancement
 */
function initFileInputs() {
    const fileInputs = document.querySelectorAll('.modern-file-input input[type="file"]');
    
    fileInputs.forEach(input => {
        const fileInput = input.closest('.modern-file-input');
        const label = fileInput.querySelector('.modern-file-label');
        
        input.addEventListener('change', function() {
            updateFileInputState(this, fileInput, label);
        });
        
        // Drag and drop functionality
        label.addEventListener('dragover', (e) => {
            e.preventDefault();
            label.style.borderColor = '#3b82f6';
            label.style.backgroundColor = '#eff6ff';
        });
        
        label.addEventListener('dragleave', (e) => {
            e.preventDefault();
            label.style.borderColor = '#d1d5db';
            label.style.backgroundColor = '#f9fafb';
        });
        
        label.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                input.files = files;
                updateFileInputState(input, fileInput, label);
            }
            label.style.borderColor = '#d1d5db';
            label.style.backgroundColor = '#f9fafb';
        });
    });
}

function updateFileInputState(input, fileInput, label) {
    if (input.files && input.files.length > 0) {
        fileInput.classList.add('has-files');
        
        if (input.files.length === 1) {
            label.innerHTML = `
                <span style="font-size: 24px; margin-right: 8px;">📁</span>
                <span>${input.files[0].name}</span>
            `;
        } else {
            label.innerHTML = `
                <span style="font-size: 24px; margin-right: 8px;">📁</span>
                <span>${input.files.length} files selected</span>
            `;
        }
    } else {
        fileInput.classList.remove('has-files');
        label.innerHTML = `
            <span style="font-size: 24px; margin-right: 8px;">📁</span>
            <span>Choose Images or Drag & Drop</span>
        `;
    }
}

/**
 * Modern Select Enhancement
 */
function initModernSelects() {
    const selects = document.querySelectorAll('.modern-select');
    
    selects.forEach(select => {
        select.addEventListener('change', function() {
            const inputGroup = this.closest('.modern-input-group');
            if (inputGroup) {
                if (this.value) {
                    inputGroup.classList.add('valid');
                    inputGroup.classList.remove('error');
                } else if (this.hasAttribute('required')) {
                    inputGroup.classList.add('error');
                    inputGroup.classList.remove('valid');
                }
            }
        });
    });
}

/**
 * Utility Functions
 */

// Add smooth animations to form sections
function animateFormSection(section) {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        section.style.transition = 'all 0.3s ease-out';
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
    }, 100);
}

// Form reset with proper label handling
function resetModernForm(form) {
    form.reset();
    
    // Reset all input groups
    const inputGroups = form.querySelectorAll('.modern-input-group');
    inputGroups.forEach(group => {
        group.classList.remove('valid', 'error');
        const input = group.querySelector('.modern-input, .modern-textarea, .modern-select');
        if (input) {
            input.classList.remove('has-value');
        }
    });
    
    // Reset file inputs
    const fileInputs = form.querySelectorAll('.modern-file-input');
    fileInputs.forEach(fileInput => {
        fileInput.classList.remove('has-files');
        const label = fileInput.querySelector('.modern-file-label');
        if (label) {
            label.innerHTML = `
                <span style="font-size: 24px; margin-right: 8px;">📁</span>
                <span>Choose Images or Drag & Drop</span>
            `;
        }
    });
}

// Auto-detect browser autofill and update labels
function detectAutofill() {
    const inputs = document.querySelectorAll('.modern-input, .modern-textarea');
    
    inputs.forEach(input => {
        if (input.matches(':-webkit-autofill')) {
            updateLabelState(input);
        }
    });
}

// Run autofill detection periodically
setInterval(detectAutofill, 500);

// Export functions for global use
window.modernForms = {
    resetForm: resetModernForm,
    validateInput: validateInput,
    updateLabelState: updateLabelState,
    animateFormSection: animateFormSection
};

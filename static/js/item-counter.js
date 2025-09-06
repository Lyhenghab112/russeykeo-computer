/**
 * Item Counter Module
 * Provides reusable functionality for displaying item counts and pagination info
 * across different pages in the computer shop system.
 */

class ItemCounter {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            itemName: options.itemName || 'items',
            itemNameSingular: options.itemNameSingular || 'item',
            showPageInfo: options.showPageInfo !== false,
            showItemRange: options.showItemRange !== false,
            className: options.className || 'item-counter',
            position: options.position || 'bottom', // 'top', 'bottom', or 'both'
            ...options
        };
        
        this.init();
    }

    init() {
        if (!this.container) {
            console.warn(`ItemCounter: Container with ID "${this.containerId}" not found`);
            return;
        }

        this.createCounterElements();
        this.addStyles();
    }

    createCounterElements() {
        // Create counter HTML structure
        const counterHTML = `
            <div class="${this.options.className}">
                <div class="item-counter-content">
                    <div class="item-range-info">
                        <span class="item-range-text"></span>
                    </div>
                    <div class="page-info">
                        <span class="page-info-text"></span>
                    </div>
                </div>
            </div>
        `;

        // Add counter based on position preference
        if (this.options.position === 'top' || this.options.position === 'both') {
            this.topCounter = this.createCounter('top');
            this.container.insertAdjacentElement('afterbegin', this.topCounter);
        }

        if (this.options.position === 'bottom' || this.options.position === 'both') {
            this.bottomCounter = this.createCounter('bottom');
            this.container.insertAdjacentElement('beforeend', this.bottomCounter);
        }
    }

    createCounter(position) {
        const counter = document.createElement('div');
        counter.className = `${this.options.className} ${this.options.className}-${position}`;
        counter.innerHTML = `
            <div class="item-counter-content">
                <div class="item-counter-main">
                    <i class="fas fa-list-ul"></i>
                    <span class="item-range-text">Loading...</span>
                </div>
                <div class="item-counter-secondary">
                    <i class="fas fa-file-alt"></i>
                    <span class="page-info-text"></span>
                </div>
            </div>
        `;
        return counter;
    }

    addStyles() {
        if (document.getElementById('item-counter-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'item-counter-styles';
        styles.textContent = `
            .item-counter {
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 12px 16px;
                margin: 10px 0;
                font-size: 0.9rem;
                color: #495057;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                transition: all 0.3s ease;
                position: relative;
                z-index: 10;
            }

            .item-counter-bottom {
                margin-top: 15px;
                margin-bottom: 5px;
                border-top: 2px solid transparent;
            }

            .item-counter:hover {
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                transform: translateY(-1px);
            }

            .item-counter-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
            }

            .item-counter-main {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                color: #2c3e50;
            }

            .item-counter-secondary {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #6c757d;
                font-size: 0.85rem;
            }

            .item-counter i {
                width: 16px;
                text-align: center;
            }

            .item-counter-main i {
                color: #007bff;
            }

            .item-counter-secondary i {
                color: #6c757d;
            }

            .item-range-text {
                font-weight: 600;
            }

            .page-info-text {
                font-weight: 500;
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .item-counter {
                    padding: 10px 12px;
                    font-size: 0.85rem;
                }

                .item-counter-content {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 6px;
                }

                .item-counter-main,
                .item-counter-secondary {
                    font-size: 0.8rem;
                }
            }

            /* Animation for updates */
            .item-counter.updating {
                opacity: 0.7;
                transform: scale(0.98);
            }

            .item-counter.updated {
                animation: counterUpdate 0.5s ease;
            }

            @keyframes counterUpdate {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); }
            }

            /* Different themes */
            .item-counter.theme-primary {
                background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                border-color: #2196f3;
            }

            .item-counter.theme-primary.item-counter-bottom {
                border-top-color: #2196f3;
            }

            .item-counter.theme-success {
                background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
                border-color: #4caf50;
            }

            .item-counter.theme-success.item-counter-bottom {
                border-top-color: #4caf50;
            }

            .item-counter.theme-warning {
                background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
                border-color: #ff9800;
            }

            .item-counter.theme-warning.item-counter-bottom {
                border-top-color: #ff9800;
            }

            .item-counter.theme-info {
                background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
                border-color: #009688;
            }

            .item-counter.theme-info.item-counter-bottom {
                border-top-color: #009688;
            }
        `;
        document.head.appendChild(styles);
    }

    update(data) {
        const {
            totalItems = 0,
            currentPage = 1,
            pageSize = 10,
            totalPages = 1,
            startItem = 1,
            endItem = 0
        } = data;

        // Calculate display values
        const actualStartItem = totalItems === 0 ? 0 : startItem;
        const actualEndItem = Math.min(endItem, totalItems);
        
        // Generate text content
        const itemRangeText = this.generateItemRangeText(actualStartItem, actualEndItem, totalItems);
        const pageInfoText = this.generatePageInfoText(currentPage, totalPages);

        // Update all counter instances
        this.updateCounterText(this.topCounter, itemRangeText, pageInfoText);
        this.updateCounterText(this.bottomCounter, itemRangeText, pageInfoText);

        // Add update animation
        this.animateUpdate();
    }

    updateCounterText(counter, itemRangeText, pageInfoText) {
        if (!counter) return;

        const itemRangeElement = counter.querySelector('.item-range-text');
        const pageInfoElement = counter.querySelector('.page-info-text');

        if (itemRangeElement) itemRangeElement.textContent = itemRangeText;
        if (pageInfoElement) pageInfoElement.textContent = pageInfoText;
    }

    generateItemRangeText(startItem, endItem, totalItems) {
        if (totalItems === 0) {
            return `No ${this.options.itemName} found`;
        }

        if (totalItems === 1) {
            return `Showing 1 ${this.options.itemNameSingular}`;
        }

        if (startItem === endItem) {
            return `Showing ${startItem} of ${totalItems} ${this.options.itemName}`;
        }

        return `Showing ${startItem}-${endItem} of ${totalItems} ${this.options.itemName}`;
    }

    generatePageInfoText(currentPage, totalPages) {
        if (totalPages <= 1) {
            return totalPages === 1 ? 'Page 1 of 1' : '';
        }

        return `Page ${currentPage} of ${totalPages}`;
    }

    animateUpdate() {
        const counters = [this.topCounter, this.bottomCounter].filter(Boolean);
        
        counters.forEach(counter => {
            counter.classList.add('updating');
            
            setTimeout(() => {
                counter.classList.remove('updating');
                counter.classList.add('updated');
                
                setTimeout(() => {
                    counter.classList.remove('updated');
                }, 500);
            }, 150);
        });
    }

    setTheme(theme) {
        const counters = [this.topCounter, this.bottomCounter].filter(Boolean);
        const themes = ['theme-primary', 'theme-success', 'theme-warning', 'theme-info'];
        
        counters.forEach(counter => {
            // Remove existing themes
            themes.forEach(t => counter.classList.remove(t));
            // Add new theme
            if (theme && themes.includes(`theme-${theme}`)) {
                counter.classList.add(`theme-${theme}`);
            }
        });
    }

    hide() {
        const counters = [this.topCounter, this.bottomCounter].filter(Boolean);
        counters.forEach(counter => {
            counter.style.display = 'none';
        });
    }

    show() {
        const counters = [this.topCounter, this.bottomCounter].filter(Boolean);
        counters.forEach(counter => {
            counter.style.display = 'block';
        });
    }

    destroy() {
        if (this.topCounter) this.topCounter.remove();
        if (this.bottomCounter) this.bottomCounter.remove();
    }
}

// Export for use in other modules
window.ItemCounter = ItemCounter;

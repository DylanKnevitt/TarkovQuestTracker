/**
 * Item Detail Modal Component
 * Feature: 003-item-tracker
 * Shows detailed item information with sources and wiki link
 */

/**
 * T078-T084: ItemDetailModal component
 * Displays item details in a modal overlay
 */
export class ItemDetailModal {
    constructor() {
        this.modalElement = null;
        this.currentItem = null;
    }

    /**
     * T079: Show modal with item details
     * @param {AggregatedItem} aggregatedItem
     */
    show(aggregatedItem) {
        this.currentItem = aggregatedItem;
        
        // Create or update modal
        if (!this.modalElement) {
            this.createModal();
        }
        
        // Render item details
        this.render();
        
        // Show modal
        this.modalElement.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
        
        // Focus trap
        this.modalElement.querySelector('.modal-close-btn')?.focus();
    }

    /**
     * Hide modal
     */
    hide() {
        if (this.modalElement) {
            this.modalElement.classList.remove('active');
            document.body.style.overflow = ''; // Restore scroll
        }
        this.currentItem = null;
    }

    /**
     * Create modal element and append to body
     */
    createModal() {
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'item-detail-modal';
        this.modalElement.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <button class="modal-close-btn" aria-label="Close">&times;</button>
                <div class="modal-body"></div>
            </div>
        `;
        
        document.body.appendChild(this.modalElement);
        
        // T087: Add close button handler
        this.modalElement.querySelector('.modal-close-btn')?.addEventListener('click', () => {
            this.hide();
        });
        
        // T089: Add overlay click handler
        this.modalElement.querySelector('.modal-overlay')?.addEventListener('click', () => {
            this.hide();
        });
        
        // T088: Add Escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalElement?.classList.contains('active')) {
                this.hide();
            }
        });
    }

    /**
     * Render item details into modal body
     */
    render() {
        if (!this.currentItem || !this.modalElement) return;
        
        const modalBody = this.modalElement.querySelector('.modal-body');
        if (!modalBody) return;
        
        const item = this.currentItem.item;
        
        modalBody.innerHTML = `
            <div class="item-detail-header">
                ${this.renderItemIcon()}
                <div class="item-detail-info">
                    ${this.renderItemNames()}
                    ${this.renderQuantityBadge()}
                    ${this.renderPriorityBadge()}
                </div>
            </div>
            
            <div class="item-detail-sources">
                ${this.renderQuestSources()}
                ${this.renderHideoutSources()}
            </div>
            
            <div class="item-detail-actions">
                ${this.renderWikiButton()}
            </div>
        `;
    }

    /**
     * T080: Render large item icon (128x128px)
     * @returns {string}
     */
    renderItemIcon() {
        const item = this.currentItem.item;
        return `
            <div class="item-detail-icon">
                <img src="${item.iconLink}" 
                     alt="${item.name}" 
                     onerror="this.src='https://via.placeholder.com/128x128?text=No+Image'">
            </div>
        `;
    }

    /**
     * T081: Render item name and short name
     * @returns {string}
     */
    renderItemNames() {
        const item = this.currentItem.item;
        return `
            <h2 class="item-detail-name">${item.name}</h2>
            ${item.shortName !== item.name ? `<p class="item-detail-short-name">${item.shortName}</p>` : ''}
        `;
    }

    /**
     * T081: Render quantity badge
     * @returns {string}
     */
    renderQuantityBadge() {
        return `
            <div class="item-detail-quantity">
                <span class="quantity-label">Total Needed:</span>
                <span class="quantity-value">${this.currentItem.totalQuantity}x</span>
                ${this.currentItem.isFiR ? '<span class="fir-badge">🔍 FiR Required</span>' : ''}
            </div>
        `;
    }

    /**
     * Render priority badge
     * @returns {string}
     */
    renderPriorityBadge() {
        const priorityClass = this.currentItem.getPriorityCssClass();
        const priorityText = this.currentItem.getPriorityDisplay();
        const icon = this.currentItem.priority === 'NEEDED_SOON' ? '⚠️' : '🕐';
        
        return `
            <div class="priority-badge ${priorityClass}">
                <span class="priority-icon">${icon}</span>
                <span class="priority-text">${priorityText}</span>
            </div>
        `;
    }

    /**
     * T082: Render quest sources list
     * @returns {string}
     */
    renderQuestSources() {
        const questSources = this.currentItem.getQuestSources();
        
        if (questSources.length === 0) {
            return '';
        }
        
        return `
            <div class="sources-section">
                <h3 class="sources-title">Quest Requirements</h3>
                <ul class="sources-list">
                    ${questSources.map(source => `
                        <li class="source-item">
                            <span class="source-name">${source.name}</span>
                            <span class="source-quantity">${source.quantity}x</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    /**
     * T083: Render hideout sources list
     * @returns {string}
     */
    renderHideoutSources() {
        const hideoutSources = this.currentItem.getHideoutSources();
        
        if (hideoutSources.length === 0) {
            return '';
        }
        
        return `
            <div class="sources-section">
                <h3 class="sources-title">Hideout Requirements</h3>
                <ul class="sources-list">
                    ${hideoutSources.map(source => `
                        <li class="source-item">
                            <span class="source-name">${source.name}</span>
                            <span class="source-quantity">${source.quantity}x</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    /**
     * T084: Render wiki button
     * @returns {string}
     */
    renderWikiButton() {
        const item = this.currentItem.item;
        
        if (!item.wikiLink) {
            return '';
        }
        
        return `
            <a href="${item.wikiLink}" 
               target="_blank" 
               rel="noopener noreferrer" 
               class="wiki-button">
                📖 View on Wiki
            </a>
        `;
    }

    /**
     * Destroy modal and remove from DOM
     */
    destroy() {
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = null;
        }
        document.body.style.overflow = '';
    }
}

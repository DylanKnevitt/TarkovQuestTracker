/**
 * Item Card Component
 * Feature: 003-item-tracker
 * Renders individual item card in grid
 */

/**
 * T033, T042-T045: ItemCard component
 * Displays item with icon, name, quantity, priority, sources, FiR badge
 */
export class ItemCard {
    /**
     * @param {AggregatedItem} aggregatedItem
     */
    constructor(aggregatedItem) {
        this.item = aggregatedItem;
    }

    /**
     * T042: Render item card HTML
     * @returns {string}
     */
    render() {
        const item = this.item;
        const collectedClass = item.collectedQuantity >= item.totalQuantity ? 'collected' : '';
        
        return `
            <div class="item-card ${collectedClass}" data-item-id="${item.item.id}">
                <div class="item-card-header">
                    <img src="${item.item.iconLink}" alt="${item.item.name}" class="item-icon" onerror="this.src='https://via.placeholder.com/64x64?text=No+Image'">
                    
                    <div class="item-card-quantity-input">
                        <input type="number" 
                               class="item-quantity-input" 
                               data-item-id="${item.item.id}"
                               min="0"
                               max="${item.totalQuantity}"
                               value="${item.collectedQuantity || 0}"
                               placeholder="0">
                        <span class="quantity-max">/ ${item.totalQuantity}</span>
                    </div>
                </div>
                
                <div class="item-card-body">
                    <h3 class="item-name">${item.item.name}</h3>
                    
                    <div class="item-quantity">
                        <span class="quantity-badge">${item.totalQuantity}x</span>
                        ${this.renderFiRBadge()}
                    </div>
                    
                    ${this.renderPriorityBadge()}
                    
                    ${this.renderSources()}
                </div>
            </div>
        `;
    }

    /**
     * T043: Render priority badge
     * @returns {string}
     */
    renderPriorityBadge() {
        const priorityClass = this.item.getPriorityCssClass();
        const priorityText = this.item.getPriorityDisplay();
        
        const icon = this.item.priority === 'NEEDED_SOON' ? '⚠️' : '🕐';
        
        return `
            <div class="priority-badge ${priorityClass}">
                <span class="priority-icon">${icon}</span>
                <span class="priority-text">${priorityText}</span>
            </div>
        `;
    }

    /**
     * T044: Render source subtitle
     * @returns {string}
     */
    renderSources() {
        const sourcesText = this.item.getSourcesString();
        
        return `
            <div class="item-sources">
                <span class="sources-label">Needed for:</span>
                <span class="sources-text">${sourcesText}</span>
            </div>
        `;
    }

    /**
     * T045: Render FiR badge
     * @returns {string}
     */
    renderFiRBadge() {
        if (!this.item.isFiR) {
            return '';
        }
        
        return `
            <span class="fir-badge" title="Found in Raid required">🔍 FiR</span>
        `;
    }
}

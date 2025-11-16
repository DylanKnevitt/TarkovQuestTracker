/**
 * Item List Component
 * Feature: 003-item-tracker
 * Renders grid of item cards
 */

import { ItemCard } from './item-card.js';
import { ItemStorageService } from '../services/item-storage-service.js';

/**
 * T032, T039-T041: ItemList component
 * Renders filterable item card grid
 */
export class ItemList {
    /**
     * @param {ItemTrackerManager} itemTrackerManager
     */
    constructor(itemTrackerManager) {
        this.itemTrackerManager = itemTrackerManager;
        this.container = null;
        this.currentFilter = 'all';
        this.hideCollected = false;
    }

    /**
     * T039: Render item list grid
     * @param {HTMLElement} container
     */
    render(container) {
        this.container = container;
        
        // Apply collection status to items
        const items = this.itemTrackerManager.getAllItems();
        ItemStorageService.applyCollectionStatus(items);
        
        // Get filtered items
        const filteredItems = this.getFilteredItems();
        
        // T041: Show empty state if no items
        if (filteredItems.length === 0) {
            this.renderEmpty();
            return;
        }
        
        // Render item grid
        const html = `
            <div class="item-grid">
                ${filteredItems.map(item => new ItemCard(item).render()).join('')}
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Attach event listeners to cards
        this.attachCardEventListeners();
    }

    /**
     * T040: Apply filters to item list
     * @param {string} filter - 'all', 'quest', 'hideout', 'keys'
     * @param {boolean} hideCollected
     */
    applyFilters(filter, hideCollected) {
        this.currentFilter = filter;
        this.hideCollected = hideCollected;
        this.refresh();
    }

    /**
     * Get filtered items based on current filter
     * @returns {Array<AggregatedItem>}
     */
    getFilteredItems() {
        let items = this.itemTrackerManager.getFilteredItems(this.currentFilter);
        
        // Apply hide collected filter
        if (this.hideCollected) {
            items = items.filter(item => !item.collected);
        }
        
        // Sort by priority (NEEDED_SOON first), then by name
        items.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority === 'NEEDED_SOON' ? -1 : 1;
            }
            return a.item.name.localeCompare(b.item.name);
        });
        
        return items;
    }

    /**
     * T041: Render empty state
     */
    renderEmpty() {
        const message = this.hideCollected 
            ? 'All items collected! 🎉'
            : 'No items needed at the moment.';
        
        this.container.innerHTML = `
            <div class="item-list-empty">
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * Refresh item list display
     */
    refresh() {
        if (this.container) {
            this.render(this.container);
        }
    }

    /**
     * Attach event listeners to item cards
     */
    attachCardEventListeners() {
        // Collection checkboxes
        const checkboxes = this.container.querySelectorAll('.item-collection-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const itemId = e.target.dataset.itemId;
                const collected = e.target.checked;
                this.handleCollectionToggle(itemId, collected);
            });
        });
        
        // Item cards (click for detail)
        const cards = this.container.querySelectorAll('.item-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't open detail if clicking checkbox
                if (e.target.classList.contains('item-collection-checkbox')) {
                    return;
                }
                
                const itemId = card.dataset.itemId;
                this.handleCardClick(itemId);
            });
        });
    }

    /**
     * Handle collection checkbox toggle
     * @param {string} itemId
     * @param {boolean} collected
     */
    handleCollectionToggle(itemId, collected) {
        const item = this.itemTrackerManager.getItem(itemId);
        if (!item) return;
        
        // Toggle collection status
        ItemStorageService.toggleCollected(itemId, collected, item.totalQuantity);
        
        // Update display
        this.refresh();
    }

    /**
     * Handle item card click (open detail modal)
     * @param {string} itemId
     */
    handleCardClick(itemId) {
        const item = this.itemTrackerManager.getItem(itemId);
        if (!item) return;
        
        // Dispatch event to open item detail modal
        const event = new CustomEvent('openItemDetail', {
            detail: { item }
        });
        window.dispatchEvent(event);
    }
}

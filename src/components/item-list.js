/**
 * Item List Component
 * Feature: 003-item-tracker
 * Renders grid of item cards
 */

import { ItemCard } from './item-card.js';
import { ItemCollectionService } from '../services/item-collection-service.js';

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
        this.collectionLoaded = false;
    }

    /**
     * T039: Render item list grid
     * @param {HTMLElement} container
     */
    async render(container) {
        this.container = container;
        
        // Only load collection status once at initialization
        if (!this.collectionLoaded) {
            const items = this.itemTrackerManager.getAllItems();
            await ItemCollectionService.applyCollectionStatus(items);
            this.collectionLoaded = true;
        }
        
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
        // Fire and forget refresh (will await internally)
        this.refresh().catch(err => console.error('Failed to refresh:', err));
    }

    /**
     * Get filtered items based on current filter
     * @returns {Array<AggregatedItem>}
     */
    getFilteredItems() {
        let items = this.itemTrackerManager.getFilteredItems(this.currentFilter);
        
        // Apply hide collected filter (hide items with full quantity collected)
        if (this.hideCollected) {
            items = items.filter(item => item.collectedQuantity < item.totalQuantity);
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
    async refresh() {
        if (this.container) {
            await this.render(this.container);
        }
    }

    /**
     * Attach event listeners to item cards
     */
    attachCardEventListeners() {
        // Collection quantity buttons
        const minusButtons = this.container.querySelectorAll('.quantity-minus');
        const plusButtons = this.container.querySelectorAll('.quantity-plus');
        
        minusButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const itemId = button.dataset.itemId;
                const item = this.itemTrackerManager.getItem(itemId);
                if (item && item.collectedQuantity > 0) {
                    await this.handleQuantityChange(itemId, item.collectedQuantity - 1);
                }
            });
        });
        
        plusButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const itemId = button.dataset.itemId;
                const item = this.itemTrackerManager.getItem(itemId);
                if (item && item.collectedQuantity < item.totalQuantity) {
                    await this.handleQuantityChange(itemId, item.collectedQuantity + 1);
                }
            });
        });
        
        // Item cards (click for detail)
        const cards = this.container.querySelectorAll('.item-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't open detail if clicking quantity input
                if (e.target.classList.contains('item-quantity-input')) {
                    return;
                }
                
                const itemId = card.dataset.itemId;
                this.handleCardClick(itemId);
            });
        });
    }

    /**
     * Handle quantity input change
     * @param {string} itemId
     * @param {number} quantity
     */
    async handleQuantityChange(itemId, quantity) {
        const item = this.itemTrackerManager.getItem(itemId);
        if (!item) {
            console.error('Item not found:', itemId);
            return;
        }
        
        // Clamp quantity to valid range
        const clampedQuantity = Math.max(0, Math.min(quantity, item.totalQuantity));
        
        console.log(`Updating ${item.item.name} quantity to ${clampedQuantity}`);
        
        // Update the item's collected quantity immediately for UI
        item.setCollectionStatus(clampedQuantity >= item.totalQuantity, clampedQuantity);
        
        // Update collection status (syncs to database) - AWAIT to prevent race condition
        await ItemCollectionService.setQuantity(itemId, clampedQuantity);
        
        // Update the display for this specific card
        const card = this.container.querySelector(`.item-card[data-item-id="${itemId}"]`);
        if (card) {
            const quantityDisplay = card.querySelector('.quantity-display');
            if (quantityDisplay) {
                quantityDisplay.textContent = clampedQuantity;
            }
            
            // Update collected class
            if (clampedQuantity >= item.totalQuantity) {
                card.classList.add('collected');
            } else {
                card.classList.remove('collected');
            }
        }
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

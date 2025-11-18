/**
 * Item List Component
 * Feature: 003-item-tracker + 006-all-quests-item-tracker
 * Renders grid of item cards
 */

import { ItemCard } from './item-card.js';
import { ItemCollectionService } from '../services/item-collection-service.js';
import { ViewingMode, ItemStatus, StatusFilter } from '../models/item.js'; // T024: Import enums, T037: Add StatusFilter

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
        this.viewingMode = ViewingMode.ACTIVE; // T024: Track viewing mode
        this.statusFilter = StatusFilter.BOTH; // T037: Track status filter
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
        // T025-T028: Pass viewingMode and questManager to ItemCard for status badges
        // T060: Pass hideoutManager for hideout badge rendering
        const html = `
            <div class="item-grid">
                ${filteredItems.map(item => new ItemCard(item, this.viewingMode, this.itemTrackerManager.questManager, this.itemTrackerManager.hideoutManager).render()).join('')}
            </div>
        `;

        this.container.innerHTML = html;

        // Attach event listeners to cards
        this.attachCardEventListeners();
    }

    /**
     * T040: Apply filters to item list
     * T028: Enhanced to accept viewingMode
     * T043: Enhanced to accept statusFilter
     * @param {string} filter - 'all', 'quest', 'hideout', 'keys'
     * @param {boolean} hideCollected
     * @param {string} viewingMode - ViewingMode.ACTIVE or ViewingMode.ALL
     * @param {string} statusFilter - StatusFilter.ACTIVE, StatusFilter.COMPLETED, or StatusFilter.BOTH
     */
    applyFilters(filter, hideCollected, viewingMode = ViewingMode.ACTIVE, statusFilter = StatusFilter.BOTH) {
        this.currentFilter = filter;
        this.hideCollected = hideCollected;
        this.viewingMode = viewingMode; // T028: Store viewing mode
        this.statusFilter = statusFilter; // T043: Store status filter
        // Fire and forget refresh (will await internally)
        this.refresh().catch(err => console.error('Failed to refresh:', err));
    }

    /**
     * Get filtered items based on current filter
     * T044-T046: Enhanced with status filtering for All Quests mode
     * @returns {Array<AggregatedItem>}
     */
    getFilteredItems() {
        let items = this.itemTrackerManager.getFilteredItems(this.currentFilter);

        // T044-T046: Apply status filter in All Quests mode
        if (this.viewingMode === ViewingMode.ALL && this.statusFilter !== StatusFilter.BOTH) {
            items = items.filter(item => {
                // Only apply status filter to items with quest sources
                if (!item.hasQuestSources()) {
                    return true; // Keep hideout-only items
                }

                const status = item.getQuestSourceStatus(this.itemTrackerManager.questManager);

                // T045: Show only items from active quests
                if (this.statusFilter === StatusFilter.ACTIVE) {
                    return status === ItemStatus.ACTIVE || status === ItemStatus.BOTH;
                }

                // T046: Show only items from completed quests
                if (this.statusFilter === StatusFilter.COMPLETED) {
                    return status === ItemStatus.COMPLETED || status === ItemStatus.BOTH;
                }

                return true;
            });
        }

        // Apply hide collected filter (hide items with full quantity collected)
        if (this.hideCollected) {
            items = items.filter(item => item.collectedQuantity < item.totalQuantity);
        }

        // Sort by three-tier priority (NEED_NOW > NEED_SOON > NEED_LATER)
        // Within each tier, sort by dependency depth (lower = more urgent)
        // Then alphabetically by name
        items.sort((a, b) => {
            // Define priority order
            const priorityOrder = {
                'NEED_NOW': 3,
                'NEED_SOON': 2,
                'NEED_LATER': 1
            };

            const aPriorityValue = priorityOrder[a.priority] || 0;
            const bPriorityValue = priorityOrder[b.priority] || 0;

            // Primary sort: by priority tier
            if (aPriorityValue !== bPriorityValue) {
                return bPriorityValue - aPriorityValue; // Higher priority first
            }

            // Secondary sort: by dependency depth (lower depth = closer to completion)
            const aDepth = a.priorityDepth ?? Infinity;
            const bDepth = b.priorityDepth ?? Infinity;
            if (aDepth !== bDepth) {
                return aDepth - bDepth; // Lower depth first
            }

            // Tertiary sort: alphabetically by name
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
        // Collection quantity input fields
        const quantityInputs = this.container.querySelectorAll('.quantity-input');
        quantityInputs.forEach(input => {
            // Handle direct input changes
            input.addEventListener('change', async (e) => {
                e.stopPropagation();
                const itemId = input.dataset.itemId;
                const quantity = parseInt(input.value, 10) || 0;
                await this.handleQuantityChange(itemId, quantity);
            });

            // Prevent modal from opening when clicking input
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        // Collection quantity buttons
        const minusButtons = this.container.querySelectorAll('.quantity-minus');
        const plusButtons = this.container.querySelectorAll('.quantity-plus');

        minusButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const itemId = button.dataset.itemId;
                const item = this.itemTrackerManager.getItem(itemId);
                if (!item) return;

                // Read current quantity from input field
                const card = this.container.querySelector(`.item-card[data-item-id="${itemId}"]`);
                const quantityInput = card?.querySelector('.quantity-input');
                const currentQuantity = quantityInput ? parseInt(quantityInput.value, 10) : item.collectedQuantity;

                if (currentQuantity > 0) {
                    await this.handleQuantityChange(itemId, currentQuantity - 1);
                }
            });
        });

        plusButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const itemId = button.dataset.itemId;
                const item = this.itemTrackerManager.getItem(itemId);
                if (!item) return;

                // Read current quantity from input field
                const card = this.container.querySelector(`.item-card[data-item-id="${itemId}"]`);
                const quantityInput = card?.querySelector('.quantity-input');
                const currentQuantity = quantityInput ? parseInt(quantityInput.value, 10) : item.collectedQuantity;

                if (currentQuantity < item.totalQuantity) {
                    await this.handleQuantityChange(itemId, currentQuantity + 1);
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
        item.setCollectionStatus({
            collected: clampedQuantity >= item.totalQuantity,
            quantity: clampedQuantity
        });

        // Update collection status (syncs to database) - AWAIT to prevent race condition
        await ItemCollectionService.setQuantity(itemId, clampedQuantity);

        // Update the display for this specific card
        const card = this.container.querySelector(`.item-card[data-item-id="${itemId}"]`);
        if (card) {
            const quantityInput = card.querySelector('.quantity-input');
            if (quantityInput) {
                quantityInput.value = clampedQuantity;
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
     * T032: Enhanced to pass viewingMode and questManager
     * @param {string} itemId
     */
    handleCardClick(itemId) {
        const item = this.itemTrackerManager.getItem(itemId);
        if (!item) return;

        // T032: Dispatch event with viewingMode and questManager for modal grouping
        // T061: Add hideoutManager for hideout source grouping
        const event = new CustomEvent('openItemDetail', {
            detail: {
                item,
                viewingMode: this.viewingMode,
                questManager: this.itemTrackerManager.questManager,
                hideoutManager: this.itemTrackerManager.hideoutManager
            }
        });
        window.dispatchEvent(event);
    }
}

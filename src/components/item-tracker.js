/**
 * Item Tracker Component
 * Feature: 003-item-tracker
 * Main controller for item tracker view
 */

import { ItemList } from './item-list.js';

/**
 * T031-T038: ItemTracker component
 * Orchestrates item tracker UI and data flow
 */
export class ItemTracker {
    /**
     * @param {QuestManager} questManager
     * @param {HideoutManager} hideoutManager
     * @param {ItemTrackerManager} itemTrackerManager
     */
    constructor(questManager, hideoutManager, itemTrackerManager) {
        this.questManager = questManager;
        this.hideoutManager = hideoutManager;
        this.itemTrackerManager = itemTrackerManager;
        
        this.container = null;
        this.itemList = null;
        this.isInitialized = false;
        
        this.currentFilter = 'all';
        this.hideCollected = false;
    }

    /**
     * T034: Initialize item tracker component
     * @param {HTMLElement} container - Container element to render into
     * @returns {Promise<void>}
     */
    async initialize(container) {
        this.container = container;
        
        console.log('Initializing ItemTracker...');
        
        try {
            // T035: Load items from API
            await this.loadItems();
            
            // T036: Render initial UI
            this.render();
            
            // T037: Add quest update listener
            window.addEventListener('questUpdated', () => this.handleQuestUpdate());
            
            // T038: Add hideout update listener
            window.addEventListener('hideoutUpdated', () => this.handleHideoutUpdate());
            
            // Add item collection update listener
            window.addEventListener('itemCollectionUpdated', () => this.handleCollectionUpdate());
            
            this.isInitialized = true;
            console.log('ItemTracker initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ItemTracker:', error);
            this.renderError(error);
        }
    }

    /**
     * T035: Load items from API (parallel)
     * @returns {Promise<void>}
     */
    async loadItems() {
        console.log('Loading items...');
        
        // ItemTrackerManager will fetch items and aggregate requirements
        await this.itemTrackerManager.initialize();
        
        console.log('Items loaded successfully');
    }

    /**
     * T036: Render item tracker UI
     */
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = this.getTemplate();
        
        // Render item list
        const itemListContainer = this.container.querySelector('#item-list-container');
        if (itemListContainer) {
            this.itemList = new ItemList(this.itemTrackerManager);
            this.itemList.render(itemListContainer);
        }
        
        // Attach event listeners
        this.attachEventListeners();
    }

    /**
     * Get HTML template for item tracker
     * @returns {string}
     */
    getTemplate() {
        return `
            <div class="item-tracker">
                <div class="item-tracker-header">
                    <h2>Quest & Hideout Item Tracker</h2>
                    <div class="item-tracker-stats" id="item-stats"></div>
                </div>
                
                <div class="item-tracker-filters">
                    <div class="filter-group">
                        <button class="filter-btn active" data-filter="all">All Items</button>
                        <button class="filter-btn" data-filter="quest">Quest Items</button>
                        <button class="filter-btn" data-filter="hideout">Hideout Items</button>
                        <button class="filter-btn" data-filter="keys">Keys</button>
                    </div>
                    
                    <div class="filter-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="hide-collected-checkbox">
                            <span>Hide Collected</span>
                        </label>
                    </div>
                </div>
                
                <div id="item-list-container"></div>
            </div>
        `;
    }

    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        // Filter buttons
        const filterButtons = this.container.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.handleFilterChange(filter);
            });
        });
        
        // Hide collected checkbox
        const hideCollectedCheckbox = this.container.querySelector('#hide-collected-checkbox');
        if (hideCollectedCheckbox) {
            hideCollectedCheckbox.addEventListener('change', (e) => {
                this.hideCollected = e.target.checked;
                this.applyFilters();
            });
        }
    }

    /**
     * Handle filter button click
     * @param {string} filter
     */
    handleFilterChange(filter) {
        this.currentFilter = filter;
        
        // Update active button
        const filterButtons = this.container.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.applyFilters();
    }

    /**
     * Apply current filters to item list
     */
    applyFilters() {
        if (this.itemList) {
            this.itemList.applyFilters(this.currentFilter, this.hideCollected);
        }
        
        this.updateStats();
    }

    /**
     * Update statistics display
     */
    updateStats() {
        const statsContainer = this.container.querySelector('#item-stats');
        if (!statsContainer) return;
        
        const stats = this.itemTrackerManager.getStats();
        
        statsContainer.innerHTML = `
            <span>${stats.total} items needed</span>
            <span>${stats.questItems} quest items</span>
            <span>${stats.hideoutItems} hideout items</span>
            <span>${stats.keys} keys</span>
        `;
    }

    /**
     * T037: Handle quest update event
     */
    handleQuestUpdate() {
        console.log('Quest updated, refreshing item tracker...');
        this.itemTrackerManager.refresh();
        this.refresh();
    }

    /**
     * T038: Handle hideout update event
     */
    handleHideoutUpdate() {
        console.log('Hideout updated, refreshing item tracker...');
        this.itemTrackerManager.refresh();
        this.refresh();
    }

    /**
     * Handle item collection update event
     */
    handleCollectionUpdate() {
        console.log('Item collection updated, refreshing display...');
        this.refresh();
    }

    /**
     * Refresh item list display
     */
    refresh() {
        if (this.itemList) {
            this.itemList.refresh();
        }
        this.updateStats();
    }

    /**
     * Render error state
     * @param {Error} error
     */
    renderError(error) {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="item-tracker-error">
                <h3>Failed to load item tracker</h3>
                <p>${error.message}</p>
                <button class="btn-retry">Retry</button>
            </div>
        `;
        
        const retryBtn = this.container.querySelector('.btn-retry');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.initialize(this.container);
            });
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="item-tracker-loading">
                <div class="spinner"></div>
                <p>Loading items...</p>
            </div>
        `;
    }
}

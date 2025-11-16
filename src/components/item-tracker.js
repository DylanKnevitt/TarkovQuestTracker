/**
 * Item Tracker Component
 * Feature: 003-item-tracker + 004-hideout-item-enhancements
 * Main controller for item tracker view
 */

import { ItemList } from './item-list.js';
import { ItemDetailModal } from './item-detail-modal.js';
import { HideoutList } from './hideout-list.js'; // T013: Import HideoutList

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
        this.hideoutList = null; // T013: HideoutList component
        this.itemDetailModal = null;
        this.isInitialized = false;

        this.currentFilter = 'all';
        this.hideCollected = false;
        this.currentSubtab = 'items'; // T013: Track active subtab

        // T057: Storage key for filter persistence
        this.STORAGE_KEY = 'item-tracker-filters';
    }

    /**
     * T034: Initialize item tracker component
     * @param {HTMLElement} container - Container element to render into
     * @returns {Promise<void>}
     */
    async initialize(container) {
        this.container = container;

        console.log('Initializing ItemTracker...');

        // T090-T091: Show loading state
        this.showLoading();

        try {
            // T058: Load saved filter state
            this.loadFilters();

            // T035: Load items from API
            await this.loadItems();

            // T036: Render initial UI
            await this.render();

            // T015: Initialize HideoutList component
            this.hideoutList = new HideoutList('hideout-progress-content');

            // Initialize item detail modal
            this.itemDetailModal = new ItemDetailModal();

            // T037: Add quest update listener
            window.addEventListener('questUpdated', () => this.handleQuestUpdate());

            // T038: Add hideout update listener
            window.addEventListener('hideoutUpdated', () => this.handleHideoutUpdate());

            // T015: Add hideout progress update listener for priority recalculation
            window.addEventListener('hideoutProgressUpdated', () => this.handleHideoutProgressUpdate());

            // Add item collection update listener
            window.addEventListener('itemCollectionUpdated', () => this.handleCollectionUpdate());

            // T086: Add item detail modal open listener
            window.addEventListener('openItemDetail', (e) => {
                if (this.itemDetailModal && e.detail?.item) {
                    this.itemDetailModal.show(e.detail.item);
                }
            });

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
    async render() {
        if (!this.container) return;

        this.container.innerHTML = this.getTemplate();

        // Restore saved filter state to UI
        this.restoreFilterState();

        // Render item list
        const itemListContainer = this.container.querySelector('#item-list-container');
        if (itemListContainer) {
            this.itemList = new ItemList(this.itemTrackerManager);
            await this.itemList.render(itemListContainer);
        }

        // Attach event listeners
        this.attachEventListeners();

        // Apply saved filters
        this.applyFilters();
    }

    /**
     * T013: Get HTML template for item tracker (ENHANCED with subtabs)
     * @returns {string}
     */
    getTemplate() {
        return `
            <div class="item-tracker">
                <div class="item-tracker-header">
                    <h2>Quest & Hideout Item Tracker</h2>
                    <div class="item-tracker-stats" id="item-stats"></div>
                </div>
                
                <div class="tracker-subtabs">
                    <button class="subtab-btn active" data-subtab="items">Items</button>
                    <button class="subtab-btn" data-subtab="hideout">Hideout Progress</button>
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
                
                <div id="item-tracker-content">
                    <div id="item-list-container"></div>
                    <div id="hideout-progress-content" style="display:none;"></div>
                </div>
            </div>
        `;
    }

    /**
     * T013: Attach event listeners to UI elements (ENHANCED with subtabs)
     */
    attachEventListeners() {
        // Subtab buttons
        const subtabButtons = this.container.querySelectorAll('.subtab-btn');
        subtabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subtab = e.target.dataset.subtab;
                this.switchSubtab(subtab);
            });
        });

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
     * T013: Switch between Items and Hideout Progress subtabs
     * @param {string} subtabName - 'items' or 'hideout'
     */
    switchSubtab(subtabName) {
        this.currentSubtab = subtabName;

        // Update active button
        const subtabButtons = this.container.querySelectorAll('.subtab-btn');
        subtabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subtab === subtabName);
        });

        // Toggle content visibility
        const itemListContainer = this.container.querySelector('#item-list-container');
        const hideoutProgressContainer = this.container.querySelector('#hideout-progress-content');
        const filterSection = this.container.querySelector('.item-tracker-filters');

        if (subtabName === 'items') {
            itemListContainer.style.display = '';
            hideoutProgressContainer.style.display = 'none';
            filterSection.style.display = '';
        } else if (subtabName === 'hideout') {
            itemListContainer.style.display = 'none';
            hideoutProgressContainer.style.display = '';
            filterSection.style.display = 'none'; // Hide filters on hideout tab

            // Render hideout list if not already rendered
            if (this.hideoutList && this.hideoutManager) {
                this.hideoutList.render(this.hideoutManager.stations, this.hideoutManager);
            }
        }

        console.log(`[ItemTracker] Switched to ${subtabName} subtab`);
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
        this.saveFilters(); // T057: Persist filter state
    }

    /**
     * Apply current filters to item list
     */
    applyFilters() {
        if (this.itemList) {
            this.itemList.applyFilters(this.currentFilter, this.hideCollected);
        }

        this.updateStats();
        this.saveFilters(); // T057: Persist filter state
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
        // Fire and forget refresh (will await internally)
        this.refresh().catch(err => console.error('Failed to refresh:', err));
    }

    /**
     * T038: Handle hideout update event
     */
    handleHideoutUpdate() {
        console.log('Hideout updated, refreshing item tracker...');
        this.itemTrackerManager.refresh();
        // Fire and forget refresh (will await internally)
        this.refresh().catch(err => console.error('Failed to refresh:', err));
    }

    /**
     * T015: Handle hideout progress update event (priority recalculation)
     */
    handleHideoutProgressUpdate() {
        console.log('Hideout progress updated, recalculating priorities...');
        this.itemTrackerManager.refresh();
        // Fire and forget refresh (will await internally)
        this.refresh().catch(err => console.error('Failed to refresh:', err));
    }

    /**
     * Handle item collection update event
     */
    handleCollectionUpdate() {
        console.log('Item collection updated, refreshing display...');
        // Fire and forget refresh (will await internally)
        this.refresh().catch(err => console.error('Failed to refresh:', err));
    }

    /**
     * Refresh item list display
     */
    async refresh() {
        if (this.itemList) {
            await this.itemList.refresh();
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

    /**
     * T058: Load saved filter state from localStorage
     */
    loadFilters() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const filters = JSON.parse(saved);
                this.currentFilter = filters.currentFilter || 'all';
                this.hideCollected = filters.hideCollected || false;
                console.log('Loaded saved filters:', filters);
            }
        } catch (error) {
            console.error('Failed to load filters:', error);
        }
    }

    /**
     * Restore filter state to UI elements
     */
    restoreFilterState() {
        // Set active filter button
        const filterButtons = this.container.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });

        // Set hide collected checkbox
        const hideCollectedCheckbox = this.container.querySelector('#hide-collected-checkbox');
        if (hideCollectedCheckbox) {
            hideCollectedCheckbox.checked = this.hideCollected;
        }
    }

    /**
     * T057: Save filter state to localStorage
     */
    saveFilters() {
        try {
            const filters = {
                currentFilter: this.currentFilter,
                hideCollected: this.hideCollected
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filters));
        } catch (error) {
            console.error('Failed to save filters:', error);
        }
    }
}

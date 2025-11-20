/**
 * Item Tracker Component
 * Feature: 003-item-tracker + 004-hideout-item-enhancements + 006-all-quests-item-tracker
 * Main controller for item tracker view
 */

import { ItemList } from './item-list.js';
import { ItemDetailModal } from './item-detail-modal.js';
import { HideoutList } from './hideout-list.js'; // T013: Import HideoutList
import { ViewingMode, StatusFilter } from '../models/item.js'; // T014: Import ViewingMode enum, T037: Import StatusFilter
import { ScreenshotUploader } from './screenshot-uploader.js'; // T048: Import ScreenshotUploader
import { OCRResultsViewer } from './ocr-results-viewer.js'; // T048: Import OCRResultsViewer
import { OCRService } from '../services/ocr-service.js'; // T049: Import OCRService
import { ItemMatchingService } from '../services/item-matching-service.js'; // T049: Import ItemMatchingService
import { RecommendationService } from '../services/recommendation-service.js'; // T049: Import RecommendationService
import { AnalysisSession } from '../models/analysis-session.js'; // T049: Import AnalysisSession

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
        this.viewingMode = ViewingMode.ACTIVE; // T014: Default to Active Quests mode
        this.statusFilter = StatusFilter.BOTH; // T037: Default to show both active and completed
        this.includeAllHideout = false; // T054: Default to not include completed hideout

        // T048: OCR components
        this.screenshotUploader = null;
        this.ocrResultsViewer = null;
        this.ocrService = null;
        this.itemMatchingService = null;
        this.recommendationService = null;

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
            // T032: Enhanced to pass viewingMode and questManager to modal
            // T061: Enhanced to pass hideoutManager for hideout source grouping
            window.addEventListener('openItemDetail', (e) => {
                if (this.itemDetailModal && e.detail?.item) {
                    const viewingMode = e.detail.viewingMode || this.viewingMode;
                    const questManager = e.detail.questManager || this.questManager;
                    const hideoutManager = e.detail.hideoutManager || this.hideoutManager;
                    this.itemDetailModal.show(e.detail.item, viewingMode, questManager, hideoutManager);
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
     * T019: Added viewing mode toggle buttons
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
                    <button class="subtab-btn" data-subtab="screenshot">📷 Screenshot</button>
                </div>
                
                <!-- T019: Viewing mode toggle -->
                <div class="viewing-mode-toggle">
                    <button class="mode-btn ${this.viewingMode === ViewingMode.ACTIVE ? 'active' : ''}" data-mode="active">Active Quests</button>
                    <button class="mode-btn ${this.viewingMode === ViewingMode.ALL ? 'active' : ''}" data-mode="all">All Quests</button>
                </div>
                
                <!-- T041: Status filter dropdown (visible only in All Quests mode) -->
                <div class="status-filter-container" style="display: ${this.viewingMode === ViewingMode.ALL ? 'flex' : 'none'};">
                    <label for="status-filter-select">Show:</label>
                    <select id="status-filter-select" class="status-filter-select">
                        <option value="${StatusFilter.BOTH}" ${this.statusFilter === StatusFilter.BOTH ? 'selected' : ''}>All Quests</option>
                        <option value="${StatusFilter.ACTIVE}" ${this.statusFilter === StatusFilter.ACTIVE ? 'selected' : ''}>Active Only</option>
                        <option value="${StatusFilter.COMPLETED}" ${this.statusFilter === StatusFilter.COMPLETED ? 'selected' : ''}>Completed Only</option>
                    </select>
                </div>
                
                <!-- T058: Include All Hideout checkbox (visible only in All Quests mode) -->
                <div class="hideout-inclusion-container" style="display: ${this.viewingMode === ViewingMode.ALL ? 'flex' : 'none'};">
                    <label class="checkbox-label">
                        <input type="checkbox" id="include-all-hideout-checkbox" ${this.includeAllHideout ? 'checked' : ''}>
                        <span>Include All Hideout</span>
                    </label>
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
                    <div id="screenshot-content" style="display:none;">
                        <div class="screenshot-tab-description">
                            <p>Upload a screenshot of your in-game inventory to automatically detect items and get keep/sell recommendations based on your quest and hideout progress.</p>
                        </div>
                        <div id="screenshot-uploader-container"></div>
                        <div id="ocr-results-container"></div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * T013: Attach event listeners to UI elements (ENHANCED with subtabs)
     * T020: Added mode toggle button listeners
     */
    attachEventListeners() {
        // T020-T021: Mode toggle buttons
        const modeButtons = this.container.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const mode = e.target.dataset.mode;
                await this.switchViewingMode(mode);

                // T021: Update button active states
                this.container.querySelectorAll('.mode-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.mode === mode);
                });

                // T041-T042: Toggle status filter visibility
                const statusFilterContainer = this.container.querySelector('.status-filter-container');
                if (statusFilterContainer) {
                    statusFilterContainer.style.display = (mode === ViewingMode.ALL) ? 'flex' : 'none';
                }

                // T058-T059: Toggle hideout inclusion checkbox visibility
                const hideoutInclusionContainer = this.container.querySelector('.hideout-inclusion-container');
                if (hideoutInclusionContainer) {
                    hideoutInclusionContainer.style.display = (mode === ViewingMode.ALL) ? 'flex' : 'none';
                }
            });
        });

        // T042: Status filter dropdown
        const statusFilterSelect = this.container.querySelector('#status-filter-select');
        if (statusFilterSelect) {
            statusFilterSelect.addEventListener('change', async (e) => {
                const filter = e.target.value;
                await this.applyStatusFilter(filter);
            });
        }

        // T059: Include All Hideout checkbox
        const includeAllHideoutCheckbox = this.container.querySelector('#include-all-hideout-checkbox');
        if (includeAllHideoutCheckbox) {
            includeAllHideoutCheckbox.addEventListener('change', async (e) => {
                this.includeAllHideout = e.target.checked;
                this.saveFilters();
                // T062: Refresh with separate flags
                const includeCompletedQuests = (this.viewingMode === ViewingMode.ALL);
                const includeCompletedHideout = e.target.checked;
                await this.itemTrackerManager.refresh(includeCompletedQuests, includeCompletedHideout);
                await this.refresh();
            });
        }

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
     * T013: Switch between Items, Hideout Progress, and Screenshot subtabs
     * T048: Enhanced to support screenshot tab
     * @param {string} subtabName - 'items', 'hideout', or 'screenshot'
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
        const screenshotContainer = this.container.querySelector('#screenshot-content');
        const filterSection = this.container.querySelector('.item-tracker-filters');
        const viewingModeToggle = this.container.querySelector('.viewing-mode-toggle');
        const statusFilterContainer = this.container.querySelector('.status-filter-container');
        const hideoutInclusionContainer = this.container.querySelector('.hideout-inclusion-container');

        if (subtabName === 'items') {
            itemListContainer.style.display = '';
            hideoutProgressContainer.style.display = 'none';
            screenshotContainer.style.display = 'none';
            filterSection.style.display = '';
            if (viewingModeToggle) viewingModeToggle.style.display = '';
            if (statusFilterContainer) statusFilterContainer.style.display = this.viewingMode === ViewingMode.ALL ? 'flex' : 'none';
            if (hideoutInclusionContainer) hideoutInclusionContainer.style.display = this.viewingMode === ViewingMode.ALL ? 'flex' : 'none';
        } else if (subtabName === 'hideout') {
            itemListContainer.style.display = 'none';
            hideoutProgressContainer.style.display = '';
            screenshotContainer.style.display = 'none';
            filterSection.style.display = 'none'; // Hide filters on hideout tab
            if (viewingModeToggle) viewingModeToggle.style.display = 'none';
            if (statusFilterContainer) statusFilterContainer.style.display = 'none';
            if (hideoutInclusionContainer) hideoutInclusionContainer.style.display = 'none';

            // Render hideout list if not already rendered
            if (this.hideoutList && this.hideoutManager) {
                this.hideoutList.render(this.hideoutManager.stations, this.hideoutManager);
            }
        } else if (subtabName === 'screenshot') {
            // T048: Screenshot tab
            itemListContainer.style.display = 'none';
            hideoutProgressContainer.style.display = 'none';
            screenshotContainer.style.display = '';
            filterSection.style.display = 'none';
            if (viewingModeToggle) viewingModeToggle.style.display = 'none';
            if (statusFilterContainer) statusFilterContainer.style.display = 'none';
            if (hideoutInclusionContainer) hideoutInclusionContainer.style.display = 'none';

            // T049: Initialize OCR components if not already done
            this.initializeOCRComponents();
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
     * T028: Enhanced to pass viewingMode to ItemList
     * T043: Enhanced to pass statusFilter to ItemList
     */
    applyFilters() {
        if (this.itemList) {
            this.itemList.applyFilters(this.currentFilter, this.hideCollected, this.viewingMode, this.statusFilter);
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
     * T017: Switch viewing mode between Active and All Quests
     * T047: Enhanced to reset statusFilter when switching to Active mode
     * T062: Enhanced to consider includeAllHideout flag
     * Feature: 006-all-quests-item-tracker (User Story 1 & 5)
     * @param {string} mode - ViewingMode.ACTIVE or ViewingMode.ALL
     */
    async switchViewingMode(mode) {
        this.viewingMode = mode;

        // T047: Reset status filter when switching to Active Quests mode
        if (mode === ViewingMode.ACTIVE) {
            this.statusFilter = StatusFilter.BOTH;
            this.includeAllHideout = false; // Reset hideout inclusion
        }

        this.saveFilters(); // T017: Persist mode selection

        // T062: Pass separate flags for quests and hideout
        const includeCompletedQuests = (mode === ViewingMode.ALL);
        const includeCompletedHideout = (mode === ViewingMode.ALL) && this.includeAllHideout;
        this.itemTrackerManager.refresh(includeCompletedQuests, includeCompletedHideout);

        await this.refresh();
        console.log(`Switched to ${mode} viewing mode`);
    }

    /**
     * T040: Apply status filter within All Quests mode
     * Feature: 006-all-quests-item-tracker (User Story 3)
     * @param {string} filter - StatusFilter.ACTIVE, StatusFilter.COMPLETED, or StatusFilter.BOTH
     */
    async applyStatusFilter(filter) {
        this.statusFilter = filter;
        this.saveFilters();
        await this.refresh();
        console.log(`Applied status filter: ${filter}`);
    }

    /**
     * T037: Handle quest update event
     * T018: Enhanced to pass viewingMode flag
     * T062: Enhanced to consider includeAllHideout flag
     */
    handleQuestUpdate() {
        console.log('Quest updated, refreshing item tracker...');
        const includeCompletedQuests = (this.viewingMode === ViewingMode.ALL);
        const includeCompletedHideout = (this.viewingMode === ViewingMode.ALL) && this.includeAllHideout;
        this.itemTrackerManager.refresh(includeCompletedQuests, includeCompletedHideout);
        // Fire and forget refresh (will await internally)
        this.refresh().catch(err => console.error('Failed to refresh:', err));
    }

    /**
     * T038: Handle hideout update event
     * T018: Enhanced to pass viewingMode flag
     */
    handleHideoutUpdate() {
        console.log('Hideout updated, refreshing item tracker...');
        const includeCompletedQuests = (this.viewingMode === ViewingMode.ALL);
        const includeCompletedHideout = (this.viewingMode === ViewingMode.ALL) && this.includeAllHideout;
        this.itemTrackerManager.refresh(includeCompletedQuests, includeCompletedHideout);
        // Fire and forget refresh (will await internally)
        this.refresh().catch(err => console.error('Failed to refresh:', err));
    }

    /**
     * T015: Handle hideout progress update event (priority recalculation)
     * T018: Enhanced to pass viewingMode flag
     * T062: Enhanced to pass separate flags
     */
    handleHideoutProgressUpdate() {
        console.log('Hideout progress updated, recalculating priorities...');
        const includeCompletedQuests = (this.viewingMode === ViewingMode.ALL);
        const includeCompletedHideout = (this.viewingMode === ViewingMode.ALL) && this.includeAllHideout;
        this.itemTrackerManager.refresh(includeCompletedQuests, includeCompletedHideout);
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
     * T015: Enhanced to load viewingMode
     * T038: Enhanced to load statusFilter
     */
    loadFilters() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const filters = JSON.parse(saved);
                this.currentFilter = filters.currentFilter || 'all';
                this.hideCollected = filters.hideCollected || false;
                this.viewingMode = filters.viewingMode || ViewingMode.ACTIVE; // T015: Load viewing mode
                this.statusFilter = filters.statusFilter || StatusFilter.BOTH; // T038: Load status filter
                this.includeAllHideout = filters.includeAllHideout || false; // T055: Load hideout inclusion
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
     * T016: Enhanced to save viewingMode
     * T039: Enhanced to save statusFilter
     * T056: Enhanced to save includeAllHideout
     */
    saveFilters() {
        try {
            const filters = {
                currentFilter: this.currentFilter,
                hideCollected: this.hideCollected,
                viewingMode: this.viewingMode, // T016: Save viewing mode
                statusFilter: this.statusFilter, // T039: Save status filter
                includeAllHideout: this.includeAllHideout // T056: Save hideout inclusion
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filters));
        } catch (error) {
            console.error('Failed to save filters:', error);
        }
    }

    /**
     * T049: Initialize OCR components for screenshot analysis
     */
    async initializeOCRComponents() {
        if (this.screenshotUploader && this.ocrResultsViewer) {
            // Already initialized
            return;
        }

        try {
            console.log('[OCR] Initializing OCR components...');

            // Initialize services
            this.ocrService = new OCRService();
            this.itemMatchingService = new ItemMatchingService(this.itemTrackerManager.items);
            this.recommendationService = new RecommendationService(
                this.itemTrackerManager,
                this.questManager,
                this.hideoutManager
            );

            // Initialize UI components
            const uploaderContainer = this.container.querySelector('#screenshot-uploader-container');
            const resultsContainer = this.container.querySelector('#ocr-results-container');

            if (uploaderContainer) {
                this.screenshotUploader = new ScreenshotUploader(
                    uploaderContainer,
                    (screenshot) => this.handleScreenshotUpload(screenshot)
                );
            }

            if (resultsContainer) {
                this.ocrResultsViewer = new OCRResultsViewer(resultsContainer);
                
                // T052: Attach event handlers
                this.ocrResultsViewer.onNewAnalysis = () => {
                    this.screenshotUploader.reset();
                    this.ocrResultsViewer.clear();
                };
                
                this.ocrResultsViewer.onAcceptAll = (session) => {
                    this.handleAcceptResults(session);
                };
                
                this.ocrResultsViewer.onRetry = () => {
                    this.screenshotUploader.reset();
                    this.ocrResultsViewer.clear();
                };
            }

            console.log('[OCR] OCR components initialized successfully');
        } catch (error) {
            console.error('[OCR] Failed to initialize OCR components:', error);
        }
    }

    /**
     * T051: Handle screenshot upload and start OCR analysis
     * @param {Object} screenshot - Screenshot object from ScreenshotService
     */
    async handleScreenshotUpload(screenshot) {
        console.log('[OCR] Starting analysis for screenshot:', screenshot.filename);

        try {
            // Show loading state
            this.ocrResultsViewer.showLoading();

            // Initialize OCR engine
            await this.ocrService.initialize();
            this.ocrResultsViewer.updateProgress(10, 'OCR engine initialized...');

            // Preprocess image
            const preprocessed = await this.ocrService.preprocessImage(screenshot.file);
            this.ocrResultsViewer.updateProgress(20, 'Image preprocessed...');

            // Run OCR
            this.ocrResultsViewer.updateProgress(30, 'Running text recognition...');
            const ocrResult = await this.ocrService.recognizeText(
                preprocessed,
                (progress) => {
                    // Update progress during OCR (30-70%)
                    const ocrProgress = 30 + (progress * 0.4);
                    this.ocrResultsViewer.updateProgress(ocrProgress, 'Recognizing text...');
                }
            );
            
            this.ocrResultsViewer.updateProgress(70, 'Text recognition complete...');

            // Match items
            this.ocrResultsViewer.updateProgress(75, 'Matching items...');
            const detectedItems = await this.itemMatchingService.matchAllItems(ocrResult.lines);
            this.ocrResultsViewer.updateProgress(85, `Matched ${detectedItems.length} items...`);

            // Generate recommendations
            this.ocrResultsViewer.updateProgress(90, 'Generating recommendations...');
            const itemsWithRecommendations = await this.recommendationService.generateRecommendations(detectedItems);
            
            // Update OCR result with detected items
            ocrResult.detectedItems = itemsWithRecommendations;

            // Create analysis session
            const analysisSession = new AnalysisSession(screenshot, ocrResult);
            analysisSession.status = 'ANALYZED';

            this.ocrResultsViewer.updateProgress(100, 'Analysis complete!');

            // Show results
            setTimeout(() => {
                this.ocrResultsViewer.showResults(analysisSession);
            }, 500);

            console.log('[OCR] Analysis complete:', {
                itemsDetected: detectedItems.length,
                recommendations: {
                    keep: itemsWithRecommendations.filter(i => i.recommendation.action === 'KEEP').length,
                    sell: itemsWithRecommendations.filter(i => i.recommendation.action === 'SELL').length
                }
            });

        } catch (error) {
            console.error('[OCR] Analysis failed:', error);
            this.ocrResultsViewer.showError(error);
        } finally {
            // Terminate OCR worker
            if (this.ocrService) {
                await this.ocrService.terminate();
            }
        }
    }

    /**
     * T052: Handle accepting all results (placeholder for future tracker update)
     * @param {Object} session - Analysis session with confirmed items
     */
    handleAcceptResults(session) {
        console.log('[OCR] Results accepted:', {
            itemCount: session.ocrResult.detectedItems.length,
            timestamp: session.timestamp
        });

        // TODO (User Story 3): Implement tracker update functionality
        alert(`Results accepted! ${session.ocrResult.detectedItems.length} items detected.\n\nTracker update functionality will be implemented in the next phase (User Story 3).`);

        // For now, just show a success message
        // In User Story 3, this will call OCRUpdateService to update ItemStorageService
    }
}

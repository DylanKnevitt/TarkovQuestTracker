/**
 * Hideout List Component
 * Feature: 004-hideout-item-enhancements
 * Displays grid of hideout modules with build status tracking
 */

import { HideoutCard } from './hideout-card.js';

/**
 * T012: HideoutList component
 * Manages rendering and interaction for hideout module grid
 */
export class HideoutList {
    /**
     * @param {string} containerId - ID of container element
     */
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.hideoutManager = null;
        this.modules = [];
        this.searchQuery = '';
        this.sortBy = 'buildable'; // 'buildable' or 'name'
    }

    /**
     * Render hideout module grid
     * @param {Array<HideoutModule>} modules - Array of hideout modules
     * @param {HideoutManager} hideoutManager - Manager for build status checks
     */
    render(modules, hideoutManager) {
        this.modules = modules;
        this.hideoutManager = hideoutManager;
        this.container = document.getElementById(this.containerId);

        if (!this.container) {
            console.error(`[HideoutList] Container not found: ${this.containerId}`);
            return;
        }

        // Filter modules by search query
        let filteredModules = this.filterModules(modules);

        // Sort modules
        filteredModules = this.sortModules(filteredModules, hideoutManager);

        // Generate cards HTML
        const cardsHtml = filteredModules.length > 0
            ? filteredModules.map(module => HideoutCard.render(module, hideoutManager)).join('')
            : '<div class="no-results">No hideout modules found matching your search.</div>';

        // Wrap in grid container
        this.container.innerHTML = `
            <div class="hideout-list-header">
                <h2>Hideout Build Progress</h2>
                <p class="hideout-stats">${this.generateStatsText(hideoutManager)}</p>
            </div>
            <div class="hideout-controls">
                <input 
                    type="text" 
                    id="hideout-search" 
                    class="hideout-search-input" 
                    placeholder="Search by module name..."
                    value="${this.searchQuery}"
                />
                <select id="hideout-sort" class="hideout-sort-select">
                    <option value="buildable" ${this.sortBy === 'buildable' ? 'selected' : ''}>Sort by: Buildable First</option>
                    <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Sort by: Name</option>
                </select>
            </div>
            <div class="hideout-grid">
                ${cardsHtml}
            </div>
        `;

        // Attach event listeners
        this.attachEventListeners();
    }

    /**
     * Generate statistics text
     * @param {HideoutManager} hideoutManager
     * @returns {string}
     */
    generateStatsText(hideoutManager) {
        const stats = hideoutManager.getStats();
        return `${stats.completed} / ${stats.total} modules built (${stats.completionRate}%) • ${stats.buildable} buildable now`;
    }

    /**
     * Attach event listeners for toggle buttons, search, and sort
     */
    attachEventListeners() {
        if (!this.container) return;

        // Search input
        const searchInput = this.container.querySelector('#hideout-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                // Store cursor position before re-render
                const cursorPosition = e.target.selectionStart;
                this.render(this.modules, this.hideoutManager);
                // Restore focus and cursor position after re-render
                const newSearchInput = this.container.querySelector('#hideout-search');
                if (newSearchInput) {
                    newSearchInput.focus();
                    newSearchInput.setSelectionRange(cursorPosition, cursorPosition);
                }
            });
        }

        // Sort dropdown
        const sortSelect = this.container.querySelector('#hideout-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.render(this.modules, this.hideoutManager);
            });
        }

        // Delegate click events for toggle buttons
        this.container.addEventListener('click', async (e) => {
            const button = e.target.closest('.toggle-build-btn');
            if (!button) return;

            const moduleKey = button.dataset.moduleKey;
            const wasCompleted = button.dataset.completed === 'true';

            await this.handleToggleBuild(moduleKey, !wasCompleted);
        });
    }

    /**
     * Handle toggle build button click
     * @param {string} moduleKey - Format: "stationId-level"
     * @param {boolean} completed - New completion status
     */
    async handleToggleBuild(moduleKey, completed) {
        try {
            // Update hideout manager state (triggers database sync)
            await this.hideoutManager.toggleModuleBuild(moduleKey);

            // Re-render list to reflect changes
            this.render(this.modules, this.hideoutManager);

            // Dispatch event for priority recalculation
            document.dispatchEvent(new CustomEvent('priorityRecalculationNeeded', {
                detail: { source: 'hideout', moduleKey, completed }
            }));

            console.log(`[HideoutList] Module ${moduleKey} toggled to ${completed ? 'built' : 'unbuilt'}`);
        } catch (error) {
            console.error(`[HideoutList] Failed to toggle module ${moduleKey}:`, error);
            alert('Failed to update hideout build status. Please try again.');
        }
    }

    /**
     * Filter modules by search query
     * @param {Array<HideoutModule>} modules
     * @returns {Array<HideoutModule>}
     */
    filterModules(modules) {
        if (!this.searchQuery || this.searchQuery.trim() === '') {
            return modules;
        }

        return modules.filter(module => {
            const stationName = module.stationName.toLowerCase();
            const fullName = `${stationName} level ${module.level}`.toLowerCase();
            return fullName.includes(this.searchQuery);
        });
    }

    /**
     * Sort modules by buildable status or name
     * @param {Array<HideoutModule>} modules
     * @param {HideoutManager} hideoutManager
     * @returns {Array<HideoutModule>}
     */
    sortModules(modules, hideoutManager) {
        const sorted = [...modules];

        if (this.sortBy === 'buildable') {
            // Sort by: Buildable > Locked > Built, then by name within each group
            sorted.sort((a, b) => {
                const aBuilt = hideoutManager.isModuleCompleted(a.moduleKey);
                const bBuilt = hideoutManager.isModuleCompleted(b.moduleKey);
                const aBuildable = hideoutManager.isModuleBuildable(a.stationId, a.level);
                const bBuildable = hideoutManager.isModuleBuildable(b.stationId, b.level);

                // Priority: Buildable (2) > Locked (1) > Built (0)
                // Built modules go to the bottom
                const aPriority = aBuilt ? 0 : (aBuildable ? 2 : 1);
                const bPriority = bBuilt ? 0 : (bBuildable ? 2 : 1);

                if (aPriority !== bPriority) {
                    return bPriority - aPriority; // Higher priority first
                }

                // Within same priority, sort by name
                return a.stationName.localeCompare(b.stationName) || a.level - b.level;
            });
        } else {
            // Sort by name and level
            sorted.sort((a, b) => {
                const nameCompare = a.stationName.localeCompare(b.stationName);
                return nameCompare !== 0 ? nameCompare : a.level - b.level;
            });
        }

        return sorted;
    }

    /**
     * Clear the list
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

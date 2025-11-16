/**
 * UserComparison Component
 * 
 * Main component for user quest progress comparison feature.
 * Manages user list, quest list, and intersection calculation.
 */

import { UserList } from './user-list.js';
import { ComparisonQuestList } from './comparison-quest-list.js';
import { UserQuestProgress } from '../models/user-quest-progress.js';
import { getComparisonService } from '../services/comparison-service.js';

export class UserComparison {
    static MAX_SELECTED_USERS = 10;

    /**
     * Create a UserComparison component
     * @param {string} containerId - ID of the container element
     * @param {QuestManager} questManager - QuestManager instance for quest data
     */
    constructor(containerId, questManager) {
        this.container = document.getElementById(containerId);
        this.questManager = questManager;
        this.comparisonService = getComparisonService();

        this.userList = null;
        this.questList = null;
        this.users = [];
        this.selectedUserIds = [];
        this.userProgressMap = new Map(); // userId -> UserQuestProgress

        this.isLoading = false;
        this.error = null;
    }

    /**
     * Initialize and render the component
     */
    async initialize() {
        if (!this.container) {
            console.error('Comparison container not found');
            return;
        }

        // Check if comparison service is available
        if (!this.comparisonService.isAvailable()) {
            this.renderUnavailable();
            return;
        }

        // Render loading state
        this.renderLoading();

        // Fetch user profiles
        await this.loadUserProfiles();

        // Load selection from URL if present (T050-T051)
        await this.loadFromUrl();

        // Render initial view
        this.render();
    }

    /**
     * Load user profiles from ComparisonService
     */
    async loadUserProfiles() {
        this.isLoading = true;
        this.error = null;

        const { data, error } = await this.comparisonService.fetchAllUserProfiles();

        if (error) {
            console.error('Failed to load user profiles:', error);
            this.error = error;
            this.isLoading = false;
            return;
        }

        this.users = data || [];
        this.isLoading = false;
    }

    /**
     * Render the main component
     */
    render() {
        if (!this.container) return;

        // Clear container
        this.container.innerHTML = '';

        // Handle error state
        if (this.error) {
            this.renderError();
            return;
        }

        // Create header
        const header = this.createHeader();
        this.container.appendChild(header);

        // Create main content area
        const content = document.createElement('div');
        content.className = 'comparison-content';

        // Create user list section
        const userListSection = document.createElement('div');
        userListSection.className = 'user-list-section';

        this.userList = new UserList(
            userListSection,
            this.users,
            (userId) => this.handleUserSelection(userId)
        );
        this.userList.render();

        // Create quest list section
        const questListSection = document.createElement('div');
        questListSection.className = 'quest-list-section';
        questListSection.id = 'comparison-quest-list-section';

        this.questList = new ComparisonQuestList(questListSection, this.questManager);
        this.questList.render();

        content.appendChild(userListSection);
        content.appendChild(questListSection);

        this.container.appendChild(content);
    }

    /**
     * Create header with title and action buttons
     * @returns {HTMLElement} Header element
     */
    createHeader() {
        const header = document.createElement('div');
        header.className = 'comparison-header';

        const title = document.createElement('h2');
        title.textContent = '👥 User Quest Comparison';

        const actions = document.createElement('div');
        actions.className = 'comparison-actions';

        // Share Comparison button
        const shareBtn = document.createElement('button');
        shareBtn.className = 'share-comparison-btn';
        shareBtn.textContent = '🔗 Share';
        shareBtn.title = 'Copy shareable link to clipboard';
        shareBtn.style.display = this.selectedUserIds.length > 0 ? 'inline-block' : 'none';
        shareBtn.addEventListener('click', () => this.handleShareComparison());
        actions.appendChild(shareBtn);

        // Clear Selection button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'clear-selection-btn';
        clearBtn.textContent = '✕ Clear Selection';
        clearBtn.title = 'Clear all selected users';
        clearBtn.style.display = this.selectedUserIds.length > 0 ? 'inline-block' : 'none';
        clearBtn.addEventListener('click', () => this.handleClearSelection());
        actions.appendChild(clearBtn);

        // Refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = '🔄 Refresh';
        refreshBtn.title = 'Reload user list';
        refreshBtn.addEventListener('click', () => this.handleRefresh());
        actions.appendChild(refreshBtn);

        header.appendChild(title);
        header.appendChild(actions);

        return header;
    }

    /**
     * Handle user selection event
     * @param {string} userId - User ID that was selected/deselected
     */
    async handleUserSelection(userId) {
        // Update selected users array
        const index = this.selectedUserIds.indexOf(userId);
        if (index > -1) {
            // User was deselected
            this.selectedUserIds.splice(index, 1);
        } else {
            // Check max selection limit
            if (this.selectedUserIds.length >= UserComparison.MAX_SELECTED_USERS) {
                this.showMaxSelectionWarning();
                // Deselect the user in UI
                if (this.userList) {
                    this.userList.selectedUserIds.delete(userId);
                    this.userList.updateSelectionVisuals();
                }
                return;
            }
            // User was selected
            this.selectedUserIds.push(userId);
        }

        // If user was selected and we don't have their progress, fetch it
        if (index === -1 && !this.userProgressMap.has(userId)) {
            const { data, error } = await this.comparisonService.fetchUserProgress(userId);
            if (data && !error) {
                this.userProgressMap.set(userId, data);
            }
        }

        // Update button visibility
        this.updateActionButtonsVisibility();

        // Update quest list
        await this.updateQuestList();
    }

    /**
     * Update quest list based on selected users
     * Calculates intersection of incomplete quests for all selected users
     */
    async updateQuestList() {
        if (!this.questList) return;

        // If no users selected, show empty state
        if (this.selectedUserIds.length === 0) {
            this.questList.setSelectedUsers([], new Map(), this.users);
            this.questList.setFilteredQuests([]);
            this.questList.render();
            return;
        }

        // Get all quests from QuestManager
        const allQuests = this.questManager.quests;
        if (!allQuests || allQuests.length === 0) {
            this.questList.setSelectedUsers(this.selectedUserIds, this.userProgressMap, this.users);
            this.questList.setFilteredQuests([]);
            this.questList.render();
            return;
        }

        // Calculate intersection of incomplete quests
        const incompleteQuests = this.calculateQuestIntersection(allQuests);

        // Update quest list component
        this.questList.setSelectedUsers(this.selectedUserIds, this.userProgressMap, this.users);
        this.questList.setFilteredQuests(incompleteQuests);
        this.questList.render();
    }

    /**
     * Calculate intersection of incomplete quests across selected users
     * @param {Array} allQuests - All quests from QuestManager
     * @returns {Array} Quests that are incomplete for ALL selected users
     */
    calculateQuestIntersection(allQuests) {
        if (this.selectedUserIds.length === 0) {
            return [];
        }

        // Get UserQuestProgress objects for selected users
        const selectedProgress = [];
        for (const userId of this.selectedUserIds) {
            const progress = this.userProgressMap.get(userId);
            if (progress) {
                selectedProgress.push(progress);
            }
        }

        // If we don't have progress for all selected users, return empty
        if (selectedProgress.length !== this.selectedUserIds.length) {
            return [];
        }

        // Get all quest IDs
        const allQuestIds = allQuests.map(q => q.id);

        // Use UserQuestProgress static method to calculate intersection
        const incompleteQuestIds = UserQuestProgress.calculateIntersection(
            selectedProgress,
            allQuestIds
        );

        // Filter quests to only those in the intersection
        const incompleteQuests = allQuests.filter(quest =>
            incompleteQuestIds.includes(quest.id)
        );

        return incompleteQuests;
    }

    /**
     * Handle clear selection button click
     */
    handleClearSelection() {
        // Clear selected users
        this.selectedUserIds = [];

        // Clear visual selection in UserList
        if (this.userList) {
            this.userList.clearSelection();
        }

        // Clear URL parameters
        this.clearUrlParams();

        // Update button visibility
        this.updateActionButtonsVisibility();

        // Update quest list to show empty state
        this.updateQuestList();
    }

    /**
     * Handle refresh button click
     */
    async handleRefresh() {
        // Clear cache
        this.comparisonService.clearCache();

        // Reset state
        this.selectedUserIds = [];
        this.userProgressMap.clear();
        if (this.userList) {
            this.userList.clearSelection();
        }

        // Reload
        await this.initialize();
    }

    /**
     * Render loading state
     */
    renderLoading() {
        if (!this.container) return;

        this.container.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading users...</p>
      </div>
    `;
    }

    /**
     * Render error state
     */
    renderError() {
        if (!this.container) return;

        this.container.innerHTML = `
      <div class="error-state">
        <div class="error-state-icon">⚠️</div>
        <div class="error-state-message">Failed to load user comparison</div>
        <div class="error-state-hint">${this.error ? this.error.message : 'Unknown error'}</div>
        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
    }

    /**
     * Render unavailable state (Supabase not configured)
     */
    renderUnavailable() {
        if (!this.container) return;

        this.container.innerHTML = `
      <div class="error-state">
        <div class="error-state-icon">🔒</div>
        <div class="error-state-message">User Comparison Unavailable</div>
        <div class="error-state-hint">
          This feature requires cloud sync to be configured.<br>
          Set up your Supabase connection to compare progress with other users.
        </div>
      </div>
    `;
    }

    /**
     * Show max selection warning
     */
    showMaxSelectionWarning() {
        // Create or update warning message
        let warning = this.container.querySelector('.max-selection-warning');
        if (!warning) {
            warning = document.createElement('div');
            warning.className = 'max-selection-warning';
            const header = this.container.querySelector('.comparison-header');
            if (header && header.nextSibling) {
                this.container.insertBefore(warning, header.nextSibling);
            }
        }

        warning.textContent = `⚠️ Maximum ${UserComparison.MAX_SELECTED_USERS} users can be selected`;
        warning.style.display = 'block';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            warning.style.display = 'none';
        }, 3000);
    }

    /**
     * Update action button visibility (Clear and Share)
     */
    updateActionButtonsVisibility() {
        const clearBtn = this.container.querySelector('.clear-selection-btn');
        const shareBtn = this.container.querySelector('.share-comparison-btn');
        const hasSelection = this.selectedUserIds.length > 0;
        
        if (clearBtn) {
            clearBtn.style.display = hasSelection ? 'inline-block' : 'none';
        }
        if (shareBtn) {
            shareBtn.style.display = hasSelection ? 'inline-block' : 'none';
        }
    }

    /**
     * Generate shareable URL with selected user IDs (T048)
     * @returns {string} Shareable URL
     */
    generateShareUrl() {
        if (this.selectedUserIds.length === 0) {
            return window.location.href.split('?')[0];
        }

        const url = new URL(window.location.href);
        url.searchParams.set('users', this.selectedUserIds.join(','));
        return url.toString();
    }

    /**
     * Handle share comparison button click (T049, T052)
     * Copy shareable URL to clipboard and show toast notification
     */
    async handleShareComparison() {
        const shareUrl = this.generateShareUrl();

        try {
            await navigator.clipboard.writeText(shareUrl);
            this.showToast('✅ Link copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback: show URL in prompt
            prompt('Copy this link:', shareUrl);
        }
    }

    /**
     * Load selection from URL parameters (T050-T051, T054)
     * Parse URL params and pre-select users on page load
     */
    async loadFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const usersParam = urlParams.get('users');

        if (!usersParam) return;

        // Parse user IDs from URL
        const userIds = usersParam.split(',').filter(id => id.trim());

        if (userIds.length === 0) return;

        // Filter out invalid/deleted user IDs (T054)
        const validUserIds = userIds.filter(userId => 
            this.users.some(user => user.id === userId)
        );

        if (validUserIds.length === 0) {
            console.warn('No valid user IDs found in URL');
            return;
        }

        // Pre-select users
        for (const userId of validUserIds) {
            if (this.selectedUserIds.length >= UserComparison.MAX_SELECTED_USERS) {
                break;
            }
            this.selectedUserIds.push(userId);

            // Fetch user progress
            const { data, error } = await this.comparisonService.fetchUserProgress(userId);
            if (data && !error) {
                this.userProgressMap.set(userId, data);
            }
        }

        // Update UserList visual selection
        if (this.userList && this.selectedUserIds.length > 0) {
            this.userList.selectedUserIds = new Set(this.selectedUserIds);
        }
    }

    /**
     * Show toast notification (T052)
     * @param {string} message - Message to display
     */
    showToast(message) {
        // Create or reuse toast element
        let toast = document.querySelector('.comparison-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'comparison-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.display = 'block';
        toast.classList.add('show');

        // Auto-hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.style.display = 'none';
            }, 300);
        }, 3000);
    }

    /**
     * Clear URL parameters
     */
    clearUrlParams() {
        const url = new URL(window.location.href);
        url.searchParams.delete('users');
        window.history.replaceState({}, '', url.toString());
    }
}

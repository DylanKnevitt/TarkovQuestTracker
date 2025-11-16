/**
 * ComparisonQuestList Component
 * 
 * Displays filtered quest list showing quests incomplete for selected users.
 * Groups quests by trader and supports visual completion indicators.
 */

export class ComparisonQuestList {
    /**
     * Create a ComparisonQuestList component
     * @param {HTMLElement} container - Container element to render into
     * @param {QuestManager} questManager - QuestManager instance for quest data
     */
    constructor(container, questManager) {
        this.container = container;
        this.questManager = questManager;
        this.filteredQuests = [];
        this.selectedUserIds = [];
        this.userProgressMap = new Map(); // userId -> UserQuestProgress
    }

    /**
     * Set filtered quests to display
     * @param {Array} quests - Array of Quest objects
     */
    setFilteredQuests(quests) {
        this.filteredQuests = quests;
    }

    /**
     * Set selected users and their progress data
     * @param {Array<string>} userIds - Array of selected user IDs
     * @param {Map<string, UserQuestProgress>} progressMap - Map of userId -> UserQuestProgress
     * @param {Array<UserProfile>} userProfiles - Optional array of UserProfile objects
     */
    setSelectedUsers(userIds, progressMap, userProfiles = null) {
        this.selectedUserIds = userIds;
        this.userProgressMap = progressMap;

        // Build user profiles map for easy lookup
        this.userProfilesMap = new Map();
        if (userProfiles) {
            userProfiles.forEach(profile => {
                this.userProfilesMap.set(profile.id, profile);
            });
        }
    }

    /**
     * Render the quest list
     */
    render() {
        if (!this.container) return;

        // Clear container
        this.container.innerHTML = '';

        // Create header
        const header = document.createElement('div');
        header.className = 'quest-list-header';

        const title = document.createElement('h3');
        title.textContent = 'Common Incomplete Quests';

        const countDisplay = document.createElement('div');
        countDisplay.className = 'quest-count-display';

        if (this.selectedUserIds.length === 0) {
            countDisplay.textContent = 'Select users to compare';
        } else if (this.selectedUserIds.length === 1) {
            countDisplay.textContent = `${this.filteredQuests.length} quests incomplete for selected user`;
        } else {
            countDisplay.textContent = `${this.filteredQuests.length} quests incomplete for all ${this.selectedUserIds.length} selected users`;
        }

        header.appendChild(title);
        header.appendChild(countDisplay);
        this.container.appendChild(header);

        // Create quest list container
        const listContainer = document.createElement('div');
        listContainer.className = 'quest-list-container';

        // Handle empty state
        if (this.selectedUserIds.length === 0) {
            listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎯</div>
          <div class="empty-state-message">No users selected</div>
          <div class="empty-state-hint">Click on one or more users to see their incomplete quests</div>
        </div>
      `;
            this.container.appendChild(listContainer);
            return;
        }

        if (this.filteredQuests.length === 0) {
            listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <div class="empty-state-message">No common incomplete quests</div>
          <div class="empty-state-hint">All selected users have completed these quests, or try selecting fewer users</div>
        </div>
      `;
            this.container.appendChild(listContainer);
            return;
        }

        // Group quests by trader
        const questsByTrader = this.groupQuestsByTrader(this.filteredQuests);

        // Render grouped quests
        Object.keys(questsByTrader).sort().forEach(trader => {
            const quests = questsByTrader[trader];

            // Create trader group
            const traderGroup = document.createElement('div');
            traderGroup.className = 'quest-trader-group';

            const traderHeader = document.createElement('div');
            traderHeader.className = 'trader-header';
            traderHeader.innerHTML = `
        <h4>${this.capitalizeTrader(trader)}</h4>
        <span class="quest-count">${quests.length} quest${quests.length !== 1 ? 's' : ''}</span>
      `;
            traderGroup.appendChild(traderHeader);

            // Render quests in group
            quests.forEach(quest => {
                const questItem = this.createQuestItem(quest);
                traderGroup.appendChild(questItem);
            });

            listContainer.appendChild(traderGroup);
        });

        this.container.appendChild(listContainer);
    }

    /**
     * Group quests by trader
     * @param {Array} quests - Array of Quest objects
     * @returns {Object} Object with trader names as keys and quest arrays as values
     */
    groupQuestsByTrader(quests) {
        const grouped = {};

        quests.forEach(quest => {
            const trader = quest.giver?.name?.toLowerCase() || 'unknown';
            if (!grouped[trader]) {
                grouped[trader] = [];
            }
            grouped[trader].push(quest);
        });

        return grouped;
    }

    /**
     * Create a quest item element
     * @param {Quest} quest - Quest object
     * @returns {HTMLElement} Quest item element
     */
    createQuestItem(quest) {
        const item = document.createElement('div');
        item.className = 'quest-item';
        item.dataset.questId = quest.id;

        // Quest name and level
        const header = document.createElement('div');
        header.className = 'quest-header';

        const name = document.createElement('span');
        name.className = 'quest-name';
        name.textContent = quest.name;

        const level = document.createElement('span');
        level.className = 'quest-level';
        level.textContent = `Level ${quest.minPlayerLevel || 1}`;

        header.appendChild(name);

        // Add completion summary if multiple users selected (T043)
        if (this.selectedUserIds.length > 1) {
            const summary = this.createCompletionSummary(quest.id);
            if (summary) {
                header.appendChild(summary);
            }
        }

        header.appendChild(level);

        // Quest objectives summary
        const objectives = document.createElement('div');
        objectives.className = 'quest-objectives';
        const objectiveCount = quest.objectives?.length || 0;
        objectives.textContent = `${objectiveCount} objective${objectiveCount !== 1 ? 's' : ''}`;

        item.appendChild(header);
        item.appendChild(objectives);

        // Add completion indicators (T040-T042)
        if (this.selectedUserIds.length > 0) {
            const indicators = this.renderCompletionIndicators(quest.id);
            if (indicators) {
                item.appendChild(indicators);
            }
        }

        // Add click handler to show details
        item.addEventListener('click', () => {
            this.showQuestDetails(quest.id);
        });

        return item;
    }

    /**
     * Create completion summary for quest (T043)
     * @param {string} questId - Quest ID
     * @returns {HTMLElement|null} Completion summary element or null
     */
    createCompletionSummary(questId) {
        if (this.selectedUserIds.length === 0) return null;

        let completedCount = 0;
        this.selectedUserIds.forEach(userId => {
            const progress = this.userProgressMap.get(userId);
            if (progress && progress.isQuestCompleted(questId)) {
                completedCount++;
            }
        });

        const summary = document.createElement('span');
        summary.className = 'completion-summary';
        summary.textContent = `${completedCount}/${this.selectedUserIds.length} completed`;
        summary.title = `${completedCount} out of ${this.selectedUserIds.length} users completed this quest`;

        return summary;
    }

    /**
     * Render completion indicators for a quest (T041)
     * Shows checkmark or circle for each selected user
     * @param {string} questId - Quest ID
     * @returns {HTMLElement|null} Indicators container or null
     */
    renderCompletionIndicators(questId) {
        if (this.selectedUserIds.length === 0) return null;

        const container = document.createElement('div');
        container.className = 'completion-indicators';

        // Get user profiles to show initials
        this.selectedUserIds.forEach(userId => {
            const progress = this.userProgressMap.get(userId);
            if (!progress) return; // Skip if no progress data (T046)

            const isCompleted = progress.isQuestCompleted(questId);

            // Create indicator badge (T044-T045)
            const indicator = document.createElement('div');
            indicator.className = `indicator ${isCompleted ? 'completed' : 'incomplete'}`;

            // Get user initials from progress object
            const userEmail = this.getUserEmail(userId);
            const initials = this.getUserInitials(userEmail);

            // Icon: checkmark for completed, circle for incomplete
            const icon = document.createElement('span');
            icon.className = 'indicator-icon';
            icon.textContent = isCompleted ? '✓' : '○'; // ✓ or ○

            // User initials badge
            const badge = document.createElement('span');
            badge.className = 'indicator-badge';
            badge.textContent = initials;

            indicator.appendChild(icon);
            indicator.appendChild(badge);

            // Tooltip showing user email and status (T042)
            const statusText = isCompleted ? 'Completed' : 'Incomplete';
            indicator.title = `${userEmail}: ${statusText}`;

            container.appendChild(indicator);
        });

        return container;
    }

    /**
     * Get user email from user ID (helper for indicators)
     * @param {string} userId - User ID
     * @returns {string} User email or ID
     */
    getUserEmail(userId) {
        const profile = this.userProfilesMap?.get(userId);
        if (profile) {
            return profile.email;
        }
        return userId.substring(0, 8);
    }

    /**
     * Get user initials from email
     * @param {string} email - User email
     * @returns {string} Two-letter initials
     */
    getUserInitials(email) {
        if (!email) return '??';
        const parts = email.split('@')[0].split('.');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return email.substring(0, 2).toUpperCase();
    }

    /**
     * Show quest details modal (delegates to QuestList component)
     * @param {string} questId - Quest ID
     */
    showQuestDetails(questId) {
        // Find the main QuestList component and delegate
        // This is a temporary solution - ideally we'd have a shared modal service
        const questListElement = document.getElementById('quest-list');
        if (questListElement && questListElement.__questListComponent) {
            questListElement.__questListComponent.showQuestDetails(questId);
        } else {
            console.log('Quest details:', questId);
            // Fallback: just log for now
        }
    }

    /**
     * Capitalize trader name
     * @param {string} trader - Trader name
     * @returns {string} Capitalized trader name
     */
    capitalizeTrader(trader) {
        if (!trader) return 'Unknown';
        return trader.charAt(0).toUpperCase() + trader.slice(1);
    }

    /**
     * Clear the quest list
     */
    clear() {
        this.filteredQuests = [];
        this.selectedUserIds = [];
        this.userProgressMap.clear();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

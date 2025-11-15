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
   */
  setSelectedUsers(userIds, progressMap) {
    this.selectedUserIds = userIds;
    this.userProgressMap = progressMap;
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
    header.appendChild(level);

    // Quest objectives summary
    const objectives = document.createElement('div');
    objectives.className = 'quest-objectives';
    const objectiveCount = quest.objectives?.length || 0;
    objectives.textContent = `${objectiveCount} objective${objectiveCount !== 1 ? 's' : ''}`;

    item.appendChild(header);
    item.appendChild(objectives);

    // Add click handler to show details
    item.addEventListener('click', () => {
      this.showQuestDetails(quest.id);
    });

    return item;
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

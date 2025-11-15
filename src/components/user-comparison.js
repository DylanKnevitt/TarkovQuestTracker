/**
 * UserComparison Component
 * 
 * Main component for user quest progress comparison feature.
 * Manages user list, quest list, and intersection calculation.
 */

import { UserList } from './user-list.js';
import { getComparisonService } from '../services/comparison-service.js';

export class UserComparison {
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
    this.renderQuestListPlaceholder(questListSection);

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
   * Render placeholder for quest list when no users selected
   * @param {HTMLElement} container - Quest list section container
   */
  renderQuestListPlaceholder(container) {
    container.innerHTML = `
      <div class="quest-list-header">
        <h3>Common Incomplete Quests</h3>
        <div class="quest-count-display">Select users to compare</div>
      </div>
      <div class="quest-list-container">
        <div class="empty-state">
          <div class="empty-state-icon">🎯</div>
          <div class="empty-state-message">No users selected</div>
          <div class="empty-state-hint">Click on one or more users to see their incomplete quests</div>
        </div>
      </div>
    `;
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

    // Update quest list
    await this.updateQuestList();
  }

  /**
   * Update quest list based on selected users
   */
  async updateQuestList() {
    const questListSection = document.getElementById('comparison-quest-list-section');
    if (!questListSection) return;

    // If no users selected, show placeholder
    if (this.selectedUserIds.length === 0) {
      this.renderQuestListPlaceholder(questListSection);
      return;
    }

    // TODO: Implement quest list update in next phase (US2)
    // For now, show selected count
    questListSection.innerHTML = `
      <div class="quest-list-header">
        <h3>Common Incomplete Quests</h3>
        <div class="quest-count-display">
          ${this.selectedUserIds.length} user${this.selectedUserIds.length !== 1 ? 's' : ''} selected
        </div>
      </div>
      <div class="quest-list-container">
        <div class="empty-state">
          <div class="empty-state-message">Quest filtering coming in next phase...</div>
          <div class="empty-state-hint">Selected: ${this.selectedUserIds.map(id => {
            const user = this.users.find(u => u.id === id);
            return user ? user.getDisplayName() : id;
          }).join(', ')}</div>
        </div>
      </div>
    `;
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
}

/**
 * UserList Component
 * 
 * Displays a list of all users with quest progress statistics.
 * Handles user selection events for comparison feature.
 */

export class UserList {
    /**
     * Create a UserList component
     * @param {HTMLElement} container - Container element to render into
     * @param {Array<UserProfile>} users - Array of UserProfile instances
     * @param {Function} onUserSelected - Callback when user is selected (userId) => void
     */
    constructor(container, users = [], onUserSelected = null) {
        this.container = container;
        this.users = users;
        this.selectedUserIds = new Set();
        this.onUserSelected = onUserSelected;
    }

    /**
     * Update the user list data
     * @param {Array<UserProfile>} users - New array of UserProfile instances
     */
    setUsers(users) {
        this.users = users;
    }

    /**
     * Set selected users
     * @param {Set<string>} selectedIds - Set of selected user IDs
     */
    setSelectedUsers(selectedIds) {
        this.selectedUserIds = selectedIds;
    }

    /**
     * Render the user list
     */
    render() {
        if (!this.container) return;

        // Clear container
        this.container.innerHTML = '';

        // Create header
        const header = document.createElement('div');
        header.className = 'user-list-header';
        header.innerHTML = `
      <h3>Users</h3>
      <div class="user-list-stats">
        ${this.users.length} user${this.users.length !== 1 ? 's' : ''} with quest progress
        ${this.selectedUserIds.size > 0 ? `<br><strong>${this.selectedUserIds.size} selected</strong>` : ''}
      </div>
    `;
        this.container.appendChild(header);

        // Create user list container
        const listContainer = document.createElement('div');
        listContainer.className = 'user-list-container';

        // Render empty state if no users
        if (this.users.length === 0) {
            listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-message">No users found</div>
          <div class="empty-state-hint">You are the only user. Invite friends to compare progress!</div>
        </div>
      `;
            this.container.appendChild(listContainer);
            return;
        }

        // Render user cards
        this.users.forEach(user => {
            const userCard = this.createUserCard(user);
            listContainer.appendChild(userCard);
        });

        this.container.appendChild(listContainer);
    }

    /**
     * Create a user card element
     * @param {UserProfile} user - UserProfile instance
     * @returns {HTMLElement} User card element
     */
    createUserCard(user) {
        const card = document.createElement('div');
        card.className = 'user-card';
        card.dataset.userId = user.id;

        // Add selected class if user is selected
        if (this.selectedUserIds.has(user.id)) {
            card.classList.add('selected');
        }

        // Create avatar
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.textContent = user.getInitials();
        avatar.style.background = this.getAvatarColor(user.completionPercentage);

        // Create user info
        const info = document.createElement('div');
        info.className = 'user-info';

        const email = document.createElement('div');
        email.className = 'user-email';
        email.textContent = user.getDisplayName();
        email.title = user.email; // Full email on hover

        const stats = document.createElement('div');
        stats.className = 'user-stats';
        stats.innerHTML = `
      ${user.completedCount}/${user.totalQuests} quests
      <span class="completion-badge">${user.completionPercentage}%</span>
    `;

        info.appendChild(email);
        info.appendChild(stats);

        // Assemble card
        card.appendChild(avatar);
        card.appendChild(info);

        // Add click handler
        card.addEventListener('click', () => {
            this.handleUserClick(user.id);
        });

        return card;
    }

    /**
     * Handle user card click
     * @param {string} userId - User ID that was clicked
     */
    handleUserClick(userId) {
        // Toggle selection
        if (this.selectedUserIds.has(userId)) {
            this.selectedUserIds.delete(userId);
        } else {
            this.selectedUserIds.add(userId);
        }

        // Update visual state
        this.updateSelectionVisuals();

        // Notify parent component
        if (this.onUserSelected) {
            this.onUserSelected(userId);
        }
    }

    /**
     * Update visual state of selected cards
     */
    updateSelectionVisuals() {
        const cards = this.container.querySelectorAll('.user-card');
        cards.forEach(card => {
            const userId = card.dataset.userId;
            if (this.selectedUserIds.has(userId)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        // Update header stats
        const statsDiv = this.container.querySelector('.user-list-stats');
        if (statsDiv) {
            statsDiv.innerHTML = `
        ${this.users.length} user${this.users.length !== 1 ? 's' : ''} with quest progress
        ${this.selectedUserIds.size > 0 ? `<br><strong>${this.selectedUserIds.size} selected</strong>` : ''}
      `;
        }
    }

    /**
     * Get avatar background color based on completion percentage
     * @param {number} percentage - Completion percentage (0-100)
     * @returns {string} CSS color value
     */
    getAvatarColor(percentage) {
        if (percentage >= 70) return '#4caf50'; // Green
        if (percentage >= 40) return '#ff9800'; // Orange
        return '#f44336'; // Red
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedUserIds.clear();
        this.updateSelectionVisuals();
    }

    /**
     * Get currently selected user IDs
     * @returns {Array<string>} Array of selected user IDs
     */
    getSelectedUserIds() {
        return Array.from(this.selectedUserIds);
    }
}

/**
 * RecommendationBadge Component
 * 
 * Displays KEEP/SELL recommendation badges with appropriate styling.
 * Shows tooltips with detailed reasons for the recommendation.
 */

export class RecommendationBadge {
    /**
     * Create a recommendation badge element
     * @param {Object} recommendation - Recommendation object with action, reason, priority
     * @returns {HTMLElement} Badge element
     */
    static create(recommendation) {
        if (!recommendation) {
            return this.createUnknownBadge();
        }

        const badge = document.createElement('div');
        badge.className = `recommendation-badge recommendation-${recommendation.action.toLowerCase()}`;
        
        // Add priority class for styling
        if (recommendation.priority) {
            badge.classList.add(`priority-${recommendation.priority.toLowerCase().replace(/\s+/g, '-')}`);
        }

        // Badge content
        badge.innerHTML = `
            <span class="badge-icon">${this.getIcon(recommendation.action)}</span>
            <span class="badge-text">${recommendation.action}</span>
        `;

        // Add tooltip with reason
        if (recommendation.reason) {
            badge.title = recommendation.reason;
            badge.setAttribute('data-tooltip', recommendation.reason);
        }

        return badge;
    }

    /**
     * Create an unknown/pending badge
     * @returns {HTMLElement} Badge element
     */
    static createUnknownBadge() {
        const badge = document.createElement('div');
        badge.className = 'recommendation-badge recommendation-unknown';
        badge.innerHTML = `
            <span class="badge-icon">❓</span>
            <span class="badge-text">UNKNOWN</span>
        `;
        badge.title = 'Item not in database';
        return badge;
    }

    /**
     * Get icon for recommendation action
     * @param {string} action - KEEP or SELL
     * @returns {string} Icon emoji
     */
    static getIcon(action) {
        const icons = {
            'KEEP': '✓',
            'SELL': '✗',
            'UNKNOWN': '❓'
        };
        return icons[action] || '?';
    }

    /**
     * Create inline badge (smaller, for compact views)
     * @param {Object} recommendation - Recommendation object
     * @returns {HTMLElement} Inline badge element
     */
    static createInline(recommendation) {
        const badge = this.create(recommendation);
        badge.classList.add('badge-inline');
        return badge;
    }

    /**
     * Create badge with priority indicator
     * @param {Object} recommendation - Recommendation object
     * @returns {HTMLElement} Badge with priority element
     */
    static createWithPriority(recommendation) {
        const container = document.createElement('div');
        container.className = 'recommendation-badge-container';

        const badge = this.create(recommendation);
        container.appendChild(badge);

        if (recommendation.priority) {
            const priorityLabel = document.createElement('div');
            priorityLabel.className = `priority-label priority-${recommendation.priority.toLowerCase().replace(/\s+/g, '-')}`;
            priorityLabel.textContent = recommendation.priority;
            container.appendChild(priorityLabel);
        }

        return container;
    }

    /**
     * Update an existing badge with new recommendation
     * @param {HTMLElement} badgeElement - Existing badge element
     * @param {Object} recommendation - New recommendation object
     */
    static update(badgeElement, recommendation) {
        if (!badgeElement || !recommendation) return;

        // Update classes
        badgeElement.className = `recommendation-badge recommendation-${recommendation.action.toLowerCase()}`;
        if (recommendation.priority) {
            badgeElement.classList.add(`priority-${recommendation.priority.toLowerCase().replace(/\s+/g, '-')}`);
        }

        // Update content
        const icon = badgeElement.querySelector('.badge-icon');
        const text = badgeElement.querySelector('.badge-text');
        
        if (icon) icon.textContent = this.getIcon(recommendation.action);
        if (text) text.textContent = recommendation.action;

        // Update tooltip
        if (recommendation.reason) {
            badgeElement.title = recommendation.reason;
            badgeElement.setAttribute('data-tooltip', recommendation.reason);
        }
    }
}

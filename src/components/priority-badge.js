/**
 * Priority Badge Component
 * Feature: 004-hideout-item-enhancements
 * Displays three-tier priority badge with tooltip explanation
 */

import { Priority } from '../models/item.js';

/**
 * T010: PriorityBadge component
 * Renders priority badge with visual indicator and tooltip
 */
export class PriorityBadge {
    /**
     * Render priority badge with tooltip
     * @param {string} priority - Priority.NEED_NOW | NEED_SOON | NEED_LATER
     * @param {string} reason - 'quest' | 'hideout' | 'unknown'
     * @param {number} depth - Dependency depth (0, 1, 2, 3+)
     * @returns {string} HTML string
     */
    static render(priority, reason = 'unknown', depth = 0) {
        const badgeClass = this.getPriorityClass(priority);
        const badgeText = this.getPriorityText(priority);
        const tooltip = this.generateTooltip(priority, reason, depth);

        return `
            <span class="priority-badge ${badgeClass}" data-tooltip="${tooltip}">
                ${badgeText}
            </span>
        `;
    }

    /**
     * Get CSS class for priority level
     * @param {string} priority
     * @returns {string}
     */
    static getPriorityClass(priority) {
        switch (priority) {
            case Priority.NEED_NOW:
                return 'priority-need-now';
            case Priority.NEED_SOON:
                return 'priority-need-soon';
            case Priority.NEED_LATER:
                return 'priority-need-later';
            default:
                return 'priority-need-later';
        }
    }

    /**
     * Get display text for priority level
     * @param {string} priority
     * @returns {string}
     */
    static getPriorityText(priority) {
        switch (priority) {
            case Priority.NEED_NOW:
                return 'NEED NOW';
            case Priority.NEED_SOON:
                return 'NEED SOON';
            case Priority.NEED_LATER:
                return 'NEED LATER';
            default:
                return 'NEED LATER';
        }
    }

    /**
     * Generate tooltip explanation based on priority, reason, and depth
     * @param {string} priority
     * @param {string} reason - 'quest' | 'hideout' | 'unknown'
     * @param {number} depth
     * @returns {string}
     */
    static generateTooltip(priority, reason, depth) {
        const sourceType = reason === 'quest' ? 'quests' : reason === 'hideout' ? 'hideout modules' : 'sources';

        switch (priority) {
            case Priority.NEED_NOW:
                return `Buildable now (0 steps away) - Required for active ${sourceType}`;

            case Priority.NEED_SOON:
                if (depth === 1) {
                    return `1 ${sourceType.slice(0, -1)} blocking - Close to needing this item`;
                } else if (depth === 2) {
                    return `2 ${sourceType} blocking - Will need soon`;
                } else {
                    return `1-2 ${sourceType} blocking - Will need soon`;
                }

            case Priority.NEED_LATER:
                if (depth >= 3) {
                    return `${depth}+ ${sourceType} blocking - Needed much later`;
                } else {
                    return `3+ ${sourceType} blocking - Needed much later`;
                }

            default:
                return 'Priority information unavailable';
        }
    }
}

/**
 * Item Card Component
 * Feature: 003-item-tracker + 004-hideout-item-enhancements + 006-all-quests-item-tracker
 * Renders individual item card in grid
 */

import { PriorityBadge } from './priority-badge.js';
import { ViewingMode, ItemStatus } from '../models/item.js'; // T025: Import enums

/**
 * T033, T042-T045, T019: ItemCard component
 * T025-T027: Enhanced with status badge rendering for All Quests mode
 * Displays item with icon, name, quantity, priority, sources, FiR badge, status badges
 */
export class ItemCard {
    /**
     * @param {AggregatedItem} aggregatedItem
     * @param {string} viewingMode - ViewingMode.ACTIVE or ViewingMode.ALL
     * @param {QuestManager} questManager - Needed for status calculation
     * @param {HideoutManager} hideoutManager - Needed for hideout source status (T060)
     */
    constructor(aggregatedItem, viewingMode = ViewingMode.ACTIVE, questManager = null, hideoutManager = null) {
        this.item = aggregatedItem;
        this.viewingMode = viewingMode;
        this.questManager = questManager;
        this.hideoutManager = hideoutManager;
    }

    /**
     * T042: Render item card HTML
     * @returns {string}
     */
    render() {
        const item = this.item;
        const collectedClass = item.collectedQuantity >= item.totalQuantity ? 'collected' : '';

        return `
            <div class="item-card ${collectedClass}" data-item-id="${item.item.id}">
                <div class="item-card-header">
                    <img src="${item.item.iconLink}" alt="${item.item.name}" class="item-icon" onerror="this.src='https://via.placeholder.com/64x64?text=No+Image'">
                    
                    <div class="item-card-quantity-input">
                        <button class="quantity-btn quantity-minus" 
                                data-item-id="${item.item.id}"
                                aria-label="Decrease quantity">
                            −
                        </button>
                        <input type="number" 
                               class="quantity-input"
                               data-item-id="${item.item.id}"
                               value="${item.collectedQuantity || 0}"
                               min="0"
                               max="${item.totalQuantity}"
                               aria-label="Quantity collected">
                        <span class="quantity-separator">/</span>
                        <span class="quantity-max">${item.totalQuantity}</span>
                        <button class="quantity-btn quantity-plus" 
                                data-item-id="${item.item.id}"
                                aria-label="Increase quantity">
                            +
                        </button>
                    </div>
                </div>
                
                <div class="item-card-body">
                    <h3 class="item-name">${item.item.name}</h3>
                    
                    <div class="item-quantity">
                        <span class="quantity-badge">${item.totalQuantity}x</span>
                        ${this.renderFiRBadge()}
                    </div>
                    
                    ${this.renderPriorityBadge()}
                    
                    ${this.renderStatusBadge()}
                    
                    ${this.renderQuestCountBadge()}
                    
                    ${this.renderSources()}
                </div>
            </div>
        `;
    }

    /**
     * T019: Render priority badge using PriorityBadge component (ENHANCED)
     * @returns {string}
     */
    renderPriorityBadge() {
        // Use PriorityBadge component with priority metadata
        const priority = this.item.priority;
        const reason = this.item.priorityReason || 'unknown';
        const depth = this.item.priorityDepth || 0;

        return PriorityBadge.render(priority, reason, depth);
    }

    /**
     * T044: Render source subtitle with detailed breakdown
     * @returns {string}
     */
    renderSources() {
        if (this.item.sources.length === 0) {
            return '';
        }

        // Group sources by type for better organization
        const questSources = this.item.sources.filter(s => s.type === 'quest');
        const hideoutSources = this.item.sources.filter(s => s.type === 'hideout');

        let sourcesHtml = '<div class="item-sources-detailed">';

        // Show quest sources
        if (questSources.length > 0) {
            sourcesHtml += '<div class="source-group">';
            sourcesHtml += '<span class="source-type-label">Quests:</span>';
            sourcesHtml += '<ul class="source-list">';
            for (const source of questSources) {
                sourcesHtml += `<li class="source-item">${source.name} (${source.quantity}x)</li>`;
            }
            sourcesHtml += '</ul></div>';
        }

        // Show hideout sources (each level separately)
        if (hideoutSources.length > 0) {
            sourcesHtml += '<div class="source-group">';
            sourcesHtml += '<span class="source-type-label">Hideout:</span>';
            sourcesHtml += '<ul class="source-list">';
            for (const source of hideoutSources) {
                sourcesHtml += `<li class="source-item">${source.name} (${source.quantity}x)</li>`;
            }
            sourcesHtml += '</ul></div>';
        }

        sourcesHtml += '</div>';
        return sourcesHtml;
    }

    /**
     * T045: Render FiR badge
     * @returns {string}
     */
    renderFiRBadge() {
        if (!this.item.isFiR) {
            return '';
        }

        return `
            <span class="fir-badge" title="Found in Raid required">🔍 FiR</span>
        `;
    }

    /**
     * T025-T027: Render status badge (Completed/Mixed) for All Quests mode
     * T060: Enhanced to show Completed - Hideout badge for hideout-only items
     * Feature: 006-all-quests-item-tracker
     * @returns {string}
     */
    renderStatusBadge() {
        // Only show badges in All Quests mode
        if (this.viewingMode !== ViewingMode.ALL) {
            return '';
        }

        // T060: Check for hideout-only items with completed sources
        if (this.hideoutManager && !this.item.hasQuestSources() && this.item.hasHideoutSources()) {
            if (this.item.areHideoutSourcesCompleted(this.hideoutManager)) {
                return `
                    <div class="item-badges">
                        <span class="badge badge-hideout-completed">Completed - Hideout</span>
                    </div>
                `;
            }
            return ''; // Active hideout items get no badge
        }

        // Quest items badges
        if (!this.item.hasQuestSources() || !this.questManager) {
            return '';
        }

        const status = this.item.getQuestSourceStatus(this.questManager);

        // T026: Render "Completed" badge for items only needed by completed quests
        if (status === ItemStatus.COMPLETED) {
            return `
                <div class="item-badges">
                    <span class="badge badge-completed">Completed</span>
                </div>
            `;
        }

        // T027: Render "Mixed" badge with counts for items needed by both
        if (status === ItemStatus.BOTH) {
            const counts = this.item.getQuestSourceCounts(this.questManager);
            return `
                <div class="item-badges">
                    <span class="badge badge-mixed">${counts.active} Active, ${counts.completed} Completed</span>
                </div>
            `;
        }

        // No badge for ACTIVE status (normal items)
        return '';
    }

    /**
     * T049-T051: Render quest count badge for items with multiple quest sources
     * Feature: 006-all-quests-item-tracker (User Story 4)
     * Shows quest name for single source, count badge for multiple
     * @returns {string}
     */
    renderQuestCountBadge() {
        // T049: Only show in All Quests mode for items with quest sources
        if (this.viewingMode !== ViewingMode.ALL || !this.item.hasQuestSources()) {
            return '';
        }

        if (!this.questManager) {
            return '';
        }

        // Get quest sources only (exclude hideout)
        const questSources = this.item.sources.filter(s => s.type === 'quest');

        if (questSources.length === 0) {
            return '';
        }

        // T051: Single quest - show quest name directly
        if (questSources.length === 1) {
            return `
                <div class="quest-count-info">
                    <span class="quest-name-single">${questSources[0].name}</span>
                </div>
            `;
        }

        // T050-T051: Multiple quests - show count badge with breakdown
        const counts = this.item.getQuestSourceCounts(this.questManager);
        const totalQuests = questSources.length;

        if (counts.active > 0 && counts.completed > 0) {
            // Mixed status - show breakdown
            return `
                <div class="quest-count-info">
                    <span class="quest-count-badge quest-count-mixed">${totalQuests} quests: ${counts.active} active, ${counts.completed} completed</span>
                </div>
            `;
        } else if (counts.completed === totalQuests) {
            // All completed
            return `
                <div class="quest-count-info">
                    <span class="quest-count-badge quest-count-completed">${totalQuests} quests (all completed)</span>
                </div>
            `;
        } else {
            // All active
            return `
                <div class="quest-count-info">
                    <span class="quest-count-badge quest-count-active">${totalQuests} quests (active)</span>
                </div>
            `;
        }
    }
}

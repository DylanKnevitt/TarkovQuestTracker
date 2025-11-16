/**
 * Item Card Component
 * Feature: 003-item-tracker + 004-hideout-item-enhancements
 * Renders individual item card in grid
 */

import { PriorityBadge } from './priority-badge.js';

/**
 * T033, T042-T045, T019: ItemCard component
 * Displays item with icon, name, quantity, priority, sources, FiR badge
 */
export class ItemCard {
    /**
     * @param {AggregatedItem} aggregatedItem
     */
    constructor(aggregatedItem) {
        this.item = aggregatedItem;
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
}

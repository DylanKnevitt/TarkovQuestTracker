/**
 * RecommendationService
 * Generates KEEP/SELL recommendations for detected items based on quest/hideout requirements
 */

export class RecommendationService {
    constructor(itemTrackerManager) {
        if (!itemTrackerManager) {
            throw new Error('ItemTrackerManager is required for recommendations');
        }
        this.itemTrackerManager = itemTrackerManager;
    }

    /**
     * Calculate priority level for an item
     * @param {Array<Object>} sources Quest/hideout sources
     * @returns {string} 'high', 'medium', or 'low'
     */
    calculatePriority(sources) {
        if (sources.length === 0) {
            return 'low'; // Not needed
        }

        // Check for active quests (highest priority)
        const hasActiveQuest = sources.some(s => 
            s.type === 'quest' && s.status === 'active'
        );

        if (hasActiveQuest) {
            return 'high';
        }

        // Check for active hideout modules (medium priority)
        const hasActiveHideout = sources.some(s => 
            s.type === 'hideout' && s.status === 'active'
        );

        if (hasActiveHideout) {
            return 'medium';
        }

        // Has completed quests/hideout but not active
        return 'medium';
    }

    /**
     * Format reason text for user display
     * @param {Array<Object>} sources 
     * @returns {string} Formatted reason
     */
    formatReason(sources) {
        if (sources.length === 0) {
            return 'Not needed for any tracked content';
        }

        const questSources = sources.filter(s => s.type === 'quest');
        const hideoutSources = sources.filter(s => s.type === 'hideout');

        const parts = [];

        if (questSources.length > 0) {
            parts.push(`${questSources.length} quest${questSources.length > 1 ? 's' : ''}`);
        }

        if (hideoutSources.length > 0) {
            parts.push(`${hideoutSources.length} hideout upgrade${hideoutSources.length > 1 ? 's' : ''}`);
        }

        return `Needed for ${parts.join(' and ')}`;
    }

    /**
     * Get recommendation for a detected item
     * @param {DetectedItem} detectedItem 
     * @returns {Object} Recommendation
     */
    getRecommendation(detectedItem) {
        const itemId = detectedItem.matchedItemId;

        // Get aggregated item from tracker
        const aggregatedItem = this.itemTrackerManager.aggregatedItems.get(itemId);

        if (!aggregatedItem || aggregatedItem.requirements.length === 0) {
            // Item not needed - recommend SELL
            return {
                action: 'SELL',
                priority: 'low',
                reason: 'Not needed for any tracked content',
                sources: [],
                quantityNeeded: 0
            };
        }

        // Item is needed - recommend KEEP
        const sources = this.extractSources(aggregatedItem);
        const priority = this.calculatePriority(sources);
        const reason = this.formatReason(sources);
        const quantityNeeded = aggregatedItem.getTotalQuantityNeeded();

        return {
            action: 'KEEP',
            priority: priority,
            reason: reason,
            sources: sources,
            quantityNeeded: quantityNeeded
        };
    }

    /**
     * Extract source information from aggregated item
     * @param {AggregatedItem} aggregatedItem 
     * @returns {Array<Object>} Sources
     */
    extractSources(aggregatedItem) {
        const sources = [];

        for (const req of aggregatedItem.requirements) {
            let status = 'active';
            
            // Determine status based on requirement source
            if (req.source === 'quest') {
                const quest = this.itemTrackerManager.questManager.quests.get(req.sourceId);
                status = quest?.completed ? 'completed' : 'active';
            } else if (req.source === 'hideout') {
                const module = this.itemTrackerManager.hideoutManager.modules.get(req.sourceId);
                status = module?.completed ? 'completed' : 'active';
            }

            sources.push({
                type: req.source,
                id: req.sourceId,
                name: req.sourceName || req.sourceId,
                quantity: req.quantity,
                status: status
            });
        }

        return sources;
    }

    /**
     * Generate recommendations for all detected items
     * @param {Array<DetectedItem>} detectedItems 
     * @returns {Array<Object>} Recommendations with detectedItemId
     */
    generateRecommendations(detectedItems) {
        console.log(`Generating recommendations for ${detectedItems.length} items...`);

        // Dispatch progress event
        window.dispatchEvent(new CustomEvent('ocrProgress', {
            detail: { 
                progress: 95, 
                status: 'recommending', 
                message: 'Generating recommendations...' 
            }
        }));

        const recommendations = detectedItems.map(item => {
            const recommendation = this.getRecommendation(item);
            
            return {
                detectedItemId: item.id,
                ...recommendation,
                generatedAt: Date.now()
            };
        });

        // Calculate statistics
        const keepCount = recommendations.filter(r => r.action === 'KEEP').length;
        const sellCount = recommendations.filter(r => r.action === 'SELL').length;

        console.log(`Recommendations: ${keepCount} KEEP, ${sellCount} SELL`);

        return recommendations;
    }

    /**
     * Get recommendation statistics
     * @param {Array<Object>} recommendations 
     * @returns {Object} Statistics
     */
    getRecommendationStats(recommendations) {
        const keep = recommendations.filter(r => r.action === 'KEEP');
        const sell = recommendations.filter(r => r.action === 'SELL');

        return {
            total: recommendations.length,
            keepCount: keep.length,
            sellCount: sell.length,
            keepPercentage: recommendations.length > 0 
                ? Math.round((keep.length / recommendations.length) * 100) 
                : 0,
            highPriority: keep.filter(r => r.priority === 'high').length,
            mediumPriority: keep.filter(r => r.priority === 'medium').length
        };
    }

    /**
     * Filter recommendations by action
     * @param {Array<Object>} recommendations 
     * @param {string} action 'KEEP' or 'SELL'
     * @returns {Array<Object>} Filtered recommendations
     */
    filterByAction(recommendations, action) {
        return recommendations.filter(r => r.action === action);
    }

    /**
     * Sort recommendations by priority
     * @param {Array<Object>} recommendations 
     * @returns {Array<Object>} Sorted recommendations
     */
    sortByPriority(recommendations) {
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        
        return [...recommendations].sort((a, b) => {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
}

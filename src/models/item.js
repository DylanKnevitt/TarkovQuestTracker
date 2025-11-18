/**
 * Item Data Models
 * Feature: 003-item-tracker
 * Defines core entities for item tracking
 */

/**
 * T004 & T013: Priority enum - Three-tier system
 * Feature: 004-hideout-item-enhancements
 * 
 * NEED_NOW: Items for buildable hideout modules (0 blocking dependencies) or unlocked quests
 * NEED_SOON: Items for modules/quests 1-2 steps away (1-2 blocking dependencies)
 * NEED_LATER: Items for modules/quests 3+ steps away (3+ blocking dependencies)
 */
export const Priority = {
    NEED_NOW: 'NEED_NOW',
    NEED_SOON: 'NEED_SOON',
    NEED_LATER: 'NEED_LATER',
    // Backward compatibility (deprecated - will be removed in future)
    NEEDED_SOON: 'NEED_NOW', // Map old NEEDED_SOON to NEED_NOW
    NEEDED_LATER: 'NEED_LATER' // Map old NEEDED_LATER to NEED_LATER
};

/**
 * T001: ViewingMode enum
 * Feature: 006-all-quests-item-tracker
 * 
 * ACTIVE: Show items from incomplete quests only (current behavior)
 * ALL: Show items from all quests (completed + incomplete)
 */
export const ViewingMode = {
    ACTIVE: 'active',
    ALL: 'all'
};

/**
 * T002: ItemStatus enum
 * Feature: 006-all-quests-item-tracker
 * 
 * Indicates whether an item is needed by active, completed, or both quest types
 */
export const ItemStatus = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    BOTH: 'both'
};

/**
 * T003: StatusFilter enum
 * Feature: 006-all-quests-item-tracker
 * 
 * Filter option available within All Quests mode
 */
export const StatusFilter = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    BOTH: 'both'
};

/**
 * T010: Item class - represents a game item
 * Per data-model.md
 */
export class Item {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.shortName = data.shortName;
        this.iconLink = data.iconLink;
        this.wikiLink = data.wikiLink;
        this.types = data.types || [];
    }

    /**
     * Check if this item is a key
     * @returns {boolean}
     */
    isKey() {
        return this.types.includes('keys');
    }

    /**
     * Get display name (use short name if available, otherwise full name)
     * @returns {string}
     */
    getDisplayName() {
        return this.shortName || this.name;
    }
}

/**
 * T011: ItemRequirement class
 * Links an item to a specific quest objective or hideout module
 * Per data-model.md
 */
export class ItemRequirement {
    /**
     * @param {string} itemId - Item ID reference
     * @param {Object} source - { type: 'quest'|'hideout', id: string, name: string }
     * @param {number} quantity - How many needed
     * @param {boolean} isFiR - Whether Found in Raid status required
     */
    constructor(itemId, source, quantity, isFiR = false) {
        this.itemId = itemId;
        this.source = source;
        this.quantity = quantity;
        this.isFiR = isFiR;

        // Validation
        if (!itemId || !source || !source.type || !source.id || !source.name) {
            throw new Error('ItemRequirement requires itemId and complete source object');
        }

        if (quantity <= 0) {
            throw new Error('ItemRequirement quantity must be positive');
        }

        if (!['quest', 'hideout'].includes(source.type)) {
            throw new Error('ItemRequirement source.type must be "quest" or "hideout"');
        }
    }

    /**
     * Check if this requirement is for a quest
     * @returns {boolean}
     */
    isQuest() {
        return this.source.type === 'quest';
    }

    /**
     * Check if this requirement is for hideout
     * @returns {boolean}
     */
    isHideout() {
        return this.source.type === 'hideout';
    }
}

/**
 * T012: AggregatedItem class
 * Combines all requirements for a single item with priority calculation
 * Per data-model.md
 */
export class AggregatedItem {
    /**
     * @param {Item} item - The actual item data
     */
    constructor(item) {
        this.item = item;
        this.totalQuantity = 0;
        this.sources = []; // Array of {type, id, name}
        this.isFiR = false;
        this.priority = Priority.NEEDED_LATER;
        this.collected = false;
        this.collectedQuantity = 0;
    }

    /**
     * Add a requirement to this aggregated item
     * @param {ItemRequirement} requirement
     */
    addRequirement(requirement) {
        // Sum quantities
        this.totalQuantity += requirement.quantity;

        // Add source if not already present
        const sourceExists = this.sources.some(s =>
            s.type === requirement.source.type && s.id === requirement.source.id
        );

        if (!sourceExists) {
            this.sources.push({
                type: requirement.source.type,
                id: requirement.source.id,
                name: requirement.source.name,
                quantity: requirement.quantity,
                isFiR: requirement.isFiR
            });
        }

        // OR FiR flags (if ANY source requires FiR, mark as FiR)
        this.isFiR = this.isFiR || requirement.isFiR;
    }

    /**
     * Get quest sources only
     * @returns {Array}
     */
    getQuestSources() {
        return this.sources.filter(s => s.type === 'quest');
    }

    /**
     * Get hideout sources only
     * @returns {Array}
     */
    getHideoutSources() {
        return this.sources.filter(s => s.type === 'hideout');
    }

    /**
     * Check if item has quest sources
     * @returns {boolean}
     */
    hasQuestSources() {
        return this.sources.some(s => s.type === 'quest');
    }

    /**
     * Check if item has hideout sources
     * @returns {boolean}
     */
    hasHideoutSources() {
        return this.sources.some(s => s.type === 'hideout');
    }

    /**
     * Check if item is a key (for filtering)
     * @returns {boolean}
     */
    isKey() {
        return this.item.isKey();
    }

    /**
     * Get formatted sources string for display
     * @returns {string}
     */
    getSourcesString() {
        if (this.sources.length === 0) return '';

        const names = this.sources.map(s => s.name);

        // Limit to first 3 sources, add "and X more" if needed
        if (names.length > 3) {
            return names.slice(0, 3).join(', ') + ` and ${names.length - 3} more`;
        }

        return names.join(', ');
    }

    /**
     * Set collection status from storage
     * @param {Object} collectionData - { collected: boolean, quantity: number }
     */
    setCollectionStatus(collectionData) {
        if (collectionData) {
            this.collected = collectionData.collected || false;
            this.collectedQuantity = collectionData.quantity || 0;
        }
    }

    /**
     * Check if item is fully collected (quantity met or marked collected)
     * @returns {boolean}
     */
    isFullyCollected() {
        return this.collected || this.collectedQuantity >= this.totalQuantity;
    }

    /**
     * Get priority display string
     * @returns {string}
     */
    getPriorityDisplay() {
        if (this.priority === Priority.NEEDED_SOON) {
            return '⚠️ Needed Soon';
        }
        return '🕐 Needed Later';
    }

    /**
     * Get priority CSS class
     * @returns {string}
     */
    getPriorityCssClass() {
        return this.priority === Priority.NEEDED_SOON ? 'needed-soon' : 'needed-later';
    }

    /**
     * Convert to plain object for logging/debugging
     * @returns {Object}
     */
    toJSON() {
        return {
            itemId: this.item.id,
            itemName: this.item.name,
            totalQuantity: this.totalQuantity,
            sources: this.sources,
            isFiR: this.isFiR,
            priority: this.priority,
            collected: this.collected,
            collectedQuantity: this.collectedQuantity
        };
    }

    /**
     * T011: Get the completion status of quest sources
     * Feature: 006-all-quests-item-tracker
     * @param {QuestManager} questManager - Needed to check quest completion
     * @returns {string} - ItemStatus.ACTIVE, ItemStatus.COMPLETED, or ItemStatus.BOTH
     */
    getQuestSourceStatus(questManager) {
        if (!questManager) {
            console.warn('QuestManager missing, defaulting to ACTIVE status');
            return ItemStatus.ACTIVE;
        }

        let hasActive = false;
        let hasCompleted = false;

        for (const source of this.sources) {
            if (source.type === 'quest') {
                const quest = questManager.getQuestById(source.id);
                if (quest) {
                    if (quest.completed) {
                        hasCompleted = true;
                    } else {
                        hasActive = true;
                    }
                }
            }
        }

        if (hasActive && hasCompleted) return ItemStatus.BOTH;
        if (hasActive) return ItemStatus.ACTIVE;
        if (hasCompleted) return ItemStatus.COMPLETED;
        return ItemStatus.ACTIVE; // Default
    }

    /**
     * T012: Get count of quest sources by completion status
     * Feature: 006-all-quests-item-tracker
     * @param {QuestManager} questManager - Needed to check quest completion
     * @returns {Object} - { active: number, completed: number }
     */
    getQuestSourceCounts(questManager) {
        if (!questManager) {
            console.warn('QuestManager missing, returning zero counts');
            return { active: 0, completed: 0 };
        }

        let active = 0;
        let completed = 0;

        for (const source of this.sources) {
            if (source.type === 'quest') {
                const quest = questManager.getQuestById(source.id);
                if (quest) {
                    if (quest.completed) {
                        completed++;
                    } else {
                        active++;
                    }
                }
            }
        }

        return { active, completed };
    }

    /**
     * T060: Check if all hideout sources are completed
     * Feature: 006-all-quests-item-tracker (User Story 5)
     * @param {HideoutManager} hideoutManager - Needed to check module completion
     * @returns {boolean} - True if all hideout sources are completed
     */
    areHideoutSourcesCompleted(hideoutManager) {
        if (!hideoutManager) {
            return false;
        }

        const hideoutSources = this.getHideoutSources();
        if (hideoutSources.length === 0) {
            return false;
        }

        // Check if ALL hideout sources are completed
        return hideoutSources.every(source => {
            const module = hideoutManager.stations.find(m => m.getModuleKey() === source.id);
            return module && module.completed;
        });
    }
}

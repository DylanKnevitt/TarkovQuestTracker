/**
 * Item Tracker Manager
 * Feature: 003-item-tracker
 * Orchestrates item aggregation from quests and hideout
 */

import { fetchItems } from '../api/tarkov-items-api.js';
import { Item, ItemRequirement, AggregatedItem } from './item.js';
import { PriorityService } from '../services/priority-service.js';

/**
 * T021-T025: ItemTrackerManager class
 * Aggregates item requirements from quests and hideout
 * Per data-model.md
 */
export class ItemTrackerManager {
    /**
     * @param {QuestManager} questManager - Instance of QuestManager
     * @param {HideoutManager} hideoutManager - Instance of HideoutManager
     */
    constructor(questManager, hideoutManager) {
        this.questManager = questManager;
        this.hideoutManager = hideoutManager;
        this.itemsMap = new Map(); // Item.id → Item instance
        this.aggregatedItems = new Map(); // Item.id → AggregatedItem instance
    }

    /**
     * Initialize item tracker (fetch items and aggregate requirements)
     * @returns {Promise<void>}
     */
    async initialize() {
        console.log('Initializing ItemTrackerManager...');
        
        try {
            // Fetch items from API
            const itemsData = await fetchItems();
            
            // Build items map for quick lookup
            this.itemsMap.clear();
            for (const itemData of itemsData) {
                const item = new Item(itemData);
                this.itemsMap.set(item.id, item);
            }
            
            console.log(`Loaded ${this.itemsMap.size} items`);
            
            // Aggregate requirements from quests and hideout
            this.aggregateRequirements();
            
            // T061: Calculate priorities for all items
            this.calculatePriorities();
            
            console.log(`ItemTrackerManager initialized: ${this.aggregatedItems.size} items needed`);
        } catch (error) {
            console.error('Failed to initialize ItemTrackerManager:', error);
            throw error;
        }
    }

    /**
     * T022: Aggregate requirements from quests and hideout
     */
    aggregateRequirements() {
        this.aggregatedItems.clear();

        // Extract requirements from quests and hideout
        const requirements = [
            ...this.extractQuestRequirements(),
            ...this.extractHideoutRequirements()
        ];

        console.log(`Extracted ${requirements.length} item requirements`);

        // Group requirements by item ID
        for (const req of requirements) {
            if (!this.aggregatedItems.has(req.itemId)) {
                const item = this.itemsMap.get(req.itemId);
                if (!item) {
                    console.warn(`Item not found in items map: ${req.itemId}`);
                    continue;
                }
                this.aggregatedItems.set(req.itemId, new AggregatedItem(item));
            }

            const aggregatedItem = this.aggregatedItems.get(req.itemId);
            aggregatedItem.addRequirement(req);
        }
    }

    /**
     * T023: Extract item requirements from quest objectives
     * @returns {Array<ItemRequirement>}
     */
    extractQuestRequirements() {
        const requirements = [];

        for (const quest of this.questManager.quests) {
            // Skip completed quests
            if (quest.completed) {
                continue;
            }

            // Check if quest has objectives
            if (!quest.objectives || quest.objectives.length === 0) {
                continue;
            }

            // Process each objective
            for (const objective of quest.objectives) {
                // Only process item-related objectives
                if (!this.isItemObjective(objective)) {
                    continue;
                }

                // Get item ID from target field
                const itemId = objective.target;
                if (!itemId) {
                    continue;
                }

                // Get quantity (default to 1 if not specified)
                const quantity = objective.number || 1;

                // Detect FiR requirement
                const isFiR = this.detectFiR(objective);

                // Create requirement
                requirements.push(new ItemRequirement(
                    itemId,
                    {
                        type: 'quest',
                        id: quest.id,
                        name: quest.name
                    },
                    quantity,
                    isFiR
                ));
            }
        }

        console.log(`Extracted ${requirements.length} quest item requirements`);
        return requirements;
    }

    /**
     * T024: Extract item requirements from hideout modules
     * @returns {Array<ItemRequirement>}
     */
    extractHideoutRequirements() {
        const requirements = [];

        for (const module of this.hideoutManager.stations) {
            // Skip completed modules
            if (module.completed) {
                continue;
            }

            // Process each item requirement
            for (const itemReq of module.itemRequirements) {
                requirements.push(new ItemRequirement(
                    itemReq.itemId,
                    {
                        type: 'hideout',
                        id: module.getModuleKey(),
                        name: module.getDisplayName()
                    },
                    itemReq.quantity,
                    false // Hideout items never require FiR
                ));
            }
        }

        console.log(`Extracted ${requirements.length} hideout item requirements`);
        return requirements;
    }

    /**
     * T025: Detect if objective requires Found in Raid status
     * @param {Object} objective - Quest objective
     * @returns {boolean}
     */
    detectFiR(objective) {
        // Method 1: Check objective type
        if (objective.type === 'findQuestItem') {
            return true;
        }

        // Method 2: Check description for FiR indicators
        const desc = objective.description.toLowerCase();
        return desc.includes('fir') ||
               desc.includes('found in raid') ||
               desc.includes('find in raid');
    }

    /**
     * Check if objective is item-related
     * @param {Object} objective
     * @returns {boolean}
     */
    isItemObjective(objective) {
        const itemObjectiveTypes = [
            'giveQuestItem',
            'findQuestItem',
            'giveItem',
            'collect'
        ];
        return itemObjectiveTypes.includes(objective.type);
    }

    /**
     * Get all aggregated items
     * @returns {Array<AggregatedItem>}
     */
    getAllItems() {
        return Array.from(this.aggregatedItems.values());
    }

    /**
     * Get aggregated item by item ID
     * @param {string} itemId
     * @returns {AggregatedItem|null}
     */
    getItem(itemId) {
        return this.aggregatedItems.get(itemId) || null;
    }

    /**
     * Get filtered items based on category
     * @param {string} category - 'all', 'quest', 'hideout', 'keys'
     * @returns {Array<AggregatedItem>}
     */
    getFilteredItems(category) {
        const items = this.getAllItems();

        switch (category) {
            case 'quest':
                return items.filter(item => item.hasQuestSources());
            case 'hideout':
                return items.filter(item => item.hasHideoutSources());
            case 'keys':
                return items.filter(item => item.isKey());
            case 'all':
            default:
                return items;
        }
    }

    /**
     * T061: Calculate priorities for all items
     */
    calculatePriorities() {
        const items = this.getAllItems();
        PriorityService.recalculateAll(items, this.questManager, this.hideoutManager);
        console.log('Priorities calculated for all items');
    }

    /**
     * Refresh aggregated items (call after quest/hideout updates)
     */
    refresh() {
        console.log('Refreshing item requirements...');
        this.aggregateRequirements();
        this.calculatePriorities();
    }

    /**
     * Get statistics about items
     * @returns {Object}
     */
    getStats() {
        const items = this.getAllItems();
        
        return {
            total: items.length,
            questItems: items.filter(i => i.hasQuestSources()).length,
            hideoutItems: items.filter(i => i.hasHideoutSources()).length,
            keys: items.filter(i => i.isKey()).length,
            firItems: items.filter(i => i.isFiR).length,
            totalQuantity: items.reduce((sum, i) => sum + i.totalQuantity, 0)
        };
    }

    /**
     * Search items by name
     * @param {string} searchTerm
     * @returns {Array<AggregatedItem>}
     */
    searchItems(searchTerm) {
        if (!searchTerm) return this.getAllItems();

        const term = searchTerm.toLowerCase();
        return this.getAllItems().filter(aggItem => 
            aggItem.item.name.toLowerCase().includes(term) ||
            aggItem.item.shortName.toLowerCase().includes(term)
        );
    }

    /**
     * Get items by priority
     * @param {string} priority - Priority.NEEDED_SOON or Priority.NEEDED_LATER
     * @returns {Array<AggregatedItem>}
     */
    getItemsByPriority(priority) {
        return this.getAllItems().filter(item => item.priority === priority);
    }
}

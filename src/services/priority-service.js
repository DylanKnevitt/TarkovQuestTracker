/**
 * Priority Service
 * Feature: 003-item-tracker
 * Calculates priority for aggregated items based on quest/hideout urgency
 */

import { Priority } from '../models/item.js';

/**
 * T026: PriorityService
 * Determines if item is NEEDED_SOON (active/buildable) or NEEDED_LATER
 * Per research.md priority rules
 */
export class PriorityService {
    /**
     * Calculate priority for an aggregated item
     * @param {AggregatedItem} aggregatedItem
     * @param {QuestManager} questManager
     * @param {HideoutManager} hideoutManager
     * @returns {string} Priority.NEEDED_SOON or Priority.NEEDED_LATER
     */
    static calculate(aggregatedItem, questManager, hideoutManager) {
        // Check quest sources for active quests
        for (const source of aggregatedItem.sources) {
            if (source.type === 'quest') {
                const quest = questManager.quests.find(q => q.id === source.id);
                if (quest && this.isQuestActive(quest, questManager)) {
                    return Priority.NEEDED_SOON;
                }
            }
        }

        // Check hideout sources for buildable modules
        for (const source of aggregatedItem.sources) {
            if (source.type === 'hideout') {
                const moduleKey = source.id;
                if (this.isModuleBuildable(moduleKey, hideoutManager)) {
                    return Priority.NEEDED_SOON;
                }
            }
        }

        // Default to NEEDED_LATER
        return Priority.NEEDED_LATER;
    }

    /**
     * Check if quest is active (unlocked + incomplete)
     * @param {Quest} quest
     * @param {QuestManager} questManager
     * @returns {boolean}
     */
    static isQuestActive(quest, questManager) {
        // Quest must be incomplete
        if (quest.completed) {
            return false;
        }

        // Quest must be unlocked (prerequisites met + level requirement)
        if (!quest.unlocked) {
            return false;
        }

        return true;
    }

    /**
     * Check if hideout module is buildable (prerequisites met + incomplete)
     * @param {string} moduleKey - "stationId-level"
     * @param {HideoutManager} hideoutManager
     * @returns {boolean}
     */
    static isModuleBuildable(moduleKey, hideoutManager) {
        // Module must be incomplete
        if (hideoutManager.isModuleCompleted(moduleKey)) {
            return false;
        }

        // Parse module key
        const parts = moduleKey.split('-');
        if (parts.length !== 2) return false;

        const stationId = parseInt(parts[0], 10);
        const level = parseInt(parts[1], 10);

        // Check if module is buildable
        return hideoutManager.isModuleBuildable(stationId, level);
    }

    /**
     * Recalculate priorities for all aggregated items
     * @param {Array<AggregatedItem>} items
     * @param {QuestManager} questManager
     * @param {HideoutManager} hideoutManager
     */
    static recalculateAll(items, questManager, hideoutManager) {
        for (const item of items) {
            item.priority = this.calculate(item, questManager, hideoutManager);
        }
    }
}

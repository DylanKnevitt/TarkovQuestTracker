/**
 * Priority Service
 * Feature: 003-item-tracker + 004-hideout-item-enhancements
 * Calculates three-tier priority for aggregated items based on quest/hideout dependency depth
 */

import { Priority } from '../models/item.js';

/**
 * T026 + T008: PriorityService
 * Enhanced to calculate three-tier priority (NEED_NOW / NEED_SOON / NEED_LATER)
 * based on dependency depth of quests and hideout modules
 */
export class PriorityService {
    /**
     * T008: Calculate priority for an aggregated item (ENHANCED)
     * 
     * Uses dependency depth to determine priority:
     * - Depth 0: NEED_NOW (buildable now / unlocked quest)
     * - Depth 1-2: NEED_SOON (1-2 steps away)
     * - Depth 3+: NEED_LATER (far away)
     * 
     * When item has multiple sources, uses highest priority.
     * 
     * @param {AggregatedItem} aggregatedItem
     * @param {QuestManager} questManager
     * @param {HideoutManager} hideoutManager
     * @returns {string} Priority.NEED_NOW | NEED_SOON | NEED_LATER
     */
    static calculate(aggregatedItem, questManager, hideoutManager) {
        let highestPriority = Priority.NEED_LATER;
        let minDepth = Infinity;
        let priorityReason = 'unknown';

        // Memoization for depth calculations
        const memo = new Map();

        // Check quest sources
        for (const source of aggregatedItem.sources) {
            if (source.type === 'quest') {
                const quest = questManager.quests.find(q => q.id === source.id);
                if (quest && !quest.completed) {
                    const depth = this.calculateQuestDepth(quest, questManager, memo);
                    const priority = this.depthToPriority(depth);

                    if (this.isPriorityHigher(priority, highestPriority)) {
                        highestPriority = priority;
                        minDepth = depth;
                        priorityReason = 'quest';
                    }
                }
            }
        }

        // Check hideout sources
        for (const source of aggregatedItem.sources) {
            if (source.type === 'hideout') {
                const moduleKey = source.id;
                const module = hideoutManager.modulesMap.get(moduleKey);

                if (module && !module.completed) {
                    const depth = module.calculateDependencyDepth(hideoutManager, memo);
                    const priority = this.depthToPriority(depth);

                    if (this.isPriorityHigher(priority, highestPriority)) {
                        highestPriority = priority;
                        minDepth = depth;
                        priorityReason = 'hideout';
                    }
                }
            }
        }

        // Store metadata for tooltip/debugging
        aggregatedItem.priorityDepth = minDepth === Infinity ? 0 : minDepth;
        aggregatedItem.priorityReason = priorityReason;

        return highestPriority;
    }

    /**
     * T006: Calculate dependency depth for a quest
     * 
     * Returns 0 if quest is completed or unlocked (no incomplete prerequisites).
     * Returns depth count (max prerequisite depth + 1) if quest is locked.
     * Uses memoization to avoid redundant calculations.
     * 
     * @param {Quest} quest
     * @param {QuestManager} questManager
     * @param {Map} memo - Memoization map (quest.id -> depth)
     * @returns {number} Depth (0 = unlocked, 1+ = locked)
     */
    static calculateQuestDepth(quest, questManager, memo = new Map()) {
        // Check memo cache
        if (memo.has(quest.id)) {
            return memo.get(quest.id);
        }

        // Completed quests have depth 0
        if (quest.completed) {
            memo.set(quest.id, 0);
            return 0;
        }

        // No prerequisites = unlocked (depth 0)
        if (!quest.requirements || quest.requirements.length === 0) {
            memo.set(quest.id, 0);
            return 0;
        }

        // Check prerequisites
        let maxPrereqDepth = -1;
        let hasIncompletePrereqs = false;

        for (const reqId of quest.requirements) {
            const reqQuest = questManager.quests.find(q => q.id === reqId);

            if (!reqQuest) {
                console.warn(`[PriorityService] Missing prerequisite quest: ${reqId}`);
                continue;
            }

            if (!reqQuest.completed) {
                hasIncompletePrereqs = true;
                const reqDepth = this.calculateQuestDepth(reqQuest, questManager, memo);
                maxPrereqDepth = Math.max(maxPrereqDepth, reqDepth);
            }
        }

        // All prerequisites complete = unlocked (depth 0)
        if (!hasIncompletePrereqs) {
            memo.set(quest.id, 0);
            return 0;
        }

        // Locked: depth = max(prereq depths) + 1
        const depth = maxPrereqDepth + 1;
        memo.set(quest.id, depth);
        return depth;
    }

    /**
     * T007: Map dependency depth to priority tier
     * 
     * - Depth 0: NEED_NOW (buildable/unlocked now)
     * - Depth 1-2: NEED_SOON (1-2 steps away)
     * - Depth 3+: NEED_LATER (far away)
     * 
     * @param {number} depth
     * @returns {string} Priority.NEED_NOW | NEED_SOON | NEED_LATER
     */
    static depthToPriority(depth) {
        if (depth === 0) return Priority.NEED_NOW;
        if (depth <= 2) return Priority.NEED_SOON;
        return Priority.NEED_LATER;
    }

    /**
     * Helper: Compare priority levels
     * @param {string} priority1
     * @param {string} priority2
     * @returns {boolean} True if priority1 is higher than priority2
     */
    static isPriorityHigher(priority1, priority2) {
        const order = {
            [Priority.NEED_NOW]: 3,
            [Priority.NEED_SOON]: 2,
            [Priority.NEED_LATER]: 1
        };
        return order[priority1] > order[priority2];
    }

    /**
     * Check if quest is active (unlocked + incomplete)
     * LEGACY: Kept for backward compatibility
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
     * LEGACY: Kept for backward compatibility
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

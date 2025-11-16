/**
 * Hideout Module Data Model
 * Feature: 003-item-tracker
 * Represents a hideout station upgrade level
 */

/**
 * T014: HideoutModule class
 * Per data-model.md
 */
export class HideoutModule {
    /**
     * @param {Object} data - Hideout module data from API
     */
    constructor(data) {
        this.stationId = data.stationId;
        this.stationName = data.stationName;
        this.level = data.level;
        this.itemRequirements = data.itemRequirements || [];
        this.stationLevelRequirements = data.stationLevelRequirements || [];
        this.completed = data.completed || false;
    }

    /**
     * Get unique module key for storage
     * @returns {string} Format: "stationId-level"
     */
    getModuleKey() {
        return `${this.stationId}-${this.level}`;
    }

    /**
     * Get display name for UI
     * @returns {string} Format: "Station Name Level X"
     */
    getDisplayName() {
        return `${this.stationName} Level ${this.level}`;
    }

    /**
     * Check if this is a base level module (no prerequisites from same station)
     * @returns {boolean}
     */
    isBaseLevel() {
        return this.level === 0 || this.level === 1;
    }

    /**
     * Get item requirements as array of { itemId, quantity }
     * @returns {Array}
     */
    getItemRequirements() {
        return this.itemRequirements.map(req => ({
            itemId: req.itemId,
            quantity: req.quantity
        }));
    }

    /**
     * Get station prerequisites as array of { stationId, level }
     * @returns {Array}
     */
    getStationPrerequisites() {
        return this.stationLevelRequirements.map(req => ({
            stationId: req.stationId,
            level: req.level
        }));
    }

    /**
     * Check if this module requires a specific station level
     * @param {string} stationId
     * @param {number} level
     * @returns {boolean}
     */
    requiresStationLevel(stationId, level) {
        return this.stationLevelRequirements.some(req =>
            req.stationId === stationId && req.level === level
        );
    }

    /**
     * Convert to plain object for logging/debugging
     * @returns {Object}
     */
    toJSON() {
        return {
            key: this.getModuleKey(),
            displayName: this.getDisplayName(),
            itemRequirements: this.itemRequirements,
            stationLevelRequirements: this.stationLevelRequirements,
            completed: this.completed
        };
    }

    /**
     * T002: Calculate dependency depth for this module
     * Feature: 004-hideout-item-enhancements
     * 
     * Recursively calculates how many unbuilt prerequisite modules are blocking this one.
     * Uses DFS with memoization for performance.
     * 
     * @param {HideoutManager} manager - For checking built status of prerequisites
     * @param {Map<string, number>} memo - Memoization cache (optional)
     * @returns {number} - 0 if buildable now, 1+ for steps away
     */
    calculateDependencyDepth(manager, memo = new Map()) {
        const moduleKey = this.getModuleKey();

        // If already calculated, return cached result
        if (memo.has(moduleKey)) {
            return memo.get(moduleKey);
        }

        // If this module is already built, depth is 0
        if (this.completed || manager.completedModules.has(moduleKey)) {
            memo.set(moduleKey, 0);
            return 0;
        }

        // If no prerequisites, module is buildable now (depth 0)
        if (this.stationLevelRequirements.length === 0) {
            memo.set(moduleKey, 0);
            return 0;
        }

        // Calculate depth based on unbuilt prerequisites
        let maxDepth = 0;
        for (const prereq of this.stationLevelRequirements) {
            const prereqKey = `${prereq.stationId}-${prereq.level}`;

            // Check if prerequisite is built
            if (manager.completedModules.has(prereqKey)) {
                // This prerequisite is built, skip it
                continue;
            }

            // Get prerequisite module and recursively calculate its depth
            const prereqModule = manager.modulesMap.get(prereqKey);
            if (prereqModule) {
                const prereqDepth = prereqModule.calculateDependencyDepth(manager, memo);
                maxDepth = Math.max(maxDepth, prereqDepth + 1);
            } else {
                // Prerequisite module not found - shouldn't happen with valid API data
                console.warn(`Prerequisite module not found: ${prereqKey} for ${moduleKey}`);
                // Treat as depth 1 (one unbuilt prerequisite)
                maxDepth = Math.max(maxDepth, 1);
            }
        }

        memo.set(moduleKey, maxDepth);
        return maxDepth;
    }

    /**
     * T003: Get all unbuilt prerequisite modules
     * Feature: 004-hideout-item-enhancements
     * 
     * Recursively traverses prerequisite tree and returns all unbuilt modules blocking this one.
     * 
     * @param {HideoutManager} manager - For checking built status and getting module instances
     * @returns {Array<HideoutModule>} - List of unbuilt prerequisite modules
     */
    getUnbuiltPrerequisites(manager) {
        const unbuilt = [];
        const visited = new Set(); // Prevent infinite loops

        const traverse = (module) => {
            for (const prereq of module.stationLevelRequirements) {
                const prereqKey = `${prereq.stationId}-${prereq.level}`;

                // Skip if already visited or built
                if (visited.has(prereqKey) || manager.completedModules.has(prereqKey)) {
                    continue;
                }

                visited.add(prereqKey);
                const prereqModule = manager.modulesMap.get(prereqKey);

                if (prereqModule) {
                    unbuilt.push(prereqModule);
                    // Recursively get prerequisites of this prerequisite
                    traverse(prereqModule);
                }
            }
        };

        traverse(this);
        return unbuilt;
    }
}

/**
 * Parse hideout station data from API into HideoutModule instances
 * @param {Array} stationsData - Raw API response
 * @returns {Array<HideoutModule>}
 */
export function parseHideoutStations(stationsData) {
    const modules = [];

    for (const station of stationsData) {
        for (const levelData of station.levels) {
            modules.push(new HideoutModule({
                stationId: station.id,
                stationName: station.name,
                level: levelData.level,
                itemRequirements: levelData.itemRequirements.map(req => ({
                    itemId: req.item.id,
                    itemName: req.item.name || req.item.shortName || 'Unknown Item',
                    quantity: req.count
                })),
                stationLevelRequirements: levelData.stationLevelRequirements.map(req => ({
                    stationId: req.station.id,
                    stationName: req.station.name || `Station ${req.station.id}`,
                    level: req.level
                })),
                completed: false // Will be loaded from storage separately
            }));
        }
    }

    return modules;
}

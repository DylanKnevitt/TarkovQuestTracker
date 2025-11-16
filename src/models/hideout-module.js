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
                    quantity: req.count
                })),
                stationLevelRequirements: levelData.stationLevelRequirements.map(req => ({
                    stationId: req.station.id,
                    level: req.level
                })),
                completed: false // Will be loaded from storage separately
            }));
        }
    }

    return modules;
}

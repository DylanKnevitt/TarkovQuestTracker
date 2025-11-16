/**
 * Hideout Manager
 * Feature: 003-item-tracker
 * Manages hideout module completion tracking and buildability checks
 */

import { fetchHideoutStations } from '../api/tarkov-items-api.js';
import { parseHideoutStations } from './hideout-module.js';

const STORAGE_KEY = 'tarkov-hideout-progress';

/**
 * T015-T020: HideoutManager class
 * Mirrors QuestManager pattern for hideout module tracking
 * Per data-model.md
 */
export class HideoutManager {
    constructor() {
        this.stations = []; // Array of HideoutModule instances
        this.completedModules = new Map(); // Key: "stationId-level", Value: boolean
        this.modulesMap = new Map(); // Key: moduleKey, Value: HideoutModule instance
    }

    /**
     * Initialize hideout manager (load stations and progress)
     * @returns {Promise<void>}
     */
    async initialize() {
        console.log('Initializing HideoutManager...');
        await Promise.all([
            this.loadStations(),
            this.loadProgress()
        ]);
        console.log(`HideoutManager initialized: ${this.stations.length} modules, ${this.completedModules.size} completed`);
    }

    /**
     * T016: Load hideout stations from API
     * @returns {Promise<void>}
     */
    async loadStations() {
        try {
            const stationsData = await fetchHideoutStations();
            this.stations = parseHideoutStations(stationsData);

            // Build modules map for quick lookup
            this.modulesMap.clear();
            for (const module of this.stations) {
                this.modulesMap.set(module.getModuleKey(), module);
            }

            console.log(`Loaded ${this.stations.length} hideout modules`);
        } catch (error) {
            console.error('Failed to load hideout stations:', error);
            throw error;
        }
    }

    /**
     * T017: Load progress from localStorage
     * @returns {Promise<void>}
     */
    async loadProgress() {
        try {
            const json = localStorage.getItem(STORAGE_KEY);
            if (json) {
                const progress = JSON.parse(json);
                this.completedModules = new Map(Object.entries(progress));
                console.log(`Loaded hideout progress: ${this.completedModules.size} modules completed`);

                // Update completed status on module instances
                for (const [moduleKey, completed] of this.completedModules) {
                    const module = this.modulesMap.get(moduleKey);
                    if (module) {
                        module.completed = completed;
                    }
                }
            } else {
                console.log('No saved hideout progress found (starting fresh)');
            }
        } catch (error) {
            console.error('Failed to load hideout progress:', error);
            // Non-fatal - continue with empty progress
            this.completedModules.clear();
        }
    }

    /**
     * Save progress to localStorage
     * @returns {Promise<void>}
     */
    async saveProgress() {
        try {
            const progressObj = Object.fromEntries(this.completedModules);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progressObj));
        } catch (error) {
            console.error('Failed to save hideout progress:', error);
        }
    }

    /**
     * T018: Toggle module completion status
     * @param {string} stationId
     * @param {number} level
     * @returns {Promise<void>}
     */
    async toggleModuleComplete(stationId, level) {
        const key = `${stationId}-${level}`;
        const wasCompleted = this.completedModules.get(key) || false;
        const newStatus = !wasCompleted;

        this.completedModules.set(key, newStatus);

        // Update module instance
        const module = this.modulesMap.get(key);
        if (module) {
            module.completed = newStatus;
        }

        await this.saveProgress();

        // Dispatch event for ItemTracker to listen
        document.dispatchEvent(new CustomEvent('hideoutUpdated', {
            detail: { stationId, level, completed: newStatus }
        }));

        console.log(`${module ? module.getDisplayName() : key}: ${newStatus ? 'completed' : 'incomplete'}`);
    }

    /**
     * T019: Check if module is completed
     * @param {string} moduleKey - Format: "stationId-level"
     * @returns {boolean}
     */
    isModuleCompleted(moduleKey) {
        return this.completedModules.get(moduleKey) || false;
    }

    /**
     * T020: Check if module is buildable (all prerequisites met)
     * @param {string} stationId
     * @param {number} level
     * @returns {boolean}
     */
    isModuleBuildable(stationId, level) {
        const moduleKey = `${stationId}-${level}`;
        const module = this.modulesMap.get(moduleKey);

        if (!module) {
            console.warn(`Module not found: ${moduleKey}`);
            return false;
        }

        // Already completed modules are not "buildable"
        if (module.completed) {
            return false;
        }

        // Check previous level completion (except for level 1)
        if (level > 1) {
            const prevKey = `${stationId}-${level - 1}`;
            if (!this.isModuleCompleted(prevKey)) {
                return false;
            }
        }

        // Check all station prerequisites are completed
        for (const req of module.stationLevelRequirements) {
            const reqKey = `${req.stationId}-${req.level}`;
            if (!this.isModuleCompleted(reqKey)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get module by key
     * @param {string} moduleKey
     * @returns {HideoutModule|null}
     */
    getModule(moduleKey) {
        return this.modulesMap.get(moduleKey) || null;
    }

    /**
     * Get all modules for a specific station
     * @param {string} stationId
     * @returns {Array<HideoutModule>}
     */
    getStationModules(stationId) {
        return this.stations.filter(m => m.stationId === stationId);
    }

    /**
     * Get all incomplete modules
     * @returns {Array<HideoutModule>}
     */
    getIncompleteModules() {
        return this.stations.filter(m => !m.completed);
    }

    /**
     * Get all buildable modules (prerequisites met but not yet built)
     * @returns {Array<HideoutModule>}
     */
    getBuildableModules() {
        return this.stations.filter(m => 
            !m.completed && this.isModuleBuildable(m.stationId, m.level)
        );
    }

    /**
     * Get completion statistics
     * @returns {Object}
     */
    getStats() {
        const total = this.stations.length;
        const completed = this.stations.filter(m => m.completed).length;
        const buildable = this.getBuildableModules().length;

        return {
            total,
            completed,
            buildable,
            incomplete: total - completed,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    /**
     * Get all station names (unique)
     * @returns {Array<string>}
     */
    getStationNames() {
        const names = new Set(this.stations.map(m => m.stationName));
        return Array.from(names).sort();
    }

    /**
     * Clear all hideout progress (for testing)
     * @returns {Promise<void>}
     */
    async clearProgress() {
        this.completedModules.clear();
        for (const module of this.stations) {
            module.completed = false;
        }
        await this.saveProgress();
        console.log('Hideout progress cleared');
    }
}

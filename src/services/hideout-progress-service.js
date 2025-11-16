/**
 * Hideout Progress Service
 * Feature: 004-hideout-item-enhancements
 * T005: Handle database sync for hideout module build status
 * 
 * Mirrors ItemCollectionService pattern:
 * - Always save to localStorage first (immediate)
 * - If authenticated, also save to Supabase (async)
 * - On load: Try Supabase first (if authenticated), fallback to localStorage
 */

import { getSupabaseClient } from '../api/supabase-client.js';

const STORAGE_KEY = 'tarkov-hideout-progress';
const TABLE_NAME = 'hideout_progress';

export class HideoutProgressService {
    /**
     * Load hideout progress from database (if authenticated) or localStorage
     * @returns {Promise<Map<string, boolean>>} - Map of moduleKey -> completed
     */
    static async loadProgress() {
        const supabase = getSupabaseClient();

        if (!supabase) {
            console.log('Supabase not configured, using localStorage');
            return this.loadFromLocalStorage();
        }

        try {
            // Check authentication status
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Authenticated - load from Supabase
                console.log('Loading hideout progress from Supabase...');
                const { data, error } = await supabase
                    .from(TABLE_NAME)
                    .select('station_id, level, completed')
                    .eq('user_id', user.id);

                if (error) {
                    console.error('Failed to load hideout progress from Supabase:', error);
                    // Fallback to localStorage
                    return this.loadFromLocalStorage();
                }

                // Convert to Map with moduleKey format
                const progressMap = new Map();
                for (const row of data) {
                    const moduleKey = `${row.station_id}-${row.level}`;
                    progressMap.set(moduleKey, row.completed);
                }

                console.log(`Loaded ${progressMap.size} hideout modules from Supabase`);

                // Also save to localStorage for offline access
                this.saveToLocalStorage(progressMap);

                return progressMap;
            } else {
                // Not authenticated - load from localStorage
                console.log('User not authenticated, loading hideout progress from localStorage');
                return this.loadFromLocalStorage();
            }
        } catch (error) {
            console.error('Error loading hideout progress:', error);
            // Fallback to localStorage
            return this.loadFromLocalStorage();
        }
    }

    /**
     * Save hideout progress to database (if authenticated) and localStorage
     * @param {Map<string, boolean>} progressMap - Map of moduleKey -> completed
     * @returns {Promise<void>}
     */
    static async saveProgress(progressMap) {
        // Always save to localStorage first (immediate, synchronous)
        this.saveToLocalStorage(progressMap);

        const supabase = getSupabaseClient();

        if (!supabase) {
            return; // LocalStorage-only mode
        }

        try {
            // Check authentication status
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                console.log('User not authenticated, hideout progress saved to localStorage only');
                return;
            }

            // Convert Map to array of records
            const records = [];
            for (const [moduleKey, completed] of progressMap.entries()) {
                const [stationId, level] = moduleKey.split('-');
                records.push({
                    user_id: user.id,
                    station_id: stationId,
                    level: parseInt(level, 10),
                    completed
                });
            }

            // Upsert to Supabase (insert or update)
            const { error } = await supabase
                .from(TABLE_NAME)
                .upsert(records, {
                    onConflict: 'user_id,station_id,level',
                    ignoreDuplicates: false
                });

            if (error) {
                console.error('Failed to sync hideout progress to Supabase:', error);
                // Data is still saved to localStorage, so not critical
            } else {
                console.log(`Synced ${records.length} hideout modules to Supabase`);
            }
        } catch (error) {
            console.error('Error saving hideout progress to Supabase:', error);
            // Data is still saved to localStorage, so not critical
        }
    }

    /**
     * Toggle a single module's build status and sync
     * @param {string} moduleKey - Format: "stationId-level"
     * @param {boolean} completed - New build status
     * @returns {Promise<void>}
     */
    static async toggleModuleBuild(moduleKey, completed) {
        // Update localStorage first
        const progressMap = this.loadFromLocalStorage();
        progressMap.set(moduleKey, completed);
        this.saveToLocalStorage(progressMap);

        const supabase = getSupabaseClient();

        if (!supabase) {
            return; // LocalStorage-only mode
        }

        try {
            // Check authentication status
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                console.log('User not authenticated, module toggle saved to localStorage only');
                return;
            }

            // Parse moduleKey
            const [stationId, level] = moduleKey.split('-');

            // Upsert single record to Supabase
            const { error } = await supabase
                .from(TABLE_NAME)
                .upsert({
                    user_id: user.id,
                    station_id: stationId,
                    level: parseInt(level, 10),
                    completed
                }, {
                    onConflict: 'user_id,station_id,level',
                    ignoreDuplicates: false
                });

            if (error) {
                console.error('Failed to sync module toggle to Supabase:', error);
            } else {
                console.log(`Synced module ${moduleKey} (completed: ${completed}) to Supabase`);
            }
        } catch (error) {
            console.error('Error toggling module build status:', error);
        }
    }

    /**
     * Load hideout progress from localStorage
     * @returns {Map<string, boolean>}
     * @private
     */
    static loadFromLocalStorage() {
        try {
            const json = localStorage.getItem(STORAGE_KEY);
            if (!json) {
                console.log('No hideout progress found in localStorage (starting fresh)');
                return new Map();
            }

            const data = JSON.parse(json);
            const progressMap = new Map(Object.entries(data));
            console.log(`Loaded ${progressMap.size} hideout modules from localStorage`);
            return progressMap;
        } catch (error) {
            console.error('Failed to load hideout progress from localStorage:', error);
            return new Map();
        }
    }

    /**
     * Save hideout progress to localStorage
     * @param {Map<string, boolean>} progressMap
     * @private
     */
    static saveToLocalStorage(progressMap) {
        try {
            const obj = Object.fromEntries(progressMap);
            const json = JSON.stringify(obj);
            localStorage.setItem(STORAGE_KEY, json);
            console.log(`Saved ${progressMap.size} hideout modules to localStorage`);
        } catch (error) {
            console.error('Failed to save hideout progress to localStorage:', error);
        }
    }

    /**
     * Clear all hideout progress (for testing/debugging)
     * @returns {Promise<void>}
     */
    static async clearProgress() {
        // Clear localStorage
        localStorage.removeItem(STORAGE_KEY);

        try {
            // Check authentication status
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Clear Supabase data
                const { error } = await supabase
                    .from(TABLE_NAME)
                    .delete()
                    .eq('user_id', user.id);

                if (error) {
                    console.error('Failed to clear hideout progress from Supabase:', error);
                } else {
                    console.log('Cleared hideout progress from Supabase');
                }
            }
        } catch (error) {
            console.error('Error clearing hideout progress:', error);
        }

        console.log('Hideout progress cleared');
    }
}

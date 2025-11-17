/**
 * User Profile Service
 * Manages user profile data including current level
 */

import { getSupabaseClient } from '../api/supabase-client.js';

export class UserProfileService {
    constructor() {
        this.supabase = getSupabaseClient();
        this.currentProfile = null;
    }

    /**
     * Get or create user profile
     * @param {string} userId - User ID from auth
     * @returns {Promise<{level: number, error: null}|{level: null, error: Error}>}
     */
    async getUserProfile(userId) {
        if (!this.supabase || !userId) {
            return { level: 1, error: null }; // Default level when not authenticated
        }

        try {
            // Try to fetch existing profile
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('current_level')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error fetching user profile:', error);
                return { level: null, error };
            }

            // If profile exists, return it
            if (data) {
                this.currentProfile = { userId, level: data.current_level };
                return { level: data.current_level, error: null };
            }

            // Profile doesn't exist, create it with default level 1
            const { data: newData, error: insertError } = await this.supabase
                .from('user_profiles')
                .insert({ user_id: userId, current_level: 1 })
                .select('current_level')
                .single();

            if (insertError) {
                console.error('Error creating user profile:', insertError);
                return { level: null, error: insertError };
            }

            this.currentProfile = { userId, level: newData.current_level };
            return { level: newData.current_level, error: null };

        } catch (err) {
            console.error('Unexpected error in getUserProfile:', err);
            return { level: null, error: err };
        }
    }

    /**
     * Update user's current level
     * @param {string} userId - User ID from auth
     * @param {number} level - New level (1-79)
     * @returns {Promise<{success: boolean, error: Error|null}>}
     */
    async updateUserLevel(userId, level) {
        if (!this.supabase || !userId) {
            return { success: false, error: new Error('Not authenticated') };
        }

        // Validate level range
        if (level < 1 || level > 79) {
            return { success: false, error: new Error('Level must be between 1 and 79') };
        }

        try {
            const { error } = await this.supabase
                .from('user_profiles')
                .upsert(
                    { user_id: userId, current_level: level },
                    { onConflict: 'user_id' }
                );

            if (error) {
                console.error('Error updating user level:', error);
                return { success: false, error };
            }

            this.currentProfile = { userId, level };
            return { success: true, error: null };

        } catch (err) {
            console.error('Unexpected error in updateUserLevel:', err);
            return { success: false, error: err };
        }
    }

    /**
     * Get cached profile (avoids database call if already loaded)
     * @returns {number} Current level or 1 as default
     */
    getCachedLevel() {
        return this.currentProfile?.level || 1;
    }

    /**
     * Clear cached profile (call on logout)
     */
    clearCache() {
        this.currentProfile = null;
    }
}

// Singleton instance
export const userProfileService = new UserProfileService();

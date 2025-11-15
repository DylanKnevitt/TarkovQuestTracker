/**
 * ComparisonService
 * 
 * Fetches and manages user profile data and quest progress for the comparison feature.
 * Provides caching to reduce Supabase query load and improve performance.
 */

import { getSupabaseClient, isSupabaseAvailable } from '../api/supabase-client.js';
import { UserProfile } from '../models/user-profile.js';
import { UserQuestProgress } from '../models/user-quest-progress.js';

export class ComparisonService {
  constructor() {
    this.supabase = getSupabaseClient();
    this.userProfileCache = new Map(); // userId -> UserProfile
    this.progressCache = new Map(); // userId -> UserQuestProgress
  }

  /**
   * Check if comparison service is available (Supabase configured)
   * @returns {boolean}
   */
  isAvailable() {
    return isSupabaseAvailable();
  }

  /**
   * Fetch all users who have quest progress, with aggregated completion statistics
   * 
   * Query: SELECT users with LEFT JOIN quest_progress, GROUP BY user
   * Returns sorted by completion percentage descending
   * 
   * @returns {Promise<{data: UserProfile[], error: Error|null}>}
   */
  async fetchAllUserProfiles() {
    if (!this.supabase) {
      return {
        data: null,
        error: new Error('Supabase not configured. Comparison feature requires cloud sync.')
      };
    }

    try {
      // Use Supabase RPC function to get user profiles with stats
      // This function has SECURITY DEFINER privileges to access auth.users
      const { data, error } = await this.supabase
        .rpc('get_user_profiles_with_stats');

      if (error) {
        console.error('Error calling get_user_profiles_with_stats:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        
        // If function doesn't exist, provide helpful error message
        if (error.message?.includes('function') || error.code === '42883' || error.code === 'PGRST202') {
          return {
            data: null,
            error: new Error(
              'Database function not found. Please run supabase-user-profiles-function.sql in Supabase SQL Editor. Error: ' + error.message
            )
          };
        }
        
        return { data: null, error };
      }

      if (!data || data.length === 0) {
        return { data: [], error: null };
      }

      // Convert to UserProfile instances
      const userProfiles = data.map(row => new UserProfile({
        id: row.id,
        email: row.email,
        total_quests: row.total_quests,
        completed_count: row.completed_count
      }));

      // Already sorted by completion in SQL, but sort again to be sure
      userProfiles.sort((a, b) => b.completionPercentage - a.completionPercentage);

      // Cache results
      userProfiles.forEach(profile => {
        this.userProfileCache.set(profile.id, profile);
      });

      return { data: userProfiles, error: null };
    } catch (err) {
      console.error('Exception in fetchAllUserProfiles:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Fetch all quest progress records for a specific user
   * 
   * Query: SELECT * FROM quest_progress WHERE user_id = $1
   * Results are cached for session duration
   * 
   * @param {string} userId - UUID of the user whose progress to fetch
   * @returns {Promise<{data: UserQuestProgress, error: Error|null}>}
   */
  async fetchUserProgress(userId) {
    if (!this.supabase) {
      return {
        data: null,
        error: new Error('Supabase not configured.')
      };
    }

    // Check cache first
    if (this.progressCache.has(userId)) {
      return { data: this.progressCache.get(userId), error: null };
    }

    try {
      const { data, error } = await this.supabase
        .from('quest_progress')
        .select('quest_id, completed, completed_at')
        .eq('user_id', userId);

      if (error) {
        console.error(`Error fetching progress for user ${userId}:`, error);
        return { data: null, error };
      }

      const userProgress = new UserQuestProgress(userId, data || []);
      
      // Cache result
      this.progressCache.set(userId, userProgress);

      return { data: userProgress, error: null };
    } catch (err) {
      console.error('Exception in fetchUserProgress:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Batch fetch progress for multiple users
   * More efficient than calling fetchUserProgress() multiple times
   * 
   * @param {Array<string>} userIds - Array of user UUIDs
   * @returns {Promise<{data: Map<string, UserQuestProgress>, error: Error|null}>}
   */
  async batchFetchUserProgress(userIds) {
    if (!this.supabase) {
      return {
        data: null,
        error: new Error('Supabase not configured.')
      };
    }

    // Filter out already cached users
    const uncachedUserIds = userIds.filter(id => !this.progressCache.has(id));

    if (uncachedUserIds.length === 0) {
      // All requested users are cached
      const resultMap = new Map();
      userIds.forEach(id => {
        if (this.progressCache.has(id)) {
          resultMap.set(id, this.progressCache.get(id));
        }
      });
      return { data: resultMap, error: null };
    }

    try {
      // Fetch all progress records for uncached users
      const { data, error } = await this.supabase
        .from('quest_progress')
        .select('user_id, quest_id, completed, completed_at')
        .in('user_id', uncachedUserIds);

      if (error) {
        console.error('Error in batch fetch:', error);
        return { data: null, error };
      }

      // Group by user_id
      const progressByUser = new Map();
      (data || []).forEach(record => {
        if (!progressByUser.has(record.user_id)) {
          progressByUser.set(record.user_id, []);
        }
        progressByUser.get(record.user_id).push({
          quest_id: record.quest_id,
          completed: record.completed,
          completed_at: record.completed_at
        });
      });

      // Create UserQuestProgress instances and cache
      uncachedUserIds.forEach(userId => {
        const progressData = progressByUser.get(userId) || [];
        const userProgress = new UserQuestProgress(userId, progressData);
        this.progressCache.set(userId, userProgress);
      });

      // Build result map with all requested users (cached + newly fetched)
      const resultMap = new Map();
      userIds.forEach(id => {
        if (this.progressCache.has(id)) {
          resultMap.set(id, this.progressCache.get(id));
        }
      });

      return { data: resultMap, error: null };
    } catch (err) {
      console.error('Exception in batchFetchUserProgress:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Clear all cached data
   * Call this when you want to force a fresh fetch from Supabase
   */
  clearCache() {
    this.userProfileCache.clear();
    this.progressCache.clear();
    console.log('ComparisonService cache cleared');
  }

  /**
   * Get cached user profile if available
   * @param {string} userId - User UUID
   * @returns {UserProfile|null}
   */
  getCachedProfile(userId) {
    return this.userProfileCache.get(userId) || null;
  }

  /**
   * Get cached user progress if available
   * @param {string} userId - User UUID
   * @returns {UserQuestProgress|null}
   */
  getCachedProgress(userId) {
    return this.progressCache.get(userId) || null;
  }
}

// Singleton instance
let comparisonServiceInstance = null;

/**
 * Get singleton instance of ComparisonService
 * @returns {ComparisonService}
 */
export function getComparisonService() {
  if (!comparisonServiceInstance) {
    comparisonServiceInstance = new ComparisonService();
  }
  return comparisonServiceInstance;
}

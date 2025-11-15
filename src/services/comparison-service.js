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
      // Query: Get all users with quest progress aggregated
      // Note: This uses a custom RPC function or direct query
      // For now, we'll fetch separately and aggregate client-side for simplicity
      
      // First, get all unique user IDs from quest_progress
      const { data: progressData, error: progressError } = await this.supabase
        .from('quest_progress')
        .select('user_id, completed');

      if (progressError) {
        console.error('Error fetching quest progress:', progressError);
        return { data: null, error: progressError };
      }

      if (!progressData || progressData.length === 0) {
        return { data: [], error: null };
      }

      // Aggregate by user_id
      const userStatsMap = new Map();
      progressData.forEach(record => {
        const userId = record.user_id;
        if (!userStatsMap.has(userId)) {
          userStatsMap.set(userId, { total: 0, completed: 0 });
        }
        const stats = userStatsMap.get(userId);
        stats.total++;
        if (record.completed) {
          stats.completed++;
        }
      });

      // Get current session to access auth.users
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Not authenticated:', sessionError);
        return { data: null, error: new Error('Authentication required') };
      }

      // Fetch user details using auth admin API
      // Since we can't directly query auth.users, we'll use the user IDs we have
      // and get email from the session for current user, others we'll show ID
      const userIds = Array.from(userStatsMap.keys());
      
      // Build user profiles - for current user we have email from session
      const userProfiles = userIds.map(userId => {
        const stats = userStatsMap.get(userId);
        const email = userId === session.user.id ? session.user.email : `user-${userId.slice(0, 8)}`;
        
        return new UserProfile({
          id: userId,
          email: email,
          total_quests: stats.total,
          completed_count: stats.completed
        });
      });

      // Sort by completion percentage descending
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

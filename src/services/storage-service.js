/**
 * Storage Service
 * 
 * Abstracts quest progress storage across LocalStorage and Supabase.
 * Implements last-write-wins (LWW) conflict resolution strategy.
 * Provides offline support with automatic sync when connection is restored.
 */

import { syncService } from './sync-service.js';
import { authService } from './auth-service.js';

const STORAGE_KEY = 'tarkov_quest_progress';

export class StorageService {
  constructor() {
    this.currentUser = null;
    this.progressCache = {};
    this.isOnline = navigator.onLine;

    // Listen for auth state changes
    authService.onAuthStateChange((user) => {
      this.currentUser = user;
      if (user) {
        // Load progress when user logs in
        this.loadProgress().catch(err => {
          console.error('Failed to load progress on auth change:', err);
        });
      } else {
        // Clear cache when user logs out
        this.progressCache = {};
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Initialize current user
    this.init();
  }

  /**
   * Initialize storage service
   * @private
   */
  async init() {
    this.currentUser = await authService.getCurrentUser();
    if (this.currentUser) {
      await this.loadProgress();
    }
  }

  /**
   * Load quest progress from both LocalStorage and Supabase, merging with LWW
   * @returns {Promise<Object>} Progress map: { questId: { completed, completedAt, updatedAt } }
   */
  async loadProgress() {
    // Load from LocalStorage
    const localProgress = this.loadFromLocalStorage();

    // If user is authenticated, merge with Supabase data
    if (this.currentUser && syncService.isAvailable()) {
      try {
        const { data: supabaseProgress, error } = await syncService.loadFromSupabase(this.currentUser.id);

        if (error) {
          console.warn('Failed to load from Supabase, using LocalStorage only:', error);
          this.progressCache = localProgress;
          return localProgress;
        }

        // Merge LocalStorage and Supabase with Last-Write-Wins
        const merged = this.mergeProgress(localProgress, supabaseProgress || {});
        this.progressCache = merged;

        console.log('Progress loaded and merged from LocalStorage and Supabase');
        return merged;
      } catch (err) {
        console.error('Error loading progress:', err);
        this.progressCache = localProgress;
        return localProgress;
      }
    } else {
      // User not authenticated - use LocalStorage only
      this.progressCache = localProgress;
      return localProgress;
    }
  }

  /**
   * Load progress from LocalStorage
   * @returns {Object} Progress map
   */
  loadFromLocalStorage() {
    try {
      const progressJson = localStorage.getItem(STORAGE_KEY);
      if (!progressJson) {
        return {};
      }

      const progress = JSON.parse(progressJson);

      // Ensure all entries have timestamps (for old data)
      Object.keys(progress).forEach(questId => {
        if (!progress[questId].updatedAt) {
          progress[questId].updatedAt = new Date().toISOString();
        }
      });

      return progress;
    } catch (err) {
      console.error('Failed to load from LocalStorage:', err);
      return {};
    }
  }

  /**
   * Save progress to LocalStorage
   * @param {Object} progress - Progress map to save
   */
  saveToLocalStorage(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (err) {
      console.error('Failed to save to LocalStorage:', err);
    }
  }

  /**
   * Merge two progress maps using Last-Write-Wins strategy
   * @param {Object} local - LocalStorage progress
   * @param {Object} remote - Supabase progress
   * @returns {Object} Merged progress map
   */
  mergeProgress(local, remote) {
    const merged = { ...local };

    // Iterate through remote entries
    Object.keys(remote).forEach(questId => {
      const remoteEntry = remote[questId];
      const localEntry = local[questId];

      if (!localEntry) {
        // Only in remote - use remote
        merged[questId] = remoteEntry;
      } else {
        // In both - compare timestamps (Last-Write-Wins)
        const remoteTime = new Date(remoteEntry.updatedAt).getTime();
        const localTime = new Date(localEntry.updatedAt).getTime();

        if (remoteTime > localTime) {
          // Remote is newer
          merged[questId] = remoteEntry;
        }
        // else: Local is newer or equal, keep local (already in merged)
      }
    });

    return merged;
  }

  /**
   * Mark a quest as complete
   * @param {string} questId - Quest ID
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  async markComplete(questId) {
    const timestamp = new Date().toISOString();

    // Update cache
    this.progressCache[questId] = {
      completed: true,
      completedAt: timestamp,
      updatedAt: timestamp
    };

    // Save to LocalStorage immediately
    this.saveToLocalStorage(this.progressCache);

    // Sync to Supabase if user is authenticated
    if (this.currentUser && syncService.isAvailable()) {
      if (this.isOnline) {
        const result = await syncService.syncToSupabase(
          this.currentUser.id,
          questId,
          true,
          timestamp
        );

        if (!result.success) {
          // Add to sync queue for retry
          syncService.addToQueue(this.currentUser.id, questId, true, timestamp);
          return { success: false, error: result.error };
        }

        return { success: true, error: null };
      } else {
        // Offline - add to sync queue
        syncService.addToQueue(this.currentUser.id, questId, true, timestamp);
        return { success: true, error: null, offline: true };
      }
    }

    // No user or Supabase not available - LocalStorage only
    return { success: true, error: null };
  }

  /**
   * Mark a quest as incomplete
   * @param {string} questId - Quest ID
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  async markIncomplete(questId) {
    const timestamp = new Date().toISOString();

    // Update cache
    this.progressCache[questId] = {
      completed: false,
      completedAt: null,
      updatedAt: timestamp
    };

    // Save to LocalStorage immediately
    this.saveToLocalStorage(this.progressCache);

    // Sync to Supabase if user is authenticated
    if (this.currentUser && syncService.isAvailable()) {
      if (this.isOnline) {
        const result = await syncService.syncToSupabase(
          this.currentUser.id,
          questId,
          false,
          null
        );

        if (!result.success) {
          // Add to sync queue for retry
          syncService.addToQueue(this.currentUser.id, questId, false, null);
          return { success: false, error: result.error };
        }

        return { success: true, error: null };
      } else {
        // Offline - add to sync queue
        syncService.addToQueue(this.currentUser.id, questId, false, null);
        return { success: true, error: null, offline: true };
      }
    }

    // No user or Supabase not available - LocalStorage only
    return { success: true, error: null };
  }

  /**
   * Check if a quest is completed
   * @param {string} questId - Quest ID
   * @returns {boolean}
   */
  isCompleted(questId) {
    return this.progressCache[questId]?.completed === true;
  }

  /**
   * Get progress for a specific quest
   * @param {string} questId - Quest ID
   * @returns {Object|null} Progress entry or null
   */
  getProgress(questId) {
    return this.progressCache[questId] || null;
  }

  /**
   * Get all progress
   * @returns {Object} Progress map
   */
  getAllProgress() {
    return { ...this.progressCache };
  }

  /**
   * Get completion count
   * @returns {number}
   */
  getCompletionCount() {
    return Object.values(this.progressCache).filter(entry => entry.completed).length;
  }

  /**
   * Clear all progress (use with caution)
   */
  clearProgress() {
    this.progressCache = {};
    this.saveToLocalStorage({});
    console.log('Progress cleared');
  }

  /**
   * Handle online event - process sync queue
   * @private
   */
  async handleOnline() {
    console.log('Connection restored - processing sync queue');
    this.isOnline = true;

    if (this.currentUser && syncService.isAvailable()) {
      await syncService.processQueue();
    }
  }

  /**
   * Handle offline event
   * @private
   */
  handleOffline() {
    console.log('Connection lost - switching to offline mode');
    this.isOnline = false;
  }

  /**
   * Get sync status
   * @returns {Object} { isOnline, queueSize, isAuthenticated }
   */
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      queueSize: syncService.getQueueSize(),
      isAuthenticated: this.currentUser !== null,
      supabaseAvailable: syncService.isAvailable()
    };
  }
}

// Export singleton instance
export const storageService = new StorageService();

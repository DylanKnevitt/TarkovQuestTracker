/**
 * Sync Service
 * 
 * Handles synchronization of quest progress to Supabase with offline support.
 * Implements a sync queue for failed operations that retries when connection is restored.
 */

import { getSupabaseClient, isSupabaseAvailable } from '../api/supabase-client.js';

const SYNC_QUEUE_KEY = 'tarkov_sync_queue';

export class SyncService {
  constructor() {
    this.supabase = getSupabaseClient();
    this.isSyncing = false;
    this.syncCallbacks = [];
  }

  /**
   * Check if sync is available (Supabase configured and user authenticated)
   * @returns {boolean}
   */
  isAvailable() {
    return isSupabaseAvailable();
  }

  /**
   * Sync a single quest progress entry to Supabase
   * @param {string} userId - User ID
   * @param {string} questId - Quest ID
   * @param {boolean} completed - Completion status
   * @param {string} completedAt - ISO timestamp when completed (null if incomplete)
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  async syncToSupabase(userId, questId, completed, completedAt = null) {
    if (!this.supabase || !userId) {
      return { success: false, error: new Error('Supabase not available or user not authenticated') };
    }

    try {
      const timestamp = new Date().toISOString();
      
      const payload = {
        user_id: userId,
        quest_id: questId,
        completed: completed,
        completed_at: completed ? (completedAt || timestamp) : null,
        updated_at: timestamp
      };

      const { error } = await this.supabase
        .from('quest_progress')
        .upsert(payload, {
          onConflict: 'user_id,quest_id'
        });

      if (error) {
        console.error('Sync to Supabase failed:', error);
        return { success: false, error };
      }

      console.log(`Synced quest ${questId} to Supabase:`, completed ? 'complete' : 'incomplete');
      this._notifySyncComplete(true);
      return { success: true, error: null };
    } catch (err) {
      console.error('Sync exception:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Batch sync multiple quest progress entries to Supabase
   * @param {string} userId - User ID
   * @param {Array<{questId: string, completed: boolean, completedAt: string|null}>} items - Items to sync
   * @returns {Promise<{success: boolean, synced: number, failed: number, errors: Array}>}
   */
  async batchSyncToSupabase(userId, items) {
    if (!this.supabase || !userId || !items || items.length === 0) {
      return { success: false, synced: 0, failed: items?.length || 0, errors: ['Supabase not available or invalid input'] };
    }

    const timestamp = new Date().toISOString();
    const payload = items.map(item => ({
      user_id: userId,
      quest_id: item.questId,
      completed: item.completed,
      completed_at: item.completed ? (item.completedAt || timestamp) : null,
      updated_at: timestamp
    }));

    try {
      const { error } = await this.supabase
        .from('quest_progress')
        .upsert(payload, {
          onConflict: 'user_id,quest_id'
        });

      if (error) {
        console.error('Batch sync failed:', error);
        return { success: false, synced: 0, failed: items.length, errors: [error] };
      }

      console.log(`Batch synced ${items.length} quests to Supabase`);
      this._notifySyncComplete(true);
      return { success: true, synced: items.length, failed: 0, errors: [] };
    } catch (err) {
      console.error('Batch sync exception:', err);
      return { success: false, synced: 0, failed: items.length, errors: [err] };
    }
  }

  /**
   * Load quest progress from Supabase for a user
   * @param {string} userId - User ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async loadFromSupabase(userId) {
    if (!this.supabase || !userId) {
      return { data: null, error: new Error('Supabase not available or user not authenticated') };
    }

    try {
      const { data, error } = await this.supabase
        .from('quest_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Load from Supabase failed:', error);
        return { data: null, error };
      }

      // Convert array to object keyed by quest_id
      const progressMap = {};
      if (data) {
        data.forEach(item => {
          progressMap[item.quest_id] = {
            completed: item.completed,
            completedAt: item.completed_at,
            updatedAt: item.updated_at
          };
        });
      }

      console.log(`Loaded ${data?.length || 0} quest progress entries from Supabase`);
      return { data: progressMap, error: null };
    } catch (err) {
      console.error('Load exception:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Add a failed sync operation to the queue
   * @param {string} userId - User ID
   * @param {string} questId - Quest ID
   * @param {boolean} completed - Completion status
   * @param {string} completedAt - Timestamp when completed
   */
  addToQueue(userId, questId, completed, completedAt = null) {
    const queue = this.getQueue();
    
    // Check if this quest is already in the queue
    const existingIndex = queue.findIndex(item => 
      item.userId === userId && item.questId === questId
    );

    const queueItem = {
      userId,
      questId,
      completed,
      completedAt,
      timestamp: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      // Update existing entry
      queue[existingIndex] = queueItem;
    } else {
      // Add new entry
      queue.push(queueItem);
    }

    this.saveQueue(queue);
    console.log(`Added to sync queue: ${questId} (queue size: ${queue.length})`);
  }

  /**
   * Process the sync queue - retry all failed syncs
   * @returns {Promise<{processed: number, succeeded: number, failed: number}>}
   */
  async processQueue() {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    const queue = this.getQueue();
    if (queue.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isSyncing = true;
    this._notifySyncStart();

    console.log(`Processing sync queue: ${queue.length} items`);

    let succeeded = 0;
    let failed = 0;
    const remainingQueue = [];

    for (const item of queue) {
      const result = await this.syncToSupabase(
        item.userId,
        item.questId,
        item.completed,
        item.completedAt
      );

      if (result.success) {
        succeeded++;
      } else {
        failed++;
        // Keep failed items in queue for retry
        remainingQueue.push(item);
      }
    }

    // Update queue with only failed items
    this.saveQueue(remainingQueue);

    this.isSyncing = false;
    this._notifySyncComplete(failed === 0);

    console.log(`Sync queue processed: ${succeeded} succeeded, ${failed} failed, ${remainingQueue.length} remaining`);

    return { processed: queue.length, succeeded, failed };
  }

  /**
   * Get the current sync queue
   * @returns {Array<Object>}
   */
  getQueue() {
    try {
      const queueJson = localStorage.getItem(SYNC_QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (err) {
      console.error('Failed to load sync queue:', err);
      return [];
    }
  }

  /**
   * Save the sync queue to LocalStorage
   * @param {Array<Object>} queue - Queue to save
   */
  saveQueue(queue) {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('Failed to save sync queue:', err);
    }
  }

  /**
   * Clear the sync queue
   */
  clearQueue() {
    try {
      localStorage.removeItem(SYNC_QUEUE_KEY);
      console.log('Sync queue cleared');
    } catch (err) {
      console.error('Failed to clear sync queue:', err);
    }
  }

  /**
   * Get the current queue size
   * @returns {number}
   */
  getQueueSize() {
    return this.getQueue().length;
  }

  /**
   * Register callback for sync events
   * @param {Function} callback - Called with {type: 'start'|'complete'|'error', success: boolean}
   */
  onSyncEvent(callback) {
    this.syncCallbacks.push(callback);
    return () => {
      const index = this.syncCallbacks.indexOf(callback);
      if (index > -1) {
        this.syncCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify callbacks that sync has started
   * @private
   */
  _notifySyncStart() {
    this.syncCallbacks.forEach(callback => {
      try {
        callback({ type: 'start' });
      } catch (err) {
        console.error('Sync callback error:', err);
      }
    });
  }

  /**
   * Notify callbacks that sync has completed
   * @private
   * @param {boolean} success - Whether sync succeeded
   */
  _notifySyncComplete(success) {
    this.syncCallbacks.forEach(callback => {
      try {
        callback({ type: 'complete', success });
      } catch (err) {
        console.error('Sync callback error:', err);
      }
    });
  }
}

// Export singleton instance
export const syncService = new SyncService();

/**
 * UserQuestProgress Model
 * 
 * Map of quest IDs to completion status for a specific user.
 * Used for client-side intersection calculations in comparison feature.
 */

export class UserQuestProgress {
  /**
   * Create a UserQuestProgress instance
   * @param {string} userId - User UUID
   * @param {Array} progressData - Array of {quest_id, completed, completed_at} from Supabase
   */
  constructor(userId, progressData = []) {
    this.userId = userId;
    this.questMap = new Map(); // quest_id -> { completed, completedAt }
    
    // Initialize from Supabase query result
    if (progressData && Array.isArray(progressData)) {
      progressData.forEach(item => {
        this.questMap.set(item.quest_id, {
          completed: item.completed,
          completedAt: item.completed_at
        });
      });
    }
  }

  /**
   * Check if a quest is completed
   * @param {string} questId - Quest ID to check
   * @returns {boolean} True if quest is completed
   */
  isQuestCompleted(questId) {
    const progress = this.questMap.get(questId);
    return progress ? progress.completed : false;
  }

  /**
   * Check if a quest is incomplete (exists but not completed, or doesn't exist)
   * @param {string} questId - Quest ID to check
   * @returns {boolean} True if quest is incomplete
   */
  isQuestIncomplete(questId) {
    return !this.isQuestCompleted(questId);
  }

  /**
   * Get completion date for a quest
   * @param {string} questId - Quest ID
   * @returns {Date|null} Completion date or null if not completed
   */
  getCompletionDate(questId) {
    const progress = this.questMap.get(questId);
    return progress && progress.completedAt ? new Date(progress.completedAt) : null;
  }

  /**
   * Get all completed quest IDs
   * @returns {Array<string>} Array of completed quest IDs
   */
  getCompletedQuestIds() {
    const completed = [];
    this.questMap.forEach((progress, questId) => {
      if (progress.completed) {
        completed.push(questId);
      }
    });
    return completed;
  }

  /**
   * Get all incomplete quest IDs from a given list
   * @param {Array<string>} questIds - List of quest IDs to check
   * @returns {Array<string>} Array of incomplete quest IDs
   */
  getIncompleteQuestIds(questIds) {
    return questIds.filter(questId => this.isQuestIncomplete(questId));
  }

  /**
   * Get completion statistics
   * @returns {Object} Stats object with total, completed, incomplete counts
   */
  getStats() {
    let completed = 0;
    let incomplete = 0;
    
    this.questMap.forEach((progress) => {
      if (progress.completed) {
        completed++;
      } else {
        incomplete++;
      }
    });

    return {
      total: this.questMap.size,
      completed,
      incomplete,
      percentage: this.questMap.size > 0 
        ? Math.round((completed / this.questMap.size) * 100) 
        : 0
    };
  }

  /**
   * Check if user has any progress data
   * @returns {boolean} True if quest map is not empty
   */
  hasProgress() {
    return this.questMap.size > 0;
  }

  /**
   * Serialize for storage or caching
   * @returns {Object} Plain object representation
   */
  toJSON() {
    const progressArray = [];
    this.questMap.forEach((progress, questId) => {
      progressArray.push({
        quest_id: questId,
        completed: progress.completed,
        completed_at: progress.completedAt
      });
    });

    return {
      userId: this.userId,
      progress: progressArray
    };
  }

  /**
   * Create UserQuestProgress from JSON
   * @param {Object} json - Serialized UserQuestProgress
   * @returns {UserQuestProgress} New instance
   */
  static fromJSON(json) {
    return new UserQuestProgress(json.userId, json.progress);
  }

  /**
   * Calculate intersection of incomplete quests across multiple users
   * Static utility method for multi-user comparison
   * 
   * @param {Array<UserQuestProgress>} userProgressList - Array of UserQuestProgress instances
   * @param {Array<string>} allQuestIds - Complete list of quest IDs to check
   * @returns {Array<string>} Quest IDs that are incomplete for ALL users
   */
  static calculateIntersection(userProgressList, allQuestIds) {
    if (!userProgressList || userProgressList.length === 0) {
      return allQuestIds;
    }

    // Filter to quests that are incomplete for ALL selected users
    return allQuestIds.filter(questId => {
      return userProgressList.every(userProgress => 
        userProgress.isQuestIncomplete(questId)
      );
    });
  }
}

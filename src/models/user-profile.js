/**
 * UserProfile Model
 * 
 * Represents an aggregated view of a user's quest progress for display in user comparison list.
 * Client-side model - no database schema changes needed.
 */

export class UserProfile {
  /**
   * Create a UserProfile instance
   * @param {Object} data - User data from Supabase query
   * @param {string} data.id - UUID from auth.users
   * @param {string} data.email - Email from auth.users
   * @param {number} [data.total_quests=0] - Count of quest_progress rows
   * @param {number} [data.completed_count=0] - Count where completed=true
   */
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.totalQuests = data.total_quests || 0;
    this.completedCount = data.completed_count || 0;
    this.completionPercentage = this.totalQuests > 0 
      ? Math.round((this.completedCount / this.totalQuests) * 100) 
      : 0;
  }

  /**
   * Get display name (email prefix or full email)
   * @returns {string} Display name for UI
   */
  getDisplayName() {
    return this.email ? this.email.split('@')[0] : 'Unknown User';
  }

  /**
   * Get initials for avatar badge display (first 2 letters of email prefix)
   * @returns {string} Two uppercase letters
   */
  getInitials() {
    const name = this.getDisplayName();
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Get completion status color based on percentage
   * @returns {string} Color indicator (green, yellow, red)
   */
  getCompletionColor() {
    if (this.completionPercentage >= 70) return 'green';
    if (this.completionPercentage >= 30) return 'yellow';
    return 'red';
  }

  /**
   * Check if user has any quest progress
   * @returns {boolean} True if user has recorded progress
   */
  hasProgress() {
    return this.totalQuests > 0;
  }

  /**
   * Get formatted completion stats for display
   * @returns {string} e.g., "45/120 quests (38%)"
   */
  getCompletionStats() {
    return `${this.completedCount}/${this.totalQuests} quests (${this.completionPercentage}%)`;
  }

  /**
   * Serialize for storage or transmission
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      totalQuests: this.totalQuests,
      completedCount: this.completedCount,
      completionPercentage: this.completionPercentage
    };
  }

  /**
   * Create UserProfile from JSON
   * @param {Object} json - Serialized UserProfile
   * @returns {UserProfile} New instance
   */
  static fromJSON(json) {
    return new UserProfile({
      id: json.id,
      email: json.email,
      total_quests: json.totalQuests,
      completed_count: json.completedCount
    });
  }
}

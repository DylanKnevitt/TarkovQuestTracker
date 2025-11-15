/**
 * User Model
 * 
 * Wrapper around Supabase Auth user object with helper methods
 * for authentication state management.
 */

export class User {
  constructor(supabaseUser) {
    this.id = supabaseUser?.id || null;
    this.email = supabaseUser?.email || null;
    this.createdAt = supabaseUser?.created_at || null;
    this.metadata = supabaseUser?.user_metadata || {};
    this._rawUser = supabaseUser;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.id !== null;
  }

  /**
   * Check if user has completed LocalStorage migration
   * @returns {boolean}
   */
  hasMigrated() {
    return this.metadata.migration_completed === true;
  }

  /**
   * Mark user as having completed migration
   * @returns {object} Updated metadata
   */
  markMigrationComplete() {
    this.metadata.migration_completed = true;
    return this.metadata;
  }

  /**
   * Get display name for user (email prefix)
   * @returns {string}
   */
  getDisplayName() {
    if (!this.email) return 'Guest';
    return this.email.split('@')[0];
  }

  /**
   * Get user data for storage/serialization
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      createdAt: this.createdAt,
      metadata: this.metadata
    };
  }

  /**
   * Create User from Supabase auth user object
   * @param {object} supabaseUser - Supabase user object
   * @returns {User}
   */
  static fromSupabase(supabaseUser) {
    return new User(supabaseUser);
  }

  /**
   * Create empty/guest user
   * @returns {User}
   */
  static guest() {
    return new User(null);
  }
}

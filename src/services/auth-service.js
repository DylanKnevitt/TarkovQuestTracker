/**
 * Authentication Service
 * 
 * Handles all authentication operations using Supabase Auth.
 * Provides methods for signup, signin, signout, and session management.
 */

import { getSupabaseClient, isSupabaseAvailable } from '../api/supabase-client.js';
import { User } from '../models/user.js';

export class AuthService {
  constructor() {
    this.supabase = getSupabaseClient();
    this.currentUser = null;
    this.authStateCallbacks = [];
  }

  /**
   * Check if authentication is available (Supabase configured)
   * @returns {boolean}
   */
  isAvailable() {
    return isSupabaseAvailable();
  }

  /**
   * Sign up a new user with email and password
   * @param {string} email - User email address
   * @param {string} password - User password (min 6 characters)
   * @returns {Promise<{user: User, error: Error|null}>}
   */
  async signUp(email, password) {
    if (!this.supabase) {
      return {
        user: null,
        error: new Error('Supabase not configured. Cannot sign up.')
      };
    }

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            migration_completed: false
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        return { user: null, error };
      }

      // Only set current user and notify if signup was successful
      if (data.user) {
        const user = User.fromSupabase(data.user);
        this.currentUser = user;
        this._notifyAuthStateChange(user);
        return { user, error: null };
      }

      return { user: null, error: new Error('No user data returned') };
    } catch (err) {
      console.error('Sign up exception:', err);
      return { user: null, error: err };
    }
  }

  /**
   * Sign in existing user with email and password
   * @param {string} email - User email address
   * @param {string} password - User password
   * @returns {Promise<{user: User, error: Error|null}>}
   */
  async signIn(email, password) {
    if (!this.supabase) {
      return {
        user: null,
        error: new Error('Supabase not configured. Cannot sign in.')
      };
    }

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Sign in error:', error);
        return { user: null, error };
      }

      // Only set current user and notify if login was successful
      if (data.user) {
        const user = User.fromSupabase(data.user);
        this.currentUser = user;
        this._notifyAuthStateChange(user);
        return { user, error: null };
      }

      return { user: null, error: new Error('No user data returned') };
    } catch (err) {
      console.error('Sign in exception:', err);
      return { user: null, error: err };
    }
  }

  /**
   * Sign out current user
   * @returns {Promise<{error: Error|null}>}
   */
  async signOut() {
    if (!this.supabase) {
      return { error: new Error('Supabase not configured. Cannot sign out.') };
    }

    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
        return { error };
      }

      this.currentUser = null;
      this._notifyAuthStateChange(null);

      return { error: null };
    } catch (err) {
      console.error('Sign out exception:', err);
      return { error: err };
    }
  }

  /**
   * Get current authenticated user
   * @returns {Promise<User|null>}
   */
  async getCurrentUser() {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();

      if (error) {
        console.error('Get user error:', error);
        return null;
      }

      if (user) {
        this.currentUser = User.fromSupabase(user);
        return this.currentUser;
      }

      return null;
    } catch (err) {
      console.error('Get user exception:', err);
      return null;
    }
  }

  /**
   * Get current session
   * @returns {Promise<{session: object|null, error: Error|null}>}
   */
  async getSession() {
    if (!this.supabase) {
      return { session: null, error: new Error('Supabase not configured') };
    }

    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      return { session, error };
    } catch (err) {
      console.error('Get session exception:', err);
      return { session: null, error: err };
    }
  }

  /**
   * Update user metadata
   * @param {object} metadata - Metadata to update
   * @returns {Promise<{user: User|null, error: Error|null}>}
   */
  async updateUser(metadata) {
    if (!this.supabase) {
      return {
        user: null,
        error: new Error('Supabase not configured. Cannot update user.')
      };
    }

    try {
      const { data, error } = await this.supabase.auth.updateUser({
        data: metadata
      });

      if (error) {
        console.error('Update user error:', error);
        return { user: null, error };
      }

      const user = User.fromSupabase(data.user);
      this.currentUser = user;
      this._notifyAuthStateChange(user);

      return { user, error: null };
    } catch (err) {
      console.error('Update user exception:', err);
      return { user: null, error: err };
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email address
   * @returns {Promise<{error: Error|null}>}
   */
  async resetPassword(email) {
    if (!this.supabase) {
      return { error: new Error('Supabase not configured. Cannot reset password.') };
    }

    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        console.error('Reset password error:', error);
        return { error };
      }

      return { error: null };
    } catch (err) {
      console.error('Reset password exception:', err);
      return { error: err };
    }
  }

  /**
   * Register callback for auth state changes
   * @param {Function} callback - Called with User object or null
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChange(callback) {
    if (!this.supabase) {
      console.warn('Supabase not configured. Auth state changes not available.');
      return () => {};
    }

    // Add to local callbacks
    this.authStateCallbacks.push(callback);

    // Subscribe to Supabase auth state changes
    const { data: { subscription } } = this.supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        if (session?.user) {
          const user = User.fromSupabase(session.user);
          this.currentUser = user;
          this._notifyAuthStateChange(user);
        } else {
          this.currentUser = null;
          this._notifyAuthStateChange(null);
        }
      }
    );

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
      const index = this.authStateCallbacks.indexOf(callback);
      if (index > -1) {
        this.authStateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all registered callbacks of auth state change
   * @private
   * @param {User|null} user - Current user or null
   */
  _notifyAuthStateChange(user) {
    this.authStateCallbacks.forEach(callback => {
      try {
        callback(user);
      } catch (err) {
        console.error('Auth state callback error:', err);
      }
    });
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean}
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {{valid: boolean, message: string}}
   */
  static validatePassword(password) {
    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters' };
    }
    if (password.length > 72) {
      return { valid: false, message: 'Password must be less than 72 characters' };
    }
    return { valid: true, message: 'Password is valid' };
  }
}

// Export singleton instance
export const authService = new AuthService();

/**
 * Supabase Client Singleton
 * 
 * Provides a single instance of the Supabase client for use throughout the application.
 * Supports graceful degradation when environment variables are missing (offline mode).
 * 
 * Environment Variables (set in .env.local for development, Vercel dashboard for production):
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous/public API key
 */

import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

/**
 * Initialize and return Supabase client singleton
 * 
 * @returns {Object|null} Supabase client instance, or null if environment variables are missing
 */
export function getSupabaseClient() {
  // Return existing client if already initialized
  if (supabaseClient !== null) {
    return supabaseClient;
  }

  // Get environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Check if environment variables are configured
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      'Supabase environment variables not configured. Running in LocalStorage-only mode. ' +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud sync.'
    );
    return null;
  }

  // Create Supabase client with configuration
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    console.log('Supabase client initialized successfully');
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

/**
 * Check if Supabase client is available (environment variables configured)
 * 
 * @returns {boolean} True if client is available, false otherwise
 */
export function isSupabaseAvailable() {
  const client = getSupabaseClient();
  return client !== null;
}

/**
 * Reset Supabase client (useful for testing)
 * 
 * @private
 */
export function _resetSupabaseClient() {
  supabaseClient = null;
}

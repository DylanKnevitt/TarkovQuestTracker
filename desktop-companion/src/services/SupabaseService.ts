import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface QuestProgress {
    user_id: string;
    quest_id: string;
    completed: boolean;
    completed_at?: string;
    updated_at: string;
}

export class SupabaseService {
    private client: SupabaseClient | null = null;
    private isInitialized = false;

    constructor() { }

    /**
     * Initialize Supabase client with credentials
     */
    initialize(supabaseUrl: string, supabaseKey: string): boolean {
        try {
            this.client = createClient(supabaseUrl, supabaseKey);
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Check if client is initialized and ready
     */
    isReady(): boolean {
        return this.isInitialized && this.client !== null;
    }

    /**
     * Test connection to Supabase
     */
    async testConnection(): Promise<boolean> {
        if (!this.isReady()) return false;

        try {
            const { error } = await this.client!
                .from('quest_progress')
                .select('quest_id')
                .limit(1);

            return !error;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    /**
     * Mark a quest as completed
     */
    async markQuestCompleted(questId: string): Promise<boolean> {
        if (!this.isReady()) {
            console.error('Supabase client not initialized');
            return false;
        }

        try {
            const { data: { user } } = await this.client!.auth.getUser();

            if (!user) {
                console.error('No authenticated user');
                return false;
            }

            // Upsert quest progress (insert or update)
            const { error } = await this.client!
                .from('quest_progress')
                .upsert({
                    user_id: user.id,
                    quest_id: questId,
                    completed: true,
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id,quest_id'
                });

            if (error) {
                console.error('Failed to mark quest completed:', error);
                return false;
            }

            console.log(`Quest ${questId} marked as completed`);
            return true;
        } catch (error) {
            console.error('Error marking quest completed:', error);
            return false;
        }
    }

    /**
     * Mark a quest as failed (uncomplete)
     */
    async markQuestFailed(questId: string): Promise<boolean> {
        if (!this.isReady()) {
            console.error('Supabase client not initialized');
            return false;
        }

        try {
            const { data: { user } } = await this.client!.auth.getUser();

            if (!user) {
                console.error('No authenticated user');
                return false;
            }

            // Upsert quest progress with completed = false
            const { error } = await this.client!
                .from('quest_progress')
                .upsert({
                    user_id: user.id,
                    quest_id: questId,
                    completed: false,
                    completed_at: null,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id,quest_id'
                });

            if (error) {
                console.error('Failed to mark quest failed:', error);
                return false;
            }

            console.log(`Quest ${questId} marked as failed`);
            return true;
        } catch (error) {
            console.error('Error marking quest failed:', error);
            return false;
        }
    }

    /**
     * Get all quest progress for the current user
     */
    async getAllProgress(): Promise<QuestProgress[]> {
        if (!this.isReady()) {
            console.error('Supabase client not initialized');
            return [];
        }

        try {
            const { data: { user } } = await this.client!.auth.getUser();

            if (!user) {
                console.error('No authenticated user');
                return [];
            }

            const { data, error } = await this.client!
                .from('quest_progress')
                .select('*')
                .eq('user_id', user.id);

            if (error) {
                console.error('Failed to fetch quest progress:', error);
                return [];
            }

            return data as QuestProgress[];
        } catch (error) {
            console.error('Error fetching quest progress:', error);
            return [];
        }
    }

    /**
     * Batch import quest completions
     */
    async batchImportQuests(questIds: string[]): Promise<number> {
        if (!this.isReady()) {
            console.error('Supabase client not initialized');
            return 0;
        }

        try {
            const { data: { user } } = await this.client!.auth.getUser();

            if (!user) {
                console.error('No authenticated user');
                return 0;
            }

            const now = new Date().toISOString();
            const records = questIds.map(questId => ({
                user_id: user.id,
                quest_id: questId,
                completed: true,
                completed_at: now,
                updated_at: now,
            }));

            const { error } = await this.client!
                .from('quest_progress')
                .upsert(records, {
                    onConflict: 'user_id,quest_id'
                });

            if (error) {
                console.error('Failed to batch import quests:', error);
                return 0;
            }

            console.log(`Imported ${questIds.length} quests`);
            return questIds.length;
        } catch (error) {
            console.error('Error batch importing quests:', error);
            return 0;
        }
    }

    /**
     * Sign in with email and password
     */
    async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
        if (!this.isReady()) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { data, error } = await this.client!.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('Sign in error:', error);
                return { success: false, error: error.message };
            }

            if (!data.user) {
                return { success: false, error: 'No user data returned' };
            }

            console.log('Successfully signed in:', data.user.email);
            return { success: true };
        } catch (error) {
            console.error('Sign in exception:', error);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Sign up new user with email and password
     */
    async signUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
        if (!this.isReady()) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { data, error } = await this.client!.auth.signUp({
                email,
                password,
            });

            if (error) {
                console.error('Sign up error:', error);
                return { success: false, error: error.message };
            }

            if (!data.user) {
                return { success: false, error: 'No user data returned' };
            }

            console.log('Successfully signed up:', data.user.email);
            return { success: true };
        } catch (error) {
            console.error('Sign up exception:', error);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Sign out current user
     */
    async signOut(): Promise<{ success: boolean; error?: string }> {
        if (!this.isReady()) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { error } = await this.client!.auth.signOut();

            if (error) {
                console.error('Sign out error:', error);
                return { success: false, error: error.message };
            }

            console.log('Successfully signed out');
            return { success: true };
        } catch (error) {
            console.error('Sign out exception:', error);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Check if user is currently authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        if (!this.isReady()) return false;

        try {
            const { data: { user } } = await this.client!.auth.getUser();
            return !!user;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current user
     */
    async getCurrentUser() {
        if (!this.isReady()) return null;

        try {
            const { data: { user } } = await this.client!.auth.getUser();
            return user;
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    }
}

// Singleton instance
export const supabaseService = new SupabaseService();

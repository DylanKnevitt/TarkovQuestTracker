# Tarkov Quest Tracker - Cloud Deployment Spec
*Multi-user support with Vercel + Supabase (Free Tier)*

## Architecture

**Frontend:** Vercel (static hosting)  
**Backend:** Supabase (auth, PostgreSQL, realtime)  
**Cost:** $0/month

```
Frontend (Vercel) → Supabase (Auth + DB + Realtime)
```

---

## 2. Technical Architecture

### 2.1 Frontend Deployment (Vercel)

#### 2.1.1 Vercel Configuration
**File:** `vercel.json`
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": null,
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

#### 2.1.2 Build Process
**Current:** Static files served directly
**New:** Simple build step to inject environment variables

**File:** `package.json` (updated)
```json
{
  "scripts": {
    "dev": "npx http-server . -p 8080 -c-1",
    "build": "node scripts/build.js",
    "start": "npx http-server dist -p 8080",
    "deploy": "vercel --prod"
  }
}
```

**File:** `scripts/build.js` (new)
```javascript
// Copy static files and inject environment variables
const fs = require('fs');
const path = require('path');

// Create dist directory
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Copy files
const filesToCopy = [
    'index.html',
    'src',
    'styles',
    'package.json'
];

console.log('Building for production...');
// Implementation in later section
```

### 2.2 Backend Service (Supabase)

#### 2.2.1 Why Supabase?
- ✅ **Free Tier**: 500MB database, unlimited API requests
- ✅ **Built-in Auth**: Email, OAuth (Discord, Google)
- ✅ **PostgreSQL**: Robust, relational database
- ✅ **Realtime**: WebSocket subscriptions for live updates
- ✅ **Row Level Security**: Database-level access control
- ✅ **No Server Management**: Fully managed

#### 2.2.2 Database Schema

**Table: `users`** (Managed by Supabase Auth)
```sql
-- Extended user profile
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Table: `quest_progress`**
```sql
CREATE TABLE quest_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quest_id TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, quest_id)
);

-- Indexes for performance
CREATE INDEX idx_quest_progress_user_id ON quest_progress(user_id);
CREATE INDEX idx_quest_progress_quest_id ON quest_progress(quest_id);
CREATE INDEX idx_quest_progress_completed ON quest_progress(completed);
```

**Table: `user_settings`**
```sql
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_level INTEGER DEFAULT 1,
    optimizer_paths JSONB DEFAULT '["setup"]'::jsonb,
    theme TEXT DEFAULT 'dark',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Table: `friends`** (for social features)
```sql
CREATE TABLE friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

CREATE INDEX idx_friends_user_id ON friends(user_id);
CREATE INDEX idx_friends_friend_id ON friends(friend_id);
CREATE INDEX idx_friends_status ON friends(status);
```

**Table: `user_stats`** (cached statistics)
```sql
CREATE TABLE user_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_quests INTEGER DEFAULT 0,
    completed_quests INTEGER DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0,
    kappa_progress INTEGER DEFAULT 0,
    lightkeeper_progress INTEGER DEFAULT 0,
    last_quest_completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2.2.3 Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Users can read their own progress
CREATE POLICY "Users can view own progress"
    ON quest_progress FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress"
    ON quest_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
    ON quest_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can view public profiles
CREATE POLICY "Public profiles are viewable by everyone"
    ON user_profiles FOR SELECT
    USING (is_public = true OR auth.uid() = id);

-- Users can view friends' progress
CREATE POLICY "Users can view friends progress"
    ON quest_progress FOR SELECT
    USING (
        user_id IN (
            SELECT friend_id FROM friends 
            WHERE user_id = auth.uid() AND status = 'accepted'
        )
    );

-- Users can view public users' stats
CREATE POLICY "Public stats are viewable"
    ON user_stats FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM user_profiles WHERE is_public = true
        )
    );
```

#### 2.2.4 Database Functions

```sql
-- Function to update user stats after quest completion
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_stats (user_id, completed_quests, updated_at)
    VALUES (
        NEW.user_id,
        (SELECT COUNT(*) FROM quest_progress WHERE user_id = NEW.user_id AND completed = true),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
        completed_quests = (SELECT COUNT(*) FROM quest_progress WHERE user_id = NEW.user_id AND completed = true),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats
CREATE TRIGGER trigger_update_user_stats
    AFTER INSERT OR UPDATE ON quest_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

-- Function to get user leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    completed_quests INTEGER,
    completion_percentage INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.user_id,
        up.username,
        up.display_name,
        us.completed_quests,
        us.completion_percentage
    FROM user_stats us
    JOIN user_profiles up ON us.user_id = up.id
    WHERE up.is_public = true
    ORDER BY us.completed_quests DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Authentication Implementation

### 3.1 Supabase Auth Setup

#### 3.1.1 Environment Variables
**File:** `.env.local` (local development)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Vercel Environment Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

#### 3.1.2 Supabase Client Setup
**File:** `src/api/supabase.js` (new)
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
                    process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                        process.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Auth helpers
export const authService = {
    // Sign up
    async signUp(email, password, username) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username }
            }
        });
        
        if (error) throw error;
        
        // Create user profile
        if (data.user) {
            await supabase.from('user_profiles').insert({
                id: data.user.id,
                username,
                display_name: username
            });
        }
        
        return data;
    },

    // Sign in
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    },

    // Sign out
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    // Get current user
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    // Get session
    async getSession() {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    },

    // OAuth sign in
    async signInWithOAuth(provider) {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider, // 'discord', 'google', etc.
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });
        if (error) throw error;
        return data;
    }
};
```

### 3.2 Authentication UI Components

#### 3.2.1 Login/Register Modal
**File:** `src/components/auth-modal.js` (new)
```javascript
export class AuthModal {
    constructor() {
        this.modal = null;
        this.mode = 'login'; // 'login' or 'register'
        this.init();
    }

    init() {
        this.createModal();
        this.attachEventListeners();
    }

    createModal() {
        // HTML structure for auth modal
        // Includes:
        // - Email/password fields
        // - Username field (register only)
        // - Submit button
        // - OAuth buttons (Discord, Google)
        // - Toggle between login/register
    }

    async handleLogin(email, password) {
        // Implementation
    }

    async handleRegister(email, password, username) {
        // Implementation
    }

    show() {
        this.modal.style.display = 'block';
    }

    hide() {
        this.modal.style.display = 'none';
    }
}
```

#### 3.2.2 User Profile Component
**File:** `src/components/user-profile.js` (new)
```javascript
export class UserProfile {
    constructor(userId) {
        this.userId = userId;
        this.profile = null;
        this.stats = null;
    }

    async load() {
        // Fetch user profile and stats
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', this.userId)
            .single();

        const { data: stats } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', this.userId)
            .single();

        this.profile = profile;
        this.stats = stats;
    }

    render() {
        // Render user profile card
        // Shows: username, stats, progress, etc.
    }
}
```

---

## 4. Data Synchronization

### 4.1 Quest Progress Sync Service
**File:** `src/services/sync-service.js` (new)
```javascript
import { supabase } from '../api/supabase.js';

export class SyncService {
    constructor(questManager) {
        this.questManager = questManager;
        this.userId = null;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.setupListeners();
    }

    setupListeners() {
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Listen for quest updates
        document.addEventListener('questUpdated', (e) => {
            this.syncQuestUpdate(e.detail.questId);
        });
    }

    async initialize(userId) {
        this.userId = userId;
        await this.loadUserProgress();
        this.setupRealtimeSubscription();
    }

    async loadUserProgress() {
        if (!this.userId) return;

        try {
            const { data, error } = await supabase
                .from('quest_progress')
                .select('*')
                .eq('user_id', this.userId);

            if (error) throw error;

            // Apply progress to quest manager
            data.forEach(progress => {
                if (progress.completed) {
                    this.questManager.completedQuests.add(progress.quest_id);
                    const quest = this.questManager.getQuestById(progress.quest_id);
                    if (quest) quest.completed = true;
                }
            });

            this.questManager.updateUnlockedStatus();
        } catch (error) {
            console.error('Error loading progress:', error);
            // Fall back to localStorage
            this.questManager.loadProgress();
        }
    }

    async syncQuestUpdate(questId) {
        if (!this.userId || !this.isOnline) {
            this.syncQueue.push(questId);
            return;
        }

        const quest = this.questManager.getQuestById(questId);
        if (!quest) return;

        try {
            const { error } = await supabase
                .from('quest_progress')
                .upsert({
                    user_id: this.userId,
                    quest_id: questId,
                    completed: quest.completed,
                    completed_at: quest.completed ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error syncing quest:', error);
            this.syncQueue.push(questId);
        }
    }

    setupRealtimeSubscription() {
        // Subscribe to changes from other devices
        supabase
            .channel('quest_progress')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'quest_progress',
                    filter: `user_id=eq.${this.userId}`
                },
                (payload) => this.handleRealtimeUpdate(payload)
            )
            .subscribe();
    }

    handleRealtimeUpdate(payload) {
        // Handle updates from other devices
        const { quest_id, completed } = payload.new;
        const quest = this.questManager.getQuestById(quest_id);
        
        if (quest) {
            quest.completed = completed;
            if (completed) {
                this.questManager.completedQuests.add(quest_id);
            } else {
                this.questManager.completedQuests.delete(quest_id);
            }
            
            // Update UI
            document.dispatchEvent(new CustomEvent('questSynced', {
                detail: { questId: quest_id }
            }));
        }
    }

    async handleOnline() {
        this.isOnline = true;
        // Sync queued updates
        while (this.syncQueue.length > 0) {
            const questId = this.syncQueue.shift();
            await this.syncQuestUpdate(questId);
        }
    }

    handleOffline() {
        this.isOnline = false;
    }
}
```

### 4.2 Settings Sync
**File:** `src/services/settings-sync.js` (new)
```javascript
export class SettingsSync {
    async saveSettings(userId, settings) {
        await supabase
            .from('user_settings')
            .upsert({
                user_id: userId,
                ...settings,
                updated_at: new Date().toISOString()
            });
    }

    async loadSettings(userId) {
        const { data } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        return data;
    }
}
```

---

## 5. Social Features

### 5.1 User Discovery & Friends

#### 5.1.1 Search Users Component
**File:** `src/components/user-search.js` (new)
```javascript
export class UserSearch {
    async searchUsers(query) {
        const { data } = await supabase
            .from('user_profiles')
            .select('id, username, display_name, avatar_url')
            .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
            .eq('is_public', true)
            .limit(20);

        return data;
    }

    render(users) {
        // Render user search results
        // Each result shows:
        // - Avatar
        // - Username
        // - Stats preview
        // - Add friend button
    }
}
```

#### 5.1.2 Friends Management
**File:** `src/services/friends-service.js` (new)
```javascript
export class FriendsService {
    async sendFriendRequest(friendId) {
        const { data, error } = await supabase
            .from('friends')
            .insert({
                user_id: this.currentUserId,
                friend_id: friendId,
                status: 'pending'
            });

        if (error) throw error;
        return data;
    }

    async acceptFriendRequest(friendshipId) {
        const { error } = await supabase
            .from('friends')
            .update({ status: 'accepted' })
            .eq('id', friendshipId);

        if (error) throw error;

        // Create reciprocal friendship
        const friendship = await supabase
            .from('friends')
            .select('user_id, friend_id')
            .eq('id', friendshipId)
            .single();

        await supabase
            .from('friends')
            .insert({
                user_id: friendship.friend_id,
                friend_id: friendship.user_id,
                status: 'accepted'
            });
    }

    async getFriends() {
        const { data } = await supabase
            .from('friends')
            .select(`
                friend_id,
                user_profiles!friends_friend_id_fkey (
                    username,
                    display_name,
                    avatar_url
                ),
                user_stats (
                    completed_quests,
                    completion_percentage
                )
            `)
            .eq('user_id', this.currentUserId)
            .eq('status', 'accepted');

        return data;
    }
}
```

### 5.2 Progress Comparison

#### 5.2.1 Compare Progress Component
**File:** `src/components/progress-compare.js` (new)
```javascript
export class ProgressCompare {
    async compareWithUser(targetUserId) {
        // Fetch both users' progress
        const [myProgress, theirProgress] = await Promise.all([
            this.getUserProgress(this.currentUserId),
            this.getUserProgress(targetUserId)
        ]);

        // Calculate differences
        const comparison = {
            questsAhead: [],
            questsBehind: [],
            shared: []
        };

        // Implementation details
        return comparison;
    }

    async getUserProgress(userId) {
        const { data } = await supabase
            .from('quest_progress')
            .select('quest_id, completed')
            .eq('user_id', userId);

        return data;
    }

    renderComparison(comparison) {
        // Visual comparison:
        // - Side-by-side progress bars
        // - Quest lists (completed by both, only by me, only by them)
        // - Suggestions (quests they completed that you haven't)
    }
}
```

### 5.3 Leaderboard

#### 5.3.1 Leaderboard Component
**File:** `src/components/leaderboard.js` (new)
```javascript
export class Leaderboard {
    async loadLeaderboard(type = 'global', limit = 100) {
        const { data, error } = await supabase
            .rpc('get_leaderboard', { limit_count: limit });

        if (error) throw error;
        return data;
    }

    render(data) {
        // Render leaderboard table:
        // Rank | Username | Completed Quests | Completion %
        // Highlight current user
        // Show top 100 or pagination
    }
}
```

---

## 6. UI Updates for Multi-User

### 6.1 New Navigation Elements

#### 6.1.1 Header Updates
```html
<header class="header">
    <div class="header-content">
        <h1>Tarkov Quest Tracker</h1>
        <div class="header-stats">
            <span id="quest-count">Loading quests...</span>
            <span id="completion-rate">0% Complete</span>
        </div>
        <!-- NEW -->
        <div class="user-menu">
            <button id="friends-btn" class="icon-btn">
                👥 <span class="badge" id="friend-requests">0</span>
            </button>
            <button id="leaderboard-btn" class="icon-btn">🏆</button>
            <div class="user-dropdown">
                <img id="user-avatar" class="avatar" />
                <span id="username"></span>
                <button id="logout-btn">Logout</button>
            </div>
        </div>
        <!-- END NEW -->
    </div>
</header>
```

### 6.2 New Tabs

#### 6.2.1 Social Tab
```html
<button class="tab-btn" data-tab="social">Social</button>

<div id="social-tab" class="tab-content">
    <div class="social-container">
        <div class="social-section">
            <h2>Friends</h2>
            <div id="friends-list"></div>
        </div>
        
        <div class="social-section">
            <h2>Search Users</h2>
            <input type="text" id="user-search" placeholder="Search by username..." />
            <div id="search-results"></div>
        </div>
        
        <div class="social-section">
            <h2>Leaderboard</h2>
            <div id="leaderboard-container"></div>
        </div>
    </div>
</div>
```

---

## 7. Deployment Process

### 7.1 Supabase Setup

#### Step-by-Step Process:
1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project (free tier)
   - Note URL and anon key

2. **Run Database Migrations**
   ```sql
   -- Execute all schema SQL from section 2.2.2
   ```

3. **Configure Authentication**
   - Enable Email auth
   - Configure OAuth providers (optional):
     - Discord
     - Google
   - Set redirect URLs:
     - `https://your-app.vercel.app/auth/callback`
     - `http://localhost:8080/auth/callback` (dev)

4. **Set Row Level Security**
   - Execute all RLS policies from section 2.2.3

### 7.2 Vercel Deployment

#### Step-by-Step Process:
1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Configure Environment Variables**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

4. **Deploy**
   ```bash
   # First deployment
   vercel

   # Production deployment
   vercel --prod
   ```

5. **Configure Domain** (optional)
   - Add custom domain in Vercel dashboard
   - Update Supabase auth redirect URLs

### 7.3 Post-Deployment Checklist
- ✅ Test user registration
- ✅ Test login/logout
- ✅ Test quest progress sync
- ✅ Test friend requests
- ✅ Test leaderboard
- ✅ Test offline functionality
- ✅ Verify RLS policies
- ✅ Check performance
- ✅ Test on mobile devices

---

## 8. Migration Strategy

### 8.1 Migrating Existing Users

#### 8.1.1 Import LocalStorage Data
**File:** `src/services/migration-service.js` (new)
```javascript
export class MigrationService {
    async migrateLocalStorageToCloud(userId) {
        // Read existing localStorage data
        const localProgress = localStorage.getItem('quest_progress');
        const localSettings = localStorage.getItem('optimizer_settings');

        if (localProgress) {
            const completedQuests = JSON.parse(localProgress);
            
            // Batch insert to Supabase
            const progressData = completedQuests.map(questId => ({
                user_id: userId,
                quest_id: questId,
                completed: true,
                completed_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('quest_progress')
                .insert(progressData);

            if (!error) {
                // Clear localStorage after successful migration
                localStorage.removeItem('quest_progress');
            }
        }

        if (localSettings) {
            const settings = JSON.parse(localSettings);
            await settingsSync.saveSettings(userId, settings);
            localStorage.removeItem('optimizer_settings');
        }
    }

    showMigrationPrompt() {
        // Show UI prompt to user:
        // "We found existing progress. Would you like to migrate it to your account?"
        // [Migrate] [Skip]
    }
}
```

### 8.2 Backward Compatibility
- App continues to work without login (localStorage only)
- Login is optional but encouraged
- Show benefits of creating an account:
  - Sync across devices
  - Compare with friends
  - Join leaderboard
  - Never lose progress

---

## 9. Performance Considerations

### 9.1 Optimization Strategies

#### 9.1.1 Database Query Optimization
- Use indexes on frequently queried columns
- Batch updates when possible
- Cache user stats in `user_stats` table
- Use Supabase edge functions for complex queries

#### 9.1.2 Frontend Optimization
- Lazy load social features
- Debounce sync operations (max 1 per second)
- Queue updates while offline
- Use Supabase realtime sparingly
- Cache friend list locally

#### 9.1.3 API Rate Limiting
```javascript
class RateLimiter {
    constructor(maxRequests = 10, timeWindow = 1000) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = [];
    }

    async throttle(fn) {
        const now = Date.now();
        this.requests = this.requests.filter(
            time => now - time < this.timeWindow
        );

        if (this.requests.length >= this.maxRequests) {
            const waitTime = this.timeWindow - (now - this.requests[0]);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.requests.push(now);
        return fn();
    }
}
```

### 9.2 Supabase Free Tier Limits
- **Database Size**: 500 MB
- **Egress**: 5 GB/month
- **Realtime**: 200 concurrent connections
- **API Requests**: Unlimited

**Staying Within Limits:**
- Efficient queries
- Compress data where possible
- Use CDN for static assets (Vercel)
- Limit realtime subscriptions
- Batch operations

---

## 10. Security Considerations

### 10.1 Authentication Security
- ✅ Secure password hashing (handled by Supabase)
- ✅ JWT tokens with expiration
- ✅ HTTPS only in production
- ✅ CSRF protection
- ✅ Rate limiting on auth endpoints

### 10.2 Data Access Security
- ✅ Row Level Security on all tables
- ✅ User can only modify own data
- ✅ Friends can only view, not modify
- ✅ Input validation and sanitization
- ✅ Prepared statements (Supabase default)

### 10.3 Privacy Controls
```javascript
// Privacy settings in user profile
{
    is_public: boolean,          // Appear in search/leaderboard
    show_progress: boolean,      // Friends can see quest details
    allow_friend_requests: boolean
}
```

---

## 11. Monitoring & Analytics

### 11.1 Error Tracking
**Integration: Sentry (Free Tier)**
```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
    dsn: "your-sentry-dsn",
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1
});
```

### 11.2 Usage Analytics
**Integration: Plausible (Privacy-focused, Free tier available)**
```html
<script defer data-domain="your-domain.vercel.app" 
        src="https://plausible.io/js/script.js"></script>
```

### 11.3 Key Metrics to Track
- Daily Active Users (DAU)
- Quest completion rate
- Friend connections
- Sync success rate
- Page load time
- Error rate

---

## 12. Cost Breakdown (All Free Tiers)

| Service | Free Tier | Usage Estimate | Cost |
|---------|-----------|----------------|------|
| Vercel | 100GB bandwidth/month | ~50GB | $0 |
| Supabase | 500MB DB, unlimited API | ~200MB | $0 |
| Sentry | 5,000 errors/month | ~1,000 | $0 |
| Plausible | 10k pageviews/month | ~5k | $0 |
| **Total** | | | **$0/month** |

**Upgrade Triggers:**
- Supabase: > 500MB database (unlikely)
- Vercel: > 100GB bandwidth (upgrade to Hobby $20/mo)
- Sentry: > 5,000 errors (indicates bugs to fix)

---

## 13. Future Enhancements

### 13.1 Phase 2 Features
- [ ] Discord bot integration
- [ ] Mobile app (React Native)
- [ ] Quest guides/tips from community
- [ ] Achievement system
- [ ] Quest completion notifications
- [ ] Group/squad progress tracking

### 13.2 Phase 3 Features
- [ ] Video guide integration (YouTube embeds)
- [ ] Map integration with quest locations
- [ ] Item tracker and market prices
- [ ] Hideout progression tracker
- [ ] Automated progress from game API (if available)

---

## 14. Implementation Timeline

### Week 1: Backend Setup
- Day 1-2: Supabase project setup and schema
- Day 3-4: RLS policies and functions
- Day 5: Auth integration
- Day 6-7: Testing and refinement

### Week 2: Frontend Integration
- Day 8-9: Auth UI components
- Day 10-11: Sync service implementation
- Day 12-13: Social features UI
- Day 14: Testing

### Week 3: Deployment & Polish
- Day 15-16: Vercel deployment
- Day 17-18: Migration tools
- Day 19: Performance optimization
- Day 20-21: User testing and bug fixes

---

## 15. Success Criteria

### 15.1 Functional Requirements
✅ Users can register and login
✅ Quest progress syncs across devices
✅ Users can add friends
✅ Users can compare progress
✅ Leaderboard displays top users
✅ Offline mode works
✅ Migration from localStorage works

### 15.2 Performance Requirements
✅ Page load < 2 seconds
✅ Sync latency < 1 second
✅ 99.9% uptime
✅ Zero data loss
✅ Works on mobile

### 15.3 User Satisfaction
✅ Easy registration process
✅ Intuitive social features
✅ Responsive UI
✅ Clear privacy controls
✅ Helpful migration process

---

## 16. Risk Mitigation

### 16.1 Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase downtime | High | Implement offline mode, queue syncs |
| Data loss | Critical | Regular backups, transaction logs |
| Performance issues | Medium | Optimize queries, add indexes |
| API rate limits | Medium | Implement throttling, caching |

### 16.2 User Adoption Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Users don't create accounts | Medium | Emphasize benefits, easy migration |
| Privacy concerns | Low | Clear privacy policy, user controls |
| Feature complexity | Low | Gradual rollout, good onboarding |

---

## 17. Documentation Requirements

### 17.1 User Documentation
- [ ] Registration guide
- [ ] Privacy settings guide
- [ ] Friend system guide
- [ ] Migration guide
- [ ] FAQ

### 17.2 Developer Documentation
- [ ] API documentation
- [ ] Database schema docs
- [ ] Deployment guide
- [ ] Contributing guide
- [ ] Architecture overview

---

## 18. Testing Strategy

### 18.1 Unit Tests
```javascript
// Example test structure
describe('SyncService', () => {
    test('syncs quest completion to cloud', async () => {
        // Test implementation
    });

    test('handles offline mode correctly', async () => {
        // Test implementation
    });
});
```

### 18.2 Integration Tests
- Auth flow (register → login → logout)
- Quest sync (complete → sync → verify)
- Friend system (request → accept → view progress)
- Leaderboard (complete quests → appears in ranking)

### 18.3 E2E Tests (Playwright)
```javascript
test('user can register and complete quest', async ({ page }) => {
    await page.goto('https://your-app.vercel.app');
    await page.click('#register-btn');
    // ... test implementation
});
```

---

## 19. Rollout Strategy

### 19.1 Phased Rollout
1. **Alpha** (Week 1): Internal testing
2. **Beta** (Week 2): Invite 50 users
3. **Soft Launch** (Week 3): Open to public, no marketing
4. **Full Launch** (Week 4): Marketing, announcements

### 19.2 Feature Flags
```javascript
const features = {
    social: true,
    leaderboard: true,
    friends: true,
    oauth: false  // Enable after testing
};
```

---

## 20. Conclusion

This specification provides a complete blueprint for deploying the Tarkov Quest Tracker to Vercel with full multi-user support using free-tier services. The architecture is scalable, secure, and provides a solid foundation for future enhancements.

**Key Advantages:**
- ✅ Zero monthly cost
- ✅ Scalable architecture
- ✅ Modern tech stack
- ✅ Secure by design
- ✅ Backward compatible
- ✅ Mobile-friendly
- ✅ Privacy-focused

**Next Steps:**
1. Review and approve specification
2. Set up Supabase project
3. Begin implementation (Week 1)
4. Deploy to Vercel
5. Launch! 🚀

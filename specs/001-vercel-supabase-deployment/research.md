# Research: Vercel + Supabase Deployment

**Feature**: 001-vercel-supabase-deployment  
**Date**: 2025-11-15  
**Status**: Complete

## Overview

This document captures technical research and decision-making for deploying the Tarkov Quest Tracker to Vercel with Supabase backend integration. All unknowns from the Technical Context have been resolved.

---

## Decision 1: Vercel Deployment Configuration

**Decision**: Use static site deployment with vercel.json for SPA routing

**Rationale**:
- Current application is a pure SPA with no server-side rendering
- Vercel's static site deployment is free tier eligible
- SPA routing requires rewrite rules to handle client-side routing
- vercel.json provides configuration for headers, rewrites, and redirects

**Alternatives Considered**:
- **Next.js migration**: Would enable SSR but requires significant refactor and introduces complexity
- **Vercel Functions**: Not needed - no backend logic required (Supabase handles this)
- **Manual static hosting**: Vercel provides better DX with automatic deployments

**Implementation Details**:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

**References**:
- https://vercel.com/docs/projects/project-configuration
- https://vercel.com/docs/frameworks/vanilla-javascript

---

## Decision 2: Supabase Client Integration Pattern

**Decision**: Use @supabase/supabase-js browser client with singleton initialization

**Rationale**:
- Official Supabase JavaScript library designed for browser environments
- Singleton pattern prevents multiple client instances
- Client handles authentication state automatically
- Built-in retry logic and connection pooling

**Alternatives Considered**:
- **Direct PostgreSQL client**: Would bypass Supabase features (auth, RLS, realtime)
- **Multiple client instances**: Could cause auth state inconsistencies
- **Service Worker approach**: Adds complexity without clear benefits

**Implementation Pattern**:
```javascript
// src/api/supabase-client.js
import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not configured - running in offline mode');
      return null;
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  
  return supabaseClient;
}
```

**References**:
- https://supabase.com/docs/reference/javascript/installing
- https://supabase.com/docs/reference/javascript/initializing

---

## Decision 3: Environment Variable Management

**Decision**: Use .env.local for development, Vercel dashboard for production

**Rationale**:
- .env.local is standard Node.js convention and gitignored by default
- Vercel dashboard provides secure environment variable management
- Supports different values for development, preview, and production
- No build-time secret exposure (variables injected at runtime)

**Alternatives Considered**:
- **Hardcoded values**: Security risk, rejected immediately
- **Separate config files**: More complex, no advantage over .env approach
- **Git-tracked .env**: Would expose secrets in repository

**Environment Variables Required**:
```bash
# .env.example (committed to repository)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# .env.local (gitignored, for local development)
VITE_SUPABASE_URL=https://xyzcompany.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Security Notes**:
- Use VITE_ prefix for client-side variables (Vite convention)
- Anon key is safe to expose client-side (RLS enforces security)
- Service role key must NEVER be exposed to client

**References**:
- https://vitejs.dev/guide/env-and-mode.html
- https://vercel.com/docs/projects/environment-variables

---

## Decision 4: Database Schema Design

**Decision**: Minimal schema with auth.users (managed) + public.quest_progress (custom)

**Rationale**:
- Supabase manages auth.users table automatically
- quest_progress table only needs: user_id, quest_id, completed, timestamps
- Denormalized for simplicity (no quest metadata stored - comes from Tarkov.dev API)
- Composite primary key (user_id, quest_id) prevents duplicates

**Alternatives Considered**:
- **Normalized with quest metadata**: Would duplicate Tarkov.dev API data unnecessarily
- **Separate tables per quest type**: Over-engineering for binary completion status
- **JSON column for all progress**: Would complicate queries and indexing

**Schema**:
```sql
-- auth.users managed by Supabase
-- We only reference it via foreign key

CREATE TABLE public.quest_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_id)
);

-- Index for fast user queries
CREATE INDEX idx_quest_progress_user_id ON public.quest_progress(user_id);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quest_progress_updated_at
  BEFORE UPDATE ON public.quest_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

**References**:
- https://supabase.com/docs/guides/database/tables
- https://supabase.com/docs/guides/auth/managing-user-data

---

## Decision 5: Row Level Security (RLS) Policies

**Decision**: Enable RLS with user-specific SELECT/INSERT/UPDATE policies

**Rationale**:
- RLS enforces data isolation at database level
- Users can only access their own quest_progress rows
- No application-level security checks needed
- Prevents unauthorized access even if client code is compromised

**Alternatives Considered**:
- **Application-level checks**: Would require backend server, increases complexity
- **Disable RLS**: Security risk - users could access others' data
- **Role-based access**: Not needed - all users have same permissions to their own data

**RLS Policies**:
```sql
-- Enable RLS on quest_progress table
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own quest progress
CREATE POLICY "Users can view own quest progress"
  ON public.quest_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own quest progress
CREATE POLICY "Users can insert own quest progress"
  ON public.quest_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own quest progress
CREATE POLICY "Users can update own quest progress"
  ON public.quest_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own quest progress (for account cleanup)
CREATE POLICY "Users can delete own quest progress"
  ON public.quest_progress
  FOR DELETE
  USING (auth.uid() = user_id);
```

**Testing RLS**:
- Create test users in Supabase dashboard
- Verify queries only return user's own data
- Test unauthorized access attempts (should return empty results)

**References**:
- https://supabase.com/docs/guides/auth/row-level-security
- https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---

## Decision 6: Authentication Flow

**Decision**: Email/password with Supabase Auth, session persisted in LocalStorage

**Rationale**:
- Supabase Auth handles password hashing, email verification, token management
- Session tokens stored in localStorage by default (survives page refreshes)
- Automatic token refresh handled by Supabase client
- Password reset via email built-in

**Alternatives Considered**:
- **OAuth providers**: Deferred to future (adds complexity, requires provider setup)
- **Magic links**: Less familiar UX for users
- **SessionStorage**: Would log users out on tab close (poor UX)

**Authentication Flow**:
```javascript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
});

// Sign out
const { error } = await supabase.auth.signOut();

// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Listen to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Load user's quest progress from Supabase
  } else if (event === 'SIGNED_OUT') {
    // Clear UI, show login screen
  }
});
```

**Password Requirements**:
- Minimum 8 characters (enforced by Supabase default)
- Client-side validation before submission
- Error messages for weak passwords

**References**:
- https://supabase.com/docs/guides/auth/auth-email
- https://supabase.com/docs/reference/javascript/auth-signup

---

## Decision 7: Data Synchronization Strategy

**Decision**: Last-write-wins (LWW) with timestamp comparison, LocalStorage as fallback

**Rationale**:
- Simple conflict resolution strategy appropriate for single-user progress
- Timestamps determine which version is newer
- LocalStorage ensures offline capability
- Syncs to Supabase when online, falls back to LocalStorage when offline

**Alternatives Considered**:
- **Operational Transformation (OT)**: Over-engineered for quest completion (binary state)
- **CRDTs**: Complex to implement, not needed for simple progress tracking
- **Always Supabase, no LocalStorage**: Would break offline functionality

**Sync Flow**:
```
On App Load:
1. Check if user is authenticated
2. If authenticated:
   - Load progress from Supabase
   - Compare with LocalStorage timestamps
   - Use newest data (LWW)
3. If not authenticated:
   - Load progress from LocalStorage only

On Quest Complete/Incomplete:
1. Update LocalStorage immediately (instant feedback)
2. If authenticated and online:
   - Update Supabase in background
   - On success: Mark sync status as "synced"
   - On failure: Queue for retry, mark as "pending"
3. If offline:
   - Queue for retry when connection returns

On Connection Restored:
1. Process sync queue
2. Send pending changes to Supabase
3. Update sync status
```

**Conflict Resolution Example**:
```javascript
async function mergeProgress(localProgress, remoteProgress) {
  const merged = {};
  
  // Combine quest IDs from both sources
  const allQuestIds = new Set([
    ...Object.keys(localProgress),
    ...Object.keys(remoteProgress)
  ]);
  
  for (const questId of allQuestIds) {
    const local = localProgress[questId];
    const remote = remoteProgress[questId];
    
    if (!local) {
      merged[questId] = remote; // Only in remote
    } else if (!remote) {
      merged[questId] = local; // Only in local
    } else {
      // Both exist - use newest timestamp (LWW)
      merged[questId] = new Date(local.updated_at) > new Date(remote.updated_at)
        ? local
        : remote;
    }
  }
  
  return merged;
}
```

**References**:
- https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type
- https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine

---

## Decision 8: Migration Strategy for Existing Users

**Decision**: One-time migration prompt on first authentication with existing LocalStorage

**Rationale**:
- Preserves user progress when transitioning to cloud storage
- Non-destructive (LocalStorage remains untouched)
- User consent required (clear communication)
- Only shown once per user

**Alternatives Considered**:
- **Automatic migration**: Could surprise users, no consent
- **No migration**: Users would lose progress, poor retention
- **Manual export/import**: Too complex for typical user

**Migration Flow**:
```
On First Sign In/Sign Up:
1. Check if LocalStorage has quest progress
2. Check if user has any progress in Supabase
3. If LocalStorage has progress AND Supabase is empty:
   - Show migration modal
   - Explain what will happen
   - "Import My Progress" button
4. If user accepts:
   - Read all completed quests from LocalStorage
   - Batch insert to Supabase quest_progress table
   - Show success message
   - Set migration_completed flag
5. If user declines:
   - Continue with empty Supabase progress
   - Don't show prompt again

Subsequent Sign Ins:
- Check migration_completed flag
- Skip migration prompt if already migrated
```

**Migration Flag Storage**:
```javascript
// Store in Supabase user metadata to track migration status
await supabase.auth.updateUser({
  data: { migration_completed: true }
});

// Or store in separate migrations table
CREATE TABLE public.user_migrations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**References**:
- https://supabase.com/docs/guides/auth/managing-user-data#user-metadata

---

## Decision 9: Offline Support & Sync Queue

**Decision**: LocalStorage-first writes, background sync to Supabase with retry queue

**Rationale**:
- Instant user feedback (writes to LocalStorage are synchronous)
- Network failures don't block UI
- Retry queue ensures eventual consistency
- Users can work offline and changes sync when connection returns

**Alternatives Considered**:
- **Block on Supabase write**: Poor UX, fails when offline
- **No offline support**: Breaks existing functionality
- **Service Worker sync**: More complex, limited browser support

**Sync Queue Implementation**:
```javascript
// Structure of sync queue stored in LocalStorage
const syncQueue = [
  {
    id: 'uuid-v4',
    action: 'complete', // or 'incomplete'
    questId: 'quest-123',
    timestamp: '2025-11-15T10:30:00Z',
    retries: 0,
    status: 'pending' // or 'synced', 'failed'
  }
];

// Process sync queue
async function processSyncQueue() {
  const queue = getSyncQueue();
  
  for (const item of queue) {
    if (item.status === 'synced') continue;
    
    try {
      await syncToSupabase(item);
      item.status = 'synced';
    } catch (error) {
      item.retries++;
      
      if (item.retries > 3) {
        item.status = 'failed';
        console.error('Sync failed after 3 retries:', error);
      }
    }
  }
  
  saveSyncQueue(queue.filter(item => item.status !== 'synced'));
}

// Sync on connection restore
window.addEventListener('online', () => {
  processSyncQueue();
});
```

**Exponential Backoff**:
```javascript
const backoffDelay = Math.min(1000 * Math.pow(2, retries), 30000);
setTimeout(() => retry(), backoffDelay);
```

**References**:
- https://web.dev/offline-cookbook/
- https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine

---

## Decision 10: Bundle Size Management

**Decision**: Add Supabase client as external dependency, monitor with bundler analysis

**Rationale**:
- @supabase/supabase-js is ~50KB gzipped (acceptable for benefits)
- Total bundle stays under 500KB constraint
- Tree-shaking eliminates unused Supabase features
- Code splitting can defer auth UI until needed

**Alternatives Considered**:
- **Custom PostgreSQL client**: Would save ~30KB but lose auth, RLS, and other features
- **Inline all dependencies**: Would increase bundle size unnecessarily
- **No bundle size constraints**: Could degrade performance on slow connections

**Bundle Analysis**:
```bash
# Add to package.json scripts
"analyze": "vite build --mode analyze"

# Expected bundle breakdown:
# - App code: ~150KB
# - Cytoscape + Dagre: ~200KB
# - Supabase client: ~50KB
# - Total: ~400KB (under 500KB limit)
```

**Code Splitting Strategy**:
```javascript
// Lazy load auth UI component
const AuthUI = () => import('./components/auth-ui.js');

// Only load when user clicks login
button.addEventListener('click', async () => {
  const { default: AuthUI } = await import('./components/auth-ui.js');
  renderAuthUI();
});
```

**References**:
- https://vitejs.dev/guide/build.html#library-mode
- https://bundlephobia.com/package/@supabase/supabase-js

---

## Summary of Technical Decisions

| Decision | Choice | Impact |
|----------|--------|--------|
| **Deployment Platform** | Vercel static site | Free hosting, automatic CI/CD |
| **Backend Service** | Supabase (PostgreSQL + Auth) | Free tier, managed infrastructure |
| **Client Library** | @supabase/supabase-js (singleton) | Browser-native, auth built-in |
| **Environment Management** | .env.local + Vercel dashboard | Secure secrets, environment isolation |
| **Database Schema** | Minimal (quest_progress table) | Simple, denormalized, fast queries |
| **Security** | Row Level Security (RLS) | Database-enforced data isolation |
| **Authentication** | Email/password (Supabase Auth) | Managed, secure, with password reset |
| **Sync Strategy** | Last-write-wins (timestamp) | Simple, appropriate for use case |
| **Migration** | One-time prompt on first auth | Preserves user progress, non-destructive |
| **Offline Support** | LocalStorage-first + retry queue | Instant feedback, eventual consistency |
| **Bundle Size** | Monitor with Vite analysis | Stay under 500KB constraint |

---

## Open Questions

**Resolved During Research**:
- ✅ How to handle Vercel SPA routing? → vercel.json rewrites
- ✅ Which Supabase client pattern? → Singleton initialization
- ✅ How to manage secrets? → .env.local + Vercel dashboard
- ✅ What database schema? → Minimal quest_progress table
- ✅ How to enforce security? → Row Level Security policies
- ✅ Which auth method? → Email/password (OAuth deferred)
- ✅ How to handle conflicts? → Last-write-wins with timestamps
- ✅ How to migrate existing users? → One-time prompt with consent
- ✅ How to support offline? → LocalStorage-first with sync queue
- ✅ How to manage bundle size? → Monitor, tree-shake, code split

**Deferred to Implementation**:
- Exact UI design for auth components (will match existing styles)
- Specific error messages for sync failures (will test and refine)
- Retry queue persistence across browser restarts (implementation detail)
- Database indexes beyond primary key (can optimize after profiling)

---

## Next Steps

1. Create data-model.md (Phase 1)
2. Generate API contracts for Supabase operations (Phase 1)
3. Write quickstart.md for developer onboarding (Phase 1)
4. Update agent context with new technologies (Phase 1)
5. Create task breakdown (Phase 2)

---

**Generated**: 2025-11-15  
**Author**: GitHub Copilot (via speckit.plan workflow)

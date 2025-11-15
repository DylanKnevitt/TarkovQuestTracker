# Data Model: Vercel + Supabase Deployment

**Feature**: 001-vercel-supabase-deployment  
**Date**: 2025-11-15  
**Status**: Complete

## Overview

This document defines the data structures, relationships, and state management for the Vercel + Supabase deployment feature. It covers both the Supabase PostgreSQL schema and the client-side data models.

---

## Entity Relationship Diagram

```
┌─────────────────────┐
│   auth.users        │ (Managed by Supabase Auth)
│─────────────────────│
│ id (UUID) PK        │
│ email               │
│ encrypted_password  │
│ created_at          │
│ updated_at          │
│ user_metadata       │◄──── Contains: { migration_completed: boolean }
└─────────────────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────────┐
│ quest_progress      │
│─────────────────────│
│ user_id (UUID) PK,FK│───────┐
│ quest_id (TEXT) PK  │       │ Composite Primary Key
│ completed (BOOL)    │       │ Prevents duplicate entries
│ completed_at (TS)   │───────┘
│ updated_at (TS)     │
└─────────────────────┘

External Reference (not stored in Supabase):
┌─────────────────────┐
│ Tarkov.dev API      │ (GraphQL - read-only)
│─────────────────────│
│ Quest Data          │
│ - id                │
│ - name              │
│ - requirements      │
│ - objectives        │
└─────────────────────┘
```

**Relationship Notes**:
- `auth.users.id` → `quest_progress.user_id`: One user has many quest progress records
- Quest metadata (name, objectives, etc.) comes from Tarkov.dev API, not stored in Supabase
- `quest_progress` only tracks completion status, not full quest details

---

## Database Schema (Supabase PostgreSQL)

### Table: `auth.users`

**Managed by Supabase** - Do not create manually

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PRIMARY KEY | Auto-generated user identifier |
| `email` | `TEXT` | UNIQUE, NOT NULL | User email address |
| `encrypted_password` | `TEXT` | NOT NULL | Hashed password (bcrypt) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Account creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Last account update |
| `user_metadata` | `JSONB` | NULL | Custom user data (e.g., migration_completed) |

**Notes**:
- Supabase Auth automatically manages this table
- Use `auth.uid()` in RLS policies to reference current user
- `user_metadata` can store custom flags (migration status, preferences)

---

### Table: `quest_progress`

**Custom table** - Must be created via migration

```sql
CREATE TABLE public.quest_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_id)
);

-- Index for fast user-specific queries
CREATE INDEX idx_quest_progress_user_id ON public.quest_progress(user_id);

-- Index for timestamp-based sync queries
CREATE INDEX idx_quest_progress_updated_at ON public.quest_progress(updated_at);

-- Trigger to automatically update updated_at column
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

**Column Descriptions**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | `UUID` | PRIMARY KEY, FOREIGN KEY | References auth.users(id), CASCADE delete |
| `quest_id` | `TEXT` | PRIMARY KEY | Quest identifier from Tarkov.dev API |
| `completed` | `BOOLEAN` | NOT NULL, DEFAULT false | Whether quest is completed |
| `completed_at` | `TIMESTAMPTZ` | NULL | When quest was completed (NULL if incomplete) |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | Last modification timestamp (for sync) |

**Composite Primary Key**: `(user_id, quest_id)`
- Ensures one record per user per quest
- No duplicate entries possible
- Efficient lookups by user

**Cascading Delete**: `ON DELETE CASCADE`
- When user account deleted, all quest progress deleted automatically
- Maintains referential integrity

**Validation Rules**:
- `quest_id` must match a valid quest ID from Tarkov.dev API (enforced client-side)
- `completed_at` should be NULL when `completed` is false (enforced via trigger)
- `updated_at` automatically set on every UPDATE (via trigger)

---

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on quest_progress table
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own quest progress
CREATE POLICY "Users can view own quest progress"
  ON public.quest_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own quest progress
CREATE POLICY "Users can insert own quest progress"
  ON public.quest_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own quest progress
CREATE POLICY "Users can update own quest progress"
  ON public.quest_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own quest progress
CREATE POLICY "Users can delete own quest progress"
  ON public.quest_progress
  FOR DELETE
  USING (auth.uid() = user_id);
```

**RLS Enforcement**:
- All database queries automatically filtered by user_id
- Users cannot access other users' data even with direct SQL
- Supabase client uses authenticated user's JWT to enforce policies
- No application-level security checks needed

**Testing RLS**:
```sql
-- As User A (authenticated)
SELECT * FROM quest_progress; -- Returns only User A's rows

-- As User B (authenticated)
SELECT * FROM quest_progress WHERE user_id = 'user-a-uuid'; -- Returns empty set

-- As anonymous user
SELECT * FROM quest_progress; -- Returns empty set (no auth.uid())
```

---

## Client-Side Data Models

### Model: `User`

**Location**: `src/models/user.js`

```javascript
/**
 * User authentication state
 * Wraps Supabase Auth user object
 */
class User {
  constructor(supabaseUser) {
    this.id = supabaseUser.id;
    this.email = supabaseUser.email;
    this.createdAt = new Date(supabaseUser.created_at);
    this.metadata = supabaseUser.user_metadata || {};
  }
  
  get hasMigrated() {
    return this.metadata.migration_completed === true;
  }
  
  get isAuthenticated() {
    return this.id != null;
  }
}
```

**Properties**:
- `id` (string): UUID from Supabase Auth
- `email` (string): User email address
- `createdAt` (Date): Account creation timestamp
- `metadata` (object): Custom user data from user_metadata
- `hasMigrated` (boolean): Whether LocalStorage data has been migrated
- `isAuthenticated` (boolean): Whether user is logged in

**State Transitions**:
```
null → User (login/signup)
User → null (logout)
User.hasMigrated: false → true (after migration)
```

---

### Model: `QuestProgress`

**Location**: `src/models/quest.js` (extend existing Quest model)

```javascript
/**
 * Quest progress data
 * Represents completion status for a single quest
 */
class QuestProgress {
  constructor(data) {
    this.userId = data.user_id;
    this.questId = data.quest_id;
    this.completed = data.completed;
    this.completedAt = data.completed_at ? new Date(data.completed_at) : null;
    this.updatedAt = new Date(data.updated_at);
  }
  
  /**
   * Convert to database format
   */
  toDatabase() {
    return {
      user_id: this.userId,
      quest_id: this.questId,
      completed: this.completed,
      completed_at: this.completedAt?.toISOString() || null,
      updated_at: this.updatedAt.toISOString()
    };
  }
  
  /**
   * Convert to LocalStorage format (backward compatibility)
   */
  toLocalStorage() {
    return {
      id: this.questId,
      completed: this.completed,
      completedAt: this.completedAt?.toISOString() || null,
      updatedAt: this.updatedAt.toISOString()
    };
  }
  
  /**
   * Check if this progress is newer than another
   */
  isNewerThan(other) {
    return this.updatedAt > other.updatedAt;
  }
}
```

**Properties**:
- `userId` (string): UUID of user who owns this progress
- `questId` (string): Quest identifier from Tarkov.dev API
- `completed` (boolean): Whether quest is completed
- `completedAt` (Date|null): When quest was completed
- `updatedAt` (Date): Last modification timestamp

**Methods**:
- `toDatabase()`: Convert to Supabase format
- `toLocalStorage()`: Convert to LocalStorage format (for offline fallback)
- `isNewerThan(other)`: Compare timestamps for conflict resolution

---

### Model: `SyncQueueItem`

**Location**: `src/services/sync-service.js`

```javascript
/**
 * Sync queue item for offline support
 * Stored in LocalStorage, processed when online
 */
class SyncQueueItem {
  constructor(data) {
    this.id = data.id || crypto.randomUUID();
    this.action = data.action; // 'complete' or 'incomplete'
    this.questId = data.questId;
    this.timestamp = new Date(data.timestamp || Date.now());
    this.retries = data.retries || 0;
    this.status = data.status || 'pending'; // 'pending', 'synced', 'failed'
  }
  
  /**
   * Check if should retry
   */
  canRetry() {
    return this.retries < 3 && this.status !== 'synced';
  }
  
  /**
   * Calculate backoff delay
   */
  getBackoffDelay() {
    return Math.min(1000 * Math.pow(2, this.retries), 30000); // Max 30s
  }
  
  /**
   * Serialize for LocalStorage
   */
  toJSON() {
    return {
      id: this.id,
      action: this.action,
      questId: this.questId,
      timestamp: this.timestamp.toISOString(),
      retries: this.retries,
      status: this.status
    };
  }
}
```

**Properties**:
- `id` (string): Unique identifier (UUID)
- `action` (string): 'complete' or 'incomplete'
- `questId` (string): Quest being synced
- `timestamp` (Date): When action was performed
- `retries` (number): Number of sync attempts (max 3)
- `status` (string): 'pending', 'synced', or 'failed'

**State Transitions**:
```
pending → synced (successful sync)
pending → pending (retry after failure, retries < 3)
pending → failed (retry after failure, retries >= 3)
```

---

## LocalStorage Schema (Backward Compatibility)

**Key**: `tarkov-quest-progress`

**Format**:
```javascript
{
  "quest-id-1": {
    "completed": true,
    "completedAt": "2025-11-15T10:30:00Z",
    "updatedAt": "2025-11-15T10:30:00Z"
  },
  "quest-id-2": {
    "completed": false,
    "completedAt": null,
    "updatedAt": "2025-11-14T15:20:00Z"
  }
}
```

**Sync Queue Key**: `tarkov-sync-queue`

**Format**:
```javascript
[
  {
    "id": "uuid-1",
    "action": "complete",
    "questId": "quest-id-1",
    "timestamp": "2025-11-15T10:30:00Z",
    "retries": 0,
    "status": "pending"
  }
]
```

**Migration Flag Key**: `tarkov-migration-offered`

**Format**: `"true"` (string, to avoid showing migration prompt repeatedly)

---

## Data Flow Diagrams

### Read Flow (Loading Quest Progress)

```
User Loads App
      │
      ├─── Not Authenticated
      │         └──> Load from LocalStorage only
      │
      └─── Authenticated
            │
            ├──> Query Supabase (SELECT * FROM quest_progress WHERE user_id = ?)
            │         │
            │         ├─── Success
            │         │      └──> Merge with LocalStorage (LWW by timestamp)
            │         │
            │         └─── Failure (offline/error)
            │                └──> Fall back to LocalStorage only
            │
            └──> Update UI with merged progress
```

### Write Flow (Marking Quest Complete/Incomplete)

```
User Marks Quest
      │
      ├──> Update LocalStorage immediately (instant feedback)
      │         └──> UI updates
      │
      └─── Authenticated + Online
            │
            ├──> UPSERT to Supabase (INSERT ... ON CONFLICT UPDATE)
            │         │
            │         ├─── Success
            │         │      └──> Mark sync status as "synced"
            │         │
            │         └─── Failure
            │                ├──> Add to sync queue
            │                └──> Mark sync status as "pending"
            │
            └─── Not Authenticated OR Offline
                  └──> Add to sync queue (will process when online)
```

### Conflict Resolution (LWW)

```
Local: Quest A completed at 10:00
Remote: Quest A incomplete, updated at 10:05

Compare Timestamps:
  local.updatedAt (10:00) < remote.updatedAt (10:05)
  
Resolution:
  Use remote version (Quest A = incomplete)
  Update LocalStorage to match
```

---

## Validation Rules

### Quest Progress Validation

**Quest ID**:
- Must match a valid quest from Tarkov.dev API
- Format: String, typically alphanumeric with hyphens
- Example: `"5936d90786f7742b1420ba5b"`

**Completed Status**:
- Must be boolean (true/false)
- Cannot be null

**Timestamps**:
- Must be valid ISO 8601 timestamps
- `completed_at` can be null (when incomplete)
- `updated_at` must always be present

**User ID**:
- Must be valid UUID
- Must match authenticated user (enforced by RLS)

### Sync Queue Validation

**Action**:
- Must be 'complete' or 'incomplete'
- Case-sensitive

**Retries**:
- Must be integer >= 0
- Maximum of 3 retries before marking as failed

**Status**:
- Must be 'pending', 'synced', or 'failed'
- Case-sensitive

---

## State Management

### Application State

```javascript
const appState = {
  user: User | null,                    // Current authenticated user
  quests: Quest[],                      // Quest data from Tarkov.dev API
  progress: Map<questId, QuestProgress>, // Quest completion status
  syncQueue: SyncQueueItem[],           // Pending sync operations
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error'
};
```

### State Transitions

**Authentication State**:
```
null → User (login/signup)
User → null (logout)
```

**Sync Status**:
```
synced → syncing (user makes change)
syncing → synced (successful sync)
syncing → offline (network unavailable)
syncing → error (sync failed)
offline → syncing (connection restored)
error → syncing (user retries)
```

**Progress State**:
```
incomplete → complete (user marks done)
complete → incomplete (user marks undone)
```

---

## Performance Considerations

### Database Indexes

**Primary Queries**:
1. Load user's progress: `SELECT * FROM quest_progress WHERE user_id = ?`
   - Uses `PRIMARY KEY (user_id, quest_id)` - fast
   - Additional index: `idx_quest_progress_user_id`

2. Sync operations: `INSERT ... ON CONFLICT (user_id, quest_id) DO UPDATE`
   - Uses primary key - fast

3. Timestamp-based sync: `SELECT * WHERE user_id = ? AND updated_at > ?`
   - Uses `idx_quest_progress_updated_at`

**Expected Performance**:
- User has ~200 completed quests
- Query time: < 50ms (indexed lookup)
- Insert/Update time: < 100ms (single row operation)

### LocalStorage Performance

**Storage Size**:
- 200 quests × 150 bytes/quest = ~30 KB
- Well under 5 MB LocalStorage limit
- Sync queue: ~10 items × 200 bytes = ~2 KB

**Read Performance**:
- LocalStorage.getItem(): ~1ms
- JSON.parse(): ~5ms
- Total: < 10ms

**Write Performance**:
- JSON.stringify(): ~5ms
- LocalStorage.setItem(): ~2ms
- Total: < 10ms

---

## Migration Strategy

### Data Migration from LocalStorage to Supabase

**Trigger**: First authentication with existing LocalStorage data

**Process**:
1. Check `user_metadata.migration_completed`
2. If false, check LocalStorage for progress
3. If progress exists, show migration modal
4. If user accepts:
   ```sql
   -- Batch insert all completed quests
   INSERT INTO quest_progress (user_id, quest_id, completed, completed_at, updated_at)
   VALUES
     ($1, 'quest-1', true, '2025-11-15T10:00:00Z', '2025-11-15T10:00:00Z'),
     ($1, 'quest-2', true, '2025-11-15T11:00:00Z', '2025-11-15T11:00:00Z'),
     ...
   ON CONFLICT (user_id, quest_id) DO NOTHING;
   
   -- Mark migration complete
   UPDATE auth.users
   SET user_metadata = jsonb_set(user_metadata, '{migration_completed}', 'true')
   WHERE id = $1;
   ```

**Rollback**: Not needed (migration is non-destructive, LocalStorage preserved)

---

## Summary

**Database Tables**: 1 custom table (`quest_progress`) + Supabase-managed `auth.users`  
**Client Models**: 3 classes (`User`, `QuestProgress`, `SyncQueueItem`)  
**Storage**: Dual storage (Supabase primary, LocalStorage fallback)  
**Security**: Row Level Security enforces user data isolation  
**Performance**: Indexed queries < 100ms, LocalStorage ops < 10ms  
**Scalability**: Supports ~1000 users × 200 quests = 200k rows (well within free tier)

---

**Generated**: 2025-11-15  
**Author**: GitHub Copilot (via speckit.plan workflow)

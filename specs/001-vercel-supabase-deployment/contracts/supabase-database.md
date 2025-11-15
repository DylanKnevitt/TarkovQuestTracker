# Contract: Supabase Database Operations

**Feature**: 001-vercel-supabase-deployment  
**Date**: 2025-11-15  
**API**: Supabase PostgreSQL (via @supabase/supabase-js)

## Overview

This contract defines database operations for quest progress management using Supabase's PostgreSQL client. All operations are automatically filtered by Row Level Security (RLS) policies.

---

## Quest Progress Operations

### Load User Progress

**Description**: Retrieve all quest progress for the authenticated user.

**Client Code**:
```javascript
const { data, error } = await supabase
  .from('quest_progress')
  .select('*')
  .eq('user_id', userId);
```

**SQL Equivalent** (with RLS applied):
```sql
SELECT * FROM quest_progress
WHERE user_id = auth.uid();
```

**Request Parameters**: None (user_id from JWT)

**Response (Success)**:
```javascript
{
  data: [
    {
      user_id: "uuid",
      quest_id: "quest-123",
      completed: true,
      completed_at: "2025-11-15T10:00:00Z",
      updated_at: "2025-11-15T10:00:00Z"
    },
    {
      user_id: "uuid",
      quest_id: "quest-456",
      completed: false,
      completed_at: null,
      updated_at: "2025-11-14T15:00:00Z"
    }
  ],
  error: null
}
```

**Response (Success - Empty)**:
```javascript
{
  data: [],
  error: null
}
```

**Response (Error)**:
```javascript
{
  data: null,
  error: {
    message: "Error fetching data",
    code: "PGRST116",
    details: "...",
    hint: "..."
  }
}
```

**Performance**:
- Expected: < 100ms for 200 quests
- Uses index: `idx_quest_progress_user_id`
- RLS automatically filters by user

---

### Mark Quest Complete

**Description**: Set a quest as completed. Creates new record or updates existing.

**Client Code**:
```javascript
const { data, error } = await supabase
  .from('quest_progress')
  .upsert({
    user_id: userId,
    quest_id: questId,
    completed: true,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id,quest_id'
  })
  .select();
```

**SQL Equivalent**:
```sql
INSERT INTO quest_progress (user_id, quest_id, completed, completed_at, updated_at)
VALUES ($1, $2, true, now(), now())
ON CONFLICT (user_id, quest_id)
DO UPDATE SET
  completed = true,
  completed_at = now(),
  updated_at = now()
RETURNING *;
```

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | UUID | Yes | Authenticated user ID |
| `quest_id` | string | Yes | Quest identifier |
| `completed` | boolean | Yes | Always true for this operation |
| `completed_at` | timestamp | Yes | Current timestamp |
| `updated_at` | timestamp | Yes | Current timestamp (auto-updated by trigger) |

**Response (Success)**:
```javascript
{
  data: [
    {
      user_id: "uuid",
      quest_id: "quest-123",
      completed: true,
      completed_at: "2025-11-15T10:00:00Z",
      updated_at: "2025-11-15T10:00:00Z"
    }
  ],
  error: null
}
```

**Response (Error - RLS Violation)**:
```javascript
{
  data: null,
  error: {
    message: "new row violates row-level security policy",
    code: "42501"
  }
}
```

**Response (Error - Network)**:
```javascript
{
  data: null,
  error: {
    message: "FetchError: Failed to fetch",
    code: "PGRST301"
  }
}
```

---

### Mark Quest Incomplete

**Description**: Set a quest as incomplete (removes completion).

**Client Code**:
```javascript
const { data, error } = await supabase
  .from('quest_progress')
  .upsert({
    user_id: userId,
    quest_id: questId,
    completed: false,
    completed_at: null,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id,quest_id'
  })
  .select();
```

**SQL Equivalent**:
```sql
INSERT INTO quest_progress (user_id, quest_id, completed, completed_at, updated_at)
VALUES ($1, $2, false, NULL, now())
ON CONFLICT (user_id, quest_id)
DO UPDATE SET
  completed = false,
  completed_at = NULL,
  updated_at = now()
RETURNING *;
```

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | UUID | Yes | Authenticated user ID |
| `quest_id` | string | Yes | Quest identifier |
| `completed` | boolean | Yes | Always false for this operation |
| `completed_at` | timestamp | Yes | Always null for incomplete |
| `updated_at` | timestamp | Yes | Current timestamp |

**Response**: Same format as "Mark Quest Complete"

---

### Batch Upsert (Migration)

**Description**: Insert multiple quest progress records at once (used for migration).

**Client Code**:
```javascript
const { data, error } = await supabase
  .from('quest_progress')
  .upsert(
    questProgressArray.map(q => ({
      user_id: userId,
      quest_id: q.quest_id,
      completed: q.completed,
      completed_at: q.completed_at,
      updated_at: q.updated_at
    })),
    {
      onConflict: 'user_id,quest_id'
    }
  )
  .select();
```

**SQL Equivalent**:
```sql
INSERT INTO quest_progress (user_id, quest_id, completed, completed_at, updated_at)
VALUES
  ($1, 'quest-1', true, '2025-11-15T10:00:00Z', '2025-11-15T10:00:00Z'),
  ($1, 'quest-2', true, '2025-11-15T11:00:00Z', '2025-11-15T11:00:00Z'),
  -- ... more rows
ON CONFLICT (user_id, quest_id)
DO UPDATE SET
  completed = EXCLUDED.completed,
  completed_at = EXCLUDED.completed_at,
  updated_at = EXCLUDED.updated_at
RETURNING *;
```

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| Array of objects | QuestProgress[] | Yes | Quest progress records to insert |

**Response (Success)**:
```javascript
{
  data: [
    { user_id: "uuid", quest_id: "quest-1", ... },
    { user_id: "uuid", quest_id: "quest-2", ... },
    // ... all inserted/updated rows
  ],
  error: null
}
```

**Performance Notes**:
- Batch size: Recommend < 1000 rows per batch
- For migration: 200 quests = ~100ms
- Supabase has 50MB request size limit

---

### Get Progress Since Timestamp

**Description**: Retrieve quest progress updated after a specific time (for sync).

**Client Code**:
```javascript
const { data, error } = await supabase
  .from('quest_progress')
  .select('*')
  .eq('user_id', userId)
  .gt('updated_at', lastSyncTimestamp);
```

**SQL Equivalent**:
```sql
SELECT * FROM quest_progress
WHERE user_id = auth.uid()
  AND updated_at > $1
ORDER BY updated_at ASC;
```

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lastSyncTimestamp` | ISO 8601 string | Yes | Only return rows updated after this |

**Response (Success)**:
```javascript
{
  data: [
    {
      user_id: "uuid",
      quest_id: "quest-789",
      completed: true,
      completed_at: "2025-11-15T12:00:00Z",
      updated_at: "2025-11-15T12:00:00Z"
    }
  ],
  error: null
}
```

**Use Case**: Incremental sync to avoid fetching all progress every time

---

### Delete Quest Progress

**Description**: Remove a specific quest progress record (uncommon, mainly for cleanup).

**Client Code**:
```javascript
const { error } = await supabase
  .from('quest_progress')
  .delete()
  .eq('user_id', userId)
  .eq('quest_id', questId);
```

**SQL Equivalent**:
```sql
DELETE FROM quest_progress
WHERE user_id = auth.uid()
  AND quest_id = $1;
```

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `quest_id` | string | Yes | Quest to delete |

**Response (Success)**:
```javascript
{
  error: null
}
```

**Use Case**: Rarely needed (marking incomplete is preferred)

---

### Delete All User Progress

**Description**: Delete all quest progress for the authenticated user (account cleanup).

**Client Code**:
```javascript
const { error } = await supabase
  .from('quest_progress')
  .delete()
  .eq('user_id', userId);
```

**SQL Equivalent**:
```sql
DELETE FROM quest_progress
WHERE user_id = auth.uid();
```

**Response (Success)**:
```javascript
{
  error: null
}
```

**Use Case**: User wants to reset all progress or delete account

---

## Data Flow Patterns

### Initial Load Pattern

```
App Starts → User Authenticated
      │
      ▼
Load All Quest Progress
      │
const { data, error } = await supabase
  .from('quest_progress')
  .select('*');
      │
      ├─── Success
      │      └──> Convert to Map<questId, progress>
      │
      └─── Error
             └──> Fall back to LocalStorage
```

### Single Update Pattern

```
User Marks Quest Complete
      │
      ▼
Update LocalStorage (instant feedback)
      │
      ▼
Upsert to Supabase
      │
const { error } = await supabase
  .from('quest_progress')
  .upsert({
    user_id: userId,
    quest_id: questId,
    completed: true,
    completed_at: now(),
    updated_at: now()
  }, { onConflict: 'user_id,quest_id' });
      │
      ├─── Success → Mark synced
      │
      └─── Error → Add to sync queue
```

### Batch Migration Pattern

```
User Accepts Migration
      │
      ▼
Read All from LocalStorage
      │
const progress = JSON.parse(localStorage.getItem('tarkov-quest-progress'));
      │
      ▼
Convert to Array of Records
      │
const records = Object.entries(progress).map(([questId, data]) => ({
  user_id: userId,
  quest_id: questId,
  completed: data.completed,
  completed_at: data.completedAt,
  updated_at: data.updatedAt
}));
      │
      ▼
Batch Upsert to Supabase
      │
const { error } = await supabase
  .from('quest_progress')
  .upsert(records, { onConflict: 'user_id,quest_id' });
      │
      ├─── Success → Mark migration complete
      │
      └─── Error → Show retry option
```

### Incremental Sync Pattern

```
Connection Restored
      │
      ▼
Get Last Sync Timestamp from LocalStorage
      │
const lastSync = localStorage.getItem('last-sync-timestamp');
      │
      ▼
Query Changes Since Last Sync
      │
const { data } = await supabase
  .from('quest_progress')
  .select('*')
  .gt('updated_at', lastSync);
      │
      ▼
Merge with LocalStorage (LWW by timestamp)
      │
      ▼
Update Last Sync Timestamp
      │
localStorage.setItem('last-sync-timestamp', new Date().toISOString());
```

---

## Error Handling

### Common Errors

**RLS Policy Violation**:
```javascript
{
  error: {
    message: "new row violates row-level security policy",
    code: "42501"
  }
}
```
**Cause**: Trying to insert/update with wrong user_id  
**Handling**: This shouldn't happen if user_id comes from auth.uid()

**Network Error**:
```javascript
{
  error: {
    message: "FetchError: Failed to fetch",
    code: "PGRST301"
  }
}
```
**Cause**: No internet connection or Supabase unavailable  
**Handling**: Fall back to LocalStorage, add to sync queue

**Invalid JSON**:
```javascript
{
  error: {
    message: "invalid input syntax for type json",
    code: "22P02"
  }
}
```
**Cause**: Malformed data sent to database  
**Handling**: Validate data before sending

**Connection Timeout**:
```javascript
{
  error: {
    message: "Failed to fetch",
    code: "PGRST301"
  }
}
```
**Cause**: Request took too long (> 30s)  
**Handling**: Retry with exponential backoff

---

## Row Level Security (RLS) Enforcement

### How RLS Works

**Database Level**:
```sql
-- Policy automatically filters queries
SELECT * FROM quest_progress; -- Only returns rows where user_id = auth.uid()
```

**Client Level**:
```javascript
// No manual filtering needed
const { data } = await supabase.from('quest_progress').select('*');
// Supabase automatically includes JWT in request
// PostgreSQL reads JWT and applies RLS policies
// Only user's own rows returned
```

### RLS Testing

**Test 1: User can only see own data**
```javascript
// User A authenticated
const { data } = await supabase.from('quest_progress').select('*');
// data only contains rows where user_id = User A's UUID
```

**Test 2: User cannot insert for another user**
```javascript
// User A tries to insert for User B
const { error } = await supabase
  .from('quest_progress')
  .insert({
    user_id: 'user-b-uuid', // Different user
    quest_id: 'quest-123',
    completed: true
  });
// error.code === "42501" (RLS violation)
```

**Test 3: Unauthenticated user has no access**
```javascript
// No auth session
const { data, error } = await supabase.from('quest_progress').select('*');
// data === []
// No error, but no results (RLS filtered everything)
```

---

## Performance Optimization

### Indexing Strategy

**Primary Key**: `(user_id, quest_id)`
- Covers most queries (load by user, upsert by user + quest)
- Composite index serves multiple purposes

**Additional Index**: `idx_quest_progress_user_id`
```sql
CREATE INDEX idx_quest_progress_user_id ON quest_progress(user_id);
```
- Faster user-specific queries
- Used for: `SELECT * WHERE user_id = ?`

**Timestamp Index**: `idx_quest_progress_updated_at`
```sql
CREATE INDEX idx_quest_progress_updated_at ON quest_progress(updated_at);
```
- Faster incremental sync queries
- Used for: `SELECT * WHERE updated_at > ?`

### Query Performance

| Operation | Expected Time | Index Used |
|-----------|---------------|------------|
| Load all progress (200 quests) | < 100ms | Primary key |
| Single upsert | < 50ms | Primary key |
| Batch upsert (200 quests) | < 200ms | Primary key |
| Incremental sync (10 changes) | < 50ms | Timestamp index |

### Caching Strategy

**Client-Side Cache** (LocalStorage):
```javascript
// Cache all progress after load
localStorage.setItem('tarkov-quest-progress-cache', JSON.stringify(data));

// Use cache for instant UI updates
const cached = JSON.parse(localStorage.getItem('tarkov-quest-progress-cache'));

// Invalidate cache on sync
```

**Benefits**:
- Instant UI updates (no network latency)
- Offline support
- Reduces database queries

---

## Testing Checklist

### Unit Tests (Mock Supabase Client)

- [ ] Load progress returns correct data
- [ ] Load progress handles empty result
- [ ] Mark quest complete upserts correctly
- [ ] Mark quest incomplete updates correctly
- [ ] Batch upsert handles multiple quests
- [ ] Incremental sync filters by timestamp
- [ ] Delete operations work correctly
- [ ] Error responses handled gracefully

### Integration Tests (Real Supabase)

- [ ] Load progress from database
- [ ] Upsert creates new record
- [ ] Upsert updates existing record
- [ ] Batch upsert handles 200 quests
- [ ] RLS prevents cross-user access
- [ ] Timestamps auto-update on change
- [ ] Indexes speed up queries

### Performance Tests

- [ ] Load 200 quests < 100ms
- [ ] Single upsert < 50ms
- [ ] Batch upsert 200 quests < 200ms
- [ ] Incremental sync < 50ms

---

## Implementation Example

### Service Wrapper

```javascript
// src/services/storage-service.js
import { supabase } from '../api/supabase-client.js';

export class StorageService {
  constructor(userId) {
    this.userId = userId;
  }
  
  async loadProgress() {
    const { data, error } = await supabase
      .from('quest_progress')
      .select('*');
    
    if (error) {
      console.error('Failed to load progress:', error);
      return this.loadFromLocalStorage();
    }
    
    return this.convertToMap(data);
  }
  
  async markComplete(questId) {
    // Update LocalStorage first (instant feedback)
    this.updateLocalStorage(questId, true);
    
    // Then sync to Supabase
    const { error } = await supabase
      .from('quest_progress')
      .upsert({
        user_id: this.userId,
        quest_id: questId,
        completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,quest_id'
      });
    
    if (error) {
      console.error('Sync failed:', error);
      this.addToSyncQueue({ questId, action: 'complete' });
    }
  }
  
  async batchMigrate(progressData) {
    const records = Object.entries(progressData).map(([questId, data]) => ({
      user_id: this.userId,
      quest_id: questId,
      completed: data.completed,
      completed_at: data.completedAt,
      updated_at: data.updatedAt || new Date().toISOString()
    }));
    
    const { error } = await supabase
      .from('quest_progress')
      .upsert(records, {
        onConflict: 'user_id,quest_id'
      });
    
    if (error) {
      throw new Error(`Migration failed: ${error.message}`);
    }
  }
  
  // Helper methods
  convertToMap(data) { /* ... */ }
  loadFromLocalStorage() { /* ... */ }
  updateLocalStorage(questId, completed) { /* ... */ }
  addToSyncQueue(item) { /* ... */ }
}
```

---

## References

- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [Supabase JavaScript Client - Database](https://supabase.com/docs/reference/javascript/select)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Performance Tips](https://supabase.com/docs/guides/database/postgres/performance)

---

**Generated**: 2025-11-15  
**Author**: GitHub Copilot (via speckit.plan workflow)

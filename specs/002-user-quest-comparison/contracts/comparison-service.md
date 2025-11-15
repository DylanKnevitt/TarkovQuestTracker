# ComparisonService API Contract

**Feature**: User Quest Progress Comparison  
**Type**: Client-side service (JavaScript class)  
**Purpose**: Fetch and manage user profile data and quest progress for comparison feature

---

## Class: ComparisonService

### Constructor

```javascript
constructor()
```

**Description**: Initializes the comparison service with Supabase client and empty caches.

**Pre-conditions**: 
- Supabase client must be initialized
- User must be authenticated

**Post-conditions**:
- Service ready to fetch user data
- Caches initialized as empty Maps

---

### Method: fetchAllUserProfiles

```javascript
async fetchAllUserProfiles(): Promise<{data: UserProfile[], error: Error|null}>
```

**Description**: Fetches all users who have quest progress, with aggregated completion statistics.

**Parameters**: None

**Returns**:
- `data`: Array of UserProfile objects, sorted by completion percentage descending
- `error`: Error object if query fails, null on success

**Example Response**:
```javascript
{
  data: [
    {
      id: "uuid-1",
      email: "player1@example.com",
      totalQuests: 150,
      completedCount: 75,
      completionPercentage: 50.0
    },
    {
      id: "uuid-2",
      email: "player2@example.com",
      totalQuests: 200,
      completedCount: 40,
      completionPercentage: 20.0
    }
  ],
  error: null
}
```

**Error Cases**:
- Supabase connection failure → Returns {data: null, error: Error('Connection failed')}
- Unauthenticated user → Returns {data: null, error: Error('Not authenticated')}
- Empty result (no users) → Returns {data: [], error: null}

**Performance**: 
- Expected response time: < 500ms for 100 users
- Caches result in memory for session duration

**Dependencies**:
- Supabase client
- auth.users table (read access)
- quest_progress table (read access)

---

### Method: fetchUserProgress

```javascript
async fetchUserProgress(userId: string): Promise<{data: UserQuestProgress, error: Error|null}>
```

**Description**: Fetches all quest progress records for a specific user.

**Parameters**:
- `userId` (string, required): UUID of the user whose progress to fetch

**Returns**:
- `data`: UserQuestProgress object containing quest completion map
- `error`: Error object if query fails, null on success

**Example Response**:
```javascript
{
  data: {
    userId: "uuid-1",
    questMap: Map {
      "5936d90786f7742b1420ba5b" => { completed: true, completedAt: "2025-11-10T10:00:00Z" },
      "59674cd986f7744ab26e32f2" => { completed: false, completedAt: null },
      // ... ~200 quests
    }
  },
  error: null
}
```

**Error Cases**:
- Invalid userId → Returns {data: null, error: Error('Invalid user ID')}
- User not found → Returns {data: UserQuestProgress(empty), error: null}
- Supabase failure → Returns {data: null, error: Error('Query failed')}

**Caching**:
- Results cached in memory after first fetch
- Cache key: userId
- Cache invalidation: On explicit refresh or page reload

**Performance**:
- Expected response time: < 300ms for 200 quests
- Data size: ~10 KB per user

---

### Method: clearCache

```javascript
clearCache(): void
```

**Description**: Clears all cached user profiles and progress data. Used for manual refresh.

**Parameters**: None

**Returns**: void

**Side Effects**:
- Empties userProfilesCache Map
- Empties userProgressCache Map
- Next fetchAllUserProfiles() will query Supabase again

**Use Cases**:
- User clicks "Refresh" button
- After updating own quest progress
- Before re-entering comparison view

---

## Internal Methods (Not exposed publicly)

### _aggregateUserStats

```javascript
_aggregateUserStats(rawData: Array): Array<UserProfile>
```

**Description**: Transforms raw Supabase query results into UserProfile objects with calculated stats.

**Internal use only** - Called by fetchAllUserProfiles()

---

## Data Structures

### UserProfile (Input/Output)

```typescript
interface UserProfile {
  id: string;                    // UUID from auth.users
  email: string;                 // User email address
  totalQuests: number;           // Count of quest_progress rows
  completedCount: number;        // Count where completed=true
  completionPercentage: number;  // (completedCount / totalQuests) * 100, rounded to 1 decimal
}
```

### UserQuestProgress (Output)

```typescript
interface UserQuestProgress {
  userId: string;
  questMap: Map<string, {       // quest_id -> progress details
    completed: boolean;
    completedAt: string|null;   // ISO 8601 timestamp
  }>;
}
```

---

## Usage Example

```javascript
import { ComparisonService } from './services/comparison-service.js';

const comparisonService = new ComparisonService();

// Fetch all users
const { data: users, error } = await comparisonService.fetchAllUserProfiles();
if (error) {
  console.error('Failed to load users:', error);
  return;
}

// Display user list
users.forEach(user => {
  console.log(`${user.email}: ${user.completionPercentage}% complete`);
});

// User selects someone from the list
const selectedUserId = users[0].id;
const { data: progress } = await comparisonService.fetchUserProgress(selectedUserId);

// Check if quest is completed
const questCompleted = progress.questMap.get('5936d90786f7742b1420ba5b')?.completed;
console.log(`Quest completed: ${questCompleted}`);
```

---

## Testing Checklist

- [ ] fetchAllUserProfiles returns empty array when no users exist
- [ ] fetchAllUserProfiles sorts users by completion percentage descending
- [ ] fetchUserProgress handles invalid userId gracefully
- [ ] fetchUserProgress caches results on first call
- [ ] clearCache removes all cached data
- [ ] Service handles Supabase connection failures
- [ ] Service handles unauthenticated state
- [ ] Performance: 100 users load in < 500ms
- [ ] Performance: Single user progress loads in < 300ms

---

## Dependencies

**External**:
- Supabase JavaScript Client v2.38+
- Browser environment (native Map, Set, Promise)

**Internal**:
- AuthService (for getCurrentUser)
- Supabase client singleton (from api/supabase-client.js)

**Database Access**:
- Read: auth.users (Supabase managed)
- Read: quest_progress (with existing RLS policies)

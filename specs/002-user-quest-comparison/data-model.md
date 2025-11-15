# Data Model: User Quest Progress Comparison

**Feature**: [spec.md](./spec.md)  
**Status**: Complete  
**Date**: 2025-11-15

## Overview

This feature reuses existing database tables (`auth.users`, `quest_progress`) and introduces client-side data models for aggregating and filtering user progress. No database schema changes required.

---

## Database Schema (Existing - No Changes)

### Table: `auth.users` (Managed by Supabase Auth)
**Purpose**: User authentication and identity

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | User unique identifier |
| email | TEXT | UNIQUE, NOT NULL | User email address |
| created_at | TIMESTAMPTZ | NOT NULL | Account creation timestamp |
| user_metadata | JSONB | | Optional user metadata |

**Access Pattern**:
- Read-only for comparison feature
- Queried with LEFT JOIN to quest_progress for user list

---

### Table: `quest_progress` (Existing from Feature 001)
**Purpose**: Track individual quest completion per user

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Progress record ID |
| user_id | UUID | FOREIGN KEY (auth.users), NOT NULL | User who completed quest |
| quest_id | TEXT | NOT NULL | Tarkov API quest ID |
| completed | BOOLEAN | NOT NULL, DEFAULT false | Completion status |
| completed_at | TIMESTAMPTZ | | When quest was completed |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

**Constraints**:
- UNIQUE(user_id, quest_id) - One record per user per quest

**RLS Policies** (Existing - No Changes):
- Users can SELECT their own rows (auth.uid() = user_id)
- Users can INSERT their own rows
- Users can UPDATE their own rows
- Users can DELETE their own rows

**New Query Pattern for Comparison**:
```sql
-- User list with completion stats
SELECT 
  u.id,
  u.email,
  COUNT(qp.id) as total_quests,
  SUM(CASE WHEN qp.completed THEN 1 ELSE 0 END) as completed_count
FROM auth.users u
LEFT JOIN quest_progress qp ON qp.user_id = u.id
GROUP BY u.id, u.email
HAVING COUNT(qp.id) > 0;

-- Individual user progress (for selected users)
SELECT quest_id, completed
FROM quest_progress
WHERE user_id = $1;
```

---

## Client-Side Data Models

### UserProfile
**Purpose**: Aggregated view of a user's quest progress for display in user list

```javascript
class UserProfile {
  constructor(data) {
    this.id = data.id;                          // UUID from auth.users
    this.email = data.email;                    // Email from auth.users
    this.totalQuests = data.total_quests || 0;  // Count of quest_progress rows
    this.completedCount = data.completed_count || 0; // Count where completed=true
    this.completionPercentage = this.totalQuests > 0 
      ? Math.round((this.completedCount / this.totalQuests) * 100) 
      : 0;
  }
  
  /**
   * Get display name (email prefix or full email)
   * @returns {string}
   */
  getDisplayName() {
    return this.email ? this.email.split('@')[0] : 'Unknown User';
  }
  
  /**
   * Get initials for badge display (first 2 letters of email prefix)
   * @returns {string}
   */
  getInitials() {
    const name = this.getDisplayName();
    return name.substring(0, 2).toUpperCase();
  }
  
  /**
   * Serialize for storage or transmission
   * @returns {object}
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
}
```

**Lifecycle**:
- Created when fetching user list from Supabase
- Cached in ComparisonService during session
- Cleared on page refresh or explicit cache invalidation

---

### UserQuestProgress
**Purpose**: Map of quest IDs to completion status for a specific user

```javascript
class UserQuestProgress {
  constructor(userId, progressData) {
    this.userId = userId;
    this.questMap = new Map(); // quest_id -> { completed, completedAt }
    
    // Initialize from Supabase query result
    if (progressData && Array.isArray(progressData)) {
      progressData.forEach(item => {
        this.questMap.set(item.quest_id, {
          completed: item.completed,
          completedAt: item.completed_at
        });
      });
    }
  }
  
  /**
   * Check if user has completed a specific quest
   * @param {string} questId - Quest ID to check
   * @returns {boolean}
   */
  isQuestCompleted(questId) {
    const progress = this.questMap.get(questId);
    return progress ? progress.completed : false;
  }
  
  /**
   * Get all completed quest IDs as Set for efficient intersection
   * @returns {Set<string>}
   */
  getCompletedQuestIds() {
    const completed = [];
    this.questMap.forEach((progress, questId) => {
      if (progress.completed) {
        completed.push(questId);
      }
    });
    return new Set(completed);
  }
  
  /**
   * Get all incomplete quest IDs
   * @returns {Set<string>}
   */
  getIncompleteQuestIds() {
    const incomplete = [];
    this.questMap.forEach((progress, questId) => {
      if (!progress.completed) {
        incomplete.push(questId);
      }
    });
    return new Set(incomplete);
  }
}
```

**Lifecycle**:
- Created on-demand when user is selected
- Cached in ComparisonService.userProgressCache (Map<userId, UserQuestProgress>)
- Cleared when user is deselected or cache is invalidated

---

### ComparisonState
**Purpose**: Manages selected users and filtered quest results

```javascript
class ComparisonState {
  constructor() {
    this.selectedUserIds = new Set();           // Set of selected user IDs
    this.userProfiles = new Map();              // userId -> UserProfile
    this.userProgressCache = new Map();         // userId -> UserQuestProgress
    this.filteredQuests = [];                   // Quests incomplete for all selected users
  }
  
  /**
   * Add a user to the selection
   * @param {string} userId - User ID to select
   */
  selectUser(userId) {
    if (this.selectedUserIds.size >= 10) {
      throw new Error('Maximum 10 users can be selected');
    }
    this.selectedUserIds.add(userId);
  }
  
  /**
   * Remove a user from the selection
   * @param {string} userId - User ID to deselect
   */
  deselectUser(userId) {
    this.selectedUserIds.delete(userId);
  }
  
  /**
   * Clear all selections
   */
  clearSelection() {
    this.selectedUserIds.clear();
    this.filteredQuests = [];
  }
  
  /**
   * Check if a user is selected
   * @param {string} userId
   * @returns {boolean}
   */
  isUserSelected(userId) {
    return this.selectedUserIds.has(userId);
  }
  
  /**
   * Get selected user profiles
   * @returns {Array<UserProfile>}
   */
  getSelectedUserProfiles() {
    return Array.from(this.selectedUserIds).map(userId => 
      this.userProfiles.get(userId)
    ).filter(Boolean);
  }
  
  /**
   * Calculate intersection of incomplete quests for selected users
   * @param {Array<Quest>} allQuests - All available quests from QuestManager
   * @returns {Array<Quest>} Quests incomplete for ALL selected users
   */
  calculateFilteredQuests(allQuests) {
    if (this.selectedUserIds.size === 0) {
      this.filteredQuests = [];
      return this.filteredQuests;
    }
    
    // Get completed quest IDs for each selected user
    const userCompletedSets = Array.from(this.selectedUserIds).map(userId => {
      const progress = this.userProgressCache.get(userId);
      return progress ? progress.getCompletedQuestIds() : new Set();
    });
    
    // Filter to quests NOT completed by ANY selected user (all have incomplete)
    this.filteredQuests = allQuests.filter(quest => {
      return userCompletedSets.every(completedSet => !completedSet.has(quest.id));
    });
    
    return this.filteredQuests;
  }
  
  /**
   * Get quest completion status for each selected user
   * @param {string} questId
   * @returns {Map<userId, boolean>} Map of userId to completion status
   */
  getQuestCompletionByUser(questId) {
    const completionMap = new Map();
    this.selectedUserIds.forEach(userId => {
      const progress = this.userProgressCache.get(userId);
      completionMap.set(userId, progress ? progress.isQuestCompleted(questId) : false);
    });
    return completionMap;
  }
}
```

**Lifecycle**:
- Created when UserComparison component initializes
- Persists for session duration (survives tab navigation)
- Cleared on page refresh

---

## Data Flow

### 1. Initial Load (User List)
```
User clicks "Comparison" tab
  → ComparisonService.fetchAllUserProfiles()
  → Supabase query: auth.users LEFT JOIN quest_progress
  → Map results to UserProfile[] 
  → Store in ComparisonState.userProfiles
  → UserList component renders user list
```

### 2. User Selection
```
User clicks on a user in the list
  → UserList emits onSelectionChange event
  → ComparisonState.selectUser(userId)
  → ComparisonService.fetchUserProgress(userId) [if not cached]
  → Create UserQuestProgress, store in userProgressCache
  → ComparisonState.calculateFilteredQuests(allQuests)
  → ComparisonQuestList renders filtered quests
```

### 3. Multi-User Selection
```
User clicks additional users (up to 10)
  → Repeat Step 2 for each user
  → ComparisonState.calculateFilteredQuests() recalculates intersection
  → Filtered quest list updates (narrows down to common incomplete)
```

### 4. Quest Display with Indicators
```
For each quest in filtered list:
  → ComparisonState.getQuestCompletionByUser(questId)
  → Returns Map<userId, completed:boolean>
  → ComparisonQuestList renders user badges
  → Badges show: [initials + checkmark/X]
```

---

## Performance Characteristics

### Query Complexity
- **User list**: O(U + P) where U=users, P=progress_rows → Single query with GROUP BY
- **User progress**: O(Q) where Q=quests_per_user → ~200 rows per user
- **Intersection**: O(S × Q) where S=selected_users, Q=total_quests → Client-side filtering

### Memory Footprint
- **UserProfile**: ~100 bytes × 100 users = 10 KB
- **UserQuestProgress**: ~50 bytes × 200 quests × 10 users = 100 KB (max)
- **Comparison State**: ~110 KB total (acceptable for browser)

### Cache Strategy
- **User list**: Fetch once per session, cache in memory
- **User progress**: Fetch on first selection, cache in memory, invalidate on explicit refresh
- **No LocalStorage**: Avoid persistent state, keep sessions isolated

---

## Validation & Constraints

### Business Rules
1. **Selection Limit**: Maximum 10 users selected simultaneously (enforced in ComparisonState.selectUser)
2. **Empty Results**: Display message when no common quests exist
3. **User Visibility**: Only authenticated users with quest progress are visible
4. **Privacy**: Quest completion status is public within authenticated users (no PII exposed)

### Data Integrity
1. **Null Safety**: Handle missing users (deleted accounts) gracefully
2. **Empty Progress**: Users with zero quest progress excluded from list
3. **Stale Data**: Refresh button to reload user list and progress

---

## Migration Notes

**No database migrations required** - This feature uses existing tables without schema changes.

---

## Future Enhancements (Post-MVP)

### Phase 6+ (Not in current scope)
1. **User Preferences Table**: Add `user_visibility`, `display_name`, `profile_picture`
2. **Friends/Teams Table**: `user_friends` for friend-only visibility
3. **Materialized View**: Pre-aggregate user stats for faster user list load
4. **WebSocket Updates**: Real-time progress updates when users complete quests

---

## Conclusion

**Status**: ✅ Data model complete  
**Database Changes**: None required  
**New Tables**: None  
**New Indexes**: None recommended (existing indexes sufficient)  
**Ready for**: Contract generation (Phase 1 continues)

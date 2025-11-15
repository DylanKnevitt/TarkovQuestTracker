# Research: User Quest Progress Comparison

**Feature**: [spec.md](./spec.md)  
**Status**: Complete  
**Date**: 2025-11-15

## Phase 0: Technical Research & Unknowns Resolution

### Research Questions & Decisions

#### Q1: How to efficiently query user profiles with completion statistics from Supabase?

**Decision**: Use Supabase aggregation query with PostgreSQL GROUP BY

**Rationale**:
- Supabase supports complex SQL queries including aggregates
- Single query can fetch all users with their completion stats
- More efficient than fetching all quest_progress rows and aggregating client-side

**Query Pattern**:
```sql
SELECT 
  u.id,
  u.email,
  COUNT(qp.id) as total_quests,
  SUM(CASE WHEN qp.completed THEN 1 ELSE 0 END) as completed_count,
  ROUND(SUM(CASE WHEN qp.completed THEN 1 ELSE 0 END)::numeric / COUNT(qp.id) * 100, 1) as completion_percentage
FROM auth.users u
LEFT JOIN quest_progress qp ON qp.user_id = u.id
GROUP BY u.id, u.email
HAVING COUNT(qp.id) > 0
ORDER BY completion_percentage DESC;
```

**Alternatives Considered**:
- Fetch all quest_progress rows, aggregate client-side → Rejected: Transfers too much data, slow with 100+ users
- Create materialized view in Supabase → Rejected: Requires database permissions, adds complexity

---

#### Q2: How to calculate quest intersection for multiple users efficiently?

**Decision**: Client-side Set intersection using JavaScript Set operations

**Rationale**:
- Quest data already loaded in browser (QuestManager.quests ~200 quests)
- User progress fetched once per user (max 10 users × 200 quests = 2000 records)
- Set intersection is O(n×m) where n=users, m=quests - fast enough for our scale
- Allows real-time filtering without server round-trips

**Algorithm**:
```javascript
function calculateCommonIncompleteQuests(selectedUserIds, allQuests) {
  if (selectedUserIds.length === 0) return [];
  
  // Fetch each user's completed quest IDs
  const userCompletedSets = selectedUserIds.map(userId => 
    new Set(getCompletedQuestIds(userId))
  );
  
  // Filter to quests incomplete for ALL selected users
  return allQuests.filter(quest => 
    userCompletedSets.every(completedSet => !completedSet.has(quest.id))
  );
}
```

**Alternatives Considered**:
- Server-side intersection via Supabase RPC function → Rejected: Requires backend logic, harder to debug, no significant performance gain
- Database query with multiple JOINs → Rejected: Complex SQL, harder to maintain, doesn't support dynamic user selection

---

#### Q3: How to handle privacy and visibility of user data?

**Decision**: Default visibility - all authenticated users visible to each other

**Rationale**:
- Tarkov Quest Tracker is a collaborative tool - users expect to see others
- Simplifies MVP - no privacy settings UI needed for P1/P2
- Supabase RLS already enforces user_id isolation for quest_progress table
- Users can only see completion status (boolean), not sensitive data

**Privacy Model**:
- User list shows: email (or display name), completion percentage
- Quest progress shows: completed/incomplete per quest (no timestamps, no detailed history)
- Users cannot modify other users' data (enforced by RLS)

**Future Enhancement (P3+)**:
- Add "visibility" column to users table (public/friends-only/private)
- Add friends/team management
- Add opt-in display names instead of email

---

#### Q4: How to maintain performance with 100+ users in the system?

**Decision**: Lazy loading + client-side filtering + selection limit

**Implementation**:
- Initial load: Fetch all user profiles (100 users × 50 bytes = 5 KB - acceptable)
- Search/filter: Client-side string matching on cached user list
- Quest progress: Fetch on-demand when user is selected (not preloaded)
- Hard limit: Max 10 users selected simultaneously (enforced in UI)

**Performance Benchmarks** (estimated):
- 100 users list load: ~500ms (single Supabase query)
- Select 1 user, fetch progress: ~200ms (200 rows × 50 bytes = 10 KB)
- Calculate intersection for 3 users: ~50ms (600 rows client-side filtering)
- Calculate intersection for 10 users: ~150ms (2000 rows client-side filtering)

**Alternatives Considered**:
- Pagination (10 users per page) → Rejected: Users want to see all teammates at once, search across all
- Virtual scrolling → Rejected: Overkill for 100 users, adds complexity
- Server-side filtering → Rejected: No performance gain, adds latency

---

#### Q5: Should user selections persist across sessions?

**Decision**: Session-only persistence (no localStorage)

**Rationale**:
- Comparison view is transient - users select different combinations each time
- Persistent selections could be confusing (outdated when squad members change)
- Simpler implementation - no storage, no cleanup logic

**Behavior**:
- Selections persist during session (navigating to other tabs and back)
- Selections clear on page refresh
- URL sharing (P3) provides explicit persistence mechanism

---

#### Q6: How to display completion indicators for each user?

**Decision**: Badge-style indicators with user initials and checkmark/X

**Rationale**:
- Compact visual representation (2-3 letters + icon)
- Scales well for 2-10 users without cluttering UI
- Color-coded: green checkmark (complete), gray X (incomplete)
- Tooltip on hover shows full email

**Layout**:
```
Quest Name                    [JD✓] [SK✗] [AM✗]
  ↑ Quest title              ↑ User badges: J.Doe (complete), S.Kim (incomplete), A.Martinez (incomplete)
```

**Alternatives Considered**:
- Progress bar (e.g., "2/3 completed") → Better for summary, but doesn't show WHICH users
- Checkboxes per user → Too much visual clutter for 10 users
- Expandable details → Requires extra clicks, hides information

**Implementation**: Use combination - badges for quick view, "2/3" summary in header, tooltip for details

---

## Dependencies & Prerequisites

### Existing Infrastructure (Feature 001)
- ✅ Supabase authentication (AuthService)
- ✅ quest_progress table with RLS policies
- ✅ auth.users table (managed by Supabase Auth)
- ✅ QuestManager with quest data
- ✅ Component-based architecture (tabs, modular views)

### New Requirements
- Access to auth.users table (read-only) - **Already available via Supabase**
- Aggregation queries on quest_progress - **Supabase supports this**
- No new database tables needed
- No new RLS policies needed
- No backend API needed

---

## Technology Stack Recommendations

### No New Technologies Needed
All requirements met by existing stack:
- Supabase JS Client v2.38+ → User queries, quest progress fetching
- Vanilla JavaScript ES6+ → Set operations, intersection logic, DOM manipulation
- Existing CSS patterns → Extend with user-comparison.css
- Existing component architecture → UserComparison, UserList, ComparisonQuestList

### Best Practices for Implementation

**1. Data Fetching Strategy**:
```javascript
// ComparisonService pattern
class ComparisonService {
  async fetchAllUserProfiles() {
    // Single query with aggregation
    const { data, error } = await supabase
      .from('quest_progress')
      .select('user_id, completed, auth.users(email)')
      .then(aggregateClientSide); // Group by user_id
    return data;
  }
  
  async fetchUserProgress(userId) {
    // Fetch on-demand when user selected
    const { data } = await supabase
      .from('quest_progress')
      .select('quest_id, completed')
      .eq('user_id', userId);
    return data;
  }
}
```

**2. Intersection Calculation Pattern**:
```javascript
// Pure function, testable
function filterQuestsForSelectedUsers(allQuests, selectedUserIds, userProgressMap) {
  if (selectedUserIds.length === 0) return [];
  
  return allQuests.filter(quest => {
    return selectedUserIds.every(userId => {
      const progress = userProgressMap.get(userId);
      return !progress || !progress.has(quest.id); // Incomplete or no data
    });
  });
}
```

**3. Component Communication Pattern**:
```javascript
// Event-driven updates (match existing architecture)
class UserComparison {
  constructor() {
    this.userList = new UserList('user-list-container');
    this.questList = new ComparisonQuestList('comparison-quest-list');
    
    this.userList.onSelectionChange = (selectedUserIds) => {
      this.updateQuestList(selectedUserIds);
    };
  }
}
```

---

## Risk Mitigation

### Performance Risks
**Risk**: Intersection calculation slow with 10 users × 200 quests  
**Mitigation**: 
- Enforce 10-user limit
- Use Set operations (O(n) lookups)
- Cache user progress after first fetch
- Debounce selection changes (300ms delay)

**Risk**: User list load slow with 100+ users  
**Mitigation**:
- Single aggregated query (not N+1)
- Show loading spinner
- Cache user list for session duration

### Data Consistency Risks
**Risk**: User completes quest while viewing comparison  
**Mitigation**:
- Display "Refresh to update" button when returning to tab
- Clear cache on explicit refresh
- Future: WebSocket updates (P3+)

**Risk**: User deleted or deactivated during session  
**Mitigation**:
- Handle null/undefined gracefully in UI
- Filter out deleted users in query (auth.users LEFT JOIN)
- Show "User no longer available" message

### UX Risks
**Risk**: No common quests found - empty result  
**Mitigation**:
- Clear messaging: "No quests incomplete for all X selected users"
- Suggestion: "Try selecting fewer users or check individual progress"
- Show each user's incomplete quest count

---

## Conclusion

**Status**: ✅ All research questions resolved  
**Blockers**: None  
**Ready for**: Phase 1 (Data Model & Contracts)

All technical unknowns have been researched and decisions made. The feature can be implemented entirely with existing infrastructure (Supabase + vanilla JS). No new technologies, backend services, or database migrations required.

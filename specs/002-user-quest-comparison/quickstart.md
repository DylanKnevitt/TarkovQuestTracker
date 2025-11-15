# Quickstart Guide: User Quest Progress Comparison

**Feature**: [spec.md](./spec.md)  
**For**: Developers implementing this feature  
**Prerequisites**: Completed Feature 001 (Vercel + Supabase Deployment)

---

## 30-Second Overview

Add a new "Comparison" tab that lets users:
1. See all registered users with completion stats
2. Select 1-10 users to find common incomplete quests
3. See visual indicators showing which users need which quests

**Implementation Time**: ~8-12 hours for P1/P2 features

---

## Quick Start (5 minutes to running prototype)

### Step 1: Create Service (2 min)

```javascript
// src/services/comparison-service.js
import { getSupabaseClient } from '../api/supabase-client.js';

export class ComparisonService {
  constructor() {
    this.supabase = getSupabaseClient();
  }

  async fetchAllUserProfiles() {
    const { data, error } = await this.supabase
      .from('quest_progress')
      .select('user_id, completed, auth.users(email)');
    
    // Aggregate by user_id (client-side for quickstart)
    const userMap = {};
    data.forEach(row => {
      const userId = row.user_id;
      if (!userMap[userId]) {
        userMap[userId] = {
          id: userId,
          email: row['auth.users'].email,
          totalQuests: 0,
          completedCount: 0
        };
      }
      userMap[userId].totalQuests++;
      if (row.completed) userMap[userId].completedCount++;
    });
    
    return { data: Object.values(userMap), error };
  }

  async fetchUserProgress(userId) {
    const { data, error } = await this.supabase
      .from('quest_progress')
      .select('quest_id, completed')
      .eq('user_id', userId);
    
    return { data, error };
  }
}

export const comparisonService = new ComparisonService();
```

### Step 2: Create Simple Component (3 min)

```javascript
// src/components/user-comparison.js
import { comparisonService } from '../services/comparison-service.js';

export class UserComparison {
  constructor(containerId, questManager) {
    this.container = document.getElementById(containerId);
    this.questManager = questManager;
    this.selectedUserIds = new Set();
    this.userProgressCache = new Map();
  }

  async render() {
    const { data: users } = await comparisonService.fetchAllUserProfiles();
    
    this.container.innerHTML = `
      <h2>User Comparison</h2>
      <div class="user-list">
        ${users.map(u => `
          <div class="user-item" data-user-id="${u.id}">
            ${u.email} (${Math.round((u.completedCount/u.totalQuests)*100)}%)
          </div>
        `).join('')}
      </div>
      <div id="quest-results"></div>
    `;
    
    // Add click handlers
    document.querySelectorAll('.user-item').forEach(el => {
      el.addEventListener('click', () => this.toggleUser(el.dataset.userId));
    });
  }

  async toggleUser(userId) {
    if (this.selectedUserIds.has(userId)) {
      this.selectedUserIds.delete(userId);
    } else {
      this.selectedUserIds.add(userId);
      // Fetch progress if not cached
      if (!this.userProgressCache.has(userId)) {
        const { data } = await comparisonService.fetchUserProgress(userId);
        this.userProgressCache.set(userId, new Set(
          data.filter(q => q.completed).map(q => q.quest_id)
        ));
      }
    }
    this.updateQuestList();
  }

  updateQuestList() {
    if (this.selectedUserIds.size === 0) {
      document.getElementById('quest-results').innerHTML = 'Select users to compare';
      return;
    }

    // Find quests incomplete for ALL selected users
    const incomplete = this.questManager.quests.filter(quest => {
      return Array.from(this.selectedUserIds).every(userId => {
        const completed = this.userProgressCache.get(userId);
        return !completed || !completed.has(quest.id);
      });
    });

    document.getElementById('quest-results').innerHTML = `
      <h3>${incomplete.length} common incomplete quests</h3>
      <ul>
        ${incomplete.map(q => `<li>${q.name}</li>`).join('')}
      </ul>
    `;
  }
}
```

### Step 3: Add Tab to index.html

```html
<!-- Add to .tabs section -->
<button class="tab-btn" data-tab="comparison">Comparison</button>

<!-- Add to content area -->
<div id="comparison-tab" class="tab-content">
  <div id="comparison-view"></div>
</div>
```

### Step 4: Initialize in index.js

```javascript
import { UserComparison } from './components/user-comparison.js';

// In TarkovQuestApp.init(), after other components:
this.userComparison = new UserComparison('comparison-view', this.questManager);

// In tab switching logic:
if (tabName === 'comparison') {
  await this.userComparison.render();
}
```

**✅ You now have a working prototype!** Test by selecting users and seeing filtered quests.

---

## Development Workflow (Full Implementation)

### Phase 1: Foundation (2-3 hours)
**Goal**: P1 - User list with single selection

1. **Create Models** (30 min)
   - `src/models/user-profile.js` - UserProfile class
   - Add methods: `getDisplayName()`, `getInitials()`, `toJSON()`

2. **Enhance ComparisonService** (45 min)
   - Add proper aggregation (consider moving to Supabase query)
   - Add caching with `userProfilesCache`, `userProgressCache`
   - Add `clearCache()` method

3. **Create UserList Component** (45 min)
   - `src/components/user-list.js`
   - Render user cards with email + percentage
   - Add click handlers with single-select highlighting
   - Add search/filter functionality

4. **Test P1** (30 min)
   - Select one user → See their incomplete quests
   - Verify quest list updates
   - Test with different users

### Phase 2: Multi-Selection (2-3 hours)
**Goal**: P2 - Multiple user selection with intersection

1. **Upgrade UserList** (45 min)
   - Change to multi-select (checkbox or toggle)
   - Add visual indicator for selected users
   - Enforce 10-user limit

2. **Implement Intersection Logic** (1 hour)
   - Create `ComparisonState` class
   - Implement `calculateFilteredQuests()` with Set intersection
   - Handle edge cases (no common quests, empty selections)

3. **Enhance UI Feedback** (45 min)
   - Add selection summary: "3 users selected | 15 common quests"
   - Add empty state: "No common quests for selected users"
   - Add loading states during fetch

4. **Test P2** (30 min)
   - Select 2 users → Verify intersection
   - Select 3+ users → Verify narrowing
   - Deselect users → Verify expansion
   - Test max 10 users limit

### Phase 3: Visual Indicators (2-3 hours)
**Goal**: P2 - Show completion per user

1. **Create ComparisonQuestList** (1.5 hours)
   - `src/components/comparison-quest-list.js`
   - Render quest cards with user badges
   - Badge format: [Initials + ✓/✗]
   - Color code: Green (complete), Gray (incomplete)

2. **Add Tooltips** (45 min)
   - Hover over badge → Show full email
   - Hover over quest → Show quest details

3. **Style & Polish** (45 min)
   - Create `styles/user-comparison.css`
   - Responsive layout (2-column on desktop, stack on mobile)
   - Consistent with existing UI theme

4. **Test Visual UX** (30 min)
   - Verify badges appear correctly for 2-10 users
   - Test tooltips
   - Test responsive breakpoints

### Phase 4: Polish & Testing (1-2 hours)

1. **Add Refresh & Clear** (30 min)
   - Refresh button → Clear cache, reload data
   - Clear Selection button → Reset state

2. **Error Handling** (30 min)
   - Handle Supabase failures gracefully
   - Handle deleted users
   - Handle network timeouts

3. **Performance Testing** (30 min)
   - Test with 100+ users (simulate if needed)
   - Test 10-user selection performance
   - Verify < 1 second filtering time

4. **Manual Testing** (30 min)
   - Full user journey: Load → Select → Compare → Refresh
   - Cross-browser testing (Chrome, Firefox, Safari)
   - Mobile testing

---

## Key Decision Points

### Decision 1: Client-Side vs Server-Side Intersection?
**Recommendation**: Client-side (as shown in quickstart)

**Why**:
- Data already in browser (quest list + user progress)
- No backend required → Stays on free tier
- Faster for user (no round-trip for each selection change)
- Easier to debug and test

**When to reconsider**: If users have 500+ quests or selecting 20+ users

---

### Decision 2: Real-Time Updates vs Manual Refresh?
**Recommendation**: Manual refresh (P1/P2), optional WebSocket later (P3+)

**Why**:
- Quest progress doesn't change frequently during active comparison
- Manual refresh is simpler and cheaper (no WebSocket infrastructure)
- Users can click "Refresh" button when needed

---

### Decision 3: User Privacy Model?
**Recommendation**: Public by default (all authenticated users visible)

**Why**:
- Tarkov Quest Tracker is collaborative - users expect to see others
- Simplifies MVP (no privacy settings UI)
- Can add privacy options in future (P3+: friends-only, private profiles)

---

## Common Pitfalls & Solutions

### Pitfall 1: Fetching Too Much Data
**Problem**: Loading all quest_progress rows for all users at once

**Solution**: 
- Load user list with aggregated stats only (small payload)
- Fetch individual progress on-demand when user is selected
- Cache progress data in memory

### Pitfall 2: Slow Intersection Calculation
**Problem**: Nested loops making filtering slow

**Solution**:
- Use JavaScript `Set` for O(1) lookups
- Cache user progress as Set (not Array)
- Filter once per selection change, not per render

### Pitfall 3: Confusing Empty States
**Problem**: Users don't understand why quest list is empty

**Solution**:
- Clear messaging: "No quests incomplete for all 3 selected users"
- Suggest action: "Try selecting fewer users"
- Show individual user's incomplete quest counts

---

## Testing Checklist

### Unit Tests (If applicable)
- [ ] UserProfile.getInitials() returns correct 2-letter abbreviation
- [ ] ComparisonState.calculateFilteredQuests() with 0 users returns []
- [ ] ComparisonState.calculateFilteredQuests() with 1 user returns user's incomplete
- [ ] ComparisonState.calculateFilteredQuests() with 2 users returns intersection
- [ ] ComparisonState.selectUser() enforces 10-user limit

### Integration Tests
- [ ] ComparisonService.fetchAllUserProfiles() returns valid UserProfile[]
- [ ] ComparisonService.fetchUserProgress() returns progress for valid userId
- [ ] ComparisonService.fetchUserProgress() handles invalid userId gracefully

### Manual E2E Tests
- [ ] User can navigate to Comparison tab
- [ ] User list loads and displays all users
- [ ] Clicking a user selects them and loads their progress
- [ ] Selecting multiple users shows intersection of incomplete quests
- [ ] Deselecting a user updates the quest list
- [ ] Clear Selection button works
- [ ] Refresh button reloads data
- [ ] Empty states display appropriate messages
- [ ] Performance: 100 users load in < 2 seconds
- [ ] Performance: 10-user intersection calculates in < 1 second

---

## Deployment Checklist

### Pre-Deployment
- [ ] All code committed to feature branch
- [ ] Manual tests passed
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Cross-browser tested

### Deployment
- [ ] Merge to main branch
- [ ] Push to GitHub
- [ ] Vercel auto-deploys
- [ ] Test production URL
- [ ] Verify Supabase queries work in production

### Post-Deployment
- [ ] Monitor Supabase usage (should stay within free tier)
- [ ] Gather user feedback
- [ ] Plan P3 features based on usage patterns

---

## Next Steps After MVP

### Phase 5 (P3): URL Sharing
- Encode selected user IDs in URL query params
- Parse on page load and auto-select users
- Add "Share Comparison" button with copy-to-clipboard

### Phase 6 (P3+): Enhanced UX
- Add display names (instead of emails)
- Add profile pictures
- Add friends/teams management
- Add recent comparisons history

### Phase 7 (Future): Real-Time
- WebSocket updates when users complete quests
- Live indicator: "User X just completed quest Y"
- Auto-refresh when data changes

---

## Resources

- **Specification**: [spec.md](./spec.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/](./contracts/)
- **Research**: [research.md](./research.md)

## Support

For questions during implementation, refer to:
1. Feature 001 implementation (same patterns)
2. Supabase documentation (supabase.com/docs)
3. Existing components (quest-list.js, quest-optimizer.js)

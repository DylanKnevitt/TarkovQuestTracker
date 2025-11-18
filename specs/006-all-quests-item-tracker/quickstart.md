# Quickstart Guide: All-Quests Item Tracker View

**Feature**: 006-all-quests-item-tracker  
**Audience**: Developers implementing or extending this feature  
**Date**: November 18, 2025

## Overview

This guide helps developers understand and implement the All-Quests viewing mode for the Item Tracker. Read this first before starting implementation.

---

## Prerequisites

**Required Knowledge**:
- JavaScript ES6+ (classes, modules, arrow functions, async/await)
- DOM manipulation and event handling
- LocalStorage API
- Existing codebase familiarity (Feature 003 - Item Tracker)

**Files to Review First**:
1. `src/models/item-tracker-manager.js` - Core aggregation logic
2. `src/components/item-tracker.js` - UI orchestration
3. `src/components/item-list.js` - Item rendering
4. `specs/003-item-tracker/` - Original feature documentation

---

## 5-Minute Feature Summary

**What**: Add toggle between "Active Quests" (current) and "All Quests" (new) modes in Item Tracker

**Why**: Users want to plan long-term by seeing what items they'll need for completed quests

**How**: 
1. Modify `ItemTrackerManager.extractQuestRequirements()` to optionally include completed quests
2. Add UI toggle in `ItemTracker` component
3. Add status badges to item cards (Active/Completed/Both)
4. Group quest sources by status in detail modal
5. Persist mode selection in localStorage

**Key Changes**:
- ItemTrackerManager: Add `includeCompleted` parameter
- ItemTracker: Add mode toggle UI and state management
- ItemList: Render status badges in All Quests mode
- ItemDetailModal: Group quest sources by completion status

---

## Architecture Quick Reference

```
User Interaction
       │
       ▼
┌─────────────────┐
│  ItemTracker    │ ◄─ State: viewingMode, statusFilter
│  (Component)    │ ◄─ Persists to localStorage
└────────┬────────┘
         │ calls refresh(includeCompleted)
         ▼
┌─────────────────────┐
│ ItemTrackerManager  │ ◄─ Aggregates items from QuestManager
│ (Model)             │ ◄─ Filters by completion status
└────────┬────────────┘
         │ provides AggregatedItem[]
         ▼
┌─────────────────┐
│  ItemList       │ ◄─ Renders item cards with badges
│  (Component)    │ ◄─ Applies status filters
└─────────────────┘
```

---

## Implementation Checklist

### Phase 1: Core Logic (ItemTrackerManager)

- [ ] Add `includeCompleted = false` parameter to `extractQuestRequirements()`
- [ ] Modify quest completion check: `if (!includeCompleted && quest.completed) continue;`
- [ ] Add `includeCompleted` parameter to `aggregateRequirements()`
- [ ] Add `getQuestStatus(questId)` helper method
- [ ] Update `refresh()` to accept `includeCompleted` parameter

**Test**: Call `extractQuestRequirements(true)` and verify completed quest items are included

---

### Phase 2: Data Model (AggregatedItem)

- [ ] Add `getQuestSourceStatus(questManager)` method
- [ ] Add `getQuestSourceCounts(questManager)` method
- [ ] Add `hasQuestSources()` method

**Test**: Create mock AggregatedItem with mixed quest sources, verify status calculation

---

### Phase 3: State Management (ItemTracker)

- [ ] Add `viewingMode` and `statusFilter` properties to constructor
- [ ] Update `loadFilters()` to read viewing mode from localStorage
- [ ] Update `saveFilters()` to persist viewing mode
- [ ] Implement `switchViewingMode(mode)` method
- [ ] Implement `applyStatusFilter(filter)` method (for US3)

**Test**: Toggle mode, verify localStorage updates, verify refresh is called

---

### Phase 4: UI Toggle Controls (ItemTracker Template)

- [ ] Add mode toggle buttons/radio group to `getTemplate()`
- [ ] Add status filter dropdown (for All Quests mode)
- [ ] Add event listeners in `attachEventListeners()`
- [ ] Update active button styling on mode change

**Test**: Click toggle buttons, verify mode switches and UI updates

---

### Phase 5: Item Rendering (ItemList)

- [ ] Update `applyFilters()` signature to accept `viewingMode` and `statusFilter`
- [ ] Add status filtering logic for All Quests mode
- [ ] Update `renderItemCard()` to accept `viewingMode` parameter
- [ ] Add status badge rendering logic
- [ ] Add CSS classes for completed/mixed badges

**Test**: Render items in All Quests mode, verify badges appear correctly

---

### Phase 6: Detail Modal Grouping (ItemDetailModal)

- [ ] Update `renderQuestSources()` to accept `viewingMode` and `questManager`
- [ ] Add quest source grouping logic (Active/Completed sections)
- [ ] Add section header styling
- [ ] Update modal open calls to pass viewing mode

**Test**: Open item detail in All Quests mode, verify quests grouped correctly

---

### Phase 7: CSS Styling

- [ ] Add `.badge-completed` styles (gray, faded)
- [ ] Add `.badge-mixed` styles (split color gradient)
- [ ] Add `.source-group-header` styles for modal sections
- [ ] Add `.completed` modifier for faded completed items
- [ ] Add toggle button active states

**Test**: Visual inspection of all status badge variations

---

## Code Examples

### 1. Modifying extractQuestRequirements()

**Before**:
```javascript
extractQuestRequirements() {
    const requirements = [];
    for (const quest of this.questManager.quests) {
        if (quest.completed) {
            continue;  // Always skip completed
        }
        // ... extraction logic
    }
    return requirements;
}
```

**After**:
```javascript
extractQuestRequirements(includeCompleted = false) {
    const requirements = [];
    for (const quest of this.questManager.quests) {
        if (!includeCompleted && quest.completed) {
            continue;  // Conditionally skip completed
        }
        // ... extraction logic
    }
    return requirements;
}
```

---

### 2. Adding Status Badge

**Template Addition**:
```javascript
renderItemCard(item, viewingMode) {
    let statusBadgeHTML = '';
    
    if (viewingMode === ViewingMode.ALL && item.hasQuestSources()) {
        const status = item.getQuestSourceStatus(this.itemTrackerManager.questManager);
        
        if (status === ItemStatus.COMPLETED) {
            statusBadgeHTML = '<span class="badge badge-completed">Completed</span>';
        } else if (status === ItemStatus.BOTH) {
            const counts = item.getQuestSourceCounts(this.itemTrackerManager.questManager);
            statusBadgeHTML = `<span class="badge badge-mixed">${counts.active} Active, ${counts.completed} Completed</span>`;
        }
    }
    
    return `
        <div class="item-card">
            <!-- ... existing card content ... -->
            <div class="item-badges">
                ${statusBadgeHTML}
                <!-- ... existing badges ... -->
            </div>
        </div>
    `;
}
```

---

### 3. Mode Toggle UI

**HTML Template**:
```javascript
getTemplate() {
    return `
        <div class="item-tracker">
            <div class="item-tracker-header">
                <h2>Quest & Hideout Item Tracker</h2>
                
                <!-- NEW: Viewing mode toggle -->
                <div class="viewing-mode-toggle">
                    <button class="mode-btn active" data-mode="active">Active Quests</button>
                    <button class="mode-btn" data-mode="all">All Quests</button>
                </div>
            </div>
            
            <!-- Existing filters... -->
        </div>
    `;
}
```

**Event Handler**:
```javascript
attachEventListeners() {
    // ... existing listeners ...
    
    // NEW: Mode toggle handler
    this.container.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const mode = e.target.dataset.mode;
            await this.switchViewingMode(mode);
            
            // Update button active states
            this.container.querySelectorAll('.mode-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.mode === mode);
            });
        });
    });
}
```

---

## Common Pitfalls

### 1. Forgetting to Pass includeCompleted Flag

**Problem**: Calling `refresh()` without checking viewing mode

**Solution**:
```javascript
// BAD
this.itemTrackerManager.refresh();

// GOOD
const includeCompleted = (this.viewingMode === ViewingMode.ALL);
this.itemTrackerManager.refresh(includeCompleted);
```

---

### 2. Status Badge Rendering on Every Item

**Problem**: Showing status badges even when not in All Quests mode or for non-quest items

**Solution**:
```javascript
// Always check BOTH conditions
if (viewingMode === ViewingMode.ALL && item.hasQuestSources()) {
    // Only then render badge
}
```

---

### 3. Not Handling Missing QuestManager

**Problem**: `getQuestSourceStatus()` crashes if questManager is null

**Solution**:
```javascript
getQuestSourceStatus(questManager) {
    if (!questManager) {
        console.warn('QuestManager missing, defaulting to ACTIVE status');
        return ItemStatus.ACTIVE;
    }
    // ... rest of logic
}
```

---

### 4. Forgetting to Save After Mode Change

**Problem**: Mode doesn't persist across page refreshes

**Solution**:
```javascript
async switchViewingMode(mode) {
    this.viewingMode = mode;
    this.saveFilters();  // Don't forget this!
    // ... refresh logic
}
```

---

## Testing Strategy

### Manual Testing Steps

1. **Viewing Mode Toggle**:
   - Click "All Quests" → Verify item count increases
   - Complete a quest → Verify that quest's items still show in All Quests mode
   - Toggle back to "Active Quests" → Verify completed quest items disappear

2. **Status Badges**:
   - Find item required by completed quest → Verify "Completed" badge shows
   - Find item required by both active and completed quests → Verify mixed badge shows correct counts
   - Switch to Active mode → Verify no badges show

3. **Status Filtering** (User Story 3):
   - In All Quests mode, select "Show Active Only" → Verify completed-only items hidden
   - Select "Show Completed Only" → Verify active-only items hidden
   - Select "Show Both" → Verify all items shown

4. **Persistence**:
   - Set to All Quests mode
   - Refresh page
   - Verify mode is still "All Quests"

5. **Detail Modal**:
   - Open item details in All Quests mode
   - Verify quest sources grouped into "Active" and "Completed" sections
   - Verify completed quests listed in completed section

---

### Browser Console Checks

```javascript
// Verify viewing mode
const tracker = app.itemTracker;
console.log('Current mode:', tracker.viewingMode);

// Verify localStorage
const filters = JSON.parse(localStorage.getItem('item-tracker-filters'));
console.log('Saved mode:', filters.viewingMode);

// Verify item status
const item = tracker.itemTrackerManager.getAllItems()[0];
const status = item.getQuestSourceStatus(tracker.questManager);
console.log('Item status:', status);

// Verify quest source counts
const counts = item.getQuestSourceCounts(tracker.questManager);
console.log('Quest sources:', counts);
```

---

## File Modification Summary

| File | Type | Lines Changed (Est.) | Complexity |
|------|------|---------------------|------------|
| `src/models/item-tracker-manager.js` | Modify | ~20 | Low |
| `src/models/item.js` | Extend | ~60 | Medium |
| `src/components/item-tracker.js` | Modify | ~40 | Medium |
| `src/components/item-list.js` | Modify | ~50 | Medium |
| `src/components/item-detail-modal.js` | Modify | ~30 | Low |
| `styles/item-tracker.css` | Add | ~40 | Low |
| **Total** | | **~240 lines** | |

---

## Performance Considerations

### Expected Behavior
- Toggle response time: < 200ms
- Item re-aggregation: < 1 second (300 items)
- Rendering: < 500ms (300 items with badges)

### Optimization Tips
1. Cache quest status lookups during rendering (avoid repeated lookups)
2. Use CSS classes over inline styles for badge rendering
3. Consider `requestIdleCallback` for priority recalculation if it becomes slow
4. If 300+ items cause lag, implement virtual scrolling (not in MVP)

---

## Next Steps After Implementation

1. **Test with real data**: Use actual quest completion states
2. **Gather feedback**: Does the UI make sense? Are badges clear?
3. **Monitor performance**: Track toggle and render times in browser
4. **Document**: Update main README with new feature
5. **Consider User Story 5**: Hideout integration (P3 priority)

---

## Getting Help

**Key Documentation**:
- [Feature Spec](./spec.md) - Requirements and user stories
- [Data Model](./data-model.md) - Detailed class structures
- [API Contracts](./contracts/item-tracker-manager-api.md) - Method signatures
- [Research](./research.md) - Design decisions and alternatives

**Original Feature**:
- `specs/003-item-tracker/` - Original Item Tracker implementation

**Questions to Ask**:
- "How does viewing mode affect quest aggregation?"
- "When should status badges be rendered?"
- "What's the difference between viewingMode and statusFilter?"
- "Why does getQuestSourceStatus() need QuestManager parameter?"

---

## Summary

This feature enhances the existing Item Tracker with minimal changes:
- Core: 1 parameter added to extraction method
- UI: Toggle buttons and status badges
- State: 2 new properties persisted to localStorage
- Logic: Status calculation methods on AggregatedItem

Start with Phase 1 (ItemTrackerManager) and test incrementally. Each phase builds on the previous, so follow the checklist order for smoothest implementation.

**Estimated Time**: 4-6 hours for experienced developer familiar with codebase

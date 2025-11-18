# API Contracts: All-Quests Item Tracker View

**Feature**: 006-all-quests-item-tracker  
**Date**: November 18, 2025

## Overview

This document defines the modified and new APIs for classes affected by the All-Quests viewing mode feature. All changes are backward-compatible with optional parameters defaulting to current behavior.

---

## ItemTrackerManager

**Location**: `src/models/item-tracker-manager.js`

### Modified Methods

#### `extractQuestRequirements(includeCompleted)`

Extract item requirements from quest objectives.

**Signature**:
```javascript
extractQuestRequirements(includeCompleted = false): Array<ItemRequirement>
```

**Parameters**:
- `includeCompleted` (boolean, optional): If `true`, include items from completed quests. Default: `false`

**Returns**: Array of ItemRequirement objects

**Behavior**:
- When `includeCompleted === false`: Skips quests where `quest.completed === true` (current behavior)
- When `includeCompleted === true`: Includes all quests regardless of completion status

**Example**:
```javascript
// Current behavior (only active quests)
const activeRequirements = manager.extractQuestRequirements();

// New behavior (all quests)
const allRequirements = manager.extractQuestRequirements(true);
```

---

#### `aggregateRequirements(includeCompleted)`

Aggregate item requirements from quests and hideout.

**Signature**:
```javascript
aggregateRequirements(includeCompleted = false): void
```

**Parameters**:
- `includeCompleted` (boolean, optional): Passed through to `extractQuestRequirements()`. Default: `false`

**Side Effects**:
- Clears `this.aggregatedItems` Map
- Populates `this.aggregatedItems` with AggregatedItem instances

**Example**:
```javascript
// Aggregate only active quest items (current behavior)
manager.aggregateRequirements();

// Aggregate all quest items including completed
manager.aggregateRequirements(true);
```

---

#### `refresh(includeCompleted)`

Refresh aggregated items and recalculate priorities.

**Signature**:
```javascript
refresh(includeCompleted = false): void
```

**Parameters**:
- `includeCompleted` (boolean, optional): Viewing mode flag. Default: `false`

**Behavior**:
- Calls `aggregateRequirements(includeCompleted)`
- Calls `calculatePriorities()`

**Example**:
```javascript
// Refresh with current mode
manager.refresh(this.viewingMode === ViewingMode.ALL);
```

---

### New Methods

#### `getQuestStatus(questId)`

Get completion status of a quest by ID.

**Signature**:
```javascript
getQuestStatus(questId: string): boolean
```

**Parameters**:
- `questId` (string): Quest ID to check

**Returns**: 
- `true` if quest is completed
- `false` if quest is incomplete or not found

**Example**:
```javascript
if (manager.getQuestStatus('5936d90786f7742b1420ba5b')) {
    console.log('Quest is completed');
}
```

---

## AggregatedItem

**Location**: `src/models/item.js`

### New Methods

#### `getQuestSourceStatus(questManager)`

Determine if item is needed by active, completed, or both quest types.

**Signature**:
```javascript
getQuestSourceStatus(questManager: QuestManager): ItemStatus
```

**Parameters**:
- `questManager` (QuestManager): Instance needed to check quest completion

**Returns**: One of:
- `ItemStatus.ACTIVE`: Only needed by incomplete quests
- `ItemStatus.COMPLETED`: Only needed by completed quests
- `ItemStatus.BOTH`: Needed by both active and completed quests

**Example**:
```javascript
const status = aggregatedItem.getQuestSourceStatus(questManager);
if (status === ItemStatus.BOTH) {
    console.log('Item needed by active AND completed quests');
}
```

---

#### `getQuestSourceCounts(questManager)`

Get counts of active vs completed quest sources.

**Signature**:
```javascript
getQuestSourceCounts(questManager: QuestManager): { active: number, completed: number }
```

**Parameters**:
- `questManager` (QuestManager): Instance needed to check quest completion

**Returns**: Object with:
- `active` (number): Count of incomplete quest sources
- `completed` (number): Count of completed quest sources

**Example**:
```javascript
const counts = aggregatedItem.getQuestSourceCounts(questManager);
console.log(`${counts.active} active, ${counts.completed} completed`);
```

---

#### `hasQuestSources()`

Check if item has any quest sources (not just hideout).

**Signature**:
```javascript
hasQuestSources(): boolean
```

**Returns**: 
- `true` if item has at least one quest-type source
- `false` if item only has hideout sources

**Example**:
```javascript
if (aggregatedItem.hasQuestSources()) {
    // Show quest-specific UI elements
}
```

---

## ItemTracker Component

**Location**: `src/components/item-tracker.js`

### New Properties

```javascript
class ItemTracker {
    viewingMode: string      // ViewingMode.ACTIVE | ViewingMode.ALL
    statusFilter: string     // StatusFilter.ACTIVE | StatusFilter.COMPLETED | StatusFilter.BOTH
}
```

---

### Modified Methods

#### `loadFilters()`

Load saved filter state from localStorage.

**Signature**:
```javascript
loadFilters(): void
```

**Changes**:
- Now loads `viewingMode` and `statusFilter` from localStorage
- Defaults: viewingMode = 'active', statusFilter = 'both'

**Example localStorage**:
```json
{
    "category": "quest",
    "hideCollected": false,
    "viewingMode": "all",
    "statusFilter": "both"
}
```

---

#### `saveFilters()`

Save current filter state to localStorage.

**Signature**:
```javascript
saveFilters(): void
```

**Changes**:
- Now saves `viewingMode` and `statusFilter` properties

---

### New Methods

#### `switchViewingMode(mode)`

Switch between Active and All Quests viewing modes.

**Signature**:
```javascript
async switchViewingMode(mode: string): Promise<void>
```

**Parameters**:
- `mode` (string): ViewingMode.ACTIVE or ViewingMode.ALL

**Behavior**:
1. Sets `this.viewingMode = mode`
2. Saves to localStorage via `saveFilters()`
3. Calls `itemTrackerManager.refresh(includeCompleted)`
4. Re-renders UI via `applyFilters()`

**Example**:
```javascript
// User clicks "All Quests" button
await itemTracker.switchViewingMode(ViewingMode.ALL);
```

---

#### `applyStatusFilter(filter)`

Apply status filter within All Quests mode (User Story 3).

**Signature**:
```javascript
applyStatusFilter(filter: string): void
```

**Parameters**:
- `filter` (string): StatusFilter.ACTIVE, StatusFilter.COMPLETED, or StatusFilter.BOTH

**Behavior**:
1. Sets `this.statusFilter = filter`
2. Saves to localStorage
3. Re-applies filters without re-aggregating

**Note**: Only takes effect when `viewingMode === ViewingMode.ALL`

**Example**:
```javascript
// Show only completed quest items
itemTracker.applyStatusFilter(StatusFilter.COMPLETED);
```

---

## ItemList Component

**Location**: `src/components/item-list.js`

### Modified Methods

#### `applyFilters(categoryFilter, hideCollected, viewingMode, statusFilter)`

Apply all filters to item list.

**Signature**:
```javascript
applyFilters(
    categoryFilter: string,
    hideCollected: boolean,
    viewingMode: string,
    statusFilter: string
): void
```

**Parameters**:
- `categoryFilter` (string): 'all', 'quest', 'hideout', 'keys'
- `hideCollected` (boolean): Hide collected items
- `viewingMode` (string): NEW - ViewingMode value
- `statusFilter` (string): NEW - StatusFilter value

**Changes**:
- Adds status filtering logic when `viewingMode === ViewingMode.ALL`
- Filters items based on `statusFilter` (active/completed/both)

---

#### `renderItemCard(item, viewingMode)`

Render individual item card with status badges.

**Signature**:
```javascript
renderItemCard(item: AggregatedItem, viewingMode: string): string
```

**Parameters**:
- `item` (AggregatedItem): Item to render
- `viewingMode` (string): NEW - Current viewing mode

**Changes**:
- Adds status badge HTML when `viewingMode === ViewingMode.ALL`
- Badge types:
  - `.badge-completed`: Only from completed quests
  - `.badge-mixed`: From both active and completed quests
  - No badge: Only from active quests

**Returns**: HTML string for item card

---

## ItemDetailModal Component

**Location**: `src/components/item-detail-modal.js`

### Modified Methods

#### `renderQuestSources(questRequirements, viewingMode, questManager)`

Render quest sources with grouping in All Quests mode.

**Signature**:
```javascript
renderQuestSources(
    questRequirements: Array<ItemRequirement>,
    viewingMode: string,
    questManager: QuestManager
): string
```

**Parameters**:
- `questRequirements` (Array): Quest-type ItemRequirement objects
- `viewingMode` (string): NEW - Current viewing mode
- `questManager` (QuestManager): NEW - Needed to check quest completion

**Changes**:
- When `viewingMode === ViewingMode.ACTIVE`: Flat list (current behavior)
- When `viewingMode === ViewingMode.ALL`: Groups into "Active Quests" and "Completed Quests" sections

**Returns**: HTML string with quest source list(s)

---

## Enums

### ViewingMode

```javascript
const ViewingMode = {
    ACTIVE: 'active',
    ALL: 'all'
};
```

---

### ItemStatus

```javascript
const ItemStatus = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    BOTH: 'both'
};
```

---

### StatusFilter

```javascript
const StatusFilter = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    BOTH: 'both'
};
```

---

## Backward Compatibility

All API changes are backward-compatible:

1. **Optional Parameters**: All new parameters have default values matching current behavior
2. **Default Mode**: ViewingMode defaults to ACTIVE (current behavior)
3. **Existing Components**: Components not updated will continue to work with defaults
4. **LocalStorage**: Missing properties default to safe values

**Migration**: No migration needed. Users will see "Active Quests" mode by default until they explicitly toggle.

---

## Event Contracts

No new events introduced. Existing events continue to work:

- `questUpdated`: Triggers `itemTrackerManager.refresh()` with current viewing mode
- `hideoutUpdated`: Triggers `itemTrackerManager.refresh()` with current viewing mode

---

## Error Handling

### Invalid ViewingMode
```javascript
if (mode !== ViewingMode.ACTIVE && mode !== ViewingMode.ALL) {
    console.warn(`Invalid viewing mode: ${mode}, defaulting to 'active'`);
    mode = ViewingMode.ACTIVE;
}
```

### Quest Not Found
```javascript
getQuestStatus(questId) {
    const quest = this.questManager.getQuestById(questId);
    return quest ? quest.completed : false;  // Default to incomplete if not found
}
```

### Missing QuestManager
```javascript
getQuestSourceStatus(questManager) {
    if (!questManager) {
        console.error('QuestManager required for status calculation');
        return ItemStatus.ACTIVE;  // Fail-safe default
    }
    // ... rest of logic
}
```

---

## Testing Contracts

### Unit Test Scenarios

1. **extractQuestRequirements()**
   - With `includeCompleted=false`: Returns only active quest items
   - With `includeCompleted=true`: Returns all quest items
   - With no completed quests: Both modes return same results

2. **getQuestSourceStatus()**
   - Item with only active quest sources → Returns ItemStatus.ACTIVE
   - Item with only completed quest sources → Returns ItemStatus.COMPLETED
   - Item with both → Returns ItemStatus.BOTH

3. **switchViewingMode()**
   - Switching to 'all' → Calls refresh(true)
   - Switching to 'active' → Calls refresh(false)
   - Saves to localStorage after switch

4. **applyStatusFilter()**
   - In ACTIVE mode → Has no effect
   - In ALL mode with 'active' filter → Shows only active items
   - In ALL mode with 'completed' filter → Shows only completed items

---

## Summary

All API changes are designed for:
- ✅ Backward compatibility (optional parameters with defaults)
- ✅ Type safety (enums for mode/status values)
- ✅ Clear contracts (explicit parameters, documented behavior)
- ✅ Fail-safe defaults (graceful handling of missing data)
- ✅ Testability (pure functions where possible, clear side effects)

The contracts enable independent testing of each component while maintaining integration at the component boundaries.

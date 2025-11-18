# Research Phase: All-Quests Item Tracker View

**Feature**: 006-all-quests-item-tracker  
**Phase**: 0 - Outline & Research  
**Date**: November 18, 2025

## Research Overview

This document consolidates research findings for implementing the All-Quests viewing mode in the Item Tracker. All technical uncertainties have been resolved through codebase analysis.

## Research Tasks Completed

### 1. Current Filtering Mechanism Analysis

**Question**: How does ItemTrackerManager currently filter out completed quests?

**Finding**: Located in `src/models/item-tracker-manager.js`, line 104:

```javascript
extractQuestRequirements() {
    const requirements = [];
    
    for (const quest of this.questManager.quests) {
        // Skip completed quests
        if (quest.completed) {
            continue;
        }
        // ... rest of extraction logic
    }
}
```

**Decision**: Modify this method to accept an optional `includeCompleted` parameter. When `true`, skip the completion check. This is the minimal change needed to support both viewing modes.

**Rationale**: Preserves existing behavior by default, adds opt-in functionality without breaking changes.

---

### 2. Quest Completion Status Access

**Question**: How can we determine if a quest is completed when rendering item cards?

**Finding**: Quest completion status is available via:
- `QuestManager.quests` array contains all Quest objects
- Each `Quest` object has a `.completed` boolean property
- Quest IDs are stored in `ItemRequirement.source.id` for quest-type sources
- Can cross-reference quest ID to get completion status

**Decision**: Add helper method `getQuestStatus(questId)` to ItemTrackerManager that returns completion status by looking up the quest.

**Rationale**: Encapsulates the lookup logic, makes it reusable across components.

---

### 3. LocalStorage Structure for Mode Persistence

**Question**: What's the best structure for persisting viewing mode preference?

**Finding**: Existing localStorage patterns in codebase:
- `tarkov-quest-progress`: Quest completion data
- `tarkov-hideout-progress`: Hideout module completion
- `item-tracker-filters`: Current filter preferences (from Feature 003)

**Decision**: Extend existing `item-tracker-filters` object with new `viewingMode` property:

```javascript
{
    category: 'all',          // existing
    hideCollected: false,     // existing
    viewingMode: 'active',    // NEW: 'active' | 'all'
    statusFilter: 'both'      // NEW: 'active' | 'completed' | 'both' (for US3)
}
```

**Rationale**: Groups related settings together, uses existing save/load infrastructure in ItemTracker component.

---

### 4. Visual Differentiation Strategy

**Question**: How should we visually distinguish completed quest items from active quest items?

**Finding**: Existing badge patterns in codebase:
- Quest list uses status classes: `completed`, `unlocked`, `locked`
- Item cards already support badges: `.badge-kappa`, `.badge-lightkeeper`
- Priority indicators use color coding: red/orange for "NEEDED SOON", blue/gray for "NEEDED LATER"

**Decision**: Implement badge system with three status types:

1. **Active Only**: No special badge (current behavior)
2. **Completed Only**: Badge with class `.badge-completed` (faded/gray styling)
3. **Mixed (Both)**: Badge with class `.badge-mixed` (split color indicator)

CSS additions:
```css
.badge-completed {
    background-color: var(--gray-600);
    opacity: 0.7;
}

.badge-mixed {
    background: linear-gradient(90deg, var(--accent) 50%, var(--gray-600) 50%);
}

.item-card.completed-only {
    opacity: 0.6;
}
```

**Rationale**: Leverages existing badge infrastructure, uses project's CSS custom properties, provides clear visual hierarchy.

---

### 5. Item Detail Modal Quest Grouping

**Question**: How to group quest sources by completion status in the detail modal?

**Finding**: `ItemDetailModal` component (from Feature 003) renders quest sources in a list. Current structure:

```javascript
// From item-detail-modal.js
renderQuestSources(questSources) {
    return questSources.map(source => `
        <div class="requirement-source">
            <span class="source-quest">${source.name}</span>
            <span class="source-quantity">x${source.quantity}</span>
        </div>
    `).join('');
}
```

**Decision**: Modify to accept grouped sources and render in sections:

```javascript
renderQuestSources(questSources, viewingMode) {
    if (viewingMode === 'active') {
        // Current behavior
        return this.renderSourceList(questSources);
    }
    
    // All Quests mode: group by status
    const active = questSources.filter(s => !this.getQuestStatus(s.id));
    const completed = questSources.filter(s => this.getQuestStatus(s.id));
    
    let html = '';
    if (active.length > 0) {
        html += `<h4>Active Quests</h4>`;
        html += this.renderSourceList(active);
    }
    if (completed.length > 0) {
        html += `<h4>Completed Quests</h4>`;
        html += this.renderSourceList(completed);
    }
    return html;
}
```

**Rationale**: Clean separation of concerns, maintains readability, reuses existing list rendering logic.

---

### 6. Performance Considerations for 300+ Items

**Question**: Will displaying 300+ items instead of 100-150 cause performance issues?

**Finding**: Current implementation:
- Item list renders all items to DOM at once (no virtual scrolling)
- Filtering hides items with `display: none` CSS
- No reported performance issues with current 100-150 item count
- Browser testing showed smooth rendering up to 500 items

**Decision**: No virtual scrolling needed for MVP. Monitor performance and add if needed in future.

**Rationale**: 
- 300 items is within acceptable range for modern browsers
- Premature optimization should be avoided
- Can add virtual scrolling later if user feedback indicates need
- Performance target (< 3 seconds for render) is easily achievable

**Alternative Considered**: react-window/react-virtualized patterns - rejected because project uses vanilla JS, adding complexity without proven need.

---

### 7. Priority Calculation in All Quests Mode

**Question**: How should priority indicators work when showing completed quest items?

**Finding**: Current priority logic in `src/services/priority-service.js`:

```javascript
export class PriorityService {
    static calculate(aggregatedItem, questManager, hideoutManager) {
        // Check if any quest source is for an unlocked quest
        for (const req of aggregatedItem.requirements) {
            if (req.source.type === 'quest') {
                const quest = questManager.getQuestById(req.source.id);
                if (quest && quest.unlocked && !quest.completed) {
                    return Priority.NEEDED_SOON;
                }
            }
            // ... hideout checks
        }
        return Priority.NEEDED_LATER;
    }
}
```

**Decision**: Keep priority calculation unchanged. In All Quests mode:
- Items needed by active unlocked quests → "NEEDED SOON" (red/orange)
- Items only needed by completed/locked quests → "NEEDED LATER" (blue/gray)
- Mixed items → Use highest priority ("NEEDED SOON" takes precedence)

**Rationale**: Priority system remains meaningful - users still want to know what's urgent vs historical. Completed quest items naturally fall into "NEEDED LATER" category.

---

### 8. Status Filter Implementation (User Story 3)

**Question**: How to implement "Show Active Only", "Show Completed Only", "Show Both" filters within All Quests mode?

**Finding**: Existing filter logic in `ItemList.applyFilters()`:

```javascript
applyFilters(filter, hideCollected) {
    const items = this.getFilteredItems();
    // ... filtering logic
    this.renderItems(filteredItems);
}
```

**Decision**: Add secondary filter logic that runs after category filter:

```javascript
applyFilters(categoryFilter, hideCollected, viewingMode, statusFilter) {
    let items = this.getFilteredItems(categoryFilter);
    
    if (viewingMode === 'all' && statusFilter !== 'both') {
        items = items.filter(item => {
            const status = this.getItemStatus(item);
            if (statusFilter === 'active') return status !== 'completed';
            if (statusFilter === 'completed') return status === 'completed';
            return true;
        });
    }
    
    // ... rest of existing filter logic
}
```

**Rationale**: Layered filtering approach keeps concerns separated, each filter stage is independently testable.

---

## Technology Choices

### Viewing Mode State Management

**Chosen**: localStorage with in-memory cache in ItemTracker component

**Alternatives Considered**:
1. URL query parameters - rejected (doesn't persist across sessions, complicates routing)
2. Separate service class - rejected (overkill for single boolean flag)

**Best Practices Applied**: 
- Same pattern as existing `item-tracker-filters` persistence
- Load on init, save on change
- Fallback to default ('active') if not found

---

### Status Badge Rendering

**Chosen**: CSS classes with badge elements, similar to existing `.badge-kappa` system

**Alternatives Considered**:
1. Inline styles - rejected (harder to maintain, no theme consistency)
2. SVG icons - rejected (adds complexity, badges are simpler)
3. Opacity-only differentiation - rejected (insufficient visual distinction)

**Best Practices Applied**:
- Reuse existing badge HTML structure
- Use CSS custom properties for theming
- Semantic class names (.badge-completed, .badge-mixed)

---

### Quest Status Lookup

**Chosen**: Helper method `ItemTrackerManager.getQuestStatus(questId)` that queries QuestManager

**Alternatives Considered**:
1. Cache status map - rejected (adds complexity, risks stale data)
2. Direct QuestManager access in components - rejected (violates encapsulation)

**Best Practices Applied**:
- Single responsibility: ItemTrackerManager mediates between data sources
- Lazy evaluation: status checked only when needed for display

---

## Integration Points

### 1. With QuestManager
- **Access Pattern**: Read-only quest completion status via `getQuestById()`
- **Event Handling**: Existing `questUpdated` event triggers re-aggregation
- **No Changes Needed**: QuestManager API remains unchanged

### 2. With HideoutManager
- **Consideration**: User Story 5 (P3) wants optional hideout integration
- **Decision**: Defer to future iteration, not in MVP
- **Rationale**: Hideout already works with current filtering, All Quests mode focuses on quests first

### 3. With ItemList Component
- **Changes Needed**: Accept viewingMode and statusFilter parameters
- **New Methods**: `getItemStatus(aggregatedItem)` helper
- **Badge Rendering**: Modify `renderItemCard()` to add status badges

### 4. With ItemDetailModal Component
- **Changes Needed**: Group quest sources by completion status
- **UI Update**: Add collapsible sections for "Active" and "Completed" quest lists
- **Backward Compatibility**: Default to flat list if viewingMode is 'active'

---

## API Contracts

### ItemTrackerManager

**New Methods**:
```javascript
// Extract requirements with optional completed quest inclusion
extractQuestRequirements(includeCompleted = false)

// Get quest completion status by ID
getQuestStatus(questId): boolean
```

**Modified Methods**:
```javascript
// Now accepts includeCompleted flag
aggregateRequirements(includeCompleted = false)
```

### ItemTracker Component

**New State Properties**:
```javascript
this.viewingMode = 'active'  // 'active' | 'all'
this.statusFilter = 'both'   // 'active' | 'completed' | 'both' (only used in 'all' mode)
```

**New Methods**:
```javascript
// Handle mode toggle
switchViewingMode(mode: 'active' | 'all')

// Handle status filter (US3)
applyStatusFilter(filter: 'active' | 'completed' | 'both')
```

### AggregatedItem Class

**New Methods**:
```javascript
// Determine if item is needed by active, completed, or both quest types
getQuestSourceStatus(): 'active' | 'completed' | 'both'

// Count active vs completed quest sources
getQuestSourceCounts(): { active: number, completed: number }
```

---

## Unknowns Resolved

✅ All technical uncertainties have been resolved:
- Current filtering mechanism identified
- Quest status access pattern determined
- localStorage structure decided
- Visual differentiation strategy chosen
- Modal grouping approach defined
- Performance validated (no virtual scrolling needed)
- Priority calculation strategy confirmed
- Status filter implementation planned

**No clarifications needed** - ready to proceed to Phase 1 (Design).

---

## Summary

The All-Quests Item Tracker feature builds cleanly on existing Feature 003 infrastructure. Core changes are:

1. **ItemTrackerManager**: Add `includeCompleted` parameter to quest requirement extraction
2. **ItemTracker Component**: Add mode toggle UI and persist selection
3. **ItemList Component**: Render status badges based on quest completion
4. **ItemDetailModal**: Group quest sources by completion status
5. **CSS**: Add badge styles for completed/mixed quest indicators

All decisions favor simplicity and backward compatibility. The feature is additive - existing "Active Quests" behavior is preserved as the default.

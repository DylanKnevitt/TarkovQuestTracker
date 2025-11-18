# Data Model: All-Quests Item Tracker View

**Feature**: 006-all-quests-item-tracker  
**Phase**: 1 - Design & Contracts  
**Date**: November 18, 2025

## Overview

This document defines the data structures and state management for the All-Quests viewing mode enhancement. The feature adds minimal new entities, primarily extending existing classes with optional parameters and status tracking.

## Enums

### ViewingMode

Represents the two viewing modes for the Item Tracker.

```javascript
const ViewingMode = {
    ACTIVE: 'active',     // Show items from incomplete quests only (current behavior)
    ALL: 'all'            // Show items from all quests (completed + incomplete)
};
```

**Usage**: Stored in localStorage as part of `item-tracker-filters` object.

---

### ItemStatus

Indicates whether an item is needed by active, completed, or both quest types.

```javascript
const ItemStatus = {
    ACTIVE: 'active',          // Only needed by incomplete quests
    COMPLETED: 'completed',    // Only needed by completed quests
    BOTH: 'both'               // Needed by both active and completed quests
};
```

**Usage**: Calculated dynamically for each AggregatedItem when rendering in All Quests mode.

---

### StatusFilter

Filter option available within All Quests mode (User Story 3 - P2).

```javascript
const StatusFilter = {
    ACTIVE: 'active',         // Show only items from incomplete quests
    COMPLETED: 'completed',   // Show only items from completed quests
    BOTH: 'both'              // Show items from all quests (default)
};
```

**Usage**: Stored in localStorage, only applies when ViewingMode is 'all'.

---

## Extended Classes

### AggregatedItem (Enhancement)

**Location**: `src/models/item.js`

**New Methods**:

```javascript
class AggregatedItem {
    // ... existing properties ...
    
    /**
     * Get the completion status of quest sources
     * @param {QuestManager} questManager - Needed to check quest completion
     * @returns {ItemStatus} - 'active', 'completed', or 'both'
     */
    getQuestSourceStatus(questManager) {
        let hasActive = false;
        let hasCompleted = false;
        
        for (const req of this.requirements) {
            if (req.source.type === 'quest') {
                const quest = questManager.getQuestById(req.source.id);
                if (quest) {
                    if (quest.completed) {
                        hasCompleted = true;
                    } else {
                        hasActive = true;
                    }
                }
            }
        }
        
        if (hasActive && hasCompleted) return ItemStatus.BOTH;
        if (hasActive) return ItemStatus.ACTIVE;
        if (hasCompleted) return ItemStatus.COMPLETED;
        return ItemStatus.ACTIVE; // Default
    }
    
    /**
     * Get counts of active vs completed quest sources
     * @param {QuestManager} questManager
     * @returns {{ active: number, completed: number }}
     */
    getQuestSourceCounts(questManager) {
        let active = 0;
        let completed = 0;
        
        for (const req of this.requirements) {
            if (req.source.type === 'quest') {
                const quest = questManager.getQuestById(req.source.id);
                if (quest) {
                    if (quest.completed) {
                        completed++;
                    } else {
                        active++;
                    }
                }
            }
        }
        
        return { active, completed };
    }
    
    /**
     * Check if item has any quest sources
     * @returns {boolean}
     */
    hasQuestSources() {
        return this.requirements.some(req => req.source.type === 'quest');
    }
}
```

**Rationale**: These methods encapsulate status logic, making it reusable across components. They accept QuestManager as a parameter to avoid tight coupling.

---

## Modified Classes

### ItemTrackerManager (Core Changes)

**Location**: `src/models/item-tracker-manager.js`

**Modified Methods**:

```javascript
class ItemTrackerManager {
    // ... existing constructor and properties ...
    
    /**
     * MODIFIED: Extract item requirements from quest objectives
     * @param {boolean} includeCompleted - If true, include completed quests
     * @returns {Array<ItemRequirement>}
     */
    extractQuestRequirements(includeCompleted = false) {
        const requirements = [];
        
        for (const quest of this.questManager.quests) {
            // Skip completed quests UNLESS includeCompleted is true
            if (!includeCompleted && quest.completed) {
                continue;
            }
            
            // ... rest of existing extraction logic (unchanged) ...
        }
        
        return requirements;
    }
    
    /**
     * MODIFIED: Aggregate requirements from quests and hideout
     * @param {boolean} includeCompleted - If true, include completed quests
     */
    aggregateRequirements(includeCompleted = false) {
        this.aggregatedItems.clear();

        // Extract requirements from quests and hideout
        const requirements = [
            ...this.extractQuestRequirements(includeCompleted),  // Pass flag through
            ...this.extractHideoutRequirements()
        ];

        // ... rest of existing aggregation logic (unchanged) ...
    }
    
    /**
     * NEW: Get quest completion status by ID
     * @param {string} questId
     * @returns {boolean} - True if quest is completed
     */
    getQuestStatus(questId) {
        const quest = this.questManager.getQuestById(questId);
        return quest ? quest.completed : false;
    }
    
    /**
     * MODIFIED: Refresh aggregated items
     * @param {boolean} includeCompleted - Viewing mode flag
     */
    refresh(includeCompleted = false) {
        this.aggregateRequirements(includeCompleted);
        this.calculatePriorities();
    }
}
```

**Key Changes**:
- `extractQuestRequirements()` accepts optional `includeCompleted` parameter
- `aggregateRequirements()` passes flag through to extraction
- New `getQuestStatus()` helper for components
- `refresh()` accepts flag for re-aggregation

---

### ItemTracker Component (State Management)

**Location**: `src/components/item-tracker.js`

**New State Properties**:

```javascript
class ItemTracker {
    constructor(questManager, hideoutManager, itemTrackerManager) {
        // ... existing properties ...
        
        this.currentFilter = 'all';
        this.hideCollected = false;
        this.currentSubtab = 'items';
        
        // NEW: Viewing mode state
        this.viewingMode = ViewingMode.ACTIVE;      // Default to active mode
        this.statusFilter = StatusFilter.BOTH;      // Default to show both (only used in 'all' mode)
        
        this.STORAGE_KEY = 'item-tracker-filters';
    }
}
```

**New/Modified Methods**:

```javascript
class ItemTracker {
    /**
     * MODIFIED: Load saved filter state from localStorage
     */
    loadFilters() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                const filters = JSON.parse(saved);
                this.currentFilter = filters.category || 'all';
                this.hideCollected = filters.hideCollected || false;
                this.viewingMode = filters.viewingMode || ViewingMode.ACTIVE;  // NEW
                this.statusFilter = filters.statusFilter || StatusFilter.BOTH;  // NEW
            } catch (e) {
                console.error('Failed to load filters:', e);
            }
        }
    }
    
    /**
     * MODIFIED: Save current filter state to localStorage
     */
    saveFilters() {
        const filters = {
            category: this.currentFilter,
            hideCollected: this.hideCollected,
            viewingMode: this.viewingMode,        // NEW
            statusFilter: this.statusFilter       // NEW
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filters));
    }
    
    /**
     * NEW: Switch viewing mode and refresh display
     * @param {string} mode - ViewingMode.ACTIVE or ViewingMode.ALL
     */
    async switchViewingMode(mode) {
        this.viewingMode = mode;
        this.saveFilters();
        
        // Re-aggregate items with new mode
        const includeCompleted = (mode === ViewingMode.ALL);
        await this.itemTrackerManager.refresh(includeCompleted);
        
        // Re-render UI
        this.applyFilters();
    }
    
    /**
     * NEW: Apply status filter (User Story 3 - P2)
     * @param {string} filter - StatusFilter value
     */
    applyStatusFilter(filter) {
        this.statusFilter = filter;
        this.saveFilters();
        this.applyFilters();
    }
}
```

---

### ItemList Component (Rendering)

**Location**: `src/components/item-list.js`

**Modified Methods**:

```javascript
class ItemList {
    /**
     * MODIFIED: Apply filters to item list
     * @param {string} categoryFilter - 'all', 'quest', 'hideout', 'keys'
     * @param {boolean} hideCollected
     * @param {string} viewingMode - ViewingMode value
     * @param {string} statusFilter - StatusFilter value
     */
    applyFilters(categoryFilter, hideCollected, viewingMode, statusFilter) {
        let items = this.getFilteredItems(categoryFilter);
        
        // NEW: Apply status filter in All Quests mode
        if (viewingMode === ViewingMode.ALL && statusFilter !== StatusFilter.BOTH) {
            items = items.filter(item => {
                const status = item.getQuestSourceStatus(this.itemTrackerManager.questManager);
                
                if (statusFilter === StatusFilter.ACTIVE) {
                    return status !== ItemStatus.COMPLETED;
                }
                if (statusFilter === StatusFilter.COMPLETED) {
                    return status === ItemStatus.COMPLETED;
                }
                return true;
            });
        }
        
        // Existing hide collected filter
        if (hideCollected) {
            items = items.filter(item => !item.collected);
        }
        
        this.renderItems(items, viewingMode);
    }
    
    /**
     * MODIFIED: Render individual item card with status badges
     * @param {AggregatedItem} item
     * @param {string} viewingMode
     * @returns {string} HTML string
     */
    renderItemCard(item, viewingMode) {
        const priorityClass = item.priority === Priority.NEEDED_SOON ? 'priority-soon' : 'priority-later';
        
        // NEW: Status badge in All Quests mode
        let statusBadgeHTML = '';
        if (viewingMode === ViewingMode.ALL && item.hasQuestSources()) {
            const status = item.getQuestSourceStatus(this.itemTrackerManager.questManager);
            const counts = item.getQuestSourceCounts(this.itemTrackerManager.questManager);
            
            if (status === ItemStatus.COMPLETED) {
                statusBadgeHTML = `<span class="badge badge-completed">Completed</span>`;
            } else if (status === ItemStatus.BOTH) {
                statusBadgeHTML = `<span class="badge badge-mixed">${counts.active} Active, ${counts.completed} Completed</span>`;
            }
            // No badge for ItemStatus.ACTIVE (current behavior)
        }
        
        return `
            <div class="item-card ${priorityClass} ${item.collected ? 'collected' : ''}" data-item-id="${item.item.id}">
                <div class="item-header">
                    <img src="${item.item.iconLink}" alt="${item.item.name}" class="item-icon">
                    <div class="item-info">
                        <h3 class="item-name">${item.item.name}</h3>
                        <span class="item-quantity">x${item.totalQuantity}</span>
                    </div>
                </div>
                <div class="item-badges">
                    ${statusBadgeHTML}
                    ${item.isFiR ? '<span class="badge badge-fir">FiR</span>' : ''}
                    <span class="badge badge-priority">${item.priority}</span>
                </div>
                <!-- ... rest of existing card HTML ... -->
            </div>
        `;
    }
}
```

---

### ItemDetailModal Component (Quest Grouping)

**Location**: `src/components/item-detail-modal.js`

**Modified Methods**:

```javascript
class ItemDetailModal {
    /**
     * MODIFIED: Render quest sources with grouping in All Quests mode
     * @param {Array<ItemRequirement>} questRequirements
     * @param {string} viewingMode
     * @param {QuestManager} questManager
     * @returns {string} HTML string
     */
    renderQuestSources(questRequirements, viewingMode, questManager) {
        if (viewingMode === ViewingMode.ACTIVE) {
            // Current behavior: flat list
            return this.renderSourceList(questRequirements);
        }
        
        // NEW: Group by completion status in All Quests mode
        const activeReqs = [];
        const completedReqs = [];
        
        for (const req of questRequirements) {
            const quest = questManager.getQuestById(req.source.id);
            if (quest && quest.completed) {
                completedReqs.push(req);
            } else {
                activeReqs.push(req);
            }
        }
        
        let html = '';
        
        if (activeReqs.length > 0) {
            html += `<h4 class="source-group-header">Active Quests</h4>`;
            html += this.renderSourceList(activeReqs);
        }
        
        if (completedReqs.length > 0) {
            html += `<h4 class="source-group-header completed">Completed Quests</h4>`;
            html += this.renderSourceList(completedReqs);
        }
        
        return html;
    }
    
    /**
     * Render a list of requirements (existing helper, reused)
     * @param {Array<ItemRequirement>} requirements
     * @returns {string} HTML string
     */
    renderSourceList(requirements) {
        return requirements.map(req => `
            <div class="requirement-source">
                <span class="source-quest">${req.source.name}</span>
                <span class="source-quantity">x${req.quantity}</span>
                ${req.isFiR ? '<span class="fir-indicator">FiR</span>' : ''}
            </div>
        `).join('');
    }
}
```

---

## LocalStorage Schema

### item-tracker-filters

**Structure**:

```javascript
{
    category: string,           // 'all' | 'quest' | 'hideout' | 'keys'
    hideCollected: boolean,     // true to hide collected items
    viewingMode: string,        // 'active' | 'all' (NEW)
    statusFilter: string        // 'active' | 'completed' | 'both' (NEW)
}
```

**Example**:

```json
{
    "category": "quest",
    "hideCollected": false,
    "viewingMode": "all",
    "statusFilter": "both"
}
```

**Backward Compatibility**: If `viewingMode` or `statusFilter` are missing, defaults to 'active' and 'both' respectively.

---

## State Transitions

### Viewing Mode Toggle

```
Initial State: ViewingMode.ACTIVE (default)
│
├─ User clicks "All Quests" toggle
│  ├─ Set this.viewingMode = ViewingMode.ALL
│  ├─ Call itemTrackerManager.refresh(includeCompleted=true)
│  ├─ Re-aggregate items (includes completed quest items)
│  ├─ Save to localStorage
│  └─ Re-render UI with status badges
│
└─ User clicks "Active Quests" toggle
   ├─ Set this.viewingMode = ViewingMode.ACTIVE
   ├─ Call itemTrackerManager.refresh(includeCompleted=false)
   ├─ Re-aggregate items (excludes completed quests)
   ├─ Save to localStorage
   └─ Re-render UI (no status badges)
```

### Status Filter Change (in All Quests mode)

```
Current State: ViewingMode.ALL, StatusFilter.BOTH
│
├─ User selects "Show Active Only"
│  ├─ Set this.statusFilter = StatusFilter.ACTIVE
│  ├─ Filter items: keep only status !== 'completed'
│  ├─ Save to localStorage
│  └─ Re-render filtered list
│
├─ User selects "Show Completed Only"
│  ├─ Set this.statusFilter = StatusFilter.COMPLETED
│  ├─ Filter items: keep only status === 'completed'
│  ├─ Save to localStorage
│  └─ Re-render filtered list
│
└─ User selects "Show Both" (default)
   ├─ Set this.statusFilter = StatusFilter.BOTH
   ├─ No filtering (show all)
   ├─ Save to localStorage
   └─ Re-render full list
```

---

## Data Flow Diagram

```
┌──────────────────┐
│   User Action    │  (Toggle viewing mode)
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│  ItemTracker Component   │
│  - switchViewingMode()   │
│  - Save to localStorage  │
└────────┬─────────────────┘
         │
         ▼
┌───────────────────────────────────┐
│   ItemTrackerManager              │
│   - refresh(includeCompleted)     │
│   - extractQuestRequirements()    │  ◄─── Queries QuestManager
│   - aggregateRequirements()       │       for quest.completed
└────────┬──────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  AggregatedItem instances    │
│  - getQuestSourceStatus()    │  ◄─── Calculates status
│  - getQuestSourceCounts()    │       based on quest completion
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────┐
│   ItemList           │
│   - applyFilters()   │
│   - renderItemCard() │ ◄─── Adds status badges
└────────┬─────────────┘
         │
         ▼
┌────────────────────┐
│   Rendered DOM     │
│   (with badges)    │
└────────────────────┘
```

---

## Validation Rules

### ViewingMode
- Must be one of: 'active', 'all'
- Default: 'active'
- Persists across sessions

### StatusFilter
- Must be one of: 'active', 'completed', 'both'
- Default: 'both'
- Only applies when viewingMode === 'all'
- Reset to 'both' when switching back to 'active' mode

### Status Badge Display
- Show badge only when:
  - viewingMode === 'all' AND
  - item.hasQuestSources() === true
- Badge type determined by getQuestSourceStatus()

---

## Summary

The data model introduces minimal new structures (enums for ViewingMode, ItemStatus, StatusFilter) and extends existing classes with optional behavior. Key design principles:

1. **Backward Compatibility**: Default to 'active' mode preserves current behavior
2. **Encapsulation**: Status logic lives in AggregatedItem methods
3. **Single Responsibility**: ItemTrackerManager mediates between QuestManager and components
4. **Stateless Calculations**: Status determined on-demand from Quest.completed properties
5. **Persistence**: ViewingMode and StatusFilter stored with existing filter preferences

No database changes needed - all state is client-side localStorage.

# Research Phase - Item Tracker

**Date**: 2025-11-16 | **Feature**: 003-item-tracker

## Overview

This document resolves all "NEEDS CLARIFICATION" items from Technical Context and provides implementation guidance for the Item Tracker feature.

---

## Research Task 1: Tarkov.dev API Items Query Schema

**Question**: What fields are available in the Tarkov.dev GraphQL `items` query for extracting item data?

**Findings**:

Tarkov.dev API provides an `items` query with the following relevant fields:

```graphql
query {
  items {
    id
    name
    shortName
    iconLink
    wikiLink
    types          # Array of item categories: "keys", "mods", "ammo", etc.
    usedInTasks {
      id
      name
      trader {
        name
      }
      minPlayerLevel
      taskRequirements {
        task {
          id
        }
      }
    }
    hideoutModules {  # Not directly available - need hideoutStations query
      id
      name
    }
  }
}
```

**Key Insights**:
- `types` array can be used to filter Keys (type="keys")
- `usedInTasks` provides quest context with trader and level requirements
- Quest objectives with item requirements are nested in task data
- No direct FiR indicator - must check quest objective type

**Decision**: Use `items` query to build item catalog, cross-reference with `tasks` query (already fetched) to get quest objectives and FiR requirements. Filter hideout items separately using `hideoutStations` query.

**Alternatives Considered**:
- Fetch only from tasks query: Insufficient - misses hideout items and keys not in quests
- Use third-party item database: Rejected - adds dependency and sync issues

---

## Research Task 2: Hideout Stations Query Structure

**Question**: How does the `hideoutStations` query return level requirements and item dependencies?

**Findings**:

```graphql
query {
  hideoutStations {
    id
    name
    levels {
      level
      itemRequirements {
        item {
          id
          name
          iconLink
        }
        count
      }
      stationLevelRequirements {
        station {
          id
          name
        }
        level
      }
    }
  }
}
```

**Key Insights**:
- Each station has multiple levels (0-3 typically)
- Each level has `itemRequirements` array with item + count
- `stationLevelRequirements` defines dependencies (e.g., "Lavatory level 2 requires Generator level 1")
- No "completed" status in API - must track locally

**Decision**: Fetch `hideoutStations` once at app init, cache for 24 hours. Store hideout module completion status in new localStorage key: `tarkov-hideout-progress` (JSON object: `{ "stationId-level": true/false }`). Calculate which items are needed based on incomplete modules with satisfied prerequisites.

**Alternatives Considered**:
- Store per-item hideout requirements: Rejected - complex sync with API changes
- Skip hideout tracking MVP: Considered but spec requires it (FR-002)

---

## Research Task 3: Priority Calculation Algorithm

**Question**: How to determine "NEEDED SOON" vs "NEEDED LATER" for items based on quest unlock status?

**Findings**:

Priority depends on:
1. **Quest Items**: Quest is unlocked (player level >= minLevel AND all prerequisites completed)
2. **Hideout Items**: Hideout module can be built now (all station prerequisites completed)

**Algorithm**:

```javascript
function calculateItemPriority(item, questManager, hideoutManager) {
  // Check if item needed for any unlocked quest
  for (const quest of item.requiredByQuests) {
    if (questManager.isQuestUnlocked(quest.id) && !questManager.isQuestCompleted(quest.id)) {
      return Priority.NEEDED_SOON;
    }
  }
  
  // Check if item needed for any buildable hideout module
  for (const module of item.requiredByHideout) {
    if (hideoutManager.isModuleBuildable(module.stationId, module.level) && 
        !hideoutManager.isModuleCompleted(module.stationId, module.level)) {
      return Priority.NEEDED_SOON;
    }
  }
  
  return Priority.NEEDED_LATER;
}

// Quest unlock check (existing in QuestManager)
isQuestUnlocked(questId) {
  const quest = this.getQuestById(questId);
  const playerLevel = 79; // Default to max for MVP
  return quest.minLevel <= playerLevel && 
         quest.prerequisites.every(id => this.completedQuests.has(id));
}

// Hideout module buildable check (new HideoutManager)
isModuleBuildable(stationId, level) {
  const station = this.getStation(stationId);
  const levelData = station.levels.find(l => l.level === level);
  
  return levelData.stationLevelRequirements.every(req => 
    this.isModuleCompleted(req.station.id, req.level)
  );
}
```

**Decision**: Implement priority calculation in new `PriorityService` class. Re-calculate whenever quest completion changes (listen to `questUpdated` event). Items appear in tracker only if priority is NEEDED_SOON or NEEDED_LATER (exclude if quest/module already completed).

**Alternatives Considered**:
- Three-tier priority (URGENT, SOON, LATER): Rejected - spec defines two levels only
- Time-based priority (days until quest unlock): Rejected - no date tracking in app

---

## Research Task 4: FiR (Found in Raid) Detection

**Question**: How to identify which quest objectives require FiR status from API data?

**Findings**:

Quest objectives have a `type` field indicating objective category:
- `"findQuestItem"` - Always requires FiR (quest-specific item)
- `"giveQuestItem"` - May or may not require FiR (check `optional` field)
- `"collect"` - Sometimes requires FiR (check quest notes)

FiR requirements are embedded in objective descriptions (e.g., "Hand over 5 FIR Golden Star balms").

**API Structure**:

```graphql
task {
  objectives {
    id
    type
    description
    optional
    target  # Item ID if applicable
  }
}
```

**Decision**: Mark item as FiR-required if:
1. Objective type is `"findQuestItem"`, OR
2. Objective description contains "FIR" or "found in raid" (case-insensitive regex)

Display FiR indicator as small badge icon (🔍 or "FiR" text) on item card.

**Alternatives Considered**:
- Maintain manual FiR list: Rejected - high maintenance, API changes break it
- Skip FiR indicator for MVP: Considered but spec explicitly requires it (FR-015)

---

## Research Task 5: Item Deduplication Strategy

**Question**: How to handle items needed by multiple quests - sum quantities and show all sources?

**Findings**:

Same item can appear in:
- Multiple quest objectives (different quests or same quest)
- Multiple hideout module levels
- Both quest AND hideout requirements

**Strategy**:

```javascript
class ItemRequirement {
  constructor(item, source, quantity, isFiR) {
    this.itemId = item.id;
    this.source = source;  // { type: "quest"|"hideout", id: questId|moduleKey, name: displayName }
    this.quantity = quantity;
    this.isFiR = isFiR;
  }
}

// Aggregate items by ID
const itemsMap = new Map();
for (const req of allRequirements) {
  if (!itemsMap.has(req.itemId)) {
    itemsMap.set(req.itemId, {
      item: req.item,
      totalQuantity: 0,
      sources: [],
      isFiR: false
    });
  }
  
  const itemData = itemsMap.get(req.itemId);
  itemData.totalQuantity += req.quantity;
  itemData.sources.push(req.source);
  itemData.isFiR = itemData.isFiR || req.isFiR;  // If ANY source needs FiR, mark as FiR
}
```

**Display**:
- Item card shows total quantity: "Bolts x10"
- Item card subtitle lists sources: "Needed for: Gunsmith Part 1, Lavatory Level 2"
- FiR badge shown if ANY requirement needs FiR

**Decision**: Use Map-based deduplication with array of sources. Item card click opens detail modal showing breakdown per quest/module.

**Alternatives Considered**:
- Show duplicate item cards: Rejected - clutters UI, confusing
- Only show highest quantity: Rejected - loses context of multiple sources

---

## Research Task 6: Hideout Completion Tracking

**Question**: Should hideout tracking use new localStorage structure or extend existing quest tracking pattern?

**Findings**:

Existing quest tracking uses:
- `tarkov-quest-progress`: Array of completed quest IDs
- `QuestManager.completedQuests`: Set of IDs

Hideout tracking needs:
- Station + level combination (e.g., "generator-1", "lavatory-2")
- Separate from quest completion to avoid confusion

**Decision**: Create new localStorage key `tarkov-hideout-progress` with structure:

```javascript
{
  "generator-1": true,
  "lavatory-2": true,
  "stash-3": false
}
```

Create new `HideoutManager` class similar to `QuestManager`:

```javascript
class HideoutManager {
  constructor() {
    this.stations = [];
    this.completedModules = new Map();  // Key: "stationId-level", Value: boolean
  }
  
  async loadProgress() {
    const data = localStorage.getItem('tarkov-hideout-progress');
    if (data) {
      const progress = JSON.parse(data);
      this.completedModules = new Map(Object.entries(progress));
    }
  }
  
  async toggleModuleComplete(stationId, level) {
    const key = `${stationId}-${level}`;
    const wasCompleted = this.completedModules.get(key);
    this.completedModules.set(key, !wasCompleted);
    
    const progressObj = Object.fromEntries(this.completedModules);
    localStorage.setItem('tarkov-hideout-progress', JSON.stringify(progressObj));
    
    document.dispatchEvent(new Event('hideoutUpdated'));
  }
}
```

**Alternatives Considered**:
- Extend quest progress array with hideout IDs: Rejected - type confusion
- Use Supabase for hideout tracking: Rejected - MVP should work offline-first

---

## Best Practices Applied

### 1. API Integration Pattern

Following existing `tarkov-api.js` pattern:

```javascript
// tarkov-items-api.js
export async function fetchItems() {
  const cacheKey = 'tarkov-items-cache';
  const cacheTimeKey = 'tarkov-items-cache-time';
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  const cachedTime = localStorage.getItem(cacheTimeKey);
  if (cachedTime && Date.now() - parseInt(cachedTime) < CACHE_DURATION) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  }
  
  const response = await fetch('https://api.tarkov.dev/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: ITEMS_QUERY })
  });
  
  const data = await response.json();
  localStorage.setItem(cacheKey, JSON.stringify(data.data.items));
  localStorage.setItem(cacheTimeKey, Date.now().toString());
  
  return data.data.items;
}
```

**Rationale**: Consistent caching strategy across API calls, reduces load times per SC-001.

### 2. Component Lifecycle Pattern

Following existing component structure (from `user-comparison.js`):

```javascript
export class ItemTracker {
  constructor(container, questManager, hideoutManager) {
    this.container = container;
    this.questManager = questManager;
    this.hideoutManager = hideoutManager;
    this.filters = {
      category: 'all',  // 'all', 'quest', 'hideout', 'keys'
      hideCollected: false
    };
  }
  
  async initialize() {
    await this.loadItems();
    this.setupEventListeners();
    this.render();
  }
  
  async loadItems() {
    const [items, hideoutStations] = await Promise.all([
      fetchItems(),
      fetchHideoutStations()
    ]);
    
    this.itemRequirements = this.aggregateItemRequirements(items, hideoutStations);
  }
  
  render() {
    const filteredItems = this.applyFilters(this.itemRequirements);
    this.container.innerHTML = this.generateHTML(filteredItems);
  }
}
```

**Rationale**: Matches existing component initialization in `src/index.js`, enables consistent tab switching behavior.

### 3. Event-Driven Updates

Listen to existing events for reactivity:

```javascript
setupEventListeners() {
  document.addEventListener('questUpdated', () => {
    this.recalculatePriorities();
    this.render();
  });
  
  document.addEventListener('hideoutUpdated', () => {
    this.recalculatePriorities();
    this.render();
  });
}
```

**Rationale**: Keeps item list in sync with quest completion without manual refresh per FR-008.

---

## Technical Decisions Summary

| Decision | Rationale | Alternatives Rejected |
|----------|-----------|----------------------|
| Use `items` + `tasks` + `hideoutStations` queries | Complete coverage of all item sources | Single query approach (incomplete data) |
| Map-based item deduplication | Efficient aggregation, preserves all sources | Duplicate cards (clutter), single source (data loss) |
| Separate `HideoutManager` class | Clean separation of concerns, follows `QuestManager` pattern | Extend QuestManager (coupling), inline logic (duplication) |
| Priority enum (NEEDED_SOON / NEEDED_LATER) | Simple, spec-compliant | Three-tier priority (spec only defines two) |
| FiR detection via regex + objective type | Best available without manual list | Manual FiR list (high maintenance) |
| 24-hour API cache | Balances freshness vs performance per FR-014 | No cache (slow), 7-day cache (stale data) |
| New localStorage key for hideout | Avoids type confusion with quest IDs | Extend quest progress (coupling) |

---

## Open Questions for Implementation Phase

1. **Player Level Tracking**: Should app track actual player level or default to 79 (max) for priority calculation? *Recommendation: Default to 79 for MVP, add level selector in future.*

2. **Item Collection UI**: Checkbox or toggle button for marking collected? *Recommendation: Checkbox for familiarity, follows standard pattern.*

3. **Empty State**: What to show when all items collected? *Recommendation: "All items collected! ✅" message with option to show collected items.*

4. **Filter Persistence**: Should filter selections persist across sessions? *Recommendation: Yes, store in localStorage for UX consistency.*

5. **Hideout UI Location**: Should hideout module completion be tracked in item tracker or separate tab? *Recommendation: Add checkboxes to item card detail modal for hideout modules (inline with item context).*

---

**Research Phase Complete** ✅  
All NEEDS CLARIFICATION items resolved. Ready for Phase 1 (Design).

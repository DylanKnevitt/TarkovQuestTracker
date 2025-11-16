# Data Model - Item Tracker

**Date**: 2025-11-16 | **Feature**: 003-item-tracker

## Overview

This document defines the data structures for the Item Tracker feature, including entity relationships, validation rules, and state management.

---

## Core Entities

### 1. Item

Represents a game item that can be required for quests or hideout modules.

**Properties**:

```javascript
class Item {
  id: string;              // Tarkov.dev API ID (e.g., "5d1b371186f774253763a656")
  name: string;            // Full item name (e.g., "Military power filter")
  shortName: string;       // Abbreviated name (e.g., "MilPowerFilter")
  iconLink: string;        // URL to item icon image
  wikiLink: string;        // URL to Tarkov wiki page
  types: string[];         // Item categories (e.g., ["barter", "keys"])
}
```

**Validation Rules**:
- `id` must be non-empty string
- `name` must be non-empty string
- `iconLink` should be valid URL or fallback to placeholder
- `types` array determines filter category (contains "keys" → Keys filter)

**Source**: Fetched from Tarkov.dev API `items` query

---

### 2. ItemRequirement

Links an item to a specific quest objective or hideout module upgrade, with quantity and FiR status.

**Properties**:

```javascript
class ItemRequirement {
  itemId: string;          // Reference to Item.id
  source: {
    type: 'quest' | 'hideout';
    id: string;            // Quest ID or "stationId-level" key
    name: string;          // Display name (quest name or "Generator Level 2")
  };
  quantity: number;        // How many needed (e.g., 10 for "Bolts x10")
  isFiR: boolean;          // Whether Found in Raid status required
  
  constructor(itemId, source, quantity, isFiR) {
    this.itemId = itemId;
    this.source = source;
    this.quantity = quantity;
    this.isFiR = isFiR;
  }
}
```

**Validation Rules**:
- `quantity` must be positive integer
- `source.type` must be 'quest' or 'hideout'
- If `source.type === 'quest'`, `source.id` must match a quest ID in QuestManager
- If `source.type === 'hideout'`, `source.id` must match "{stationId}-{level}" format

**Relationships**:
- Many-to-one with Item (multiple requirements can reference same item)
- One-to-one with Quest or HideoutModule (via source.id)

---

### 3. AggregatedItem

Combines all requirements for a single item with priority calculation.

**Properties**:

```javascript
class AggregatedItem {
  item: Item;                        // The actual item data
  totalQuantity: number;              // Sum of all requirement quantities
  sources: Array<{
    type: 'quest' | 'hideout';
    id: string;
    name: string;
  }>;
  isFiR: boolean;                     // True if ANY source requires FiR
  priority: Priority;                 // NEEDED_SOON or NEEDED_LATER
  collected: boolean;                 // User's collection status
  collectedQuantity: number;          // How many user has collected
}
```

**Derived Fields**:
- `totalQuantity` = sum of all ItemRequirement.quantity for this item
- `isFiR` = logical OR of all ItemRequirement.isFiR for this item
- `priority` = calculated by PriorityService based on quest/hideout unlock status
- `collected` / `collectedQuantity` = loaded from ItemStorageService

**Example**:

```javascript
{
  item: { id: "5c0d5e4486f77478390952fe", name: "Cordura polyamide fabric", ... },
  totalQuantity: 15,  // 5 for Lavatory-2 + 10 for Ragman quest
  sources: [
    { type: 'hideout', id: 'lavatory-2', name: 'Lavatory Level 2' },
    { type: 'quest', id: '5ae3277186f7745973054106', name: 'Charisma brings success' }
  ],
  isFiR: false,
  priority: Priority.NEEDED_SOON,
  collected: false,
  collectedQuantity: 0
}
```

---

### 4. Priority (Enum)

Represents urgency of item acquisition based on quest/hideout unlock status.

**Values**:

```javascript
const Priority = {
  NEEDED_SOON: 'NEEDED_SOON',    // Item required for unlocked/buildable content
  NEEDED_LATER: 'NEEDED_LATER'   // Item only required for locked content
};
```

**Calculation Logic** (see PriorityService):

```
NEEDED_SOON if:
  - Item required by quest that is unlocked (level met + prerequisites completed) AND not completed
  OR
  - Item required by hideout module that is buildable (station prerequisites met) AND not completed

NEEDED_LATER otherwise
```

**Display Mapping**:
- `NEEDED_SOON` → Red/orange badge, "⚠️ Needed Soon" label
- `NEEDED_LATER` → Blue/gray badge, "🕐 Needed Later" label

---

### 5. HideoutModule

Represents a hideout station upgrade level with prerequisites and item requirements.

**Properties**:

```javascript
class HideoutModule {
  stationId: string;           // Station ID (e.g., "generator")
  stationName: string;         // Display name (e.g., "Generator")
  level: number;               // Module level (0-3 typically)
  itemRequirements: Array<{
    itemId: string;
    quantity: number;
  }>;
  stationLevelRequirements: Array<{
    stationId: string;
    level: number;
  }>;
  completed: boolean;          // User's completion status (from HideoutManager)
}
```

**Validation Rules**:
- `level` must be non-negative integer
- `stationLevelRequirements` defines prerequisite modules that must be completed first

**Source**: Fetched from Tarkov.dev API `hideoutStations` query

**Example**:

```javascript
{
  stationId: "lavatory",
  stationName: "Lavatory",
  level: 2,
  itemRequirements: [
    { itemId: "5c0d5e4486f77478390952fe", quantity: 5 },  // Cordura fabric
    { itemId: "590c5d4b86f774784e1b9c45", quantity: 2 }   // Power filter
  ],
  stationLevelRequirements: [
    { stationId: "generator", level: 1 }  // Requires Generator Level 1
  ],
  completed: false
}
```

---

## Manager Classes

### ItemTrackerManager

Orchestrates item aggregation, filtering, and priority updates.

**Responsibilities**:
- Fetch items from API
- Fetch hideout stations from API
- Extract item requirements from quests (via QuestManager)
- Extract item requirements from hideout modules
- Deduplicate items by ID
- Trigger priority recalculation on quest/hideout updates

**Methods**:

```javascript
class ItemTrackerManager {
  constructor(questManager, hideoutManager) {
    this.questManager = questManager;
    this.hideoutManager = hideoutManager;
    this.itemsMap = new Map();  // Item.id → AggregatedItem
  }
  
  async initialize() {
    await Promise.all([
      this.loadItems(),
      this.loadHideoutStations()
    ]);
    this.aggregateRequirements();
    this.calculatePriorities();
  }
  
  aggregateRequirements() {
    // Combine quest and hideout requirements
    const requirements = [
      ...this.extractQuestRequirements(),
      ...this.extractHideoutRequirements()
    ];
    
    // Group by item ID
    for (const req of requirements) {
      if (!this.itemsMap.has(req.itemId)) {
        this.itemsMap.set(req.itemId, new AggregatedItem(req.item));
      }
      this.itemsMap.get(req.itemId).addRequirement(req);
    }
  }
  
  extractQuestRequirements() {
    const requirements = [];
    
    for (const quest of this.questManager.quests) {
      if (quest.completed) continue;  // Skip completed quests
      
      for (const objective of quest.objectives) {
        if (objective.type === 'giveQuestItem' || objective.type === 'findQuestItem') {
          const isFiR = this.detectFiR(objective);
          requirements.push(new ItemRequirement(
            objective.target,  // Item ID
            { type: 'quest', id: quest.id, name: quest.name },
            objective.number || 1,
            isFiR
          ));
        }
      }
    }
    
    return requirements;
  }
  
  extractHideoutRequirements() {
    const requirements = [];
    
    for (const station of this.hideoutManager.stations) {
      for (const levelData of station.levels) {
        const moduleKey = `${station.id}-${levelData.level}`;
        if (this.hideoutManager.isModuleCompleted(moduleKey)) continue;
        
        for (const itemReq of levelData.itemRequirements) {
          requirements.push(new ItemRequirement(
            itemReq.item.id,
            { type: 'hideout', id: moduleKey, name: `${station.name} Level ${levelData.level}` },
            itemReq.count,
            false  // Hideout items never require FiR
          ));
        }
      }
    }
    
    return requirements;
  }
  
  calculatePriorities() {
    for (const [itemId, aggregatedItem] of this.itemsMap) {
      aggregatedItem.priority = PriorityService.calculate(
        aggregatedItem,
        this.questManager,
        this.hideoutManager
      );
    }
  }
  
  getFilteredItems(filters) {
    let items = Array.from(this.itemsMap.values());
    
    // Filter by category
    if (filters.category !== 'all') {
      items = items.filter(item => this.matchesCategory(item, filters.category));
    }
    
    // Filter collected items
    if (filters.hideCollected) {
      items = items.filter(item => !item.collected);
    }
    
    return items;
  }
  
  matchesCategory(aggregatedItem, category) {
    switch (category) {
      case 'quest':
        return aggregatedItem.sources.some(s => s.type === 'quest');
      case 'hideout':
        return aggregatedItem.sources.some(s => s.type === 'hideout');
      case 'keys':
        return aggregatedItem.item.types.includes('keys');
      default:
        return true;
    }
  }
}
```

---

### HideoutManager

Manages hideout module completion tracking (new class, mirrors QuestManager pattern).

**Responsibilities**:
- Load hideout station data from API
- Track user's module completion status via localStorage
- Determine if module is buildable (prerequisites met)
- Emit events when hideout updated

**Methods**:

```javascript
class HideoutManager {
  constructor() {
    this.stations = [];
    this.completedModules = new Map();  // Key: "stationId-level", Value: boolean
  }
  
  async initialize() {
    await Promise.all([
      this.loadStations(),
      this.loadProgress()
    ]);
  }
  
  async loadStations() {
    const data = await fetchHideoutStations();
    this.stations = data.map(station => ({
      id: station.id,
      name: station.name,
      levels: station.levels
    }));
  }
  
  async loadProgress() {
    const json = localStorage.getItem('tarkov-hideout-progress');
    if (json) {
      const progress = JSON.parse(json);
      this.completedModules = new Map(Object.entries(progress));
    }
  }
  
  async toggleModuleComplete(stationId, level) {
    const key = `${stationId}-${level}`;
    const wasCompleted = this.completedModules.get(key) || false;
    this.completedModules.set(key, !wasCompleted);
    
    await this.saveProgress();
    document.dispatchEvent(new Event('hideoutUpdated'));
  }
  
  async saveProgress() {
    const progressObj = Object.fromEntries(this.completedModules);
    localStorage.setItem('tarkov-hideout-progress', JSON.stringify(progressObj));
  }
  
  isModuleCompleted(moduleKey) {
    return this.completedModules.get(moduleKey) || false;
  }
  
  isModuleBuildable(stationId, level) {
    const station = this.stations.find(s => s.id === stationId);
    if (!station) return false;
    
    const levelData = station.levels.find(l => l.level === level);
    if (!levelData) return false;
    
    // Check if all station prerequisites are completed
    return levelData.stationLevelRequirements.every(req => {
      const reqKey = `${req.station.id}-${req.level}`;
      return this.isModuleCompleted(reqKey);
    });
  }
}
```

---

### PriorityService

Calculates item priority based on quest and hideout unlock status.

**Methods**:

```javascript
class PriorityService {
  static calculate(aggregatedItem, questManager, hideoutManager) {
    // Check quest sources
    for (const source of aggregatedItem.sources) {
      if (source.type === 'quest') {
        const quest = questManager.getQuestById(source.id);
        if (quest && quest.unlocked && !quest.completed) {
          return Priority.NEEDED_SOON;
        }
      }
    }
    
    // Check hideout sources
    for (const source of aggregatedItem.sources) {
      if (source.type === 'hideout') {
        const [stationId, level] = source.id.split('-');
        const levelNum = parseInt(level);
        
        if (hideoutManager.isModuleBuildable(stationId, levelNum) &&
            !hideoutManager.isModuleCompleted(source.id)) {
          return Priority.NEEDED_SOON;
        }
      }
    }
    
    return Priority.NEEDED_LATER;
  }
}
```

---

### ItemStorageService

Manages user's item collection tracking via localStorage.

**Methods**:

```javascript
class ItemStorageService {
  static STORAGE_KEY = 'tarkov-item-collection';
  
  static async loadCollection() {
    const json = localStorage.getItem(this.STORAGE_KEY);
    if (!json) return new Map();
    
    const data = JSON.parse(json);
    return new Map(Object.entries(data));
  }
  
  static async saveCollection(collectionMap) {
    const obj = Object.fromEntries(collectionMap);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
  }
  
  static async toggleCollected(itemId) {
    const collection = await this.loadCollection();
    const current = collection.get(itemId) || { collected: false, quantity: 0 };
    
    collection.set(itemId, {
      collected: !current.collected,
      quantity: current.quantity
    });
    
    await this.saveCollection(collection);
    document.dispatchEvent(new CustomEvent('itemCollectionUpdated', { detail: { itemId } }));
  }
  
  static async setQuantity(itemId, quantity) {
    const collection = await this.loadCollection();
    const current = collection.get(itemId) || { collected: false, quantity: 0 };
    
    collection.set(itemId, {
      collected: current.collected,
      quantity: Math.max(0, quantity)
    });
    
    await this.saveCollection(collection);
    document.dispatchEvent(new CustomEvent('itemCollectionUpdated', { detail: { itemId } }));
  }
}
```

---

## Data Flow

### Initialization Sequence

```
1. App loads
2. QuestManager.initialize() (existing)
3. HideoutManager.initialize()
   - Fetch hideoutStations from API
   - Load completion progress from localStorage
4. ItemTrackerManager.initialize()
   - Fetch items from API (cached 24h)
   - Extract quest requirements from QuestManager.quests
   - Extract hideout requirements from HideoutManager.stations
   - Aggregate by item ID → Map<itemId, AggregatedItem>
   - Calculate priorities for all items
5. ItemStorageService.loadCollection()
   - Load user's collection status from localStorage
6. ItemTracker component renders filtered item list
```

### Priority Recalculation Triggers

```
User completes quest
  → questUpdated event
  → ItemTrackerManager.calculatePriorities()
  → ItemTracker.render()

User completes hideout module
  → hideoutUpdated event
  → ItemTrackerManager.calculatePriorities()
  → ItemTracker.render()
```

### Collection Status Update Flow

```
User clicks item checkbox
  → ItemCard emits 'toggleCollected' event
  → ItemStorageService.toggleCollected(itemId)
  → localStorage updated
  → itemCollectionUpdated event
  → ItemTracker.render() (if 'Hide Collected' filter enabled)
```

---

## State Management

### localStorage Keys

| Key | Format | Purpose |
|-----|--------|---------|
| `tarkov-quest-progress` | Array of quest IDs | Existing - tracks completed quests |
| `tarkov-hideout-progress` | Object `{moduleKey: boolean}` | NEW - tracks completed hideout modules |
| `tarkov-item-collection` | Object `{itemId: {collected, quantity}}` | NEW - tracks user's item collection |
| `tarkov-items-cache` | Array of Item objects | NEW - 24h API cache for items |
| `tarkov-items-cache-time` | Timestamp (ms) | NEW - cache expiry tracking |
| `tarkov-hideout-cache` | Array of HideoutStation objects | NEW - 24h API cache for hideout |
| `tarkov-hideout-cache-time` | Timestamp (ms) | NEW - cache expiry tracking |
| `item-tracker-filters` | Object `{category, hideCollected}` | NEW - filter persistence |

---

## Validation Rules

### Item Aggregation

- Items with zero total quantity after aggregation should be excluded (completed quests removed all requirements)
- Items with only NEEDED_LATER priority AND collected=true can be hidden by default
- If item.totalQuantity < item.collectedQuantity, display as fully collected (quantity check)

### FiR Detection

```javascript
function detectFiR(objective) {
  // Method 1: Objective type
  if (objective.type === 'findQuestItem') {
    return true;
  }
  
  // Method 2: Description contains FiR indicator
  const desc = objective.description.toLowerCase();
  return desc.includes('fir') || 
         desc.includes('found in raid') || 
         desc.includes('find in raid');
}
```

### Priority Edge Cases

- Item needed by both unlocked and locked quests → NEEDED_SOON (prioritize unlocked)
- Item needed by buildable and non-buildable hideout modules → NEEDED_SOON (prioritize buildable)
- Quest completed mid-session → Remove item requirements from that quest, recalculate priority
- Hideout module completed mid-session → Remove item requirements from that module, recalculate priority

---

## Entity Relationships Diagram

```
Item (1) ──────< (many) ItemRequirement
                           │
                           ├── (1) Quest (via source.id if source.type='quest')
                           │
                           └── (1) HideoutModule (via source.id if source.type='hideout')

AggregatedItem (1) ──> (1) Item
                  (1) ──> (many) ItemRequirement (sources)
                  (1) ──> (1) Priority (enum)
                  (1) ──> (1) ItemCollection (via ItemStorageService)

QuestManager ──> (many) Quest ──> (many) Objective ──> (0-1) ItemRequirement
HideoutManager ──> (many) HideoutStation ──> (many) HideoutModule ──> (many) ItemRequirement
```

---

**Data Model Complete** ✅  
Ready for Phase 1 contract definitions.

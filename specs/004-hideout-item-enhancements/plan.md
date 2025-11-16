# Implementation Plan: Enhanced Hideout & Item Tracker

**Feature**: 004-hideout-item-enhancements  
**Branch**: `004-hideout-item-enhancements`  
**Spec**: [spec.md](./spec.md)  
**Status**: Ready for Implementation

---

## Technical Context

### Existing System Architecture

**Current Item Tracker Implementation** (Feature 003):
- **Components**: ItemTracker (controller), ItemList (grid renderer), ItemCard (individual item), ItemDetailModal
- **Models**: Item, AggregatedItem, HideoutModule, HideoutManager, ItemTrackerManager
- **Services**: PriorityService (binary: NEEDED_SOON/NEEDED_LATER), ItemCollectionService (database sync)
- **Storage**: Dual-layer (localStorage + Supabase), ItemCollectionService pattern for sync
- **UI Pattern**: Tab-based navigation with filter buttons, grid layout with responsive cards

**Hideout System** (Feature 003):
- **HideoutManager**: Tracks completion status, loads from API, saves to localStorage
- **HideoutModule**: Data model with stationId, level, requirements (items + prerequisite modules)
- **Current Limitation**: No dependency depth calculation - only tracks if module is built or not

**Priority System** (Feature 003):
- **PriorityService.calculate()**: Returns NEEDED_SOON or NEEDED_LATER
- **Quest Logic**: NEEDED_SOON if quest is unlocked and incomplete
- **Hideout Logic**: NEEDED_SOON if module is buildable (using `isModuleBuildable()`)
- **Limitation**: Binary system - doesn't differentiate between "buildable now" vs "1 step away" vs "far away"

### Technologies & Patterns

**Stack**:
- Vanilla JavaScript (ES6 modules)
- Cytoscape.js for graph visualization (already in use)
- CSS3 with CSS variables
- Supabase for database sync (optional, with localStorage fallback)

**Key Patterns**:
- Manager pattern: QuestManager, HideoutManager, ItemTrackerManager (coordinate data)
- Service pattern: PriorityService, ItemCollectionService (stateless utility functions)
- Component pattern: Modular UI components with render() methods
- Event-driven: Custom events for cross-component communication (e.g., 'itemCollectionUpdated')

**Database Sync Pattern** (from ItemCollectionService):
```javascript
1. Always save to localStorage first (immediate)
2. If authenticated, also save to Supabase (async)
3. On load: Try Supabase first (if authenticated), fallback to localStorage
4. RLS policies ensure user can only access their own data
```

### API Structure

**Tarkov.dev GraphQL API**:
- **hideoutStations**: Already fetched in Feature 003
  - Returns: stationId, name, levels[], each level has: level, constructionTime, itemRequirements[], stationLevelRequirements[]
  - Example stationLevelRequirement: `{station: {id: "5d484fc0654e7600334626e8"}, level: 2}`
  
**No New API Calls Required**: All hideout data is already fetched by Feature 003

---

## Constitution Check

**Project Constitution**: Not yet defined (constitution.md is template-only)

**Compliance Assessment**: ✅ No violations - constitution not yet customized for this project

**Recommendations**:
- Consider establishing constitution principles for this project (e.g., vanilla JS, no frameworks, localStorage-first)
- Current approach already follows implicit patterns: library-first (services), simplicity (no build system overhead), testability

---

## Quality Gates

### Gate 1: Specification Quality ✅ PASSED
- [x] All user stories have acceptance criteria
- [x] Functional requirements are testable
- [x] Success criteria are measurable
- [x] Edge cases identified
- [x] Dependencies documented
- [x] Design decisions resolved (all 3 questions answered)

**Result**: Ready for planning phase

### Gate 2: Technical Feasibility ✅ PASSED
- [x] Required APIs available (hideoutStations already fetched)
- [x] Database sync pattern established (ItemCollectionService)
- [x] UI patterns proven (tab-based navigation, filter buttons)
- [x] Performance constraints achievable (< 100ms priority calculation)
- [x] No breaking changes to existing features

**Result**: No technical blockers

### Gate 3: Architecture Review ✅ PASSED
- [x] Follows existing patterns (Manager/Service/Component)
- [x] Backward compatible with Feature 003
- [x] Enhances existing code rather than duplicating
- [x] Clear integration points identified

**Result**: Architecture approved

---

## Phase 0: Research & Design

### Research Tasks

#### R001: Hideout Dependency Graph Analysis ✅ COMPLETE
**Objective**: Understand hideout prerequisite structure from API data

**Findings**:
- Hideout modules have `stationLevelRequirements`: array of {station, level} prerequisites
- Example: Lavatory Level 2 requires Vents Level 1
- Prerequisites are explicit in API - no need to infer
- No circular dependencies in game data (per ASMP-002)

**Decision**: Use recursive depth-first search to calculate prerequisite depth

---

#### R002: Dependency Depth Algorithm ✅ COMPLETE
**Objective**: Design algorithm to calculate "distance" to buildability

**Algorithm**:
```javascript
calculateDependencyDepth(moduleKey, hideoutManager):
  if module is already built:
    return 0
  
  if module has no prerequisites:
    return 0 (buildable now)
  
  maxDepth = 0
  for each prerequisite:
    if prerequisite is not built:
      prereqDepth = calculateDependencyDepth(prerequisite, hideoutManager)
      maxDepth = max(maxDepth, prereqDepth + 1)
  
  return maxDepth
```

**Complexity**: O(n) where n = number of modules (with memoization)

**Edge Cases**:
- Module with multiple prerequisites: Use max depth + 1
- Module with some prerequisites built: Only count unbuilt ones
- Module with no prerequisites but items missing: Depth = 0 (buildable now)

---

#### R003: Priority Tier Mapping ✅ COMPLETE
**Objective**: Map dependency depth to NEED_NOW/NEED_SOON/NEED_LATER

**Mapping**:
- **Depth 0**: NEED_NOW (buildable immediately)
- **Depth 1-2**: NEED_SOON (1-2 modules away)
- **Depth 3+**: NEED_LATER (far away)

**Quest Mapping** (for consistency):
- **Unlocked quests**: NEED_NOW (depth 0)
- **1-2 prerequisite quests away**: NEED_SOON
- **3+ prerequisite quests away**: NEED_LATER

**Rationale**: Three tiers provide actionable guidance without overwhelming users

---

#### R004: UI Layout Research ✅ COMPLETE
**Objective**: Design subtab structure within Item Tracker

**Current Structure**:
```
Item Tracker Tab
├── Filter Buttons: [All Items] [Quest Items] [Hideout Items] [Keys] [Hide Collected]
└── Item Grid (ItemList component)
```

**New Structure**:
```
Item Tracker Tab
├── Subtabs: [Items] [Hideout Progress]
├── Items Subtab:
│   ├── Filter Buttons: [All Items] [Quest Items] [Hideout Items] [Keys] [Hide Collected]
│   └── Item Grid with priority badges (now with tooltips)
└── Hideout Progress Subtab:
    ├── Hideout Module Grid (new HideoutList component)
    └── Each module card shows: icon, level, build status, requirements
```

**Pattern**: Reuse ItemList/ItemCard pattern for HideoutList/HideoutCard

---

#### R005: Database Schema Design ✅ COMPLETE
**Objective**: Design Supabase table for hideout progress

**Schema**:
```sql
CREATE TABLE hideout_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, station_id, level)
);

-- Index for fast user lookups
CREATE INDEX idx_hideout_progress_user ON hideout_progress(user_id);

-- RLS policies (same pattern as quest_progress)
ALTER TABLE hideout_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hideout progress"
  ON hideout_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hideout progress"
  ON hideout_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hideout progress"
  ON hideout_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own hideout progress"
  ON hideout_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE TRIGGER update_hideout_progress_updated_at
  BEFORE UPDATE ON hideout_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Decision**: Follow ItemCollectionService pattern for sync logic

---

### Research Summary

**Key Decisions**:
1. **Algorithm**: Recursive DFS with memoization for depth calculation
2. **Priority Tiers**: 0 = NEED_NOW, 1-2 = NEED_SOON, 3+ = NEED_LATER
3. **UI Layout**: Subtabs within Item Tracker ([Items] / [Hideout Progress])
4. **Database**: `hideout_progress` table mirroring `quest_progress` pattern
5. **Sync Pattern**: Reuse ItemCollectionService pattern (localStorage + Supabase)

**No Unresolved Questions**: All research complete, ready for Phase 1

---

## Phase 1: Design & Contracts

### Data Model Enhancements

#### Enhanced HideoutModule Model

**New Methods**:
```javascript
class HideoutModule {
  // ... existing fields ...
  
  /**
   * Calculate dependency depth for this module
   * @param {HideoutManager} manager - For checking built status of prerequisites
   * @param {Map<string, number>} memo - Memoization cache
   * @returns {number} - 0 if buildable now, 1+ for steps away
   */
  calculateDependencyDepth(manager, memo = new Map())
  
  /**
   * Get all unbuilt prerequisite modules (recursive)
   * @param {HideoutManager} manager
   * @returns {HideoutModule[]} - List of modules blocking this one
   */
  getUnbuiltPrerequisites(manager)
}
```

---

#### Enhanced PriorityService

**New Priority Constants**:
```javascript
export const Priority = {
  NEED_NOW: 'NEED_NOW',      // depth 0
  NEED_SOON: 'NEED_SOON',    // depth 1-2
  NEED_LATER: 'NEED_LATER'   // depth 3+
};
```

**Enhanced Method Signature**:
```javascript
class PriorityService {
  /**
   * Calculate priority for an aggregated item (ENHANCED)
   * @param {AggregatedItem} aggregatedItem
   * @param {QuestManager} questManager
   * @param {HideoutManager} hideoutManager
   * @returns {string} Priority.NEED_NOW | NEED_SOON | NEED_LATER
   */
  static calculate(aggregatedItem, questManager, hideoutManager)
  
  /**
   * Calculate dependency depth for a quest (NEW)
   * @param {Quest} quest
   * @param {QuestManager} manager
   * @returns {number} - Number of incomplete prerequisite quests
   */
  static calculateQuestDepth(quest, manager)
  
  /**
   * Map depth to priority tier (NEW)
   * @param {number} depth
   * @returns {string} Priority constant
   */
  static depthToPriority(depth)
}
```

---

#### HideoutProgressService (NEW)

**Purpose**: Handle database sync for hideout progress (mirrors ItemCollectionService)

```javascript
class HideoutProgressService {
  /**
   * Load hideout progress from database (if authenticated) or localStorage
   * @returns {Promise<Map<string, boolean>>} - Map of moduleKey -> completed
   */
  static async loadProgress()
  
  /**
   * Save hideout progress to database (if authenticated) and localStorage
   * @param {Map<string, boolean>} progress - Map of moduleKey -> completed
   * @returns {Promise<void>}
   */
  static async saveProgress(progress)
  
  /**
   * Toggle a single module's build status and sync
   * @param {string} moduleKey - Format: "stationId-level"
   * @param {boolean} completed - New build status
   * @returns {Promise<void>}
   */
  static async toggleModuleBuild(moduleKey, completed)
}
```

---

### Component Architecture

#### ItemTracker Enhancements

**New State**:
```javascript
class ItemTracker {
  // ... existing state ...
  activeSubtab: 'items' | 'hideout'  // NEW: Track which subtab is active
}
```

**New Methods**:
```javascript
/**
 * Render subtab navigation (NEW)
 */
renderSubtabs()

/**
 * Switch between Items and Hideout Progress subtabs (NEW)
 */
switchSubtab(subtabName)
```

---

#### HideoutList Component (NEW)

**Purpose**: Render grid of hideout modules (mirrors ItemList pattern)

```javascript
class HideoutList {
  constructor(containerId)
  
  /**
   * Render hideout modules as cards
   * @param {HideoutModule[]} modules
   * @param {HideoutManager} hideoutManager
   */
  render(modules, hideoutManager)
  
  /**
   * Attach event listeners for build toggle
   */
  attachEventListeners()
  
  /**
   * Handle module build status toggle
   */
  async handleToggleBuild(moduleKey, completed)
}
```

---

#### HideoutCard Component (NEW)

**Purpose**: Render individual hideout module card (mirrors ItemCard pattern)

```javascript
class HideoutCard {
  /**
   * Render a single hideout module card
   * @param {HideoutModule} module
   * @returns {string} HTML string
   */
  static render(module)
  
  /**
   * Get status badge HTML (Built / Buildable / Locked)
   */
  static renderStatusBadge(module, hideoutManager)
  
  /**
   * Render required items list
   */
  static renderRequirements(module)
}
```

---

#### PriorityBadge Component (NEW)

**Purpose**: Render priority badge with tooltip

```javascript
class PriorityBadge {
  /**
   * Render priority badge with hover tooltip
   * @param {string} priority - NEED_NOW | NEED_SOON | NEED_LATER
   * @param {string} reason - 'quest' | 'hideout'
   * @param {number} depth - Dependency depth
   * @returns {string} HTML string
   */
  static render(priority, reason, depth)
  
  /**
   * Get tooltip text explaining priority
   */
  static getTooltipText(priority, reason, depth)
}
```

---

### API Contracts

**No New API Calls Required** - All data already fetched in Feature 003

**Internal Event Contracts**:

```javascript
// Event: Hideout progress changed
window.dispatchEvent(new CustomEvent('hideoutProgressUpdated', {
  detail: { moduleKey, completed }
}));

// Event: Priority recalculation needed
window.dispatchEvent(new CustomEvent('priorityRecalculationNeeded'));
```

---

### Database Schema

**SQL Migration File**: `supabase-hideout-progress.sql`

See Research Section R005 for complete schema definition.

---

## Phase 2: Implementation Breakdown

### Task Structure

**Format**: `[Phase]-[US]-[Sequence]: Task Description`
- **Phase**: P0 (Research), P1 (Foundation), P2 (US Implementation), P3 (Polish)
- **US**: User Story number (US1-US5)
- **Sequence**: Sequential numbering within phase

---

### P0: Research Phase (COMPLETE)

- [x] **P0-R001**: Analyze hideout dependency structure from API
- [x] **P0-R002**: Design dependency depth algorithm
- [x] **P0-R003**: Map depth to priority tiers
- [x] **P0-R004**: Design subtab UI layout
- [x] **P0-R005**: Design database schema

---

### P1: Foundation (Database, Models, Services)

#### Database Setup

- [ ] **P1-F001**: Create `supabase-hideout-progress.sql` migration file
  - Table: `hideout_progress` with RLS policies
  - Indexes: `idx_hideout_progress_user`
  - Trigger: `update_hideout_progress_updated_at`
  - **Estimated**: 30 min

---

#### Model Enhancements

- [ ] **P1-F002**: Enhance `HideoutModule` with `calculateDependencyDepth()` method
  - Add memoization support
  - Handle edge cases (circular deps, missing data)
  - **Estimated**: 1 hour
  - **File**: `src/models/hideout-module.js`

- [ ] **P1-F003**: Enhance `HideoutModule` with `getUnbuiltPrerequisites()` method
  - Recursive prerequisite traversal
  - Filter out built modules
  - **Estimated**: 45 min
  - **File**: `src/models/hideout-module.js`

- [ ] **P1-F004**: Update `Priority` constants to three-tier system
  - Add `NEED_NOW`, `NEED_SOON`, `NEED_LATER`
  - Remove old `NEEDED_SOON`, `NEEDED_LATER` (breaking change - see migration below)
  - **Estimated**: 15 min
  - **File**: `src/models/item.js`

---

#### Service Creation & Enhancement

- [ ] **P1-F005**: Create `HideoutProgressService` class
  - Implement `loadProgress()` method
  - Implement `saveProgress()` method
  - Implement `toggleModuleBuild()` method
  - Follow ItemCollectionService pattern
  - **Estimated**: 2 hours
  - **File**: `src/services/hideout-progress-service.js` (NEW)

- [ ] **P1-F006**: Enhance `PriorityService.calculate()` for three-tier priority
  - Calculate quest depth using new `calculateQuestDepth()` helper
  - Calculate hideout depth using `HideoutModule.calculateDependencyDepth()`
  - Use `depthToPriority()` to map to tier
  - Handle multiple sources (use highest priority)
  - **Estimated**: 1.5 hours
  - **File**: `src/services/priority-service.js`

- [ ] **P1-F007**: Add `PriorityService.calculateQuestDepth()` helper
  - Recursive prerequisite counting
  - Memoization for performance
  - **Estimated**: 1 hour
  - **File**: `src/services/priority-service.js`

- [ ] **P1-F008**: Add `PriorityService.depthToPriority()` mapper
  - 0 → NEED_NOW
  - 1-2 → NEED_SOON
  - 3+ → NEED_LATER
  - **Estimated**: 15 min
  - **File**: `src/services/priority-service.js`

---

#### Manager Enhancements

- [ ] **P1-F009**: Update `HideoutManager` to use `HideoutProgressService`
  - Replace localStorage direct calls with service calls
  - Add `async toggleModuleBuild()` method
  - Dispatch `hideoutProgressUpdated` event
  - **Estimated**: 1 hour
  - **File**: `src/models/hideout-manager.js`

---

### P2-US1: Hideout Build Status Tracking (Priority P1)

**Acceptance Criteria**:
1. View all modules at level 0 with requirements
2. Mark modules as built with immediate feedback
3. Progress loads from database on refresh
4. LocalStorage fallback when not authenticated

---

#### Component Creation

- [ ] **P2-US1-001**: Create `HideoutCard` component
  - Render module icon, name, level
  - Render build status badge
  - Render required items list
  - Render toggle build button
  - **Estimated**: 2 hours
  - **File**: `src/components/hideout-card.js` (NEW)

- [ ] **P2-US1-002**: Create `HideoutList` component
  - Render grid of hideout cards
  - Attach event listeners for build toggle
  - Handle toggle build events
  - Dispatch priority recalculation event
  - **Estimated**: 2 hours
  - **File**: `src/components/hideout-list.js` (NEW)

---

#### UI Integration

- [ ] **P2-US1-003**: Add subtab navigation to `ItemTracker`
  - Render [Items] and [Hideout Progress] subtab buttons
  - Add `switchSubtab()` method
  - Toggle visibility of ItemList vs HideoutList
  - **Estimated**: 1 hour
  - **File**: `src/components/item-tracker.js`

- [ ] **P2-US1-004**: Integrate `HideoutList` into `ItemTracker`
  - Initialize HideoutList component
  - Render on "Hideout Progress" subtab
  - Pass hideoutManager reference
  - **Estimated**: 45 min
  - **File**: `src/components/item-tracker.js`

- [ ] **P2-US1-005**: Add hideout progress HTML container to index.html
  - Add `<div id="hideout-progress-content">` inside Item Tracker tab
  - Initially hidden
  - **Estimated**: 10 min
  - **File**: `index.html`

---

#### Styling

- [ ] **P2-US1-006**: Create `hideout-tracker.css` stylesheet
  - Subtab button styles
  - Hideout card grid layout
  - Module card styles (icon, badge, requirements)
  - Build toggle button styles
  - Responsive design (mobile breakpoints)
  - **Estimated**: 2 hours
  - **File**: `styles/hideout-tracker.css` (NEW)

- [ ] **P2-US1-007**: Link `hideout-tracker.css` in index.html
  - Add `<link>` tag
  - **Estimated**: 5 min
  - **File**: `index.html`

---

#### Event Handling

- [ ] **P2-US1-008**: Handle `hideoutProgressUpdated` event in `ItemTracker`
  - Listen for event
  - Trigger priority recalculation
  - Re-render ItemList with new priorities
  - **Estimated**: 30 min
  - **File**: `src/components/item-tracker.js`

---

### P2-US2: Smart Priority by Buildability (Priority P2)

**Acceptance Criteria**:
1. Items for buildable modules show NEED_NOW
2. Items for modules 1-2 steps away show NEED_SOON
3. Items for modules 3+ steps away show NEED_LATER
4. Priorities update when hideout progress changes

---

#### Priority Calculation

- [ ] **P2-US2-001**: Test enhanced `PriorityService.calculate()` with hideout depth
  - Verify NEED_NOW for depth 0
  - Verify NEED_SOON for depth 1-2
  - Verify NEED_LATER for depth 3+
  - **Estimated**: 1 hour (testing/debugging)
  - **File**: `src/services/priority-service.js`

- [ ] **P2-US2-002**: Update `ItemCard` to display three priority levels
  - Update badge colors (NEED_NOW = red/orange, NEED_SOON = yellow, NEED_LATER = blue/gray)
  - Update priority text
  - **Estimated**: 45 min
  - **File**: `src/components/item-card.js`

- [ ] **P2-US2-003**: Update `item-tracker.css` with new priority colors
  - `.priority-need-now` (red/orange)
  - `.priority-need-soon` (yellow)
  - `.priority-need-later` (blue/gray)
  - **Estimated**: 30 min
  - **File**: `styles/item-tracker.css`

---

#### Integration Testing

- [ ] **P2-US2-004**: Test priority updates when marking modules as built
  - Mark prerequisite module as built
  - Verify dependent module priorities upgrade
  - Verify item priorities reflect changes
  - **Estimated**: 1 hour (manual testing)

---

### P2-US3: Priority Legend & Visual Clarity (Priority P1)

**Acceptance Criteria**:
1. Priority badges have tooltips explaining meaning
2. Tooltips show "buildable now" / "1-2 steps away" / "3+ steps away"
3. Mobile-friendly fallback for tooltips

---

#### Component Creation

- [ ] **P2-US3-001**: Create `PriorityBadge` component
  - Render badge with priority class
  - Add `data-tooltip` attribute with explanation
  - Generate tooltip text based on priority and depth
  - **Estimated**: 1.5 hours
  - **File**: `src/components/priority-badge.js` (NEW)

- [ ] **P2-US3-002**: Update `ItemCard` to use `PriorityBadge` component
  - Replace hardcoded badge with PriorityBadge.render()
  - Pass priority, reason, depth parameters
  - **Estimated**: 30 min
  - **File**: `src/components/item-card.js`

---

#### Styling

- [ ] **P2-US3-003**: Add tooltip CSS to `item-tracker.css`
  - `.priority-badge[data-tooltip]` hover styles
  - Tooltip positioning (above badge)
  - Mobile: Add info icon with tap-to-show tooltip
  - **Estimated**: 1 hour
  - **File**: `styles/item-tracker.css`

- [ ] **P2-US3-004**: Add mobile tooltip fallback
  - Add small "ⓘ" icon next to priority badges on mobile
  - Tap icon to show/hide tooltip
  - **Estimated**: 1 hour
  - **File**: `src/components/priority-badge.js` + `styles/item-tracker.css`

---

### P2-US4: Quest Priority Integration (Priority P2)

**Acceptance Criteria**:
1. Items for unlocked quests show NEED_NOW
2. Items for quests 1-2 steps away show NEED_SOON
3. Items for quests 3+ steps away show NEED_LATER

---

#### Quest Depth Calculation

- [ ] **P2-US4-001**: Test `PriorityService.calculateQuestDepth()` with quest chains
  - Test with unlocked quests (depth 0)
  - Test with quests behind 1 prerequisite (depth 1)
  - Test with quests behind 3+ prerequisites (depth 3+)
  - **Estimated**: 1 hour (testing/debugging)
  - **File**: `src/services/priority-service.js`

- [ ] **P2-US4-002**: Verify quest priority integration in `PriorityService.calculate()`
  - Ensure quest depth is calculated correctly
  - Ensure quest and hideout priorities are merged (highest priority wins)
  - **Estimated**: 45 min (testing)
  - **File**: `src/services/priority-service.js`

---

### P2-US5: Hideout Module Visual Cards (Priority P3)

**Acceptance Criteria**:
1. Module cards show icon, name, level, status
2. Unbuilt modules show required items with quantities
3. Built modules show "Built" indicator

---

#### Visual Polish

- [ ] **P2-US5-001**: Add hideout station icons
  - Download/create icons for each station (or use text placeholders)
  - Add icon display to `HideoutCard` component
  - **Estimated**: 1.5 hours
  - **File**: `src/components/hideout-card.js`

- [ ] **P2-US5-002**: Enhance `HideoutCard` visual design
  - Add hover effects
  - Add status indicators (checkmark for built, lock icon for locked)
  - Add progress bar for multi-level modules
  - **Estimated**: 1.5 hours
  - **File**: `src/components/hideout-card.js` + `styles/hideout-tracker.css`

- [ ] **P2-US5-003**: Add item requirement cards within hideout cards
  - Show item icon, name, quantity needed
  - Link to item detail modal (reuse existing modal)
  - **Estimated**: 1 hour
  - **File**: `src/components/hideout-card.js`

---

### P3: Polish & Testing

#### Error Handling

- [ ] **P3-001**: Add error handling for hideout progress sync failures
  - Fallback to localStorage on Supabase errors
  - Show user-friendly error messages
  - **Estimated**: 1 hour
  - **Files**: `src/services/hideout-progress-service.js`, `src/components/hideout-list.js`

- [ ] **P3-002**: Add loading states for hideout progress load
  - Show skeleton cards while loading
  - Disable toggle buttons during save
  - **Estimated**: 1 hour
  - **Files**: `src/components/hideout-list.js`, `styles/hideout-tracker.css`

---

#### Performance Optimization

- [ ] **P3-003**: Add memoization to `HideoutModule.calculateDependencyDepth()`
  - Cache depth calculations per module
  - Clear cache on hideout progress change
  - **Estimated**: 45 min
  - **File**: `src/models/hideout-module.js`

- [ ] **P3-004**: Optimize priority recalculation
  - Only recalculate priorities for affected items
  - Batch updates to avoid multiple re-renders
  - **Estimated**: 1 hour
  - **File**: `src/services/priority-service.js`

- [ ] **P3-005**: Test performance with 500 items
  - Verify < 100ms priority calculation (SC-003)
  - Profile and optimize bottlenecks if needed
  - **Estimated**: 1 hour

---

#### Documentation

- [ ] **P3-006**: Update README.md with new features
  - Add "Hideout Tracker" section
  - Document three-tier priority system
  - Add setup instructions for `supabase-hideout-progress.sql`
  - **Estimated**: 30 min
  - **File**: `README.md`

- [ ] **P3-007**: Create `quickstart.md` for Feature 004
  - Test scenarios for each user story
  - Expected vs actual results
  - Manual testing checklist
  - **Estimated**: 1 hour
  - **File**: `specs/004-hideout-item-enhancements/quickstart.md` (NEW)

---

#### Testing

- [ ] **P3-008**: Test US1 acceptance scenarios
  - View modules at level 0
  - Mark modules as built
  - Refresh and verify persistence
  - Test localStorage fallback
  - **Estimated**: 1 hour

- [ ] **P3-009**: Test US2 acceptance scenarios
  - Verify NEED_NOW for buildable modules
  - Verify NEED_SOON for 1-2 steps away
  - Verify NEED_LATER for 3+ steps away
  - Test priority updates on hideout progress change
  - **Estimated**: 1 hour

- [ ] **P3-010**: Test US3 acceptance scenarios
  - Verify tooltips appear on hover
  - Verify tooltip text is clear
  - Test mobile fallback (info icon)
  - **Estimated**: 30 min

- [ ] **P3-011**: Test US4 acceptance scenarios
  - Verify quest priority matches depth
  - Test quest + hideout priority merging
  - **Estimated**: 45 min

- [ ] **P3-012**: Test US5 acceptance scenarios
  - Verify visual card design
  - Verify required items display
  - Verify built indicator
  - **Estimated**: 30 min

- [ ] **P3-013**: Mobile responsiveness testing
  - Test on 375px width (iPhone SE)
  - Verify no horizontal scrolling (SC-010)
  - Test touch targets for toggle buttons
  - **Estimated**: 45 min

- [ ] **P3-014**: Cross-browser testing
  - Test on Chrome, Firefox, Safari
  - Verify tooltips work correctly
  - Verify CSS grid layout
  - **Estimated**: 45 min

---

## Migration Strategy

### Breaking Changes

**Priority Constant Renaming**:
- Old: `Priority.NEEDED_SOON`, `Priority.NEEDED_LATER`
- New: `Priority.NEED_NOW`, `Priority.NEED_SOON`, `Priority.NEED_LATER`

**Migration Path**:
1. Update `Priority` constants in `src/models/item.js` (P1-F004)
2. Update all references in codebase:
   - `src/services/priority-service.js`
   - `src/components/item-card.js`
   - `src/components/item-list.js`
   - Any tests referencing old constants
3. No database migration needed (priorities not stored, only calculated)

**Risk**: Low - constants are internal only, not exposed to API or storage

---

### Backward Compatibility

**Feature 003 Compatibility**:
- ✅ HideoutManager enhanced, not replaced
- ✅ PriorityService enhanced, not replaced
- ✅ ItemTracker enhanced with subtabs, existing "Items" tab still works
- ✅ No changes to item collection sync (ItemCollectionService untouched)

**Rollback Plan**:
- If issues arise, remove subtab navigation and revert PriorityService changes
- Users on old version (without database migration) will still see two-tier priorities (graceful degradation)

---

## File Structure

### New Files

```
src/
├── services/
│   └── hideout-progress-service.js (NEW)
├── components/
│   ├── hideout-list.js (NEW)
│   ├── hideout-card.js (NEW)
│   └── priority-badge.js (NEW)
styles/
└── hideout-tracker.css (NEW)
supabase-hideout-progress.sql (NEW - root directory)
specs/004-hideout-item-enhancements/
└── quickstart.md (NEW)
```

### Modified Files

```
src/
├── models/
│   ├── item.js (Priority constants)
│   ├── hideout-module.js (dependency depth methods)
│   └── hideout-manager.js (integrate HideoutProgressService)
├── services/
│   └── priority-service.js (three-tier priority logic)
├── components/
│   ├── item-tracker.js (subtab navigation)
│   └── item-card.js (use PriorityBadge component)
styles/
└── item-tracker.css (new priority colors, tooltip styles)
index.html (subtab HTML, link hideout-tracker.css)
README.md (document new features)
```

---

## Success Metrics

### Functional Completeness
- [ ] All 5 user stories implemented with passing acceptance scenarios
- [ ] All 15 functional requirements met
- [ ] All 5 edge cases handled

### Performance
- [ ] SC-003: 95% of priority calculations < 100ms
- [ ] SC-002: Module toggle feedback < 500ms
- [ ] SC-006: Hideout progress syncs to database within 2 seconds

### Quality
- [ ] SC-010: No horizontal scrolling on 375px mobile screens
- [ ] SC-004: Priority legend visible and understandable
- [ ] All manual tests in quickstart.md passing

### User Experience
- [ ] Subtab navigation intuitive (< 2 clicks to hideout tracker)
- [ ] Priority badges clearly differentiate NEED_NOW vs NEED_SOON vs NEED_LATER
- [ ] Tooltips provide helpful context without cluttering UI

---

## Estimated Effort

### By Phase
- **P0 (Research)**: ✅ Complete (5 hours)
- **P1 (Foundation)**: ~11 hours (database, models, services)
- **P2 (User Stories)**: ~25 hours (components, integration, styling)
- **P3 (Polish & Testing)**: ~12 hours (error handling, performance, documentation, testing)

**Total Estimated**: ~53 hours (6-7 working days for one developer)

### By Priority
- **P1 (Must Have)**: US1 (Build Status Tracking) + US3 (Priority Legend) = ~20 hours
- **P2 (Should Have)**: US2 (Smart Priority) + US4 (Quest Integration) = ~18 hours
- **P3 (Nice to Have)**: US5 (Visual Cards) = ~4 hours
- **Foundation + Polish**: ~21 hours

**Minimum Viable Feature (P1 only)**: ~41 hours (5 working days)

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Dependency depth calculation too slow | Low | High | Memoization + profiling + optimization |
| Circular dependencies in API data | Very Low | Medium | Detect and log errors, fallback to depth 0 |
| Database sync conflicts (multi-device) | Low | Medium | Use Supabase RLS + upsert pattern |
| Tooltip not working on mobile | Medium | Low | Fallback to info icon with tap-to-show |
| Priority recalculation causing lag | Medium | Medium | Batch updates + debounce + memoization |

### User Experience Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Users confused by three-tier priority | Medium | High | Clear tooltips + visual legend + color coding |
| Subtab navigation not discoverable | Low | Medium | Clear tab labels + default to "Items" tab |
| Hideout progress out of sync with game | High | Low | Warn users to manually update + offline-first design |
| Too much visual clutter | Low | Medium | Clean design + hide completed modules option |

---

## Deployment Checklist

### Pre-Deployment
- [ ] All P3 tests passing
- [ ] Performance metrics met (SC-002, SC-003, SC-006)
- [ ] Mobile responsiveness verified (SC-010)
- [ ] Cross-browser testing complete
- [ ] README.md updated
- [ ] quickstart.md created and tested

### Database Migration
- [ ] `supabase-hideout-progress.sql` script tested locally
- [ ] RLS policies verified
- [ ] Database migration instructions added to README.md
- [ ] Rollback plan documented

### Code Review
- [ ] All new files follow existing patterns (Manager/Service/Component)
- [ ] No breaking changes to public APIs
- [ ] Error handling comprehensive
- [ ] Performance optimizations in place
- [ ] Code comments clear and helpful

### Deployment
- [ ] Merge `004-hideout-item-enhancements` branch to `main`
- [ ] Run `supabase-hideout-progress.sql` in Supabase dashboard
- [ ] Deploy to Vercel (automatic on push to main)
- [ ] Verify deployed app works correctly
- [ ] Monitor for errors in first 24 hours

### Post-Deployment
- [ ] Gather user feedback on priority system clarity
- [ ] Monitor performance metrics (priority calculation time)
- [ ] Document any issues or improvements for future iterations

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Begin P1 (Foundation)** tasks:
   - Create database migration
   - Enhance HideoutModule model
   - Create HideoutProgressService
   - Enhance PriorityService
3. **Checkpoint after P1**: Verify foundation is solid before building UI
4. **Implement P2 (User Stories)** in priority order: US1 → US3 → US2 → US4 → US5
5. **Execute P3 (Polish & Testing)** to ensure quality
6. **Deploy** following checklist above

**Ready to begin implementation!** 🚀

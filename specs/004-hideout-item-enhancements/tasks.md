# Implementation Tasks: Enhanced Hideout & Item Tracker

**Feature**: 004-hideout-item-enhancements  
**Branch**: `004-hideout-item-enhancements`  
**Total Tasks**: 54  
**Estimated Effort**: ~53 hours (6-7 working days)

---

## Feature Overview

This feature enhances the existing item tracker with a three-tier priority system (NEED_NOW / NEED_SOON / NEED_LATER) based on hideout module buildability and quest unlock status. It adds a hideout progress tracker as a subtab within the Item Tracker, allowing users to mark modules as built and automatically recalculate item priorities based on dependency depth.

**Key Improvements**:
- Smart priority calculation: 0 dependencies = NEED_NOW, 1-2 = NEED_SOON, 3+ = NEED_LATER
- Hideout progress tracking with database sync (Supabase + localStorage)
- Visual priority badges with hover tooltips
- Subtab UI for Items vs Hideout Progress

---

## Phase 1: Setup & Foundation

**Goal**: Establish database schema, enhance data models, create core services

### Database Migration

- [ ] T001 Create `supabase-hideout-progress.sql` migration file with RLS policies in root directory

**Details**: Create table `hideout_progress` with columns: id (UUID), user_id (UUID FK), station_id (TEXT), level (INT), completed (BOOL), created_at, updated_at. Add UNIQUE constraint on (user_id, station_id, level). Create RLS policies for SELECT, INSERT, UPDATE, DELETE (user can only access own data). Add trigger for auto-updating updated_at. Add index on user_id.

**Acceptance**: SQL file executes without errors in Supabase SQL Editor. Table created with correct schema. RLS policies verified.

---

### Model Enhancements

- [ ] T002 [P] Add `calculateDependencyDepth(manager, memo)` method to HideoutModule in src/models/hideout-module.js

**Details**: Implement recursive DFS algorithm to calculate number of unbuilt prerequisites blocking this module. If module is built, return 0. If no prerequisites, return 0. For each unbuilt prerequisite, recursively calculate its depth and return max(prereq_depths) + 1. Use memoization map to cache results. Handle edge cases: circular dependencies (shouldn't exist per API), multiple levels of same station (count only once).

**Acceptance**: Method returns 0 for built modules or modules with no prerequisites. Returns correct depth for modules with 1+ unbuilt prerequisites. Memoization prevents redundant calculations. No infinite loops.

---

- [ ] T003 [P] Add `getUnbuiltPrerequisites(manager)` method to HideoutModule in src/models/hideout-module.js

**Details**: Recursively traverse all prerequisite modules and return array of those not yet built. Filter prerequisites where manager.isModuleComplete(prereqKey) returns false. Return flattened array of HideoutModule instances.

**Acceptance**: Method returns empty array for modules with no prerequisites or all built. Returns correct list of unbuilt prerequisite modules. Handles recursive dependencies correctly.

---

- [ ] T004 Update Priority constants to three-tier system in src/models/item.js

**Details**: Replace old constants NEEDED_SOON, NEEDED_LATER with new NEED_NOW, NEED_SOON, NEED_LATER. Update export statement. Maintain backward compatibility by mapping old constants to new ones during transition if needed.

**Acceptance**: Priority object exports NEED_NOW, NEED_SOON, NEED_LATER constants. All references to old constants updated throughout codebase (PriorityService, ItemCard, ItemList).

---

### Service Creation

- [ ] T005 [P] Create HideoutProgressService class in src/services/hideout-progress-service.js

**Details**: Follow ItemCollectionService pattern. Implement static methods: loadProgress() - loads from Supabase if authenticated, fallback to localStorage; saveProgress(progressMap) - saves to both; toggleModuleBuild(moduleKey, completed) - updates single module and syncs. Use STORAGE_KEY = 'tarkov-hideout-progress'. Handle authentication state via supabase.auth.getUser().

**Acceptance**: Service loads progress from correct source (Supabase when authenticated, localStorage when not). Saves to both layers. Handles network errors gracefully with fallback to localStorage. RLS policies respected.

---

- [X] T006 [P] Add `calculateQuestDepth(quest, manager)` helper to PriorityService in src/services/priority-service.js

**Details**: Calculate number of incomplete prerequisite quests blocking this quest. If quest is completed or unlocked, return 0. Recursively count incomplete prerequisites using quest.requirements. Use memoization map for performance. Return depth count.

**Acceptance**: Method returns 0 for unlocked quests. Returns correct depth for locked quests (count of incomplete prerequisites in chain). Memoization prevents redundant calculations.

---

- [X] T007 [P] Add `depthToPriority(depth)` mapper to PriorityService in src/services/priority-service.js

**Details**: Map dependency depth to priority tier: depth === 0 → Priority.NEED_NOW, depth <= 2 → Priority.NEED_SOON, depth >= 3 → Priority.NEED_LATER. Static method, pure function.

**Acceptance**: Method returns correct priority for each depth range. Handles edge cases (negative depth, very large depth).

---

- [X] T008 Enhance `PriorityService.calculate()` for three-tier priority in src/services/priority-service.js

**Details**: Update main calculate() method to use new depth-based logic. For quest sources: call calculateQuestDepth() and use depthToPriority(). For hideout sources: call module.calculateDependencyDepth() and use depthToPriority(). When item has multiple sources, use highest priority (NEED_NOW > NEED_SOON > NEED_LATER). Track reason (quest/hideout) and depth for tooltip display.

**Acceptance**: Method returns NEED_NOW for items from unlocked quests or buildable hideout modules. Returns NEED_SOON for 1-2 steps away. Returns NEED_LATER for 3+ steps away. Multiple sources use highest priority.

---

### Manager Enhancements

- [X] T009 Update HideoutManager to use HideoutProgressService in src/models/hideout-manager.js

**Details**: Replace direct localStorage calls with HideoutProgressService methods. In loadProgress(), call HideoutProgressService.loadProgress(). In saveProgress(), call HideoutProgressService.saveProgress(). Add new async toggleModuleBuild(moduleKey) method that calls HideoutProgressService.toggleModuleBuild() and dispatches 'hideoutProgressUpdated' custom event.

**Acceptance**: HideoutManager uses service for all persistence. toggleModuleBuild() method updates state and dispatches event. Service handles database sync transparently.

---

## Phase 2: Foundational Components (Blocking Prerequisites)

**Goal**: Create reusable UI components needed by all user stories

### Core Components

- [X] T010 [P] Create PriorityBadge component in src/components/priority-badge.js

**Details**: Export class PriorityBadge with static render(priority, reason, depth) method. Return HTML string with badge element containing priority class (priority-need-now/need-soon/need-later), priority text, and data-tooltip attribute with explanation. Generate tooltip text: NEED_NOW = "Buildable now (0 steps away)", NEED_SOON = "1-2 modules/quests blocking", NEED_LATER = "3+ modules/quests blocking". Include reason (quest/hideout) in tooltip.

**Acceptance**: Component renders badge HTML with correct priority class. Tooltip attribute contains clear explanation. Works for all three priority levels.

---

- [X] T011 [P] Create HideoutCard component in src/components/hideout-card.js

**Details**: Export class HideoutCard with static render(module, hideoutManager) method. Return HTML string with card containing: module icon (or placeholder), module name, current level / max level, build status badge (Built/Not Built), toggle build button, required items list (if not built). Use data-module-key attribute for event handling.

**Acceptance**: Component renders complete hideout module card. Shows correct build status. Displays required items for unbuilt modules. Button has data attribute for event delegation.

---

- [X] T012 [P] Create HideoutList component in src/components/hideout-list.js

**Details**: Export class HideoutList with constructor(containerId), render(modules, hideoutManager), attachEventListeners(), handleToggleBuild(moduleKey, completed) methods. In render(), generate grid of HideoutCard components. In attachEventListeners(), delegate click events for toggle buttons. In handleToggleBuild(), call hideoutManager.toggleModuleBuild() and re-render list. Dispatch 'priorityRecalculationNeeded' event after toggle.

**Acceptance**: Component renders grid of hideout module cards. Click handlers work correctly. Toggle build updates state and triggers priority recalculation event. Re-renders on state change.

---

## Phase 3: User Story 1 - Hideout Build Status Tracking (P1)

**Goal**: Allow users to view and mark hideout modules as built, with database sync

### UI Integration

- [X] T013 [US1] Add subtab navigation HTML to ItemTracker in src/components/item-tracker.js

**Details**: In render() method, add subtab buttons HTML before filter section: <div class="tracker-subtabs"><button data-subtab="items" class="active">Items</button><button data-subtab="hideout">Hideout Progress</button></div>. Add click handlers in attachEventListeners() to call switchSubtab(). Add switchSubtab(subtabName) method to toggle active class and show/hide content divs.

**Acceptance**: Subtab buttons render at top of ItemTracker. Clicking switches between Items and Hideout views. Active tab has visual indicator. Content divs toggle visibility.

---

- [X] T014 [US1] Add hideout progress container HTML to index.html

**Details**: Inside #item-tracker-content div, after #item-list-container, add <div id="hideout-progress-content" style="display:none"></div>. This will be populated by HideoutList component.

**Acceptance**: Container div exists in DOM with correct ID. Initially hidden. Located inside item tracker content area.

---

- [X] T015 [US1] Integrate HideoutList into ItemTracker in src/components/item-tracker.js

**Details**: In constructor, initialize this.hideoutList = new HideoutList('hideout-progress-content'). In initialize() method, after loading items, call this.hideoutList.render(hideoutManager.stations, hideoutManager). Add listener for 'hideoutProgressUpdated' event to trigger priority recalculation and re-render ItemList.

**Acceptance**: HideoutList renders when Hideout Progress subtab is active. HideoutManager data passed correctly. Event listener triggers item priority recalculation.

---

### Styling

- [X] T016 [US1] Create hideout-tracker.css with subtab and card styles in styles/hideout-tracker.css

**Details**: Add styles for .tracker-subtabs (flex layout, border-bottom), .tracker-subtabs button (tab button styles, active state). Add styles for hideout card grid (.hideout-grid - CSS grid, responsive columns), .hideout-card (card layout, border, shadow), .hideout-card-header (icon + title), .hideout-card-status (badge), .hideout-card-requirements (item list), .toggle-build-btn (button styles). Add mobile breakpoints (@media max-width: 768px - stack cards, larger touch targets).

**Acceptance**: Subtabs styled with tab-like appearance. Active tab has visual indicator. Hideout cards display in responsive grid. Mobile breakpoint stacks cards vertically. Touch targets >= 44px on mobile.

---

- [X] T017 [US1] Link hideout-tracker.css in index.html

**Details**: In <head> section, after item-tracker.css, add <link rel="stylesheet" href="styles/hideout-tracker.css">.

**Acceptance**: Stylesheet loads correctly. Hideout tracker styles applied. No 404 errors in console.

---

### Event Handling

- [X] T018 [US1] Handle hideoutProgressUpdated event in ItemTracker in src/components/item-tracker.js

**Details**: In attachEventListeners(), add window.addEventListener('hideoutProgressUpdated', () => this.recalculatePriorities()). In recalculatePriorities() method, call ItemTrackerManager to recalculate all item priorities, then re-render ItemList with new priorities.

**Acceptance**: When hideout module marked as built, event triggers priority recalculation. ItemList updates with new priority badges. Change visible within 1 second.

---

## Phase 4: User Story 2 - Smart Priority by Buildability (P2)

**Goal**: Display three-tier priorities on item cards based on hideout/quest buildability

### Priority Display

- [X] T019 [US2] Update ItemCard to use PriorityBadge component in src/components/item-card.js

**Details**: Import PriorityBadge component. In render() method, replace hardcoded priority badge HTML with PriorityBadge.render(item.priority, item.priorityReason, item.priorityDepth). Ensure item object has priorityReason and priorityDepth properties set by PriorityService.

**Acceptance**: ItemCard displays priority badge using PriorityBadge component. Badge shows correct priority level. Tooltip attribute present with explanation.

---

- [X] T020 [US2] Update item-tracker.css with three priority level colors in styles/item-tracker.css

**Details**: Replace old .priority-needed-soon and .priority-needed-later classes with: .priority-need-now (background: #ff6b6b or similar red/orange, color: white), .priority-need-soon (background: #ffd93d or similar yellow, color: #333), .priority-need-later (background: #a8dadc or similar blue/gray, color: #333). Ensure good contrast ratios for accessibility (WCAG AA).

**Acceptance**: Three priority levels have distinct, visually clear colors. Text readable on backgrounds. Colors match design system (red/orange for urgent, yellow for medium, blue/gray for low).

---

- [X] T021 [US2] Test priority calculation with hideout depth in src/services/priority-service.js

**Details**: Manual testing task. Mark hideout modules as built/unbuilt. Verify items show: NEED_NOW when module buildable (0 unbuilt prerequisites), NEED_SOON when 1-2 prerequisites unbuilt, NEED_LATER when 3+ prerequisites unbuilt. Test edge cases: module with multiple prerequisites, some built some not; item needed by multiple modules at different depths.

**Acceptance**: Priorities correctly reflect hideout buildability. Depth calculation accurate. Multiple sources use highest priority. Priority updates when prerequisites marked as built.

---

## Phase 5: User Story 3 - Priority Legend & Visual Clarity (P1)

**Goal**: Add tooltips to priority badges explaining the three-tier system

### Tooltip Implementation

- [X] T022 [US3] Add tooltip CSS for hover functionality in styles/item-tracker.css

**Details**: Add styles for .priority-badge[data-tooltip] (position: relative), .priority-badge[data-tooltip]:hover::after (content: attr(data-tooltip), position: absolute, bottom: 100%, left: 50%, transform: translateX(-50%), background: rgba(0,0,0,0.9), color: white, padding: 8px 12px, border-radius: 4px, white-space: nowrap, font-size: 0.85rem, z-index: 1000). Add ::before for tooltip arrow. Add @media (hover: none) for mobile - hide hover tooltips.

**Acceptance**: Tooltip appears on hover over priority badge. Positioned above badge. Readable text. Arrow points to badge. Disappears on mouse leave. Does not trigger on mobile (no hover).

---

- [X] T023 [US3] Add mobile tooltip fallback with info icon in src/components/priority-badge.js and styles/item-tracker.css

**Details**: In PriorityBadge.render(), add small info icon (ⓘ or <svg>) after badge text with class "priority-info-icon". Add data-mobile-tooltip attribute. In CSS, hide icon on desktop (@media min-width: 769px), show on mobile. Add JavaScript in ItemList to handle tap on info icon - show/hide tooltip overlay. Style tooltip overlay for mobile (fixed position, larger touch target).

**Acceptance**: Info icon visible on mobile only. Tapping icon shows tooltip. Tooltip readable on small screens. Tapping outside or X button dismisses tooltip. Desktop users see hover tooltips, mobile users see tap tooltips.

---

## Phase 6: User Story 4 - Quest Priority Integration (P2)

**Goal**: Apply three-tier priority to quest items based on prerequisite depth

### Quest Depth Testing

- [X] T024 [US4] Test calculateQuestDepth with quest chains in src/services/priority-service.js

**Details**: Manual testing task. Verify calculateQuestDepth() returns: 0 for unlocked incomplete quests, 1 for quests behind 1 incomplete prerequisite, 2+ for quests behind multiple incomplete prerequisites. Test quest chains (A → B → C → D). Test parallel prerequisites (quest requires both A and B). Verify memoization works (no redundant calculations).

**Acceptance**: Quest depth calculation accurate for all scenarios. Unlocked quests = depth 0. Locked quests = correct prerequisite count. Memoization prevents performance issues with long chains.

---

- [X] T025 [US4] Verify quest+hideout priority merging in PriorityService.calculate() in src/services/priority-service.js

**Details**: Manual testing task. Test item needed by both quest and hideout module at different priorities. Verify highest priority wins (NEED_NOW > NEED_SOON > NEED_LATER). Test scenarios: buildable module (NEED_NOW) + locked quest (NEED_LATER) = NEED_NOW; locked module (NEED_SOON) + unlocked quest (NEED_NOW) = NEED_NOW. Verify tooltip shows both reasons.

**Acceptance**: Items with multiple sources display highest priority. Tooltip mentions both quest and hideout reasons. Priority logic correct for all combinations.

---

## Phase 7: User Story 5 - Hideout Module Visual Cards (P3)

**Goal**: Polish hideout module cards with icons, status indicators, and visual hierarchy

### Visual Polish

- [X] T026 [P] [US5] Add hideout station icons to HideoutCard in src/components/hideout-card.js

**Details**: Add icon display to HideoutCard.render(). Use station name to determine icon. Options: use emoji placeholders (🏭 Generator, 💡 Vents, 🚿 Lavatory, etc.), use text initials, or add SVG icons if available. Add CSS class for icon styling (circular background, consistent size).

**Acceptance**: Each hideout module card displays icon or placeholder. Icons visually distinct for different stations. Icons sized consistently (~40-48px). CSS styled with background circle.

---

- [X] T027 [P] [US5] Enhance HideoutCard visual design with hover effects and status indicators in src/components/hideout-card.js and styles/hideout-tracker.css

**Details**: Add hover effect to cards (subtle shadow, transform scale). Add status indicators: checkmark icon (✓) for built modules, lock icon (🔒) for locked modules (unbuilt prerequisites). Add progress indicator for multi-level modules (e.g., "Level 2 / 3"). Style built modules with green border or background tint. Style locked modules with gray overlay.

**Acceptance**: Cards have hover effect. Built modules show checkmark and green styling. Locked modules show lock icon and gray styling. Level progress clear. Visual hierarchy obvious (built > buildable > locked).

---

- [X] T028 [P] [US5] Add item requirement cards within hideout cards in src/components/hideout-card.js

**Details**: In HideoutCard.render(), for unbuilt modules, render required items list. For each item, show: item name, quantity needed (e.g., "5x Bolts"), small item icon (if available). Make item names clickable - add data-item-id attribute and click handler to open ItemDetailModal (reuse existing modal from Feature 003). Style as compact list or small cards.

**Acceptance**: Required items displayed for unbuilt modules. Item names clickable. Clicking opens ItemDetailModal with item details. Quantity displayed clearly. Layout compact but readable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Goal**: Error handling, loading states, performance optimization, documentation

### Error Handling

- [X] T029 Add error handling for hideout progress sync failures in src/services/hideout-progress-service.js

**Details**: Wrap Supabase calls in try-catch. On error, log to console and fallback to localStorage. Return success/error status. In HideoutList, show user-friendly error message if sync fails (e.g., toast notification or inline message: "Failed to sync to database. Using local storage."). Don't block user interaction on sync errors.

**Acceptance**: Supabase errors caught and logged. Fallback to localStorage works. User sees error message but can continue using feature. Data persists to localStorage even if database sync fails.

---

- [X] T030 Add loading states for hideout progress load in src/components/hideout-list.js and styles/hideout-tracker.css

**Details**: In HideoutList.render(), show skeleton cards or spinner while loading hideout data. Disable toggle buttons during save (add .saving class with disabled styling). Show loading indicator during save. In CSS, style skeleton cards with animated gradient background. Style disabled buttons with reduced opacity and cursor: not-allowed.

**Acceptance**: Loading skeleton/spinner displays while fetching hideout data. Buttons disabled during save. Loading indicator visible. User cannot trigger multiple simultaneous saves. Loading states styled consistently with rest of app.

---

### Performance Optimization

- [X] T031 Add memoization to HideoutModule.calculateDependencyDepth() in src/models/hideout-module.js

**Details**: In calculateDependencyDepth(), check memo map before calculating. If moduleKey in memo, return cached value. After calculating, store in memo. Add clearMemoCache() static method to clear cache (call when hideout progress changes). Pass memo map through recursive calls.

**Acceptance**: Memoization prevents redundant calculations. Depth calculated once per module per progress state. Cache cleared on progress change. Performance improved for modules with shared prerequisites.

---

- [X] T032 Optimize priority recalculation to only affect changed items in src/services/priority-service.js

**Details**: When hideout progress changes, identify which modules were affected. Only recalculate priorities for items that depend on those modules. Add getAffectedItems(moduleKey, itemTrackerManager) helper to filter items. Batch priority updates to avoid multiple re-renders.

**Acceptance**: Priority recalculation only processes affected items. Unaffected items skip calculation. Batch updates prevent multiple renders. Performance < 100ms for 500 items (SC-003).

---

- [X] T033 Test performance with 500 items and profile bottlenecks

**Details**: Manual testing task. Load ItemTracker with ~500 items. Mark hideout module as built. Use browser DevTools Performance tab to profile priority recalculation. Measure time from toggle click to UI update. Verify < 100ms calculation time (SC-003), < 500ms visual feedback (SC-002). Identify and optimize any bottlenecks (e.g., excessive DOM manipulation, slow loops).

**Acceptance**: Priority calculation completes in < 100ms for 500 items. Visual feedback within 500ms. No UI lag or freezing. Profiler shows no obvious bottlenecks. Performance metrics meet success criteria.

---

### Documentation

- [X] T034 Update README.md with Hideout Tracker section in README.md

**Details**: Add new section "Hideout Tracker" under Usage. Document: how to access (Item Tracker tab → Hideout Progress subtab), how to mark modules as built, how priorities work (NEED_NOW/NEED_SOON/NEED_LATER), database sync requirement (add supabase-hideout-progress.sql to setup instructions). Update Quick Start section step 4 to include new migration file.

**Acceptance**: README.md has Hideout Tracker section. Usage instructions clear. Three-tier priority system explained. Database setup instructions updated with new migration file. Screenshots/examples added (optional).

---

### Testing

- [X] T035 Test US1 Scenario 1.1: View initial hideout state per quickstart.md

**Details**: Fresh user (clear localStorage and database). Navigate to Item Tracker → Hideout Progress subtab. Verify: all hideout modules displayed, all at Level 0, each shows required items for Level 1, status shows "Not Built".

**Acceptance**: All 12-15 hideout areas visible. Level 0 for all. Required items listed. Status correct. No errors in console.

---

- [X] T036 Test US1 Scenario 1.2: Mark module as built per quickstart.md

**Details**: Click "Mark as Built" on a module (e.g., Generator Level 1). Verify: module card updates immediately (< 500ms), status changes to "Built" with checkmark, no full page reload, console shows success message (optional).

**Acceptance**: Toggle response < 500ms (SC-002). Visual update immediate. Build status changes. Database sync completes within 2 seconds (SC-006). No errors.

---

- [X] T037 Test US1 Scenario 1.3: Persistence after refresh per quickstart.md

**Details**: Mark some modules as built. Refresh page (F5). Verify: built modules still show "Built", unbuilt modules still show "Not Built", progress persists.

**Acceptance**: Progress loads from database (if authenticated) or localStorage. State matches pre-refresh state. No data loss. Load time reasonable (< 2 seconds).

---

- [X] T038 Test US1 Scenario 1.4: LocalStorage fallback (not authenticated) per quickstart.md

**Details**: Log out or use incognito mode (no auth). Mark modules as built. Refresh page. Verify: progress persists using localStorage, no error messages, UI works identically to authenticated mode.

**Acceptance**: LocalStorage fallback works. Progress persists across refreshes. No Supabase errors in console. Feature fully functional without authentication.

---

- [X] T039 Test US2 Scenario 2.1: NEED_NOW for buildable modules per quickstart.md

**Details**: Identify a buildable module (no unbuilt prerequisites, e.g., Generator Level 1). Navigate to Items subtab. Find items for that module. Verify: items show NEED_NOW priority, badge is red/orange, text says "NEED NOW".

**Acceptance**: Items for buildable modules have NEED_NOW priority. Badge color correct. Priority text correct. Tooltip explains "buildable now (0 steps away)".

---

- [X] T040 Test US2 Scenario 2.2: NEED_SOON for 1-2 steps away per quickstart.md

**Details**: Identify a module requiring 1 unbuilt prerequisite (e.g., Lavatory Level 2 requires Vents Level 1). Verify Vents not built. View items for Lavatory. Verify: items show NEED_SOON priority, badge is yellow, text says "NEED SOON".

**Acceptance**: Items for modules 1-2 steps away have NEED_SOON priority. Badge color yellow. Tooltip explains "1-2 modules blocking".

---

- [X] T041 Test US2 Scenario 2.3: NEED_LATER for 3+ steps away per quickstart.md

**Details**: Identify a high-level module requiring 3+ unbuilt prerequisites. View items for that module. Verify: items show NEED_LATER priority, badge is blue/gray, text says "NEED LATER".

**Acceptance**: Items for modules 3+ steps away have NEED_LATER priority. Badge color blue/gray. Tooltip explains "3+ modules blocking".

---

- [X] T042 Test US2 Scenario 2.4: Priority updates on progress change per quickstart.md

**Details**: Find items with NEED_SOON priority. Mark the blocking prerequisite as built. Verify: ItemTracker refreshes automatically, items upgrade to NEED_NOW (if no other prerequisites), badge color changes from yellow to red/orange, change visible within 1 second.

**Acceptance**: Priority recalculation triggered by hideout progress change. Items upgrade to higher priority when prerequisites built. Visual update within 1 second. No manual refresh needed.

---

- [X] T043 Test US3 Scenario 3.1: Tooltip on desktop hover per quickstart.md

**Details**: On desktop, hover over priority badge. Verify: tooltip appears above/below badge, tooltip explains priority meaning, tooltip mentions depth/distance, tooltip disappears on mouse leave.

**Acceptance**: Tooltip appears on hover. Text clear and helpful. Positioning correct (doesn't overflow screen). Disappears on mouse leave. Works in all browsers (Chrome, Firefox, Safari).

---

- [X] T044 Test US3 Scenario 3.2: Tooltip on mobile tap per quickstart.md

**Details**: On mobile device or DevTools mobile emulation (375px width), tap priority badge or info icon (ⓘ). Verify: tooltip appears, text readable on small screen, tooltip dismissible (tap outside or X).

**Acceptance**: Mobile tooltip mechanism works (hover doesn't trigger). Tap shows tooltip. Text readable. Dismissible. Touch target >= 44px.

---

- [X] T045 Test US4 Scenario 4.1: NEED_NOW for unlocked quests per quickstart.md

**Details**: Identify an unlocked, incomplete quest. View items for that quest. Verify: items show NEED_NOW priority, tooltip mentions "quest" as reason.

**Acceptance**: Quest items prioritized correctly. Unlocked quests = NEED_NOW. Tooltip shows quest reason.

---

- [X] T046 Test US4 Scenario 4.2: NEED_SOON for 1-2 prerequisite quests away per quickstart.md

**Details**: Identify a quest behind 1-2 incomplete prerequisites. View items. Verify: items show NEED_SOON priority, tooltip shows quest depth.

**Acceptance**: Quest depth calculation correct. Items show NEED_SOON. Tooltip explains "2 quests away" or similar.

---

- [X] T047 Test US4 Scenario 4.3: NEED_LATER for 3+ prerequisite quests away per quickstart.md

**Details**: Identify a quest behind 3+ incomplete prerequisites. View items. Verify: items show NEED_LATER priority, tooltip shows quest depth.

**Acceptance**: Quest depth calculation correct for long chains. Items show NEED_LATER. Tooltip explains "4+ quests away".

---

- [X] T048 Test US4 Scenario 4.4: Priority merging (quest + hideout) per quickstart.md

**Details**: Find item needed for both buildable hideout module (NEED_NOW) and locked quest (NEED_LATER). Verify: item shows NEED_NOW (highest priority), tooltip mentions both sources.

**Acceptance**: Multiple sources merged correctly. Highest priority wins. Tooltip lists both quest and hideout reasons. User understands item is urgently needed.

---

- [X] T049 Test US5 Scenario 5.1: Visual card design per quickstart.md

**Details**: View hideout module cards. Verify: each card shows icon/placeholder, module name, current level / max level, build status.

**Acceptance**: Card layout clean and readable. All information visible. Icons/placeholders present. Level progress clear. Build status obvious.

---

- [X] T050 Test US5 Scenario 5.2: Required items display per quickstart.md

**Details**: View unbuilt module card. Verify: required items listed, quantities shown, items clickable, clicking opens ItemDetailModal.

**Acceptance**: Required items list complete. Quantities correct. Items clickable. Modal opens with correct item details. Modal reuses existing component from Feature 003.

---

- [ ] T051 Test US5 Scenario 5.3: Built module indicator per quickstart.md

**Details**: View built module card. Verify: "Built" status clear, checkmark or green border present, required items hidden or grayed out.

**Acceptance**: Built modules visually distinct. Status indicator obvious. Required items section changes (hidden/grayed). Toggle button changes to "Unmark" or disabled.

---

- [ ] T052 Mobile responsiveness testing per quickstart.md

**Details**: Test on 375px width (iPhone SE emulation). Verify: no horizontal scrolling, subtab buttons accessible, hideout cards stack vertically, touch targets >= 44px, item cards readable.

**Acceptance**: SC-010 met (no horizontal scroll on 375px). Touch targets meet accessibility standards. Layout adapts to small screens. Text readable without zooming.

---

- [ ] T053 Cross-browser testing per quickstart.md

**Details**: Test on Chrome, Firefox, Safari. Verify: tooltips work, CSS grid layout correct, subtab navigation works, database sync works, priority colors consistent.

**Acceptance**: Feature works in all major browsers. No CSS layout issues. Tooltips functional. Database sync reliable. Priority colors render correctly.

---

- [ ] T054 Performance validation per quickstart.md

**Details**: Load ItemTracker with ~500 items. Mark hideout module as built. Use DevTools to measure: priority calculation time (target < 100ms), visual feedback time (target < 500ms), database sync time (target < 2s). Verify SC-002, SC-003, SC-006 met.

**Acceptance**: All performance success criteria met. No UI lag. Priority calculation < 100ms. Visual update < 500ms. Database sync < 2s. No performance regressions vs Feature 003.

---

## Task Execution Guidelines

### Task Format
Each task follows the format:
- **Checkbox**: `- [ ]` for tracking completion
- **Task ID**: Sequential number (T001, T002, ...)
- **[P] marker**: Tasks that can be parallelized (different files, no dependencies)
- **[US#] marker**: Tasks specific to a user story (US1-US5)
- **Description**: Clear action with file path

### Parallelization Opportunities
Tasks marked with `[P]` can be done in parallel as they touch different files or have no dependencies on incomplete work. For example:
- T002, T003 can be done in parallel (both modify hideout-module.js but different methods)
- T010, T011, T012 can be done in parallel (different component files)
- T026, T027, T028 can be done in parallel (different aspects of HideoutCard)

### Dependencies
Some tasks must be done sequentially:
- T001 (database migration) should be done before T005 (HideoutProgressService uses database)
- T004 (Priority constants) before T008 (PriorityService uses new constants)
- T010-T012 (core components) before T013-T018 (integration into ItemTracker)
- Foundation (T001-T009) before User Stories (T010+)
- User Stories before Testing (T035+)

### Testing Strategy
- **Unit Testing**: Each component/service should be testable independently
- **Integration Testing**: Test interactions between components (e.g., T021, T024, T025)
- **Acceptance Testing**: Test user stories per quickstart.md (T035-T053)
- **Performance Testing**: Verify success criteria met (T033, T054)

---

## Implementation Strategy

### MVP First (Minimum Viable Product)
To deliver value quickly, implement in this order:
1. **Phase 1 (T001-T009)**: Foundation - enables all other work
2. **Phase 3 (T013-T018)**: US1 - users can track hideout progress
3. **Phase 4 (T019-T021)**: US2 - smart priorities visible
4. **Phase 5 (T022-T023)**: US3 - tooltips explain priorities

This delivers core value (~60% of tasks) before polish (US4, US5, Phase 8).

### Incremental Delivery
Each user story is independently testable:
- **US1**: Hideout tracking works without priority changes
- **US2**: Priority changes work without tooltips
- **US3**: Tooltips work independently
- **US4**: Quest integration is separate from hideout
- **US5**: Visual polish is last

### Suggested Execution Order
1. T001-T009 (Foundation - 9 tasks)
2. T010-T012 (Core components - 3 tasks, can parallelize)
3. T013-T018 (US1 integration - 6 tasks)
4. T035-T038 (Test US1 - 4 tasks)
5. T019-T021 (US2 priorities - 3 tasks)
6. T039-T042 (Test US2 - 4 tasks)
7. T022-T023 (US3 tooltips - 2 tasks)
8. T043-T044 (Test US3 - 2 tasks)
9. T024-T025 (US4 quest integration - 2 tasks)
10. T045-T048 (Test US4 - 4 tasks)
11. T026-T028 (US5 visual polish - 3 tasks, can parallelize)
12. T049-T051 (Test US5 - 3 tasks)
13. T029-T034 (Polish & docs - 6 tasks)
14. T052-T054 (Final testing - 3 tasks)

---

## Success Metrics

### Functional Completeness
- [ ] All 5 user stories implemented (US1-US5)
- [ ] All 15 functional requirements met (FR-001 through FR-015)
- [ ] All 5 edge cases handled

### Performance Targets
- [ ] SC-002: Module toggle feedback < 500ms
- [ ] SC-003: 95% of priority calculations < 100ms
- [ ] SC-006: Database sync < 2 seconds

### Quality Targets
- [ ] SC-010: No horizontal scrolling on 375px mobile screens
- [ ] SC-004: Priority legend visible and understandable
- [ ] All quickstart.md test scenarios passing

### User Experience
- [ ] Subtab navigation intuitive
- [ ] Three priority levels visually distinct
- [ ] Tooltips helpful without cluttering UI
- [ ] Mobile experience smooth (touch targets, no hover issues)

---

## File Summary

### New Files to Create (7)
1. `supabase-hideout-progress.sql` - Database migration
2. `src/services/hideout-progress-service.js` - Hideout progress sync service
3. `src/components/priority-badge.js` - Priority badge with tooltip
4. `src/components/hideout-card.js` - Individual hideout module card
5. `src/components/hideout-list.js` - Hideout module grid
6. `styles/hideout-tracker.css` - Hideout tracker styles
7. `specs/004-hideout-item-enhancements/quickstart.md` - Already created

### Files to Modify (9)
1. `src/models/item.js` - Priority constants
2. `src/models/hideout-module.js` - Dependency depth methods
3. `src/models/hideout-manager.js` - Service integration
4. `src/services/priority-service.js` - Three-tier priority logic
5. `src/components/item-tracker.js` - Subtab navigation
6. `src/components/item-card.js` - Use PriorityBadge
7. `styles/item-tracker.css` - Priority colors, tooltips
8. `index.html` - Subtab HTML, stylesheet link
9. `README.md` - Feature documentation

---

**Ready to begin implementation!** Start with Phase 1 (Foundation) tasks T001-T009.

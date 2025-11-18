# Tasks: All-Quests Item Tracker View

**Feature**: 006-all-quests-item-tracker  
**Input**: Design documents from `/specs/006-all-quests-item-tracker/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested in specification - TDD approach not required

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story] Description`

- **Checkbox**: `- [ ]` indicates task not started
- **[ID]**: Sequential task identifier (T001, T002, T003...)
- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- **File paths**: Exact paths to modified/created files included in descriptions

## Path Conventions

This is a web application frontend with structure:
- Source code: `src/models/`, `src/components/`, `src/services/`
- Styles: `styles/`
- Configuration: Repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and enum definitions

- [X] T001 Add ViewingMode enum to src/models/item.js with ACTIVE and ALL values
- [X] T002 [P] Add ItemStatus enum to src/models/item.js with ACTIVE, COMPLETED, and BOTH values
- [X] T003 [P] Add StatusFilter enum to src/models/item.js with ACTIVE, COMPLETED, and BOTH values

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Modify ItemTrackerManager.extractQuestRequirements() in src/models/item-tracker-manager.js to accept includeCompleted parameter (default false)
- [X] T005 Update quest completion check in extractQuestRequirements() from `if (quest.completed)` to `if (!includeCompleted && quest.completed)` in src/models/item-tracker-manager.js
- [X] T006 Add includeCompleted parameter to ItemTrackerManager.aggregateRequirements() method in src/models/item-tracker-manager.js
- [X] T007 Pass includeCompleted to extractQuestRequirements() call within aggregateRequirements() in src/models/item-tracker-manager.js
- [X] T008 Add includeCompleted parameter to ItemTrackerManager.refresh() method in src/models/item-tracker-manager.js
- [X] T009 Pass includeCompleted to aggregateRequirements() call within refresh() in src/models/item-tracker-manager.js
- [X] T010 [P] Add getQuestStatus(questId) helper method to ItemTrackerManager in src/models/item-tracker-manager.js
- [X] T011 [P] Add getQuestSourceStatus(questManager) method to AggregatedItem class in src/models/item.js
- [X] T012 [P] Add getQuestSourceCounts(questManager) method to AggregatedItem class in src/models/item.js
- [X] T013 [P] Add hasQuestSources() method to AggregatedItem class in src/models/item.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Toggle Between Active and All Quests View (Priority: P1) 🎯 MVP

**Goal**: Enable users to switch between "Active Quests" (incomplete only) and "All Quests" (including completed) viewing modes with persistence across page refreshes

**Independent Test**: Toggle mode buttons, verify item count increases in All Quests mode, refresh page and verify mode persists

### Implementation for User Story 1

- [X] T014 [P] [US1] Add viewingMode property to ItemTracker constructor in src/components/item-tracker.js with default value ViewingMode.ACTIVE
- [X] T015 [P] [US1] Update loadFilters() method in src/components/item-tracker.js to read viewingMode from localStorage key 'item-tracker-filters'
- [X] T016 [P] [US1] Update saveFilters() method in src/components/item-tracker.js to persist viewingMode to localStorage
- [X] T017 [US1] Implement switchViewingMode(mode) method in src/components/item-tracker.js that updates viewingMode, saves filters, and calls refresh
- [X] T018 [US1] Update refresh() call in ItemTracker to pass includeCompleted flag based on viewingMode in src/components/item-tracker.js
- [X] T019 [US1] Add viewing mode toggle button group to ItemTracker.getTemplate() HTML in src/components/item-tracker.js with data-mode attributes
- [X] T020 [US1] Add event listeners for mode toggle buttons in ItemTracker.attachEventListeners() in src/components/item-tracker.js
- [X] T021 [US1] Implement button active state toggle logic when mode changes in src/components/item-tracker.js
- [X] T022 [US1] Add CSS styles for .viewing-mode-toggle container in styles/item-tracker.css
- [X] T023 [US1] Add CSS styles for .mode-btn and .mode-btn.active states in styles/item-tracker.css

**Checkpoint**: At this point, User Story 1 should be fully functional - users can toggle modes and see all quest items with persistence

---

## Phase 4: User Story 2 - Visual Differentiation of Completed Quest Items (Priority: P1) 🎯 MVP

**Goal**: Provide clear visual indicators (badges, styling) to distinguish items required by completed vs incomplete quests in All Quests mode

**Independent Test**: Complete several quests, view All Quests mode, verify status badges appear (Completed, Mixed with counts)

### Implementation for User Story 2

- [X] T024 [P] [US2] Update ItemList.renderItemCard() signature in src/components/item-list.js to accept viewingMode parameter
- [X] T025 [P] [US2] Add status badge rendering logic to renderItemCard() in src/components/item-list.js checking viewingMode === ALL and item.hasQuestSources()
- [X] T026 [P] [US2] Implement ItemStatus.COMPLETED badge HTML generation in renderItemCard() in src/components/item-list.js
- [X] T027 [P] [US2] Implement ItemStatus.BOTH mixed badge HTML with quest counts in renderItemCard() in src/components/item-list.js
- [X] T028 [P] [US2] Update ItemList.render() to pass current viewingMode to renderItemCard() calls in src/components/item-list.js
- [X] T029 [US2] Update ItemDetailModal.renderQuestSources() signature in src/components/item-detail-modal.js to accept viewingMode and questManager parameters
- [X] T030 [US2] Add quest source grouping logic to renderQuestSources() in src/components/item-detail-modal.js separating Active and Completed sections when viewingMode === ALL
- [X] T031 [US2] Add section header rendering for "Active Quests" and "Completed Quests" groups in src/components/item-detail-modal.js
- [X] T032 [US2] Update modal open calls to pass viewingMode and questManager in src/components/item-detail-modal.js
- [X] T033 [US2] Add .badge-completed CSS styles in styles/item-tracker.css with gray color and 70% opacity
- [X] T034 [US2] Add .badge-mixed CSS styles in styles/item-tracker.css with appropriate styling for split status
- [X] T035 [US2] Add .source-group-header CSS styles in styles/item-tracker.css for modal section headers
- [X] T036 [US2] Add .completed modifier CSS class in styles/item-tracker.css for faded completed item styling

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users see clear visual differentiation in All Quests mode

---

## Phase 5: User Story 3 - Filter Options in All Quests Mode (Priority: P2)

**Goal**: Enable users to filter within All Quests mode to show only active, only completed, or both quest items

**Independent Test**: In All Quests mode, apply status filters and verify correct items appear based on quest completion status

### Implementation for User Story 3

- [X] T037 [P] [US3] Add statusFilter property to ItemTracker constructor in src/components/item-tracker.js with default value StatusFilter.BOTH
- [X] T038 [P] [US3] Update loadFilters() in src/components/item-tracker.js to read statusFilter from localStorage (only applies when viewingMode === ALL)
- [X] T039 [P] [US3] Update saveFilters() in src/components/item-tracker.js to persist statusFilter to localStorage
- [X] T040 [US3] Implement applyStatusFilter(filter) method in src/components/item-tracker.js that updates statusFilter and refreshes display
- [X] T041 [US3] Add status filter dropdown to ItemTracker.getTemplate() HTML in src/components/item-tracker.js (visible only when viewingMode === ALL)
- [X] T042 [US3] Add event listener for status filter dropdown in ItemTracker.attachEventListeners() in src/components/item-tracker.js
- [X] T043 [US3] Update ItemList.applyFilters() signature in src/components/item-list.js to accept statusFilter parameter
- [X] T044 [US3] Add status filtering logic to applyFilters() in src/components/item-list.js using item.getQuestSourceStatus()
- [X] T045 [US3] Implement StatusFilter.ACTIVE logic to show only items with ACTIVE or BOTH status in src/components/item-list.js
- [X] T046 [US3] Implement StatusFilter.COMPLETED logic to show only items with COMPLETED or BOTH status in src/components/item-list.js
- [X] T047 [US3] Update filter reset logic to clear statusFilter when switching to Active Quests mode in src/components/item-tracker.js
- [X] T048 [US3] Add CSS styles for status filter dropdown in styles/item-tracker.css

**Checkpoint**: All filter options functional - users can refine All Quests view by quest status

---

## Phase 6: User Story 4 - Quest Count Indicators on Item Cards (Priority: P2)

**Goal**: Display quest count summaries on item cards showing breakdown of active vs completed quest sources

**Independent Test**: View items with multiple quest sources, verify count badges show correct numbers (e.g., "3 Active, 2 Completed")

### Implementation for User Story 4

- [X] T049 [P] [US4] Add quest count display logic to renderItemCard() in src/components/item-list.js when viewingMode === ALL and item has multiple quest sources
- [X] T050 [P] [US4] Use item.getQuestSourceCounts(questManager) to retrieve active and completed counts in src/components/item-list.js
- [X] T051 [US4] Implement conditional rendering showing quest name for single source vs count badge for multiple in src/components/item-list.js
- [X] T052 [US4] Add quest count update logic when questUpdated event fires in src/components/item-tracker.js
- [X] T053 [US4] Add CSS styles for .quest-count-badge in styles/item-tracker.css

**Checkpoint**: Quest count indicators provide additional context in All Quests mode

---

## Phase 7: User Story 5 - All Quests Mode With Hideout Integration (Priority: P3)

**Goal**: Optionally include all hideout items (completed and incomplete modules) in All Quests mode for complete forward planning

**Independent Test**: Enable "Include All Hideout" option, verify hideout items from completed modules appear with appropriate badges

### Implementation for User Story 5

- [X] T054 [P] [US5] Add includeAllHideout property to ItemTracker in src/components/item-tracker.js with default false
- [X] T055 [P] [US5] Update loadFilters() to read includeAllHideout preference from localStorage in src/components/item-tracker.js
- [X] T056 [P] [US5] Update saveFilters() to persist includeAllHideout to localStorage in src/components/item-tracker.js
- [X] T057 [US5] Modify ItemTrackerManager to support including completed hideout modules when includeCompleted flag is true in src/models/item-tracker-manager.js
- [X] T058 [US5] Add "Include All Hideout" checkbox to ItemTracker template in src/components/item-tracker.js (visible only when viewingMode === ALL)
- [X] T059 [US5] Add event listener for hideout inclusion checkbox in src/components/item-tracker.js
- [X] T060 [US5] Update hideout item badge rendering to show "Completed - Hideout" in src/components/item-list.js
- [X] T061 [US5] Add hideout sources to grouped quest sources in detail modal under Completed section in src/components/item-detail-modal.js
- [X] T062 [US5] Update refresh logic to pass hideout inclusion flag in src/components/item-tracker.js
- [X] T063 [US5] Add CSS styles for hideout-specific badges in styles/item-tracker.css

**Checkpoint**: All user stories complete - full forward planning capability available

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [ ] T064 [P] Add null/undefined checks to getQuestSourceStatus() for missing questManager in src/models/item.js
- [ ] T065 [P] Add error handling for localStorage access failures in src/components/item-tracker.js
- [ ] T066 [P] Add loading states during mode switching in src/components/item-tracker.js
- [ ] T067 [P] Add tooltip or help text explaining mode differences on first use in src/components/item-tracker.js
- [ ] T068 Verify backward compatibility - Active mode works exactly as before with no visual changes
- [ ] T069 Test with 300+ items to verify performance meets <200ms toggle and <3s render targets
- [ ] T070 Test edge case: User with no completed quests in All Quests mode shows appropriate message
- [ ] T071 Test edge case: Locked quest items show "Locked" badge with level requirement
- [ ] T072 Test persistence across browser refresh for all mode combinations
- [ ] T073 Verify Hide Collected filter works identically in both viewing modes
- [ ] T074 Manual testing across all acceptance scenarios from spec.md user stories
- [ ] T075 Run quickstart.md validation checklist to confirm all phases implemented
- [ ] T076 [P] Update README.md with feature documentation if needed
- [ ] T077 [P] Code cleanup and remove any debug logging

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - MVP foundation
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion - extends MVP with visual differentiation
- **User Story 3 (Phase 5)**: Depends on User Story 2 completion - adds filtering within All Quests mode
- **User Story 4 (Phase 6)**: Depends on User Story 2 completion - independent enhancement, can run parallel to US3
- **User Story 5 (Phase 7)**: Depends on User Story 2 completion - independent feature extension
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Core toggle functionality - MUST complete for MVP
  - Dependencies: Phase 1 (Setup) + Phase 2 (Foundational)
  - Independent test: Toggle modes, verify persistence
  
- **User Story 2 (P1)**: Visual differentiation - MUST complete for MVP usability
  - Dependencies: User Story 1 complete
  - Independent test: Badges and grouping visible in All Quests mode
  
- **User Story 3 (P2)**: Status filtering enhancement
  - Dependencies: User Story 2 complete
  - Independent test: Filters work within All Quests mode
  - Can be deferred post-MVP
  
- **User Story 4 (P2)**: Quest count indicators
  - Dependencies: User Story 2 complete
  - Independent test: Count badges show on multi-quest items
  - Can run parallel to US3, can be deferred post-MVP
  
- **User Story 5 (P3)**: Hideout integration
  - Dependencies: User Story 2 complete
  - Independent test: Completed hideout items appear with toggle
  - Can run parallel to US3/US4, can be deferred post-MVP

### MVP Scope

**Minimum Viable Product** = Phase 1 + Phase 2 + Phase 3 (US1) + Phase 4 (US2)

This delivers core value:
- Toggle between Active/All Quests modes
- Visual differentiation of completed items
- Persistence across sessions
- Backward compatibility maintained

Estimated: ~150 lines of code, 3-4 hours development time

**Enhanced Product** = MVP + Phase 5 (US3) + Phase 6 (US4)

Adds filtering and context indicators  
Estimated: ~200 lines of code, 5-6 hours development time

**Complete Product** = Enhanced + Phase 7 (US5) + Phase 8 (Polish)

Full feature with hideout integration  
Estimated: ~240 lines of code, 6-8 hours development time

### Within Each User Story

- User Story 1: T014-T016 [P] can run in parallel (different aspects), then T017-T018 (logic), then T019-T021 (UI), then T022-T023 [P] (styling)
- User Story 2: T024-T028 [P] (item list), T029-T032 (modal), T033-T036 [P] (styling) can run parallel
- User Story 3: T037-T039 [P] (state), T040-T042 (UI), T043-T047 (filtering), T048 (styling)
- User Story 4: T049-T051 [P] (rendering), T052-T053 (updates and styling)
- User Story 5: T054-T056 [P] (state), T057-T062 (logic and UI), T063 (styling)

### Parallel Opportunities

**Phase 1 (Setup)**:
- T002 and T003 can run in parallel (different enums)

**Phase 2 (Foundational)**:
- T010, T011, T012, T013 can all run in parallel (different independent methods)

**Phase 3 (User Story 1)**:
- T014, T015, T016 can run in parallel (different state aspects)
- T019, T020, T021 must be sequential (UI dependencies)
- T022, T023 can run in parallel (different CSS rules)

**Phase 4 (User Story 2)**:
- T024-T028 (ItemList changes) can run parallel to T029-T032 (ItemDetailModal changes)
- T033-T036 can all run in parallel (different CSS rules)

**Phase 5-7 (User Stories 3-5)**:
- After US2 complete, US3, US4, and US5 can all be worked on in parallel by different developers

**Phase 8 (Polish)**:
- T064-T067 can run in parallel (different independent improvements)
- T076-T077 can run in parallel (documentation)

---

## Parallel Example: User Story 1 Implementation

```bash
# Developer 1: State management
git checkout -b feature/us1-state-management
# Complete T014, T015, T016 (viewingMode property and persistence)

# Developer 2: UI Components (waits for state)
git checkout -b feature/us1-ui-controls
# Complete T019, T020, T021 (toggle buttons and event handlers)

# Developer 3: Styling (can start anytime)
git checkout -b feature/us1-styling
# Complete T022, T023 (CSS for toggle controls)

# Integration: Merge all three branches
# Complete T017, T018 (integrate switchViewingMode with refresh logic)
```

---

## Parallel Example: User Story 2 Implementation

```bash
# Team A: Item List
git checkout -b feature/us2-item-list
# Complete T024-T028 (badge rendering in item cards)

# Team B: Detail Modal (parallel to Team A)
git checkout -b feature/us2-modal
# Complete T029-T032 (quest source grouping)

# Team C: Styling (parallel to both)
git checkout -b feature/us2-styling
# Complete T033-T036 (badge and group CSS)

# Integration: Merge all three branches, test together
```

---

## Implementation Strategy

### Recommended Approach

1. **Start with MVP** (Phases 1-4):
   - Complete Setup (Phase 1) - 15 minutes
   - Complete Foundational (Phase 2) - 1-2 hours
   - Complete User Story 1 (Phase 3) - 1 hour
   - Complete User Story 2 (Phase 4) - 1-2 hours
   - **Total MVP time**: 3-4 hours
   - **Delivers**: Core toggle and visual differentiation

2. **Enhance as Needed** (Phases 5-6):
   - Add User Story 3 (filtering) if users request it
   - Add User Story 4 (counts) for better context
   - **Additional time**: 1-2 hours per story

3. **Full Feature** (Phase 7):
   - Add User Story 5 (hideout) for completeness
   - **Additional time**: 1-2 hours

4. **Polish Always** (Phase 8):
   - Test edge cases
   - Verify performance
   - Final cleanup
   - **Time**: 1 hour

### Testing After Each Phase

- After Phase 2: Run ItemTrackerManager tests, verify includeCompleted flag works
- After Phase 3: Toggle modes in browser, verify item counts change
- After Phase 4: Complete some quests, verify badges appear
- After Phase 5: Apply filters, verify correct items show/hide
- After Phase 6: Check items with multiple quests, verify counts
- After Phase 7: Enable hideout toggle, verify completed hideout items
- After Phase 8: Full regression testing against all acceptance scenarios

---

## Task Count Summary

- **Total Tasks**: 77 tasks
- **Setup Phase**: 3 tasks
- **Foundational Phase**: 10 tasks (blocking)
- **User Story 1 (P1)**: 10 tasks - MVP core
- **User Story 2 (P1)**: 13 tasks - MVP visuals
- **User Story 3 (P2)**: 12 tasks - Enhanced filtering
- **User Story 4 (P2)**: 5 tasks - Enhanced context
- **User Story 5 (P3)**: 10 tasks - Full feature
- **Polish Phase**: 14 tasks - Quality and validation

### Parallel Task Opportunities

- **Setup**: 2 parallel tasks (T002, T003)
- **Foundational**: 4 parallel tasks (T010-T013)
- **User Story 1**: 5 parallel opportunities across 10 tasks
- **User Story 2**: 8 parallel opportunities across 13 tasks
- **User Story 3**: 3 parallel opportunities across 12 tasks
- **User Story 4**: 2 parallel opportunities across 5 tasks
- **User Story 5**: 3 parallel opportunities across 10 tasks
- **Polish**: 7 parallel tasks (T064-T067, T076-T077)

**Total Parallel Opportunities**: ~34 tasks can run in parallel (44% of total)

---

## Success Metrics

### Performance Targets

- [ ] Mode toggle response time < 200ms
- [ ] Item list render time < 3 seconds for 300+ items
- [ ] Filter application response < 100ms
- [ ] Detail modal open time < 1 second

### Functional Validation

- [ ] All 5 user stories pass acceptance scenarios from spec.md
- [ ] Mode selection persists 100% across page refreshes
- [ ] Status badges show correctly for 95%+ of items
- [ ] Backward compatibility - Active mode unchanged
- [ ] Edge cases handled gracefully (no completed quests, locked quests, etc.)

### Code Quality

- [ ] All methods follow existing code patterns
- [ ] No console errors in browser
- [ ] localStorage operations have error handling
- [ ] Null/undefined checks for all external dependencies
- [ ] CSS follows existing naming conventions

---

## Notes

- **Tests not included**: Feature specification did not request TDD approach or automated tests
- **File paths verified**: All paths match actual project structure from plan.md
- **Backward compatibility**: Active mode (default) behaves exactly as before
- **Incremental delivery**: MVP (Phases 1-4) delivers core value, rest is enhancement
- **Performance validated**: 300 items within browser capabilities, no optimization needed
- **Pattern reuse**: Badge system extends existing .badge-kappa/.badge-lightkeeper patterns

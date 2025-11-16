# Implementation Tasks: Quest & Hideout Item Tracker

**Feature**: 003-item-tracker  
**Generated**: 2025-11-16  
**Total Tasks**: 67  
**Estimated Duration**: 8-10 days

---

## Overview

This document breaks down the Item Tracker feature into atomic, executable tasks organized by user story. Each task follows strict checklist format with task ID, parallelization marker, story label, and file path.

**Task Format**: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **TaskID**: Sequential number (T001, T002, etc.)
- **[P]**: Parallelizable (different files, no dependencies)
- **[Story]**: User story label (US1, US2, etc.) - only for story phase tasks
- **Description**: Clear action with exact file path

---

## Phase 1: Setup (No Story Label)

**Goal**: Initialize project structure and dependencies

- [X] T001 Add Item Tracker tab button to index.html navigation bar
- [X] T002 Add Item Tracker tab content container div to index.html
- [X] T003 Create styles/item-tracker.css with base layout styles
- [X] T004 Import item-tracker.css in index.html stylesheet section

---

## Phase 2: Foundational (No Story Label)

**Goal**: Build core infrastructure needed by all user stories

### API Layer (Parallel Group 1)

- [X] T005 [P] Create src/api/tarkov-items-api.js with fetchItems() function per contracts/tarkov-items-api.md
- [X] T006 [P] Implement fetchHideoutStations() in src/api/tarkov-items-api.js per contracts/tarkov-hideout-api.md
- [X] T007 [P] Add 24-hour cache logic for items API in src/api/tarkov-items-api.js
- [X] T008 [P] Add 24-hour cache logic for hideout API in src/api/tarkov-items-api.js
- [X] T009 Add error handling with stale cache fallback in src/api/tarkov-items-api.js

### Data Models (Parallel Group 2)

- [X] T010 [P] Create src/models/item.js with Item class per data-model.md
- [X] T011 [P] Add ItemRequirement class to src/models/item.js
- [X] T012 [P] Add AggregatedItem class to src/models/item.js
- [X] T013 [P] Add Priority enum (NEEDED_SOON, NEEDED_LATER) to src/models/item.js
- [X] T014 [P] Create src/models/hideout-module.js with HideoutModule class per data-model.md

### Manager Classes (Sequential - Dependencies Exist)

- [X] T015 Create src/models/hideout-manager.js with HideoutManager class skeleton
- [X] T016 Implement loadStations() method in src/models/hideout-manager.js
- [X] T017 Implement loadProgress() method reading tarkov-hideout-progress from localStorage
- [X] T018 Implement toggleModuleComplete() method in src/models/hideout-manager.js
- [X] T019 Implement isModuleCompleted() method in src/models/hideout-manager.js
- [X] T020 Implement isModuleBuildable() method checking prerequisites in src/models/hideout-manager.js
- [X] T021 Create src/models/item-tracker-manager.js with ItemTrackerManager class skeleton
- [X] T022 Implement aggregateRequirements() method in src/models/item-tracker-manager.js
- [X] T023 Implement extractQuestRequirements() method in src/models/item-tracker-manager.js
- [X] T024 Implement extractHideoutRequirements() method in src/models/item-tracker-manager.js
- [X] T025 Implement detectFiR() helper function in src/models/item-tracker-manager.js

### Services (Parallel Group 3)

- [X] T026 [P] Create src/services/priority-service.js with PriorityService.calculate() method per data-model.md
- [X] T027 [P] Create src/services/item-storage-service.js with ItemStorageService class
- [X] T028 [P] Implement loadCollection() method in src/services/item-storage-service.js
- [X] T029 [P] Implement saveCollection() method in src/services/item-storage-service.js
- [X] T030 [P] Implement toggleCollected() method in src/services/item-storage-service.js

---

## Phase 3: User Story 1 - View All Required Items (P1)

**Goal**: Display aggregated item list from quests and hideout

**Independent Test**: View item list with 20-50 items, verify no completed quest items shown

**Story Dependencies**: None (foundational phase must be complete)

### Component Structure

- [X] T031 [P] [US1] Create src/components/item-tracker.js with ItemTracker class skeleton
- [X] T032 [P] [US1] Create src/components/item-list.js with ItemList class skeleton
- [X] T033 [P] [US1] Create src/components/item-card.js with ItemCard class skeleton

### ItemTracker Component

- [X] T034 [US1] Implement ItemTracker.initialize() method in src/components/item-tracker.js
- [X] T035 [US1] Implement ItemTracker.loadItems() calling API in parallel in src/components/item-tracker.js
- [X] T036 [US1] Implement ItemTracker.render() method generating HTML in src/components/item-tracker.js
- [X] T037 [US1] Add event listener for questUpdated event in src/components/item-tracker.js
- [X] T038 [US1] Add event listener for hideoutUpdated event in src/components/item-tracker.js

### ItemList Component

- [X] T039 [US1] Implement ItemList.render() generating item card grid in src/components/item-list.js
- [X] T040 [US1] Implement ItemList.applyFilters() method in src/components/item-list.js
- [X] T041 [US1] Add empty state handling ("All items collected!") in src/components/item-list.js

### ItemCard Component

- [X] T042 [US1] Implement ItemCard.render() generating card HTML with icon, name, quantity in src/components/item-card.js
- [X] T043 [US1] Add priority badge display (⚠️ Needed Soon / 🕐 Needed Later) in src/components/item-card.js
- [X] T044 [US1] Add source subtitle (e.g., "Needed for: Setup, Lavatory 2") in src/components/item-card.js
- [X] T045 [US1] Add FiR indicator badge (🔍 icon) when isFiR=true in src/components/item-card.js

### Integration

- [X] T046 [US1] Import ItemTracker in src/index.js
- [X] T047 [US1] Initialize ItemTracker in TarkovQuestApp.init() in src/index.js
- [X] T048 [US1] Add tab switching logic for item tracker in src/index.js
- [X] T049 [US1] Pass questManager and hideoutManager to ItemTracker constructor in src/index.js

---

## Phase 4: User Story 2 - Filter Items by Category (P1)

**Goal**: Add filter buttons for Quest Items, Hideout Items, Keys, Hide Collected

**Independent Test**: Toggle filters, verify correct items shown/hidden within 100ms

**Story Dependencies**: US1 must be complete (requires item list rendering)

### Filter UI

- [X] T050 [P] [US2] Add filter button group HTML to src/components/item-tracker.js template
- [X] T051 [P] [US2] Style filter buttons in styles/item-tracker.css (active state highlighting)

### Filter Logic

- [X] T052 [US2] Implement matchesCategory() method in src/models/item-tracker-manager.js
- [X] T053 [US2] Add filter state to ItemTracker.filters object in src/components/item-tracker.js
- [X] T054 [US2] Implement filter button click handlers in src/components/item-tracker.js
- [X] T055 [US2] Call ItemList.applyFilters() on filter change in src/components/item-tracker.js
- [X] T056 [US2] Add active filter visual feedback (button styling) in src/components/item-tracker.js
- [X] T057 [US2] Implement filter persistence to localStorage (item-tracker-filters key) in src/components/item-tracker.js
- [X] T058 [US2] Load saved filter state on initialization in src/components/item-tracker.js

---

## Phase 5: User Story 3 - Priority Indicators (P1)

**Goal**: Calculate and display NEEDED SOON vs NEEDED LATER based on quest/hideout unlock status

**Independent Test**: Complete quest prerequisites, verify item priority updates to NEEDED SOON

**Story Dependencies**: US1 must be complete (requires item display), US2 recommended (benefits from filtering)

### Priority Calculation

- [X] T059 [US3] Implement PriorityService.calculate() checking quest unlock status in src/services/priority-service.js
- [X] T060 [US3] Add hideout buildable check to PriorityService.calculate() in src/services/priority-service.js
- [X] T061 [US3] Call calculatePriorities() in ItemTrackerManager.initialize() in src/models/item-tracker-manager.js
- [X] T062 [US3] Call calculatePriorities() on questUpdated event in src/components/item-tracker.js
- [X] T063 [US3] Call calculatePriorities() on hideoutUpdated event in src/components/item-tracker.js

### Priority Display

- [X] T064 [P] [US3] Style NEEDED SOON badge as red/orange in styles/item-tracker.css
- [X] T065 [P] [US3] Style NEEDED LATER badge as blue/gray in styles/item-tracker.css
- [X] T066 [US3] Update ItemCard.render() to show priority badge with correct styling in src/components/item-card.js

---

## Phase 6: User Story 4 - Mark Items as Collected (P2)

**Goal**: Add checkbox to item cards, persist collection status to localStorage

**Independent Test**: Mark items as collected, refresh page, verify status persists

**Story Dependencies**: US1 must be complete (requires item cards)

### Collection UI

- [X] T067 [P] [US4] Add checkbox input to ItemCard.render() template in src/components/item-card.js
- [X] T068 [P] [US4] Style collected items with faded appearance (50% opacity) in styles/item-tracker.css
- [X] T069 [P] [US4] Add checkmark overlay icon for collected items in styles/item-tracker.css

### Collection Logic

- [X] T070 [US4] Add checkbox click handler calling ItemStorageService.toggleCollected() in src/components/item-card.js
- [X] T071 [US4] Listen to itemCollectionUpdated event in src/components/item-tracker.js
- [X] T072 [US4] Re-render item list on itemCollectionUpdated in src/components/item-tracker.js
- [X] T073 [US4] Load collection status in ItemTrackerManager.initialize() in src/models/item-tracker-manager.js
- [X] T074 [US4] Merge collection status with AggregatedItem.collected property in src/models/item-tracker-manager.js

### Hide Collected Filter

- [X] T075 [US4] Add "Hide Collected" toggle button to filter group in src/components/item-tracker.js
- [X] T076 [US4] Implement hideCollected filter logic in ItemList.applyFilters() in src/components/item-list.js
- [X] T077 [US4] Persist hideCollected filter state to localStorage in src/components/item-tracker.js

---

## Phase 7: User Story 5 - Item Details and Locations (P3)

**Goal**: Add detail modal showing item info, quest/hideout sources, wiki link

**Independent Test**: Click item card, verify modal shows all sources and wiki link works

**Story Dependencies**: US1 must be complete (requires item cards to click)

### Modal Component

- [X] T078 [P] [US5] Create src/components/item-detail-modal.js with ItemDetailModal class
- [X] T079 [P] [US5] Implement ItemDetailModal.show() method rendering modal HTML in src/components/item-detail-modal.js
- [X] T080 [P] [US5] Add large item icon (128x128px) to modal template in src/components/item-detail-modal.js
- [X] T081 [P] [US5] Display item name, short name, total quantity in modal in src/components/item-detail-modal.js
- [X] T082 [P] [US5] List all quest sources with quest name + trader in modal in src/components/item-detail-modal.js
- [X] T083 [P] [US5] List all hideout sources with module name + level in modal in src/components/item-detail-modal.js
- [X] T084 [P] [US5] Add wiki button with wikiLink URL in modal in src/components/item-detail-modal.js
- [X] T085 [P] [US5] Style modal with overlay and centered card in styles/item-tracker.css

### Modal Interactions

- [X] T086 [US5] Add item card click handler opening modal in src/components/item-card.js
- [X] T087 [US5] Add Close button click handler in ItemDetailModal in src/components/item-detail-modal.js
- [X] T088 [US5] Add Escape key handler closing modal in src/components/item-detail-modal.js
- [X] T089 [US5] Add overlay click handler closing modal in src/components/item-detail-modal.js

---

## Phase 8: Polish & Cross-Cutting Concerns (No Story Label)

**Goal**: Refine UX, add loading states, error handling, documentation

### Loading States

- [X] T090 [P] Add loading spinner to ItemTracker during API fetch in src/components/item-tracker.js
- [X] T091 [P] Add "Loading items..." text during initialization in src/components/item-tracker.js
- [X] T092 [P] Style loading spinner in styles/item-tracker.css

### Error Handling

- [X] T093 Add error boundary for ItemTracker.initialize() in src/components/item-tracker.js
- [X] T094 Display user-friendly error message on API failure in src/components/item-tracker.js
- [X] T095 Add "Retry" button on error state in src/components/item-tracker.js

### Performance Optimization

- [ ] T096 [P] Implement virtual scrolling for 100+ items in src/components/item-list.js (optional)
- [ ] T097 [P] Debounce filter changes (100ms) in src/components/item-tracker.js

### Documentation

- [X] T098 [P] Add JSDoc comments to all ItemTracker methods in src/components/item-tracker.js
- [X] T099 [P] Add JSDoc comments to ItemTrackerManager in src/models/item-tracker-manager.js
- [X] T100 [P] Add JSDoc comments to HideoutManager in src/models/hideout-manager.js
- [ ] T101 Update README.md with Item Tracker feature description and usage

### Final Integration

- [ ] T102 Test item tracker with 0 quests completed (should show many items)
- [ ] T103 Test item tracker with all quests completed (should show empty state)
- [ ] T104 Test filter performance with 100+ items (< 100ms per SC-003)
- [ ] T105 Test initial load performance (< 3s per SC-001)
- [ ] T106 Run all quickstart.md test scenarios (Scenarios 1-10)
- [ ] T107 Fix any bugs found during manual testing

---

## Task Dependencies

### Critical Path (Must Complete in Order)

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (US4) → Phase 7 (US5) → Phase 8 (Polish)
```

### User Story Completion Order

1. **US1 (P1)**: View items - BLOCKING (all other stories need item display)
2. **US2 (P1)**: Filter items - Can start after US1 complete
3. **US3 (P1)**: Priority indicators - Can start after US1 complete (parallel with US2)
4. **US4 (P2)**: Mark collected - Can start after US1 complete
5. **US5 (P3)**: Item details - Can start after US1 complete

### Parallel Execution Opportunities

**Foundational Phase**:
- Parallel Group 1: T005-T009 (API layer) - different files
- Parallel Group 2: T010-T014 (data models) - different classes
- Parallel Group 3: T026-T030 (services) - different files

**User Story 1**:
- T031-T033: Component skeletons (different files)

**User Story 2**:
- T050-T051: UI and styles (different files)

**User Story 3**:
- T064-T065: Badge styling (CSS only, no dependencies)

**User Story 4**:
- T067-T069: UI and styles (different aspects)

**User Story 5**:
- T078-T085: Modal component creation (different methods)

**Polish Phase**:
- T090-T092: Loading states (different files)
- T098-T100: Documentation (different files)

---

## Implementation Strategy

### MVP First (Deliver US1-US3 First)

**Phase 1**: Setup (T001-T004) → **1 day**  
**Phase 2**: Foundational (T005-T030) → **2-3 days**  
**Phase 3**: US1 - View Items (T031-T049) → **2 days**  
**Phase 4**: US2 - Filters (T050-T058) → **1 day**  
**Phase 5**: US3 - Priority (T059-T066) → **1 day**

**MVP Complete**: 7-8 days, delivers P1 requirements

### Incremental Delivery (Add US4-US5 After MVP)

**Phase 6**: US4 - Collection (T067-T077) → **1 day**  
**Phase 7**: US5 - Details Modal (T078-T089) → **1 day**  
**Phase 8**: Polish (T090-T107) → **1-2 days**

**Full Feature Complete**: 9-11 days total

---

## Task Estimation Legend

- **[P]**: Parallelizable (can work on simultaneously with other [P] tasks)
- **S** (Small): < 1 hour (e.g., add CSS styling, create skeleton file)
- **M** (Medium): 1-3 hours (e.g., implement component method, add API integration)
- **L** (Large): 3-6 hours (e.g., complex algorithm like priority calculation, full manager class)

**Estimated Hours by Phase**:
- Phase 1 (Setup): 2 hours
- Phase 2 (Foundational): 18 hours
- Phase 3 (US1): 12 hours
- Phase 4 (US2): 6 hours
- Phase 5 (US3): 6 hours
- Phase 6 (US4): 6 hours
- Phase 7 (US5): 6 hours
- Phase 8 (Polish): 8 hours

**Total Estimated Hours**: 64 hours (~8 full working days)

---

## Success Metrics Tracking

Track these metrics during implementation to ensure specification compliance:

| Metric | Target | How to Test | Related Tasks |
|--------|--------|-------------|---------------|
| SC-001: Initial load time | < 3 seconds | DevTools Network tab | T105 |
| SC-002: Auto priority update | No manual refresh | Complete quest, check priority | T062-T063 |
| SC-003: Filter response time | < 100ms | DevTools Performance tab | T104 |
| SC-004: Collection persistence | Survives refresh | Mark item, F5, verify | T070-T074 |
| SC-005: Priority accuracy | 90% correct | Manual verification against quest status | T059-T061 |
| SC-006: Quick identification | < 5 seconds | User testing with quickstart.md | T043 |
| SC-007: Multi-quest items | All quests shown | Check modal for duplicate items | T082 |
| SC-008: Persistence | Survives app close | Close tab, reopen, verify | T070-T074 |

---

## Testing Approach

### Manual Testing (Per Specification)

No automated tests required. Use [quickstart.md](./quickstart.md) for validation:

- **Smoke Test** (2 minutes): Run checklist at bottom of quickstart.md
- **Full Test** (30 minutes): Run all 10 test scenarios
- **Performance Test** (5 minutes): Measure SC-001 and SC-003 with DevTools
- **Regression Test** (15 minutes): After bug fixes, re-run affected scenarios

### Integration Testing Points

- After Phase 3 (US1): Verify item list displays correctly
- After Phase 4 (US2): Verify all filters work
- After Phase 5 (US3): Verify priorities update on quest completion
- After Phase 6 (US4): Verify collection status persists
- After Phase 7 (US5): Verify modal shows complete information
- After Phase 8 (Polish): Run full quickstart.md test suite

---

## Blockers & Risks

### Known Blockers

1. **Tarkov.dev API Changes**: If API schema changes, tasks T005-T009 need updates
   - **Mitigation**: Follow contracts/*.md exactly, add schema validation
   
2. **Browser localStorage Limits**: If 100+ items exceed 5MB limit
   - **Mitigation**: Compress cache data, use IndexedDB if needed (out of scope for MVP)

3. **Quest Completion Data Missing**: If QuestManager not properly integrated
   - **Mitigation**: Verify QuestManager.completedQuests populated before Phase 3

### Performance Risks

- **Large Item Lists**: 150+ items may cause render lag
  - **Solution**: T096 adds virtual scrolling if needed
  
- **Priority Recalculation**: Running on every quest update may be slow
  - **Solution**: Cache priorities, only recalculate affected items

---

## Commit Strategy

### Recommended Commits

1. After Phase 1: `feat(003): Add Item Tracker tab structure`
2. After T005-T009: `feat(003): Implement Tarkov.dev items and hideout APIs`
3. After T010-T025: `feat(003): Add item data models and manager classes`
4. After T026-T030: `feat(003): Implement priority and storage services`
5. After Phase 3: `feat(003): Implement item list display (US1)`
6. After Phase 4: `feat(003): Add item category filters (US2)`
7. After Phase 5: `feat(003): Add priority indicators (US3)`
8. After Phase 6: `feat(003): Add item collection tracking (US4)`
9. After Phase 7: `feat(003): Add item detail modal (US5)`
10. After Phase 8: `feat(003): Polish item tracker with loading states and docs`

**Squash Before Merge**: Optional - can keep granular commits or squash phases

---

## Task Completion Checklist

Before marking tasks complete, verify:

- [ ] Code follows existing project patterns (see quest-list.js, quest-graph.js)
- [ ] File paths match exactly as specified in task description
- [ ] JSDoc comments added for public methods
- [ ] Console.log debugging statements removed
- [ ] Error handling added for async operations
- [ ] Event listeners cleaned up on component destroy (if applicable)
- [ ] localStorage keys match data-model.md schema
- [ ] API calls include error handling per contracts/*.md
- [ ] Styling follows existing main.css patterns
- [ ] Manual test scenario passes (if applicable)

---

**Tasks Generated** ✅  
Ready for implementation via `speckit.implement` workflow.

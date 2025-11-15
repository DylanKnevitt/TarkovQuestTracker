---

description: "Task list for User Quest Progress Comparison feature"
---

# Tasks: User Quest Progress Comparison

**Input**: Design documents from `/specs/002-user-quest-comparison/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: This feature does NOT require automated tests - manual testing via quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Repository root: `src/`, `styles/`
- Single-page web application structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add comparison tab to main UI and create necessary directory structure

- [X] T001 Add "User Comparison" tab button to index.html navigation (after quest-optimizer tab)
- [X] T002 Create placeholder comparison view container in index.html (id="comparison-view")
- [X] T003 [P] Create styles/user-comparison.css with base styles for comparison view
- [X] T004 [P] Create src/models/user-profile.js with UserProfile class (id, email, completion stats)
- [X] T005 [P] Create src/models/user-quest-progress.js with UserQuestProgress class (quest map structure)

**Checkpoint**: Tab visible, placeholder view exists, model files created

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core comparison service that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create src/services/comparison-service.js with ComparisonService class skeleton
- [ ] T007 Implement ComparisonService.fetchAllUserProfiles() method - query auth.users LEFT JOIN quest_progress with GROUP BY
- [ ] T008 Implement ComparisonService.fetchUserProgress(userId) method - query quest_progress WHERE user_id = $1
- [ ] T009 Add caching mechanism to ComparisonService (userProfileCache Map, progressCache Map)
- [ ] T010 Add ComparisonService.clearCache() method to invalidate cached data
- [ ] T011 Initialize ComparisonService singleton in src/index.js and export for component access

**Checkpoint**: Foundation ready - ComparisonService can fetch user data and cache results

---

## Phase 3: User Story 1 - View All Users (Priority: P1) 🎯 MVP

**Goal**: Display list of all registered users with quest completion statistics

**Independent Test**: Log in, navigate to "User Comparison" tab, verify list of users appears with email and completion percentage

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create src/components/user-list.js with UserList component class
- [ ] T013 [P] [US1] Create src/components/user-comparison.js with UserComparison main component class
- [ ] T014 [US1] Implement UserComparison.render() - create container with user list section and quest list section
- [ ] T015 [US1] Implement UserList.render() - display user cards with email, completion %, initials badge
- [ ] T016 [US1] Add UserComparison initialization to src/index.js init() method (mount to #comparison-view)
- [ ] T017 [US1] Add tab switching logic in src/index.js to show/hide comparison view
- [ ] T018 [US1] Style user list cards in styles/user-comparison.css (grid layout, hover effects)
- [ ] T019 [US1] Add "No users found" message when UserList data array is empty
- [ ] T020 [US1] Add loading spinner to UserComparison while fetching user profiles

**Checkpoint**: User list displays with completion stats, empty state handled, tab navigation works

---

## Phase 4: User Story 2 - Select Single User (Priority: P1) 🎯 MVP

**Goal**: Click one user to see their incomplete quests, enabling duo coordination

**Independent Test**: Select one user from list, verify quest list updates to show only that user's incomplete quests

### Implementation for User Story 2

- [ ] T021 [P] [US2] Create src/components/comparison-quest-list.js with ComparisonQuestList component class
- [ ] T022 [US2] Add click handler to UserList.render() - emit 'user-selected' event with userId
- [ ] T023 [US2] Implement UserComparison.handleUserSelection(userId) - fetch user progress, update selected users array
- [ ] T024 [US2] Add visual highlight to selected user card in UserList (CSS class .selected)
- [ ] T025 [US2] Implement ComparisonQuestList.render() - filter QuestManager quests by incomplete for selected user(s)
- [ ] T026 [US2] Implement UserComparison.updateQuestList() - calculate intersection and pass to ComparisonQuestList
- [ ] T027 [US2] Add click handler to deselect user when clicking selected user card again
- [ ] T028 [US2] Group filtered quests by trader in ComparisonQuestList.render() (use existing QuestList grouping logic)
- [ ] T029 [US2] Style selected user cards in styles/user-comparison.css (border, background color change)
- [ ] T030 [US2] Add quest count display "X quests incomplete for selected user" above quest list

**Checkpoint**: Single-user selection works, quest list filters correctly, deselection works

---

## Phase 5: User Story 3 - Multi-User Selection (Priority: P2)

**Goal**: Select 2+ users to find common incomplete quests for squad coordination

**Independent Test**: Select 3 users, verify only quests incomplete for ALL 3 appear in quest list

### Implementation for User Story 3

- [ ] T031 [US3] Update UserComparison.handleUserSelection() to support multi-select (array of user IDs)
- [ ] T032 [US3] Implement intersection algorithm in UserComparison.calculateQuestIntersection() - filter quests incomplete for ALL users
- [ ] T033 [US3] Add max selection limit (10 users) with warning message "Maximum 10 users can be selected"
- [ ] T034 [US3] Update quest count display to show "X quests incomplete for all N selected users"
- [ ] T035 [US3] Add "No common incomplete quests" message when intersection is empty
- [ ] T036 [US3] Add "Clear Selection" button to UserComparison header
- [ ] T037 [US3] Implement UserComparison.handleClearSelection() - reset selected users array, refresh quest list
- [ ] T038 [US3] Style Clear Selection button in styles/user-comparison.css
- [ ] T039 [US3] Add visual indicator showing count of selected users (e.g., badge on user list header)

**Checkpoint**: Multi-user selection works, intersection calculates correctly, clear selection works

---

## Phase 6: User Story 4 - Visual Completion Indicators (Priority: P2)

**Goal**: Show per-user completion status for each quest in filtered list

**Independent Test**: Select 2 users, verify each quest shows completion indicators (checkmarks/circles) for both users

### Implementation for User Story 4

- [ ] T040 [P] [US4] Add completion indicator section to ComparisonQuestList quest item template
- [ ] T041 [US4] Implement ComparisonQuestList.renderCompletionIndicators(questId) - show checkmark or empty circle per user
- [ ] T042 [US4] Add tooltip on hover showing "Player1: Completed, Player2: Incomplete" using title attribute
- [ ] T043 [US4] Add completion summary "X/Y completed" next to quest name when multiple users selected
- [ ] T044 [US4] Style completion indicators in styles/user-comparison.css (checkmark ✓, circle ○, colors)
- [ ] T045 [US4] Add user initials badges to indicators for clarity (shows who completed it)
- [ ] T046 [US4] Handle edge case: if user not in selected set, don't show indicator for that user

**Checkpoint**: Visual indicators appear, tooltips show details, completion summary accurate

---

## Phase 7: User Story 5 - Share Comparison URL (Priority: P3 - OPTIONAL)

**Goal**: Generate shareable URL with selected users encoded for squad convenience

**Independent Test**: Select users, copy URL, paste in new tab, verify same users pre-selected

### Implementation for User Story 5

- [ ] T047 [P] [US5] Add "Share Comparison" button to UserComparison header (next to Clear Selection)
- [ ] T048 [US5] Implement UserComparison.generateShareUrl() - encode selected user IDs in URL query params
- [ ] T049 [US5] Add copy-to-clipboard functionality on Share button click
- [ ] T050 [US5] Implement UserComparison.loadFromUrl() - parse URL params and pre-select users on page load
- [ ] T051 [US5] Call loadFromUrl() in UserComparison initialization if URL params exist
- [ ] T052 [US5] Add toast notification "Link copied to clipboard!" on successful copy
- [ ] T053 [US5] Style Share button in styles/user-comparison.css (icon, hover effect)
- [ ] T054 [US5] Handle edge case: shared URL with invalid/deleted user IDs (filter them out silently)

**Checkpoint**: Share URL generates, clipboard copy works, URL loading restores selections

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T055 [P] Add refresh button to UserComparison header to reload user profiles
- [ ] T056 [P] Implement UserComparison.handleRefresh() - clear cache, re-fetch data, re-render
- [ ] T057 Add loading states for quest list updates (spinner while calculating intersection)
- [ ] T058 Add error handling for Supabase query failures (show error message in UI)
- [ ] T059 Optimize ComparisonService.fetchUserProgress() to batch-fetch multiple users at once
- [ ] T060 Add keyboard shortcuts: Escape to clear selection, Ctrl+R to refresh
- [ ] T061 Add responsive styles in styles/user-comparison.css for mobile screens (< 768px)
- [ ] T062 [P] Update README.md with comparison feature documentation
- [ ] T063 [P] Add comparison feature section to TESTING_GUIDE.md
- [ ] T064 Run quickstart.md validation - follow 5-minute prototype test scenarios
- [ ] T065 Test with 100+ users to verify performance (< 2s load time)
- [ ] T066 Test with 10 selected users to verify intersection performance (< 2s)
- [ ] T067 Cross-browser testing: Chrome, Firefox, Safari, Edge

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies
  - User Story 2 (P1): Depends on US1 complete (uses UserList, UserComparison)
  - User Story 3 (P2): Depends on US2 complete (extends selection logic)
  - User Story 4 (P2): Can start after US2 complete (enhances quest list display)
  - User Story 5 (P3): Depends on US3 complete (shares selection state)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Requires US1 components (UserComparison, UserList) - Sequential
- **User Story 3 (P2)**: Extends US2 selection logic - Sequential after US2
- **User Story 4 (P2)**: Enhances quest list from US2/US3 - Can start after US2, parallel with US3
- **User Story 5 (P3)**: Requires US3 multi-selection complete - Sequential after US3

### Within Each User Story

- Setup tasks in Phase 1: All [P] tasks can run in parallel
- Foundational tasks in Phase 2: Sequential (each builds on previous)
- User Story 1: T012-T013 [P] can run parallel, rest sequential
- User Story 2: T021 [P] can start early, rest sequential
- User Story 3: Most sequential (builds on US2 logic)
- User Story 4: T040 [P] can start early, rest sequential
- User Story 5: T047 [P] can prepare UI early, rest sequential
- Polish tasks: T055-T056 [P] parallel, T062-T063 [P] parallel

### Parallel Opportunities

- Phase 1 Setup: T003, T004, T005 can all run in parallel (different files)
- US1 Start: T012 (user-list.js) and T013 (user-comparison.js) can run in parallel
- US2 Start: T021 (comparison-quest-list.js) can run parallel with US1 completion
- US4 Start: T040 can prepare template while US3 being implemented
- US5 Start: T047 can add button UI while US3/US4 being implemented
- Polish: T055-T056 (refresh logic), T062-T063 (docs) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch foundational models in parallel (Phase 1):
Task T004: "Create src/models/user-profile.js"
Task T005: "Create src/models/user-quest-progress.js"

# Launch component files in parallel (US1 start):
Task T012: "Create src/components/user-list.js"
Task T013: "Create src/components/user-comparison.js"
```

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. Complete Phase 1: Setup (T001-T005) → Tab exists, models ready
2. Complete Phase 2: Foundational (T006-T011) → ComparisonService works
3. Complete Phase 3: User Story 1 (T012-T020) → User list displays
4. Complete Phase 4: User Story 2 (T021-T030) → Single-user selection works
5. **STOP and VALIDATE**: Test duo coordination flow independently
6. Deploy/demo MVP - delivers core value for 2-player squads

### Incremental Delivery

1. Setup + Foundational → Foundation ready (T001-T011)
2. Add User Story 1 → Test independently → User list visible (T012-T020)
3. Add User Story 2 → Test independently → Duo play works (T021-T030) **[MVP CHECKPOINT]**
4. Add User Story 3 → Test independently → Squad play works (T031-T039)
5. Add User Story 4 → Test independently → Visual clarity improved (T040-T046)
6. Add User Story 5 (Optional) → Test independently → Sharing enabled (T047-T054)
7. Polish → Production ready (T055-T067)

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T011)
2. Once Foundational is done:
   - Developer A: User Story 1 (T012-T020)
   - Developer B: Prepare US2 component T021 in parallel
3. After US1 complete:
   - Developer A: User Story 3 (T031-T039)
   - Developer B: User Story 2 (T022-T030), then User Story 4 (T040-T046)
4. User Story 5 (T047-T054) by either developer (optional P3)
5. Both developers: Polish tasks (T055-T067) in parallel

---

## Summary

- **Total Tasks**: 67
- **MVP Tasks (US1-US2)**: 30 tasks (T001-T030)
- **Parallel Opportunities**: 13 tasks marked [P] can run in parallel with adjacent work
- **Critical Path**: Setup → Foundational → US1 → US2 → US3 → US4 → US5 (optional) → Polish
- **Independent Test Criteria**: Each user story phase includes checkpoint validation
- **Suggested MVP Scope**: Complete through Phase 4 (User Story 2) for duo coordination - delivers core value in ~8-10 hours
- **Full Feature Scope**: Complete through Phase 7 (User Story 5) for full feature set - adds ~4-6 hours

---

## Format Validation

✅ All tasks follow checklist format: `- [ ] [ID] [P?] [Story?] Description with file path`
✅ Task IDs sequential: T001-T067
✅ [P] markers on 13 parallelizable tasks
✅ [Story] labels on user story phases: [US1], [US2], [US3], [US4], [US5]
✅ File paths specified in all implementation tasks
✅ Setup/Foundational/Polish phases have NO story labels (correct)
✅ Each user story has clear goal and independent test criteria
✅ Dependencies documented with phase and story-level sequencing

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- No automated tests required - manual testing via quickstart.md scenarios
- Commit after each task or logical group (e.g., after T011, after T020, after T030...)
- Stop at any checkpoint to validate story independently
- User Story 5 (P3) is OPTIONAL - can be deferred or skipped
- Avoid: vague tasks, same file conflicts, blocking cross-story dependencies

# Feature Specification: Enhanced Hideout & Item Tracker

**Feature Branch**: `004-hideout-item-enhancements`  
**Created**: November 16, 2025  
**Status**: Draft  
**Input**: User description: "We need to add a hideout tracker, and improve the item tracker to show based on what level your current hideout is and what you have built. It must show anything that you can currently build as need now, and anything that is locked behind 1-2 things need soon, and anything that is over 3 requirements away must be need later. There must be a key provided to the users"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hideout Build Status Tracking (Priority: P1)

As a player, I want to view and update my hideout construction progress, so I can track which modules I've built and see what materials I need for the next upgrades.

**Why this priority**: Core functionality - without tracking what's built, we cannot calculate accurate item priorities or show meaningful "buildable now" status. This is the foundation for all hideout-aware features.

**Independent Test**: Can be fully tested by marking hideout modules as complete/incomplete and verifying the UI displays correct build status. Delivers immediate value by giving players a centralized hideout progress tracker.

**Acceptance Scenarios**:

1. **Given** I have not built any hideout modules, **When** I open the Hideout Tracker tab, **Then** I see all modules at level 0 with their upgrade requirements
2. **Given** I view a hideout module card, **When** I click to mark it as built, **Then** the module status updates immediately and syncs to database
3. **Given** I have built some modules, **When** I refresh the page, **Then** my hideout progress loads from database and displays correctly
4. **Given** I'm not logged in, **When** I track hideout progress, **Then** data persists to localStorage instead of database

---

### User Story 2 - Smart Priority by Buildability (Priority: P2)

As a player, I want items categorized by how soon I can use them based on my hideout progress, so I prioritize collecting items for modules I can build immediately.

**Why this priority**: This is the key differentiator from the existing item tracker - it uses hideout state to intelligently prioritize items, making the tracker far more actionable.

**Independent Test**: Can be tested by setting different hideout build states and verifying items get correct priority labels. Delivers value by reducing decision paralysis about what to collect next.

**Acceptance Scenarios**:

1. **Given** I can build a hideout module right now, **When** I view the item tracker, **Then** items for that module show "NEED NOW" priority with red/orange styling
2. **Given** a hideout module is blocked by 1-2 incomplete prerequisites, **When** I view the item tracker, **Then** items for that module show "NEED SOON" priority with yellow styling
3. **Given** a hideout module requires 3+ incomplete prerequisites, **When** I view the item tracker, **Then** items for that module show "NEED LATER" priority with blue/gray styling
4. **Given** I mark a prerequisite module as complete, **When** the item tracker refreshes, **Then** items previously "NEED SOON" may upgrade to "NEED NOW" if buildable

---

### User Story 3 - Priority Legend & Visual Clarity (Priority: P1)

As a player, I want to see a clear legend explaining the priority system, so I understand what "NEED NOW", "NEED SOON", and "NEED LATER" mean without confusion.

**Why this priority**: Without a legend, users won't understand the new priority system, making the feature confusing rather than helpful. Essential for usability.

**Independent Test**: Can be tested by displaying the legend and verifying it clearly explains each priority level. Works independently of actual item data.

**Acceptance Scenarios**:

1. **Given** I'm viewing the Item Tracker tab, **When** I see items with different priority badges, **Then** I also see a legend explaining each priority level
2. **Given** I see the priority legend, **When** I read the descriptions, **Then** I understand "NEED NOW" = buildable today, "NEED SOON" = 1-2 steps away, "NEED LATER" = 3+ steps away
3. **Given** I'm on mobile, **When** I view the legend, **Then** it displays in a condensed, mobile-friendly format

---

### User Story 4 - Quest Priority Integration (Priority: P2)

As a player, I want quest items to also use the improved priority system, so I know which quest items are for unlocked quests (NEED NOW) vs locked quests (NEED SOON/LATER).

**Why this priority**: Extends the smart priority system to quests for consistency. Lower priority than hideout since quest priority logic already exists, just needs refinement.

**Independent Test**: Can be tested by completing quests to unlock new ones and verifying item priorities update accordingly.

**Acceptance Scenarios**:

1. **Given** I have unlocked quests I haven't completed, **When** I view the item tracker, **Then** items for those quests show "NEED NOW" priority
2. **Given** a quest is locked behind 1-2 incomplete prerequisite quests, **When** I view the item tracker, **Then** items for that quest show "NEED SOON" priority
3. **Given** a quest requires 3+ prerequisite quests, **When** I view the item tracker, **Then** items for that quest show "NEED LATER" priority

---

### User Story 5 - Hideout Module Visual Cards (Priority: P3)

As a player, I want to see hideout modules as visual cards with icons, levels, and requirements, so I can quickly scan what I need without reading text lists.

**Why this priority**: Nice-to-have UI polish. The hideout tracker is functional without fancy cards, but they improve scannability and user experience.

**Independent Test**: Can be tested by rendering hideout modules and verifying visual presentation meets design standards.

**Acceptance Scenarios**:

1. **Given** I view the Hideout Tracker, **When** I see a module card, **Then** it displays module icon, name, current level, max level, and build status
2. **Given** a module is not yet built, **When** I view its card, **Then** I see all required items with quantities
3. **Given** a module is already built, **When** I view its card, **Then** it shows as "Built" with visual indicator (checkmark/green border)

---

### Edge Cases

- What happens when a hideout module has circular dependencies (e.g., module A requires module B which requires module A)? **Assumption**: The Tarkov.dev API data does not contain circular dependencies as this would be invalid game data.
- How does the system handle hideout modules that require multiple levels of the same prerequisite module (e.g., requires Lavatory level 2 and Lavatory level 3)? **Assumption**: Count each unique prerequisite module only once, using the highest required level.
- What happens when an item is needed for both a buildable hideout module AND a locked quest? **Priority logic**: Use the HIGHEST priority (NEED NOW > NEED SOON > NEED LATER) to avoid de-prioritizing important items.
- How does the system handle modules that have no prerequisites but require items the player doesn't have? **Answer**: These are "NEED NOW" because they're buildable, the player just needs to collect the items.
- What happens when the user's hideout progress gets out of sync between localStorage and database? **Resolution**: Database is source of truth when logged in, localStorage when not logged in. On login, sync localStorage to database.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST track which hideout modules the user has built at each level (0-4 depending on module)
- **FR-002**: System MUST persist hideout build status to database when authenticated, localStorage when not authenticated
- **FR-003**: System MUST calculate item priority based on BOTH hideout buildability AND quest unlock status
- **FR-004**: System MUST categorize items as "NEED NOW" if for buildable hideout modules OR unlocked quests
- **FR-005**: System MUST categorize items as "NEED SOON" if for hideout modules blocked by 1-2 incomplete prerequisites OR quests blocked by 1-2 incomplete prerequisite quests
- **FR-006**: System MUST categorize items as "NEED LATER" if for hideout modules blocked by 3+ incomplete prerequisites OR quests blocked by 3+ incomplete prerequisite quests
- **FR-007**: System MUST display priority level explanations via tooltip on hover over priority badges (with fallback for mobile)
- **FR-008**: System MUST show hideout modules in a subtab within the Item Tracker tab (alongside "All Items", "Quest Items", "Hideout Items" filters)
- **FR-009**: System MUST allow users to mark hideout modules as built/unbuilt with immediate UI feedback
- **FR-010**: System MUST automatically recalculate item priorities when hideout progress changes
- **FR-011**: System MUST display each hideout module's current level, maximum level, and required items for next level
- **FR-012**: System MUST sync hideout progress across devices when user is authenticated
- **FR-013**: System MUST handle the case where an item is needed for multiple purposes by using the highest priority
- **FR-014**: System MUST load hideout progress from database on initial page load when authenticated
- **FR-015**: Priority legend MUST be visible on both desktop and mobile without obstructing content

### Key Entities

- **HideoutModule**: Represents a hideout construction area (e.g., Lavatory, Medstation, Workbench). Attributes: name, level (0-4), maxLevel, requirements (prerequisite modules + items), built status, icon/image
- **HideoutProgress**: User-specific tracking of which modules are built. Attributes: userId, moduleId, level, isBuilt, timestamp
- **ItemPriority**: Enhanced priority calculation. Attributes: priority level (NEED_NOW/NEED_SOON/NEED_LATER), reason (quest/hideout), distance (number of prerequisites blocking)
- **PriorityLegend**: Static reference data explaining priority meanings. Attributes: level, label, description, color scheme

## Success Criteria *(mandatory)*

- **SC-001**: Users can view all 12 hideout areas (or however many exist) with their build status
- **SC-002**: Users can mark hideout modules as built and see immediate visual confirmation (< 500ms)
- **SC-003**: 95% of item priority calculations complete in < 100ms after hideout state change
- **SC-004**: Priority legend is visible and understandable without additional documentation
- **SC-005**: Users report understanding the priority system (via user testing or feedback) at 80%+ rate
- **SC-006**: Hideout progress syncs to database within 2 seconds when authenticated
- **SC-007**: Items correctly categorized as NEED NOW when hideout module is buildable (0 blocking prerequisites)
- **SC-008**: Items correctly categorized as NEED SOON when hideout module has 1-2 blocking prerequisites
- **SC-009**: Items correctly categorized as NEED LATER when hideout module has 3+ blocking prerequisites
- **SC-010**: Mobile users can interact with hideout tracker without horizontal scrolling on 375px width screens

## Scope *(mandatory)*

### In Scope

- Hideout build status tracking (mark modules as built/unbuilt)
- Database sync for hideout progress (Supabase table with RLS policies)
- Enhanced priority calculation based on hideout buildability
- Priority calculation based on prerequisite module distance (0, 1-2, 3+ steps away)
- Visual priority legend with color-coded indicators
- Integration of quest priority with hideout priority (unified system)
- Hideout Tracker tab/section in main navigation
- Visual representation of hideout modules (cards or list items)
- Display of required items per hideout module
- Real-time priority updates when hideout progress changes
- Mobile-responsive design for hideout tracker

### Out of Scope

- Hideout module build time tracking (game doesn't expose this)
- Cost calculation or profit analysis for hideout investments
- Automatic detection of hideout status from game files (no API for this)
- Hideout skill bonuses or crafting recipes (separate feature)
- Historical tracking of when modules were built (timestamp only, no history log)
- Notifications or reminders when items are collected for buildable modules
- Integration with market prices for hideout items
- Hideout construction guides or optimal build orders

## Assumptions *(mandatory)*

- **ASMP-001**: Tarkov.dev API provides complete and accurate hideout module data including prerequisites and required items
- **ASMP-002**: Hideout modules do not have circular dependencies in the game data
- **ASMP-003**: Users will manually update their hideout progress (no automatic sync from game)
- **ASMP-004**: The existing `HideoutManager` class in Feature 003 provides a foundation but needs enhancement for dependency depth calculation
- **ASMP-005**: Priority distance thresholds (0, 1-2, 3+) are reasonable breakpoints based on typical player progression
- **ASMP-006**: Users understand hideout module names and icons without additional tutorial
- **ASMP-007**: localStorage is sufficient for non-authenticated users, with database sync for authenticated users
- **ASMP-008**: The hideout has approximately 12-15 distinct areas, each with 1-4 upgrade levels
- **ASMP-009**: Priority legend can be displayed in a collapsible/dismissible UI element to save space
- **ASMP-010**: Quest priority logic from Feature 003 can be adapted to match hideout priority logic

## Dependencies *(mandatory)*

### External Dependencies

- **Tarkov.dev GraphQL API**: Must provide hideout module data via `hideoutStations` query including prerequisites
- **Supabase**: Database for storing user hideout progress with RLS policies
- **Feature 003 (Item Tracker)**: Builds upon existing item aggregation, priority system, and UI components

### Internal Dependencies

- **HideoutManager** (from Feature 003): Current implementation tracks built status but doesn't calculate prerequisite depth
- **PriorityService** (from Feature 003): Needs enhancement to incorporate hideout buildability alongside quest unlock status
- **ItemTrackerManager** (from Feature 003): Needs to integrate enhanced priority logic
- **ItemCollectionService** (from Feature 003): Provides database sync pattern to follow for hideout progress

### Technical Constraints

- Must work offline with localStorage fallback
- Must support IE11... just kidding, modern browsers only (ES2020+)
- Database schema must support multiple hideout module levels per user
- Priority calculation must complete within 100ms for up to 500 items
- UI must remain responsive during priority recalculation

## Design Decisions *(resolved)*

### Q1: Hideout Tracker Placement
**Decision**: Subtab within the Item Tracker tab  
**Rationale**: Keeps related content together (items and hideout are closely linked), reduces navigation overhead, maintains clean top-level navigation

### Q2: Default Hideout State
**Decision**: All modules default to Level 0 (nothing built)  
**Rationale**: Safe default for new accounts, ensures users manually verify their progress, avoids incorrect assumptions about player progression

### Q3: Priority Legend Display
**Decision**: Tooltip on hover over priority badges  
**Rationale**: Minimal space usage, contextual help exactly where needed, clean UI without persistent clutter. Note: Consider adding a small info icon for mobile users since hover doesn't work on touch devices

# Feature Specification: Quest & Hideout Item Tracker

**Feature Branch**: `003-item-tracker`  
**Created**: 2025-11-16  
**Status**: Draft  
**Input**: User description: "Item tracker feature using the API, for quest and hideout items with filtering and priority indicators"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View All Required Items (Priority: P1)

Players need to see all items required for quest objectives and hideout upgrades they haven't completed yet, so they know what to keep while looting.

**Why this priority**: Core value - prevents accidentally selling/using items needed later. Essential for efficient progression.

**Independent Test**: Can be fully tested by viewing item list after completing some quests and delivers immediate value by showing remaining item needs.

**Acceptance Scenarios**:

1. **Given** user has incomplete quests with item objectives, **When** user opens Item Tracker tab, **Then** all required items are displayed with quest names
2. **Given** user has completed all quests requiring an item, **When** user views Item Tracker, **Then** that item is not shown in the list
3. **Given** multiple quests require the same item, **When** user views item details, **Then** all quests requiring that item are listed
4. **Given** user completes a quest, **When** user refreshes Item Tracker, **Then** items only needed for that quest are removed from the list

---

### User Story 2 - Filter Items by Category (Priority: P1)

Players need to filter items by type (quest items, hideout items, keys, etc.) so they can focus on specific item types while organizing their stash.

**Why this priority**: Essential for usability - viewing all 100+ items at once is overwhelming. Filtering makes the tracker practical.

**Independent Test**: Can be tested by toggling filters and verifying correct items are shown/hidden without other features.

**Acceptance Scenarios**:

1. **Given** Item Tracker is open, **When** user checks "Quest Items Only" filter, **Then** only items needed for quest objectives are shown
2. **Given** Item Tracker is open, **When** user checks "Hideout Items Only" filter, **Then** only items needed for hideout construction are shown
3. **Given** Item Tracker is open, **When** user checks "Keys" filter, **Then** only keys required for quests or hideout are shown
4. **Given** multiple filters are selected, **When** user views list, **Then** items matching ANY selected filter are displayed (OR logic)
5. **Given** no filters are selected, **When** user views list, **Then** all required items are shown

---

### User Story 3 - Priority Indicators (Needed Soon vs Later) (Priority: P1)

Players need visual indicators showing whether items are needed for quests available now versus locked behind future prerequisites, so they can prioritize stash space.

**Why this priority**: Core feature requirement - differentiates urgent needs from future needs, enabling smart inventory decisions.

**Independent Test**: Can be tested by comparing item priorities with quest unlock status and delivers value by guiding stash management.

**Acceptance Scenarios**:

1. **Given** item is needed for an unlocked quest, **When** user views Item Tracker, **Then** item is marked "NEEDED SOON" with urgent color (red/orange)
2. **Given** item is only needed for locked quests, **When** user views Item Tracker, **Then** item is marked "NEEDED LATER" with neutral color (blue/gray)
3. **Given** user's level increases, **When** new quests unlock, **Then** previously "NEEDED LATER" items update to "NEEDED SOON"
4. **Given** item is needed for hideout upgrade user can build now, **When** user views tracker, **Then** item is marked "NEEDED SOON"
5. **Given** item is needed for hideout upgrade requiring incomplete modules, **When** user views tracker, **Then** item is marked "NEEDED LATER"

---

### User Story 4 - Mark Items as Collected (Priority: P2)

Players want to mark items they've already collected/stored, so they can track what they still need to find while looting.

**Why this priority**: Enhances tracking but not essential for basic functionality. Users can manually track elsewhere if needed.

**Independent Test**: Can be tested by toggling item checkboxes and verifying persistence without affecting quest completion.

**Acceptance Scenarios**:

1. **Given** user has an item in stash, **When** user clicks checkbox on item card, **Then** item is marked as collected with visual checkmark
2. **Given** item is marked as collected, **When** user views Item Tracker, **Then** item appears with "collected" styling (faded or moved to bottom)
3. **Given** user has collected an item, **When** user refreshes page, **Then** collected status persists (localStorage)
4. **Given** user completes a quest requiring collected item, **When** tracker updates, **Then** item is removed from list (not just unchecked)
5. **Given** "Hide Collected" filter is enabled, **When** user views tracker, **Then** collected items are hidden from view

---

### User Story 5 - Item Details and Locations (Priority: P3)

Players want to see where items can be found (maps, loot locations) and view item images, so they can efficiently farm specific items.

**Why this priority**: Nice enhancement but relies on external links/data. Can reference Tarkov wiki initially.

**Independent Test**: Can be tested by clicking items and viewing detail modal with wiki link and map info.

**Acceptance Scenarios**:

1. **Given** user clicks an item card, **When** detail modal opens, **Then** item image, description, and quest requirements are shown
2. **Given** item has known spawn locations, **When** user views item details, **Then** common maps and locations are listed
3. **Given** user wants more info, **When** user clicks "Wiki" link in details, **Then** Tarkov wiki opens in new tab
4. **Given** item can be crafted, **When** user views details, **Then** crafting requirements and station are shown

---

### Edge Cases

- What happens when user has 150+ level player and all hideout maxed? (Show "All items collected" empty state)
- How does system handle items needed for both quests AND hideout? (Show both contexts in item card)
- What if API returns new items not in local cache? (Merge and display all items)
- How to handle items needed in quantities (e.g., 10x Bolts)? (Show quantity needed next to item name)
- What if quest is turned in but tracker hasn't refreshed? (Add manual "Refresh" button)
- How to handle FiR (Found in Raid) requirements? (Add FiR indicator icon on quest items requiring it)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch quest item requirements from Tarkov.dev API quest objectives
- **FR-002**: System MUST fetch hideout item requirements from Tarkov.dev API hideout stations
- **FR-003**: System MUST display items with name, icon, quantity needed, and purpose (quest/hideout)
- **FR-004**: System MUST filter items by category: All, Quest Items, Hideout Items, Keys
- **FR-005**: System MUST calculate priority based on quest unlock status (available vs locked)
- **FR-006**: System MUST show "NEEDED SOON" for items required by unlocked quests or buildable hideout upgrades
- **FR-007**: System MUST show "NEEDED LATER" for items only required by locked content
- **FR-008**: System MUST update item list when user completes quests (remove items no longer needed)
- **FR-009**: System MUST allow users to mark items as collected with persistent storage
- **FR-010**: System MUST hide or visually differentiate collected items from uncollected ones
- **FR-011**: System MUST group items requiring multiple quantities (e.g., "Bolts x10")
- **FR-012**: System MUST show which quests/hideout modules require each item
- **FR-013**: System MUST provide "Hide Collected" toggle to filter out marked items
- **FR-014**: System MUST cache item data for 24 hours to reduce API calls
- **FR-015**: System MUST handle Found in Raid (FiR) requirement indicator for quest items

### Key Entities

- **Item**: Game item with id, name, icon, type (quest/hideout/key), and quantity needed
- **ItemRequirement**: Links item to specific quest objective or hideout module with quantity and FiR status
- **ItemCollection**: User's tracked collection status per item (collected yes/no, quantity owned)
- **Priority**: Calculated urgency (NEEDED SOON / NEEDED LATER) based on quest/hideout unlock status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view complete item list in under 3 seconds after tab load
- **SC-002**: Item priority updates automatically when quest status changes without manual refresh
- **SC-003**: Filter toggles respond instantly (< 100ms) to show/hide item categories
- **SC-004**: Item collection status persists across browser sessions using localStorage
- **SC-005**: 90% of required items show correct priority indicator based on current quest progress
- **SC-006**: Users can identify items needed for unlocked content within 5 seconds of opening tracker
- **SC-007**: System correctly handles items needed by multiple quests (shows all quests in details)
- **SC-008**: Collected items status survives page refresh and app reopening

## Assumptions

- **Assumption 1**: Tarkov.dev API provides complete item data including icons, names, and quest/hideout links
- **Assumption 2**: User quest completion data is available from existing quest tracker (Feature 001)
- **Assumption 3**: User's player level is tracked to determine quest availability
- **Assumption 4**: Hideout module completion will be tracked similar to quests (boolean completed/incomplete)
- **Assumption 5**: "Needed Soon" means item is required for content user can currently access based on level and prerequisites
- **Assumption 6**: FiR requirement can be determined from API quest objective data
- **Assumption 7**: Item quantities are displayed as needed (e.g., quest requires 5x Item = show "Item x5")
- **Assumption 8**: Users understand priority system without extensive tutorial (color coding + labels sufficient)

## Out of Scope

- Real-time stash integration (reading actual player inventory from game)
- Price tracking or flea market integration
- Item trading features between users
- Automatic quest completion detection (users manually mark quests complete)
- Crafting calculator or profit optimization
- Map integration showing exact item spawn locations
- Mobile notifications when specific items are needed
- Barter trade recommendations
- Historical item price trends

## Dependencies

- **Tarkov.dev GraphQL API**: Must provide `items`, `tasks`, and `hideoutStations` queries
- **Existing Quest Tracker** (Feature 001): Item tracker uses quest completion data to calculate what items are still needed
- **User Progress Persistence**: Requires localStorage for item collection tracking
- **Quest Unlock Logic**: Needs access to quest prerequisite checking to determine "soon" vs "later" priority

## Notes for Implementation

- Consider paginating item list if 100+ items (or use virtual scrolling)
- Priority calculation should run on quest status change, not every render
- Hideout module completion tracking may need new localStorage structure
- FiR indicator should be visually distinct (special icon or badge)
- Item cards should support click-to-expand for detailed view
- Consider adding search/filter bar for quick item lookup by name

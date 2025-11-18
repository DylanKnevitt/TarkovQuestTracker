# Feature Specification: All-Quests Item Tracker View

**Feature Branch**: `006-all-quests-item-tracker`  
**Created**: November 18, 2025  
**Status**: Draft  
**Input**: User description: "We need to enhance the quest items tracker with a to look at all quests, not just the ones you are currently on."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Toggle Between Active and All Quests View (Priority: P1)

Players want to switch between viewing items for only their active (incomplete) quests versus items for all quests in the game, so they can plan long-term item hoarding strategies or understand the full scope of items needed throughout their entire playthrough.

**Why this priority**: Core feature requirement - provides the fundamental toggle mechanism. Without this, the feature doesn't exist. Delivers immediate value by allowing forward planning.

**Independent Test**: Can be fully tested by toggling a filter/button and verifying the item list updates to show either incomplete quest items only (current behavior) or all quest items including completed quests. Delivers value by enabling users to see what items they'll need even after completing early quests.

**Acceptance Scenarios**:

1. **Given** Item Tracker is open with default "Active Quests" mode, **When** user views item list, **Then** only items for incomplete quests are displayed (current behavior)
2. **Given** user selects "All Quests" mode, **When** item list updates, **Then** items from all quests (completed and incomplete) are displayed
3. **Given** user has completed Prapor's "Debut" quest requiring 2x MP-133, **When** viewing "Active Quests" mode, **Then** MP-133 is not shown
4. **Given** user has completed Prapor's "Debut" quest requiring 2x MP-133, **When** viewing "All Quests" mode, **Then** MP-133 is shown with "Debut" listed as a source
5. **Given** user toggles between "Active" and "All Quests" modes, **When** switching modes, **Then** selection persists across page refreshes

---

### User Story 2 - Visual Differentiation of Completed Quest Items (Priority: P1)

Players need to visually distinguish items required by completed quests versus incomplete quests when viewing "All Quests" mode, so they can quickly identify which items are still urgently needed versus which were already used.

**Why this priority**: Essential for usability in "All Quests" mode - without differentiation, the view becomes confusing and loses value. Users need to know what's active vs historical.

**Independent Test**: Can be tested by completing several quests and verifying that items in "All Quests" view show clear visual indicators (color, badge, strikethrough) for completed vs incomplete quest sources.

**Acceptance Scenarios**:

1. **Given** viewing "All Quests" mode, **When** item is only needed by completed quests, **Then** item card shows "Completed" badge or faded styling
2. **Given** viewing "All Quests" mode, **When** item is needed by both completed and incomplete quests, **Then** item shows mixed status with both indicators
3. **Given** viewing "All Quests" mode, **When** user clicks item for details, **Then** quest sources are grouped by "Active" and "Completed" sections
4. **Given** viewing "All Quests" mode, **When** item is needed only by incomplete quests, **Then** item displays with normal active styling (not faded)
5. **Given** user marks a quest as complete while in "All Quests" view, **When** tracker refreshes, **Then** items from that quest update to show completed styling

---

### User Story 3 - Filter Options in All Quests Mode (Priority: P2)

Players want to filter the "All Quests" view by quest status (show only completed, show only incomplete, show both) so they can focus on specific item categories without switching between modes.

**Why this priority**: Enhances the "All Quests" mode but not essential for basic functionality. Users can switch to "Active Quests" mode for incomplete items.

**Independent Test**: Can be tested by applying status filters in "All Quests" mode and verifying correct items appear based on their quest source completion status.

**Acceptance Scenarios**:

1. **Given** in "All Quests" mode, **When** user selects "Show Active Only" filter, **Then** only items from incomplete quests are displayed
2. **Given** in "All Quests" mode, **When** user selects "Show Completed Only" filter, **Then** only items from completed quests are displayed
3. **Given** in "All Quests" mode, **When** user selects "Show Both" filter, **Then** all quest items are displayed (default "All Quests" behavior)
4. **Given** filter is set to "Show Active Only" in "All Quests" mode, **When** user switches to "Active Quests" mode, **Then** filter resets to default behavior
5. **Given** user sets a filter, **When** page refreshes, **Then** filter selection persists via localStorage

---

### User Story 4 - Quest Count Indicators on Item Cards (Priority: P2)

Players want to see how many quests (active vs completed) require each item when viewing "All Quests" mode, so they can understand item importance across the entire game progression.

**Why this priority**: Provides valuable context but not critical for basic functionality. Users can still click items for full details without this summary.

**Independent Test**: Can be tested by viewing items in "All Quests" mode and verifying count badges show correct numbers (e.g., "3 Active, 2 Completed").

**Acceptance Scenarios**:

1. **Given** item is required by 3 incomplete quests and 2 completed quests, **When** viewing in "All Quests" mode, **Then** item card shows "5 quests" or "3 active, 2 completed"
2. **Given** item is required by only 1 quest, **When** viewing in "All Quests" mode, **Then** item card shows quest name directly instead of count
3. **Given** user clicks item with multiple quest sources, **When** detail modal opens, **Then** full list of all quests is shown grouped by status
4. **Given** viewing "Active Quests" mode, **When** item card displays, **Then** quest count only reflects incomplete quests
5. **Given** user completes a quest, **When** tracker refreshes, **Then** quest count updates to reflect new status

---

### User Story 5 - All Quests Mode With Hideout Integration (Priority: P3)

Players want the "All Quests" mode to optionally include all hideout items (completed and incomplete modules) for complete forward planning, so they can understand the full scope of items needed across all game content.

**Why this priority**: Nice enhancement but adds complexity. Players can already view hideout items separately with existing filters.

**Independent Test**: Can be tested by enabling "Include All Hideout" option in "All Quests" mode and verifying hideout items from completed modules appear.

**Acceptance Scenarios**:

1. **Given** "All Quests" mode is active with "Include Hideout" enabled, **When** viewing items, **Then** hideout items from all modules (completed and incomplete) are shown
2. **Given** hideout module is completed, **When** viewing in "All Quests + Hideout" mode, **Then** items show "Completed - Hideout" badge
3. **Given** item is needed for both completed quests and completed hideout, **When** viewing details, **Then** both sources are listed under "Completed" section
4. **Given** viewing "Active Quests" mode, **When** toggling "Include Hideout", **Then** only incomplete hideout items are shown (current behavior)
5. **Given** user disables "Include Hideout" in "All Quests" mode, **When** viewing items, **Then** only quest items are displayed

---

### Edge Cases

- What happens when viewing "All Quests" with 300+ items? (Consider pagination or virtual scrolling, implement loading skeleton)
- How does system handle quests that can be failed and restarted? (Show "Failed" status as incomplete, include items in active view)
- What if user has no completed quests? ("All Quests" mode should show same results as "Active Quests" mode with message "No completed quests yet")
- How to handle items needed by quests the player hasn't unlocked yet? (Show in "All Quests" mode with "Locked" badge and quest level requirement)
- What if quest requires item quantity user already turned in? (Show full quantity needed with note "Already submitted" in completed quest details)
- How does "Hide Collected" filter interact with "All Quests" mode? (Should hide items regardless of quest status - collected items don't need to be hoarded)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide toggle between "Active Quests" and "All Quests" viewing modes
- **FR-002**: System MUST display items from all quests (completed and incomplete) when "All Quests" mode is active
- **FR-003**: System MUST persist viewing mode selection across page refreshes using localStorage
- **FR-004**: System MUST visually differentiate items required by completed quests versus incomplete quests
- **FR-005**: System MUST show clear status indicators on item cards ("Active", "Completed", or "Both") in "All Quests" mode
- **FR-006**: System MUST group quest sources by status (Active/Completed) in item detail modal when in "All Quests" mode
- **FR-007**: System MUST calculate priority indicators based on active quest status even in "All Quests" mode (completed quests = "NEEDED LATER" priority)
- **FR-008**: System MUST allow filtering within "All Quests" mode by quest completion status (Active Only, Completed Only, Both)
- **FR-009**: System MUST show quest count on item cards when multiple quests require same item in "All Quests" mode
- **FR-010**: System MUST maintain existing filter functionality (Quest/Hideout/Keys) in both viewing modes
- **FR-011**: System MUST update items instantly when user marks quest as complete/incomplete while in "All Quests" mode
- **FR-012**: System MUST default to "Active Quests" mode for new users (current behavior)
- **FR-013**: System MUST provide option to include all hideout items (completed modules) in "All Quests" mode
- **FR-014**: System MUST handle performance for displaying 300+ items with virtual scrolling or pagination
- **FR-015**: System MUST show "Locked" indicators for items needed by quests above player's current level in "All Quests" mode

### Key Entities

- **ViewingMode**: Enum representing "Active Quests" or "All Quests" mode selection
- **ItemStatus**: Enum indicating whether item is needed by "Active", "Completed", or "Both" quest types
- **QuestSourceGroup**: Collection of quest sources grouped by completion status for item detail display
- **StatusFilter**: Filter option within "All Quests" mode ("Show Active", "Show Completed", "Show Both")

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can toggle between "Active" and "All Quests" modes with response time under 200ms
- **SC-002**: Item list in "All Quests" mode displays with all visual status indicators visible within 3 seconds
- **SC-003**: 95% of items correctly show appropriate status badges ("Active", "Completed", "Both") based on quest completion state
- **SC-004**: Users can identify completed quest items within 2 seconds of viewing "All Quests" mode through visual styling
- **SC-005**: Mode selection persists across 100% of page refreshes and browser sessions
- **SC-006**: Status filters in "All Quests" mode respond instantly (< 100ms) to show/hide appropriate items
- **SC-007**: Item detail modal correctly groups quest sources by completion status in under 1 second
- **SC-008**: System handles 300+ items in "All Quests" mode without UI lag or performance degradation
- **SC-009**: Quest count indicators update within 500ms when user marks quest complete/incomplete
- **SC-010**: "All Quests" mode delivers value by showing at least 30% more items than "Active Quests" mode for mid-game players

## Assumptions

- **Assumption 1**: Existing item tracker (Feature 003) already fetches all quest and hideout item data from API, just filters by completion status before display
- **Assumption 2**: Quest completion status is readily available from QuestManager for filtering logic
- **Assumption 3**: Users understand the difference between "Active" and "All Quests" modes through clear labeling and tooltips
- **Assumption 4**: Performance impact of displaying 2-3x more items is acceptable with proper optimization (virtual scrolling if needed)
- **Assumption 5**: Priority indicators ("NEEDED SOON"/"NEEDED LATER") remain useful in "All Quests" mode for identifying active quest items
- **Assumption 6**: "Hide Collected" filter should work identically in both modes (hide marked items regardless of quest status)
- **Assumption 7**: Default "Active Quests" mode preserves current user experience without changes
- **Assumption 8**: Item quantities shown represent full amounts needed for quests, not adjusted for already-turned-in amounts

## Out of Scope

- Historical tracking of which specific items user already turned in for completed quests
- Recommendations on whether to keep or sell items based on completion status
- Quest replay or reset functionality affecting item requirements
- Integration with external stash management tools
- Item trading or market value comparison
- Filtering by specific quest names or traders in "All Quests" mode (existing trader filters remain)
- Sorting items by quest completion date or chronological order
- "Recently Completed" or "Trending" item categories
- Exporting item lists to CSV or external formats
- Sharing item tracking status between users

## Dependencies

- **Feature 003 - Item Tracker**: Builds upon existing item aggregation and display logic
- **QuestManager**: Requires access to quest completion status and quest metadata
- **ItemTrackerManager**: Needs modification to support filtering by completion status
- **LocalStorage**: For persisting viewing mode and status filter selections
- **Quest Unlock Logic**: To show "Locked" badges on items for quests above player level

## Notes for Implementation

- Consider adding toggle as radio buttons or segmented control in tracker header for clear mode visibility
- Visual differentiation could use opacity (50% for completed), color-coded badges, or strikethrough text
- Performance optimization may require lazy loading or windowing library (react-window/react-virtualized concepts)
- Quest source grouping in detail modal should maintain clear visual separation (collapsible sections)
- Default to "Active Quests" mode to preserve current user experience, require explicit opt-in to "All Quests"
- Consider adding tooltip explaining the difference between modes on first use
- Priority calculation should still prioritize active quests even when showing all items
- May need to add loading state when switching modes if item calculation is expensive

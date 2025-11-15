# Feature Specification: User Quest Progress Comparison

**Feature Branch**: `002-user-quest-comparison`  
**Created**: 2025-11-15  
**Status**: Draft  
**Input**: User description: "View and compare quest progress across multiple users. Show list of users, allow selecting multiple users to filter quests down to common incomplete quests (lowest common denominator)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View All Users (Priority: P1)

Users want to see a list of all registered users who have quest progress data, so they can identify friends or teammates to compare progress with.

**Why this priority**: Core foundation - without seeing who exists, users cannot select anyone to compare with. This is the entry point for all other comparison features.

**Independent Test**: Can be fully tested by logging in, navigating to the comparison view, and verifying a list of users appears with basic information (email/username). Delivers immediate value by showing who else is using the app.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I navigate to the "User Comparison" tab, **Then** I see a list of all users with quest progress
2. **Given** I view the user list, **When** I see each user entry, **Then** I see their email address (or username) and total quest completion percentage
3. **Given** no other users have quest progress, **When** I view the comparison page, **Then** I see a message "You are the only user. Invite friends to compare progress!"

---

### User Story 2 - Select Single User for Comparison (Priority: P1)

Users want to select one other user to see which quests that user has completed versus incomplete, helping identify which quests to do together during a raid.

**Why this priority**: MVP functionality - comparing with one friend is the most common use case and delivers immediate collaborative value for duo play.

**Independent Test**: Can be fully tested by selecting one user from the list and seeing their quest completion status displayed. Delivers value by showing "what quests does my friend need?"

**Acceptance Scenarios**:

1. **Given** I view the user list, **When** I click on a user, **Then** that user is selected and highlighted
2. **Given** I have selected one user, **When** the view updates, **Then** I see all quests filtered to show only quests that user has NOT completed
3. **Given** I am viewing one user's incomplete quests, **When** I see the quest list, **Then** quests are grouped by trader and show quest name, level requirement, and objectives
4. **Given** I have selected a user, **When** I click the user again, **Then** the selection is removed and the view returns to showing all users

---

### User Story 3 - Select Multiple Users for Common Incomplete Quests (Priority: P2)

Users want to select multiple teammates (2-5 people) to find quests that ALL of them still need to complete, enabling efficient squad gameplay where everyone benefits from the same raid.

**Why this priority**: High-value team coordination feature - groups of 3-5 players need to find quests they ALL need, making raids maximally efficient. This is the "lowest common denominator" filtering requested.

**Independent Test**: Can be fully tested by selecting 2-3 users and verifying only quests incomplete for ALL selected users appear. Delivers value by answering "what quests should our squad do together?"

**Acceptance Scenarios**:

1. **Given** I have selected one user, **When** I click another user, **Then** both users are selected and highlighted
2. **Given** I have selected multiple users (2+), **When** the view updates, **Then** I see only quests that are incomplete for ALL selected users (intersection)
3. **Given** I have selected 3 users, **When** the filtered quest list appears, **Then** I see a count indicating "X quests incomplete for all selected users"
4. **Given** I have selected multiple users, **When** no quests are common to all, **Then** I see a message "No common incomplete quests. Try selecting fewer users."
5. **Given** I have selected multiple users, **When** I deselect one user, **Then** the quest list updates to reflect the new intersection

---

### User Story 4 - Visual Quest Completion Indicators (Priority: P2)

Users want to see visual indicators showing which selected users have completed vs incomplete for each quest, providing quick insight into who needs what without expanding details.

**Why this priority**: Enhanced UX - makes it easier to understand the comparison at a glance, especially useful when selecting 2-3 users to see who's "closest" to completing specific quests.

**Independent Test**: Can be fully tested by selecting 2 users and verifying visual indicators (checkmarks, progress bars, or colored dots) appear next to each quest showing completion status per user.

**Acceptance Scenarios**:

1. **Given** I have selected 2 users, **When** I view a quest in the filtered list, **Then** I see completion indicators for each selected user (e.g., checkmark vs empty circle)
2. **Given** I have selected 3 users, **When** I view the quest list, **Then** I see a summary like "0/3 completed" or "2/3 completed" for each quest
3. **Given** I hover over a completion indicator, **When** a tooltip appears, **Then** it shows which specific users have/haven't completed that quest

---

### User Story 5 - Share Comparison View (Priority: P3)

Users want to share a comparison view URL with their squad, so everyone can see the same filtered quest list without manually selecting the same users.

**Why this priority**: Nice-to-have convenience feature - reduces friction for recurring squads, but core functionality works fine without it.

**Independent Test**: Can be fully tested by selecting users, copying the generated URL, pasting in a new browser tab, and verifying the same users are pre-selected.

**Acceptance Scenarios**:

1. **Given** I have selected multiple users, **When** I click "Share Comparison", **Then** I receive a shareable URL with user selections encoded
2. **Given** I have a shared comparison URL, **When** I open it, **Then** the specified users are automatically selected and the filtered quest list appears
3. **Given** I share a comparison URL, **When** someone without access to the app opens it, **Then** they are prompted to log in first

---

### Edge Cases

- What happens when a selected user completes a quest while I'm viewing the comparison? (Real-time updates or refresh required?)
- How does the system handle users with zero quest progress? (Should they appear in the user list?)
- What happens if I select myself in the comparison? (Should my own incomplete quests appear?)
- How does the view handle 100+ users in the system? (Pagination, search, or filtering needed?)
- What happens when all selected users have completed all quests? (Show congratulations message?)
- How does the system handle deleted/deactivated user accounts? (Remove from list immediately or show as inactive?)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch and display a list of all users who have quest progress data
- **FR-002**: System MUST allow selecting one or more users from the list (multi-select capability)
- **FR-003**: System MUST filter quest list to show only quests incomplete for ALL selected users (intersection)
- **FR-004**: System MUST display user identification (email or display name) in the user list
- **FR-005**: System MUST show quest completion percentage for each user in the list
- **FR-006**: System MUST highlight or indicate which users are currently selected
- **FR-007**: System MUST allow deselecting users to update the filtered quest view
- **FR-008**: System MUST display quest details including name, trader, level requirement, and objectives for filtered quests
- **FR-009**: System MUST group filtered quests by trader for easier navigation
- **FR-010**: System MUST show a count of how many common incomplete quests exist for selected users
- **FR-011**: System MUST display appropriate messages when no users exist, no common quests exist, or no users are selected
- **FR-012**: System MUST respect privacy - users can only view data of authenticated users who have opted into visibility (default: all authenticated users are visible)
- **FR-013**: System MUST handle real-time or near-real-time updates when quest progress changes (refresh on navigation or manual refresh)
- **FR-014**: System MUST prevent selecting more than 10 users simultaneously to maintain performance (reasonable limit for intersection calculation)
- **FR-015**: Users MUST be able to view the comparison without affecting their own quest progress view

### Key Entities

- **UserProfile**: Represents a user's identity and quest progress summary. Includes user ID, email/display name, total quest count, completed quest count, completion percentage, and last updated timestamp.
- **QuestProgress**: Represents an individual user's completion status for a specific quest. Includes user ID, quest ID, completion status (boolean), and completion timestamp.
- **ComparisonSelection**: Represents the current set of selected users for comparison. Includes list of selected user IDs and calculated intersection of incomplete quest IDs.
- **FilteredQuestView**: Represents the resulting quest list after applying user selection filter. Includes quest details with completion indicators for each selected user.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate to the comparison view and see a list of all users within 2 seconds of clicking the tab
- **SC-002**: Users can select 2-3 users and see the filtered quest list update within 1 second
- **SC-003**: System accurately computes the intersection of incomplete quests for up to 10 selected users without errors
- **SC-004**: 80% of users who access the comparison feature successfully identify at least one common incomplete quest for duo/squad play
- **SC-005**: Quest list filtering produces correct results - only quests incomplete for ALL selected users appear (zero false positives)
- **SC-006**: User selection state persists during the session - navigating away and back retains selected users
- **SC-007**: System displays appropriate feedback messages when no common quests exist, helping users understand why the list is empty
- **SC-008**: Page remains responsive with 100+ users in the system - user list loads and selections process without noticeable lag

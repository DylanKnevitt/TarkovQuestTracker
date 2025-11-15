# UserComparison Component Contract

**Feature**: User Quest Progress Comparison  
**Type**: UI Component (JavaScript class)  
**Purpose**: Main container component for user comparison feature

---

## Class: UserComparison

### Constructor

```javascript
constructor(containerId: string, questManager: QuestManager)
```

**Description**: Initializes the comparison view with child components and state management.

**Parameters**:
- `containerId` (string, required): DOM element ID where component will render
- `questManager` (QuestManager, required): Reference to existing QuestManager instance

**Pre-conditions**:
- DOM element with `containerId` must exist
- QuestManager must be initialized with quest data
- User must be authenticated (checked internally)

**Post-conditions**:
- UserList component created and rendered
- ComparisonQuestList component created (empty initially)
- ComparisonState initialized
- Event listeners attached

---

### Method: render

```javascript
render(): void
```

**Description**: Renders the comparison view layout with user list and quest list sections.

**Parameters**: None

**Returns**: void

**Side Effects**:
- Updates DOM at `containerId`
- Triggers child component renders
- Displays loading state while fetching users

**HTML Structure**:
```html
<div class="comparison-view">
  <div class="comparison-header">
    <h2>User Quest Comparison</h2>
    <div class="comparison-actions">
      <button id="refresh-btn">Refresh</button>
      <button id="clear-selection-btn">Clear Selection</button>
    </div>
  </div>
  
  <div class="comparison-body">
    <div class="user-list-panel">
      <h3>Select Users (Max 10)</h3>
      <div id="user-list-container"></div>
    </div>
    
    <div class="quest-list-panel">
      <div class="selection-summary">
        <span id="selected-count">0 users selected</span>
        <span id="common-quest-count">- common quests</span>
      </div>
      <div id="comparison-quest-list"></div>
    </div>
  </div>
</div>
```

---

### Method: handleUserSelection

```javascript
handleUserSelection(userId: string): void
```

**Description**: Handles user selection/deselection toggle when user clicks on a user in the list.

**Parameters**:
- `userId` (string, required): UUID of the user being selected/deselected

**Behavior**:
- If user is not selected → Select user (up to 10 max)
- If user is already selected → Deselect user
- Fetches user progress if not cached
- Recalculates filtered quest list
- Updates UI with new selection state

**Error Handling**:
- If 10 users already selected → Show error message "Maximum 10 users can be selected"
- If fetch fails → Show error, keep previous state

---

### Method: updateQuestList

```javascript
updateQuestList(): void
```

**Description**: Recalculates and updates the filtered quest list based on current selections.

**Parameters**: None

**Returns**: void

**Side Effects**:
- Calls ComparisonState.calculateFilteredQuests()
- Updates ComparisonQuestList with new filtered quests
- Updates selection summary counts
- Shows empty state message if no common quests

---

### Method: handleRefresh

```javascript
async handleRefresh(): Promise<void>
```

**Description**: Refreshes user list and progress data from Supabase.

**Parameters**: None

**Returns**: Promise that resolves when refresh completes

**Behavior**:
1. Show loading spinner
2. Clear ComparisonService cache
3. Re-fetch all user profiles
4. Re-fetch progress for selected users
5. Recalculate filtered quests
6. Update UI

**Use Cases**:
- User clicks "Refresh" button
- After completing own quests
- When returning to tab after long absence

---

### Method: handleClearSelection

```javascript
handleClearSelection(): void
```

**Description**: Clears all user selections and resets the comparison view.

**Parameters**: None

**Returns**: void

**Side Effects**:
- Clears ComparisonState.selectedUserIds
- Empties filtered quest list
- Resets selection summary to "0 users selected"
- Shows default empty state message

---

### Event: onDestroy

```javascript
onDestroy(): void
```

**Description**: Cleanup method called when component is destroyed or tab is switched.

**Parameters**: None

**Returns**: void

**Side Effects**:
- Removes event listeners
- Does NOT clear cache (preserves selections across tab navigation)

---

## Child Components

### UserList
**Purpose**: Displays list of all users with selection UI  
**Contract**: [user-list.md](./user-list.md)

### ComparisonQuestList
**Purpose**: Displays filtered quests with completion indicators  
**Contract**: [comparison-quest-list.md](./comparison-quest-list.md)

---

## State Management

### ComparisonState (Internal)
```javascript
{
  selectedUserIds: Set<string>,           // Currently selected user IDs
  userProfiles: Map<string, UserProfile>, // All available user profiles
  userProgressCache: Map<string, UserQuestProgress>, // Cached progress data
  filteredQuests: Array<Quest>            // Quests incomplete for all selected users
}
```

---

## Event Flow

### User Clicks on User in List
```
UserList emits 'user-clicked' event with userId
  ↓
UserComparison.handleUserSelection(userId)
  ↓
ComparisonState.selectUser(userId) or .deselectUser(userId)
  ↓
ComparisonService.fetchUserProgress(userId) [if not cached]
  ↓
UserComparison.updateQuestList()
  ↓
ComparisonState.calculateFilteredQuests()
  ↓
ComparisonQuestList.render(filteredQuests)
```

---

## UI States

### 1. Initial Load (No Users Selected)
- User list visible with all users
- Quest list shows message: "Select users to compare quest progress"
- Summary shows: "0 users selected"

### 2. Loading State
- Spinner displayed during async operations
- User list disabled
- Quest list shows "Loading..."

### 3. Single User Selected
- Selected user highlighted in user list
- Quest list shows all quests incomplete for that user
- Summary shows: "1 user selected | X common quests"

### 4. Multiple Users Selected
- Multiple users highlighted in user list
- Quest list shows intersection (quests incomplete for ALL)
- Summary shows: "N users selected | X common quests"

### 5. No Common Quests
- User list shows selections
- Quest list shows message: "No quests incomplete for all N selected users. Try selecting fewer users or check individual progress."
- Summary shows: "N users selected | 0 common quests"

### 6. Error State
- Error message displayed in banner
- User list remains interactive
- Quest list shows previous state or empty

---

## CSS Classes

```css
.comparison-view { /* Main container */ }
.comparison-header { /* Header with title and actions */ }
.comparison-actions { /* Button group */ }
.comparison-body { /* Two-column layout */ }
.user-list-panel { /* Left panel */ }
.quest-list-panel { /* Right panel */ }
.selection-summary { /* Stats bar above quest list */ }
.loading-spinner { /* Loading indicator */ }
.empty-state { /* No users/quests message */ }
.error-message { /* Error banner */ }
```

---

## Dependencies

**External**:
- QuestManager (existing)
- ComparisonService (new)

**Internal**:
- UserList component (new)
- ComparisonQuestList component (new)
- ComparisonState model (new)

**DOM Requirements**:
- Container element must exist in HTML
- Must be shown/hidden when tab is selected

---

## Testing Checklist

- [ ] Component renders without errors
- [ ] User list populates on initial load
- [ ] Selecting user fetches progress and updates quest list
- [ ] Selecting multiple users shows intersection
- [ ] Deselecting user updates quest list
- [ ] Maximum 10 users enforced
- [ ] Clear selection button works
- [ ] Refresh button reloads data
- [ ] Empty state messages display correctly
- [ ] Error handling for network failures
- [ ] Component cleans up on destroy
- [ ] Selection persists when navigating to other tabs and back

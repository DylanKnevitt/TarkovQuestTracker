# Quickstart Testing Guide - Item Tracker

**Feature**: 003-item-tracker  
**Purpose**: 5-minute manual testing scenarios to validate Item Tracker functionality

---

## Prerequisites

1. Open the application in a modern browser (Chrome, Firefox, Edge)
2. Clear browser cache and localStorage to start fresh (optional for clean state)
3. Complete at least 2-3 quests in the Quest List to simulate realistic progress
4. Have hideout module completion tracking UI available (checkboxes in item detail modal)

---

## Test Scenario 1: View Required Items (User Story 1)

**Goal**: Verify item list displays all items needed for incomplete quests and hideout modules

**Steps**:

1. Open the application
2. Click the "**Item Tracker**" tab in the navigation bar
3. Wait for the item list to load (should appear within 3 seconds per SC-001)

**Expected Results**:

- ✅ Item list displays in a grid layout with item cards
- ✅ Each item card shows:
  - Item icon (64x64px image)
  - Item name (e.g., "Military power filter")
  - Quantity needed (e.g., "x2" or "x10")
  - Priority badge ("⚠️ Needed Soon" or "🕐 Needed Later")
  - Source subtitle (e.g., "Needed for: Setup, Lavatory Level 2")
- ✅ Only items from incomplete quests/hideout modules are shown
- ✅ Items from completed quests do NOT appear
- ✅ No duplicate item cards (items needed by multiple quests aggregated)

**Pass Criteria**: All expected results met, load time < 3 seconds

---

## Test Scenario 2: Filter by Category (User Story 2)

**Goal**: Verify filter buttons correctly show/hide items by category

**Steps**:

1. With Item Tracker open, observe the initial "All Items" view (20-50 items visible)
2. Click the "**Quest Items**" filter button
3. Observe the filtered list
4. Click the "**Hideout Items**" filter button
5. Observe the filtered list
6. Click the "**Keys**" filter button
7. Observe the filtered list
8. Click "**All Items**" to return to full view

**Expected Results**:

- ✅ **Quest Items filter**: Only items needed for incomplete quests are shown
  - Items with source.type === 'quest'
  - Hideout-only items are hidden
- ✅ **Hideout Items filter**: Only items needed for incomplete hideout modules are shown
  - Items with source.type === 'hideout'
  - Quest-only items are hidden
- ✅ **Keys filter**: Only items with type="keys" are shown
  - Keys can be needed for quests OR hideout (OR logic)
- ✅ **All Items filter**: All items from incomplete content shown
- ✅ Filter changes apply instantly (< 100ms per SC-003)
- ✅ Active filter button has visual highlight (border/background color)

**Pass Criteria**: All filters work correctly, response time < 100ms, no flicker/lag

---

## Test Scenario 3: Priority Indicators (User Story 3)

**Goal**: Verify items show correct priority based on quest/hideout unlock status

**Steps**:

1. Identify an item marked "🕐 Needed Later" (e.g., item for level 40 quest when player level is 15)
2. In the Quest List tab, complete all prerequisites for a quest requiring that item
3. Return to Item Tracker tab
4. Observe the item's priority badge

**Expected Results**:

- ✅ Initially, item shows "🕐 Needed Later" with blue/gray badge (quest is locked)
- ✅ After completing prerequisites, item updates to "⚠️ Needed Soon" with red/orange badge (quest unlocked)
- ✅ Priority update happens automatically (listen to `questUpdated` event per FR-008)
- ✅ Items for unlocked quests always show "Needed Soon" priority
- ✅ Items for buildable hideout modules show "Needed Soon" priority

**Pass Criteria**: Priority updates correctly when quest status changes, no manual refresh needed

---

## Test Scenario 4: Mark Items as Collected (User Story 4)

**Goal**: Verify users can mark items as collected and status persists

**Steps**:

1. In Item Tracker, find an item card (e.g., "Military power filter")
2. Click the checkbox in the top-right corner of the item card
3. Observe the visual change (faded appearance or checkmark icon)
4. Refresh the browser page (F5 or Ctrl+R)
5. Return to Item Tracker tab
6. Find the same item card and verify collected status

**Expected Results**:

- ✅ Clicking checkbox marks item as collected
- ✅ Item card shows visual "collected" styling (e.g., 50% opacity, checkmark overlay)
- ✅ After refresh, collected status persists (localStorage per SC-004)
- ✅ Collected items remain visible by default (unless "Hide Collected" filter enabled)
- ✅ Checkbox toggle is instant (no API call needed)

**Pass Criteria**: Collection status persists across sessions, no data loss on refresh

---

## Test Scenario 5: Hide Collected Items Filter (User Story 4 - FR-013)

**Goal**: Verify "Hide Collected" toggle removes collected items from view

**Steps**:

1. Mark 3-5 items as collected (checkbox checked)
2. Enable the "**Hide Collected**" toggle button
3. Observe the item list
4. Disable the "Hide Collected" toggle
5. Observe the item list again

**Expected Results**:

- ✅ With "Hide Collected" ON: Collected items disappear from list
- ✅ With "Hide Collected" OFF: Collected items reappear with faded styling
- ✅ Toggle changes apply instantly (< 100ms)
- ✅ Filter state can persist across sessions (optional: save to localStorage)

**Pass Criteria**: Hide Collected filter works correctly, no visual glitches

---

## Test Scenario 6: Item Details and Locations (User Story 5)

**Goal**: Verify item detail modal shows quest/hideout contexts and wiki link

**Steps**:

1. Click on an item card (e.g., "Cordura polyamide fabric")
2. Observe the detail modal that opens
3. Review the information displayed
4. Click the "**Wiki**" link button
5. Click the "Close" button or press Escape

**Expected Results**:

- ✅ Modal opens with item details:
  - Large item icon (128x128px or larger)
  - Item full name and short name
  - Total quantity needed
  - FiR indicator (if applicable)
  - List of quests requiring this item (quest name + trader)
  - List of hideout modules requiring this item (module name + level)
  - "Wiki" button linking to Tarkov wiki page
- ✅ Clicking "Wiki" opens new tab with correct wiki URL
- ✅ Clicking "Close" or pressing Escape closes modal
- ✅ Modal has overlay darkening background

**Pass Criteria**: Modal displays complete item information, wiki link works

---

## Test Scenario 7: Empty State (Edge Case)

**Goal**: Verify empty state when all items are collected or no items needed

**Steps**:

1. Complete all quests in Quest List (or mark all hideout modules as completed)
2. Open Item Tracker tab
3. Observe the empty state message

**Expected Results**:

- ✅ When no items needed: Display "All items collected! ✅" or "No items needed"
- ✅ Empty state includes helpful text (e.g., "Complete more quests to see required items")
- ✅ No broken layout or empty white space

**Pass Criteria**: Empty state is user-friendly and informative

---

## Test Scenario 8: Item Deduplication (Edge Case - FR-011)

**Goal**: Verify items needed by multiple quests show aggregated quantity

**Steps**:

1. Find an item required by multiple quests (e.g., "Bolts" needed for quest A x5 and hideout x10)
2. Observe the item card quantity
3. Click the item card to open details
4. Review the source list in the modal

**Expected Results**:

- ✅ Item card shows total quantity: "Bolts x15"
- ✅ Item card subtitle lists all sources: "Needed for: Gunsmith Part 1, Lavatory Level 2"
- ✅ Detail modal shows breakdown:
  - "Gunsmith Part 1: 5x Bolts"
  - "Lavatory Level 2: 10x Bolts"
- ✅ No duplicate item cards in list

**Pass Criteria**: Duplicate items correctly aggregated, all sources visible in modal

---

## Test Scenario 9: FiR Indicator (Edge Case - FR-015)

**Goal**: Verify Found in Raid indicator shows for quest items requiring FiR

**Steps**:

1. Find a quest item with FiR requirement (e.g., "Golden Star balm" for "Sanitary Standards Part 1")
2. Observe the item card
3. Click the item to open details

**Expected Results**:

- ✅ Item card shows FiR badge/icon (🔍 or "FiR" text)
- ✅ Detail modal explicitly states "Found in Raid required"
- ✅ Items without FiR requirement do NOT show FiR indicator

**Pass Criteria**: FiR indicator only shown when required, clearly labeled

---

## Test Scenario 10: Responsive Performance (SC-001, SC-003)

**Goal**: Verify performance meets success criteria

**Steps**:

1. Open browser DevTools (F12) → Network tab
2. Clear cache and hard reload (Ctrl+Shift+R)
3. Switch to Item Tracker tab
4. Measure load time from tab click to item list render
5. Toggle filters (Quest Items → Hideout Items → Keys)
6. Measure filter response time

**Expected Results**:

- ✅ Initial item list load: < 3 seconds (SC-001)
- ✅ Filter toggle response: < 100ms (SC-003)
- ✅ API calls cached for 24 hours (check localStorage for cache keys)
- ✅ No visual lag or stuttering during filter changes

**Pass Criteria**: Performance benchmarks met, smooth user experience

---

## Bug Reporting Template

If any test fails, report using this format:

```
**Test Scenario**: [Number and Name]
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Browser**: [Chrome 120, Firefox 121, etc.]
**Screenshots**: [Attach if applicable]
```

---

## Smoke Test Checklist (Quick 2-Minute Test)

Run this checklist before each release:

- [ ] Item Tracker tab loads without errors
- [ ] At least 10 items displayed in list view
- [ ] Clicking "Quest Items" filter shows only quest items
- [ ] Marking item as collected persists after refresh
- [ ] Item detail modal opens when clicking item card
- [ ] Priority badges show "Needed Soon" or "Needed Later"
- [ ] No console errors in browser DevTools

---

**Testing Complete** ✅  
All scenarios validate feature meets specification requirements (US1-US5, FR-001 to FR-015, SC-001 to SC-008).

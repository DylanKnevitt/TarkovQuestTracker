# Quickstart Guide: Enhanced Hideout & Item Tracker

**Feature**: 004-hideout-item-enhancements  
**Purpose**: Manual testing checklist for Feature 004 implementation  
**Last Updated**: November 16, 2025

---

## Prerequisites

- [ ] Feature 003 (Item Tracker) is working correctly
- [ ] Supabase credentials configured (or localStorage fallback ready)
- [ ] Development server running (`npm run dev`)
- [ ] Browser DevTools open (Console tab for debugging)

---

## Test Scenarios

### US1: Hideout Build Status Tracking

#### Scenario 1.1: View Initial Hideout State
**Given**: Fresh user with no hideout progress saved  
**When**: Navigate to Item Tracker tab → Hideout Progress subtab  
**Then**:
- [ ] All hideout modules displayed
- [ ] All modules show Level 0
- [ ] Each module shows required items for Level 1
- [ ] Build status shows "Not Built" or equivalent indicator

---

#### Scenario 1.2: Mark Module as Built
**Given**: Viewing hideout modules  
**When**: Click "Mark as Built" on a module (e.g., Generator Level 1)  
**Then**:
- [ ] Module card updates immediately (< 500ms)
- [ ] Status changes to "Built" with visual indicator (checkmark/green)
- [ ] No full page reload required
- [ ] Console shows success message (if debug logging enabled)

---

#### Scenario 1.3: Persistence After Refresh
**Given**: Some modules marked as built  
**When**: Refresh the page (F5)  
**Then**:
- [ ] Previously built modules still show as "Built"
- [ ] Unbuilt modules still show as "Not Built"
- [ ] Progress persists correctly

---

#### Scenario 1.4: LocalStorage Fallback (Not Authenticated)
**Given**: User is not logged in (no Supabase auth)  
**When**: Mark modules as built and refresh page  
**Then**:
- [ ] Progress still persists (using localStorage)
- [ ] No error messages in console
- [ ] UI works identically to authenticated mode

---

### US2: Smart Priority by Buildability

#### Scenario 2.1: NEED_NOW for Buildable Modules
**Given**: A hideout module with no unbuilt prerequisites (e.g., Generator Level 1)  
**When**: Navigate to Item Tracker → Items subtab  
**Then**:
- [ ] Items required for that module show **NEED_NOW** priority
- [ ] Priority badge is red/orange color
- [ ] Priority text says "NEED NOW"

---

#### Scenario 2.2: NEED_SOON for 1-2 Steps Away
**Given**: A module requiring 1 unbuilt prerequisite (e.g., Lavatory Level 2 requires Vents Level 1)  
**When**: View Item Tracker  
**Then**:
- [ ] Items for Lavatory Level 2 show **NEED_SOON** priority
- [ ] Priority badge is yellow color
- [ ] Priority text says "NEED SOON"

---

#### Scenario 2.3: NEED_LATER for 3+ Steps Away
**Given**: A high-level module requiring 3+ unbuilt prerequisites  
**When**: View Item Tracker  
**Then**:
- [ ] Items for that module show **NEED_LATER** priority
- [ ] Priority badge is blue/gray color
- [ ] Priority text says "NEED LATER"

---

#### Scenario 2.4: Priority Updates on Progress Change
**Given**: Items showing NEED_SOON priority  
**When**: Mark the blocking prerequisite module as built  
**Then**:
- [ ] Item Tracker automatically refreshes
- [ ] Items upgrade to NEED_NOW priority (if no other prerequisites)
- [ ] Priority badge color changes from yellow to red/orange
- [ ] Change happens within 1 second

---

### US3: Priority Legend & Visual Clarity

#### Scenario 3.1: Tooltip on Desktop (Hover)
**Given**: Viewing Item Tracker on desktop  
**When**: Hover mouse over a priority badge  
**Then**:
- [ ] Tooltip appears above/below badge
- [ ] Tooltip explains priority meaning (e.g., "Buildable now - all prerequisites met")
- [ ] Tooltip mentions depth/distance (e.g., "0 steps away" or "2 modules blocking")
- [ ] Tooltip disappears when mouse moves away

---

#### Scenario 3.2: Tooltip on Mobile (Tap)
**Given**: Viewing Item Tracker on mobile device (or DevTools mobile emulation)  
**When**: Tap on priority badge or info icon (ⓘ)  
**Then**:
- [ ] Tooltip appears (since hover doesn't work on mobile)
- [ ] Tooltip text is readable on small screen
- [ ] Tooltip can be dismissed (tap outside or X button)

---

#### Scenario 3.3: Tooltip Clarity
**Given**: Reading tooltip text  
**When**: Tooltip is displayed  
**Then**:
- [ ] Text clearly explains NEED_NOW = "buildable now"
- [ ] Text clearly explains NEED_SOON = "1-2 steps away"
- [ ] Text clearly explains NEED_LATER = "3+ steps away"
- [ ] No jargon or confusing terminology

---

### US4: Quest Priority Integration

#### Scenario 4.1: NEED_NOW for Unlocked Quests
**Given**: An unlocked, incomplete quest  
**When**: View Item Tracker  
**Then**:
- [ ] Items for that quest show **NEED_NOW** priority
- [ ] Tooltip mentions "quest" as the reason
- [ ] Priority matches hideout logic (depth 0 = NEED_NOW)

---

#### Scenario 4.2: NEED_SOON for 1-2 Prerequisite Quests Away
**Given**: A quest behind 1-2 incomplete prerequisite quests  
**When**: View Item Tracker  
**Then**:
- [ ] Items show **NEED_SOON** priority
- [ ] Tooltip shows quest depth (e.g., "2 quests away")

---

#### Scenario 4.3: NEED_LATER for 3+ Prerequisite Quests Away
**Given**: A quest behind 3+ incomplete prerequisite quests  
**When**: View Item Tracker  
**Then**:
- [ ] Items show **NEED_LATER** priority
- [ ] Tooltip shows quest depth (e.g., "4 quests away")

---

#### Scenario 4.4: Priority Merging (Quest + Hideout)
**Given**: An item needed for both a buildable hideout module (NEED_NOW) AND a locked quest (NEED_LATER)  
**When**: View Item Tracker  
**Then**:
- [ ] Item shows **NEED_NOW** priority (highest priority wins)
- [ ] Tooltip mentions both sources (quest + hideout)
- [ ] User understands this item is urgently needed

---

### US5: Hideout Module Visual Cards

#### Scenario 5.1: Visual Card Design
**Given**: Viewing Hideout Progress subtab  
**When**: Observing module cards  
**Then**:
- [ ] Each card shows module icon (or placeholder)
- [ ] Card shows module name (e.g., "Generator")
- [ ] Card shows current level (e.g., "Level 1")
- [ ] Card shows max level (e.g., "/ 3")
- [ ] Card shows build status (Built / Not Built)

---

#### Scenario 5.2: Required Items Display
**Given**: Viewing an unbuilt module card  
**When**: Examining the card  
**Then**:
- [ ] Required items listed with names
- [ ] Required quantities shown (e.g., "5x Bolts")
- [ ] Item icons displayed (if available)
- [ ] Items clickable to open detail modal (reuses existing modal)

---

#### Scenario 5.3: Built Module Indicator
**Given**: A module marked as built  
**When**: Viewing its card  
**Then**:
- [ ] Card shows "Built" status clearly
- [ ] Visual indicator present (checkmark, green border, etc.)
- [ ] Required items section hidden or grayed out
- [ ] Toggle button changes to "Unmark" or equivalent

---

## Edge Case Testing

### Edge Case 1: Multiple Prerequisite Levels
**Given**: A module requiring "Lavatory Level 2" AND "Lavatory Level 3" (same station, different levels)  
**When**: Calculating dependency depth  
**Then**:
- [ ] System counts as 1 unique prerequisite (highest level)
- [ ] No double-counting in depth calculation
- [ ] No errors in console

---

### Edge Case 2: Item Needed by Multiple Modules
**Given**: An item (e.g., "Bolts") needed by 5 different hideout modules at various depths  
**When**: Viewing item card  
**Then**:
- [ ] Item shows highest priority (most urgent need)
- [ ] Total quantity reflects all sources
- [ ] Detail modal shows all sources when clicked

---

### Edge Case 3: Out-of-Sync Progress
**Given**: Hideout progress differs between localStorage and database  
**When**: User logs in  
**Then**:
- [ ] Database is source of truth (overwrites localStorage)
- [ ] UI updates to match database state
- [ ] No conflicting data displayed

---

### Edge Case 4: No Prerequisites but Items Missing
**Given**: A module with no prerequisite modules but requires items player doesn't have  
**When**: Viewing Item Tracker  
**Then**:
- [ ] Items show **NEED_NOW** priority (buildable = depth 0)
- [ ] Tooltip explains "buildable now, collect these items"
- [ ] No confusion about buildability vs item collection

---

## Performance Testing

### Test P1: Priority Calculation Speed
**Given**: 500+ items in Item Tracker  
**When**: Mark a hideout module as built (triggering priority recalculation)  
**Then**:
- [ ] Priority recalculation completes in < 100ms (check DevTools Performance tab)
- [ ] UI remains responsive (no freezing)
- [ ] No lag when scrolling after recalculation

---

### Test P2: Module Toggle Response Time
**Given**: Viewing hideout modules  
**When**: Click "Mark as Built" button  
**Then**:
- [ ] Visual feedback appears in < 500ms
- [ ] Database sync completes in < 2 seconds (check network tab)
- [ ] UI doesn't block during sync

---

### Test P3: Mobile Responsiveness
**Given**: Using mobile device or 375px width DevTools emulation  
**When**: Navigating all features  
**Then**:
- [ ] No horizontal scrolling
- [ ] Touch targets ≥ 44px (easy to tap)
- [ ] Text readable without zooming
- [ ] Subtab buttons accessible
- [ ] Module cards stack vertically on small screens

---

## Accessibility Testing

### Test A1: Keyboard Navigation
**Given**: User navigating with keyboard only (Tab, Enter, Space)  
**When**: Navigating hideout tracker  
**Then**:
- [ ] All interactive elements focusable
- [ ] Focus indicator visible
- [ ] Enter/Space toggles module build status
- [ ] Subtab navigation works with arrow keys

---

### Test A2: Screen Reader Support
**Given**: Using screen reader (NVDA, JAWS, VoiceOver)  
**When**: Navigating hideout tracker  
**Then**:
- [ ] Priority badges announced with meaning
- [ ] Module build status announced
- [ ] Required items list announced
- [ ] Toggle buttons have clear labels

---

## Browser Compatibility

### Test B1: Chrome
- [ ] All features work correctly
- [ ] Tooltips display properly
- [ ] CSS grid layout correct

### Test B2: Firefox
- [ ] All features work correctly
- [ ] Tooltips display properly
- [ ] CSS grid layout correct

### Test B3: Safari
- [ ] All features work correctly
- [ ] Tooltips display properly
- [ ] CSS grid layout correct

---

## Success Criteria Verification

- [ ] **SC-001**: All hideout areas visible with build status
- [ ] **SC-002**: Module toggle feedback < 500ms
- [ ] **SC-003**: 95% priority calculations < 100ms
- [ ] **SC-004**: Priority legend visible and understandable
- [ ] **SC-006**: Hideout progress syncs to database within 2 seconds
- [ ] **SC-007**: Items correctly categorized as NEED_NOW (depth 0)
- [ ] **SC-008**: Items correctly categorized as NEED_SOON (depth 1-2)
- [ ] **SC-009**: Items correctly categorized as NEED_LATER (depth 3+)
- [ ] **SC-010**: No horizontal scrolling on 375px screens

---

## Bug Reporting Template

If you encounter issues during testing, use this template:

```
**Bug Title**: [Short description]

**Steps to Reproduce**:
1. [First step]
2. [Second step]
3. [etc.]

**Expected Result**: [What should happen]

**Actual Result**: [What actually happened]

**Screenshots**: [If applicable]

**Console Errors**: [Copy any error messages]

**Environment**:
- Browser: [Chrome/Firefox/Safari]
- Version: [Browser version]
- Screen Size: [Desktop/Mobile/Tablet]
- Authenticated: [Yes/No]
```

---

## Testing Sign-Off

**Tester Name**: _______________  
**Date**: _______________  
**Overall Result**: [ ] PASS / [ ] FAIL  
**Notes**: 

---

**All tests passing?** ✅ Feature 004 is ready for deployment!

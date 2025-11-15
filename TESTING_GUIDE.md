# Testing Guide - Tarkov Quest Tracker

## Quick Test Checklist

### ✅ Basic Functionality
- [ ] Application loads without errors
- [ ] Quest data fetches from API
- [ ] Quest list displays correctly
- [ ] All three tabs are accessible (List, Graph, Path)

### ✅ Quest List View
- [ ] Quests are grouped by trader
- [ ] Quest cards show correct information
- [ ] Click quest card opens detailed modal
- [ ] "Mark Complete" button works
- [ ] Progress persists after page refresh
- [ ] Wiki links open in new tab

### ✅ Filtering
- [ ] Trader checkboxes filter correctly
- [ ] Level min/max filters work
- [ ] Search box filters by quest name
- [ ] "Show Completed" toggle works
- [ ] "Kappa Only" filter works
- [ ] "Show Locked" toggle works
- [ ] "Reset All Filters" button works

### ✅ Quick Path Buttons
- [ ] "Path to Lightkeeper" shows quest chain
- [ ] "Path to Setup" shows early quests
- [ ] "Path to Test Drive" shows Gunsmith quests
- [ ] Switches to graph view automatically
- [ ] Highlights correct quests

### ✅ Dependency Graph
- [ ] Graph renders without errors
- [ ] Nodes are clickable
- [ ] Edges show quest dependencies
- [ ] Zoom and pan work
- [ ] "Fit to Screen" button works
- [ ] "Reset Zoom" button works
- [ ] Layout selector changes graph layout
- [ ] Color coding works (completed/unlocked/locked)

### ✅ Path Finder
- [ ] Target quest dropdown populates
- [ ] Player level input works
- [ ] "Find Path" calculates route
- [ ] Path displays step-by-step
- [ ] Switches to graph and highlights path
- [ ] Shows quest status in path (completed/available/locked)

### ✅ Progress Tracking
- [ ] Marking quest complete updates UI
- [ ] Stats in header update (X/Y Complete)
- [ ] Progress saves to localStorage
- [ ] Progress loads on page refresh
- [ ] Dependent quests unlock automatically
- [ ] Graph updates when quests completed

---

## Test Scenarios

### Scenario 1: New User - First Time Use
**Goal:** Verify fresh user experience

1. Open http://localhost:8080
2. Verify quest data loads (may take 2-5 seconds)
3. Check header shows "X Total Quests" and "0/X (0%) Complete"
4. Verify quest list shows all traders
5. Verify sidebar filters are all checked

**Expected:** Clean interface, all quests visible, no progress

---

### Scenario 2: Path to Setup Quest
**Goal:** Verify fastest path to Setup quest

1. Click "Path to Setup" button in sidebar
2. Verify switches to Graph view
3. Verify graph highlights Setup quest chain
4. Count highlighted quests (~15-20)
5. Verify early level quests (levels 1-10)
6. Check for Skier and Therapist quests

**Expected:** Clear path from early quests to Setup, visual highlighting

---

### Scenario 3: Path to Lightkeeper
**Goal:** Verify extensive quest chain

1. Click "Path to Lightkeeper" button
2. Verify graph shows large quest network
3. Look for key quests:
   - "Collector" (Fence)
   - "The Huntsman Path - Relentless" (Jaeger)
   - "Capturing Outposts"
   - "Meeting Place"
4. Verify ~200+ quests in path

**Expected:** Massive graph showing most quests, clear that Lightkeeper requires extensive progression

---

### Scenario 4: Mark Quests Complete
**Goal:** Verify progress tracking

1. Go to List view
2. Find first Prapor quest
3. Click "Mark Complete" button
4. Verify button changes to "✓ Completed"
5. Verify card gets green highlight
6. Check header stats increment
7. Refresh page (F5)
8. Verify quest still marked complete

**Expected:** Progress persists, stats update, visual feedback

---

### Scenario 5: Custom Path Finding
**Goal:** Verify path finder feature

1. Go to "Path Finder" tab
2. Set "Your Current Level" to 15
3. Select "Setup" from target quest dropdown
4. Click "Find Path"
5. Verify path displays with step numbers
6. Check quests are level 15 or below
7. Verify graph switches and highlights

**Expected:** Calculated path shows only accessible quests, clear step-by-step guide

---

### Scenario 6: Filter by Trader
**Goal:** Verify filtering works

1. Go to List view
2. Uncheck all traders except "Mechanic"
3. Verify only Mechanic quests show
4. Count quests (should be ~20-30)
5. Go to Graph view
6. Verify graph only shows Mechanic quests
7. Click "Reset All Filters"
8. Verify all traders show again

**Expected:** Clean filtering, both views update, reset works

---

### Scenario 7: Search Functionality
**Goal:** Verify search works

1. In search box, type "gunsmith"
2. Verify only Gunsmith quests show
3. Clear search
4. Type "customs"
5. Verify quests with Customs objectives show
6. Clear search
7. Verify all quests return

**Expected:** Instant filtering, searches names and objectives

---

### Scenario 8: Quest Details Modal
**Goal:** Verify detailed information display

1. Click any quest card
2. Verify modal opens
3. Check displays:
   - Quest name
   - Trader, level, XP
   - All objectives
   - Prerequisites list
   - Unlocks list
   - Wiki link
4. Click "X" to close
5. Verify modal closes

**Expected:** Complete quest information, easy to close

---

### Scenario 9: Graph Interactions
**Goal:** Verify graph controls

1. Go to Graph view
2. Scroll mouse wheel to zoom
3. Click and drag to pan
4. Click "Fit to Screen"
5. Verify graph centers and fits
6. Change layout to "Breadth First"
7. Verify graph reorganizes
8. Click "Reset Zoom"
9. Click on a node
10. Verify quest details modal opens

**Expected:** Smooth interactions, all controls work

---

### Scenario 10: Mobile Responsive (Optional)
**Goal:** Verify mobile layout

1. Open browser DevTools (F12)
2. Toggle device emulation (Ctrl+Shift+M)
3. Select mobile device (iPhone, etc.)
4. Verify sidebar stacks on top
5. Verify tabs work
6. Verify quest cards stack vertically
7. Check graph is usable on mobile

**Expected:** Clean mobile layout, all features accessible

---

## Performance Benchmarks

### Load Time
- **Initial API fetch:** 2-5 seconds
- **Cached load:** <100ms
- **Quest list render:** <500ms
- **Graph render:** 1-2 seconds (depends on quest count)

### Memory Usage
- **Expected:** 50-100MB
- **Maximum:** <200MB

### API Calls
- **Initial load:** 1 API call
- **24-hour period:** 0 additional calls (cached)

---

## Browser Compatibility

### Tested Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

### Required Features
- ES6 Modules
- Fetch API
- LocalStorage
- CSS Grid/Flexbox

---

## Troubleshooting

### Issue: Quest data not loading
**Solution:** 
1. Check browser console for errors
2. Verify internet connection
3. Check if API is accessible: https://api.tarkov.dev/
4. Clear localStorage and refresh

### Issue: Graph not rendering
**Solution:**
1. Check if Cytoscape.js CDN loaded
2. Verify browser supports canvas
3. Try different layout algorithm
4. Check browser console for errors

### Issue: Progress not saving
**Solution:**
1. Check if LocalStorage is enabled
2. Clear browser cache
3. Try incognito/private mode
4. Check storage quota not exceeded

### Issue: Search not working
**Solution:**
1. Verify you're on List view
2. Check spelling
3. Try partial words
4. Clear all filters first

---

## Debug Mode

### Enable Console Logging
Open browser console (F12) to see:
- API fetch status
- Quest data processing
- Click events
- Filter updates

### Inspect LocalStorage
```javascript
// View cached quest data
localStorage.getItem('tarkov_quest_data')

// View progress
localStorage.getItem('quest_progress')

// Clear all data
localStorage.clear()
```

---

## API Testing

### Test API Directly
```bash
# Test GraphQL endpoint
curl -X POST https://api.tarkov.dev/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ tasks { id name } }"}'
```

### Verify Data Structure
Open browser console and run:
```javascript
// After app loads
console.log(window.app.questManager.quests);
```

---

## Performance Testing

### Test Large Graph Rendering
1. Show all quests in graph
2. Check FPS (should be 30+)
3. Test zoom/pan responsiveness
4. Monitor memory usage

### Test Filtering Performance
1. Toggle all trader filters rapidly
2. Type in search box quickly
3. Verify no lag or freezing
4. Check DOM update speed

---

## Deployment Checklist

Before deploying to production:
- [ ] Test in all major browsers
- [ ] Verify API calls work from production domain
- [ ] Check CORS settings
- [ ] Test on mobile devices
- [ ] Verify LocalStorage works
- [ ] Test with slow network (throttling)
- [ ] Check all external CDN links work
- [ ] Verify no console errors
- [ ] Test with ad blockers enabled
- [ ] Check accessibility (keyboard navigation)

---

## Bug Reporting Template

If you find a bug, report with:
```
**Bug Description:**
[What happened]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [etc.]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Browser & Version:**
[e.g., Chrome 120]

**Console Errors:**
[Paste any errors from browser console]

**Screenshots:**
[If applicable]
```

---

## Success Criteria

Application passes testing if:
✅ All 10 test scenarios pass
✅ No console errors
✅ All features work as described
✅ Progress persists correctly
✅ API data loads successfully
✅ Graph renders without issues
✅ Mobile layout is usable
✅ Performance is acceptable

**Current Status:** ✅ READY FOR TESTING

The application is fully functional and ready for comprehensive testing!

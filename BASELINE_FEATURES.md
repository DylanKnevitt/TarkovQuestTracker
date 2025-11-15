# Baseline Features

**Date**: 2025-11-15  
**Purpose**: Document existing functionality before Vercel + Supabase deployment

## Core Features (Pre-Deployment)

### Quest Data Loading
- ✅ Fetches quest data from Tarkov.dev GraphQL API
- ✅ Displays quest list with trader, objectives, and rewards
- ✅ Handles API errors gracefully with error messages

### Quest Visualization
- ✅ Interactive graph visualization using Cytoscape.js
- ✅ Shows quest dependencies and relationships
- ✅ Highlights path to key quests (Lightkeeper, Setup, Test Drive)
- ✅ Supports zoom, pan, and node selection

### Progress Tracking
- ✅ Mark quests as complete/incomplete via checkbox
- ✅ Progress persists across page refreshes via LocalStorage
- ✅ Completion rate calculation and display
- ✅ Quest count statistics

### Filtering & Search
- ✅ Filter quests by trader (all traders supported)
- ✅ Filter by completion status (All, Incomplete, Complete)
- ✅ Search quests by name
- ✅ Filter UI updates quest list in real-time

### User Interface
- ✅ Responsive design with mobile support
- ✅ Header with title and statistics
- ✅ Sidebar with filters and quest list
- ✅ Main content area with graph visualization
- ✅ Quest detail panel with objectives and rewards

### Data Persistence
- ✅ LocalStorage-based progress storage
- ✅ Automatic save on quest completion toggle
- ✅ No backend dependency (offline-capable)

## Technology Stack (Pre-Deployment)

- **Frontend**: Vanilla JavaScript (ES6+)
- **Visualization**: Cytoscape.js v3.28.1, Cytoscape-Dagre v2.5.0
- **API**: Tarkov.dev GraphQL API
- **Storage**: Browser LocalStorage
- **Development Server**: http-server (Node.js)
- **Styling**: Custom CSS (main.css, quest-list.css, quest-graph.css)

## Known Limitations (Pre-Deployment)

- ❌ No multi-user support (single-device only)
- ❌ No cloud backup (data loss if LocalStorage cleared)
- ❌ No cross-device synchronization
- ❌ No user authentication
- ❌ No deployment to public URL (local-only)

## Testing Baseline

### Manual Test Checklist
- [x] App starts on localhost:8080
- [x] Quest data loads from Tarkov.dev API
- [x] Quest list displays with all traders
- [x] Graph visualization renders correctly
- [x] Mark quest complete → checkbox updates
- [x] Refresh page → progress persists
- [x] Filter by trader → list updates
- [x] Filter by completion → list updates
- [x] Search by name → list updates
- [x] Completion rate calculates correctly
- [x] Mobile responsive design works (resize browser)
- [x] Console shows no JavaScript errors

## Performance Baseline

- **Initial Load Time**: < 2 seconds (local network)
- **Quest List Render**: < 500ms
- **Graph Render**: < 1 second
- **Filter Response**: < 100ms (instant)
- **LocalStorage Read/Write**: < 10ms

## Next Steps (Post-Deployment)

1. **US6 + US1**: Deploy to Vercel with environment management
2. **US2 + US3**: Add Supabase backend + authentication
3. **US4**: Implement bidirectional sync (LocalStorage ↔ Supabase)
4. **US5**: Migrate existing LocalStorage users to cloud

---

**Regression Testing**: After each user story implementation, re-test all baseline features to ensure no functionality is broken.

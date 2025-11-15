# Tarkov Quest Tracker - Implementation Plan

## Project Overview
Interactive static Single Page Application (SPA) for tracking Escape from Tarkov quests with optimized path finding to key quests like Lightkeeper, Setup, and Test Drive.

---

## ✅ Completed Implementation

### 1. Project Structure ✓
```
TarkovQuest/
├── index.html              # Main application HTML
├── package.json            # Dependencies & scripts
├── README.md              # Documentation
├── .gitignore             # Git ignore file
├── src/
│   ├── index.js           # Main application controller
│   ├── api/
│   │   └── tarkov-api.js  # GraphQL API client with caching
│   ├── models/
│   │   └── quest.js       # Quest data model & manager
│   └── components/
│       ├── quest-list.js  # Quest list view component
│       └── quest-graph.js # Dependency graph visualization
├── styles/
│   ├── main.css           # Core application styles
│   ├── quest-list.css     # Quest list styles
│   └── quest-graph.css    # Graph visualization styles
└── scripts/
    └── fetch-quest-data.js # Data fetching utility
```

### 2. Data Source - Tarkov.dev API ✓
**API Endpoint:** `https://api.tarkov.dev/graphql`

**Features Implemented:**
- ✅ GraphQL query for complete quest data
- ✅ Fetches all quest properties:
  - Quest name, ID, trader
  - Level requirements
  - Prerequisites (task requirements)
  - Objectives with descriptions
  - Rewards (XP, items, trader standing)
  - Kappa requirement flag
  - Lightkeeper requirement flag
- ✅ Local caching (24-hour expiry)
- ✅ Error handling and retry logic

**Data Model:**
```javascript
{
  id: string,
  name: string,
  trader: string,
  minLevel: number,
  experience: number,
  prerequisites: [quest_ids],
  objectives: [{
    type, description, optional, maps
  }],
  rewards: { start, finish },
  kappaRequired: boolean,
  lightkeeperRequired: boolean,
  isLightkeeperPath: boolean
}
```

### 3. Core Features ✓

#### A. Quest List View
- ✅ Organized by trader
- ✅ Color-coded status (completed/available/locked)
- ✅ Quest cards with:
  - Name, level, XP reward
  - Objectives preview
  - Kappa/Lightkeeper badges
  - Action buttons (complete, details, wiki)
- ✅ Click for detailed modal view

#### B. Dependency Graph Visualization
- ✅ Cytoscape.js with Dagre layout
- ✅ Interactive nodes (clickable)
- ✅ Visual quest dependencies (edges)
- ✅ Color-coded by status & trader
- ✅ Special markers:
  - Orange border: Lightkeeper path
  - Yellow border: Kappa required
- ✅ Multiple layout algorithms:
  - Hierarchical (Dagre)
  - Breadth First
  - Circle
- ✅ Zoom, pan, fit controls

#### C. Path Finder
- ✅ Select target quest
- ✅ Specify player level
- ✅ Calculate optimal path
- ✅ Display step-by-step route
- ✅ Highlight path in graph view
- ✅ Visual indicators for completion status

#### D. Filtering & Search
- ✅ Filter by trader (multi-select)
- ✅ Filter by level range
- ✅ Text search (name/objectives)
- ✅ Toggle completed quests
- ✅ Toggle locked quests
- ✅ Kappa-only filter

#### E. Progress Tracking
- ✅ Mark quests as complete
- ✅ LocalStorage persistence
- ✅ Completion statistics
- ✅ Auto-unlock dependent quests
- ✅ Reset progress option

### 4. Quick Path Features ✓

#### Path to Lightkeeper
- ✅ Identifies all Lightkeeper-required quests
- ✅ Traces complete prerequisite chain
- ✅ Highlights key milestones:
  - Collector (Fence)
  - The Huntsman Path - Relentless (Jaeger)
  - Capturing Outposts
  - Burn the Evidence
  - Meeting Place

#### Path to Setup (Skier)
- ✅ Level 10 quest
- ✅ Prerequisite: "Friend from the West - Part 2"
- ✅ Shows complete quest chain from start
- ✅ Estimated ~15-20 prerequisite quests

#### Path to Test Drive (Mechanic)
- ✅ Level 30 quest
- ✅ Prerequisite: All Gunsmith quests (1-16)
- ✅ Shows complete Gunsmith progression
- ✅ Technical weapon modification requirements

---

## 🎯 Key Quest Information

### Path to Lightkeeper Summary
**Total Quests Required:** ~200+ (nearly all quests)
**Key Bottleneck:** Collector quest (requires completing most trader quests)
**Level Requirement:** 62+
**Difficulty:** Extreme

**Critical Path:**
1. Complete majority of Prapor, Therapist, Skier, Peacekeeper, Mechanic, Ragman quests
2. Complete Jaeger quest line up to "The Huntsman Path - Relentless"
3. Complete Fence's "Collector" quest
4. Complete late-game Jaeger quests
5. Final sequence: Capturing Outposts → Burn the Evidence → Meeting Place

### Path to Setup Summary
**Level Requirement:** 10
**Trader:** Skier
**Prerequisites:**
- Friend from the West - Part 1 & 2 (Skier)
- Several early Therapist quests

**Estimated Quest Count:** 15-20 quests
**Difficulty:** Easy
**Fastest Path:** Rush early Skier and Therapist quests

### Path to Test Drive Summary
**Level Requirement:** 30
**Trader:** Mechanic
**Prerequisites:**
- Gunsmith - Part 1 through 16
- Each Gunsmith requires specific weapon builds

**Estimated Quest Count:** 16+ quests
**Difficulty:** Medium
**Key Requirement:** Access to Flea Market (Level 15) and substantial roubles for weapon parts

---

## 🚀 Running the Application

### Installation
```bash
npm install
```

### Start Development Server
```bash
npm start
```
**URL:** http://localhost:8080

### Fetch Latest Quest Data
```bash
npm run fetch-data
```

---

## 📊 Technical Stack

- **Frontend Framework:** Vanilla JavaScript (ES6 modules)
- **Graph Visualization:** Cytoscape.js 3.28.1
- **Layout Engine:** Dagre 2.5.0
- **Data Source:** Tarkov.dev GraphQL API
- **Storage:** LocalStorage for progress
- **Server:** http-server (development)
- **Styling:** CSS3 with custom properties

---

## 🎨 UI/UX Features

### Color Scheme (Dark Theme)
- **Primary Background:** #1a202c
- **Secondary Background:** #2d3748
- **Accent Blue:** #4299e1 (available quests)
- **Success Green:** #48bb78 (completed)
- **Warning Orange:** #ed8936 (Lightkeeper)
- **Yellow:** #eab308 (Kappa)

### Trader Colors
- Prapor: Red (#dc2626)
- Therapist: Pink (#ec4899)
- Fence: Purple (#8b5cf6)
- Skier: Blue (#3b82f6)
- Peacekeeper: Cyan (#06b6d4)
- Mechanic: Green (#10b981)
- Ragman: Amber (#f59e0b)
- Jaeger: Orange (#f97316)
- Lightkeeper: Yellow (#eab308)

### Responsive Design
- ✅ Desktop: Full sidebar + content
- ✅ Tablet: Collapsible sidebar
- ✅ Mobile: Stacked layout

---

## 🔄 Data Flow

```
User Opens App
    ↓
Check LocalStorage Cache
    ↓
Cache Valid? → Use cached data
    ↓ No
Fetch from Tarkov.dev API
    ↓
Process & Transform Data
    ↓
Cache for 24 hours
    ↓
Initialize QuestManager
    ↓
Load User Progress (LocalStorage)
    ↓
Render UI Components
    ↓
User Interactions → Update State → Save Progress
```

---

## 📈 Performance Optimizations

- ✅ Data caching (reduces API calls)
- ✅ Lazy graph rendering (only when tab active)
- ✅ LocalStorage for instant progress load
- ✅ Efficient DOM updates (event delegation)
- ✅ Debounced search input
- ✅ Static asset serving (no build step)

---

## 🐛 Known Limitations

1. **Data Freshness:** Cache expires after 24 hours
2. **Offline Support:** Requires initial API fetch
3. **Graph Complexity:** Large graphs may be slow on mobile
4. **Cross-Device Sync:** No cloud sync (local only)

---

## 🔮 Future Enhancements

### Phase 2 (Recommended Next Steps)
- [ ] Map integration (show quest locations)
- [ ] Item tracking (quest items needed)
- [ ] Hideout requirements tracker
- [ ] Trader reputation calculator
- [ ] Quest timer/countdown
- [ ] Export/import progress (JSON)

### Phase 3 (Advanced)
- [ ] Multi-language support
- [ ] Cloud save/sync
- [ ] Mobile app (React Native)
- [ ] Quest guide videos
- [ ] Community quest tips
- [ ] Integration with EFT launchers

---

## 📝 API Rate Limiting

Tarkov.dev API is **free and unlimited** but please:
- ✅ Use caching (already implemented)
- ✅ Don't spam requests
- ✅ Consider contributing to the project

---

## 🤝 Credits

- **API Provider:** [Tarkov.dev](https://tarkov.dev) by The Hideout
- **Game Data:** Community-maintained
- **Graph Library:** Cytoscape.js
- **Layout Algorithm:** Dagre

---

## 📞 Support & Contributing

- **Issues:** Create GitHub issue
- **Discord:** [The Hideout Discord](https://discord.gg/WwTvNe356u)
- **API Docs:** https://api.tarkov.dev/

---

## ✨ Summary

**Status:** ✅ **FULLY IMPLEMENTED & WORKING**

All 4 requested components are complete:
1. ✅ Full project structure
2. ✅ Real quest data from Tarkov API (not sample data)
3. ✅ Interactive dependency graph
4. ✅ Optimized paths to Lightkeeper, Setup, and Test Drive

**Current State:**
- Server running on http://localhost:8080
- All dependencies installed
- Application fully functional
- Ready for testing and deployment

**Next Steps:**
1. Test the application in your browser
2. Try the quick path buttons
3. Mark some quests as complete
4. Explore the dependency graph
5. Use the path finder for custom routes

The application is now ready for use and deployment! 🚀

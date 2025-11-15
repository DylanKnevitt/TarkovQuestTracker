# Quickstart Guide: Tarkov Quest Tracker

**Target Audience**: Developers contributing to or forking the project  
**Time to Setup**: ~5 minutes  
**Prerequisites**: Node.js 14+, modern browser, text editor

---

## Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd TarkovQuest
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- `http-server` (development server)
- `cytoscape` + `cytoscape-dagre` (graph visualization)

### 3. Start Development Server

```bash
npm start
```

Application opens at `http://localhost:8080`

---

## Project Structure

```
TarkovQuest/
├── index.html          # Main entry point
├── src/
│   ├── index.js        # Application controller
│   ├── api/
│   │   └── tarkov-api.js     # API client
│   ├── models/
│   │   └── quest.js          # Data model
│   └── components/
│       ├── quest-list.js     # List view
│       ├── quest-graph.js    # Graph view
│       └── quest-optimizer.js # Path finder
├── styles/
│   ├── main.css        # Core styles
│   ├── quest-list.css  # List styles
│   └── quest-graph.css # Graph styles
└── specs/
    └── master/
        ├── spec.md            # Feature specification
        ├── plan.md            # Implementation plan
        ├── research.md        # Technical decisions
        ├── data-model.md      # Data structures
        ├── quickstart.md      # This file
        └── contracts/         # API contracts
```

---

## Development Workflow

### Making Changes

1. **Edit files** in `src/` or `styles/`
2. **Refresh browser** to see changes (no build step!)
3. **Check console** for errors

### Testing

Currently manual testing:
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Test user workflows:
   - Load quests
   - Filter by trader
   - Mark quests complete
   - Find quest paths
   - Switch between views

### Debugging

```javascript
// Enable debug mode in browser console
localStorage.setItem('debug', 'true');

// View quest data
app.questManager.quests

// View completed quests
app.questManager.completed

// View statistics
app.questManager.getStats()

// Clear cache
localStorage.removeItem('tarkov_quest_cache');
location.reload();
```

---

## Key Concepts

### Application Flow

```
1. index.html loads
2. src/index.js initializes TarkovQuestApp
3. Fetch quest data (cache or API)
4. Initialize QuestManager with data
5. Create UI components (QuestList, QuestGraph, QuestOptimizer)
6. Render initial view
7. Set up event listeners
```

### Component Communication

```
User Action → Component → QuestManager → LocalStorage
                ↓
            Re-render
```

### Data Flow

```
Tarkov.dev API → Cache (LocalStorage) → QuestManager → Components
                                              ↓
                                        Progress Storage
```

---

## Common Tasks

### Add New Filter

1. **HTML** (`index.html`): Add filter UI
   ```html
   <div class="filter-group">
     <label>
       <input type="checkbox" id="new-filter"> New Filter
     </label>
   </div>
   ```

2. **JavaScript** (`src/index.js`): Add event listener
   ```javascript
   document.getElementById('new-filter').addEventListener('change', (e) => {
     this.questList.updateFilters({ newFilter: e.target.checked });
   });
   ```

3. **Component** (`src/components/quest-list.js`): Implement filter logic
   ```javascript
   applyFilters() {
     return this.questManager.quests.filter(quest => {
       if (this.filters.newFilter && !quest.someProperty) return false;
       // ... other filters
       return true;
     });
   }
   ```

### Add Quest Property

1. **API Client** (`src/api/tarkov-api.js`): Update GraphQL query
   ```graphql
   query {
     tasks {
       # ... existing fields
       newProperty
     }
   }
   ```

2. **Transform Function**: Map API data to internal model
   ```javascript
   function transformApiData(tasks) {
     return tasks.map(task => ({
       // ... existing fields
       newProperty: task.newProperty
     }));
   }
   ```

3. **UI**: Display new property in quest cards or details

### Add New Component

1. **Create file**: `src/components/new-component.js`
   ```javascript
   export class NewComponent {
     constructor(containerId, questManager) {
       this.containerId = containerId;
       this.questManager = questManager;
     }
     
     render() {
       // Implementation
     }
   }
   ```

2. **Import in main**: `src/index.js`
   ```javascript
   import { NewComponent } from './components/new-component.js';
   ```

3. **Initialize**: In `TarkovQuestApp.init()`
   ```javascript
   this.newComponent = new NewComponent('container-id', this.questManager);
   this.newComponent.render();
   ```

4. **Add styles**: `styles/new-component.css`

---

## API Integration

### Fetch Quest Data

```javascript
import { fetchQuests, questCache } from './api/tarkov-api.js';

// Try cache first
let quests = questCache.get();

if (!quests) {
  // Fetch from API
  quests = await fetchQuests();
  questCache.set(quests);
}
```

### Cache Management

```javascript
// Clear cache
questCache.clear();

// Check if cached
const hasCached = questCache.get() !== null;

// Force refresh
questCache.clear();
const freshData = await fetchQuests();
```

---

## State Management

### Quest Completion

```javascript
// Mark quest as completed
questManager.markCompleted(questId);

// Mark as incomplete
questManager.markIncomplete(questId);

// Check completion status
const isCompleted = questManager.isCompleted(questId);

// Get all completed IDs
const completedIds = questManager.getCompletedQuests();
```

### Progress Persistence

Progress automatically saves to LocalStorage on every change:
- Key: `tarkov_quest_progress`
- Format: `{ version, timestamp, completed: [] }`

---

## Graph Visualization

### Customize Graph Appearance

Edit `src/components/quest-graph.js`:

```javascript
// Node colors by trader
const TRADER_COLORS = {
  'Prapor': '#E74C3C',
  'Therapist': '#3498DB',
  // ... add more
};

// Node size
const NODE_WIDTH = 120;
const NODE_HEIGHT = 40;

// Layout configuration
this.cy.layout({
  name: 'dagre',
  rankDir: 'TB',  // Top-to-bottom
  nodeSep: 50,    // Horizontal spacing
  rankSep: 100    // Vertical spacing
}).run();
```

### Add Graph Interactions

```javascript
// Node click
this.cy.on('tap', 'node', (event) => {
  const questId = event.target.data('id');
  // Handle click
});

// Node hover
this.cy.on('mouseover', 'node', (event) => {
  event.target.style('opacity', 1.0);
});
```

---

## Styling

### CSS Variables

Modify theme in `styles/main.css`:

```css
:root {
  --primary-bg: #1a1a1a;      /* Dark background */
  --text-primary: #ffffff;     /* White text */
  --status-completed: #27ae60; /* Green */
  --status-available: #3498db; /* Blue */
  --status-locked: #666666;    /* Gray */
}
```

### Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 767px) { ... }

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) { ... }

/* Desktop */
@media (min-width: 1024px) { ... }
```

---

## Deployment

### Static Hosting

**Files to deploy**:
- `index.html`
- `src/` directory
- `styles/` directory
- `node_modules/cytoscape/` (or use CDN)

**Configuration**:
- All routes redirect to `index.html` (SPA routing)
- HTTPS enabled
- Cache static assets

### GitHub Pages

```bash
git push origin master
```

Enable GitHub Pages in repository settings → Pages → Source: master branch

### Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Vercel

```bash
npm install -g vercel
vercel --prod
```

---

## Troubleshooting

### Quest data not loading

**Check**:
1. Browser console for errors
2. Network tab for API request
3. LocalStorage for cached data

**Fix**:
```javascript
// Clear cache and reload
localStorage.removeItem('tarkov_quest_cache');
location.reload();
```

### Graph not rendering

**Check**:
1. Cytoscape.js loaded (check Network tab)
2. Container element exists (`<div id="quest-graph">`)
3. Graph data populated (`cy.elements().length`)

**Fix**:
```javascript
// Rebuild graph
app.questGraph.buildGraph(app.questManager.quests);
```

### Progress not saving

**Check**:
1. LocalStorage available (`localStorage !== undefined`)
2. Storage quota not exceeded
3. Browser privacy settings

**Fix**:
```javascript
// Test LocalStorage
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('LocalStorage working');
} catch (e) {
  console.error('LocalStorage unavailable:', e);
}
```

---

## Resources

### Documentation
- [Project README](../../README.md)
- [Technical Specification](../../TECHNICAL_SPECIFICATION.md)
- [Cloud Deployment Spec](../../CLOUD_DEPLOYMENT_SPEC.md)

### External APIs
- [Tarkov.dev API Docs](https://tarkov.dev/api/)
- [Cytoscape.js Documentation](https://js.cytoscape.org/)

### Game Resources
- [Tarkov Wiki](https://escapefromtarkov.fandom.com/wiki/)
- [Official Website](https://www.escapefromtarkov.com/)

---

## Next Steps

### For New Contributors

1. Read `README.md` for user documentation
2. Review `TECHNICAL_SPECIFICATION.md` for architecture details
3. Check open issues for tasks to work on
4. Submit pull requests with clear descriptions

### For Feature Development

1. Create feature branch: `git checkout -b feature-name`
2. Document changes in code comments
3. Test thoroughly in multiple browsers
4. Update relevant documentation
5. Submit PR with description and screenshots

### For Bug Fixes

1. Reproduce the bug
2. Identify root cause (use debugger)
3. Create fix with minimal changes
4. Test fix thoroughly
5. Document the fix in commit message

---

**Questions?** Open an issue or discussion in the repository.

**Happy coding!** 🎮

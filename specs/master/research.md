# Research & Technical Decisions: Tarkov Quest Tracker

**Branch**: `master` | **Date**: 2025-11-15  
**Purpose**: Document technical research and architectural decisions

## Phase 0: Research & Architecture Decisions

### Decision 1: No Build Process / Vanilla JavaScript

**Decision**: Use vanilla JavaScript ES6 modules without build tools (Webpack, Vite, etc.)

**Rationale**:
- **Simplicity**: No build configuration, dependencies, or toolchain complexity
- **Fast Development**: Edit and refresh workflow, no compilation wait
- **Deployment**: Static files can be hosted anywhere (GitHub Pages, Netlify, Vercel)
- **Transparency**: No transpilation, easy debugging in browser DevTools
- **Performance**: Modern browsers natively support ES6 modules efficiently

**Alternatives Considered**:
1. **Webpack + Babel**: Rejected - unnecessary complexity for this scale
2. **Vite**: Rejected - overkill for simple SPA without frameworks
3. **TypeScript**: Rejected - JSDoc can provide type hints without compilation

**Constraints**: Requires modern browser support (ES6 modules, Fetch API)

---

### Decision 2: Cytoscape.js for Graph Visualization

**Decision**: Use Cytoscape.js with Dagre layout algorithm

**Rationale**:
- **Proven Library**: Mature, well-documented, active maintenance
- **Layout Algorithms**: Built-in support for hierarchical (Dagre), force-directed, circular
- **Performance**: Handles 200+ nodes efficiently with hardware acceleration
- **Interactivity**: Native support for zoom, pan, node selection, edge rendering
- **Styling**: Flexible CSS-like styling system
- **Size**: ~200KB minified, reasonable for the functionality provided

**Alternatives Considered**:
1. **D3.js**: Rejected - more low-level, requires custom graph layout implementation
2. **Vis.js**: Rejected - less flexible styling, heavier bundle
3. **Canvas-based custom**: Rejected - would require implementing all interaction logic
4. **Mermaid**: Rejected - designed for static diagrams, not interactive graphs

**Integration**: CDN for dependencies (cytoscape.js + cytoscape-dagre)

---

### Decision 3: Browser LocalStorage for Persistence

**Decision**: Use LocalStorage for quest progress and API cache

**Rationale**:
- **Zero Infrastructure**: No backend, database, or authentication required
- **Instant Access**: Synchronous API, no network latency
- **Sufficient Capacity**: 5-10MB storage limit sufficient for quest data
- **Privacy**: Data stays on user's device
- **Simple API**: `setItem()`, `getItem()`, `removeItem()`

**Alternatives Considered**:
1. **IndexedDB**: Rejected - overkill for simple key-value storage needs
2. **Cookies**: Rejected - size limitations (4KB), sent with every request
3. **SessionStorage**: Rejected - data lost on browser close
4. **Backend Database**: Rejected - adds complexity, hosting costs, user accounts

**Limitations**: 
- Data not synced across devices
- User can clear browser data
- 5-10MB storage limit (sufficient for this use case)

**Migration Strategy**: Version field in stored data for future schema changes

---

### Decision 4: Tarkov.dev GraphQL API as Data Source

**Decision**: Fetch quest data from https://api.tarkov.dev/graphql

**Rationale**:
- **Community Maintained**: Active project, regularly updated with game patches
- **GraphQL**: Query exactly what we need, no over-fetching
- **Free**: No API key or rate limits for reasonable usage
- **Comprehensive**: All quest data including objectives, rewards, prerequisites
- **CORS Enabled**: Can be called from browser JavaScript
- **Documentation**: Clear schema documentation available

**Alternatives Considered**:
1. **Official Tarkov API**: Rejected - doesn't exist
2. **Tarkov Wiki Scraping**: Rejected - fragile, no structured data
3. **Static JSON File**: Rejected - requires manual updates with game patches
4. **Community Google Sheets**: Rejected - not programmatically accessible

**Caching Strategy**: 24-hour LocalStorage cache to reduce API calls and improve performance

**Error Handling**: 
- 3 retry attempts with exponential backoff
- User-friendly error messages
- Fallback to cached data if available

---

### Decision 5: Component Architecture Pattern

**Decision**: Modular ES6 class-based components with dependency injection

**Pattern**:
```javascript
// Main controller
TarkovQuestApp
  ├── QuestManager (data layer)
  ├── QuestList (UI component)
  ├── QuestGraph (UI component)
  └── QuestOptimizer (business logic)
```

**Rationale**:
- **Separation of Concerns**: Data, business logic, and UI separated
- **Testability**: Components can be tested independently
- **Reusability**: QuestManager can be used by multiple UI components
- **Dependency Injection**: Components receive dependencies in constructor
- **Clear Contracts**: Public APIs documented with JSDoc

**Alternatives Considered**:
1. **React/Vue/Svelte**: Rejected - adds build step and framework weight
2. **Web Components**: Rejected - browser compatibility concerns, overkill
3. **Single File**: Rejected - unmaintainable at this scale
4. **MVC Framework**: Rejected - unnecessary structure for SPA

**Benefits**:
- Easy to understand for contributors
- No framework lock-in
- Components can be enhanced independently

---

### Decision 6: Path Finding Algorithm

**Decision**: Breadth-First Search (BFS) with level filtering

**Algorithm**:
1. Start from target quest
2. Recursively traverse prerequisites
3. Filter by player level requirement
4. Build ordered path (prerequisites first)
5. Remove duplicates

**Rationale**:
- **Correctness**: BFS finds shortest path in unweighted graph
- **Simplicity**: Easy to implement and understand
- **Performance**: O(V + E) complexity acceptable for ~200 quests
- **Level Awareness**: Naturally incorporates player level constraint

**Alternatives Considered**:
1. **Dijkstra's Algorithm**: Rejected - no weighted edges in quest graph
2. **A\***: Rejected - no meaningful heuristic for quest dependencies
3. **Depth-First Search**: Rejected - doesn't guarantee shortest path
4. **Topological Sort**: Rejected - doesn't handle level constraints well

**Enhancement Opportunities**:
- Weight edges by estimated quest completion time
- Consider multiple valid paths
- Optimize for specific goals (maximize XP, minimize time)

---

### Decision 7: No State Management Library

**Decision**: Direct state mutation in QuestManager class

**Rationale**:
- **Simplicity**: Quest completion is the only mutable state
- **Transparency**: Easy to debug with console.log
- **Performance**: No overhead from state management library
- **Sufficient**: LocalStorage sync is straightforward

**Alternatives Considered**:
1. **Redux**: Rejected - massive overkill for one state mutation type
2. **MobX**: Rejected - adds complexity and bundle size
3. **Zustand**: Rejected - not needed for this scale
4. **Event Bus**: Rejected - components already have references

**State Flow**:
```
User Action → Component → QuestManager.markCompleted() → 
  LocalStorage.setItem() → Component.render()
```

---

### Decision 8: CSS Organization

**Decision**: Separate CSS files by concern (main, quest-list, quest-graph)

**Rationale**:
- **Maintainability**: Easy to find styles for specific components
- **Parallel Development**: Multiple developers can work on different files
- **Loading**: All CSS files loaded upfront (no code splitting needed)
- **No Preprocessor**: Plain CSS sufficient with CSS variables

**Alternatives Considered**:
1. **Single CSS File**: Rejected - becomes unwieldy
2. **CSS-in-JS**: Rejected - requires build step or runtime overhead
3. **CSS Modules**: Rejected - requires build configuration
4. **Tailwind CSS**: Rejected - adds build step and bundle size
5. **SCSS/SASS**: Rejected - adds build step

**CSS Variables**: Used for theming and consistency

---

### Decision 9: Static Hosting Strategy

**Decision**: Deploy as static files to any hosting provider

**Rationale**:
- **Cost**: Free tier available on GitHub Pages, Netlify, Vercel
- **Simplicity**: No server configuration or maintenance
- **Performance**: CDN distribution, instant global availability
- **Scalability**: Static files scale infinitely
- **Security**: No server vulnerabilities, minimal attack surface

**Deployment Options**:
1. **GitHub Pages**: Free, integrated with repo
2. **Netlify**: Free tier, automatic deployments, custom domains
3. **Vercel**: Free tier, edge network, preview deployments
4. **CloudFlare Pages**: Free tier, global CDN

**Requirements**: 
- HTTPS enabled
- SPA routing (all routes → index.html)
- Cache headers for static assets

---

### Decision 10: No User Authentication (Current Version)

**Decision**: Single-user application, no authentication system

**Rationale**:
- **Scope**: Keeps v1.0 simple and achievable
- **Privacy**: No user data collection
- **Deployment**: No backend infrastructure needed
- **Development Time**: Significant time savings

**Limitations**:
- Progress not synced across devices
- No shared quest lists
- No collaboration features

**Future Migration Path**: 
- Phase 2: Add Supabase authentication + PostgreSQL
- Migrate LocalStorage data to cloud on first login
- See CLOUD_DEPLOYMENT_SPEC.md for details

---

## Technology Stack Summary

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Language** | JavaScript | ES6+ | Browser native, no compilation |
| **Modules** | ES6 Modules | Native | Browser support, no bundler |
| **Graph Library** | Cytoscape.js | 3.28.1+ | Mature, performant, flexible |
| **Layout** | Cytoscape-Dagre | 2.5.0+ | Hierarchical graph layout |
| **Storage** | LocalStorage | Native | Simple, sufficient capacity |
| **API Client** | Fetch API | Native | Modern, Promise-based |
| **Data Source** | Tarkov.dev GraphQL | v1 | Community maintained, free |
| **Styling** | Plain CSS | CSS3 | No preprocessor needed |
| **Dev Server** | http-server | 14.1.1+ | Simple, zero config |
| **Hosting** | Static Files | - | Free, scalable, simple |

---

## Best Practices Applied

### 1. Progressive Enhancement
- Core functionality works without JavaScript (HTML structure valid)
- Graceful degradation for older browsers
- Clear error messages when features unavailable

### 2. Performance Optimization
- 24-hour API cache reduces network calls
- LocalStorage for instant data access
- Debounced search input (300ms)
- Lazy graph rendering (only when tab active)

### 3. Error Handling
- Try-catch blocks around API calls
- Retry logic with exponential backoff
- User-friendly error messages
- Console logging for debugging

### 4. Code Organization
- ES6 modules for separation of concerns
- JSDoc comments for function documentation
- Consistent naming conventions
- Clear file structure

### 5. Security
- No eval() or innerHTML with user data
- HTTPS for API calls
- Input validation on search terms
- XSS prevention (textContent over innerHTML)

---

## Open Questions & Future Research

### Potential Enhancements
1. **Testing**: Evaluate Jest or Vitest for unit testing
2. **TypeScript**: Would provide better IDE support and error catching
3. **Build Step**: If features grow, reconsider Vite for bundling
4. **PWA**: Service Worker for true offline capability
5. **Virtual Scrolling**: For performance with large quest lists
6. **Analytics**: Privacy-friendly analytics (Plausible, Fathom)

### Technical Debt
1. **No Automated Tests**: Currently manual testing only
2. **No CI/CD**: Manual deployment process
3. **No Linting**: Could add ESLint for code quality
4. **No Type Checking**: Could add TypeScript or JSDoc + tsc
5. **Graph Performance**: May need optimization for >300 quests

---

## References

- **Cytoscape.js Docs**: https://js.cytoscape.org/
- **Tarkov.dev API**: https://tarkov.dev/api/
- **ES6 Modules**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- **LocalStorage API**: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- **Graph Algorithms**: Introduction to Algorithms (CLRS), Chapter 22

---

**Next Steps**: Proceed to Phase 1 - Data Model and Contracts

# Tarkov Quest Tracker - Technical Specification
*Version 1.0 | Last Updated: November 15, 2025*

## Document Purpose
This document provides detailed technical specifications for the Tarkov Quest Tracker application, including API contracts, data structures, component interfaces, and implementation details.

---

## 1. System Overview

### 1.1 Application Type
- **Type:** Single Page Application (SPA)
- **Architecture:** Client-side JavaScript with ES6 modules
- **Deployment:** Static hosting (current) / Vercel + Supabase (future)
- **State Management:** LocalStorage for progress tracking

### 1.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend | Vanilla JavaScript | ES6+ | Application logic |
| Visualization | Cytoscape.js | 3.28.1+ | Graph rendering |
| Layout | Cytoscape Dagre | 2.5.0+ | Graph layout algorithms |
| Data Source | Tarkov.dev GraphQL API | v1 | Quest data |
| Dev Server | http-server | 14.1.1+ | Local development |
| Runtime | Modern Browser | - | Chrome 90+, Firefox 88+, Safari 14+ |

### 1.3 Browser Requirements
- **Minimum:** ES6 module support, Fetch API, LocalStorage
- **Recommended:** Chrome 90+, Firefox 88+, Edge 90+, Safari 14+
- **Features Required:**
  - ES6 Modules (`<script type="module">`)
  - Fetch API
  - Promise support
  - LocalStorage API
  - CSS Grid and Flexbox

---

## 2. Data Architecture

### 2.1 External API Integration

#### 2.1.1 Tarkov.dev GraphQL API

**Endpoint:** `https://api.tarkov.dev/graphql`

**GraphQL Query:**
```graphql
query {
  tasks {
    id
    name
    trader {
      name
    }
    minPlayerLevel
    experience
    taskRequirements {
      task {
        id
      }
    }
    objectives {
      type
      description
      optional
      maps {
        name
      }
    }
    startRewards {
      traderStanding {
        trader {
          name
        }
        standing
      }
      items {
        item {
          name
          iconLink
        }
        count
      }
    }
    finishRewards {
      traderStanding {
        trader {
          name
        }
        standing
      }
      items {
        item {
          name
          iconLink
        }
        count
      }
      offerUnlock {
        item {
          name
        }
        trader {
          name
        }
      }
    }
    kappaRequired
    lightkeeperRequired
  }
}
```

**Response Structure:**
```typescript
interface APIResponse {
  data: {
    tasks: Task[]
  }
}

interface Task {
  id: string
  name: string
  trader: {
    name: string
  }
  minPlayerLevel: number
  experience: number
  taskRequirements: Array<{
    task: {
      id: string
    }
  }>
  objectives: Objective[]
  startRewards: Rewards
  finishRewards: Rewards
  kappaRequired: boolean
  lightkeeperRequired: boolean
}
```

#### 2.1.2 Rate Limiting & Caching

**Cache Strategy:**
- **Duration:** 24 hours
- **Storage:** LocalStorage
- **Key:** `tarkov_quest_cache`
- **Invalidation:** Automatic expiry or manual clear

**Cache Entry Structure:**
```typescript
interface CacheEntry {
  timestamp: number
  data: Task[]
  version: string
}
```

**Retry Logic:**
- **Max Retries:** 3
- **Backoff:** Exponential (1s, 2s, 4s)
- **Timeout:** 10 seconds per request

### 2.2 Internal Data Models

#### 2.2.1 Quest Model

**File:** `src/models/quest.js`

```typescript
interface Quest {
  // Identity
  id: string
  name: string
  
  // Classification
  trader: string
  minLevel: number
  
  // Requirements
  prerequisites: string[]  // Array of quest IDs
  
  // Objectives
  objectives: QuestObjective[]
  
  // Rewards
  experience: number
  rewards: {
    start: RewardSet
    finish: RewardSet
  }
  
  // Special flags
  kappaRequired: boolean
  lightkeeperRequired: boolean
  isLightkeeperPath: boolean  // Computed
  
  // UI state (transient)
  status?: 'completed' | 'available' | 'locked'
  visible?: boolean
}

interface QuestObjective {
  type: string  // e.g., "find", "kill", "mark", "collect"
  description: string
  optional: boolean
  maps?: string[]
}

interface RewardSet {
  items: RewardItem[]
  traderStanding: TraderStanding[]
  offerUnlock?: OfferUnlock[]
}

interface RewardItem {
  name: string
  count: number
  iconLink?: string
}

interface TraderStanding {
  trader: string
  standing: number
}

interface OfferUnlock {
  item: string
  trader: string
}
```

#### 2.2.2 Quest Manager

**File:** `src/models/quest.js`

**Responsibilities:**
- Quest data storage and retrieval
- Progress tracking (LocalStorage sync)
- Status computation (completed/available/locked)
- Dependency resolution
- Path finding algorithms

**Public API:**
```typescript
class QuestManager {
  // Data management
  setQuests(quests: Quest[]): void
  getQuest(id: string): Quest | undefined
  getQuests(): Quest[]
  
  // Filtering
  getQuestsByTrader(trader: string): Quest[]
  getAvailableQuests(playerLevel: number): Quest[]
  
  // Progress tracking
  markCompleted(questId: string): void
  markIncomplete(questId: string): void
  isCompleted(questId: string): boolean
  getCompletedQuests(): string[]
  
  // Status computation
  updateQuestStatuses(playerLevel: number): void
  canUnlockQuest(questId: string): boolean
  
  // Dependency resolution
  getPrerequisites(questId: string): Quest[]
  getDependents(questId: string): Quest[]
  
  // Path finding
  findOptimalPath(targetId: string, playerLevel: number): Quest[]
  calculateQuestDepth(): Map<string, number>
  
  // Statistics
  getStats(): QuestStats
}

interface QuestStats {
  total: number
  completed: number
  available: number
  locked: number
  byTrader: Map<string, number>
}
```

#### 2.2.3 Progress Persistence

**LocalStorage Key:** `tarkov_quest_progress`

**Data Structure:**
```typescript
interface ProgressData {
  version: string  // "1.0"
  timestamp: number
  completed: string[]  // Array of completed quest IDs
}
```

**Serialization:**
```javascript
// Save
localStorage.setItem('tarkov_quest_progress', JSON.stringify({
  version: '1.0',
  timestamp: Date.now(),
  completed: this.completed
}));

// Load
const data = JSON.parse(localStorage.getItem('tarkov_quest_progress'));
this.completed = new Set(data.completed || []);
```

---

## 3. Component Architecture

### 3.1 Component Hierarchy

```
TarkovQuestApp (index.js)
├── QuestList (quest-list.js)
│   ├── TraderSection
│   ├── QuestCard
│   └── QuestDetailsModal
├── QuestGraph (quest-graph.js)
│   └── Cytoscape Instance
└── QuestOptimizer (quest-optimizer.js)
    ├── TargetSelector
    └── PathDisplay
```

### 3.2 Component Specifications

#### 3.2.1 TarkovQuestApp (Main Controller)

**File:** `src/index.js`

**Responsibilities:**
- Application initialization
- Component orchestration
- Tab switching
- Global event handling
- Error handling and user feedback

**Public API:**
```typescript
class TarkovQuestApp {
  constructor()
  
  // Lifecycle
  async init(): Promise<void>
  
  // UI Management
  switchTab(tabName: string): void
  updateStats(): void
  showError(message: string): void
  
  // Filters
  updateTraderFilters(): void
  updateGraphFilters(): void
  
  // Event Handlers
  setupEventListeners(): void
  handleQuestComplete(questId: string): void
  handleQuestIncomplete(questId: string): void
  
  // Quick actions
  findPathToLightkeeper(): void
  findPathToSetup(): void
  findPathToTestDrive(): void
}
```

**Initialization Sequence:**
1. Fetch quest data (cache or API)
2. Initialize QuestManager
3. Create component instances
4. Render initial views
5. Set up event listeners
6. Update statistics
7. Load user preferences

#### 3.2.2 QuestList Component

**File:** `src/components/quest-list.js`

**Responsibilities:**
- Display quests organized by trader
- Apply filters (trader, level, search, status)
- Render quest cards and details modal
- Handle quest completion toggling

**Public API:**
```typescript
class QuestList {
  constructor(containerId: string, questManager: QuestManager)
  
  // Rendering
  render(): void
  renderTraderSection(trader: string, quests: Quest[]): HTMLElement
  renderQuestCard(quest: Quest): HTMLElement
  
  // Filtering
  updateFilters(filters: QuestFilters): void
  applyFilters(): Quest[]
  
  // UI interactions
  showQuestDetails(questId: string): void
  hideQuestDetails(): void
  toggleQuestComplete(questId: string): void
  
  // Utilities
  getQuestStatusClass(quest: Quest): string
  formatObjectives(objectives: QuestObjective[]): string
}

interface QuestFilters {
  traders?: Set<string>
  minLevel?: number
  maxLevel?: number
  searchTerm?: string
  showCompleted?: boolean
  showLocked?: boolean
}
```

**Quest Card Structure:**
```html
<div class="quest-card [status-class] [trader-class]">
  <div class="quest-header">
    <h3 class="quest-name">[Quest Name]</h3>
    <div class="quest-badges">
      <span class="badge kappa-badge">Κ</span>
      <span class="badge lightkeeper-badge">🔦</span>
    </div>
  </div>
  <div class="quest-meta">
    <span class="quest-trader">[Trader]</span>
    <span class="quest-level">Lvl [X]</span>
    <span class="quest-xp">[Y] XP</span>
  </div>
  <div class="quest-objectives">
    [Objective summary]
  </div>
  <div class="quest-actions">
    <button class="btn-complete">Complete</button>
    <button class="btn-details">Details</button>
    <button class="btn-wiki">Wiki</button>
  </div>
</div>
```

#### 3.2.3 QuestGraph Component

**File:** `src/components/quest-graph.js`

**Responsibilities:**
- Render interactive dependency graph
- Apply graph layouts (Dagre, Breadth First, Circle)
- Handle node interactions
- Highlight quest paths
- Manage zoom and pan controls

**Public API:**
```typescript
class QuestGraph {
  constructor(containerId: string, questManager: QuestManager)
  
  // Graph management
  buildGraph(quests: Quest[]): void
  updateGraph(): void
  clearGraph(): void
  
  // Layout
  setLayout(layoutName: string): void
  applyLayout(): void
  
  // Interaction
  onNodeClick: (questId: string) => void
  highlightPath(questIds: string[]): void
  clearHighlight(): void
  
  // Controls
  fitToView(): void
  centerOn(questId: string): void
  resetZoom(): void
  
  // Styling
  getNodeStyle(quest: Quest): CytoscapeNodeStyle
  getEdgeStyle(): CytoscapeEdgeStyle
}
```

**Cytoscape Configuration:**
```typescript
interface CytoscapeOptions {
  container: HTMLElement
  
  style: [
    // Nodes
    {
      selector: 'node'
      style: {
        'label': 'data(label)'
        'background-color': 'data(color)'
        'width': 'data(width)'
        'height': 'data(height)'
        'border-width': 2
        'border-color': 'data(borderColor)'
      }
    },
    // Edges
    {
      selector: 'edge'
      style: {
        'width': 2
        'line-color': '#666'
        'target-arrow-color': '#666'
        'target-arrow-shape': 'triangle'
        'curve-style': 'bezier'
      }
    },
    // Highlighted path
    {
      selector: '.highlighted'
      style: {
        'line-color': '#ff6b6b'
        'target-arrow-color': '#ff6b6b'
        'width': 4
      }
    }
  ]
  
  layout: {
    name: 'dagre'
    rankDir: 'TB'
    nodeSep: 50
    rankSep: 100
  }
}
```

**Node Data Structure:**
```typescript
interface GraphNode {
  data: {
    id: string
    label: string
    quest: Quest
    color: string
    borderColor: string
    width: number
    height: number
  }
}

interface GraphEdge {
  data: {
    id: string
    source: string  // prerequisite quest ID
    target: string  // dependent quest ID
  }
}
```

**Color Scheme:**
```typescript
const TRADER_COLORS = {
  'Prapor': '#E74C3C',
  'Therapist': '#3498DB',
  'Skier': '#9B59B6',
  'Peacekeeper': '#1ABC9C',
  'Mechanic': '#F39C12',
  'Ragman': '#95A5A6',
  'Jaeger': '#27AE60',
  'Fence': '#34495E',
  'Lightkeeper': '#F1C40F'
}

const STATUS_OPACITY = {
  'completed': 0.5,
  'available': 1.0,
  'locked': 0.3
}
```

#### 3.2.4 QuestOptimizer Component

**File:** `src/components/quest-optimizer.js`

**Responsibilities:**
- Target quest selection
- Path calculation
- Step-by-step path display
- Integration with graph highlighting

**Public API:**
```typescript
class QuestOptimizer {
  constructor(questManager: QuestManager)
  
  // Path finding
  findPath(targetId: string, playerLevel: number): Quest[]
  calculateOptimalPath(targetId: string, playerLevel: number): Quest[]
  
  // Display
  displayPath(path: Quest[]): void
  clearPath(): void
  
  // Integration
  highlightInGraph(path: Quest[]): void
}
```

**Path Finding Algorithm:**
```typescript
/**
 * Breadth-First Search with level filtering
 * 
 * 1. Start from target quest
 * 2. Traverse prerequisites recursively
 * 3. Filter by player level
 * 4. Build ordered path (prerequisites first)
 * 5. Remove duplicates
 * 6. Sort by dependency depth
 */
function calculateOptimalPath(
  targetId: string, 
  playerLevel: number
): Quest[] {
  const visited = new Set<string>();
  const path: Quest[] = [];
  const queue: string[] = [targetId];
  
  while (queue.length > 0) {
    const questId = queue.shift();
    if (visited.has(questId)) continue;
    
    const quest = this.questManager.getQuest(questId);
    if (!quest || quest.minLevel > playerLevel) continue;
    
    visited.add(questId);
    path.push(quest);
    
    // Add prerequisites to queue
    quest.prerequisites.forEach(prereqId => {
      if (!visited.has(prereqId)) {
        queue.push(prereqId);
      }
    });
  }
  
  // Reverse to get dependency order
  return path.reverse();
}
```

---

## 4. User Interface Specifications

### 4.1 Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ Header (App Title + Stats)                         │
├───────────┬─────────────────────────────────────────┤
│           │ Tab Navigation (List | Graph)           │
│           ├─────────────────────────────────────────┤
│ Sidebar   │                                         │
│           │                                         │
│ - Filters │         Main Content Area               │
│ - Quick   │      (Quest List or Graph View)         │
│   Paths   │                                         │
│ - Path    │                                         │
│   Finder  │                                         │
│           │                                         │
└───────────┴─────────────────────────────────────────┘
```

### 4.2 Responsive Breakpoints

```css
/* Desktop */
@media (min-width: 1024px) {
  .sidebar { width: 280px; }
  .main-content { margin-left: 280px; }
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  .sidebar { width: 220px; }
  .main-content { margin-left: 220px; }
}

/* Mobile */
@media (max-width: 767px) {
  .sidebar { width: 100%; position: relative; }
  .main-content { margin-left: 0; }
}
```

### 4.3 Color Palette

```css
:root {
  /* Primary colors */
  --primary-bg: #1a1a1a;
  --secondary-bg: #2a2a2a;
  --tertiary-bg: #3a3a3a;
  
  /* Text colors */
  --text-primary: #ffffff;
  --text-secondary: #cccccc;
  --text-muted: #888888;
  
  /* Status colors */
  --status-completed: #27ae60;
  --status-available: #3498db;
  --status-locked: #666666;
  
  /* Accent colors */
  --accent-kappa: #f1c40f;
  --accent-lightkeeper: #e67e22;
  --accent-danger: #e74c3c;
  
  /* UI elements */
  --border-color: #444444;
  --hover-bg: #353535;
  --focus-outline: #3498db;
}
```

### 4.4 Typography

```css
/* Font Stack */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
               'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell',
               'Helvetica Neue', Arial, sans-serif;
}

/* Type Scale */
h1 { font-size: 2.5rem; }    /* 40px */
h2 { font-size: 2rem; }      /* 32px */
h3 { font-size: 1.5rem; }    /* 24px */
h4 { font-size: 1.25rem; }   /* 20px */
body { font-size: 1rem; }    /* 16px */
small { font-size: 0.875rem; } /* 14px */
```

### 4.5 Component States

**Quest Card States:**
```css
.quest-card {
  /* Base state */
  opacity: 1;
  border: 2px solid var(--border-color);
}

.quest-card.completed {
  opacity: 0.6;
  border-color: var(--status-completed);
  background: rgba(39, 174, 96, 0.1);
}

.quest-card.available {
  border-color: var(--status-available);
  background: rgba(52, 152, 219, 0.05);
}

.quest-card.locked {
  opacity: 0.4;
  border-color: var(--border-color);
  cursor: not-allowed;
}

.quest-card:hover:not(.locked) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
```

---

## 5. API Client Implementation

### 5.1 TarkovAPI Module

**File:** `src/api/tarkov-api.js`

```typescript
// Configuration
const API_ENDPOINT = 'https://api.tarkov.dev/graphql'
const CACHE_KEY = 'tarkov_quest_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000  // 24 hours
const REQUEST_TIMEOUT = 10000  // 10 seconds

// Public API
export async function fetchQuests(): Promise<Quest[]>
export const questCache: CacheManager

// Cache Manager
interface CacheManager {
  get(): Quest[] | null
  set(data: Quest[]): void
  clear(): void
  isExpired(): boolean
}

// Implementation details
async function fetchQuests(): Promise<Quest[]> {
  const response = await fetchWithRetry(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GRAPHQL_QUERY })
  })
  
  const json = await response.json()
  return transformApiData(json.data.tasks)
}

async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries = 3
): Promise<Response> {
  let lastError: Error
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      lastError = error
      if (i < maxRetries - 1) {
        await sleep(Math.pow(2, i) * 1000)  // Exponential backoff
      }
    }
  }
  
  throw lastError
}

function transformApiData(tasks: APITask[]): Quest[] {
  return tasks.map(task => ({
    id: task.id,
    name: task.name,
    trader: task.trader.name,
    minLevel: task.minPlayerLevel,
    prerequisites: task.taskRequirements.map(req => req.task.id),
    objectives: task.objectives,
    experience: task.experience,
    rewards: {
      start: transformRewards(task.startRewards),
      finish: transformRewards(task.finishRewards)
    },
    kappaRequired: task.kappaRequired,
    lightkeeperRequired: task.lightkeeperRequired,
    isLightkeeperPath: false  // Computed later
  }))
}
```

### 5.2 Error Handling

**Error Types:**
```typescript
class APIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'APIError'
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

class CacheError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CacheError'
  }
}
```

**Error Handling Strategy:**
1. **Network Errors:** Retry with exponential backoff
2. **API Errors:** Log and show user-friendly message
3. **Cache Errors:** Fall back to API fetch
4. **Timeout:** Abort request and retry

---

## 6. Performance Specifications

### 6.1 Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Initial Load Time | < 2s | < 5s |
| Quest List Render | < 500ms | < 1s |
| Graph Render | < 2s | < 5s |
| Filter Response | < 100ms | < 300ms |
| Search Response | < 50ms | < 200ms |
| Quest Toggle | < 50ms | < 100ms |

### 6.2 Optimization Strategies

**1. Data Caching:**
- Cache API responses for 24 hours
- Lazy load graph visualization
- Debounce search input (300ms)

**2. Rendering Optimization:**
- Virtual scrolling for quest list (future)
- Only render visible trader sections
- Debounce window resize events

**3. Graph Performance:**
- Limit visible nodes (use filtering)
- Optimize layout calculations
- Use hardware acceleration for transforms

**4. Bundle Size:**
- Total JS: < 200KB (gzipped)
- CSS: < 30KB (gzipped)
- No images (use Unicode/SVG)

### 6.3 Monitoring

**Key Metrics to Track:**
```javascript
// Performance marks
performance.mark('api-fetch-start')
performance.mark('api-fetch-end')
performance.measure('api-fetch', 'api-fetch-start', 'api-fetch-end')

// Resource timing
const resources = performance.getEntriesByType('resource')
const apiCalls = resources.filter(r => r.name.includes('tarkov.dev'))

// User timing
console.log({
  apiDuration: performance.getEntriesByName('api-fetch')[0].duration,
  renderDuration: performance.getEntriesByName('render')[0].duration,
  totalQuests: questManager.quests.length,
  completedQuests: questManager.getCompletedQuests().length
})
```

---

## 7. Testing Specifications

### 7.1 Test Coverage Requirements

| Component | Unit Tests | Integration Tests | E2E Tests |
|-----------|-----------|-------------------|-----------|
| QuestManager | ✅ Required | ✅ Required | ⚠️ Optional |
| TarkovAPI | ✅ Required | ✅ Required | ✅ Required |
| QuestList | ✅ Required | ⚠️ Optional | ✅ Required |
| QuestGraph | ⚠️ Optional | ⚠️ Optional | ✅ Required |
| QuestOptimizer | ✅ Required | ✅ Required | ⚠️ Optional |

### 7.2 Test Scenarios

**Unit Tests:**
```javascript
describe('QuestManager', () => {
  test('marks quest as completed', () => {
    const manager = new QuestManager()
    manager.setQuests(mockQuests)
    manager.markCompleted('quest-1')
    expect(manager.isCompleted('quest-1')).toBe(true)
  })
  
  test('calculates available quests based on level', () => {
    const available = manager.getAvailableQuests(15)
    expect(available.every(q => q.minLevel <= 15)).toBe(true)
  })
  
  test('resolves quest prerequisites correctly', () => {
    const prereqs = manager.getPrerequisites('quest-lightkeeper')
    expect(prereqs).toContainQuest('quest-samples')
  })
})
```

**Integration Tests:**
```javascript
describe('API Integration', () => {
  test('fetches and caches quest data', async () => {
    questCache.clear()
    const quests = await fetchQuests()
    expect(quests.length).toBeGreaterThan(0)
    expect(questCache.get()).toEqual(quests)
  })
  
  test('uses cached data when available', async () => {
    const spy = jest.spyOn(global, 'fetch')
    await fetchQuests()  // Should use cache
    expect(spy).not.toHaveBeenCalled()
  })
})
```

**E2E Tests:**
```javascript
describe('User Workflows', () => {
  test('complete quest workflow', async () => {
    // 1. Load application
    await page.goto('http://localhost:8080')
    await page.waitForSelector('.quest-card')
    
    // 2. Filter by trader
    await page.click('[data-trader="Prapor"]')
    const cards = await page.$$('.quest-card.prapor')
    expect(cards.length).toBeGreaterThan(0)
    
    // 3. Complete a quest
    await cards[0].click('.btn-complete')
    expect(await cards[0].getAttribute('class')).toContain('completed')
    
    // 4. Verify persistence
    await page.reload()
    const completed = await page.$('.quest-card.completed')
    expect(completed).toBeTruthy()
  })
  
  test('path finder workflow', async () => {
    // 1. Select target quest
    await page.selectOption('#target-quest', 'lightkeeper-quest')
    
    // 2. Set player level
    await page.fill('#player-level', '30')
    
    // 3. Find path
    await page.click('#find-path-btn')
    
    // 4. Verify path display
    const pathSteps = await page.$$('.path-step')
    expect(pathSteps.length).toBeGreaterThan(0)
    
    // 5. Verify graph highlight
    const highlighted = await page.$$('.cy-node.highlighted')
    expect(highlighted.length).toEqual(pathSteps.length)
  })
})
```

### 7.3 Manual Testing Checklist

**Functionality:**
- [ ] All quests load from API
- [ ] Cache persists between sessions
- [ ] Quest completion toggles correctly
- [ ] Filters work independently and combined
- [ ] Search finds quests by name and objectives
- [ ] Graph displays all quest relationships
- [ ] Graph layouts render correctly
- [ ] Path finder calculates accurate paths
- [ ] Quick path buttons work for all targets

**UI/UX:**
- [ ] Responsive layout on mobile/tablet/desktop
- [ ] Smooth animations and transitions
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly
- [ ] Quest details modal displays all information
- [ ] Graph is pannable and zoomable
- [ ] Keyboard navigation works

**Performance:**
- [ ] Initial load < 5 seconds
- [ ] Filter response < 300ms
- [ ] Search response < 200ms
- [ ] Graph renders in < 5 seconds
- [ ] No memory leaks on long sessions

**Cross-browser:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## 8. Security Specifications

### 8.1 Security Considerations

**Client-Side Security:**
1. **XSS Prevention:**
   - Sanitize all user input
   - Use `textContent` instead of `innerHTML` for user data
   - Validate quest data structure from API

2. **Data Validation:**
   - Validate API responses against expected schema
   - Check quest ID format before localStorage operations
   - Sanitize search terms

3. **LocalStorage:**
   - Only store non-sensitive data (quest progress)
   - No authentication tokens or personal information
   - Implement data version migration strategy

**API Security:**
1. **CORS:** API must have proper CORS headers
2. **Rate Limiting:** Respect API rate limits
3. **HTTPS Only:** Enforce HTTPS for API calls

### 8.2 Input Validation

```typescript
// Quest ID validation
function isValidQuestId(id: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(id) && id.length < 100
}

// Search term sanitization
function sanitizeSearchTerm(term: string): string {
  return term.trim().slice(0, 100)
}

// Level validation
function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= 79
}

// API response validation
function validateQuestData(data: unknown): data is Quest[] {
  if (!Array.isArray(data)) return false
  return data.every(quest =>
    typeof quest.id === 'string' &&
    typeof quest.name === 'string' &&
    typeof quest.minLevel === 'number' &&
    Array.isArray(quest.prerequisites)
  )
}
```

---

## 9. Deployment Specifications

### 9.1 Static Hosting (Current)

**Requirements:**
- Static file hosting (GitHub Pages, Netlify, Vercel)
- HTTPS enabled
- Custom domain (optional)

**Deployment Steps:**
1. Run `npm run build` (if build step added)
2. Upload files to hosting provider
3. Configure redirects (all routes → index.html)
4. Set cache headers for static assets

**Environment Variables:**
None required for static hosting.

### 9.2 Vercel + Supabase (Future)

**See:** `CLOUD_DEPLOYMENT_SPEC.md`

**Requirements:**
- Vercel account
- Supabase account
- Environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

---

## 10. Maintenance & Support

### 10.1 Update Schedule

**API Updates:**
- Monitor tarkov.dev API for changes
- Update GraphQL query if schema changes
- Cache version bump for breaking changes

**Quest Data:**
- Automatic updates via API (24-hour cache)
- Manual cache clear option for users
- Version migration for progress data

### 10.2 Browser Support Policy

**Supported:**
- Last 2 versions of Chrome, Firefox, Safari, Edge
- iOS Safari 14+
- Android Chrome 90+

**Unsupported:**
- Internet Explorer (all versions)
- Opera Mini
- UC Browser

### 10.3 Deprecation Strategy

**Breaking Changes:**
1. Announce change in release notes
2. Provide migration guide
3. Support old version for 30 days
4. Update version number (major bump)

---

## 11. Future Enhancements

### 11.1 Planned Features

**Phase 2: Enhanced UI**
- [ ] Dark/light theme toggle
- [ ] Customizable color schemes
- [ ] Quest card view options (compact/detailed)
- [ ] Advanced filtering (by objective type, rewards)
- [ ] Quest comparison tool

**Phase 3: Advanced Features**
- [ ] Multiple character profiles
- [ ] Quest timer estimates
- [ ] Reward calculator
- [ ] Map integration
- [ ] Hideout integration

**Phase 4: Social Features**
- [ ] Share quest progress
- [ ] Community quest guides
- [ ] Group quest planning
- [ ] Leaderboards

### 11.2 Technical Debt

**Known Issues:**
- Graph performance with >200 nodes
- No virtual scrolling for quest list
- Limited mobile graph interaction
- No offline support (PWA)

**Refactoring Needs:**
- Extract graph configuration
- Add TypeScript definitions
- Implement proper state management
- Add comprehensive test suite

---

## 12. Appendix

### 12.1 Glossary

| Term | Definition |
|------|------------|
| **Quest** | A task/mission in Escape from Tarkov |
| **Trader** | NPC that provides quests |
| **Prerequisite** | Quest that must be completed before another |
| **Kappa** | Kappa Secured Container, requires completing specific quests |
| **Lightkeeper** | Special trader unlocked via quest chain |
| **Dependency Graph** | Visual representation of quest prerequisites |
| **Path Finding** | Algorithm to find optimal quest completion order |

### 12.2 External Resources

- **Tarkov Wiki:** https://escapefromtarkov.fandom.com/wiki
- **Tarkov.dev API Docs:** https://tarkov.dev/api/
- **Cytoscape.js Docs:** https://js.cytoscape.org/
- **Escape from Tarkov:** https://www.escapefromtarkov.com/

### 12.3 Contact & Support

**Issues:** GitHub Issues (repository)  
**Discussions:** GitHub Discussions (repository)  
**API Issues:** Tarkov.dev Discord

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-15 | System | Initial technical specification |

---

*This document is maintained as part of the Tarkov Quest Tracker project and should be updated whenever significant technical changes are made to the application.*

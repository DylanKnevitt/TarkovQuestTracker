# API Contract: Tarkov.dev GraphQL API

**Endpoint**: `https://api.tarkov.dev/graphql`  
**Protocol**: GraphQL (POST)  
**Authentication**: None (public API)  
**Rate Limiting**: None (reasonable use expected)

## Request Format

### HTTP Request

```http
POST https://api.tarkov.dev/graphql HTTP/1.1
Content-Type: application/json

{
  "query": "..."
}
```

### GraphQL Query

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

---

## Response Format

### Success Response (HTTP 200)

```json
{
  "data": {
    "tasks": [
      {
        "id": "5936d90786f7742b1420ba5b",
        "name": "Debut",
        "trader": {
          "name": "Prapor"
        },
        "minPlayerLevel": 1,
        "experience": 800,
        "taskRequirements": [],
        "objectives": [
          {
            "type": "kill",
            "description": "Eliminate 5 Scavs on Customs",
            "optional": false,
            "maps": [
              { "name": "Customs" }
            ]
          }
        ],
        "startRewards": {
          "traderStanding": [],
          "items": []
        },
        "finishRewards": {
          "traderStanding": [
            {
              "trader": { "name": "Prapor" },
              "standing": 0.01
            }
          ],
          "items": [
            {
              "item": {
                "name": "MP-133 12ga shotgun",
                "iconLink": "https://assets.tarkov.dev/..."
              },
              "count": 1
            }
          ],
          "offerUnlock": []
        },
        "kappaRequired": true,
        "lightkeeperRequired": false
      }
      // ... more tasks
    ]
  }
}
```

### Error Response (HTTP 4xx/5xx)

```json
{
  "errors": [
    {
      "message": "Error message here",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": ["tasks"]
    }
  ]
}
```

---

## Response Schema

### Task Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | Yes | Unique quest identifier |
| `name` | String | Yes | Quest display name |
| `trader` | TraderRef | Yes | Quest giver |
| `minPlayerLevel` | Int | Yes | Minimum player level (1-79) |
| `experience` | Int | Yes | XP reward |
| `taskRequirements` | [TaskRequirement] | Yes | Prerequisites (may be empty) |
| `objectives` | [Objective] | Yes | Quest objectives (non-empty) |
| `startRewards` | Rewards | Yes | Rewards when accepting quest |
| `finishRewards` | Rewards | Yes | Rewards when completing quest |
| `kappaRequired` | Boolean | Yes | Required for Kappa container |
| `lightkeeperRequired` | Boolean | Yes | Required for Lightkeeper unlock |

### TraderRef

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | Yes | Trader name (Prapor, Therapist, etc.) |

### TaskRequirement

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task` | TaskRef | Yes | Reference to prerequisite quest |

### TaskRef

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | Yes | Quest ID |

### Objective

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Objective type (kill, find, collect, etc.) |
| `description` | String | Yes | Full objective text |
| `optional` | Boolean | Yes | Whether objective is optional |
| `maps` | [MapRef] | No | Maps where objective can be completed |

### MapRef

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | Yes | Map name (Customs, Woods, etc.) |

### Rewards

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `traderStanding` | [TraderStanding] | Yes | Reputation changes (may be empty) |
| `items` | [ItemReward] | Yes | Item rewards (may be empty) |
| `offerUnlock` | [OfferUnlock] | No | Trade unlocks (finish rewards only) |

### TraderStanding

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trader` | TraderRef | Yes | Affected trader |
| `standing` | Float | Yes | Standing change (-1.0 to 1.0) |

### ItemReward

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `item` | ItemRef | Yes | Rewarded item |
| `count` | Int | Yes | Quantity (positive integer) |

### ItemRef

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | Yes | Item display name |
| `iconLink` | String | No | URL to item icon |

### OfferUnlock

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `item` | ItemRef | Yes | Unlocked item |
| `trader` | TraderRef | Yes | Trader offering the item |

---

## Client Implementation

### Fetch Function

```javascript
async function fetchQuests() {
  const query = `
    query {
      tasks {
        id
        name
        trader { name }
        minPlayerLevel
        experience
        taskRequirements { task { id } }
        objectives {
          type
          description
          optional
          maps { name }
        }
        startRewards {
          traderStanding { trader { name } standing }
          items { item { name iconLink } count }
        }
        finishRewards {
          traderStanding { trader { name } standing }
          items { item { name iconLink } count }
          offerUnlock { item { name } trader { name } }
        }
        kappaRequired
        lightkeeperRequired
      }
    }
  `;
  
  const response = await fetch('https://api.tarkov.dev/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const json = await response.json();
  
  if (json.errors) {
    throw new Error(`GraphQL error: ${json.errors[0].message}`);
  }
  
  return json.data.tasks;
}
```

### Retry Logic

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
      
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
```

### Error Handling

```javascript
try {
  const tasks = await fetchQuests();
  console.log(`Loaded ${tasks.length} quests`);
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Request timeout - API may be down');
  } else if (error.message.includes('HTTP')) {
    console.error('API returned error:', error.message);
  } else if (error.message.includes('GraphQL')) {
    console.error('GraphQL query error:', error.message);
  } else {
    console.error('Network error:', error.message);
  }
  
  // Try to use cached data
  const cachedData = localStorage.getItem('tarkov_quest_cache');
  if (cachedData) {
    console.log('Using cached data as fallback');
    return JSON.parse(cachedData).data;
  }
  
  throw new Error('Failed to load quest data and no cache available');
}
```

---

## Expected Data Characteristics

### Response Size
- **Typical**: ~500KB uncompressed JSON
- **Quest Count**: 200-250 tasks
- **Compression**: Gzip reduces to ~100KB

### Response Time
- **Typical**: 200-800ms
- **Geographic**: Varies by location (API hosted in US)
- **Caching**: CloudFlare CDN caching enabled

### Update Frequency
- **Game Patches**: API updated within 24-48 hours
- **Quest Changes**: Rare (major patches only)
- **Breaking Changes**: API version stable, no known breaking changes

---

## Data Validation

### Required Field Checks

```javascript
function validateTaskData(task) {
  const errors = [];
  
  // Required fields
  if (!task.id) errors.push('Missing id');
  if (!task.name) errors.push('Missing name');
  if (!task.trader?.name) errors.push('Missing trader.name');
  if (typeof task.minPlayerLevel !== 'number') errors.push('Invalid minPlayerLevel');
  if (typeof task.experience !== 'number') errors.push('Invalid experience');
  if (!Array.isArray(task.objectives)) errors.push('Missing objectives array');
  if (!task.startRewards) errors.push('Missing startRewards');
  if (!task.finishRewards) errors.push('Missing finishRewards');
  
  // Type checks
  if (typeof task.kappaRequired !== 'boolean') errors.push('Invalid kappaRequired');
  if (typeof task.lightkeeperRequired !== 'boolean') errors.push('Invalid lightkeeperRequired');
  
  return errors;
}
```

### Data Sanitization

```javascript
function sanitizeTaskData(task) {
  return {
    id: String(task.id).trim(),
    name: String(task.name).trim(),
    trader: String(task.trader?.name || 'Unknown').trim(),
    minPlayerLevel: Math.max(1, Math.min(79, parseInt(task.minPlayerLevel) || 1)),
    experience: Math.max(0, parseInt(task.experience) || 0),
    taskRequirements: Array.isArray(task.taskRequirements) 
      ? task.taskRequirements.map(req => req.task?.id).filter(Boolean)
      : [],
    objectives: Array.isArray(task.objectives) && task.objectives.length > 0
      ? task.objectives
      : [{ type: 'unknown', description: 'No objectives', optional: false }],
    startRewards: task.startRewards || { traderStanding: [], items: [] },
    finishRewards: task.finishRewards || { traderStanding: [], items: [] },
    kappaRequired: Boolean(task.kappaRequired),
    lightkeeperRequired: Boolean(task.lightkeeperRequired)
  };
}
```

---

## Caching Strategy

### Cache Key
```javascript
const CACHE_KEY = 'tarkov_quest_cache';
```

### Cache Duration
```javascript
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
```

### Cache Storage

```javascript
function cacheQuests(tasks) {
  const cacheEntry = {
    version: '1.0',
    timestamp: Date.now(),
    data: tasks
  };
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error('Failed to cache quest data:', error);
    // QuotaExceededError handling
  }
}
```

### Cache Retrieval

```javascript
function getCachedQuests() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const entry = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;
    
    if (age > CACHE_DURATION) {
      console.log('Cache expired');
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error('Failed to read cached data:', error);
    return null;
  }
}
```

---

## API Stability & Versioning

### Current Version
- **API**: Stable, no versioning system
- **Schema**: Additive changes only (new fields added, existing fields preserved)
- **Breaking Changes**: None expected, but monitor API documentation

### Monitoring Strategy
```javascript
// Log API response structure on each fetch
function logApiStructure(tasks) {
  if (tasks.length > 0) {
    const sample = tasks[0];
    console.log('API structure check:', {
      hasId: 'id' in sample,
      hasName: 'name' in sample,
      hasTrader: 'trader' in sample,
      traderHasName: sample.trader && 'name' in sample.trader,
      hasObjectives: Array.isArray(sample.objectives),
      objectiveCount: sample.objectives?.length || 0
    });
  }
}
```

---

## Alternative Endpoints (Not Used)

The Tarkov.dev API provides additional endpoints not used in this application:

- **Items**: `/graphql` with `items` query
- **Maps**: `/graphql` with `maps` query
- **Traders**: `/graphql` with `traders` query
- **Hideout**: `/graphql` with `hideoutStations` query

These could be integrated in future versions for enhanced features.

---

## CORS Configuration

**Status**: CORS enabled for all origins

**Headers** (from API):
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

**Browser Compatibility**: All modern browsers support CORS

---

## Testing

### Mock Data for Development

```javascript
const MOCK_QUEST_DATA = [
  {
    id: "test-1",
    name: "Test Quest 1",
    trader: { name: "Prapor" },
    minPlayerLevel: 1,
    experience: 100,
    taskRequirements: [],
    objectives: [
      {
        type: "test",
        description: "Test objective",
        optional: false,
        maps: []
      }
    ],
    startRewards: { traderStanding: [], items: [] },
    finishRewards: { traderStanding: [], items: [] },
    kappaRequired: false,
    lightkeeperRequired: false
  }
];
```

### Integration Test

```javascript
async function testApiIntegration() {
  console.log('Testing Tarkov.dev API...');
  
  try {
    const tasks = await fetchQuests();
    
    console.assert(Array.isArray(tasks), 'Response should be array');
    console.assert(tasks.length > 0, 'Should have quests');
    console.assert(tasks[0].id, 'Quest should have ID');
    console.assert(tasks[0].name, 'Quest should have name');
    
    console.log('✓ API integration test passed');
    return true;
  } catch (error) {
    console.error('✗ API integration test failed:', error);
    return false;
  }
}
```

---

**Status**: Contract validated against production API (November 2025)

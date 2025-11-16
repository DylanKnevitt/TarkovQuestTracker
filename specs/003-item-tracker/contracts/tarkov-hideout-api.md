# Tarkov.dev Hideout Stations API Contract

**Endpoint**: `https://api.tarkov.dev/graphql`  
**Method**: POST  
**Purpose**: Fetch hideout station data for hideout upgrade item tracking

---

## GraphQL Query

### Full Query

```graphql
query GetHideoutStations {
  hideoutStations {
    id
    name
    levels {
      level
      itemRequirements {
        item {
          id
          name
          iconLink
        }
        count
      }
      stationLevelRequirements {
        station {
          id
          name
        }
        level
      }
      traderRequirements {
        trader {
          name
        }
        level
      }
    }
  }
}
```

### Minimal Query (MVP)

```graphql
query GetHideoutStationsMinimal {
  hideoutStations {
    id
    name
    levels {
      level
      itemRequirements {
        item {
          id
        }
        count
      }
      stationLevelRequirements {
        station {
          id
        }
        level
      }
    }
  }
}
```

**Note**: Minimal query excludes `traderRequirements` (not used for MVP), `item.name` and `item.iconLink` (fetched from items API).

---

## Request Format

```http
POST https://api.tarkov.dev/graphql
Content-Type: application/json

{
  "query": "query { hideoutStations { id name levels { level itemRequirements { item { id } count } stationLevelRequirements { station { id } level } } } }"
}
```

---

## Response Format

### Success Response (200 OK)

```json
{
  "data": {
    "hideoutStations": [
      {
        "id": "5d484fc0654e76006657e0ab",
        "name": "Generator",
        "levels": [
          {
            "level": 1,
            "itemRequirements": [
              {
                "item": { "id": "590c5d4b86f774784e1b9c45" },
                "count": 1
              },
              {
                "item": { "id": "5d1b371186f774253763a656" },
                "count": 2
              }
            ],
            "stationLevelRequirements": []
          },
          {
            "level": 2,
            "itemRequirements": [
              {
                "item": { "id": "5d1b371186f774253763a656" },
                "count": 4
              }
            ],
            "stationLevelRequirements": [
              {
                "station": { "id": "5d484fc0654e76006657e0ab" },
                "level": 1
              }
            ]
          }
        ]
      },
      {
        "id": "5d4842e58654e7006657e0ad",
        "name": "Lavatory",
        "levels": [
          {
            "level": 1,
            "itemRequirements": [
              {
                "item": { "id": "590c5d4b86f774784e1b9c45" },
                "count": 1
              }
            ],
            "stationLevelRequirements": []
          },
          {
            "level": 2,
            "itemRequirements": [
              {
                "item": { "id": "5c0d5e4486f77478390952fe" },
                "count": 5
              },
              {
                "item": { "id": "590c5d4b86f774784e1b9c45" },
                "count": 2
              }
            ],
            "stationLevelRequirements": [
              {
                "station": { "id": "5d484fc0654e76006657e0ab" },
                "level": 1
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Error Response (4xx / 5xx)

```json
{
  "errors": [
    {
      "message": "Cannot query field \"invalidField\" on type \"HideoutStation\".",
      "locations": [{ "line": 2, "column": 3 }]
    }
  ]
}
```

---

## Field Descriptions

### HideoutStation

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | No | Unique hideout station identifier |
| `name` | String | No | Station display name (e.g., "Generator", "Lavatory") |
| `levels` | [HideoutLevel] | No | Array of upgrade levels for this station |

### HideoutLevel

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `level` | Int | No | Upgrade level (0 = base, 1-3 = upgrades) |
| `itemRequirements` | [ItemRequirement] | No | Items needed to build this level |
| `stationLevelRequirements` | [StationRequirement] | No | Other station upgrades required as prerequisites |

### ItemRequirement (Hideout Context)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `item.id` | String | No | Item ID (matches `items` query id) |
| `count` | Int | No | Quantity of item needed |

### StationRequirement

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `station.id` | String | No | Required station ID |
| `level` | Int | No | Required station level (must be completed before this level can be built) |

---

## Caching Strategy

### Cache Implementation

```javascript
export async function fetchHideoutStations() {
  const CACHE_KEY = 'tarkov-hideout-cache';
  const CACHE_TIME_KEY = 'tarkov-hideout-cache-time';
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  // Check cache validity
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
  if (cachedTime && Date.now() - parseInt(cachedTime) < CACHE_DURATION) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      console.log('Using cached hideout data');
      return JSON.parse(cached);
    }
  }
  
  // Fetch fresh data
  console.log('Fetching fresh hideout data from API');
  const response = await fetch('https://api.tarkov.dev/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query GetHideoutStations {
        hideoutStations {
          id
          name
          levels {
            level
            itemRequirements {
              item { id }
              count
            }
            stationLevelRequirements {
              station { id }
              level
            }
          }
        }
      }`
    })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL error: ${data.errors[0].message}`);
  }
  
  // Cache the response
  localStorage.setItem(CACHE_KEY, JSON.stringify(data.data.hideoutStations));
  localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
  
  return data.data.hideoutStations;
}
```

---

## Hideout Module Completion Tracking

### localStorage Structure

```json
{
  "generator-1": true,
  "generator-2": false,
  "lavatory-1": true,
  "lavatory-2": false,
  "stash-1": true,
  "stash-2": true,
  "stash-3": false,
  "stash-4": false
}
```

**Key Format**: `{stationId}-{level}`  
**Value**: `true` (completed) or `false` (not completed)

### HideoutManager Methods

```javascript
class HideoutManager {
  isModuleBuildable(stationId, level) {
    const station = this.stations.find(s => s.id === stationId);
    if (!station) return false;
    
    const levelData = station.levels.find(l => l.level === level);
    if (!levelData) return false;
    
    // Previous level must be completed (except for level 1)
    if (level > 1) {
      const prevKey = `${stationId}-${level - 1}`;
      if (!this.completedModules.get(prevKey)) {
        return false;
      }
    }
    
    // All station prerequisites must be completed
    return levelData.stationLevelRequirements.every(req => {
      const reqKey = `${req.station.id}-${req.level}`;
      return this.completedModules.get(reqKey) || false;
    });
  }
  
  getItemRequirements(stationId, level) {
    const station = this.stations.find(s => s.id === stationId);
    if (!station) return [];
    
    const levelData = station.levels.find(l => l.level === level);
    if (!levelData) return [];
    
    return levelData.itemRequirements.map(req => ({
      itemId: req.item.id,
      quantity: req.count,
      moduleKey: `${stationId}-${level}`,
      moduleName: `${station.name} Level ${level}`
    }));
  }
}
```

---

## Priority Calculation for Hideout Items

### Logic

```javascript
// Item is NEEDED_SOON if required for buildable hideout module
for (const source of aggregatedItem.sources) {
  if (source.type === 'hideout') {
    const [stationId, level] = source.id.split('-');
    const levelNum = parseInt(level);
    
    // Check if module is buildable and not yet completed
    if (hideoutManager.isModuleBuildable(stationId, levelNum) &&
        !hideoutManager.isModuleCompleted(source.id)) {
      return Priority.NEEDED_SOON;
    }
  }
}
```

**Example**:
- User has Generator Level 1 completed
- Generator Level 2 requires Military power filter x4
- Generator Level 2 prerequisites: Generator Level 1 (✅ completed)
- `isModuleBuildable('generator', 2)` returns `true`
- Military power filter priority = NEEDED_SOON

---

## Error Handling

### Network Errors

```javascript
try {
  const stations = await fetchHideoutStations();
} catch (error) {
  console.error('Failed to fetch hideout stations:', error);
  
  // Try to use stale cache
  const staleCache = localStorage.getItem('tarkov-hideout-cache');
  if (staleCache) {
    console.warn('Using stale hideout data due to network error');
    return JSON.parse(staleCache);
  }
  
  // Show error UI (non-blocking - hideout items won't show but quest items still work)
  console.warn('Hideout items unavailable - showing quest items only');
  return [];
}
```

### Missing Prerequisites

If API returns incomplete station data:

```javascript
// Validate station prerequisites
for (const station of stations) {
  for (const levelData of station.levels) {
    for (const stationReq of levelData.stationLevelRequirements) {
      const reqStation = stations.find(s => s.id === stationReq.station.id);
      if (!reqStation) {
        console.warn(`Missing prerequisite station ${stationReq.station.id} for ${station.name} Level ${levelData.level}`);
      }
    }
  }
}
```

---

## Performance Considerations

### Expected Response Size

- **Station Count**: ~15 stations (Generator, Lavatory, Stash, etc.)
- **Average Levels per Station**: 3-4
- **Response Size**: ~30-50 KB uncompressed, ~8-12 KB gzipped
- **Load Time**: < 300ms on 5 Mbps connection

### Optimization Strategies

1. **Parallel Fetch**: Load hideout data in parallel with items API call
   ```javascript
   const [items, hideoutStations] = await Promise.all([
     fetchItems(),
     fetchHideoutStations()
   ]);
   ```

2. **Selective Loading**: Only fetch when user has incomplete hideout modules (detected via progress check)

3. **Minimal Query**: Exclude trader requirements (not used for MVP)

---

## Data Transformation

### Convert API Response to HideoutModule Objects

```javascript
function parseHideoutData(apiResponse) {
  const modules = [];
  
  for (const station of apiResponse) {
    for (const levelData of station.levels) {
      modules.push({
        stationId: station.id,
        stationName: station.name,
        level: levelData.level,
        itemRequirements: levelData.itemRequirements.map(req => ({
          itemId: req.item.id,
          quantity: req.count
        })),
        stationLevelRequirements: levelData.stationLevelRequirements.map(req => ({
          stationId: req.station.id,
          level: req.level
        })),
        completed: false  // Loaded from localStorage separately
      });
    }
  }
  
  return modules;
}
```

---

## Testing Checklist

- [ ] API returns 200 OK with valid GraphQL response
- [ ] Response contains at least 15 hideout stations
- [ ] Each station has 1-4 levels
- [ ] All itemRequirements have valid item.id and count > 0
- [ ] stationLevelRequirements correctly define dependencies (e.g., Lavatory 2 requires Generator 1)
- [ ] Cache stores data in localStorage correctly
- [ ] Cache expires after 24 hours
- [ ] Stale cache used on network error
- [ ] GraphQL errors handled gracefully
- [ ] isModuleBuildable correctly evaluates prerequisites
- [ ] Hideout completion status persists across sessions

---

## Example API Call (curl)

```bash
curl -X POST https://api.tarkov.dev/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { hideoutStations { id name levels { level itemRequirements { item { id } count } stationLevelRequirements { station { id } level } } } }"
  }'
```

---

## Integration with Items API

### Cross-Referencing Item Data

```javascript
// After fetching both APIs
const itemsMap = new Map(items.map(item => [item.id, item]));

for (const module of hideoutModules) {
  for (const itemReq of module.itemRequirements) {
    // Enrich with full item data
    const item = itemsMap.get(itemReq.itemId);
    if (item) {
      itemReq.itemName = item.name;
      itemReq.itemIcon = item.iconLink;
    } else {
      console.warn(`Item ${itemReq.itemId} not found in items API for ${module.stationName} Level ${module.level}`);
    }
  }
}
```

---

**Contract Version**: 1.0  
**Last Updated**: 2025-11-16  
**Status**: Ready for Implementation

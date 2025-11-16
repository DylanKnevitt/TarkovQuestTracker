# Tarkov.dev Items API Contract

**Endpoint**: `https://api.tarkov.dev/graphql`  
**Method**: POST  
**Purpose**: Fetch item data for quest and hideout item tracking

---

## GraphQL Query

### Full Query

```graphql
query GetItems {
  items {
    id
    name
    shortName
    iconLink
    wikiLink
    types
    usedInTasks {
      id
      name
      trader {
        name
      }
      minPlayerLevel
      taskRequirements {
        task {
          id
        }
      }
    }
  }
}
```

### Minimal Query (MVP)

```graphql
query GetItemsMinimal {
  items {
    id
    name
    shortName
    iconLink
    wikiLink
    types
  }
}
```

**Note**: For MVP, use minimal query. Item-to-quest relationships extracted from existing `tasks` query (already fetched by QuestManager) instead of `usedInTasks` to reduce API payload size.

---

## Request Format

```http
POST https://api.tarkov.dev/graphql
Content-Type: application/json

{
  "query": "query GetItems { items { id name shortName iconLink wikiLink types } }"
}
```

---

## Response Format

### Success Response (200 OK)

```json
{
  "data": {
    "items": [
      {
        "id": "5d1b371186f774253763a656",
        "name": "Military power filter",
        "shortName": "MilPowerFilter",
        "iconLink": "https://assets.tarkov.dev/5d1b371186f774253763a656-icon.webp",
        "wikiLink": "https://escapefromtarkov.fandom.com/wiki/Military_power_filter",
        "types": ["barter"]
      },
      {
        "id": "5c0d5e4486f77478390952fe",
        "name": "Cordura polyamide fabric",
        "shortName": "Cordura",
        "iconLink": "https://assets.tarkov.dev/5c0d5e4486f77478390952fe-icon.webp",
        "wikiLink": "https://escapefromtarkov.fandom.com/wiki/Cordura_polyamide_fabric",
        "types": ["barter"]
      },
      {
        "id": "5780d0652459777df90dcb74",
        "name": "Machinery key",
        "shortName": "Mach. key",
        "iconLink": "https://assets.tarkov.dev/5780d0652459777df90dcb74-icon.webp",
        "wikiLink": "https://escapefromtarkov.fandom.com/wiki/Machinery_key",
        "types": ["keys"]
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
      "message": "Cannot query field \"invalidField\" on type \"Item\".",
      "locations": [{ "line": 2, "column": 3 }]
    }
  ]
}
```

---

## Field Descriptions

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | No | Unique item identifier (Tarkov internal ID) |
| `name` | String | No | Full item name displayed in game |
| `shortName` | String | No | Abbreviated name for compact display |
| `iconLink` | String | Yes | URL to item icon image (webp format, 64x64px) |
| `wikiLink` | String | Yes | URL to Escape from Tarkov wiki page |
| `types` | [String] | No | Item categories: "barter", "keys", "wearable", "ammo", "mods", etc. |

---

## Type Mapping to Filters

| `types` Value | Filter Category | Display Name |
|--------------|----------------|--------------|
| Contains "keys" | Keys | "🔑 Keys" |
| Any other value | Quest/Hideout (determined by source) | Based on ItemRequirement.source.type |

**Logic**:
- If `types.includes('keys')` → Always show in "Keys" filter
- If item has quest source → Show in "Quest Items" filter
- If item has hideout source → Show in "Hideout Items" filter
- Item can appear in multiple filters (e.g., key needed for quest + hideout)

---

## Caching Strategy

### Cache Implementation

```javascript
export async function fetchItems() {
  const CACHE_KEY = 'tarkov-items-cache';
  const CACHE_TIME_KEY = 'tarkov-items-cache-time';
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  // Check cache validity
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
  if (cachedTime && Date.now() - parseInt(cachedTime) < CACHE_DURATION) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      console.log('Using cached items data');
      return JSON.parse(cached);
    }
  }
  
  // Fetch fresh data
  console.log('Fetching fresh items data from API');
  const response = await fetch('https://api.tarkov.dev/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query GetItems {
        items {
          id
          name
          shortName
          iconLink
          wikiLink
          types
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
  localStorage.setItem(CACHE_KEY, JSON.stringify(data.data.items));
  localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
  
  return data.data.items;
}
```

**Cache Invalidation**:
- Automatic: After 24 hours
- Manual: User clicks "Refresh Data" button (clears cache and re-fetches)
- On Error: If API returns 404/500, serve stale cache if available

---

## Error Handling

### Network Errors

```javascript
try {
  const items = await fetchItems();
} catch (error) {
  console.error('Failed to fetch items:', error);
  
  // Try to use stale cache
  const staleCache = localStorage.getItem('tarkov-items-cache');
  if (staleCache) {
    console.warn('Using stale cached data due to network error');
    return JSON.parse(staleCache);
  }
  
  // Show error UI
  showError('Failed to load items. Please check your internet connection and try again.');
}
```

### GraphQL Errors

```javascript
const data = await response.json();

if (data.errors) {
  console.error('GraphQL errors:', data.errors);
  throw new Error(`API returned errors: ${data.errors.map(e => e.message).join(', ')}`);
}
```

---

## Performance Considerations

### Expected Response Size

- **Item Count**: ~400-500 items (as of 2024)
- **Response Size**: ~150-200 KB uncompressed, ~30-40 KB gzipped
- **Load Time**: < 500ms on 5 Mbps connection

### Optimization Strategies

1. **Lazy Loading**: Only fetch items when user switches to Item Tracker tab (not on app init)
2. **Compression**: API serves gzipped responses (Content-Encoding: gzip)
3. **Minimal Query**: Exclude `usedInTasks` field (reduces payload by ~60%)
4. **Cache-First**: Always check localStorage before network request

---

## Integration with Existing Quest Data

### Extracting Item Requirements from Quest Objectives

Instead of using `items.usedInTasks`, extract from existing `tasks` query:

```javascript
// src/api/tarkov-api.js already fetches:
query {
  tasks {
    id
    name
    objectives {
      id
      type
      description
      optional
      target  // This is the item ID if type is "giveQuestItem" or "findQuestItem"
      number  // Quantity needed
    }
  }
}

// Map objectives to items
for (const quest of questManager.quests) {
  for (const objective of quest.objectives) {
    if (objective.type === 'giveQuestItem' || objective.type === 'findQuestItem') {
      const itemId = objective.target;
      const quantity = objective.number || 1;
      const isFiR = detectFiR(objective);
      
      // Create ItemRequirement linking itemId to quest
      requirements.push(new ItemRequirement(
        itemId,
        { type: 'quest', id: quest.id, name: quest.name },
        quantity,
        isFiR
      ));
    }
  }
}
```

**Rationale**: Avoids duplicate API call, leverages existing data, reduces total API payload.

---

## Testing Checklist

- [ ] API returns 200 OK with valid GraphQL response
- [ ] Response contains at least 400 items
- [ ] All items have non-null `id` and `name`
- [ ] `iconLink` URLs are valid (or gracefully handle null)
- [ ] `types` array is populated for all items
- [ ] Cache stores data in localStorage correctly
- [ ] Cache expires after 24 hours
- [ ] Stale cache used on network error
- [ ] GraphQL errors handled gracefully with user feedback
- [ ] Items with type="keys" correctly filtered to Keys category

---

## Example API Call (curl)

```bash
curl -X POST https://api.tarkov.dev/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { items { id name shortName iconLink wikiLink types } }"
  }'
```

---

**Contract Version**: 1.0  
**Last Updated**: 2025-11-16  
**Status**: Ready for Implementation

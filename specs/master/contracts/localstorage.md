# Contract: LocalStorage API

**Interface**: Browser LocalStorage API  
**Scope**: Client-side persistence for quest progress and API cache  
**Storage Limit**: ~5-10MB per domain (browser dependent)

## Storage Keys

### Quest Progress Storage

**Key**: `tarkov_quest_progress`

**Purpose**: Persist user's quest completion state across sessions

**Data Structure**:
```typescript
interface ProgressData {
  version: string       // Data format version (e.g., "1.0")
  timestamp: number     // Last update time (Unix timestamp)
  completed: string[]   // Array of completed quest IDs
}
```

**Example**:
```json
{
  "version": "1.0",
  "timestamp": 1700000000000,
  "completed": [
    "5936d90786f7742b1420ba5b",
    "59674cd986f7744ab26e32f2"
  ]
}
```

### Quest Data Cache

**Key**: `tarkov_quest_cache`

**Purpose**: Cache API responses to reduce network calls and improve performance

**Data Structure**:
```typescript
interface CacheEntry {
  version: string       // Data format version
  timestamp: number     // Cache creation time
  data: Quest[]         // Complete quest dataset from API
}
```

**Cache Duration**: 24 hours (86,400,000 milliseconds)

**Example**:
```json
{
  "version": "1.0",
  "timestamp": 1700000000000,
  "data": [ /* array of Quest objects */ ]
}
```

---

## Operations

### Write Operation

```javascript
function saveProgress(completed) {
  const data = {
    version: '1.0',
    timestamp: Date.now(),
    completed: Array.from(completed)
  };
  
  try {
    localStorage.setItem('tarkov_quest_progress', JSON.stringify(data));
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.error('LocalStorage quota exceeded');
      // Attempt cleanup
      clearOldCache();
    } else {
      console.error('Failed to save progress:', error);
    }
  }
}
```

### Read Operation

```javascript
function loadProgress() {
  try {
    const stored = localStorage.getItem('tarkov_quest_progress');
    if (!stored) {
      return { version: '1.0', timestamp: Date.now(), completed: [] };
    }
    
    const data = JSON.parse(stored);
    
    // Validate structure
    if (!data.version || !Array.isArray(data.completed)) {
      console.warn('Invalid progress data format, resetting');
      return { version: '1.0', timestamp: Date.now(), completed: [] };
    }
    
    return data;
  } catch (error) {
    console.error('Failed to load progress:', error);
    return { version: '1.0', timestamp: Date.now(), completed: [] };
  }
}
```

### Delete Operation

```javascript
function clearProgress() {
  try {
    localStorage.removeItem('tarkov_quest_progress');
  } catch (error) {
    console.error('Failed to clear progress:', error);
  }
}

function clearCache() {
  try {
    localStorage.removeItem('tarkov_quest_cache');
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}
```

### Check Existence

```javascript
function hasProgress() {
  return localStorage.getItem('tarkov_quest_progress') !== null;
}

function hasCachedData() {
  return localStorage.getItem('tarkov_quest_cache') !== null;
}
```

---

## Error Handling

### QuotaExceededError

**Cause**: LocalStorage limit reached (typically 5-10MB)

**Mitigation**:
```javascript
function handleQuotaExceeded() {
  console.warn('Storage quota exceeded, attempting cleanup...');
  
  // Clear old cache first
  clearCache();
  
  // If still failing, compress data or prompt user
  try {
    // Retry save operation
    saveProgress(completed);
  } catch (error) {
    alert('Unable to save progress: storage full. Please clear browser data.');
  }
}
```

### Data Corruption

**Cause**: Invalid JSON or unexpected structure

**Mitigation**:
```javascript
function loadProgressSafe() {
  try {
    const stored = localStorage.getItem('tarkov_quest_progress');
    if (!stored) return getDefaultProgress();
    
    const data = JSON.parse(stored);
    
    // Validate and migrate if needed
    const validated = validateAndMigrate(data);
    return validated;
    
  } catch (error) {
    console.error('Progress data corrupted, resetting:', error);
    clearProgress();
    return getDefaultProgress();
  }
}

function getDefaultProgress() {
  return {
    version: '1.0',
    timestamp: Date.now(),
    completed: []
  };
}
```

---

## Data Migration

### Version Migration Strategy

```javascript
function migrateProgressData(data) {
  // No version or v0 format (just array)
  if (!data.version) {
    if (Array.isArray(data)) {
      return {
        version: '1.0',
        timestamp: Date.now(),
        completed: data
      };
    }
    return getDefaultProgress();
  }
  
  // v1.0 format (current)
  if (data.version === '1.0') {
    return data;
  }
  
  // Future versions
  // if (data.version === '1.1') { ... }
  
  console.warn('Unknown version:', data.version);
  return data;
}
```

### Breaking Change Handling

```javascript
function handleBreakingChange(oldData, newVersion) {
  console.log(`Migrating from ${oldData.version} to ${newVersion}`);
  
  // Example: v1.0 → v2.0 (hypothetical)
  if (oldData.version === '1.0' && newVersion === '2.0') {
    return {
      version: '2.0',
      timestamp: Date.now(),
      profiles: {
        default: {
          completed: oldData.completed,
          notes: {}
        }
      }
    };
  }
  
  return oldData;
}
```

---

## Cache Management

### Cache Expiration Check

```javascript
function isCacheExpired(cacheEntry) {
  if (!cacheEntry || !cacheEntry.timestamp) {
    return true;
  }
  
  const age = Date.now() - cacheEntry.timestamp;
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  return age > maxAge;
}
```

### Cache Refresh

```javascript
async function refreshCacheIfNeeded() {
  const cached = localStorage.getItem('tarkov_quest_cache');
  
  if (!cached) {
    console.log('No cache found, fetching from API');
    return await fetchAndCache();
  }
  
  const entry = JSON.parse(cached);
  
  if (isCacheExpired(entry)) {
    console.log('Cache expired, refreshing');
    return await fetchAndCache();
  }
  
  console.log('Using cached data');
  return entry.data;
}

async function fetchAndCache() {
  const data = await fetchQuests();
  
  const cacheEntry = {
    version: '1.0',
    timestamp: Date.now(),
    data: data
  };
  
  localStorage.setItem('tarkov_quest_cache', JSON.stringify(cacheEntry));
  return data;
}
```

---

## Storage Monitoring

### Usage Calculation

```javascript
function getStorageUsage() {
  let totalBytes = 0;
  let itemCount = 0;
  
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const value = localStorage[key];
      totalBytes += (key.length + value.length) * 2; // UTF-16 encoding
      itemCount++;
    }
  }
  
  return {
    itemCount,
    bytes: totalBytes,
    kilobytes: (totalBytes / 1024).toFixed(2),
    megabytes: (totalBytes / (1024 * 1024)).toFixed(2),
    percentOfEstimatedLimit: ((totalBytes / (5 * 1024 * 1024)) * 100).toFixed(2)
  };
}
```

### Storage Breakdown

```javascript
function getStorageBreakdown() {
  const items = [];
  
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const value = localStorage[key];
      const size = (key.length + value.length) * 2;
      
      items.push({
        key,
        sizeBytes: size,
        sizeKB: (size / 1024).toFixed(2)
      });
    }
  }
  
  items.sort((a, b) => b.sizeBytes - a.sizeBytes);
  return items;
}
```

### Console Diagnostics

```javascript
function logStorageDiagnostics() {
  console.group('LocalStorage Diagnostics');
  
  const usage = getStorageUsage();
  console.log('Total usage:', usage.kilobytes, 'KB');
  console.log('Item count:', usage.itemCount);
  console.log('Estimated limit usage:', usage.percentOfEstimatedLimit, '%');
  
  console.log('\nBreakdown by key:');
  const breakdown = getStorageBreakdown();
  breakdown.forEach(item => {
    console.log(`  ${item.key}: ${item.sizeKB} KB`);
  });
  
  console.groupEnd();
}
```

---

## Privacy & Security

### Data Retention

**User Control**: Users can clear data via:
1. Browser settings (Clear browsing data)
2. Application UI (Clear cache button)
3. DevTools console

**Automatic Cleanup**: None (data persists indefinitely unless manually cleared)

### Sensitive Data

**What's Stored**:
- Quest completion status (non-sensitive)
- API response cache (public data)

**What's NOT Stored**:
- User credentials
- Personal information
- Payment information
- Analytics data

### Cross-Origin Isolation

**Access**: LocalStorage is isolated per origin (domain + protocol + port)

**Security**: Data only accessible by same origin

**CORS**: Not applicable (LocalStorage is client-side only)

---

## Browser Compatibility

### Supported Browsers

All modern browsers with full LocalStorage support:
- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge (all versions)
- Opera 10.5+

### Feature Detection

```javascript
function isLocalStorageAvailable() {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
}

function initializeStorage() {
  if (!isLocalStorageAvailable()) {
    console.error('LocalStorage not available');
    alert('Your browser does not support local storage. Progress will not be saved.');
    return false;
  }
  return true;
}
```

### Fallback Strategy

```javascript
// In-memory fallback if LocalStorage unavailable
let memoryStorage = {};

function setItem(key, value) {
  if (isLocalStorageAvailable()) {
    localStorage.setItem(key, value);
  } else {
    memoryStorage[key] = value;
  }
}

function getItem(key) {
  if (isLocalStorageAvailable()) {
    return localStorage.getItem(key);
  } else {
    return memoryStorage[key] || null;
  }
}
```

---

## Testing

### Unit Tests

```javascript
describe('LocalStorage Contract', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  test('should save progress data', () => {
    const progress = {
      version: '1.0',
      timestamp: Date.now(),
      completed: ['quest-1', 'quest-2']
    };
    
    saveProgress(progress.completed);
    const loaded = loadProgress();
    
    expect(loaded.completed).toEqual(progress.completed);
  });
  
  test('should handle corrupted data gracefully', () => {
    localStorage.setItem('tarkov_quest_progress', 'invalid json');
    const loaded = loadProgress();
    
    expect(loaded.completed).toEqual([]);
  });
  
  test('should detect cache expiration', () => {
    const oldEntry = {
      version: '1.0',
      timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      data: []
    };
    
    expect(isCacheExpired(oldEntry)).toBe(true);
  });
});
```

---

**Status**: Contract validated against current implementation

# Data Model: Automatic Quest Tracking

**Feature**: 005 - Automatic Quest & Progress Tracking  
**Date**: 2025-01-16  
**Status**: Phase 1 - Design

---

## Overview

This document defines the data structures and schemas for the desktop companion app that monitors Tarkov log files and syncs quest progress to Supabase.

**Note**: Data models are conditional on verification that quest events are logged by the game. If not logged, these models may be adapted for alternative approaches (browser extension, screenshot OCR, etc.).

---

## Event Structures

### QuestCompletedEvent

Emitted when a quest completion is detected from log files.

```typescript
interface QuestCompletedEvent {
  type: "QUEST_COMPLETED";
  timestamp: Date;              // When quest was completed (from log timestamp)
  profileId: string;            // Tarkov profile ID (extracted from logs or config)
  questId: string;              // Tarkov.dev quest ID (mapped from quest name)
  questInternalName: string;    // Quest name as it appears in logs
  source: "log_file" | "manual" | "imported"; // How this event was detected
}
```

**Example**:
```json
{
  "type": "QUEST_COMPLETED",
  "timestamp": "2025-01-16T14:32:45.123Z",
  "profileId": "abc123def456",
  "questId": "5936d90786f7742b1420ba5b",
  "questInternalName": "Debut",
  "source": "log_file"
}
```

### QuestTurnInEvent

Emitted when a quest with item requirements is completed, triggering item quantity decrements.

```typescript
interface QuestTurnInEvent {
  type: "QUEST_TURN_IN";
  timestamp: Date;
  profileId: string;
  questId: string;
  items: Array<{
    itemId: string;           // Tarkov.dev item ID
    quantity: number;         // How many items to decrement
    itemName: string;         // Display name (for logging)
  }>;
}
```

**Example**:
```json
{
  "type": "QUEST_TURN_IN",
  "timestamp": "2025-01-16T14:32:45.123Z",
  "profileId": "abc123def456",
  "questId": "5936d90786f7742b1420ba5b",
  "items": [
    {
      "itemId": "5449016a4bdc2d6f028b456f",
      "quantity": 5,
      "itemName": "MP-133 12ga shotgun"
    }
  ]
}
```

### LogLineEvent

Raw log line emitted from Rust file watcher to JavaScript parser.

```typescript
interface LogLineEvent {
  type: "LOG_LINE";
  timestamp: Date;          // When log line was written
  filePath: string;         // Which log file
  lineNumber: number;       // Line number in file
  content: string;          // Raw log line content
}
```

---

## Configuration Schema

### AppConfig

Persisted configuration for the desktop app.

```typescript
interface AppConfig {
  version: string;                    // Config schema version (e.g., "1.0.0")
  
  // Log Watching
  logDirectory: string | null;        // Path to Tarkov logs, null = auto-detect
  autoDetect: boolean;                // Try to auto-detect log directory on startup
  
  // Startup & Behavior
  autoStart: boolean;                 // Start app with Windows/macOS
  startMinimized: boolean;            // Start in system tray
  
  // Notifications
  notifications: {
    enabled: boolean;                 // Show notifications
    sound: boolean;                   // Play notification sound
    questCompleted: boolean;          // Notify on quest completion
    syncError: boolean;               // Notify on sync errors
  };
  
  // Supabase Connection
  supabase: {
    url: string;                      // Supabase project URL
    anonKey: string;                  // Supabase anon key
    connected: boolean;               // Last known connection status
  };
  
  // User Profile
  profileId: string | null;           // Tarkov profile ID (manual entry or auto-detected)
  profileName: string | null;         // Display name (optional)
  
  // Advanced
  watchInterval: number;              // File watch polling interval (ms), default 500
  syncInterval: number;               // How often to process sync queue (ms), default 5000
  maxRetries: number;                 // Max sync retry attempts, default 5
  debugMode: boolean;                 // Enable verbose logging
}
```

**Default Configuration**:
```json
{
  "version": "1.0.0",
  "logDirectory": null,
  "autoDetect": true,
  "autoStart": false,
  "startMinimized": false,
  "notifications": {
    "enabled": true,
    "sound": false,
    "questCompleted": true,
    "syncError": true
  },
  "supabase": {
    "url": "",
    "anonKey": "",
    "connected": false
  },
  "profileId": null,
  "profileName": null,
  "watchInterval": 500,
  "syncInterval": 5000,
  "maxRetries": 5,
  "debugMode": false
}
```

---

## Sync Queue Schema

### SyncQueueEntry

Entry in the offline sync queue (persisted to Tauri store).

```typescript
interface SyncQueueEntry {
  id: string;                                     // UUID
  event: QuestCompletedEvent | QuestTurnInEvent; // Event to sync
  status: SyncStatus;
  retryCount: number;                             // How many times sync has been attempted
  lastAttempt: Date | null;                       // When last sync attempt was made
  error: string | null;                           // Last error message if failed
  createdAt: Date;                                // When event was queued
}

type SyncStatus = "pending" | "syncing" | "failed" | "completed";
```

**State Transitions**:
```
pending → syncing → completed
    ↓         ↓
    └─────→ failed → (retry after backoff) → syncing
```

---

## Database Schema (Supabase)

### quest_progress Table

Existing table in web app, updated by desktop app.

```sql
CREATE TABLE quest_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, quest_id)
);
```

**Desktop App Operations**:
- **UPSERT**: When quest completion detected
  ```sql
  INSERT INTO quest_progress (profile_id, quest_id, completed, completed_at)
  VALUES ($1, $2, TRUE, $3)
  ON CONFLICT (profile_id, quest_id)
  DO UPDATE SET completed = TRUE, completed_at = EXCLUDED.completed_at, updated_at = NOW()
  WHERE quest_progress.completed_at < EXCLUDED.completed_at;
  ```

### item_collection Table

Existing table in web app, updated when quest items are turned in.

```sql
CREATE TABLE item_collection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, item_id)
);
```

**Desktop App Operations**:
- **DECREMENT**: When quest with item requirements is completed
  ```sql
  UPDATE item_collection
  SET quantity = GREATEST(0, quantity - $3), updated_at = NOW()
  WHERE profile_id = $1 AND item_id = $2;
  ```

---

## Quest Mapping Schema

### QuestMapping

Mapping between Tarkov internal quest names and Tarkov.dev IDs.

```typescript
interface QuestMapping {
  internalName: string;      // Quest name as it appears in logs
  tarkovDevId: string;       // Tarkov.dev quest ID
  displayName: string;       // Human-readable name
  trader: string;            // Trader name (Prapor, Therapist, etc.)
  confidence: number;        // Matching confidence (0-1), 1 = exact match
}
```

**Storage**:
- Fetched from Tarkov.dev API on app start
- Cached in memory
- Persisted to Tauri store for offline access
- Refreshed every 24 hours

**Example**:
```json
{
  "internalName": "Debut",
  "tarkovDevId": "5936d90786f7742b1420ba5b",
  "displayName": "Debut",
  "trader": "Prapor",
  "confidence": 1.0
}
```

---

## Error Handling

### SyncError

Structure for sync errors.

```typescript
interface SyncError {
  code: string;              // Error code (e.g., "SUPABASE_TIMEOUT", "AUTH_FAILED")
  message: string;           // Human-readable error message
  details: unknown;          // Additional error details
  timestamp: Date;           // When error occurred
  recoverable: boolean;      // Whether retry might succeed
}
```

**Common Error Codes**:
- `SUPABASE_TIMEOUT`: Database connection timeout
- `AUTH_FAILED`: Supabase credentials invalid
- `QUEST_NOT_FOUND`: Quest name couldn't be mapped to Tarkov.dev ID
- `RATE_LIMITED`: Tarkov.dev API rate limit exceeded
- `NETWORK_ERROR`: No internet connection

---

## State Management

### AppState

Global application state (Rust side, shared via Tauri State).

```rust
pub struct AppState {
    pub config: Arc<Mutex<AppConfig>>,
    pub watcher_active: Arc<Mutex<bool>>,
    pub last_sync: Arc<Mutex<Option<DateTime<Utc>>>>,
}
```

### UIState

Frontend state (JavaScript side).

```typescript
interface UIState {
  connected: boolean;              // Supabase connection status
  watching: boolean;               // Log watcher active
  lastEvent: Date | null;          // Last detected quest event
  queueSize: number;               // Pending sync queue size
  settings: AppConfig;
}
```

---

## Data Flow Diagram

```
┌──────────────┐
│  Log Files   │
└──────┬───────┘
       │ (File watcher monitors)
       ↓
┌──────────────┐
│ Rust Watcher │ (notify crate)
└──────┬───────┘
       │ (Emit LogLineEvent via IPC)
       ↓
┌──────────────┐
│  JS Parser   │ (Regex patterns)
└──────┬───────┘
       │ (Emit QuestCompletedEvent)
       ↓
┌──────────────┐
│ Quest Mapper │ (Tarkov.dev lookup)
└──────┬───────┘
       │ (Emit QuestTurnInEvent if items required)
       ↓
┌──────────────┐
│ Sync Engine  │ (Queue + retry logic)
└──────┬───────┘
       │ (Update database)
       ↓
┌──────────────┐
│  Supabase    │ (PostgreSQL)
└──────────────┘
```

---

## Validation Rules

### Quest Event Validation

Before queueing a `QuestCompletedEvent`:
1. ✅ `questId` must be valid Tarkov.dev ID
2. ✅ `profileId` must match configured profile
3. ✅ `timestamp` must be within last 7 days (prevent old log replays)
4. ✅ Quest must not already be marked complete (check database first)

### Configuration Validation

Before saving `AppConfig`:
1. ✅ `logDirectory` must exist and be readable (if not null)
2. ✅ `supabase.url` must be valid URL
3. ✅ `supabase.anonKey` must be non-empty string
4. ✅ `watchInterval` must be between 100ms and 5000ms
5. ✅ `syncInterval` must be between 1000ms and 60000ms
6. ✅ `maxRetries` must be between 1 and 10

---

## Data Migration Strategy

**Version 1.0.0 → 1.1.0 (Future)**:

If config schema changes:
```typescript
function migrateConfig(oldConfig: any): AppConfig {
  if (oldConfig.version === "1.0.0") {
    return {
      ...oldConfig,
      version: "1.1.0",
      // Add new fields with defaults
      newField: defaultValue,
    };
  }
  return oldConfig;
}
```

Store migration version in config to handle backward compatibility.

---

## Next Steps

1. **Phase 1**: Generate API contracts (contracts/ directory)
2. **Phase 1**: Create quickstart.md for developer setup
3. **Phase 1**: Update agent context with Tauri/Rust technologies
4. **Phase 2**: Generate tasks.md with detailed implementation tasks

**Conditional**: Proceed only after verifying quest events are logged.

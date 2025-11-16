# IPC Commands Reference

**Feature**: 005 - Automatic Quest & Progress Tracking  
**Purpose**: Document Tauri IPC commands (Rust ↔ JavaScript communication)

---

## Overview

This document details the command interface between the Rust backend and JavaScript frontend in the Tauri desktop application.

**Contract Location**: See `log-events.schema.json` for JSON Schema definitions.

---

## Commands (JavaScript → Rust)

Commands are invoked from JavaScript using `invoke()`:

```javascript
import { invoke } from '@tauri-apps/api/tauri';

const result = await invoke('command_name', { param: value });
```

### File Watching Commands

#### `start_log_watcher`

Start monitoring the specified log directory for file changes.

**Input**:
```typescript
{
  logDirectory: string; // Absolute path to logs directory
}
```

**Output**:
```typescript
{
  success: boolean;
  error: string | null; // Error message if failed
}
```

**Example**:
```javascript
const result = await invoke('start_log_watcher', {
  logDirectory: 'C:\\Battlestate Games\\EFT\\Logs'
});

if (result.success) {
  console.log('Watcher started');
} else {
  console.error('Failed:', result.error);
}
```

---

#### `stop_log_watcher`

Stop monitoring log files.

**Input**: None

**Output**:
```typescript
{
  success: boolean;
}
```

---

#### `validate_log_directory`

Check if a directory contains valid Tarkov log files.

**Input**:
```typescript
{
  path: string; // Directory path to validate
}
```

**Output**:
```typescript
{
  valid: boolean;
  reason: string | null; // Why invalid (if applicable)
}
```

**Validation Checks**:
- Directory exists
- Directory is readable
- Contains `.log` files
- Files have expected format

---

### Configuration Commands

#### `get_app_config`

Retrieve current application configuration from storage.

**Input**: None

**Output**: `AppConfig` object (see data-model.md)

---

#### `save_app_config`

Save application configuration to persistent storage.

**Input**: `AppConfig` object

**Output**:
```typescript
{
  success: boolean;
  error: string | null;
}
```

---

### Auto-Detection Commands

#### `auto_detect_log_directory`

Attempt to automatically detect Tarkov installation and log directory.

**Input**: None

**Output**:
```typescript
{
  found: boolean;
  path: string | null;
  method: 'registry' | 'steam' | 'common_path' | null;
}
```

**Detection Methods**:
1. **registry**: Windows registry lookup
2. **steam**: Parse Steam library folders
3. **common_path**: Check common installation locations

---

### Supabase Commands

#### `test_supabase_connection`

Test Supabase connection with provided credentials.

**Input**:
```typescript
{
  url: string;      // Supabase project URL
  anonKey: string;  // Supabase anon key
}
```

**Output**:
```typescript
{
  connected: boolean;
  error: string | null;
}
```

---

### Sync Queue Commands

#### `get_sync_queue_status`

Get current sync queue status and statistics.

**Input**: None

**Output**:
```typescript
{
  queueSize: number;        // Total entries in queue
  pendingCount: number;     // Entries waiting to sync
  failedCount: number;      // Entries that failed
  oldestEvent: string | null; // ISO timestamp of oldest event
}
```

---

#### `manual_sync`

Manually trigger processing of the sync queue (useful for debugging).

**Input**: None

**Output**:
```typescript
{
  synced: number;  // Number of events successfully synced
  failed: number;  // Number that failed
}
```

---

#### `clear_sync_queue`

Remove completed entries from the sync queue (cleanup).

**Input**: None

**Output**:
```typescript
{
  removed: number; // Number of entries removed
}
```

---

### Historical Import Commands

#### `import_historical_logs`

Import quest progress from historical log files (batch operation).

**Input**:
```typescript
{
  startDate: string;  // ISO date string (e.g., wipe date)
  profileId: string;  // Tarkov profile ID to filter events
}
```

**Output**:
```typescript
{
  filesProcessed: number;    // Number of log files scanned
  eventsFound: number;       // Total quest events detected
  questsCompleted: number;   // Quests marked complete in DB
}
```

**Note**: This is a long-running operation. Monitor progress via `import-progress` event.

---

## Events (Rust → JavaScript)

Events are emitted from Rust and listened to in JavaScript:

```javascript
import { listen } from '@tauri-apps/api/event';

await listen('event-name', (event) => {
  const payload = event.payload;
  // Handle event
});
```

### `log-line`

Emitted when a new log line is detected by the file watcher.

**Payload**:
```typescript
{
  timestamp: string;  // ISO timestamp when line was written
  filePath: string;   // Full path to log file
  lineNumber: number; // Line number in file
  content: string;    // Raw log line content
}
```

**Frequency**: High (potentially hundreds per second)

**Recommendation**: Batch process in JavaScript

---

### `quest-completed`

Emitted when quest completion is detected and parsed.

**Payload**: `QuestCompletedEvent` (see data-model.md)

**Example**:
```javascript
await listen('quest-completed', (event) => {
  const quest = event.payload;
  showNotification(`Quest completed: ${quest.questInternalName}`);
});
```

---

### `quest-turn-in`

Emitted when quest with item requirements is completed.

**Payload**: `QuestTurnInEvent` (see data-model.md)

---

### `sync-status-changed`

Emitted when Supabase connection status changes.

**Payload**:
```typescript
{
  connected: boolean;
  lastSync: string | null; // ISO timestamp of last successful sync
}
```

**Triggers**:
- Connection established
- Connection lost
- Successful sync after being offline

---

### `watcher-status-changed`

Emitted when log watcher starts or stops.

**Payload**:
```typescript
{
  active: boolean;
  watchingPath: string | null; // Directory being watched (if active)
}
```

---

### `import-progress`

Emitted during historical import to show progress.

**Payload**:
```typescript
{
  filesProcessed: number;
  totalFiles: number;
  currentFile: string;
  eventsFound: number;
}
```

**Usage**: Update progress bar in import wizard UI.

---

## Error Handling

All commands return errors as strings in the `error` field. Common error patterns:

**File System Errors**:
- `"Directory not found"`
- `"Permission denied"`
- `"Not a valid log directory"`

**Network Errors**:
- `"Failed to connect to Supabase"`
- `"Invalid credentials"`
- `"Network timeout"`

**Validation Errors**:
- `"Config validation failed: watchInterval must be >= 100"`

**Example Error Handling**:
```javascript
try {
  const result = await invoke('start_log_watcher', { logDirectory: path });
  if (!result.success) {
    throw new Error(result.error);
  }
} catch (error) {
  console.error('Failed to start watcher:', error);
  showErrorNotification(error.message);
}
```

---

## Performance Considerations

1. **Batch Events**: `log-line` events are high-frequency. Buffer in JavaScript before processing.
2. **Debounce Saves**: Don't call `save_app_config` on every keystroke. Debounce 500ms.
3. **Async Commands**: All commands are async. Use `await` or `.then()`.
4. **Event Cleanup**: Unlisten from events when component unmounts:
   ```javascript
   const unlisten = await listen('quest-completed', handler);
   // Later:
   unlisten();
   ```

---

## Testing Commands

Use Tauri DevTools to test commands:

```javascript
// Open DevTools console
await invoke('get_app_config');
await invoke('auto_detect_log_directory');
await invoke('get_sync_queue_status');
```

---

## Next Steps

1. Implement Rust command handlers in `src-tauri/src/main.rs`
2. Implement JavaScript command wrappers in `src/services/tauri-commands.js`
3. Add TypeScript types for all commands and events
4. Write integration tests for each command

**Conditional**: Proceed only after verifying quest events are logged.

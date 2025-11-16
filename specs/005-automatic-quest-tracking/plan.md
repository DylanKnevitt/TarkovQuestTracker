# Implementation Plan: Automatic Quest & Progress Tracking

**Branch**: `005-automatic-quest-tracking` | **Date**: 2025-01-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-automatic-quest-tracking/spec.md`

## Summary

Build a desktop companion app using Tauri that monitors Escape from Tarkov log files to automatically detect quest completions and sync progress to the web application in real-time. The app will also auto-decrement item quantities when quests requiring items are completed.

**Core Value**: Eliminates manual quest tracking, saving users 5-10 minutes per gaming session.

## Technical Context

**Language/Version**: TypeScript 5.x + Rust 1.75+ (Tauri backend)
**Primary Dependencies**: Tauri 1.5+, Supabase JS SDK, Tarkov.dev GraphQL API
**Storage**: Supabase PostgreSQL (quest_progress, item_collection tables)
**Testing**: Vitest (unit tests), manual integration testing
**Target Platform**: Windows (primary), macOS/Linux (secondary)
**Project Type**: Desktop app (new repo) + Web app integration
**Performance Goals**: <50MB RAM idle, <1% CPU idle, <5s sync latency
**Constraints**: Read-only access to game files, local-first processing
**Scale/Scope**: Single-user desktop app, ~5K lines of code, 8 screens/dialogs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Project constitution template is empty. Proceeding with standard best practices:

 **Incremental Development**: Implement in small, testable phases
 **Code Reuse**: Share models and utilities with web app
 **Error Handling**: Graceful degradation for all external dependencies
 **Documentation**: Document log format patterns and API integrations
 **Testing**: Unit tests for parsers, integration tests for sync engine

## Project Structure

### Documentation (this feature)

```text
specs/005-automatic-quest-tracking/
 plan.md              # This file (/speckit.plan command output)
 research.md          # Phase 0 output (/speckit.plan command)
 data-model.md        # Phase 1 output (/speckit.plan command)
 quickstart.md        # Phase 1 output (/speckit.plan command)
 contracts/           # Phase 1 output (/speckit.plan command)
    log-events.schema.json
 tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (new repository)

```text
tarkov-desktop-companion/
 src-tauri/
    src/
       main.rs              # Tauri entry point
       log_watcher.rs       # File watching (Rust)
       system_tray.rs       # System tray implementation
       auto_start.rs        # OS auto-start integration
    Cargo.toml
    tauri.conf.json
 src/
    index.html               # Main UI
    main.js                  # App initialization
    components/
       settings.js          # Settings UI
       import-wizard.js     # Historical import UI
       status-indicator.js  # Connection status
    services/
       log-parser.js        # Parse log events
       sync-engine.js       # Supabase sync
       settings-manager.js  # Config persistence
       import-service.js    # Historical import
    models/                  # Shared from web app
       quest.js
       item.js
    utils/
        tarkov-paths.js      # Detect game directory
        quest-mapper.js      # Map quest names to IDs
 tests/
    unit/
       log-parser.test.js
       quest-mapper.test.js
    integration/
        sync-engine.test.js
 package.json
 README.md
```

**Structure Decision**: New standalone Tauri app repository with shared code from web app (models, utilities). Desktop app operates independently but syncs via Supabase.

---

## Phase 0: Research & Data Gathering

**Goal**: Resolve all NEEDS CLARIFICATION items and research best practices

### Research Tasks

**R1: Tarkov Log Format Analysis** (4h)
- **Question**: What is the exact log format for quest completions?
- **Method**: Install Tarkov, complete test quest, examine log files
- **Deliverable**: Documented regex patterns for:
  - Quest completion events
  - Profile ID extraction
  - Timestamp format
  - Quest internal names vs display names
- **Output**: `research.md` section: "Log Format Specification"

**R2: Log Directory Detection** (2h)
- **Question**: Where are log files located across different installations?
- **Method**: Research Steam vs EFT Launcher paths, test on multiple PCs
- **Deliverable**: Path detection logic for:
  - Steam: `C:\Program Files (x86)\Steam\steamapps\common\Escape from Tarkov\Logs\`
  - EFT Launcher: `C:\Battlestate Games\EFT\Logs\`
  - macOS: `~/Library/Application Support/Battlestate Games/EFT/Logs/`
- **Output**: `research.md` section: "Installation Path Detection"

**R3: Tauri Best Practices** (3h)
- **Question**: What is the recommended architecture for Tauri apps with file watching?
- **Method**: Review Tauri docs, study similar apps (TarkovMonitor, log file monitors)
- **Deliverable**: Architecture decisions:
  - Rust vs JavaScript for file watching (choose Rust for performance)
  - IPC patterns between Rust and JS
  - State management approach (Zustand or vanilla JS)
  - System tray implementation strategy
- **Output**: `research.md` section: "Tauri Architecture"

**R4: Tarkov.dev API Integration** (2h)
- **Question**: How to efficiently query quest item requirements?
- **Method**: Test GraphQL queries, review API rate limits
- **Deliverable**: GraphQL query template:
  ```graphql
  query GetQuestItems($questId: ID!) {
    quest(id: $questId) {
      objectives {
        type
        items {
          id
          name
          count
        }
      }
    }
  }
  ```
- **Output**: `research.md` section: "Tarkov.dev API"

**R5: Quest Name Mapping** (3h)
- **Question**: How to map Tarkov internal quest names to Tarkov.dev IDs?
- **Method**: Extract quest names from logs, cross-reference with Tarkov.dev API
- **Deliverable**: Mapping strategy:
  - Direct ID match if available in logs
  - Fuzzy name matching with Levenshtein distance
  - Manual override mapping in config
- **Output**: `research.md` section: "Quest Identification"

**R6: Offline Queue Design** (2h)
- **Question**: How to handle sync failures and offline scenarios?
- **Method**: Research event sourcing patterns, study Supabase retry strategies
- **Deliverable**: Queue design:
  - Persist events to local Tauri store
  - Retry with exponential backoff
  - Conflict resolution (timestamp-based)
- **Output**: `research.md` section: "Sync Engine Design"

### Research Output: `research.md`

**Structure**:
```markdown
# Research: Automatic Quest Tracking

## Log Format Specification
[R1 findings]

## Installation Path Detection
[R2 findings]

## Tauri Architecture
[R3 findings]

## Tarkov.dev API
[R4 findings]

## Quest Identification
[R5 findings]

## Sync Engine Design
[R6 findings]

## Technology Decisions

| Decision | Chosen | Rationale | Alternatives Considered |
|----------|--------|-----------|------------------------|
| Desktop Framework | Tauri | Smaller bundle (3MB vs 50MB Electron), Rust performance | Electron, NW.js |
| File Watching | Rust `notify` crate | Native performance, async | JS chokidar |
| State Management | Vanilla JS | Simple app, avoid overhead | Zustand, Redux |
| Database Sync | Supabase Realtime | Already used in web app | Custom WebSocket |
```

---

## Phase 1: Design & Contracts

**Goal**: Define data models, API contracts, and developer quickstart

### Design Tasks

**D1: Data Model** (2h)
- Define event structures:
  - `QuestCompletedEvent`
  - `QuestTurnInEvent`
- Define config schema:
  - `AppConfig` (log dir, Supabase credentials, preferences)
- Define sync queue schema:
  - `SyncQueueEntry` (event, retryCount, lastAttempt)
- **Output**: `data-model.md`

**D2: API Contracts** (2h)
- Document Rust-to-JS IPC contract (Tauri commands)
- Document Supabase table updates (SQL operations)
- Document Tarkov.dev API queries
- **Output**: `contracts/log-events.schema.json`, `contracts/ipc-commands.md`

**D3: Quickstart Guide** (2h)
- Write developer setup instructions:
  - Install Rust + Tauri CLI
  - Clone repo, npm install
  - Run dev mode: `npm run tauri dev`
  - Build installer: `npm run tauri build`
- **Output**: `quickstart.md`

**D4: Agent Context Update** (1h)
- Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
- Add Tauri framework to technology list
- Add Rust language context
- Add desktop app patterns
- **Output**: Updated `.github/copilot-instructions.md` or `.vscode/copilot-context.md`

### Design Outputs

**`data-model.md`**:
```markdown
# Data Model: Automatic Quest Tracking

## Event Structures

### QuestCompletedEvent
```typescript
interface QuestCompletedEvent {
  type: "QUEST_COMPLETED";
  timestamp: Date;
  profileId: string;
  questId: string;          // Tarkov.dev quest ID
  questInternalName: string; // From log file
}
```

### QuestTurnInEvent
```typescript
interface QuestTurnInEvent {
  type: "QUEST_TURN_IN";
  timestamp: Date;
  profileId: string;
  questId: string;
  items: Array<{
    itemId: string;        // Tarkov.dev item ID
    quantity: number;
  }>;
}
```

## Configuration Schema

### AppConfig
```typescript
interface AppConfig {
  logDirectory: string;       // Auto-detected or manual
  autoStart: boolean;
  notifications: {
    enabled: boolean;
    sound: boolean;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  profileId: string;         // User'\''s Tarkov profile ID
}
```

## Sync Queue Schema

### SyncQueueEntry
```typescript
interface SyncQueueEntry {
  id: string;
  event: QuestCompletedEvent | QuestTurnInEvent;
  retryCount: number;
  lastAttempt: Date | null;
  status: "pending" | "syncing" | "failed" | "completed";
}
```
```

**`contracts/log-events.schema.json`**:
```json
{
  "logPatterns": {
    "questCompleted": {
      "regex": "^\\[\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}\\] \\[INFO\\] Quest completed: (.+) \\((.+)\\)$",
      "groups": ["questName", "questId"]
    }
  },
  "ipcCommands": {
    "start_log_watcher": {
      "input": { "logDirectory": "string" },
      "output": { "success": "boolean", "error": "string?" }
    },
    "get_app_config": {
      "input": {},
      "output": "AppConfig"
    }
  }
}
```

**`quickstart.md`**:
```markdown
# Quickstart: Desktop Companion Development

## Prerequisites
- Rust 1.75+
- Node.js 18+
- Tauri CLI: `cargo install tauri-cli`

## Setup
```bash
git clone https://github.com/user/tarkov-desktop-companion.git
cd tarkov-desktop-companion
npm install
```

## Run Development Mode
```bash
npm run tauri dev
```

## Build Installer
```bash
npm run tauri build
```

## Testing
```bash
npm test                  # Run unit tests
npm run test:integration  # Run integration tests
```
```

---

## Constitution Check (Post-Design)

**Re-evaluation after Phase 1 design**:

 **No violations detected**
- Single new repository (desktop app)
- Reuses web app models (DRY principle)
- Standard Tauri architecture (no over-engineering)
- Clear separation of concerns (Rust for file I/O, JS for business logic)

---

## Estimated Effort

**Phase 0 (Research)**: ~16 hours
**Phase 1 (Design)**: ~7 hours
**Phase 2 (Implementation)**: ~57 hours (tracked in tasks.md)

**Total Planning Phase**: ~23 hours

---

## Next Steps

1.  Specification complete and clarified
2.  Implementation plan created (this file)
3.  **Execute Phase 0** - Generate `research.md`
4.  **Execute Phase 1** - Generate `data-model.md`, `contracts/`, `quickstart.md`
5.  **Update agent context** - Run `update-agent-context.ps1`
6.  **Execute `/speckit.tasks`** - Generate detailed task breakdown for Phase 2

---

**Status**: Ready for Phase 0 research
# Feature Specification: Automatic Quest & Progress Tracking

**Feature ID**: 005  
**Feature Name**: Automatic Quest & Progress Tracking  
**Branch**: `005-automatic-quest-tracking`  
**Created**: 2025-11-16  
**Status**: Specification Phase

---

## Overview

Enable automatic detection and tracking of quest completions, hideout upgrades, and item collection by monitoring Escape from Tarkov game log files, similar to TarkovMonitor but integrated as an optional desktop companion app using the existing web technology stack.

## Problem Statement

Currently, users must manually mark quests as complete, hideout modules as built, and items as collected in the web application. This creates friction in the user experience and leads to outdated progress tracking. Users want their tracker to automatically stay in sync with their in-game progress without manual intervention.

## Goals

1. **Automatic Quest Completion Detection**: Detect when quests are completed in-game and automatically mark them complete in the tracker
2. **Hideout Progress Sync**: Detect hideout module constructions and mark them as built
3. **Item Collection Tracking**: Track flea market sales and stash changes to update item quantities
4. **Real-time Web Sync**: Push detected changes to the web application in real-time
5. **Non-intrusive**: Desktop app runs in system tray, minimal resource usage
6. **Privacy-focused**: All log parsing happens locally, only syncs to user's own database

## Non-Goals

- **Not a memory scanner or game modifier** - Only reads publicly available log files
- **Not required to use the web app** - Web app continues to work standalone
- **No screenshot OCR** - Relies solely on log file parsing
- **No real-time in-raid features** - Logs only update between raids
- **No competitive advantage** - Only tracks information already visible to the player

## User Stories

### US1: Automatic Quest Completion
**As a** player  
**I want** my quests to automatically mark as complete when I finish them in-game  
**So that** I don't have to manually update my progress in the tracker

**Acceptance Criteria**:
- When I complete a quest in Tarkov, the desktop app detects it from log files
- The quest is automatically marked complete in my web tracker within 5 seconds
- A subtle notification confirms the quest was detected (optional, user preference)
- Historical quest completions can be imported from past log files

### US2: Hideout Build Detection
**As a** player  
**I want** hideout modules to automatically mark as built when I construct them  
**So that** my hideout progress stays in sync without manual entry

**Acceptance Criteria**:
- When I complete a hideout upgrade, the desktop app detects it
- The module is marked as built in the web tracker
- Item priorities automatically recalculate based on new hideout status
- [NEEDS CLARIFICATION: How to handle cases where logs don't capture hideout builds?]

### US3: Offline Log Parsing
**As a** player returning after a break  
**I want** to import my quest progress from historical log files  
**So that** I can catch up my tracker without manual entry

**Acceptance Criteria**:
- Desktop app provides "Import Past Progress" button
- User selects wipe date/profile to start from
- App parses all log files from that point forward
- Progress is batched and synced to web tracker
- User sees progress bar during import

### US4: Desktop App Setup
**As a** new user  
**I want** easy setup for the desktop companion  
**So that** I can start using automatic tracking quickly

**Acceptance Criteria**:
- Download installer from releases page (Windows, Mac, Linux)
- App auto-detects Tarkov installation and log directory
- User logs in with same Supabase credentials as web app
- Connection status indicator shows when web app is synced
- Manual log directory selection if auto-detect fails

### US5: System Tray Operation
**As a** player  
**I want** the desktop app to run unobtrusively in the background  
**So that** it doesn't interfere with gameplay

**Acceptance Criteria**:
- App minimizes to system tray (not taskbar)
- System tray icon shows connection status (green/yellow/red)
- Right-click menu provides: Open Web App, Settings, Import Progress, Quit
- Starts with Windows option (optional, default off)
- Uses < 50MB RAM when idle

## Functional Requirements

### FR1: Log File Monitoring
- Monitor Tarkov log directory for new log entries
- Parse log entries in real-time as they're written
- Support log rotation and multiple log files
- Handle log file format changes gracefully
- Detect profile ID to support multi-account users

### FR2: Quest Detection
- Parse quest completion events from logs
- Extract quest ID, quest name, and completion timestamp
- Map quest names to Tarkov.dev API quest IDs
- Handle multi-objective quests (mark complete only when all objectives done)
- Detect quest turn-ins vs objective completions

### FR3: Hideout Detection
- [NEEDS CLARIFICATION: Are hideout builds logged? If not, how to handle?]
- Parse hideout construction completion events (if available)
- Extract station ID and level from logs
- Map to hideout module keys used in web app

### FR4: Web Application Sync
- Establish WebSocket connection to Supabase Realtime
- Push detected changes to user's database via Supabase client
- Handle offline scenarios (queue changes, sync when reconnected)
- Conflict resolution: log event timestamp always wins over manual edits
- Support manual refresh/re-sync button

### FR5: Settings & Configuration
- Auto-detect Tarkov installation directory (Steam, EFT launcher locations)
- Manual log directory path override
- Enable/disable specific tracking features (quests, hideout, items)
- Notification preferences (sound, visual, none)
- Auto-start with Windows toggle
- Wipe date selection for historical import

### FR6: Historical Import
- Scan log directory for all log files since selected date
- Parse logs in chronological order
- Extract all quest completions, hideout builds, item changes
- Batch sync to database (progress bar UI)
- Prevent duplicate imports with import checkpoint tracking

## Success Criteria

1. **Accuracy**: > 98% accurate quest detection (compared to manual tracking)
2. **Performance**: < 100ms log parsing latency per event
3. **Resource Usage**: < 50MB RAM, < 1% CPU when idle
4. **Sync Speed**: Changes appear in web app < 5 seconds after log event
5. **User Satisfaction**: Users report significant time savings vs manual tracking

## Technical Constraints

- **Technology Stack**: Must use JavaScript/TypeScript (Electron or Tauri)
- **Existing Codebase**: Reuse web app models, API clients, and Supabase integration
- **Cross-platform**: Support Windows (primary), Mac and Linux (secondary)
- **No BSG APIs**: Cannot use official game APIs (none exist), only log files
- **No Game Modification**: Read-only access to log files, no game memory access

## Dependencies & Assumptions

### Dependencies
- Tarkov game must be installed and log files accessible
- User must have Supabase account configured (same as web app)
- Web app must be version 004 or higher (hideout tracking support)
- Tarkov.dev API for quest ID mapping

### Assumptions
- Log file format remains relatively stable between game patches
- Users grant file system read access to log directory
- Log events contain enough information to uniquely identify quests/hideout
- Users want automatic tracking (opt-in feature, not mandatory)
- [NEEDS CLARIFICATION: Do logs include hideout construction events?]

## Key Entities

### Desktop App Models

**LogWatcher**
- Monitors log directory for file changes
- Reads new log lines in real-time
- Emits parsed events to handlers

**LogParser**
- Parses raw log lines into structured events
- Detects event types (quest complete, hideout build, etc.)
- Extracts relevant data (IDs, timestamps, profile)

**SyncEngine**
- Manages connection to Supabase
- Queues detected events when offline
- Syncs events to user's database
- Handles conflict resolution

**SettingsManager**
- Persists app configuration to local file
- Provides settings UI
- Validates user inputs (directory paths, credentials)

**ImportService**
- Scans historical log files
- Parses logs in batch mode
- Tracks import checkpoints to prevent duplicates

### Log Event Types

**QuestCompletedEvent**
```typescript
{
  eventType: 'questCompleted',
  questId: string,        // Tarkov internal ID
  questName: string,      // Human-readable name
  timestamp: Date,
  profileId: string       // Support multi-account
}
```

**HideoutBuiltEvent** (if available in logs)
```typescript
{
  eventType: 'hideoutBuilt',
  stationId: string,
  level: number,
  timestamp: Date,
  profileId: string
}
```

**ItemChangedEvent** (future enhancement)
```typescript
{
  eventType: 'itemChanged',
  itemId: string,
  quantityDelta: number,
  reason: 'flea_sale' | 'quest_turnin' | 'stash_change',
  timestamp: Date
}
```

## User Experience

### Installation Flow
1. Download `TarkovQuestTracker-Desktop-Setup.exe` from releases
2. Run installer, choose install location
3. App launches, shows setup wizard
4. Auto-detects Tarkov directory, user confirms or overrides
5. User logs in with Supabase credentials (same as web app)
6. App tests connection to web app database
7. Setup complete, app minimizes to system tray
8. Optional: Run "Import Past Progress" for historical quests

### Daily Usage Flow
1. Player launches Tarkov, desktop app is running in background
2. Player completes quests during gameplay session
3. After raid, Tarkov writes to log files
4. Desktop app parses new log entries
5. Detected quest completions sync to database
6. Web app automatically updates via Realtime subscriptions
7. Player opens web tracker to see updated progress (no manual entry)

### Settings UI Flow
- System tray icon → Right-click → Settings
- Settings window with tabs:
  - **General**: Log directory, auto-start, notifications
  - **Account**: Supabase connection, profile selection
  - **Tracking**: Enable/disable features (quests, hideout, items)
  - **Import**: Historical progress import, wipe date selection
  - **About**: Version, links to GitHub, support

## Edge Cases

1. **Multiple Accounts**: Log parser detects profile ID and only syncs for configured profile
2. **Corrupted Logs**: Parser skips unparseable lines, logs error for debugging
3. **Network Offline**: Events queue locally, sync when connection restored
4. **Quest Name Changes**: Maintain mapping table for quest ID → Tarkov.dev ID
5. **App Closed During Raid**: Next launch parses missed log entries
6. **Manual vs Auto Updates**: Timestamp comparison - newer event always wins
7. **Wipe Reset**: User selects new wipe date, clears old progress, starts fresh import

## Security & Privacy

- **No Cloud Processing**: All log parsing happens on user's local machine
- **User Data Ownership**: Only syncs to user's own Supabase account
- **No Telemetry**: No usage data or analytics collected (optional opt-in for error reporting)
- **Credentials Security**: Uses Supabase Auth SDK, credentials never sent to third parties
- **Read-Only Access**: Only reads log files, never writes to game directory
- **Open Source**: Code is public on GitHub for transparency

## Implementation Notes

### Technology Choice: Electron vs Tauri

**Recommendation: Tauri**
- Pros: Smaller bundle size (~3MB vs ~150MB), lower memory usage, uses system WebView
- Cons: Less mature, smaller ecosystem
- Decision: Start with Tauri, fallback to Electron if compatibility issues

### Code Reuse Strategy
- Share TypeScript models from web app (Quest, HideoutModule, Item)
- Reuse Supabase client configuration
- Import API type definitions from Tarkov.dev
- Desktop app acts as "headless browser" that can render web app UI

### Log File Format Research Needed
- [ ] Document log file location for Steam vs EFT Launcher installations
- [ ] Identify log line patterns for quest completions
- [ ] Verify if hideout construction events are logged
- [ ] Test with multiple game versions for format stability
- [ ] Create regex patterns for each event type

### Sync Architecture
```
Desktop App (Tauri)
  ├── LogWatcher (Rust/JS)
  ├── LogParser (JS - reuse web models)
  ├── Supabase Client (shared config)
  └── System Tray UI (HTML/CSS/JS)

Web App (Vite)
  ├── Supabase Realtime Subscription
  ├── Auto-refresh on remote updates
  └── "Synced via Desktop App" indicator
```

## Clarification Questions

1. **Hideout Logging**: Does the Tarkov game log hideout construction events? TarkovMonitor FAQ says "no log events for hideout stations". If true, should we:
   - Skip hideout auto-tracking entirely?
   - Prompt user to manually mark after construction?
   - Use alternative detection (stash value changes)?

2. **Item Tracking Scope**: For item collection tracking, should we:
   - Track flea market sales only?
   - Track all stash changes?
   - Skip item tracking for v1 (quests only)?

3. **Multi-User Households**: If multiple people use same computer with different Tarkov accounts, how to handle?
   - Profile selection in app settings?
   - Auto-detect based on logged-in Windows user?
   - Separate desktop app instances?

## Future Enhancements

- **V2: Item Tracking**: Parse flea market sales, quest turn-ins to auto-update item quantities
- **V3: Map Detection**: Detect which map player loaded into, auto-load map on web app
- **V4: Raid Timer**: Display raid duration and runthrough timer in overlay
- **V5: Statistics**: Track map play frequency, survival rate, quest completion rate
- **V6: Goon Tracking**: Detect Goon sightings, submit to community database
- **V7: Mobile App**: iOS/Android app for remote progress viewing

## Related Documentation

- TarkovMonitor Repository: https://github.com/the-hideout/TarkovMonitor
- Tarkov.dev API: https://tarkov.dev/api/
- Supabase Realtime Docs: https://supabase.com/docs/guides/realtime
- Tauri Framework: https://tauri.app/
- Electron Alternative: https://www.electronjs.org/

---

**Next Steps**:
1. Research Tarkov log file format and quest event patterns
2. Verify hideout logging capabilities
3. Create technical design document
4. Set up Tauri project structure
5. Implement log parser with test cases

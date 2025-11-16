# Tarkov Quest Companion - Desktop App

Automatic quest tracking desktop companion for Escape from Tarkov that monitors game log files and syncs progress to the web tracker.

## Features

- 🎯 **Automatic Quest Detection** - Monitors `notifications.log` for quest completions in real-time
- 🔄 **Real-time Sync** - Syncs quest progress to existing web app database via Supabase
- 📜 **Historical Import** - Batch import past completions from old log files
- 🖥️ **System Tray** - Runs quietly in background, minimize to tray
- 🔔 **Desktop Notifications** - Get notified when quests complete or fail
- 🧙 **Setup Wizard** - Easy first-run configuration with auto-detection
- ⚡ **Lightweight** - <50MB RAM, minimal CPU usage

## Current Status

✅ **Phase 1-5, 7**: Fully implemented and functional
- Project setup, Rust backend, UI components
- Real-time quest tracking and database sync
- Historical import wizard
- System tray integration

🚧 **Phase 6**: Quest item tracking (not implemented)
🚧 **Phase 8**: Testing and optimization (ongoing)

## Quick Start

See [quickstart.md](../specs/005-automatic-quest-tracking/quickstart.md) for detailed setup instructions.

### Prerequisites

- Node.js 18+
- Rust 1.75+ (installed via rustup)
- Escape from Tarkov installed

### Development

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run tauri dev

# Build for production
npm run tauri build
```

## How It Works

1. **Log Monitoring**: Uses Rust `notify` crate to watch `notifications.log` for file changes
2. **Event Detection**: Parses ChatMessageReceived events with MessageType 10-12:
   - **10**: TaskStarted - Quest accepted
   - **11**: TaskFailed - Quest failed
   - **12**: TaskFinished - Quest completed ✓
3. **Quest ID Extraction**: Parses `templateId` field (format: "questId arg1 arg2...")
4. **Database Sync**: Upserts to existing `quest_progress` table (same as web app)
5. **Notifications**: Shows desktop notifications for quest events (if enabled)

## Architecture

- **Backend (Rust)**: File watching, system tray, IPC commands
- **Frontend (TypeScript)**: UI, log parsing, API calls, sync engine
- **Communication**: Tauri IPC (commands + events)
- **Storage**: Tauri plugin-store for configuration

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

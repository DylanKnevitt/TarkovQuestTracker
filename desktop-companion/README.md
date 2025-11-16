# Tarkov Quest Companion - Desktop App

Automatic quest tracking desktop companion for Escape from Tarkov that monitors game log files and syncs progress to the web tracker.

## Features

- 🎯 **Automatic Quest Detection** - Monitors `notifications.log` for quest completions
- 🔄 **Real-time Sync** - Pushes quest progress to web app via Supabase
- 📦 **Item Tracking** - Auto-decrements quest item quantities
- 📜 **Historical Import** - Process past log files to catch up progress
- 🖥️ **System Tray** - Runs quietly in background
- ⚡ **Lightweight** - <50MB RAM, <1% CPU idle

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

1. **Log Monitoring**: Uses Rust `notify` crate to watch `notifications.log`
2. **Event Detection**: Parses chat messages with MessageType 10-12 (TaskStarted/Failed/Finished)
3. **Quest Mapping**: Extracts quest ID from `templateId` field
4. **Web Sync**: Updates Supabase database via same credentials as web app
5. **Item Updates**: Queries Tarkov.dev API for quest item requirements and decrements quantities

## Architecture

- **Backend (Rust)**: File watching, system tray, IPC commands
- **Frontend (TypeScript)**: UI, log parsing, API calls, sync engine
- **Communication**: Tauri IPC (commands + events)
- **Storage**: Tauri plugin-store for configuration

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

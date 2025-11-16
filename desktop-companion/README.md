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

## Troubleshooting

### Log Directory Not Found

**Problem**: App can't find Tarkov log directory

**Solutions**:
1. Click "Auto-Detect" in setup wizard
2. Manually browse to:
   - **Default**: `C:\Battlestate Games\BsgLauncher\logs`
   - **Alternative**: Check game launcher settings for custom install path
3. Verify `notifications.log` exists in the directory

### Connection Test Failed

**Problem**: Can't connect to Supabase database

**Solutions**:
1. Verify Supabase URL format: `https://[project-ref].supabase.co`
2. Use the **anon/public key** (not service_role key)
3. Check internet connection
4. Verify you're logged into web app at least once (creates profile)
5. Check browser console for CORS or authentication errors

### No Quest Events Detected

**Problem**: App runs but doesn't detect quest completions

**Solutions**:
1. Verify you're in-game and actively completing quests
2. Check `notifications.log` is being updated (file timestamp)
3. Restart app after completing a quest
4. Check console logs for parsing errors
5. Verify notifications.log contains "ChatMessageReceived" entries

### Historical Import Shows 0 Quests

**Problem**: Import wizard finds no quests in old logs

**Solutions**:
1. Select the correct logs directory (contains multiple .log files)
2. Verify old log files contain quest event data
3. Check that log files are readable (not locked)
4. Try importing from a different date range

### App Won't Start

**Problem**: Application crashes on launch

**Solutions**:
1. Check you have Rust installed: `rustc --version`
2. Reinstall dependencies: `npm install`
3. Clear Tauri store: Delete `%APPDATA%/com.tarkovquest.companion/` folder
4. Run from terminal to see error messages: `npm run tauri dev`
5. Check antivirus isn't blocking the app

### High CPU/Memory Usage

**Problem**: App consuming too many resources

**Solutions**:
1. Check log file size (very large files slow down parsing)
2. Disable notifications if not needed
3. Restart app (clears circular buffer)
4. Update to latest version (performance improvements)

### Desktop Notifications Not Appearing

**Problem**: No notification popups for quest events

**Solutions**:
1. Enable notifications in Settings
2. Check OS notification permissions (Windows Settings → Notifications)
3. Verify app is allowed to show notifications
4. Test with a quest completion in-game

## Configuration Files

- **Settings**: Stored via Tauri plugin-store
  - Windows: `%APPDATA%\com.tarkovquest.companion\`
  - macOS: `~/Library/Application Support/com.tarkovquest.companion/`
  - Linux: `~/.config/com.tarkovquest.companion/`

## Performance

- **Memory**: <50MB RAM idle, ~100MB during active sync
- **CPU**: <1% idle, ~5% during file changes
- **Disk**: Minimal (reads last 10KB of log file only)
- **Network**: Only syncs on quest events (~1KB per event)

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

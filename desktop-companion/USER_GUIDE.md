# Tarkov Quest Companion - User Guide

Complete guide for installing, configuring, and using the automatic quest tracking desktop companion.

## Table of Contents

1. [Installation](#installation)
2. [First-Time Setup](#first-time-setup)
3. [Using the App](#using-the-app)
4. [Historical Import](#historical-import)
5. [Settings](#settings)
6. [Troubleshooting](#troubleshooting)

---

## Installation

### Windows

1. Download `Tarkov-Quest-Companion-Setup.exe` from the latest release
2. Run the installer (Windows may show a security warning - click "More info" → "Run anyway")
3. Follow the installation wizard
4. Launch the app from Start Menu or Desktop shortcut

### macOS

1. Download `Tarkov-Quest-Companion.dmg` from the latest release
2. Open the DMG file
3. Drag the app to your Applications folder
4. Right-click the app and select "Open" (first time only, bypasses Gatekeeper)
5. Launch normally from Applications afterward

### Linux

**Debian/Ubuntu (.deb)**:
```bash
sudo dpkg -i tarkov-quest-companion_*.deb
sudo apt-get install -f  # Install dependencies if needed
```

**AppImage**:
```bash
chmod +x Tarkov-Quest-Companion-*.AppImage
./Tarkov-Quest-Companion-*.AppImage
```

---

## First-Time Setup

### Step 1: Welcome Screen

When you first launch the app, you'll see the setup wizard.

### Step 2: Tarkov Log Directory

**Option A: Auto-Detect (Recommended)**
1. Click "Auto-Detect"
2. App searches common installation paths
3. If found, path appears automatically

**Option B: Manual Selection**
1. Click "Browse"
2. Navigate to your Tarkov installation
3. Find the logs directory (usually `BsgLauncher/logs`)

**Default Paths**:
- Standard: `C:\Battlestate Games\BsgLauncher\logs`
- Custom: Check your launcher settings

**Validation**:
- Click "Validate" to verify the directory contains log files
- Green checkmark ✓ means valid

### Step 3: Supabase Connection

You need Supabase credentials from the web app setup:

1. **Supabase URL**: `https://[your-project-ref].supabase.co`
2. **API Key**: Your anon/public key (NOT service_role key)

**Where to find credentials**:
- Open the web app's README
- Check your Supabase project dashboard
- Settings → API → Project URL & anon key

**Test Connection**:
- Click "Test Connection"
- Wait for green success message
- If failed, verify credentials and internet connection

### Step 4: Preferences

Configure optional settings:

- **Notifications**: Enable/disable desktop popups for quest events
- **Sync Enabled**: Toggle automatic database sync (keep ON for normal use)

### Step 5: Complete Setup

Click "Complete Setup" to save and launch the main app.

---

## Using the App

### Main Window

The main window shows your connection status and recent activity.

**Status Indicators**:
- 🟢 **Connected**: Watching logs and syncing
- 🟡 **Syncing**: Uploading quest data
- 🔴 **Disconnected**: Not connected to database

**System Tray**:
- App minimizes to system tray (near clock)
- Right-click tray icon for menu:
  - **Show**: Open main window
  - **Settings**: Edit configuration
  - **Import**: Historical import wizard
  - **Quit**: Close app completely

### Real-Time Tracking

**How it works**:
1. Play Escape from Tarkov
2. Complete or fail quests
3. App detects changes in `notifications.log`
4. Automatically syncs to database
5. Shows desktop notification (if enabled)

**What gets tracked**:
- ✅ Quest Completed (MessageType 12)
- ❌ Quest Failed (MessageType 11)
- 📋 Quest Started (MessageType 10) - logged but not synced

### Desktop Notifications

When a quest event occurs, you'll see a popup notification:

- **Title**: "Quest Completed" or "Quest Failed"
- **Body**: Quest ID (e.g., "5936d90786f7742b1420ba5b")
- **Duration**: 5 seconds

**Disable notifications**:
- Open Settings
- Uncheck "Enable Notifications"
- Save

---

## Historical Import

Import past quest completions from old log files.

### When to use

- First time using the app (import previous progress)
- After reinstalling Tarkov (logs got archived)
- Recovering from backup logs

### How to import

1. **Open Import Wizard**:
   - System tray → "Import"
   - Or from Settings → "Import History"

2. **Select Directory**:
   - Click "Select Directory"
   - Choose folder containing old log files
   - Can be current logs folder or archived logs

3. **Scan Logs**:
   - Click "Scan Logs"
   - App reads all .log files in directory
   - Shows count of unique quests found
   - Displays quest list (scrollable)

4. **Import to Database**:
   - Review the quest list
   - Click "Import to Database"
   - Progress bar shows import status
   - Quests imported in batches of 50
   - Duplicates are automatically skipped (upsert)

5. **Complete**:
   - Green success message when done
   - Close window or import from another directory

### Notes

- Import is **safe** - won't create duplicates
- Large log files may take a minute to scan
- Only completed quests (MessageType 12) are imported
- Failed quests (MessageType 11) are not imported

---

## Settings

Access via system tray → "Settings" or main window menu.

### Log Directory

- **Path**: Current directory being monitored
- **Auto-Detect**: Find Tarkov logs automatically
- **Browse**: Manually select directory
- **Validate**: Verify directory contains valid log files

### Supabase Connection

- **URL**: Your Supabase project URL
- **API Key**: Anon/public key for authentication
- **Test Connection**: Verify credentials work

### Preferences

- **Enable Notifications**: Show desktop popups for quest events
- **Sync Enabled**: Automatically upload quest data to database
- **Auto-Start**: Launch app when Windows starts (optional)

### Saving Changes

- Click "Save Settings" to apply
- Click "Cancel" to discard changes
- App will restart log watcher with new settings

---

## Troubleshooting

### "Log directory not found"

**Cause**: Invalid or moved log directory

**Fix**:
1. Go to Settings
2. Click "Auto-Detect" to find logs again
3. Or browse to correct directory manually
4. Make sure directory contains `notifications.log`

### "Connection test failed"

**Cause**: Invalid Supabase credentials or no internet

**Fix**:
1. Verify URL format: `https://xxxxx.supabase.co`
2. Copy anon key (NOT service_role key)
3. Check internet connection
4. Make sure you're logged into web app at least once

### "No quest events detected"

**Cause**: Logs aren't being updated or parsing issue

**Fix**:
1. Complete a quest in-game to generate new log entry
2. Check `notifications.log` file timestamp (should be recent)
3. Restart the app
4. Check app console for errors (F12 in dev mode)

### "Import shows 0 quests"

**Cause**: Wrong directory or no quest events in logs

**Fix**:
1. Make sure you selected the logs directory (not game root)
2. Try a different date range or log file
3. Verify old logs contain quest data (open in text editor, search for "TaskFinished")

### App uses too much CPU/RAM

**Cause**: Large log files or memory leak

**Fix**:
1. Restart the app (clears circular buffer)
2. Archive old log files (Tarkov creates new ones)
3. Disable notifications if not needed
4. Update to latest app version

### Can't minimize to tray

**Cause**: Tray icon setting or OS issue

**Fix**:
1. Close app completely (system tray → Quit)
2. Relaunch from Start Menu/Applications
3. Check taskbar settings allow system tray icons

---

## Keyboard Shortcuts

- **Ctrl+Q**: Quit app
- **Ctrl+,**: Open settings (future feature)
- **F12**: Open developer tools (dev mode only)

---

## Data Storage

### Configuration

Settings are stored securely:
- **Windows**: `%APPDATA%\com.tarkovquest.companion\`
- **macOS**: `~/Library/Application Support/com.tarkovquest.companion/`
- **Linux**: `~/.config/com.tarkovquest.companion/`

### Database

Quest progress syncs to Supabase cloud database:
- Table: `quest_progress`
- Primary key: `(user_id, quest_id)`
- Shared with web app (single source of truth)

---

## Privacy & Security

- **Local Only**: Log files never leave your computer
- **Encrypted**: Supabase API calls use HTTPS
- **Minimal Data**: Only quest IDs and timestamps synced
- **No Telemetry**: App doesn't track usage or send analytics

---

## Getting Help

- **Issues**: https://github.com/DylanKnevitt/TarkovQuestTracker/issues
- **Discussions**: GitHub Discussions tab
- **Discord**: [Link if available]

---

## Uninstallation

### Windows

1. Settings → Apps → Tarkov Quest Companion → Uninstall
2. Manually delete config folder: `%APPDATA%\com.tarkovquest.companion\`

### macOS

1. Drag app from Applications to Trash
2. Delete config: `~/Library/Application Support/com.tarkovquest.companion/`

### Linux

```bash
# Debian/Ubuntu
sudo apt remove tarkov-quest-companion

# AppImage
rm Tarkov-Quest-Companion-*.AppImage
rm -rf ~/.config/com.tarkovquest.companion/
```

---

**Version**: 1.0.0  
**Last Updated**: November 2025

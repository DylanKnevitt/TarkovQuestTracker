# Quickstart: Desktop Companion Development

**Feature**: 005 - Automatic Quest & Progress Tracking  
**Target**: Developers setting up local development environment  
**Status**: Phase 1 - Design

---

## ⚠️ Important Note

**This feature requires verification that Escape from Tarkov logs quest completion events to accessible log files.** Before investing significant development effort, complete Phase 0 research to confirm log file viability.

If quest events are NOT logged, this quickstart will need to be adapted for alternative approaches (browser extension, screenshot OCR, etc.).

---

## Prerequisites

### Required Software

| Tool | Version | Purpose | Download |
|------|---------|---------|----------|
| **Rust** | 1.75+ | Tauri backend | [rustup.rs](https://rustup.rs/) |
| **Node.js** | 18+ | JavaScript runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | 9+ | Package manager | Included with Node.js |
| **Git** | Latest | Version control | [git-scm.com](https://git-scm.com/) |
| **Tauri CLI** | Latest | Build toolchain | See installation below |
| **VS Code** (recommended) | Latest | IDE | [code.visualstudio.com](https://code.visualstudio.com/) |

### Platform-Specific Dependencies

**Windows**:
- Microsoft Visual Studio C++ Build Tools
- Windows SDK

**macOS**:
- Xcode Command Line Tools: `xcode-select --install`

**Linux (Debian/Ubuntu)**:
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

---

## Installation

### 1. Install Rust

```powershell
# Windows (PowerShell)
irm https://win.rustup.rs/x86_64 | iex
```

```bash
# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Verify installation:
```bash
rustc --version
cargo --version
```

### 2. Install Tauri CLI

```bash
cargo install tauri-cli
```

Verify:
```bash
cargo tauri --version
```

### 3. Clone Repository

**Option A: New Standalone Repository** (Recommended)

```bash
git clone https://github.com/yourusername/tarkov-desktop-companion.git
cd tarkov-desktop-companion
```

**Option B: Monorepo with Web App** (If sharing codebase)

```bash
cd TarkovQuest
mkdir desktop-app
cd desktop-app
```

### 4. Install Dependencies

```bash
npm install
```

---

## Project Structure Setup

If creating a new Tauri project from scratch:

```bash
# Create new Tauri app
npm create tauri-app@latest

# Follow prompts:
# - App name: tarkov-desktop-companion
# - Window title: Tarkov Quest Tracker
# - UI recipe: Vanilla (or your preference)
# - TypeScript: Yes
```

Recommended project structure (see plan.md for details):
```
tarkov-desktop-companion/
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── log_watcher.rs
│   │   └── system_tray.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                 # JavaScript frontend
│   ├── index.html
│   ├── main.js
│   ├── components/
│   ├── services/
│   └── models/
├── tests/
├── package.json
└── README.md
```

---

## Development Workflow

### Running in Development Mode

Start the app with hot-reload:

```bash
npm run tauri dev
```

This will:
1. Build the Rust backend
2. Start the frontend dev server
3. Launch the desktop app
4. Enable hot-reload for frontend changes

**First run**: May take 5-10 minutes to compile Rust dependencies. Subsequent runs are much faster (~30 seconds).

### Building for Production

Create a distributable installer:

```bash
npm run tauri build
```

Output locations:
- **Windows**: `src-tauri/target/release/bundle/msi/TarkovQuestTracker_*.msi`
- **macOS**: `src-tauri/target/release/bundle/dmg/TarkovQuestTracker_*.dmg`
- **Linux**: `src-tauri/target/release/bundle/deb/tarkov-quest-tracker_*.deb`

---

## Development Tools

### VS Code Extensions (Recommended)

```bash
# Install recommended extensions
code --install-extension rust-lang.rust-analyzer
code --install-extension tauri-apps.tauri-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
```

### Debugging Rust Code

**VS Code launch.json**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Tauri Development Debug",
      "cargo": {
        "args": [
          "build",
          "--manifest-path=./src-tauri/Cargo.toml",
          "--no-default-features"
        ]
      },
      "preLaunchTask": "ui:dev"
    }
  ]
}
```

### Debugging JavaScript Code

Open DevTools in development mode:
- **Windows/Linux**: `Ctrl+Shift+I`
- **macOS**: `Cmd+Option+I`

Or programmatically:
```javascript
import { invoke } from '@tauri-apps/api/tauri';

// Open DevTools
await invoke('tauri_open_devtools');
```

---

## Testing

### Unit Tests (JavaScript)

```bash
npm test
```

Configuration in `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### Integration Tests

```bash
npm run test:integration
```

Tests located in `tests/integration/`.

### Manual Testing Checklist

- [ ] App starts and shows in system tray
- [ ] Settings window opens and closes
- [ ] Log directory auto-detection works
- [ ] File watcher starts when path is set
- [ ] Supabase connection test succeeds with valid credentials
- [ ] Quest completion events are detected (REQUIRES GAME)
- [ ] Events sync to database successfully
- [ ] Offline queue works when database is unreachable
- [ ] Historical import processes old logs
- [ ] App auto-starts on OS login (if enabled)

---

## Configuration

### Development Config

Create `.env` in project root:
```bash
# Supabase credentials for testing
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Tarkov log directory for testing
DEV_LOG_DIRECTORY=C:\\Path\\To\\Test\\Logs
```

### Tauri Config

Edit `src-tauri/tauri.conf.json`:
```json
{
  "build": {
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "Tarkov Quest Tracker",
    "version": "0.1.0"
  },
  "tauri": {
    "systemTray": {
      "iconPath": "icons/tray-icon.png"
    },
    "windows": [
      {
        "title": "Tarkov Quest Tracker",
        "width": 800,
        "height": 600,
        "visible": false
      }
    ]
  }
}
```

---

## Common Issues

### Issue: Rust Compilation Errors

**Problem**: `error: linker 'link.exe' not found`

**Solution (Windows)**:
Install Visual Studio Build Tools:
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

---

### Issue: App Won't Start

**Problem**: `Error: Command failed: cargo tauri dev`

**Solution**:
1. Check Rust version: `rustc --version` (must be 1.75+)
2. Update Rust: `rustup update`
3. Clean build: `cargo clean`
4. Try again: `npm run tauri dev`

---

### Issue: Hot Reload Not Working

**Problem**: Frontend changes don't reflect in app

**Solution**:
1. Stop `tauri dev`
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Restart: `npm run tauri dev`

---

### Issue: System Tray Icon Missing

**Problem**: App runs but no tray icon

**Solution (Linux)**:
```bash
# Install required system tray libraries
sudo apt install libayatana-appindicator3-1
```

---

## Keyboard Shortcuts (Development Mode)

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+I` / `Cmd+Option+I` | Open DevTools |
| `Ctrl+R` / `Cmd+R` | Reload app |
| `Ctrl+Q` / `Cmd+Q` | Quit app |
| `F5` | Refresh frontend (if supported) |

---

## Next Steps

### Phase 0: Research Verification

**CRITICAL FIRST STEP**: Verify quest events are logged before implementation.

1. Install Escape from Tarkov (if not already)
2. Locate log directory
3. Complete a test quest in-game
4. Examine log files for quest completion entries
5. Document findings in `research.md`

### Phase 1: Core Implementation (if logs verified)

1. Implement Rust file watcher (`log_watcher.rs`)
2. Implement system tray (`system_tray.rs`)
3. Create settings UI
4. Implement log parser
5. Integrate Supabase sync

### Phase 2: Testing & Polish

1. Write unit tests for parser
2. Write integration tests for sync
3. Manual testing with real game logs
4. Create installer
5. Write user documentation

---

## Resources

- **Tauri Docs**: https://tauri.app/v1/guides/
- **Rust Book**: https://doc.rust-lang.org/book/
- **notify Crate**: https://docs.rs/notify/latest/notify/
- **Supabase JS Docs**: https://supabase.com/docs/reference/javascript/introduction
- **Tarkov.dev API**: https://tarkov.dev/api/

---

## Getting Help

- **Tauri Discord**: https://discord.com/invite/tauri
- **Project Issues**: https://github.com/yourusername/tarkov-desktop-companion/issues
- **Web App Repo**: https://github.com/yourusername/TarkovQuest

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

**Code Style**:
- Rust: Follow `rustfmt` defaults (`cargo fmt`)
- JavaScript: ESLint + Prettier (`npm run lint`)
- Commit messages: Conventional Commits format

---

**Status**: Ready for Phase 0 research verification. Do not proceed with implementation until quest event logging is confirmed.

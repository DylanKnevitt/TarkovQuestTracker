# TarkovQuest Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-01-16

## Active Technologies

### Web Application
- JavaScript ES6+ (ES2020), Node.js 18+ for build tooling (001-vercel-supabase-deployment)
- JavaScript ES6+ (ES2020), existing codebase (002-user-quest-comparison)
- JavaScript ES6+ (ES2020 target), no transpilation + Vite 5.0.0 (build), Cytoscape.js 3.28.1 (unused for this feature), @supabase/supabase-js 2.81.1 (optional) (003-item-tracker)
- localStorage (primary) for quest/item progress, Supabase PostgreSQL (optional cloud sync), 24h API cache (003-item-tracker)
- JavaScript ES6+ (Browser-native, no build step) + Cytoscape.js 3.28.1+, Cytoscape-Dagre 2.5.0+, http-server 14.1.1+ (dev only) (master)

### Desktop Companion App (005-automatic-quest-tracking) [CONDITIONAL: Requires log file verification]
- **Rust 1.75+** (Tauri backend, file watching with `notify` crate, system tray)
- **TypeScript 5.x / JavaScript ES2022** (Tauri frontend, business logic)
- **Tauri 1.5+** (Desktop framework for cross-platform builds)
- **Supabase JS SDK 2.81.1+** (Database sync, shared with web app)
- **Tarkov.dev GraphQL API** (Quest data, item requirements)
- **Build Tools**: Vite (frontend bundling), Cargo (Rust compilation)
- **Testing**: Vitest (JavaScript), Cargo test (Rust)
- **Target Platforms**: Windows (primary), macOS, Linux (secondary)

## Project Structure

### Web Application (Current Repo)
```text
src/
├── index.js                # Entry point
├── api/                    # Tarkov.dev API integration
├── components/             # Quest graph, list, optimizer, item tracker
├── models/                 # Quest, Item data models
└── styles/                 # CSS files
specs/                      # Feature specifications
scripts/                    # Build and utility scripts
```

### Desktop Companion App (New Repo - Future)
```text
tarkov-desktop-companion/
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs        # Entry point
│   │   ├── log_watcher.rs # File monitoring
│   │   └── system_tray.rs # System tray
│   └── Cargo.toml
├── src/                   # JavaScript frontend
│   ├── components/        # Settings UI, import wizard
│   ├── services/          # Log parser, sync engine
│   └── models/            # Shared with web app
└── tests/
```

## Commands

### Web App
```bash
npm test               # Run tests
npm run lint          # Lint JavaScript
npm run dev           # Development server
```

### Desktop App (Future)
```bash
cargo tauri dev       # Run desktop app in dev mode
cargo tauri build     # Build installer
cargo fmt             # Format Rust code
npm test              # Run JavaScript tests
cargo test            # Run Rust tests
```

## Code Style

### JavaScript
- **ES6+ (Browser-native)**: Follow standard conventions
- **TypeScript**: Strict mode, explicit types
- **Formatting**: Prettier with 2-space indents
- **Linting**: ESLint with recommended rules

### Rust (Desktop App)
- **Edition**: 2021
- **Formatting**: `rustfmt` defaults (`cargo fmt`)
- **Linting**: Clippy (`cargo clippy`)
- **Style**: Follow Rust standard library conventions

## Recent Changes
- **005-automatic-quest-tracking** (2025-01-16): Added Tauri desktop app support (Rust 1.75+, TypeScript 5.x, Tauri 1.5+) - CONDITIONAL on log file verification
- **003-item-tracker**: Added JavaScript ES6+ (ES2020 target), no transpilation + Vite 5.0.0 (build), Cytoscape.js 3.28.1 (unused for this feature), @supabase/supabase-js 2.81.1 (optional)
- **002-user-quest-comparison**: Added JavaScript ES6+ (ES2020), existing codebase
- **001-vercel-supabase-deployment**: Added JavaScript ES6+ (ES2020), Node.js 18+ for build tooling


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

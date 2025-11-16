# Research: Automatic Quest Tracking - Tauri Framework Best Practices

**Date**: 2025-01-16  
**Purpose**: Research Tauri framework best practices for building a desktop app that monitors log files

---

## Executive Summary

⚠️ **CRITICAL FINDING**: Initial research suggests Escape from Tarkov may **NOT** log quest completion events to accessible log files. This requires verification with actual game testing before proceeding with implementation.

**If quest events ARE logged**: Tauri provides a robust framework for building lightweight desktop applications with Rust backend and web frontend. For log file monitoring applications, the recommended architecture uses:
- **Rust** for file watching (via `notify` crate) and system operations  
- **JavaScript** for UI and business logic  
- **Tauri IPC** for seamless communication between Rust and JavaScript  
- **System tray** for background operation  
- **Tauri's state management** for configuration persistence  

This approach ensures minimal resource usage (<50MB RAM, <1% CPU idle) while maintaining responsiveness.

**If quest events are NOT logged**: Alternative approaches must be considered (see section 10 below).

---
## 1. Tauri Architecture - Recommended Component Separation

| Component | Language | Rationale |
|-----------|----------|-----------|
| File watching | Rust | Native performance, async I/O, minimal CPU usage |
| Log parsing | JavaScript | Easier to iterate on regex patterns, access to Tarkov.dev API |
| Quest mapping | JavaScript | Integration with GraphQL API, shared with web app |
| Sync engine | JavaScript | Reuse existing Supabase client code |
| UI layer | JavaScript/HTML | Web technologies, rapid development |
| System tray | Rust | Native OS integration via Tauri API |
| Configuration | Rust | Secure storage, OS-specific paths |

**Key Decision**: Use Rust for I/O-intensive operations (file watching, reading) and JavaScript for CPU-light operations (parsing, API calls, UI).

---

## 2. File Watching with notify Crate

The `notify` crate (v8.x) provides cross-platform file system notifications:
- Windows: ReadDirectoryChangesW
- macOS: FSEvents or kqueue  
- Linux: inotify

### Async File Watching Pattern (Recommended)

For Tauri integration with Tokio runtime, use async channels.

### Performance Considerations

- Use RecursiveMode::NonRecursive for log directories
- Consider debouncing with notify-debouncer-mini for rapidly changing files
- Filter events by file extension (.log)
- Handle editor behaviors (truncate vs append)

---

## 3. IPC Patterns (Rust  JavaScript)

### Commands (JavaScript  Rust)

Tauri provides `#[tauri::command]` for exposing Rust functions to JavaScript.
Async commands automatically run on background threads.

### Events (Rust  JavaScript)  

For pushing data from Rust to JavaScript, use `app_handle.emit_all()`.
Ideal for real-time log events.

### Best Practices

- Use strong types (TypeScript interfaces matching Rust structs)
- Minimize payload sizes across IPC boundary
- Batch high-frequency events  
- Always use Result<T, String> for error handling
- Use tauri::State for shared state

---

## 4. System Tray Implementation

### Configuration
Set in tauri.conf.json with iconPath and iconAsTemplate (macOS).

### Rust Implementation
- Create SystemTrayMenu with CustomMenuItem
- Handle SystemTrayEvent (LeftClick, MenuItemClick)
- Update tray dynamically with app.tray_handle()

### Platform Notes
- Linux: Requires libayatana-appindicator3-1
- macOS: iconAsTemplate enables dark mode support
- Windows: Use .ico format (32x32 or 16x16)

### Background Operation
Prevent closing with on_window_event CloseRequested  hide window instead.

---

## 5. Configuration & Persistence

### Recommended: tauri-plugin-store
- Encrypted key-value storage
- JSON-serializable values
- Simple API with .set() and .get()

### Alternative: Manual JSON Storage
- Use app_config_dir() for OS-specific paths
- Windows: %APPDATA%\<app-name>
- macOS: ~/Library/Application Support/<app-name>
- Linux: ~/.config/<app-name>

### Auto-Start
Use tauri-plugin-autostart for OS boot integration.

---

## 6. Performance Considerations

### Resource Targets
- RAM (Idle): <50MB
- RAM (Active): <100MB  
- CPU (Idle): <1%
- CPU (Parsing): <10%
- Startup: <2s
- Sync Latency: <5s

### Optimization Strategies
1. Use Tauri async runtime (Tokio) - async commands run on background threads
2. Batch events - emit every 1-2 seconds instead of per-line
3. Circular buffer for log queue (max 1000 entries)
4. Virtual scrolling for large lists
5. Lazy load components
6. Minimize bundle size with tree-shaking

---

## 7. Technology Decisions

| Decision | Chosen | Rationale | Alternatives |
|----------|--------|-----------|-------------|
| Framework | Tauri 1.5+ | 3MB bundle vs 50MB Electron, Rust performance | Electron, NW.js |
| File Watching | Rust notify | Native OS APIs, async, minimal CPU | JS chokidar |
| Log Parsing | JavaScript | Easier iteration, API access | Rust (faster but less flexible) |
| State Mgmt | tauri::State + plugin-store | Built-in, persistent | Redux, custom |
| System Tray | Tauri built-in | Native, cross-platform | Custom |
| IPC | Commands + Events | Idiomatic Tauri, type-safe | WebSockets, HTTP |

---

## 8. Implementation Recommendations

### Project Structure
```
tarkov-desktop-companion/
 src-tauri/              # Rust backend
    src/
       main.rs
       log_watcher.rs
       system_tray.rs
       config.rs
    tauri.conf.json
 src/                    # Frontend
    components/
    services/
    models/
 package.json
```

### Key Dependencies
- tauri 1.5+ with system-tray, notification features
- notify 8.1 for file watching
- futures 0.3 for async channels
- tauri-plugin-store for configuration
- tauri-plugin-autostart for OS boot

### Development Workflow
```bash
npm install
npm run tauri dev      # Hot reload
npm run tauri build    # Production build
```

---

## 9. Documentation References

- Tauri Command System: https://v1.tauri.app/v1/guides/features/command
- Tauri Events API: https://v1.tauri.app/v1/api/js/event  
- System Tray Guide: https://v1.tauri.app/v1/guides/features/system-tray
- Notify Crate: https://docs.rs/notify/latest/notify/
- Async Monitor Example: https://github.com/notify-rs/notify/blob/main/examples/async_monitor.rs

---

## 10. CRITICAL: Log File Verification Required

### Research Gap

The specification assumes quest completion events are logged based on reference to TarkovMonitor. However, **this assumption has not been verified** through actual game testing.

**REQUIRED BEFORE IMPLEMENTATION:**
1. Install Escape from Tarkov
2. Locate log directory (`C:\Battlestate Games\EFT\Logs\` or Steam equivalent)
3. Complete a test quest in-game
4. Examine log files for quest completion entries
5. Document exact log format and patterns if found

### If Quest Events ARE Logged

✅ Proceed with implementation as planned:
- Use Tauri + Rust file watching
- Parse log entries with regex patterns
- Sync detected events to Supabase
- Estimated effort: ~80 hours

### If Quest Events are NOT Logged

❌ Current approach is **not viable**. Consider alternatives:

**Option A: Memory Reading** (⚠️ EULA Risk)
- Scan game process memory for quest state
- **Risks**: Account bans, EULA violations, legal issues
- **Not recommended** without legal clearance

**Option B: Browser Extension**
- Parse quest data from EFT Wiki while user browses
- Auto-import from community tracker sites
- No game modification, EULA-compliant
- **Estimated effort**: ~40 hours

**Option C: Enhanced Manual Tracking**
- Improve existing web app UX
- Add keyboard shortcuts for quick quest completion
- Bulk import tools, templates for wipe progress
- **Estimated effort**: ~16 hours

**Option D: Screenshot OCR**
- User captures quest completion screenshots
- OCR extracts quest name and completion time
- Requires user action but no EULA concerns
- **Estimated effort**: ~50 hours

**Option E: Official API** (Long-term)
- Wait for Battlestate Games to release official API
- Monitor community announcements
- **Timeline**: Unknown, may never happen

### Decision Tree

```
Does Tarkov log quest completions?
├─ YES → Proceed with Tauri desktop app (Phase 1)
└─ NO → Choose alternative approach:
    ├─ Browser extension (B)
    ├─ Enhanced manual UX (C)  ← Safest, fastest
    ├─ Screenshot OCR (D)
    └─ Wait for official API (E)
```

---

## 11. Conclusion

**Conditional on Log File Verification:**

**IF** quest events are logged, Tauri provides an excellent foundation for lightweight log monitoring. The architecture leverages:
- Rust for file watching and system integration (notify crate + system tray API)
- JavaScript for business logic, API integration, and UI  
- Tauri IPC for seamless communication
- Minimal resource usage through async operations

This approach meets all performance goals while maintaining code reusability with the web application.

**IF** quest events are not logged, pivot to browser extension or enhanced manual tracking to avoid EULA violations and wasted development effort.

---

## Next Steps

1. **CRITICAL**: Verify quest event logging through game testing
2. **IF VERIFIED**: Proceed to Phase 1 design (data-model.md, contracts/, quickstart.md)
3. **IF NOT VERIFIED**: Present alternatives to stakeholders for decision
4. Document findings in updated plan.md

**Status**: Research complete, pending log file verification before implementation phase.

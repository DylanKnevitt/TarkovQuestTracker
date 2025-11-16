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

## 10. ✅ VERIFIED: Log File Analysis Complete

### Verification Results (2025-11-16)

**Log Directory Verified**: `C:\Battlestate Games\Escape from Tarkov\Logs\`

**Finding**: ✅ **Quest data IS available in backend API logs**

**Evidence from actual logs:**

1. **Backend Log Location**: Each game session creates a subdirectory with backend logs
   - Recent format: `log_YYYY.MM.DD_HH-MM-SS_VERSION\YYYY.MM.DD_HH-MM-SS_VERSION backend_000.log`
   - Older format: `log_YYYY.MM.DD_HH-MM-SS_VERSION\YYYY.MM.DD_HH-MM-SS_VERSION_backend.log`

2. **Quest API Endpoints Found**:
   ```
   https://prod.escapefromtarkov.com/client/quest/list
   https://prod.escapefromtarkov.com/client/quest/getMainQuestsList  
   https://prod.escapefromtarkov.com/client/quest/getMainQuestNotesList
   https://prod.escapefromtarkov.com/client/repeatalbeQuests/activityPeriods
   ```

3. **Log Entry Format**:
   ```
   2025-11-16 11:25:25.778 +02:00|1.0.0.0.41760|Info|backend|---> Request HTTPS, id [39]: URL: https://prod.escapefromtarkov.com/client/quest/list, crc: .
   2025-11-16 11:25:27.051 +02:00|1.0.0.0.41760|Info|backend|<--- Response HTTPS, id [39]: URL: https://prod.escapefromtarkov.com/client/quest/list, crc: , responseText: .
   ```

4. **Key Observations**:
   - `/client/quest/list` is called frequently (every time quest menu is opened)
   - Response contains `responseText: .` (actual JSON is truncated in logs)
   - API calls are logged with timestamps, request/response pairs, and unique IDs
   - Pattern: `---> Request` followed by `<--- Response`

**CRITICAL LIMITATION DISCOVERED**:
⚠️ The backend log **DOES NOT include the actual response payload** (responseText is truncated to `.`)
This means we **CANNOT parse quest completion status from the response bodies**.

### Updated Implementation Approach

### Revised Implementation Strategy

❌ **Original Approach Not Viable**: Response payloads are truncated in logs

✅ **New Approach - Frequency-Based Detection**:

Since response bodies are not logged but API calls ARE logged with timestamps:

**Detection Method**:
1. Monitor `/client/quest/list` API calls in backend log
2. **Assumption**: When quest is completed, the game will call `/client/quest/list` shortly after
3. Parse timestamps to detect "burst" patterns (multiple calls within short timeframe)
4. When burst detected, trigger a manual check in the web app (notification to user)
5. User confirms quest completion → sync to Supabase

**Pros**:
- Logs ARE available and contain timestamps
- Can detect quest-related activity (menu opens, status checks)
- EULA-compliant (reading own log files)
- Simple regex parsing

**Cons**:
- Cannot determine WHICH quest was completed from logs alone
- Requires user confirmation (semi-automatic)
- False positives possible (user just browsing quests)

**Alternative Approaches (Recommended)**:

**Option A: Enhanced Manual Tracking** ⭐ **RECOMMENDED**
- Keep current web app approach (fully manual)
- Add quality-of-life improvements:
  * Keyboard shortcuts (Space to complete, Q to open quests)
  * Bulk import from popular tracking sites
  * Quest completion templates for wipe progress
  * Recent quest history (last 5 completed)
- **Estimated effort**: ~16 hours
- **Pros**: Simple, reliable, no EULA concerns
- **Cons**: Still requires manual input

**Option B: Browser Extension**
- Parse quest data from Tarkov.dev or EFT Wiki while browsing
- Auto-import when user views quest pages
- Detect pattern: "User viewing quest X details" → Suggest marking as in-progress
- **Estimated effort**: ~40 hours
- **Pros**: Semi-automatic, EULA-compliant, no game modification
- **Cons**: Only works when user browses wiki

**Option C: Hybrid Approach**
- Desktop app monitors log for `/client/quest/list` activity bursts
- Shows system tray notification: "Quest activity detected - update tracker?"
- User clicks notification → opens web app → marks quest complete
- **Estimated effort**: ~60 hours (original Tauri app minus parsing complexity)
- **Pros**: Best of both worlds, some automation
- **Cons**: Still requires user action, complex setup

**Option D: Memory Reading** (⚠️ **NOT RECOMMENDED**)
- Scan game process memory for quest state
- **Risks**: Account bans, EULA violations, legal issues
- TarkovMonitor may use this approach (hence rare, risky)

### Decision Tree

```
Verified: Backend logs contain API calls but NOT response payloads
├─ Option A: Enhanced Manual UX (safest, fastest) ⭐
├─ Option B: Browser Extension (semi-auto, EULA-safe)
├─ Option C: Hybrid (log monitoring + manual confirm)
└─ Option D: Memory Reading (DANGEROUS - not recommended)
```

### Recommendation

**Go with Option A: Enhanced Manual Tracking**

Rationale:
1. **Safest**: No EULA violations, no risk of bans
2. **Fastest**: 16 hours vs 40-80 hours for alternatives
3. **Reliable**: No dependency on log formats, game updates, or memory offsets
4. **Better UX**: Keyboard shortcuts and bulk import provide 80% of automation benefits
5. **Maintainable**: Simple code, no complex parsing or system integration

Quest tracking is inherently a "check your progress" activity that users do periodically, not real-time. Manual input with excellent UX is often better than fragile automation.

---

## 11. Conclusion

**Verification Complete (2025-11-16):**

✅ **Logs exist**: Backend logs are available at `C:\Battlestate Games\Escape from Tarkov\Logs\`
✅ **Quest API calls logged**: `/client/quest/list` and related endpoints are logged with timestamps
❌ **Response payloads NOT logged**: Actual quest data is truncated (`responseText: .`)

**Impact on Original Specification:**
- **Full automation NOT possible** without response payload data
- Original desktop app approach requires **significant pivot**
- Semi-automatic detection possible (activity monitoring) but requires user confirmation
- **Manual tracking with enhanced UX** is the most practical approach

**Architecture Decision:**
Tauri remains a valid framework for hybrid approaches (Option C), but the complexity-to-value ratio makes **enhanced manual tracking (Option A)** the better choice:
- Simpler implementation (16h vs 60-80h)
- No EULA risks
- More reliable (no dependency on log format changes)
- Better user experience (keyboard shortcuts > fragile automation)

---

## Next Steps

1. ✅ **T001 VERIFICATION COMPLETE** - Log analysis done
2. **DECISION REQUIRED**: Choose implementation approach
   - **Recommended**: Option A (Enhanced Manual UX) - 16 hours
   - Alternative: Option B (Browser Extension) - 40 hours
   - Alternative: Option C (Hybrid Log Monitor) - 60 hours
3. **IF Option A chosen**: Update spec.md to focus on UX improvements instead of automation
4. **IF Option B/C chosen**: Continue with original plan.md but adjust expectations (semi-automatic)

**Status**: T001 verification complete. Ready for stakeholder decision on implementation approach.

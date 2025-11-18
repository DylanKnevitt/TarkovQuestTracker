# Implementation Plan: All-Quests Item Tracker View

**Branch**: `006-all-quests-item-tracker` | **Date**: November 18, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-all-quests-item-tracker/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enhance the existing Item Tracker (Feature 003) to support two viewing modes: "Active Quests" (current behavior - shows items only from incomplete quests) and "All Quests" (new - shows items from all quests including completed ones). The primary modification is to the `ItemTrackerManager.extractQuestRequirements()` method which currently skips completed quests. We'll add a viewing mode filter that optionally includes completed quests, with visual differentiation via badges and styling to indicate quest completion status. Mode selection persists via localStorage.

**Technical Approach**: Modify the existing `ItemTrackerManager` class to accept a viewing mode parameter in its aggregation logic. Add UI toggle controls in the `ItemTracker` component. Enhance `AggregatedItem` class to track completion status of quest sources. Update item card rendering to show status badges ("Active", "Completed", "Both") in All Quests mode. Maintain backward compatibility by defaulting to "Active Quests" mode.

## Technical Context

**Language/Version**: JavaScript ES6+ (Modern browsers: Chrome 90+, Firefox 88+, Safari 14+)  
**Primary Dependencies**: Cytoscape.js 3.28.1+ (graph), Vanilla JS (no framework), Tarkov.dev GraphQL API  
**Storage**: LocalStorage (quest progress, hideout progress, item collection status, viewing mode preference)  
**Testing**: Manual browser testing (no existing test framework in project)  
**Target Platform**: Web browsers (SPA with static hosting)  
**Project Type**: Web application (frontend-only, client-side rendering)  
**Performance Goals**: Toggle mode < 200ms, item list render < 3 seconds for 300+ items, filter response < 100ms  
**Constraints**: No backend, API cache 24h, localStorage limits (~5-10MB), must handle 300+ items without lag  
**Scale/Scope**: ~300-500 items total, ~100-150 quests, single-page component enhancement

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS - No constitution file present, project follows practical JavaScript conventions.

**Analysis**: Project uses vanilla JavaScript with ES6 modules, component-based architecture, and localStorage for state persistence. No formal constitution defined. Current patterns observed:
- Separation of concerns: models, components, services
- Event-driven updates (questUpdated, hideoutUpdated events)
- LocalStorage for persistence
- No testing framework (manual browser testing)

**Gates Applied** (implicit project standards):
- ✅ Maintain existing component patterns
- ✅ Use localStorage for new preferences
- ✅ Follow existing file naming conventions
- ✅ Preserve backward compatibility

## Project Structure

### Documentation (this feature)

```text
specs/006-all-quests-item-tracker/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - research viewing mode patterns
├── data-model.md        # Phase 1 output - ViewingMode enum, ItemStatus tracking
├── quickstart.md        # Phase 1 output - developer setup guide
├── contracts/           # Phase 1 output - ItemTrackerManager API changes
│   └── item-tracker-manager-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── models/
│   ├── quest.js                    # EXISTING - Quest, QuestManager classes
│   ├── item.js                     # EXISTING - Item, ItemRequirement, AggregatedItem classes
│   └── item-tracker-manager.js     # MODIFY - Add viewingMode parameter to extractQuestRequirements()
├── services/
│   ├── storage-service.js          # EXISTING - localStorage wrapper for quest progress
│   ├── item-storage-service.js     # EXISTING - localStorage for item collection tracking
│   └── priority-service.js         # EXISTING - Priority calculation logic
├── components/
│   ├── quest-list.js               # EXISTING - quest display component
│   ├── item-tracker.js             # MODIFY - Add mode toggle UI, persist mode selection
│   ├── item-list.js                # MODIFY - Render status badges in All Quests mode
│   └── item-detail-modal.js        # MODIFY - Group quest sources by completion status
└── api/
    └── tarkov-items-api.js         # EXISTING - API calls to Tarkov.dev

styles/
└── item-tracker.css                 # MODIFY - Add styles for completed quest badges

index.html                           # EXISTING - no changes needed
```

**Structure Decision**: This is a web application frontend using Option 2 structure (frontend-only). We modify existing files in the `src/` tree rather than create new modules. The feature builds on Feature 003 (Item Tracker) by enhancing `ItemTrackerManager` filtering logic and `ItemTracker` UI components. No new directories needed - all changes are enhancements to existing classes.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: No violations - feature follows existing patterns and adds minimal complexity.

This feature enhances existing classes with optional behavior (viewing mode toggle). No new architectural patterns introduced. Changes are additive and backward-compatible.

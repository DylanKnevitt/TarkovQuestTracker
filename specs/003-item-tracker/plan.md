# Implementation Plan: Quest & Hideout Item Tracker

**Branch**: `003-item-tracker` | **Date**: 2025-11-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-item-tracker/spec.md`

## Summary

Implement an Item Tracker feature that displays all quest and hideout items needed for incomplete content, with filtering by category (Quest/Hideout/Keys) and priority indicators (NEEDED SOON vs NEEDED LATER). Items are extracted from Tarkov.dev API quest objectives and hideout station requirements, filtered by user's quest completion status, and prioritized based on quest unlock status (level + prerequisites). Users can mark items as collected for personal tracking. The feature integrates into the existing tab navigation system and leverages the current quest progress tracking infrastructure.

## Technical Context

**Language/Version**: JavaScript ES6+ (ES2020 target), no transpilation  
**Primary Dependencies**: Vite 5.0.0 (build), Cytoscape.js 3.28.1 (unused for this feature), @supabase/supabase-js 2.81.1 (optional)  
**Storage**: localStorage (primary) for quest/item progress, Supabase PostgreSQL (optional cloud sync), 24h API cache  
**Testing**: Manual testing via quickstart.md scenarios (no automated test framework)  
**Target Platform**: Modern web browsers (Chrome, Firefox, Edge) with ES6+ support
**Project Type**: Single-page web application with tab-based navigation  
**Performance Goals**: < 3s item list load (SC-001), < 100ms filter response (SC-003), 24h cache for API (FR-014)  
**Constraints**: Offline-capable after initial load, no backend server (JAMstack), client-side only  
**Scale/Scope**: 100-150 items from API, 5 filter categories, boolean collection tracking per item, integrates with existing quest completion tracking

**NEEDS CLARIFICATION**:
- Tarkov.dev API items query schema (fields: id, name, iconLink, types[], tasks[], hideoutModules[], FiR requirement)
- hideoutStations query structure (level requirements, item dependencies)
- Priority calculation algorithm (quest prerequisites + player level → NEEDED SOON vs NEEDED LATER)
- FiR detection logic from API quest objectives
- Item deduplication strategy (multiple quests needing same item)
- Hideout completion tracking (new localStorage structure vs extend quest tracking)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS (constitution.md contains template placeholders - no project-specific principles defined)

No violations to evaluate. Proceeding with implementation.

## Project Structure

### Documentation (this feature)

```text
specs/003-item-tracker/
├── spec.md              # Feature specification (already complete)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── tarkov-items-api.md
│   └── tarkov-hideout-api.md
├── checklists/
│   └── requirements.md  # Quality validation (already complete)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── models/
│   ├── quest.js                    # Existing - Quest, QuestManager classes
│   ├── item.js                     # NEW - Item, ItemRequirement, Priority enum
│   └── item-tracker-manager.js     # NEW - ItemTrackerManager class (aggregates items from quests/hideout)
├── services/
│   ├── storage-service.js          # Existing - localStorage wrapper for quest progress
│   ├── item-storage-service.js     # NEW - localStorage for item collection tracking
│   └── priority-service.js         # NEW - Priority calculation logic (NEEDED SOON vs LATER)
├── components/
│   ├── quest-list.js               # Existing - quest display component
│   ├── user-comparison.js          # Existing - multi-user comparison
│   ├── item-tracker.js             # NEW - main item tracker component (tab view)
│   ├── item-list.js                # NEW - item card grid with filters
│   └── item-card.js                # NEW - individual item display with checkbox
├── api/
│   ├── tarkov-api.js               # Existing - GraphQL client for quests
│   └── tarkov-items-api.js         # NEW - GraphQL queries for items and hideoutStations
├── index.js                        # MODIFY - Add item tracker tab initialization
└── styles/
    ├── main.css                    # Existing
    └── item-tracker.css            # NEW - item tracker styling

index.html                           # MODIFY - Add item tracker tab button and content div
```

**Structure Decision**: Single-project web application structure (Option 1). Following existing component-based pattern with separation of concerns: models for data structures, services for business logic, components for UI, api for external data sources. No test directory needed (manual testing only per spec requirements).

## Complexity Tracking

No violations - constitution check passed. No complexity justification needed.

---

## Phase 0: Research & Outline ✅

**Status**: Complete

**Deliverables**:
- [research.md](./research.md) - Comprehensive research resolving all NEEDS CLARIFICATION items

**Key Findings**:
1. **Tarkov.dev API Items Query**: Use minimal query (id, name, shortName, iconLink, wikiLink, types) and cross-reference with existing tasks data
2. **Hideout Stations Query**: Structure includes itemRequirements and stationLevelRequirements for dependency tracking
3. **Priority Calculation**: Two-level system (NEEDED_SOON if quest unlocked OR hideout buildable, NEEDED_LATER otherwise)
4. **FiR Detection**: Regex-based detection from objective descriptions + objective type checking
5. **Item Deduplication**: Map-based aggregation with array of sources, sum quantities, OR FiR flags
6. **Hideout Tracking**: New localStorage key `tarkov-hideout-progress` with `{stationId-level: boolean}` structure

**Decisions Made**:
- 24-hour API cache for items and hideout data
- Separate `HideoutManager` class mirroring `QuestManager` pattern
- `PriorityService` for centralized priority calculation logic
- Event-driven updates (listen to `questUpdated` and `hideoutUpdated` events)
- Default to player level 79 for MVP (quest unlock calculations)

---

## Phase 1: Design & Contracts ✅

**Status**: Complete

**Deliverables**:
- [data-model.md](./data-model.md) - Complete entity definitions and relationships
- [contracts/tarkov-items-api.md](./contracts/tarkov-items-api.md) - Items API GraphQL contract
- [contracts/tarkov-hideout-api.md](./contracts/tarkov-hideout-api.md) - Hideout API GraphQL contract  
- [quickstart.md](./quickstart.md) - 10 manual testing scenarios covering all user stories

**Data Model**:
- **Core Entities**: Item, ItemRequirement, AggregatedItem, Priority (enum), HideoutModule
- **Manager Classes**: ItemTrackerManager, HideoutManager, PriorityService, ItemStorageService
- **localStorage Keys**: 
  - `tarkov-hideout-progress` (hideout module completion)
  - `tarkov-item-collection` (user's collection tracking)
  - `tarkov-items-cache` + `tarkov-items-cache-time` (API cache)
  - `tarkov-hideout-cache` + `tarkov-hideout-cache-time` (API cache)
  - `item-tracker-filters` (filter persistence)

**API Contracts**:
- Items API: Minimal query for 400-500 items (~30-40 KB gzipped), 24h cache
- Hideout API: 15 stations with 3-4 levels each (~8-12 KB gzipped), 24h cache
- Error handling: Stale cache fallback on network errors
- Integration: Cross-reference item IDs between items and hideout APIs

**Testing Scenarios**:
- 10 manual test scenarios validating all 5 user stories
- Edge cases: empty state, item deduplication, FiR indicators
- Performance validation: < 3s load, < 100ms filter response
- Smoke test checklist for quick pre-release validation

---

## Phase 2: Tasks (Next Phase)

**Status**: Not Started

**Command**: `speckit.tasks` (run after planning complete)

**Purpose**: Break down implementation into atomic tasks with dependencies and estimates

**Expected Output**: `specs/003-item-tracker/tasks.md` with:
- Task breakdown (T001-T0XX) organized by component/layer
- Dependency tree (which tasks must complete before others)
- Rough estimates (S/M/L sizing)
- Test coverage requirements per task

---

## Agent Context Update

After completing Phase 1 design, update agent-specific context files with new technology:

```powershell
.\.specify\scripts\powershell\update-agent-context.ps1 -AgentType copilot
```

**Technologies to Add**:
- localStorage (tarkov-hideout-progress, tarkov-item-collection)
- GraphQL queries (items, hideoutStations)
- Priority calculation system (NEEDED_SOON / NEEDED_LATER)
- Event-driven architecture (questUpdated, hideoutUpdated, itemCollectionUpdated)

---

## Implementation Readiness Checklist

- [x] Feature specification complete (spec.md)
- [x] Constitution check passed
- [x] Research phase complete (research.md)
- [x] Data model defined (data-model.md)
- [x] API contracts documented (contracts/*.md)
- [x] Testing scenarios prepared (quickstart.md)
- [ ] Agent context updated (run update-agent-context.ps1)
- [ ] Tasks generated (run speckit.tasks)
- [ ] Implementation started (run speckit.implement)

---

## Next Steps

1. **Run agent context update**:
   ```powershell
   .\.specify\scripts\powershell\update-agent-context.ps1 -AgentType copilot
   ```

2. **Commit planning artifacts**:
   ```bash
   git add specs/003-item-tracker/
   git commit -m "plan(003): Implementation plan with API contracts and data models"
   ```

3. **Generate tasks**:
   ```
   Follow instructions in speckit.tasks.prompt.md
   ```

4. **Begin implementation** (after tasks generated):
   ```
   Follow instructions in speckit.implement.prompt.md
   ```

---

**Planning Phase Complete** ✅  
Branch: `003-item-tracker` | Ready for task generation

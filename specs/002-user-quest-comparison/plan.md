# Implementation Plan: User Quest Progress Comparison

**Branch**: `002-user-quest-comparison` | **Date**: 2025-11-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-user-quest-comparison/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a multi-user quest comparison feature that allows players to view all registered users, select one or more users, and filter quests to show only those incomplete for all selected users (intersection/"lowest common denominator"). This enables efficient squad coordination by identifying which quests the entire team still needs to complete.

**Technical Approach**:
- Phase 1 (P1): Create user list view fetching user profiles with completion stats from Supabase
- Phase 2 (P1): Implement single-user selection and quest filtering for duo play  
- Phase 3 (P2): Add multi-user selection with intersection calculation for squad play
- Phase 4 (P2): Enhance UX with visual completion indicators per user
- Phase 5 (P3): Optional URL sharing feature with encoded user selections

## Technical Context

**Language/Version**: JavaScript ES6+ (ES2020), existing codebase  
**Primary Dependencies**: 
  - Supabase JavaScript Client v2.38+ (existing)
  - Existing: QuestManager, AuthService, StorageService
  
**Storage**: 
  - Supabase PostgreSQL (existing `quest_progress` table, auth.users table)
  - Need to add aggregated queries for user statistics
  
**Testing**: 
  - Manual testing for user interaction flows
  - Integration testing for multi-user filtering logic
  - Performance testing with 100+ users and 10-user selections
  
**Target Platform**: 
  - Web browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
  - Desktop primary, mobile-responsive secondary
  
**Project Type**: Web application (frontend-only SPA, no backend server)

**Performance Goals**: 
  - User list load: < 2 seconds
  - Quest filtering for 2-3 users: < 1 second
  - Quest filtering for 10 users: < 2 seconds
  - Page remains responsive with 100+ users in system
  
**Constraints**: 
  - Must stay on Supabase free tier (reuse existing queries, minimal new storage)
  - No server-side API needed (all computation client-side)
  - Must work with existing authentication (no new auth flows)
  - Bundle size increase: < 30 KB (comparison logic is lightweight)
  
**Scale/Scope**: 
  - Target: 100-500 users (realistic for Tarkov quest tracking community)
  - ~200 quests per user
  - Max 10 users selected simultaneously (enforced limit)
  - 1 new UI tab + 2-3 new components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS (No project constitution defined - using general best practices)

The project constitution template is not yet customized. This feature follows established patterns from Feature 001:
- Single-page application architecture (consistent with existing codebase)
- Client-side data processing (no backend services)
- Reuse existing Supabase integration (no new infrastructure)
- Component-based architecture (matches existing quest-list, quest-graph)
- Graceful degradation (feature requires authentication, but doesn't break existing functionality)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web application (frontend-only SPA)
src/
├── index.js                     # MODIFIED: Add comparison tab and component initialization
├── api/
│   └── supabase-client.js      # Existing (no changes)
├── models/
│   ├── quest.js                # Existing (no changes)
│   ├── user.js                 # Existing (no changes)
│   └── user-profile.js         # NEW: UserProfile model with completion stats
├── components/
│   ├── quest-list.js           # Existing (no changes)
│   ├── quest-graph.js          # Existing (no changes)
│   ├── quest-optimizer.js      # Existing (no changes)
│   ├── auth-ui.js              # Existing (no changes)
│   ├── sync-indicator.js       # Existing (no changes)
│   ├── user-comparison.js      # NEW: Main comparison view component
│   ├── user-list.js            # NEW: User list with selection UI
│   └── comparison-quest-list.js # NEW: Filtered quest list with completion indicators
└── services/
    ├── storage-service.js      # Existing (no changes)
    ├── auth-service.js         # Existing (no changes)
    ├── sync-service.js         # Existing (no changes)
    └── comparison-service.js   # NEW: User data fetching and intersection logic

styles/
├── main.css                    # Existing (no changes)
├── quest-list.css              # Existing (no changes)
├── quest-graph.css             # Existing (no changes)
├── auth.css                    # Existing (no changes)
└── user-comparison.css         # NEW: Comparison view styles

# Configuration (no changes)
.env.local
.env.example
vercel.json

# Existing files (no changes)
index.html                      # MODIFIED: Add comparison tab button
package.json
README.md
```

**Structure Decision**: Frontend-only web application extending existing component architecture. New comparison feature follows the same pattern as quest-list and quest-optimizer - a tab-based view with dedicated components and services. No backend changes needed - all data comes from existing Supabase tables.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: N/A - No constitution violations. All complexity justified by requirements:
- ComparisonService: Required for multi-user data aggregation (FR-001, FR-003, FR-005)
- Intersection logic: Required for "lowest common denominator" filtering (FR-003, US3)
- Three new components: Required for separation of concerns (user list, quest list, main view)
- Client-side processing: Maintains free-tier constraint, reuses existing architecture

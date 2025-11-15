# Feature Specification: Tarkov Quest Tracker

**Branch**: `master` | **Date**: 2025-11-15  
**Status**: Implemented (Retrospective Documentation)

## Overview

An interactive static Single Page Application (SPA) for tracking Escape from Tarkov quests with optimized path finding to key quests like Lightkeeper, Setup, and Test Drive.

## Problem Statement

Escape from Tarkov has a complex quest system with:
- 100+ quests across multiple traders
- Complex prerequisite chains
- Hidden dependencies for special unlocks (Kappa, Lightkeeper)
- No in-game path optimization tools

Players need a tool to:
1. Track quest completion progress
2. Visualize quest dependencies
3. Find optimal paths to specific target quests
4. Filter and search quests efficiently

## User Stories

### US1: View Quest List
**As a** Tarkov player  
**I want to** see all quests organized by trader  
**So that** I can understand what tasks are available

**Acceptance Criteria:**
- Quests grouped by trader (Prapor, Therapist, Skier, etc.)
- Each quest card shows: name, level requirement, XP reward, objectives preview
- Color-coded by status: completed (green), available (blue), locked (gray)
- Special badges for Kappa and Lightkeeper quests

### US2: Track Quest Progress
**As a** Tarkov player  
**I want to** mark quests as completed  
**So that** my progress persists between sessions

**Acceptance Criteria:**
- Click to toggle quest completion status
- Progress saved to browser LocalStorage
- Status affects quest availability calculation
- Statistics updated in real-time

### US3: Visualize Quest Dependencies
**As a** Tarkov player  
**I want to** see quest dependency graph  
**So that** I can understand quest chains visually

**Acceptance Criteria:**
- Interactive graph with nodes (quests) and edges (prerequisites)
- Multiple layout algorithms (Hierarchical, Breadth-First, Circle)
- Click nodes to view quest details
- Zoom, pan, and fit-to-view controls
- Color-coded by trader and status

### US4: Find Path to Target Quest
**As a** Tarkov player  
**I want to** calculate optimal path to specific quests  
**So that** I can efficiently unlock Lightkeeper, Setup, or Test Drive

**Acceptance Criteria:**
- Select target quest from dropdown
- Input current player level
- Algorithm calculates ordered path considering prerequisites
- Path displayed step-by-step with quest details
- Path highlighted in dependency graph

### US5: Filter and Search Quests
**As a** Tarkov player  
**I want to** filter quests by multiple criteria  
**So that** I can focus on relevant tasks

**Acceptance Criteria:**
- Filter by trader (checkboxes)
- Filter by level range (min/max)
- Search by quest name or objective text
- Toggle visibility of completed/locked quests
- Filters work independently and can be combined

### US6: Access Quest Details
**As a** Tarkov player  
**I want to** view detailed quest information  
**So that** I can understand objectives and rewards

**Acceptance Criteria:**
- Modal dialog with full quest details
- Complete objectives list with map locations
- Start and finish rewards (items, XP, trader standing)
- Link to external wiki
- Prerequisites and dependents listed

## Functional Requirements

### FR1: Data Integration
- Fetch quest data from Tarkov.dev GraphQL API
- Cache data locally for 24 hours
- Handle API failures gracefully with retry logic
- Transform API data to internal model

### FR2: Quest Management
- Load all quest data on application initialization
- Calculate quest status based on completion and level
- Maintain quest relationships (prerequisites, dependents)
- Support quick paths to special quests

### FR3: User Interface
- Responsive design for mobile, tablet, desktop
- Tab-based navigation (List view, Graph view)
- Sidebar with filters and path finder
- Header with statistics

### FR4: Progress Persistence
- Save completed quests to LocalStorage
- Load progress on application start
- Provide manual cache clear option
- Handle data migration for version updates

### FR5: Path Finding
- Breadth-first search algorithm for optimal paths
- Consider player level constraints
- Resolve all prerequisites recursively
- Display ordered path from start to target

## Non-Functional Requirements

### NFR1: Performance
- Initial load time: < 5 seconds
- Quest list render: < 1 second
- Graph render: < 5 seconds (for 200+ nodes)
- Filter response: < 300ms
- Search response: < 200ms

### NFR2: Compatibility
- Modern browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- ES6 module support required
- LocalStorage API required
- No server-side dependencies

### NFR3: Usability
- Intuitive navigation
- Clear visual feedback for interactions
- Helpful error messages
- Responsive to all screen sizes

### NFR4: Maintainability
- Modular component architecture
- Clear separation of concerns
- Comprehensive inline documentation
- Extensible for future features

## Technical Approach

### Architecture
- **Type**: Client-side SPA
- **Modules**: ES6 modules with clear boundaries
- **State Management**: LocalStorage for persistence
- **Components**: QuestManager, QuestList, QuestGraph, QuestOptimizer

### Data Flow
```
Tarkov.dev API → Cache (LocalStorage) → QuestManager → Components → UI
                                             ↓
                                      Progress Storage
```

### Key Technologies
- **Visualization**: Cytoscape.js with Dagre layout
- **API Client**: Fetch API with retry logic
- **Storage**: Browser LocalStorage
- **Dev Server**: http-server (static hosting)

### Data Model
```
Quest {
  id, name, trader, minLevel
  prerequisites: [quest_ids]
  objectives: [{type, description, optional, maps}]
  rewards: {start, finish}
  kappaRequired, lightkeeperRequired
}
```

## Success Metrics

1. **Functionality**: All user stories implemented
2. **Performance**: Meets all NFR1 targets
3. **Usability**: Intuitive for new users
4. **Reliability**: < 1% error rate on API calls
5. **Adoption**: Positive user feedback

## Out of Scope

The following are explicitly NOT included in this version:

- Multi-user support / authentication
- Server-side persistence
- Real-time collaboration
- Mobile native apps
- Quest timer estimates
- Hideout integration
- Item price tracking
- Market integration

## Future Enhancements

Phase 2 possibilities:
- User accounts (Supabase + Vercel deployment)
- Multiple character profiles
- Quest timing estimates
- Map integration with objective locations
- Community quest guides
- Group quest planning tools

## Appendix

### Related Documents
- `PROJECT_PLAN.md` - Implementation status and structure
- `TECHNICAL_SPECIFICATION.md` - Detailed technical specs
- `CLOUD_DEPLOYMENT_SPEC.md` - Future cloud deployment plan
- `README.md` - User documentation

### External Dependencies
- **Tarkov.dev API**: https://api.tarkov.dev/graphql
- **Tarkov Wiki**: https://escapefromtarkov.fandom.com/wiki

### Glossary
- **Kappa**: Kappa Secured Container, unlocked via quest completion
- **Lightkeeper**: Special trader unlocked via quest chain
- **Trader**: NPC that provides quests
- **Prerequisite**: Quest that must be completed before another

# Implementation Plan: Vercel + Supabase Deployment

**Branch**: `001-vercel-supabase-deployment` | **Date**: 2025-11-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-vercel-supabase-deployment/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Deploy the existing Tarkov Quest Tracker static SPA to Vercel with automatic GitHub-based CI/CD, then add Supabase backend for multi-user authentication and cloud-based quest progress synchronization. The implementation maintains LocalStorage as an offline fallback and provides migration for existing users.

**Technical Approach**:
- Phase 1 (P1): Deploy static SPA to Vercel with environment variable management
- Phase 2 (P2): Integrate Supabase for authentication and PostgreSQL storage with Row Level Security
- Phase 3 (P2): Implement bidirectional sync between LocalStorage and Supabase
- Phase 4 (P3): Add one-time migration flow for existing LocalStorage users

## Technical Context

**Language/Version**: JavaScript ES6+ (ES2020), Node.js 18+ for build tooling  
**Primary Dependencies**: 
  - Supabase JavaScript Client v2.38+
  - Existing: Cytoscape.js 3.28.1+, Cytoscape-Dagre 2.5.0+
  
**Storage**: 
  - Primary: Supabase PostgreSQL (free tier: 500 MB database)
  - Fallback: Browser LocalStorage (existing implementation)
  
**Testing**: 
  - Manual testing for authentication flows
  - Integration testing for Supabase API calls
  - End-to-end testing for sync scenarios
  
**Target Platform**: 
  - Web browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
  - Mobile web browsers (responsive design)
  
**Project Type**: Web application (frontend-only SPA, no backend server)

**Performance Goals**: 
  - Initial load: < 3 seconds (including auth check)
  - Database queries: < 500ms
  - Sync operations: < 1 second for typical progress save
  
**Constraints**: 
  - Must stay on Vercel free tier (100 GB bandwidth/month, 100 hours build time/month)
  - Must stay on Supabase free tier (500 MB DB, 2 GB bandwidth, 50k MAU)
  - Cannot introduce server-side rendering or Node.js runtime
  - Must maintain offline capability via LocalStorage fallback
  - Bundle size must stay under 500 KB total
  
**Scale/Scope**: 
  - Target: < 1000 active users initially
  - Database: ~100-500 users × ~200 quests = 10k-100k quest_progress rows
  - Expected growth: Organic growth within free tier limits

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS (No project constitution defined - using general best practices)

The project constitution template is not yet customized. This deployment follows standard web application best practices:
- Single-page application architecture (existing pattern)
- Environment-based configuration for secrets
- Graceful degradation (offline support)
- Free tier optimization
- User data security (RLS policies)

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
├── index.js                 # Application entry point
├── api/
│   ├── tarkov-api.js       # Existing Tarkov.dev GraphQL client
│   └── supabase-client.js  # NEW: Supabase client initialization
├── models/
│   ├── quest.js            # Existing quest data model
│   └── user.js             # NEW: User authentication state
├── components/
│   ├── quest-list.js       # Existing quest list component
│   ├── quest-graph.js      # Existing graph visualization
│   ├── quest-optimizer.js  # Existing pathfinding component
│   ├── auth-ui.js          # NEW: Login/signup UI component
│   └── sync-indicator.js   # NEW: Sync status display
└── services/
    ├── storage-service.js  # NEW: LocalStorage/Supabase abstraction
    ├── auth-service.js     # NEW: Authentication logic
    └── sync-service.js     # NEW: Data synchronization logic

styles/
├── main.css                # Existing global styles
├── quest-list.css          # Existing component styles
├── quest-graph.css         # Existing component styles
└── auth.css                # NEW: Authentication UI styles

# Configuration
.env.local                  # NEW: Local development environment variables (gitignored)
.env.example                # NEW: Environment variable template
vercel.json                 # NEW: Vercel deployment configuration

# Database
supabase/
├── migrations/
│   └── 001_initial_schema.sql  # NEW: Database schema and RLS policies
└── seed.sql                # NEW: Optional test data

# Documentation
DEPLOYMENT_GUIDE.md         # NEW: Step-by-step deployment instructions

# Existing files
index.html
package.json
README.md
scripts/fetch-quest-data.js
```

**Structure Decision**: Frontend-only web application with new backend integration. The existing SPA structure is preserved, with new modules added for authentication and data synchronization. Supabase client runs entirely in the browser - no backend server needed.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: N/A - No constitution violations. All complexity justified by requirements:
- Supabase integration: Required for multi-user support (FR-006 through FR-029)
- Sync logic: Required for offline support (FR-020, FR-021, FR-023)
- Authentication: Required for cloud storage (FR-011 through FR-017)

---

## Phase 0: Research (Complete)

**Status**: ✅ Complete  
**Output**: [research.md](./research.md)

### Decisions Made

10 technical decisions documented in research.md:

1. **Vercel Deployment Configuration**: Static site with vercel.json for SPA routing
2. **Supabase Client Integration**: Singleton pattern with @supabase/supabase-js
3. **Environment Variable Management**: .env.local + Vercel dashboard
4. **Database Schema Design**: Minimal schema (quest_progress table)
5. **Row Level Security Policies**: User-specific SELECT/INSERT/UPDATE policies
6. **Authentication Flow**: Email/password with persistent sessions
7. **Data Synchronization Strategy**: Last-write-wins with timestamps
8. **Migration Strategy**: One-time prompt on first authentication
9. **Offline Support**: LocalStorage-first writes with retry queue
10. **Bundle Size Management**: Monitor with Vite, tree-shake, code-split

All unknowns from Technical Context resolved.

---

## Phase 1: Design & Contracts (Complete)

**Status**: ✅ Complete  
**Outputs**:
- [data-model.md](./data-model.md) - Database schema, client models, state management
- [contracts/supabase-auth.md](./contracts/supabase-auth.md) - Authentication API contract
- [contracts/supabase-database.md](./contracts/supabase-database.md) - Database operations contract
- [quickstart.md](./quickstart.md) - Developer setup guide

### Data Model Summary

**Database Tables**:
- `auth.users` (Supabase-managed): User accounts
- `quest_progress`: User quest completion status

**Client Models**:
- `User`: Authentication state wrapper
- `QuestProgress`: Quest completion with timestamps
- `SyncQueueItem`: Offline sync queue entries

**Storage Strategy**:
- Primary: Supabase PostgreSQL with RLS
- Fallback: Browser LocalStorage
- Sync: Last-write-wins by timestamp

### API Contracts

**Authentication Operations** (supabase-auth.md):
- Sign up, sign in, sign out
- Get session, get user
- Update user metadata
- Password reset
- Auth state change listener

**Database Operations** (supabase-database.md):
- Load user progress
- Mark quest complete/incomplete
- Batch upsert (for migration)
- Incremental sync by timestamp
- Delete operations

### Quick Start

Complete developer guide in quickstart.md covers:
- Local development setup (7 steps)
- Vercel deployment (6 steps)
- Supabase configuration (3 steps)
- Testing checklist (17 tests)
- Common issues & solutions (6 scenarios)
- Development workflow
- Monitoring & maintenance

---

## Phase 2: Implementation Planning (Next Step)

**Status**: Ready for /speckit.tasks command  
**Next Action**: Run `/speckit.tasks` to break plan into actionable tasks

### Implementation Phases (P1 → P2 → P3)

**Phase A: Vercel Deployment (P1 - Foundation)**
- Create vercel.json configuration
- Set up environment variables
- Configure GitHub integration
- Deploy static SPA
- Verify all existing features work

**Phase B: Supabase Setup (P2 - Backend)**
- Create Supabase project
- Run database migrations
- Configure RLS policies
- Test authentication in dashboard
- Verify database schema

**Phase C: Authentication Integration (P2 - Multi-user)**
- Create Supabase client module
- Implement auth service
- Build login/signup UI
- Add logout functionality
- Test session persistence

**Phase D: Data Sync (P2 - Cloud Storage)**
- Create storage service abstraction
- Implement sync to Supabase
- Add sync status indicators
- Handle offline scenarios
- Test conflict resolution

**Phase E: Migration Flow (P3 - User Retention)**
- Detect LocalStorage progress
- Build migration modal UI
- Implement batch migration
- Mark migration complete
- Test migration scenarios

**Phase F: Testing & Polish (P3 - Quality)**
- End-to-end testing
- Error handling improvements
- Performance optimization
- Documentation updates
- Production deployment

### Estimated Effort

**Total**: ~40-60 hours development time

| Phase | Complexity | Estimated Hours |
|-------|-----------|----------------|
| Phase A: Vercel Deployment | Low | 4-6 hours |
| Phase B: Supabase Setup | Low | 2-3 hours |
| Phase C: Authentication | Medium | 10-12 hours |
| Phase D: Data Sync | High | 12-16 hours |
| Phase E: Migration Flow | Medium | 6-8 hours |
| Phase F: Testing & Polish | Medium | 6-10 hours |

---

## Risk Assessment

### Technical Risks

**Risk 1: Free Tier Limits**
- **Probability**: Medium
- **Impact**: High (app stops working if exceeded)
- **Mitigation**: Monitor usage metrics, implement usage alerts, LocalStorage fallback
- **Contingency**: Upgrade to paid tier (~$25/month) or optimize queries

**Risk 2: Supabase Service Availability**
- **Probability**: Low
- **Impact**: Medium (users can't sync)
- **Mitigation**: LocalStorage fallback, retry queue, graceful degradation
- **Contingency**: Display offline mode message, queue syncs for later

**Risk 3: Data Sync Conflicts**
- **Probability**: Medium
- **Impact**: Low (user might lose some progress)
- **Mitigation**: Last-write-wins strategy, clear sync status indicators
- **Contingency**: Add manual conflict resolution UI if issues arise

**Risk 4: User Adoption Resistance**
- **Probability**: Medium
- **Impact**: Medium (users don't create accounts)
- **Mitigation**: Optional authentication, migration preserves progress
- **Contingency**: Continue LocalStorage-only mode, iterate on auth UX

### Operational Risks

**Risk 5: Database Migration Failures**
- **Probability**: Low
- **Impact**: Medium (users can't migrate)
- **Mitigation**: Non-destructive migration, retry logic, error logging
- **Contingency**: Manual migration support, rollback to LocalStorage-only

**Risk 6: Bundle Size Bloat**
- **Probability**: Medium
- **Impact**: Low (slower load times)
- **Mitigation**: Monitor bundle size, tree-shaking, code splitting
- **Contingency**: Lazy load auth modules, optimize dependencies

---

## Success Metrics (from spec.md)

### Deployment Success (P1)
- ✅ SC-001: Deploy to Vercel with public URL < 5 minutes
- ✅ SC-002: Automated deployments on every main branch push
- ✅ SC-003: Preview deployments for 100% of PRs
- ✅ SC-004: Zero downtime during deployments

### Backend Integration (P2)
- SC-005: User can create account, login, persist progress
- SC-006: Progress accessible from any device
- SC-007: Offline mode with LocalStorage fallback works
- SC-008: Database queries < 500ms

### User Experience (P2)
- SC-009: 95% successful account creation on first attempt
- SC-010: Migration completes in < 30 seconds
- SC-011: Sync status clearly visible
- SC-012: App loads in < 3 seconds

### Security (P1)
- ✅ SC-013: Zero secrets in public repository
- SC-014: RLS prevents cross-user data access
- ✅ SC-015: Environment variables properly isolated

### Cost Efficiency (P1)
- SC-016: Stay on Vercel free tier
- SC-017: Stay on Supabase free tier
- SC-018: $0/month for < 10k users

### Reliability (P2)
- SC-019: 99% uptime (excluding maintenance)
- SC-020: 0% data loss rate
- SC-021: > 95% sync success rate
- SC-022: Graceful degradation when backend unavailable

---

## Validation Checklist

**Before Implementation**:
- [x] Research complete (all NEEDS CLARIFICATION resolved)
- [x] Data model defined (database schema + client models)
- [x] API contracts documented (auth + database operations)
- [x] Quickstart guide written (7-step setup)
- [x] Agent context updated (new technologies added)

**Before Testing**:
- [ ] All code implemented per tasks.md
- [ ] Unit tests written for critical paths
- [ ] Integration tests pass against real Supabase
- [ ] Manual testing checklist completed

**Before Production**:
- [ ] All success criteria met (SC-001 through SC-022)
- [ ] No security vulnerabilities (secrets, RLS, auth)
- [ ] Performance goals achieved (< 3s load, < 500ms queries)
- [ ] Documentation complete (README, deployment guide)

---

## Next Steps

1. **Run /speckit.tasks** to generate tasks.md
   - Break down each phase into actionable tasks
   - Assign task IDs and dependencies
   - Estimate individual task effort

2. **Run /speckit.implement** to execute tasks
   - Follow task sequence from tasks.md
   - Implement features incrementally
   - Test after each phase completion

3. **Deploy to Production**
   - Follow quickstart.md deployment steps
   - Monitor success metrics
   - Collect user feedback

---

## Related Documents

- **Specification**: [spec.md](./spec.md) - Feature requirements and user stories
- **Research**: [research.md](./research.md) - Technical decisions and alternatives
- **Data Model**: [data-model.md](./data-model.md) - Database schema and client models
- **Contracts**: [contracts/](./contracts/) - API operation specifications
- **Quickstart**: [quickstart.md](./quickstart.md) - Developer setup guide
- **Tasks**: tasks.md (to be generated by /speckit.tasks)

---

**Plan Status**: ✅ Complete - Ready for task breakdown  
**Generated**: 2025-11-15  
**Author**: GitHub Copilot (via speckit.plan workflow)

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

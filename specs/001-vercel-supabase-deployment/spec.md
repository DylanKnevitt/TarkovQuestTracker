# Feature Specification: Vercel + Supabase Deployment with Multi-User Support

**Feature Branch**: `001-vercel-supabase-deployment`  
**Created**: 2025-01-15  
**Status**: Draft  
**Input**: User description: "I need a deployment plan to get this onto github vercel and some form of free backend (supabase?)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deploy Current SPA to Vercel (Priority: P1)

Deploy the existing static Tarkov Quest Tracker application to Vercel with automatic deployments from GitHub, maintaining all current functionality with no backend dependencies.

**Why this priority**: Establishes production deployment infrastructure and makes the app publicly accessible with zero-cost hosting. This is the foundation for all subsequent enhancements.

**Independent Test**: Can be fully tested by visiting the deployed Vercel URL and confirming all existing features work (quest list, graph visualization, filtering, path finding, LocalStorage persistence). No backend required.

**Acceptance Scenarios**:

1. **Given** code is pushed to GitHub main branch, **When** Vercel detects the push, **Then** application automatically deploys to production URL
2. **Given** application is deployed on Vercel, **When** user visits the URL, **Then** quest list loads from Tarkov.dev API and displays correctly
3. **Given** user marks quests as complete, **When** page is refreshed, **Then** progress persists via LocalStorage (no backend needed yet)
4. **Given** application is deployed, **When** accessed from mobile device, **Then** responsive design works correctly
5. **Given** deployed application, **When** API fails, **Then** cached data is used and error message displays

---

### User Story 2 - Set Up Supabase Project (Priority: P2)

Create and configure a Supabase project with authentication and database schema for multi-user quest tracking.

**Why this priority**: Establishes backend infrastructure needed for user accounts and cloud-based progress storage. Required before any multi-user features can be added.

**Independent Test**: Can be tested by successfully creating a Supabase project, running migrations to create database schema, and verifying authentication is configured. Test user registration and login through Supabase dashboard.

**Acceptance Scenarios**:

1. **Given** Supabase account exists, **When** new project is created, **Then** project is provisioned with PostgreSQL database and authentication enabled
2. **Given** Supabase project exists, **When** database migration is run, **Then** tables for users and quest_progress are created with proper relationships
3. **Given** authentication is configured, **When** test user registers, **Then** user account is created in Supabase auth system
4. **Given** environment variables are set, **When** application connects to Supabase, **Then** connection succeeds and queries return results
5. **Given** Row Level Security (RLS) policies are enabled, **When** user queries their data, **Then** only their own quest progress is accessible

---

### User Story 3 - Implement User Authentication (Priority: P2)

Add email/password authentication to the application using Supabase Auth, allowing users to create accounts and log in to save progress to the cloud.

**Why this priority**: Enables the core value proposition of cloud-based progress storage. Without authentication, multi-user features cannot function.

**Independent Test**: Can be tested by registering a new account, logging in, marking quests as complete, logging out, logging back in from a different browser/device, and confirming progress is retained.

**Acceptance Scenarios**:

1. **Given** user has no account, **When** they click "Sign Up" and provide email/password, **Then** account is created and user is automatically logged in
2. **Given** user has an account, **When** they enter correct credentials, **Then** user is authenticated and their profile loads
3. **Given** user is logged in, **When** they click "Log Out", **Then** session ends and app returns to login screen
4. **Given** user enters incorrect password, **When** they attempt to log in, **Then** error message displays without revealing whether email exists
5. **Given** user is authenticated, **When** page refreshes, **Then** session persists and user remains logged in
6. **Given** user clicks "Forgot Password", **When** they enter email, **Then** password reset email is sent

---

### User Story 4 - Sync Progress to Supabase (Priority: P2)

Replace LocalStorage persistence with Supabase database storage, allowing quest progress to sync across devices while maintaining LocalStorage as a fallback for offline usage.

**Why this priority**: Delivers the key benefit of cloud deployment - progress available on any device. This is what transforms a single-device app into a true multi-user service.

**Independent Test**: Can be tested by marking quests complete on one device, logging in on a different device/browser, and confirming the same progress displays. Test offline mode by disconnecting network and verifying LocalStorage fallback works.

**Acceptance Scenarios**:

1. **Given** user is logged in, **When** they mark a quest as complete, **Then** progress saves to Supabase database and LocalStorage as backup
2. **Given** user has progress saved, **When** they log in on a different device, **Then** their quest progress loads from Supabase
3. **Given** user is offline, **When** they mark quests complete, **Then** changes save to LocalStorage and sync to Supabase when connection returns
4. **Given** sync conflict occurs, **When** comparing LocalStorage and Supabase data, **Then** most recent timestamp wins (last-write-wins strategy)
5. **Given** user logs out, **When** they view the app, **Then** they see a clean slate (no progress) until they log back in
6. **Given** Supabase is unavailable, **When** user tries to save progress, **Then** app falls back to LocalStorage with warning message

---

### User Story 5 - Migrate Existing LocalStorage Data (Priority: P3)

Provide a one-time migration flow that imports existing LocalStorage quest progress into the user's Supabase account when they first sign up or log in.

**Why this priority**: Ensures users don't lose existing progress when transitioning from single-user to cloud-based storage. Important for retention but not blocking for new users.

**Independent Test**: Can be tested by using the app without authentication to build up LocalStorage progress, then signing up for an account and confirming all previous progress is imported into Supabase.

**Acceptance Scenarios**:

1. **Given** user has LocalStorage progress, **When** they create account for first time, **Then** migration modal appears offering to import existing progress
2. **Given** user accepts migration, **When** import runs, **Then** all LocalStorage completed quests are saved to Supabase under their account
3. **Given** migration completes, **When** user checks quest list, **Then** all previously completed quests show as complete
4. **Given** user declines migration, **When** they proceed, **Then** they start with clean progress and LocalStorage data remains untouched
5. **Given** migration has already run, **When** user logs in again, **Then** no migration prompt appears

---

### User Story 6 - Environment Management & Secrets (Priority: P1)

Configure secure environment variable management for API keys and database credentials across local development, preview deployments, and production.

**Why this priority**: Security requirement that must be in place before any backend integration. Prevents accidental exposure of credentials.

**Independent Test**: Can be tested by verifying environment variables are properly set in Vercel dashboard, confirming .env files are gitignored, and testing that application connects to Supabase using environment variables in development and production.

**Acceptance Scenarios**:

1. **Given** Vercel project exists, **When** environment variables are added in dashboard, **Then** they are available to the deployed application
2. **Given** .env.local file exists, **When** git status is checked, **Then** file is ignored and not committed
3. **Given** environment variables are set, **When** application initializes, **Then** Supabase client connects using the variables
4. **Given** preview deployment is created, **When** pull request is opened, **Then** preview uses separate environment variables for testing
5. **Given** secrets need to be rotated, **When** new values are set in Vercel, **Then** next deployment uses updated credentials without code changes

---

### Edge Cases

**Authentication Edge Cases**:
- What happens when user tries to log in with email that doesn't exist?
- How does system handle password reset for non-existent email without revealing this?
- What happens when Supabase auth service is temporarily unavailable?
- How does session expiry work (time limits, refresh tokens)?
- What happens when user logs in on multiple devices simultaneously?

**Data Sync Edge Cases**:
- What happens when user makes changes offline on two devices, then both come online?
- How does system handle partial sync failures (some quests saved, some failed)?
- What happens when LocalStorage quota is exceeded?
- How does system handle database connection timeouts during save?
- What happens when user's database quota is exceeded?

**Migration Edge Cases**:
- What happens when user has progress in both LocalStorage and Supabase (already used app before migration)?
- How does system handle migration failures (network issues, database errors)?
- What happens when user attempts migration multiple times?
- How does system handle corrupted LocalStorage data during migration?

**Deployment Edge Cases**:
- What happens when Vercel build fails?
- How does system handle missing environment variables during deployment?
- What happens when Supabase database migrations fail?
- How does rollback work if production deployment has critical bug?
- What happens when Tarkov.dev API is down (does caching still work)?

---

## Requirements *(mandatory)*

### Functional Requirements

**Deployment Infrastructure (P1)**:
- **FR-001**: System MUST deploy to Vercel with automatic deployments triggered by GitHub pushes to main branch
- **FR-002**: System MUST serve the application via Vercel's CDN with HTTPS enabled
- **FR-003**: System MUST support preview deployments for all pull requests
- **FR-004**: System MUST include vercel.json configuration file for routing and headers
- **FR-005**: System MUST maintain zero-downtime deployments with automatic rollback on failure

**Supabase Backend (P2)**:
- **FR-006**: System MUST provision Supabase project with PostgreSQL database and authentication
- **FR-007**: System MUST create database schema with tables for users, quest_progress, and metadata
- **FR-008**: System MUST implement Row Level Security (RLS) policies to ensure users can only access their own data
- **FR-009**: System MUST use Supabase client library for database operations and authentication
- **FR-010**: System MUST handle database connection failures gracefully with fallback to LocalStorage

**Authentication (P2)**:
- **FR-011**: System MUST support email/password authentication via Supabase Auth
- **FR-012**: System MUST implement password strength validation (minimum 8 characters)
- **FR-013**: System MUST provide password reset functionality via email
- **FR-014**: System MUST maintain persistent sessions with automatic token refresh
- **FR-015**: System MUST provide clear login/logout UI in application header
- **FR-016**: System MUST validate email format before account creation
- **FR-017**: System MUST prevent duplicate account creation with same email

**Data Synchronization (P2)**:
- **FR-018**: System MUST save quest completion progress to Supabase when user is authenticated
- **FR-019**: System MUST load quest progress from Supabase on application initialization for logged-in users
- **FR-020**: System MUST maintain LocalStorage as backup/cache for offline functionality
- **FR-021**: System MUST sync LocalStorage changes to Supabase when connection is restored
- **FR-022**: System MUST implement conflict resolution using last-write-wins strategy with timestamps
- **FR-023**: System MUST handle network failures during sync without data loss
- **FR-024**: System MUST display sync status indicator (synced/syncing/offline)

**Data Migration (P3)**:
- **FR-025**: System MUST detect existing LocalStorage progress on first authentication
- **FR-026**: System MUST prompt user to migrate existing progress to cloud storage
- **FR-027**: System MUST import all LocalStorage completed quests to Supabase during migration
- **FR-028**: System MUST prevent duplicate migrations for same user
- **FR-029**: System MUST preserve LocalStorage data even after migration (non-destructive)

**Environment & Security (P1)**:
- **FR-030**: System MUST use environment variables for all sensitive credentials (Supabase URL, API keys)
- **FR-031**: System MUST never commit secrets or credentials to version control
- **FR-032**: System MUST maintain separate environment variables for development, preview, and production
- **FR-033**: System MUST implement .env file with .gitignore protection
- **FR-034**: System MUST validate environment variables exist before application initialization

**Monitoring & Error Handling (P3)**:
- **FR-035**: System SHOULD log deployment events and errors
- **FR-036**: System SHOULD implement error boundaries for frontend error handling
- **FR-037**: System SHOULD track sync failures and retry automatically
- **FR-038**: System SHOULD provide user-friendly error messages for common failures

### Key Entities

**User**:
- Email address (unique identifier)
- Encrypted password (managed by Supabase Auth)
- User ID (UUID from Supabase)
- Created timestamp
- Last login timestamp
- Email verification status

**QuestProgress**:
- User ID (foreign key to User)
- Quest ID (from Tarkov.dev API)
- Completed status (boolean)
- Completion timestamp
- Last updated timestamp
- Sync status (for offline support)

**SyncQueue** (for offline support):
- User ID
- Quest ID
- Action (complete/incomplete)
- Timestamp
- Retry count
- Status (pending/synced/failed)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Deployment Success (P1)**:
- **SC-001**: Application deploys to Vercel successfully with functional public URL accessible within 5 minutes of code push
- **SC-002**: Automated deployments trigger on every push to main branch without manual intervention
- **SC-003**: Preview deployments are created for 100% of pull requests
- **SC-004**: Zero downtime during deployments - users can access the application continuously

**Backend Integration Success (P2)**:
- **SC-005**: User can create account, log in, and mark quests complete with data persisting in Supabase database
- **SC-006**: User can access their quest progress from any device after logging in
- **SC-007**: Application functions offline with LocalStorage fallback and syncs changes when connection returns
- **SC-008**: Database queries complete in under 500ms for typical user operations

**User Experience Success (P2)**:
- **SC-009**: 95% of users successfully create account and log in on first attempt without support
- **SC-010**: Users can migrate existing LocalStorage progress to cloud in under 30 seconds
- **SC-011**: Sync status is clearly visible to users with appropriate indicators
- **SC-012**: Application loads in under 3 seconds on first visit (including authentication check)

**Security Success (P1)**:
- **SC-013**: Zero secrets or credentials exposed in public GitHub repository or client-side code
- **SC-014**: Row Level Security policies prevent any user from accessing another user's data
- **SC-015**: Environment variables are properly isolated between development, preview, and production

**Cost Efficiency (P1)**:
- **SC-016**: Deployment remains on free tier of Vercel (within bandwidth and build limits)
- **SC-017**: Supabase remains on free tier (within database size and bandwidth limits)
- **SC-018**: Total monthly hosting cost is $0 for reasonable usage (< 10k users)

**Reliability Success (P2)**:
- **SC-019**: Application maintains 99% uptime (excluding scheduled maintenance)
- **SC-020**: Data loss rate is 0% - all completed quests are reliably persisted
- **SC-021**: Sync success rate is > 95% when network is available
- **SC-022**: Application degrades gracefully when backend is unavailable (LocalStorage fallback works)

---

## Dependencies & Assumptions

### External Dependencies

**Services**:
- GitHub repository for version control and CI/CD trigger
- Vercel platform for hosting and automatic deployments
- Supabase platform for PostgreSQL database and authentication
- Tarkov.dev API (existing dependency) for quest data

**Accounts Required**:
- GitHub account (existing)
- Vercel account (free tier)
- Supabase account (free tier)

**Free Tier Limitations**:
- Vercel: 100 GB bandwidth/month, 100 hours build time/month
- Supabase: 500 MB database, 2 GB bandwidth, 50k monthly active users
- Assumption: These limits are sufficient for initial rollout (< 1000 active users)

### Technical Assumptions

**Architecture**:
- Current SPA architecture is compatible with Vercel deployment
- No server-side rendering required initially
- Supabase client library works in browser environment
- LocalStorage remains viable for offline cache

**Data Model**:
- Quest data structure from Tarkov.dev API remains stable
- Quest IDs are persistent across API versions
- User progress is binary (complete/incomplete per quest)
- No quest metadata beyond completion status needed initially

**Security**:
- Supabase Row Level Security is sufficient for data isolation
- Email/password authentication is acceptable (no OAuth initially)
- HTTPS via Vercel CDN provides adequate transport security
- Client-side authentication flow is secure with proper token handling

**Browser Support**:
- Target browsers support ES6 modules (existing constraint)
- LocalStorage API remains available in all target browsers
- Supabase client library supports same browser matrix

---

## Out of Scope

**NOT included in this feature**:

**Advanced Authentication**:
- OAuth providers (Google, Discord, etc.) - possible future enhancement
- Two-factor authentication
- Social login
- Magic link authentication

**Advanced Data Features**:
- Multiple character profiles per user
- Quest notes or custom metadata
- Quest completion history/analytics
- Sharing progress with other users
- Public profile pages

**Enhanced Functionality**:
- Real-time collaboration features
- Quest timer tracking
- Achievement system
- Leaderboards or rankings
- In-app notifications

**DevOps Enhancements**:
- Custom domain setup (can use Vercel subdomain initially)
- Advanced monitoring/analytics (beyond basic error tracking)
- Load testing or performance benchmarking
- Automated backup strategy
- Database replication

**Cost Optimization**:
- CDN optimization beyond Vercel defaults
- Database query optimization
- Image optimization or compression
- Aggressive caching strategies

---

## Technical Constraints

**Free Tier Limits**:
- Must stay within Vercel free tier: 100 GB bandwidth/month
- Must stay within Supabase free tier: 500 MB database, 2 GB bandwidth
- Cannot use paid features of either platform

**Performance**:
- Must maintain current performance targets (< 5s initial load, < 1s list render)
- Cannot significantly increase bundle size (stay under 500 KB total)
- Database queries must complete in < 500ms

**Browser Compatibility**:
- Must maintain support for Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Cannot require server-side rendering or Node.js runtime
- Must work with current ES6 module approach

**Security**:
- Cannot store unencrypted sensitive data
- Must use HTTPS for all communication
- Must implement proper authentication token handling
- Cannot expose API keys or credentials client-side

---

## Migration Strategy

**For Existing Users**:

1. **Announcement Phase** (before deployment):
   - Add banner to application: "Cloud sync coming soon - your progress will be safe!"
   - Create migration guide documentation

2. **Deployment Phase**:
   - Deploy to Vercel with authentication disabled initially
   - Verify existing functionality works identically
   - Enable authentication after verification

3. **Migration Phase**:
   - First-time users see login/signup screen
   - Existing users (detected via LocalStorage) see migration prompt
   - Users can continue using LocalStorage-only if they decline

4. **Validation Phase**:
   - Monitor migration success rate
   - Track sync failures
   - Collect user feedback

**Rollback Plan**:
- Keep LocalStorage implementation intact as fallback
- Can disable Supabase integration via feature flag if issues arise
- Vercel allows instant rollback to previous deployment
- No data loss possible (LocalStorage preserved)

---

## Success Metrics & Monitoring

**Track These Metrics**:

**Deployment Metrics**:
- Deployment success rate
- Build time duration
- Time from push to live
- Number of failed deployments
- Vercel bandwidth usage (stay under 100 GB)

**User Adoption Metrics**:
- Percentage of users who create accounts
- Percentage of users who migrate existing progress
- Daily/monthly active users
- User retention rate (return visits)

**Technical Metrics**:
- Database query latency
- Sync success rate
- Sync failure reasons
- LocalStorage fallback usage rate
- API error rate (Tarkov.dev)
- Supabase API error rate

**Cost Metrics**:
- Vercel bandwidth usage vs. free tier limit
- Supabase database size vs. free tier limit
- Supabase bandwidth usage vs. free tier limit
- Monthly active users vs. Supabase limit (50k)

---

## Documentation Requirements

**Must Create**:
- Deployment guide (step-by-step Vercel + Supabase setup)
- Environment variable setup guide
- Database migration guide
- User onboarding documentation
- API integration guide (Supabase client usage)
- Troubleshooting guide for common issues

**Must Update**:
- README.md with deployment information
- TECHNICAL_SPECIFICATION.md with backend architecture
- Update existing docs to mention authentication requirement

---

## Related Documents

- Existing: `CLOUD_DEPLOYMENT_SPEC.md` (high-level architecture overview)
- Existing: `TECHNICAL_SPECIFICATION.md` (current frontend architecture)
- Existing: `README.md` (user documentation)
- To Create: `specs/001-vercel-supabase-deployment/plan.md` (implementation plan)
- To Create: `DEPLOYMENT_GUIDE.md` (step-by-step deployment instructions)

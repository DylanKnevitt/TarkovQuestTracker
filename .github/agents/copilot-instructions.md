# TarkovQuest Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-15

## Active Technologies
- JavaScript ES6+ (ES2020), Node.js 18+ for build tooling (001-vercel-supabase-deployment)
- JavaScript ES6+ (ES2020), existing codebase (002-user-quest-comparison)
- JavaScript ES6+ (ES2020 target), no transpilation + Vite 5.0.0 (build), Cytoscape.js 3.28.1 (unused for this feature), @supabase/supabase-js 2.81.1 (optional) (003-item-tracker)
- localStorage (primary) for quest/item progress, Supabase PostgreSQL (optional cloud sync), 24h API cache (003-item-tracker)

- JavaScript ES6+ (Browser-native, no build step) + Cytoscape.js 3.28.1+, Cytoscape-Dagre 2.5.0+, http-server 14.1.1+ (dev only) (master)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

JavaScript ES6+ (Browser-native, no build step): Follow standard conventions

## Recent Changes
- 003-item-tracker: Added JavaScript ES6+ (ES2020 target), no transpilation + Vite 5.0.0 (build), Cytoscape.js 3.28.1 (unused for this feature), @supabase/supabase-js 2.81.1 (optional)
- 002-user-quest-comparison: Added JavaScript ES6+ (ES2020), existing codebase
- 001-vercel-supabase-deployment: Added JavaScript ES6+ (ES2020), Node.js 18+ for build tooling


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

# Window Seat AI - Living State

## Project Reference
**Building:** In-flight narration app with offline AI-powered descriptions
**Core Value:** Transform the window seat experience

## Current Position
- **Milestone:** 1 (MVP Polish) - COMPLETE
- **Phase:** 6 (App Store Submission) - IN PROGRESS
- **Next:** Test preview build, then production submission
- **Status:** Building preview APK with crash fixes

## Progress
```
Phase 1: [████████████] Complete - Technical Debt
Phase 2: [████████████] Complete - Native Map Support
Phase 3: [████████████] Complete - UX Improvements
Phase 4: [████████████] Complete - New Features
Phase 5: [████████████] Complete - Offline Maps (ad-hoc)
Phase 6: [████░░░░░░░░] In Progress - App Store Submission
```

## Recent Decisions
- **Theme system**: Dark/light/system modes with centralized theme config
- **Language support**: 9 languages supported via ClaudeService prompt modification
- **Route preview**: Modal-based preview before committing to download

## Deferred Issues
None currently.

## Session Continuity
- **Last session:** 2026-01-24
- **Last commit:** 3fcfcde - feat: App store submission setup + Android crash fixes
- **Resume file:** `.planning/phases/06-app-store-submission/.continue-here.md`

## Pending Todos
0 pending

## Files Modified This Session
- `App.js` - FlightSearch modal, ErrorBoundary, detailed logging
- `app.json` - Bundle IDs, permissions, EAS project ID
- `eas.json` - NEW: Build profiles
- `package.json` - Build scripts, netinfo dependency
- `components/ErrorBoundary.js` - NEW: Crash boundary
- `components/index.js` - Export ErrorBoundary
- `components/RoutePreview.js` - Android modal compatibility
- `components/map/FlightMap.js` - Google Maps fallback, error handling
- `services/MapTileService.js` - Route validation, timeout handling
- `services/NarrationService.js` - Defensive map download
- `CLAUDE.md` - Session notes updated

# Window Seat AI - Development Plan

## Current State
**Status:** Phase 2 Complete
**Date:** January 20, 2026
**Last Commit:** 0152648 - Add native map support, TypeScript, and fix deprecations

### Working Features
- 11 services (Location, Claude, ElevenLabs, Audio, FlightData, Landmark, Sun, Border, Share, etc.)
- 14 UI components (telemetry, audio controls, checkpoint list, settings, history)
- Offline GPS tracking with geofenced triggers
- AI narrations with voice synthesis
- Sun tracker, border alerts, window side advisor
- Demo flights work without API keys

### Recent Improvements (Phase 1 & 2)
- Native map support on iOS/Android (react-native-maps)
- TypeScript configured with geofence.ts converted
- 29 unit tests for geofence utilities
- Fixed expo-av → expo-audio, SafeAreaView deprecations

---

## Phase 1: Technical Debt ✅ COMPLETE
- [x] Fix expo-av deprecation → migrated to expo-audio
- [x] Fix SafeAreaView deprecation → using react-native-safe-area-context
- [x] Add TypeScript configuration (tsconfig.json, converted geofence.ts)
- [x] Add unit tests for geofence utilities (29 tests passing)

## Phase 2: Native Map Support ✅ COMPLETE
- [x] Installed react-native-maps (v1.20.1)
- [x] Created native FlightMap.js with MapView, Polyline, Circle, Marker
- [x] Shows route, checkpoints with geofence circles, and user location
- [x] Platform-specific: web uses react-leaflet, native uses react-native-maps

## Phase 3: UX Improvements ✅ COMPLETE
- [x] Better error messages for users
- [x] Loading skeletons during narration generation
- [x] Retry logic for flaky API calls
- [x] Accessibility (a11y) improvements

## Phase 4: New Features ← IN PROGRESS
- [x] Flight search/browse instead of typing numbers
  - 50+ demo flights organized by region (Transatlantic, Europe, Asia-Pacific, Americas, Middle East)
  - 30+ custom routes with country flags
  - Scenic flights highlighted (glaciers, oceans, longest routes)
  - Regional filter tabs for easy browsing
  - Recent searches preserved
- [ ] Route preview before downloading
- [ ] Dark/light mode toggle
- [ ] Multi-language narrations

# Window Seat AI - Development Plan

## Current State
**Status:** MVP Feature Complete
**Date:** January 2026

### Working Features
- 11 services (Location, Claude, ElevenLabs, Audio, FlightData, Landmark, Sun, Border, Share, etc.)
- 14 UI components (telemetry, audio controls, checkpoint list, settings, history)
- Offline GPS tracking with geofenced triggers
- AI narrations with voice synthesis
- Sun tracker, border alerts, window side advisor
- Demo flights work without API keys

### Known Gaps
- Native map support (mobile shows placeholder)
- No TypeScript
- No test coverage
- Deprecation warnings (expo-av, SafeAreaView)

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

## Phase 3: UX Improvements
- [ ] Better error messages for users
- [ ] Loading skeletons during narration generation
- [ ] Retry logic for flaky API calls
- [ ] Accessibility (a11y) improvements

## Phase 4: New Features (Optional)
- [ ] Flight search/browse instead of typing numbers
- [ ] Route preview before downloading
- [ ] Dark/light mode toggle
- [ ] Multi-language narrations

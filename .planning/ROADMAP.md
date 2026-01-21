# Window Seat AI - Roadmap

## Milestone 1: MVP Polish

### Phase 1: Technical Debt - COMPLETE
**Goal:** Clean up deprecations and add foundational tooling

- [x] Fix expo-av deprecation (migrated to expo-audio)
- [x] Fix SafeAreaView deprecation (react-native-safe-area-context)
- [x] Add TypeScript configuration
- [x] Add unit tests for geofence utilities (29 tests)

### Phase 2: Native Map Support - COMPLETE
**Goal:** Full-featured maps on iOS and Android

- [x] Install react-native-maps
- [x] Create native FlightMap component
- [x] Show route, checkpoints, geofence circles, user location
- [x] Platform-specific: web uses react-leaflet, native uses react-native-maps

### Phase 3: UX Improvements - COMPLETE
**Goal:** Better user feedback and error handling

- [x] Better error messages for users (ErrorBanner component)
- [x] Loading skeletons during narration generation (LoadingSkeleton components)
- [x] Retry logic for flaky API calls (withRetry utility)
- [x] Accessibility (a11y) improvements (screen reader support, roles, live regions)

### Phase 4: New Features
**Goal:** Enhanced discovery and personalization

- [ ] Flight search/browse instead of typing numbers
- [ ] Route preview before downloading
- [ ] Dark/light mode toggle
- [ ] Multi-language narrations

---

## Future Milestones (Ideas)

### Milestone 2: Enhanced Content
- Richer landmark data
- Historical photos/images
- Altitude-aware narrations
- Weather integration

### Milestone 3: Social & Sharing
- Share narration packs
- Community-contributed landmarks
- Trip journals

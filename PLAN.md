# Window Seat - Plan

## Done in v1.1.0 (2026-09-28): usable without any setup
- [x] Offline atlas: ~480 sights with hand-written narrations, ~436 airports
- [x] Route by airport pair (offline) or flight number (free lookup)
- [x] Narrator engine: left/right/below, timing, equator/tropics/date-line crossings, in-flight facts
- [x] GPS mode + flight-clock fallback, keep-awake, device voice (expo-speech)
- [x] New UI (plan screen, flight screen, offline route diagram), light/dark themes, settings
- [x] Removed API-key features, Google Maps, offline tile downloads, background permissions
- [x] Privacy policy / terms / store listing rewritten to match

## Next
- [ ] Build with EAS, upload to Play Console (internal track first), test on a real flight
- [ ] Update Play listing text, screenshots and Data safety form (see STORE_LISTING.md)
- [ ] More sights along busy corridors (Africa, South-East Asia, Latin America are thinner than Europe/US)
- [ ] Other narration languages (Lithuanian first) - texts live in `data/landmarks/`
- [ ] Optional: real airway waypoints instead of great circle when a flight lookup provides them
- [ ] iOS build (bundle id `com.stonku.windowseat`, App Store Connect app 6758273815)

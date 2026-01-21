# Window Seat AI - Project Definition

## What This Is
A mobile app that narrates what you're flying over during flights. Pre-caches AI-generated descriptions so it works 100% offline at 35,000 feet.

## Core Value
Transform the window seat experience by providing real-time, intelligent narration of landmarks, terrain, and points of interest visible from the aircraft.

## Requirements

### Validated
- Pre-flight download of narration packs by flight number
- Offline GPS tracking (works in airplane mode)
- Geofenced audio triggers as you cross landmarks
- AI-generated narrations (Claude API)
- Voice synthesis (ElevenLabs API)
- Demo mode without API keys

### Active
- User-friendly error messages
- Loading states during async operations
- Retry logic for API failures
- Accessibility improvements

### Out of Scope (Current Milestone)
- Backend server / user accounts
- Social features / sharing between users
- Offline map tiles
- AR overlay features

## Tech Stack
| Component | Technology |
|-----------|------------|
| Frontend | Expo / React Native |
| Flight Data | AeroAPI (FlightAware) |
| AI Narration | Claude API (Anthropic) |
| Voice Synthesis | ElevenLabs API |
| Offline Storage | expo-file-system |
| GPS Tracking | expo-location |
| Audio Playback | expo-audio |
| Map (Web) | react-leaflet / Leaflet |
| Map (Native) | react-native-maps |
| Landmark Data | OpenStreetMap (Nominatim + Overpass) |

## Key Decisions

### Architecture
- **Expo over bare React Native**: Faster development, easier deployment, sufficient for MVP
- **Platform-specific maps**: react-leaflet for web, react-native-maps for native (best UX per platform)
- **Singleton services**: LocationService, AudioService etc. as singletons for global state

### Data
- **Pre-cached narrations**: Download entire flight pack before takeoff for offline use
- **Great circle routes**: Generate realistic flight paths when API unavailable
- **Mock data for demos**: Predefined routes (BA115, BA117, etc.) work without API keys

### UX
- **Error banner pattern**: Prominent dismissable banners for errors, separate from narration display
- **Graceful degradation**: Always fall back to demo/mock data when APIs fail

## Constraints
- Must work 100% offline after pre-flight download
- No backend server required (client-only)
- Must support both iOS and Android via Expo
- Demo mode must work without any API keys

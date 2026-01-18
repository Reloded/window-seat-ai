# Window Seat AI

## Project Summary
Mobile app that narrates what you're flying over during flights. Pre-caches AI-generated descriptions so it works 100% offline at 35,000 feet.

## Current Status
- **Phase:** Initial Setup
- **Platform:** Expo (React Native)
- **Target:** iOS + Android

## Tech Stack
| Component | Technology |
|-----------|------------|
| Frontend | Expo / React Native |
| Flight Data | FlightRadar24 API (or AeroAPI) |
| AI Narration | Claude API |
| Voice Synthesis | ElevenLabs API |
| Offline Storage | expo-file-system |
| GPS Tracking | expo-location |
| Audio Playback | expo-av |

## Core Features
1. **Pre-flight Download:** Enter flight number, download narration pack
2. **Offline GPS Tracking:** Uses phone's internal GPS (works in airplane mode)
3. **Geofenced Triggers:** Audio plays automatically when crossing landmarks
4. **Rich Content:** Geological, historical, and modern facts about terrain

## API Keys Needed
- [ ] Claude API key (Anthropic)
- [ ] ElevenLabs API key (voice synthesis)
- [ ] FlightRadar24 or AeroAPI key (flight paths)

## Project Structure
```
/window-seat-ai
  /app              # Main app screens
  /components       # Reusable UI components
  /services         # API integrations (Claude, ElevenLabs, Flight data)
  /utils            # Helper functions (distance calc, etc.)
  /assets           # Static assets
  CLAUDE.md         # This file
```

## Next Steps
- [x] Initialize Expo project
- [x] Install dependencies (expo-location, expo-av, expo-file-system)
- [ ] Build GPS tracking component
- [ ] Create mock narration UI
- [ ] Add Claude API integration
- [ ] Add flight path pre-caching
- [ ] Add ElevenLabs audio generation
- [ ] Build offline playback system

## Commands
```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS (Mac only)
npm run web        # Run in browser
```

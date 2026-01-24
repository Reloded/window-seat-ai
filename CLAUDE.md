# Window Seat AI

## Project Summary
Mobile app that narrates what you're flying over during flights. Pre-caches AI-generated descriptions so it works 100% offline at 35,000 feet.

## Current Status
- **Phase:** Feature Complete (MVP)
- **Platform:** Expo (React Native)
- **Target:** iOS + Android

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
| Offline Maps | IndexedDB (web) / Static images (native) |
| Landmark Data | OpenStreetMap (Nominatim + Overpass) |

## Core Features
1. **Pre-flight Download:** Enter flight number, download narration pack
2. **Offline GPS Tracking:** Uses phone's internal GPS (works in airplane mode)
3. **Geofenced Triggers:** Audio plays automatically when crossing landmarks
4. **Rich Content:** Geological, historical, and modern facts about terrain
5. **Offline Maps:** Map tiles cached for viewing at 35,000 feet without internet

## API Keys (Optional)
The app works without any API keys using demo data. Add keys for full functionality:

| API | Purpose | Get Key |
|-----|---------|---------|
| Claude (Anthropic) | AI-generated narrations | [console.anthropic.com](https://console.anthropic.com) |
| ElevenLabs | Voice synthesis | [elevenlabs.io](https://elevenlabs.io) |
| AeroAPI (FlightAware) | Real flight routes | [flightaware.com/aeroapi](https://flightaware.com/commercial/aeroapi/) |

## Project Structure
```
/window-seat-ai
  /components       # Reusable UI components
    index.js        # Component exports
    TelemetryDisplay.js  # GPS telemetry bar
    StatusIndicator.js   # Tracking status indicator
    AudioPlayerControls.js # Audio playback controls
    NextCheckpointDisplay.js # Distance/ETA to next checkpoint
    FlightProgressBar.js # Visual flight progress with % complete
    CheckpointList.js # Scrollable list of all checkpoints
    WindowSideAdvisor.js # Recommends left/right window seat based on landmarks
    SunTrackerDisplay.js # Shows sun position, golden hour, sunrise/sunset times
    BorderCrossingAlert.js # Shows alerts when crossing country/state borders
    /map              # Map view components (platform-specific)
      index.js        # Map component exports
      FlightMap.js    # Native map with react-native-maps (offline fallback)
      FlightMap.web.js    # Web map with react-leaflet (cached tiles)
      StaticFlightMap.js  # Native offline map using pre-rendered images
      CachedTileLayer.web.js # Leaflet tile layer with IndexedDB caching
      CheckpointMarker.js # Native stub for markers
      CheckpointMarker.web.js # Web SVG markers using Leaflet
      mapStyles.js    # Map styling constants
    /settings         # Settings screen components
      index.js        # Settings exports
      SettingsModal.js    # Full-screen settings modal
      SettingsSection.js  # Grouped settings section
      SettingsRow.js      # Label + control row
      SettingsSlider.js   # Slider control
      SettingsToggle.js   # Switch control
      SettingsPicker.js   # Dropdown picker
      SettingsInput.js    # Text input for API keys
      SettingsButton.js   # Action button
      /sections           # Settings section components
        VoiceAudioSection.js
        NarrationSection.js
        GPSSection.js
        StorageSection.js
        APISection.js
    /history          # Flight history components
      index.js        # History component exports
      FlightHistoryModal.js   # Full-screen history modal
      FlightHistoryTabs.js    # All/Favorites tab switcher
      FlightHistoryList.js    # FlatList with empty state
      FlightHistoryItem.js    # Flight card with actions
  /config           # Configuration
    index.js        # Config exports
    api.js          # API keys and settings
  /contexts         # React contexts
    index.js        # Context exports
    SettingsContext.js      # Global settings state with AsyncStorage persistence
    FlightHistoryContext.js # Flight history with favorites, AsyncStorage persistence
  /hooks            # Custom React hooks
    index.js        # Hook exports
    useLocationTracking.js  # GPS tracking hook with geofencing
    useSettingsSync.js      # Syncs settings to services
  /services         # API integrations
    index.js        # Service exports
    LocationService.js  # GPS tracking service (singleton)
    ClaudeService.js    # Claude API for narration generation
    NarrationService.js # Manages narration caching & playback
    ElevenLabsService.js # Text-to-speech API integration
    AudioService.js     # Audio playback management (expo-audio)
    FlightDataService.js # Flight route data (AeroAPI)
    ShareService.js     # Share narrations via native share sheet or file download
    LandmarkService.js  # Reverse geocoding & POI lookup (OpenStreetMap)
    SunPositionService.js # Sunrise/sunset calculations and sun position
    BorderCrossingService.js # Detects country/state border crossings
    MapTileService.js   # Offline map tile caching (IndexedDB/static images)
  /utils            # Helper functions
    index.js        # Utility exports
    geofence.ts     # Distance calc, geofence checking (TypeScript)
    tileCalculations.ts # XYZ tile math for offline map caching
    conversions.js  # Unit conversions (m->ft, mps->kts, etc.)
    routeUtils.js   # Route-to-checkpoint conversion, ETA calc
    formatBytes.js  # Format bytes for display
  /assets           # Static assets
  App.js            # Main application
  CLAUDE.md         # This file
```

## Completed Features
- [x] Initialize Expo project
- [x] Install dependencies (expo-location, expo-av, expo-file-system)
- [x] Build GPS tracking component (LocationService, useLocationTracking hook, geofence utils)
- [x] Create mock narration UI (TelemetryDisplay, StatusIndicator components)
- [x] Add Claude API integration (ClaudeService, NarrationService with offline caching)
- [x] Add ElevenLabs audio generation (ElevenLabsService, AudioService, AudioPlayerControls)
- [x] Build offline playback system (audio cached to expo-file-system)
- [x] Add flight path pre-caching (FlightDataService with AeroAPI + great circle fallback)
- [x] Map view showing current position and upcoming checkpoints (react-leaflet for web)
- [x] Settings screen with voice, narration, GPS, storage, and API key configuration
- [x] Flight history and favorite routes (FlightHistoryContext, FlightHistoryModal)
- [x] Share narrations with other passengers (ShareService, native share sheet / file download)
- [x] Landmark identification using OpenStreetMap (LandmarkService with Nominatim + Overpass API)
- [x] Window side advisor recommending left/right seat based on landmarks along route
- [x] Sunrise/sunset tracker with golden hour alerts and viewing side recommendations
- [x] Country/state border crossing alerts with flag display
- [x] Mobile UI improvements (scrollable content, inline expandable sections)
- [x] Platform-specific map components (web uses react-leaflet, native uses react-native-maps)
- [x] Native map support with route, checkpoints, geofence circles, and user location
- [x] Offline map tiles cached during flight pack download (IndexedDB on web, static images on native)

## Recent Session Notes (2026-01-24)

### App Store Submission In Progress
Preparing to ship Window Seat to iOS App Store and Google Play Store.

#### Developer Accounts
- **Google Play**: Account created (Vibe2Future), identity verification pending
- **Apple Developer**: Enrollment processing ($99 paid), awaiting approval (1-2 days)

#### EAS Build Configuration Complete
- `app.json` updated with bundle IDs (`com.windowseat.app`), permissions, metadata
- `eas.json` created with development/preview/production profiles
- `package.json` has build scripts: `npm run build:ios`, `npm run build:android`, etc.
- EAS project linked: `@stonku/window-seat` (ID: 3820c932-9718-4e2f-a1b0-c5ee5561254c)

#### Android Builds
- Preview build working: https://expo.dev/accounts/stonku/projects/window-seat/builds/
- Build in progress (as of session end): 53167886-2173-42b1-9823-05ac90442c3b

#### Bugs Fixed This Session
1. **Missing dependency**: Added `@react-native-community/netinfo` (was causing build failure)
2. **Dev build crash**: Development builds crash without Metro server - use preview builds for testing
3. **Google Maps API key missing**: Native map crashes without API key - added fallback placeholder
4. **Flight search z-index**: Dropdown was hidden behind content - converted to full-screen modal
5. **Error boundaries**: Added `ErrorBoundary` component to catch crashes gracefully
6. **Detailed logging**: Added `[Download] Step 1...2...3...` console logs for debugging

#### Files Added/Modified
- `components/ErrorBoundary.js` - New error boundary component
- `components/map/FlightMap.js` - Added Google Maps fallback, error handling
- `App.js` - FlightSearch now a modal, ErrorBoundary wrapping, detailed download logging

### Known Issues / TODO
- **Google Maps on Android**: Requires API key for native maps. Currently shows placeholder.
  - To fix: Add `android.config.googleMaps.apiKey` to app.json
  - Get key from: https://console.cloud.google.com/ → Enable "Maps SDK for Android"
- **iOS build**: Waiting for Apple Developer enrollment approval
- **Store listings**: Need to create app listings in App Store Connect and Play Console
- **Privacy policy**: Required for both stores (not yet created)
- **Screenshots**: Need app store screenshots for both platforms

### Build Commands
```bash
# Preview build (standalone APK for testing)
eas build --platform android --profile preview

# Production build (for store submission)
eas build --platform android --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## Previous Session Notes (2026-01-22)

### Offline Maps Implementation Complete
Implemented offline map tile caching so maps work at 35,000 feet:
- **Web**: Custom Leaflet CachedTileLayer with IndexedDB storage
- **Native**: Pre-rendered static map images (3 zoom levels)
- Storage: ~2-10MB per flight depending on route length
- Integrated into NarrationService.downloadFlightPack()

### Files Added
- `utils/tileCalculations.ts` - XYZ tile math utilities
- `services/MapTileService.js` - Tile caching singleton
- `components/map/CachedTileLayer.web.js` - Leaflet offline layer
- `components/map/StaticFlightMap.js` - Native offline map component

### Bug Fixes Applied
- LocationService: Handle expo-location web subscription cleanup
- FlightMap: Defensive checks for undefined checkpoints
- Suppressed non-fatal console warnings (API rate limits, transient errors)

### Known Limitations
- Overpass API rate limits (429) cause some landmark lookups to fail - expected behavior
- expo-location has internal issues on web - errors caught and handled silently
- Map settings in SettingsContext added but UI not yet wired up

## Commands
```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS (Mac only)
npm run web        # Run in browser
npm test           # Run unit tests
npm run typecheck  # TypeScript type checking
```

## Testing on Mobile
1. Install **Expo Go** on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Run `npm start` or `npx expo start`
3. Scan the QR code with your phone camera (iOS) or Expo Go app (Android)
4. For remote testing, use `npx expo start --tunnel`

**Note:** Map view uses react-native-maps on iOS/Android and react-leaflet on web.

## API Key Configuration
Set environment variables or edit `config/api.js`:
```bash
# Option 1: Environment variables (recommended)
EXPO_PUBLIC_CLAUDE_API_KEY=your_claude_key
EXPO_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_key
EXPO_PUBLIC_FLIGHT_API_KEY=your_flight_api_key

# Option 2: Edit config/api.js directly (not for production)
```

The app works without API keys using demo/mock data for testing.

## Demo Flight Numbers
These flights work without API keys (mock routes):
- **BA115, BA117** - London (LHR) → New York (JFK)
- **BA178** - New York (JFK) → London (LHR)
- **BA284** - San Francisco (SFO) → London (LHR)
- **EK002** - London (LHR) → Dubai (DXB)
- **JL001** - San Francisco (SFO) → Tokyo (HND)
- **QF12** - Los Angeles (LAX) → Sydney (SYD)

You can also enter airport pairs like `LAX-SFO` or `JFK-LAX` for custom demo routes.

## AI Agents Library

Specialized agent configurations are available in `.claude/agents-library/`. Use these personas when working on specific tasks:

### Relevant Agents for This Project

| Agent | Path | Use For |
|-------|------|---------|
| Mobile App Builder | `engineering/mobile-app-builder.md` | React Native/Expo development, app store submission |
| Project Shipper | `project-management/project-shipper.md` | Release planning, launch checklists |
| DevOps Automator | `engineering/devops-automator.md` | CI/CD, EAS Build configuration |
| Performance Benchmarker | `testing/performance-benchmarker.md` | App performance optimization |
| API Tester | `testing/api-tester.md` | Testing Claude/ElevenLabs integrations |

### How to Use

Reference an agent by reading its file and adopting its persona:
```
Read .claude/agents-library/engineering/mobile-app-builder.md and use that expertise to help with [task]
```

### All Available Categories
- `engineering/` - 6 agents (frontend, backend, mobile, AI, DevOps, prototyping)
- `product/` - 3 agents (research, feedback, prioritization)
- `marketing/` - 7 agents (social, content, growth)
- `design/` - 5 agents (UI/UX, branding, visual)
- `project-management/` - 3 agents (shipping, coordination)
- `studio-operations/` - 5 agents (support, analytics, compliance)
- `testing/` - 5 agents (QA, API, performance)

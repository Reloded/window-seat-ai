# Window Seat

Mobile app (Expo / React Native, Android on Google Play, iOS pending) that narrates what you are flying over.
Package `com.stonku.windowseat`, EAS project `@stonku/window-seat`, Play Console account "Vibe2Future".

## How it works (v1.1.0 and later)
Everything runs on the phone. No API keys, no backend, no account. Works in airplane mode.

1. **Pick a route**: two airports from a bundled database (`data/airports.ts`, ~400 airports). Optionally a flight number, looked up with the free keyless `api.adsbdb.com` (`services/FlightLookupService.js`); this is the only network call in the app.
2. **Flight pack** (`services/FlightPlanner.js`): great-circle route + a dry run of the narrator over it (`utils/narrator.ts`) = planned sights, each with side (left/right/below), timing, and text.
3. **In flight** (`hooks/useFlightSession.js`): follows GPS when a fix exists and is near the route; otherwise a flight clock (`simulatedDistanceKm`). The `Narrator` looks at the *actual* position + heading, so it stays right if the aircraft leaves the great circle. Announcements are spoken with the device voice (`expo-speech`, `services/FreeTTSService.js`).
4. Screen stays awake during a flight (`expo-keep-awake`).

## Content
- `data/landmarks/*.ts`: ~480 sights (`L(id, name, type, lat, lon, radiusKm, importance, text)`), hand-written English narrations. Text must start with the feature's name; the engine prepends "Look out the left-hand window." etc.
- `data/landmarks/index.ts`: also `FLIGHT_FACTS` (fillers for long empty stretches).
- To add a sight: append an `L(...)` to a file in `data/landmarks/` (unique id). `__tests__/narrator.test.ts` checks ids, coordinates and text length.
- Line crossings (equator, tropics, polar circles, prime meridian, date line) are detected geometrically in `utils/narrator.ts`.

## Layout
```
App.js                      Onboarding -> Plan screen or Flight screen, settings modal
components/PlanScreen.js    Airport pickers, flight-number lookup, quick routes, recents
components/FlightScreen.js  Start/stop, now-playing card, progress, route diagram, upcoming/heard lists
components/RouteDiagram.js  Offline schematic "radar" (no map tiles, no Google Maps key)
components/AirportPicker.js Search modal
components/settings/        Theme, voice speed/test, keep-awake, privacy/terms links
contexts/                   Settings (AsyncStorage) and recent flights
hooks/useFlightSession.js   GPS / clock / narrator / speech orchestration
services/                   LocationService, FreeTTSService, SunPositionService, FlightPlanner, FlightLookupService
utils/narrator.ts           Geometry + Narrator + planFlight (pure, unit-tested)
utils/geofence.ts           Distance/bearing helpers (legacy, tested)
```

## Commands
```bash
npm test                 # jest (narrator engine, geofence)
npm run typecheck        # tsc --noEmit
npx expo start --web     # quick UI check in a browser (voice via the browser's speech synthesis)
# Release build (local, no EAS login) - see "Release path" below
npx expo prebuild --platform android --clean --no-install
cd android && ./gradlew bundleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
```

## Release path (local, like tanku-tvirtove: no logins)
- Toolchain: `C:\Users\rnsst\android-dev` (JDK 17, Android SDK 36, NDK 27.1.12297006, CMake 3.22.1). Set `JAVA_HOME`, `ANDROID_HOME` and `android/local.properties` (`sdk.dir`).
- Signing: upload keystore + `keystore.properties` live in `C:\Users\rnsst\window-seat-android\` (never in git). Export `WS_KEYSTORE`, `WS_STORE_PASSWORD`, `WS_KEY_ALIAS`, `WS_KEY_PASSWORD` from it before `./gradlew bundleRelease`; `plugins/withReleaseSigning.js` wires them into the release build.
- The original EAS-managed upload key is gone. On 2026-09-28 an **upload key reset** to the new key was requested in Play Console (new key valid from 2026-09-30 19:45 UTC; before that Play rejects uploads).
- Output: `android/app/build/outputs/bundle/release/app-release.aab`, copied to `window-seat-android\Window Seat 1.1.0 (16).aab`.
- Upload: Play Console > Test and release > Internal testing > Create new release, using the native file dialog (the Chrome MCP file tool cannot pass files over 10 MB).
- Store assets (screenshots 1080x2160, feature graphic 1024x500, icon 512): `window-seat-android\store\`.

## Release notes
- Version lives in `app.config.js` (`version`, `android.versionCode`, `runtimeVersion`). Bump `versionCode` every upload.
- `.easignore` excludes `/android`, `/ios`, `*.aab` so EAS regenerates the native project from `app.config.js` (a stale local `android/` folder previously made EAS build in "bare" mode with old permissions).
- Permissions are minimal: fine/coarse location + wake lock. Microphone, storage, overlay, foreground service are explicitly blocked.
- Previous versions (1.0.x) needed Claude / ElevenLabs / AeroAPI keys and Google Maps; those were removed in 1.1.0.
- Privacy policy / terms: `docs/` (GitHub Pages, https://reloded.github.io/window-seat-ai/). Update them when the data practices change.
- Store texts: `STORE_LISTING.md`.

## Known limitations
- Narration is English only.
- GPS in airplane mode depends on the seat (window seat is best); the flight clock is the fallback and assumes a normal schedule (use the -5 / +5 / "Just took off" buttons to sync).
- Sights are matched against an atlas of ~480 places, so quiet stretches get in-flight facts instead.

import { useState, useRef, useCallback, useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { locationService } from '../services/LocationService';
import { freeTTSService } from '../services/FreeTTSService';
import {
  Narrator,
  positionAlongRoute,
  projectOnRoute,
  simulatedDistanceKm,
  bestSightNow,
  distanceKm,
  CRUISE_KMH,
} from '../utils/narrator';

const KEEP_AWAKE_TAG = 'window-seat-flight';
const GPS_STALE_MS = 60000; // no fix for this long -> fall back to the flight clock
const OFF_ROUTE_KM = 400; // a fix this far from the planned route is not "this flight"
const TAKEOFF_ROLL_MIN = 12; // ground time assumed by the flight clock
const SPEECH_TIMEOUT_MS = 120000;

/**
 * Runs a flight: follows the phone's GPS when it has a usable fix, and otherwise a
 * flight clock, and speaks the narrator's announcements with the device's voice.
 */
export function useFlightSession(pack, options = {}) {
  const { voiceEnabled = true, keepAwake = true, speechRate = 0.95 } = options;

  const [status, setStatus] = useState('idle'); // idle | running | finished
  const [mode, setMode] = useState('waiting'); // waiting | gps | clock
  const [position, setPosition] = useState(null);
  const [progressKm, setProgressKm] = useState(0);
  const [current, setCurrent] = useState(null);
  const [heard, setHeard] = useState([]);
  const [triggeredIds, setTriggeredIds] = useState(() => new Set());
  const [notice, setNotice] = useState(null);
  const [elapsedMin, setElapsedMin] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [useClock, setUseClockState] = useState(false);

  const packRef = useRef(pack);
  const statusRef = useRef('idle');
  const voiceRef = useRef(voiceEnabled);
  const rateRef = useRef(speechRate);
  const narratorRef = useRef(null);
  const timerRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const startedAtRef = useRef(0);
  const offsetMinRef = useRef(0);
  const lastFixAtRef = useRef(0);
  const progressRef = useRef(0);
  const arrivalDoneRef = useRef(false);
  const queueRef = useRef([]);
  const speakingRef = useRef(false);
  const awakeRef = useRef(false);
  const useClockRef = useRef(false);

  packRef.current = pack;
  voiceRef.current = voiceEnabled;
  rateRef.current = speechRate;

  // ── Speech ─────────────────────────────────────────────────────
  const pump = useCallback(async () => {
    if (speakingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) {
      setSpeaking(false);
      return;
    }
    speakingRef.current = true;
    setSpeaking(true);
    try {
      await Promise.race([
        freeTTSService.speak(next.narration, { rate: rateRef.current, language: 'en-US' }),
        new Promise(resolve => setTimeout(resolve, SPEECH_TIMEOUT_MS)),
      ]);
    } catch (e) {
      // Speech is best-effort; the text is always on screen.
    } finally {
      speakingRef.current = false;
    }
    pump();
  }, []);

  const enqueueSpeech = useCallback((announcement, { front = false } = {}) => {
    if (!voiceRef.current) return;
    if (front) queueRef.current.unshift(announcement);
    else queueRef.current.push(announcement);
    // Keep the backlog short; the least important item goes first.
    while (queueRef.current.length > 2) {
      let worst = 0;
      queueRef.current.forEach((item, i) => {
        if ((item.importance || 1) < (queueRef.current[worst].importance || 1)) worst = i;
      });
      queueRef.current.splice(worst, 1);
    }
    pump();
  }, [pump]);

  const stopSpeech = useCallback(() => {
    queueRef.current = [];
    speakingRef.current = false;
    setSpeaking(false);
    freeTTSService.stop();
  }, []);

  useEffect(() => {
    if (!voiceEnabled) stopSpeech();
  }, [voiceEnabled, stopSpeech]);

  // ── Announcements ──────────────────────────────────────────────
  const announce = useCallback((a) => {
    setCurrent(a);
    setHeard(prev => [...prev, { ...a, at: Date.now() }]);
    setTriggeredIds(prev => {
      const next = new Set(prev);
      next.add(a.id);
      return next;
    });
    enqueueSpeech(a);
  }, [enqueueSpeech]);

  const stopEverything = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    locationService.stopTracking();
    if (awakeRef.current) {
      awakeRef.current = false;
      try {
        Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => {});
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const finish = useCallback(() => {
    if (statusRef.current !== 'running') return;
    statusRef.current = 'finished';
    setStatus('finished');
    stopEverything();
  }, [stopEverything]);

  // ── Position handling (shared by GPS and the flight clock) ─────
  const feed = useCallback((pos, heading, speedKmh, altitude, source, alongOverride) => {
    const p = packRef.current;
    if (!p || statusRef.current !== 'running') return;

    const along = alongOverride != null ? alongOverride : projectOnRoute(p.route, pos).alongKm;
    if (along > progressRef.current) {
      progressRef.current = along;
      setProgressKm(along);
    }
    setPosition({
      latitude: pos.latitude,
      longitude: pos.longitude,
      altitude: altitude ?? null,
      speedKmh: speedKmh ?? null,
      heading: heading ?? null,
      source,
    });

    const narrator = narratorRef.current;
    if (narrator) {
      const a = narrator.update(pos, heading, speedKmh || CRUISE_KMH);
      if (a) announce(a);
    }

    // Approach and arrival
    const remaining = p.totalKm - Math.max(along, progressRef.current);
    if (!arrivalDoneRef.current && remaining <= 90) {
      arrivalDoneRef.current = true;
      const arrival = p.checkpoints.find(c => c.kind === 'arrival');
      if (arrival) announce({ ...arrival, offsetKm: 0 });
    }
    if (remaining <= 4 || distanceKm(pos, p.destination) < 6) {
      finish();
    }
  }, [announce, finish]);

  // ── Flight clock ───────────────────────────────────────────────
  const tick = useCallback(() => {
    const p = packRef.current;
    if (!p || statusRef.current !== 'running') return;
    const now = Date.now();
    const elapsed = (now - startedAtRef.current) / 60000 + offsetMinRef.current;
    setElapsedMin(Math.max(0, elapsed));

    if (now - lastFixAtRef.current < GPS_STALE_MS) return; // GPS is driving

    const km = simulatedDistanceKm(elapsed, p.totalKm);
    const pos = positionAlongRoute(p.route, km);
    // Rough climb and descent profile (about 70 m of height per km flown).
    const alt = km <= 0 ? 0 : Math.min(10668, km * 70, (p.totalKm - km) * 70);
    setMode('clock');
    feed(
      { latitude: pos.latitude, longitude: pos.longitude },
      pos.heading,
      elapsed < TAKEOFF_ROLL_MIN ? 0 : CRUISE_KMH,
      alt,
      'clock',
      km
    );
  }, [feed]);

  const onGpsFix = useCallback((loc) => {
    const p = packRef.current;
    const c = loc?.coords;
    if (!p || !c || statusRef.current !== 'running' || useClockRef.current) return;
    const pos = { latitude: c.latitude, longitude: c.longitude };

    const { offRouteKm } = projectOnRoute(p.route, pos);
    if (offRouteKm > OFF_ROUTE_KM) {
      setNotice({
        type: 'info',
        message: 'Your GPS position is far from this route, so Window Seat is following the flight clock instead.',
      });
      return;
    }
    setNotice(prev => (prev && prev.type === 'info' ? null : prev));
    lastFixAtRef.current = Date.now();
    setMode('gps');

    const speedKmh = typeof c.speed === 'number' && c.speed >= 0 ? c.speed * 3.6 : null;
    const heading = typeof c.heading === 'number' && c.heading >= 0 && (speedKmh || 0) > 60 ? c.heading : null;
    feed(pos, heading, speedKmh, c.altitude, 'gps');
  }, [feed]);

  // ── Controls ───────────────────────────────────────────────────
  const start = useCallback(async () => {
    const p = packRef.current;
    if (!p || statusRef.current === 'running') return;

    stopEverything();
    stopSpeech();
    narratorRef.current = new Narrator(
      { origin: p.origin, destination: p.destination, totalKm: p.totalKm },
      { excludeCitiesNear: [p.origin, p.destination] }
    );
    startedAtRef.current = Date.now();
    offsetMinRef.current = 0;
    lastFixAtRef.current = 0;
    progressRef.current = 0;
    arrivalDoneRef.current = false;
    useClockRef.current = false;
    statusRef.current = 'running';

    setStatus('running');
    setMode('waiting');
    setPosition(null);
    setProgressKm(0);
    setCurrent(null);
    setHeard([]);
    setTriggeredIds(new Set());
    setElapsedMin(0);
    setNotice(null);
    setUseClockState(false);

    if (keepAwake) {
      try {
        await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
        awakeRef.current = true;
      } catch (e) {
        // Not fatal
      }
    }

    // Welcome message, then a quiet spell so the first sight is not read out at the gate.
    const departure = p.checkpoints.find(c => c.kind === 'departure');
    if (departure) announce({ ...departure, offsetKm: 0 });
    narratorRef.current.holdOff();

    // Start on the clock straight away, then let GPS take over when it has a fix.
    timerRef.current = setInterval(tick, 1000);
    tick();

    try {
      const granted = await locationService.requestPermissions();
      if (!granted) {
        setNotice({
          type: 'warning',
          message: 'Location permission is off, so Window Seat is using the flight clock. Allow location in Settings for accurate, GPS-based narration.',
        });
        return;
      }
      unsubscribeRef.current = locationService.subscribe(onGpsFix);
      const res = await locationService.startTracking({ distanceInterval: 0, timeInterval: 5000 });
      if (!res.success) {
        setNotice({ type: 'info', message: 'GPS is not available yet. Following the flight clock until it locks on.' });
      }
    } catch (e) {
      setNotice({ type: 'info', message: 'GPS is not available. Following the flight clock.' });
    }
  }, [announce, keepAwake, onGpsFix, stopEverything, stopSpeech, tick]);

  const stop = useCallback(() => {
    statusRef.current = 'idle';
    setStatus('idle');
    setMode('waiting');
    stopEverything();
    stopSpeech();
  }, [stopEverything, stopSpeech]);

  /** Nudge the flight clock (e.g. +5 / -5 minutes). */
  const adjustClock = useCallback((minutes) => {
    offsetMinRef.current += minutes;
    tick();
  }, [tick]);

  /** "We just took off": align the clock so the aircraft is airborne right now. */
  const markTakeoff = useCallback(() => {
    const elapsed = (Date.now() - startedAtRef.current) / 60000;
    offsetMinRef.current = TAKEOFF_ROLL_MIN - elapsed;
    tick();
  }, [tick]);

  /** "What am I flying over?" from the current position. */
  const scanNow = useCallback(() => {
    const p = packRef.current;
    if (!p) return null;
    const pos = position || { latitude: p.route[0].latitude, longitude: p.route[0].longitude, heading: null };
    const a = bestSightNow(pos, pos.heading ?? null);
    if (!a) {
      const none = {
        id: `scan-none-${Date.now()}`,
        kind: 'fact',
        name: 'Nothing famous nearby',
        latitude: pos.latitude,
        longitude: pos.longitude,
        side: 'below',
        offsetKm: 0,
        importance: 1,
        narration: 'Nothing famous is in view from here. Keep watching the window, though. Ordinary countryside, coastline and clouds are worth a look too.',
      };
      announce(none);
      return none;
    }
    narratorRef.current?.markDone(a.id.replace(/^scan-/, ''));
    announce(a);
    return a;
  }, [announce, position]);

  const replay = useCallback((a) => {
    if (!a) return;
    stopSpeech();
    setCurrent(a);
    if (voiceRef.current) enqueueSpeech(a, { front: true });
  }, [enqueueSpeech, stopSpeech]);

  const silence = useCallback(() => stopSpeech(), [stopSpeech]);

  /** Force the flight clock (true) or let GPS drive when it can (false). */
  const setUseClock = useCallback((value) => {
    useClockRef.current = value;
    setUseClockState(value);
    if (value) lastFixAtRef.current = 0;
    setNotice(null);
    tick();
  }, [tick]);

  // Reset when the pack changes; stop everything on unmount.
  useEffect(() => {
    return () => {
      statusRef.current = 'idle';
      stopEverything();
      freeTTSService.stop();
    };
  }, [stopEverything]);

  useEffect(() => {
    if (statusRef.current !== 'idle') {
      statusRef.current = 'idle';
      stopEverything();
      stopSpeech();
    }
    setStatus('idle');
    setMode('waiting');
    setPosition(null);
    setProgressKm(0);
    setCurrent(null);
    setHeard([]);
    setTriggeredIds(new Set());
    setNotice(null);
    setElapsedMin(0);
    progressRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack?.id]);

  return {
    status,
    mode,
    position,
    progressKm,
    progress: pack && pack.totalKm > 0 ? Math.min(1, progressKm / pack.totalKm) : 0,
    current,
    heard,
    triggeredIds,
    notice,
    elapsedMin,
    speaking,
    start,
    stop,
    adjustClock,
    markTakeoff,
    scanNow,
    replay,
    silence,
    useClock,
    setUseClock,
    dismissNotice: () => setNotice(null),
  };
}

export default useFlightSession;

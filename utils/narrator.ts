// Offline narration engine.
//
// The same geometry powers two things:
//   1. planFlight(): a dry run along the great-circle route, producing the
//      "what you'll see" preview list (the flight pack).
//   2. Narrator.update(): live evaluation from a real (or simulated) position,
//      which decides what to announce right now. It uses the actual position
//      and heading, so it stays correct when the aircraft deviates from the
//      great circle (jet routes, weather, North Atlantic tracks ...).

import { LANDMARKS, FLIGHT_FACTS, Landmark } from '../data/landmarks';

const R_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export interface LatLon {
  latitude: number;
  longitude: number;
}

export interface RoutePoint extends LatLon {
  altitude?: number;
  name?: string;
  type?: string;
}

export type Side = 'left' | 'right' | 'below';

export type CheckpointKind = 'departure' | 'arrival' | 'landmark' | 'crossing' | 'progress' | 'fact';

export interface PlanCheckpoint {
  id: string;
  kind: CheckpointKind;
  name: string;
  featureType?: string;
  latitude: number;
  longitude: number;
  /** Where along the planned route the announcement is made (km from origin). */
  alongKm: number;
  /** Side of the aircraft the sight is on. */
  side: Side;
  /** Distance from the flight path to the feature centre (km). */
  offsetKm: number;
  importance: number;
  /** Ready-to-speak text. */
  narration: string;
  // Kept for compatibility with the map / list components.
  radius: number;
  index?: number;
  type?: string;
}

// ── Geometry ─────────────────────────────────────────────────────

export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Initial bearing from a to b in degrees, 0-360. */
export function bearingDeg(a: LatLon, b: LatLon): number {
  const p1 = toRad(a.latitude);
  const p2 = toRad(b.latitude);
  const dl = toRad(b.longitude - a.longitude);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Point reached from `a` after travelling `km` on bearing `deg`. */
export function destinationPoint(a: LatLon, deg: number, km: number): LatLon {
  const d = km / R_KM;
  const br = toRad(deg);
  const p1 = toRad(a.latitude);
  const l1 = toRad(a.longitude);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(br));
  const l2 =
    l1 +
    Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return { latitude: toDeg(p2), longitude: ((toDeg(l2) + 540) % 360) - 180 };
}

/** Point a fraction f (0..1) of the way along the great circle a -> b. */
export function interpolateGreatCircle(a: LatLon, b: LatLon, f: number): LatLon {
  const p1 = toRad(a.latitude);
  const l1 = toRad(a.longitude);
  const p2 = toRad(b.latitude);
  const l2 = toRad(b.longitude);
  const dLat = p2 - p1;
  const dLon = l2 - l1;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) ** 2;
  const d = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  if (d < 1e-9) return { latitude: a.latitude, longitude: a.longitude };
  const A = Math.sin((1 - f) * d) / Math.sin(d);
  const B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
  const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
  const z = A * Math.sin(p1) + B * Math.sin(p2);
  return { latitude: toDeg(Math.atan2(z, Math.hypot(x, y))), longitude: toDeg(Math.atan2(y, x)) };
}

/** Build a great-circle route as a polyline, about one point per `stepKm`. */
export function greatCircleRoute(
  from: LatLon & { name?: string },
  to: LatLon & { name?: string },
  stepKm = 60
): RoutePoint[] {
  const total = distanceKm(from, to);
  const segments = Math.max(2, Math.min(240, Math.ceil(total / stepKm)));
  const route: RoutePoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const p = i === 0 ? from : i === segments ? to : interpolateGreatCircle(from, to, f);
    const cruise = 10668 * Math.min(1, Math.min(f, 1 - f) * Math.max(4, total / 250));
    route.push({
      latitude: p.latitude,
      longitude: p.longitude,
      altitude: Math.round(cruise),
      name: i === 0 ? from.name : i === segments ? to.name : undefined,
      type: i === 0 ? 'origin' : i === segments ? 'destination' : 'waypoint',
    });
  }
  return route;
}

export function routeLengthKm(route: LatLon[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) total += distanceKm(route[i], route[i + 1]);
  return total;
}

/** Position `km` along a polyline route. */
export function positionAlongRoute(
  route: LatLon[],
  km: number
): { latitude: number; longitude: number; heading: number } {
  if (route.length < 2) return { ...route[0], heading: 0 };
  let remaining = Math.max(0, km);
  for (let i = 0; i < route.length - 1; i++) {
    const seg = distanceKm(route[i], route[i + 1]);
    if (remaining <= seg || i === route.length - 2) {
      const f = seg > 0 ? Math.min(1, remaining / seg) : 0;
      const p = interpolateGreatCircle(route[i], route[i + 1], f);
      return { ...p, heading: bearingDeg(route[i], route[i + 1]) };
    }
    remaining -= seg;
  }
  const last = route[route.length - 1];
  return { ...last, heading: bearingDeg(route[route.length - 2], last) };
}

/** Distance along the route (km) of the point on it nearest to `p`, plus the miss distance. */
export function projectOnRoute(route: LatLon[], p: LatLon): { alongKm: number; offRouteKm: number } {
  let best = { alongKm: 0, offRouteKm: Infinity };
  let acc = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const seg = distanceKm(a, b);
    if (seg <= 0) continue;
    // Along/cross-track from the great circle a -> b, clamped to the segment.
    const d13 = distanceKm(a, p) / R_KM;
    const t13 = toRad(bearingDeg(a, p));
    const t12 = toRad(bearingDeg(a, b));
    const xt = Math.asin(Math.sin(d13) * Math.sin(t13 - t12)) * R_KM;
    let at = Math.acos(Math.max(-1, Math.min(1, Math.cos(d13) / Math.cos(xt / R_KM)))) * R_KM;
    if (Math.cos(t13 - t12) < 0) at = -at;
    let off = Math.abs(xt);
    let along = at;
    if (along < 0) {
      along = 0;
      off = distanceKm(a, p);
    } else if (along > seg) {
      along = seg;
      off = distanceKm(b, p);
    }
    if (off < best.offRouteKm) best = { alongKm: acc + along, offRouteKm: off };
    acc += seg;
  }
  return best;
}

// ── Speed model ──────────────────────────────────────────────────

export const CRUISE_KMH = 800;
const CLIMB_MIN = 24; // taxi, take-off, climb and descent overhead

export function estimateFlightMinutes(distanceKmTotal: number): number {
  return Math.round(CLIMB_MIN + (distanceKmTotal / CRUISE_KMH) * 60);
}

/** Simulated distance flown after `elapsedMin` minutes with the clock running. */
export function simulatedDistanceKm(elapsedMin: number, totalKm: number): number {
  const airborne = Math.max(0, elapsedMin - CLIMB_MIN / 2);
  return Math.min(totalKm, (airborne * CRUISE_KMH) / 60);
}

/** Planned minutes after leaving the gate for a point `alongKm` down the route. */
export function plannedMinutes(alongKm: number): number {
  return CLIMB_MIN / 2 + (alongKm / CRUISE_KMH) * 60;
}

export function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

export function formatKm(km: number): string {
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString('en-US')} km`;
}

// ── Landmark evaluation ──────────────────────────────────────────

export interface Sighting {
  landmark: Landmark;
  distanceKm: number;
  /** Km to fly before being level with it (negative = already passed). */
  aheadKm: number;
  /** Sideways offset from the flight line, km (positive = right). */
  crossKm: number;
  side: Side;
}

/** How far to the side we still count a feature as visible. */
export function visibleRange(l: Landmark): number {
  return Math.min(l.radiusKm + 45, 260);
}

/** How many km before being level with it we announce it. */
export function leadKm(l: Landmark): number {
  return Math.min(110, 30 + l.radiusKm * 0.35);
}

const AREA_TYPES = new Set(['ocean', 'sea', 'desert', 'plain', 'forest', 'glacier']);

export function sideOf(crossKm: number, l: Landmark, distKm?: number): Side {
  // Flying over a big area feature (an ocean, a desert, an ice sheet): it is all around us.
  if (distKm != null && distKm <= l.radiusKm && AREA_TYPES.has(l.type)) return 'below';
  const below = Math.max(18, l.radiusKm * 0.5);
  if (Math.abs(crossKm) <= below) return 'below';
  return crossKm > 0 ? 'right' : 'left';
}

export function evaluateLandmark(l: Landmark, pos: LatLon, headingDeg: number): Sighting {
  const d = distanceKm(pos, l);
  const rel = ((bearingDeg(pos, l) - headingDeg + 540) % 360) - 180;
  const aheadKm = d * Math.cos(toRad(rel));
  const crossKm = d * Math.sin(toRad(rel));
  return { landmark: l, distanceKm: d, aheadKm, crossKm, side: sideOf(crossKm, l, d) };
}

// ── Composing what gets said ─────────────────────────────────────

const ORD = (n: number) => {
  const r = Math.round(n / 10) * 10;
  return r >= 100 ? Math.round(n / 50) * 50 : r;
};

export function composeNarration(s: Sighting, approachingMin?: number): string {
  const l = s.landmark;
  const soon =
    approachingMin != null && approachingMin >= 2 && s.aheadKm > 20
      ? `In about ${Math.round(approachingMin)} minutes, `
      : '';
  let lead: string;
  if (s.side === 'below') {
    lead = soon ? `${soon}directly below us.` : 'Directly below us now.';
  } else {
    const side = s.side;
    const far = Math.abs(s.crossKm) > 60 ? ` about ${ORD(Math.abs(s.crossKm))} kilometres away` : '';
    lead = soon
      ? `${soon}look out the ${side}-hand window${far}.`
      : `Look out the ${side}-hand window${far}.`;
  }
  return `${lead} ${l.text}`;
}

export function windowSeatHint(side: Side): string {
  if (side === 'left') return 'Left window';
  if (side === 'right') return 'Right window';
  return 'Look down';
}

// ── "What's below me?" ───────────────────────────────────────────

/**
 * The best sight to point out right now, ignoring what was already narrated.
 * Used by the manual "What am I flying over?" button.
 */
export function bestSightNow(
  pos: LatLon,
  heading: number | null,
  landmarks: Landmark[] = LANDMARKS,
  maxGapKm = 200
): Announcement | null {
  const hdg = heading == null || Number.isNaN(heading) || heading < 0 ? 0 : heading;
  let best: Sighting | null = null;
  let bestScore = Infinity;
  for (const l of landmarks) {
    const s = evaluateLandmark(l, pos, hdg);
    const gap = Math.max(0, s.distanceKm - l.radiusKm);
    if (gap > maxGapKm) continue;
    const score = gap - l.importance * 25 + Math.max(0, -s.aheadKm) * 0.3;
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }
  if (!best) return null;
  // Without a heading we cannot say left or right.
  if (heading == null || Number.isNaN(heading) || heading < 0) {
    best = { ...best, side: 'below', crossKm: 0 };
  }
  const l = best.landmark;
  const minutes = best.aheadKm > 20 ? (best.aheadKm / CRUISE_KMH) * 60 : undefined;
  return {
    id: `scan-${l.id}`,
    kind: 'landmark',
    name: l.name,
    featureType: l.type,
    latitude: l.latitude,
    longitude: l.longitude,
    side: best.side,
    offsetKm: Math.abs(best.crossKm),
    importance: l.importance,
    narration: composeNarration(best, minutes),
  };
}

// ── Special line crossings (equator, tropics, date line...) ──────

interface Crossing {
  id: string;
  name: string;
  axis: 'lat' | 'lon';
  value: number;
  text: string;
}

const CROSSINGS: Crossing[] = [
  { id: 'equator', name: 'The Equator', axis: 'lat', value: 0, text: "We are crossing the Equator, the imaginary line that divides the Earth into the Northern and Southern Hemispheres. Here the Earth's rotation carries the ground at about 1,670 kilometres an hour, its fastest." },
  { id: 'tropic-cancer', name: 'Tropic of Cancer', axis: 'lat', value: 23.4368, text: "We are passing the Tropic of Cancer, at 23.4 degrees north. This is the northernmost latitude at which the Sun can be directly overhead, at the June solstice." },
  { id: 'tropic-capricorn', name: 'Tropic of Capricorn', axis: 'lat', value: -23.4368, text: "We are passing the Tropic of Capricorn, at 23.4 degrees south, the southernmost latitude where the Sun can be directly overhead, at the December solstice." },
  { id: 'arctic-circle', name: 'The Arctic Circle', axis: 'lat', value: 66.5632, text: "We are crossing the Arctic Circle, at 66.6 degrees north. North of this line the Sun stays above the horizon for at least one full day each summer, and below it for at least one day each winter." },
  { id: 'antarctic-circle', name: 'The Antarctic Circle', axis: 'lat', value: -66.5632, text: "We are crossing the Antarctic Circle, at 66.6 degrees south, the edge of the region where the Sun can stay up, or stay down, for a full day." },
  { id: 'prime-meridian', name: 'The Prime Meridian', axis: 'lon', value: 0, text: "We are crossing the Prime Meridian, longitude zero, the line through Greenwich in London that divides the Eastern and Western Hemispheres. It has been the world's reference for time and longitude since 1884." },
  { id: 'date-line', name: 'The International Date Line', axis: 'lon', value: 180, text: "We are crossing the International Date Line, roughly along 180 degrees of longitude. Cross it heading east and the date goes back a day, heading west, forward a day. Travellers can arrive before they left." },
];

function wrapLon(lon: number): number {
  return ((lon + 540) % 360) - 180;
}

export function detectCrossing(prev: LatLon | null, cur: LatLon): Crossing | null {
  if (!prev) return null;
  for (const c of CROSSINGS) {
    if (c.axis === 'lat') {
      if ((prev.latitude - c.value) * (cur.latitude - c.value) < 0) return c;
    } else if (c.value === 0) {
      const a = wrapLon(prev.longitude);
      const b = wrapLon(cur.longitude);
      if (Math.abs(a - b) < 90 && a * b < 0) return c;
    } else {
      const a = wrapLon(prev.longitude);
      const b = wrapLon(cur.longitude);
      if (Math.abs(a - b) > 180 - 60 && a * b < 0) return c;
    }
  }
  return null;
}

// ── The Narrator ─────────────────────────────────────────────────

export interface Announcement {
  id: string;
  kind: CheckpointKind;
  name: string;
  featureType?: string;
  latitude: number;
  longitude: number;
  side: Side;
  offsetKm: number;
  importance: number;
  narration: string;
}

export interface NarratorContext {
  origin?: { city?: string; name?: string } | null;
  destination?: { city?: string; name?: string } | null;
  totalKm: number;
  cruiseKmh?: number;
}

export interface NarratorOptions {
  /** Minimum km flown between spoken items (a very important sight may cut in earlier). */
  spacingKm?: number;
  /** After this many km with nothing to say, an in-flight fact is offered. */
  factGapKm?: number;
  landmarks?: Landmark[];
  /** Cities within 60 km of these points are left out (the departure/arrival texts cover them). */
  excludeCitiesNear?: LatLon[];
}

const DEFAULTS = { spacingKm: 55, factGapKm: 520 };

export class Narrator {
  private done = new Set<string>();
  private lastPos: LatLon | null = null;
  private kmSinceLast = 0;
  private flownKm = 0;
  private factIndex = 0;
  private progressDone = new Set<number>();
  private readonly landmarks: Landmark[];
  private readonly spacingKm: number;
  private readonly factGapKm: number;

  constructor(private ctx: NarratorContext, opts: NarratorOptions = {}) {
    const near = opts.excludeCitiesNear ?? [];
    this.landmarks = (opts.landmarks ?? LANDMARKS).filter(
      l => l.type !== 'city' || near.every(p => distanceKm(p, l) > 60)
    );
    this.spacingKm = opts.spacingKm ?? DEFAULTS.spacingKm;
    this.factGapKm = opts.factGapKm ?? DEFAULTS.factGapKm;
    // Start with room to speak, so the first sight isn't held back.
    this.kmSinceLast = this.spacingKm;
  }

  /** Start the quiet period now (e.g. right after the welcome message). */
  holdOff() {
    this.kmSinceLast = 0;
  }

  /** Mark something as already narrated (e.g. when resuming). */
  markDone(id: string) {
    this.done.add(id);
  }

  hasDone(id: string) {
    return this.done.has(id);
  }

  reset() {
    this.done.clear();
    this.lastPos = null;
    this.kmSinceLast = this.spacingKm;
    this.flownKm = 0;
    this.factIndex = 0;
    this.progressDone.clear();
  }

  /**
   * Feed a new position. Returns the announcement to make now, if any.
   * `heading` may be null when unknown; then it is derived from movement.
   */
  update(pos: LatLon, heading: number | null, speedKmh: number = CRUISE_KMH): Announcement | null {
    const prev = this.lastPos;
    if (prev) {
      const step = distanceKm(prev, pos);
      this.kmSinceLast += step;
      this.flownKm += step;
    }
    let hdg = heading;
    if (hdg == null || Number.isNaN(hdg) || hdg < 0) {
      hdg = prev && distanceKm(prev, pos) > 0.5 ? bearingDeg(prev, pos) : null;
    }
    const crossing = detectCrossing(prev, pos);
    this.lastPos = { latitude: pos.latitude, longitude: pos.longitude };
    if (hdg == null) return null;

    // Equator, tropics, date line: always worth a moment.
    if (crossing && !this.done.has(crossing.id) && this.kmSinceLast >= this.spacingKm * 0.4) {
      this.done.add(crossing.id);
      this.kmSinceLast = 0;
      return {
        id: crossing.id,
        kind: 'crossing',
        name: crossing.name,
        latitude: pos.latitude,
        longitude: pos.longitude,
        side: 'below',
        offsetKm: 0,
        importance: 3,
        narration: crossing.text,
      };
    }

    // Best landmark that is coming up (or just passed) and not yet narrated.
    let best: Sighting | null = null;
    let bestScore = -Infinity;
    for (const l of this.landmarks) {
      if (this.done.has(l.id)) continue;
      if (Math.abs(l.latitude - pos.latitude) > 4 + (l.radiusKm + 320) / 111) continue;
      const s = evaluateLandmark(l, pos, hdg);
      // Flying over the feature itself (an ocean, a desert, an ice sheet), or seeing it off to the side.
      const within = s.distanceKm <= l.radiusKm;
      if (!within && Math.abs(s.crossKm) > visibleRange(l)) continue;
      // Give up on things well behind us.
      if (!within && s.aheadKm < -Math.min(60, l.radiusKm * 0.5 + 15)) continue;
      // Not yet inside its lead window.
      if (!within && s.aheadKm > leadKm(l)) continue;
      const nearness = within
        ? 1 - (s.distanceKm / l.radiusKm) * 0.5
        : 1 - Math.min(1, Math.abs(s.crossKm) / visibleRange(l));
      const score = l.importance * 100 + nearness * 30 - Math.max(0, s.aheadKm) * 0.2;
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }

    const dueByDistance = this.kmSinceLast >= this.spacingKm;
    const dueByImportance = best && best.landmark.importance === 3 && this.kmSinceLast >= this.spacingKm * 0.5;
    if (best && (dueByDistance || dueByImportance)) {
      this.done.add(best.landmark.id);
      this.kmSinceLast = 0;
      const speed = Math.max(300, speedKmh || CRUISE_KMH);
      const minutes = best.aheadKm > 20 ? (best.aheadKm / speed) * 60 : undefined;
      return {
        id: best.landmark.id,
        kind: 'landmark',
        name: best.landmark.name,
        featureType: best.landmark.type,
        latitude: best.landmark.latitude,
        longitude: best.landmark.longitude,
        side: best.side,
        offsetKm: Math.abs(best.crossKm),
        importance: best.landmark.importance,
        narration: composeNarration(best, minutes),
      };
    }

    // Progress milestones.
    if (this.ctx.totalKm > 300 && this.kmSinceLast >= this.spacingKm) {
      for (const frac of [0.25, 0.5, 0.75]) {
        if (!this.progressDone.has(frac) && this.flownKm >= this.ctx.totalKm * frac) {
          this.progressDone.add(frac);
          this.kmSinceLast = 0;
          const left = Math.max(0, this.ctx.totalKm - this.flownKm);
          const mins = (left / (this.ctx.cruiseKmh ?? CRUISE_KMH)) * 60 + 10;
          const dest = this.ctx.destination?.city || 'your destination';
          const label = frac === 0.5 ? 'We are about halfway there.' : frac === 0.25 ? 'About a quarter of the way there.' : 'About three quarters of the way there.';
          return {
            id: `progress-${frac}`,
            kind: 'progress',
            name: `${Math.round(frac * 100)}% of the way`,
            latitude: pos.latitude,
            longitude: pos.longitude,
            side: 'below',
            offsetKm: 0,
            importance: 1,
            narration: `${label} Roughly ${formatKm(left)} to go to ${dest}, around ${formatMinutes(mins)} at this speed.`,
          };
        }
      }
    }

    // Long quiet stretch: offer something interesting.
    if (this.kmSinceLast >= this.factGapKm && this.factIndex < FLIGHT_FACTS.length) {
      const fact = FLIGHT_FACTS[(this.factIndex + Math.floor(this.flownKm / 50)) % FLIGHT_FACTS.length];
      this.factIndex++;
      if (!this.done.has(`fact-${fact.id}`)) {
        this.done.add(`fact-${fact.id}`);
        this.kmSinceLast = 0;
        return {
          id: `fact-${fact.id}`,
          kind: 'fact',
          name: 'In-flight fact',
          latitude: pos.latitude,
          longitude: pos.longitude,
          side: 'below',
          offsetKm: 0,
          importance: 1,
          narration: fact.text,
        };
      }
    }
    return null;
  }
}

// ── Planning (dry run) ───────────────────────────────────────────

export interface FlightPlan {
  totalKm: number;
  durationMin: number;
  checkpoints: PlanCheckpoint[];
}

function departureText(city: string, name: string): string {
  return `Welcome aboard. We are departing from ${city}${name && name !== city ? `, ${name}` : ''}. Window Seat will point out sights on the left and right as we fly. Settle in, and keep an eye on the window.`;
}

function arrivalText(city: string): string {
  return `We are beginning our descent toward ${city}. Look out for the landmarks around the city as we come in. Thanks for flying with Window Seat, and enjoy the final approach.`;
}

/**
 * Dry-run the narrator along the route to produce the preview checkpoints.
 */
export function planFlight(
  route: RoutePoint[],
  origin: { city?: string; name?: string } | null,
  destination: { city?: string; name?: string } | null,
  opts: NarratorOptions = {}
): FlightPlan {
  const totalKm = routeLengthKm(route);
  const durationMin = estimateFlightMinutes(totalKm);
  const checkpoints: PlanCheckpoint[] = [];

  const push = (a: Announcement | Omit<PlanCheckpoint, 'index' | 'radius' | 'type'> & { alongKm: number }, alongKm: number) => {
    const cp = a as any;
    checkpoints.push({
      id: cp.id,
      kind: cp.kind,
      name: cp.name,
      featureType: cp.featureType,
      latitude: cp.latitude,
      longitude: cp.longitude,
      alongKm,
      side: cp.side,
      offsetKm: cp.offsetKm,
      importance: cp.importance,
      narration: cp.narration,
      radius: 15000,
      type: cp.kind === 'departure' ? 'departure' : cp.kind === 'arrival' ? 'arrival' : 'waypoint',
    });
  };

  if (route.length < 2) return { totalKm, durationMin, checkpoints };

  const startCity = origin?.city || origin?.name || 'the airport';
  const endCity = destination?.city || destination?.name || 'your destination';

  push(
    {
      id: 'departure',
      kind: 'departure',
      name: `Departure · ${startCity}`,
      latitude: route[0].latitude,
      longitude: route[0].longitude,
      side: 'below',
      offsetKm: 0,
      importance: 3,
      narration: departureText(startCity, origin?.name || ''),
      alongKm: 0,
    } as any,
    0
  );

  const narrator = new Narrator(
    { origin, destination, totalKm },
    { ...opts, excludeCitiesNear: [route[0], route[route.length - 1]] }
  );
  narrator.holdOff(); // same quiet spell as the live session, after the welcome message
  const step = Math.max(8, Math.min(20, totalKm / 200));
  let prev: LatLon | null = null;
  const arrivalStart = Math.max(0, totalKm - 90);
  for (let km = step; km < arrivalStart; km += step) {
    const p = positionAlongRoute(route, km);
    const a = narrator.update({ latitude: p.latitude, longitude: p.longitude }, p.heading);
    if (a) push(a, Math.round(km));
    prev = p;
  }
  void prev;

  push(
    {
      id: 'arrival',
      kind: 'arrival',
      name: `Arrival · ${endCity}`,
      latitude: route[route.length - 1].latitude,
      longitude: route[route.length - 1].longitude,
      side: 'below',
      offsetKm: 0,
      importance: 3,
      narration: arrivalText(endCity),
      alongKm: Math.round(arrivalStart),
    } as any,
    Math.round(arrivalStart)
  );

  checkpoints.forEach((c, i) => {
    c.index = i;
  });
  return { totalKm, durationMin, checkpoints };
}

/** Which window has the better view, based on planned sights. */
export function seatAdvice(plan: FlightPlan): {
  left: PlanCheckpoint[];
  right: PlanCheckpoint[];
  better: 'left' | 'right' | 'either';
} {
  const scored = plan.checkpoints.filter(c => c.kind === 'landmark');
  const left = scored.filter(c => c.side === 'left');
  const right = scored.filter(c => c.side === 'right');
  const weight = (list: PlanCheckpoint[]) => list.reduce((s, c) => s + c.importance, 0);
  const wl = weight(left);
  const wr = weight(right);
  let better: 'left' | 'right' | 'either' = 'either';
  if (wl > wr * 1.2 + 1) better = 'left';
  else if (wr > wl * 1.2 + 1) better = 'right';
  return { left, right, better };
}

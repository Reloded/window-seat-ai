import { getAirport } from '../data/airports';

// Free, keyless community route database (https://www.adsbdb.com).
// Used only when the user types a flight number; picking airports needs no network.
const ENDPOINT = 'https://api.adsbdb.com/v0/callsign/';
const TIMEOUT_MS = 10000;

export class FlightLookupError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'FlightLookupError';
    this.code = code; // 'invalid' | 'not_found' | 'network'
  }
}

export function normalizeFlightNumber(input) {
  return String(input || '').replace(/[\s-]+/g, '').toUpperCase();
}

export function looksLikeFlightNumber(input) {
  // Airline code (2-3 chars, at least one letter) + 1-4 digits, e.g. BA115, LO 281, BAW115, EZY8123
  return /^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(normalizeFlightNumber(input)) &&
    /[A-Z]/.test(normalizeFlightNumber(input).slice(0, 2));
}

function toAirport(raw) {
  if (!raw) return null;
  const known = getAirport(raw.iata_code);
  if (known) return known;
  if (typeof raw.latitude !== 'number' || typeof raw.longitude !== 'number') return null;
  return {
    code: raw.iata_code || raw.icao_code || '???',
    name: raw.name || raw.municipality || 'Airport',
    city: raw.municipality || raw.name || 'Airport',
    country: raw.country_iso_name || '',
    latitude: raw.latitude,
    longitude: raw.longitude,
  };
}

export async function lookupFlight(input) {
  const callsign = normalizeFlightNumber(input);
  if (!looksLikeFlightNumber(callsign)) {
    throw new FlightLookupError('invalid', 'That does not look like a flight number. Try something like BA115 or LO281.');
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;

  let json;
  try {
    const response = await fetch(`${ENDPOINT}${encodeURIComponent(callsign)}`, {
      signal: controller ? controller.signal : undefined,
    });
    if (response.status === 404) {
      throw new FlightLookupError('not_found', `We could not find ${callsign}.`);
    }
    if (!response.ok) {
      throw new FlightLookupError('network', 'The flight database is not answering right now.');
    }
    json = await response.json();
  } catch (error) {
    if (error instanceof FlightLookupError) throw error;
    throw new FlightLookupError('network', 'No internet connection. Choose your airports instead, that works offline.');
  } finally {
    if (timer) clearTimeout(timer);
  }

  const route = json?.response?.flightroute;
  if (!route) {
    throw new FlightLookupError('not_found', `We could not find ${callsign}. Choose your airports instead.`);
  }

  const origin = toAirport(route.origin);
  const destination = toAirport(route.destination);
  if (!origin || !destination) {
    throw new FlightLookupError('not_found', `The route for ${callsign} is incomplete. Choose your airports instead.`);
  }

  return {
    flightNumber: route.callsign_iata || route.callsign || callsign,
    airline: route.airline?.name || null,
    origin,
    destination,
  };
}

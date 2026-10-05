import { greatCircleRoute, planFlight, seatAdvice, estimateFlightMinutes } from '../utils/narrator';

/**
 * Builds a complete "flight pack" (route + narration plan) for an airport pair.
 * Everything is computed on the device from bundled data, so it is instant,
 * needs no network and no API key, and works in airplane mode.
 */
export function buildFlightPack({ origin, destination, flightNumber = null, airline = null }) {
  if (!origin || !destination) {
    throw new Error('Choose both a departure and an arrival airport.');
  }
  if (origin.code === destination.code) {
    throw new Error('Departure and arrival are the same airport.');
  }

  const route = greatCircleRoute(
    { latitude: origin.latitude, longitude: origin.longitude, name: origin.name },
    { latitude: destination.latitude, longitude: destination.longitude, name: destination.name }
  );
  const plan = planFlight(route, origin, destination);
  const advice = seatAdvice(plan);

  return {
    id: `${origin.code}-${destination.code}`,
    flightNumber: flightNumber || null,
    airline: airline || null,
    origin,
    destination,
    route,
    checkpoints: plan.checkpoints,
    totalKm: plan.totalKm,
    durationMin: plan.durationMin || estimateFlightMinutes(plan.totalKm),
    betterSide: advice.better,
    leftCount: advice.left.length,
    rightCount: advice.right.length,
    createdAt: new Date().toISOString(),
  };
}

export function packLabel(pack) {
  if (!pack) return '';
  return `${pack.origin.city} → ${pack.destination.city}`;
}

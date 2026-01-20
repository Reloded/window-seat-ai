// Types for geofence operations

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Checkpoint extends Coordinate {
  id: string;
  name: string;
  radius: number;
  narration?: string;
  audioPath?: string;
}

export interface CheckpointWithDistance extends Checkpoint {
  distance: number;
}

// Haversine formula to calculate distance between two GPS coordinates
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Check if a point is within a circular geofence
export function isWithinGeofence(
  currentLat: number,
  currentLon: number,
  checkpoint: Checkpoint
): boolean {
  const distance = calculateDistance(
    currentLat,
    currentLon,
    checkpoint.latitude,
    checkpoint.longitude
  );
  return distance <= checkpoint.radius;
}

// Find all checkpoints within range, sorted by distance
export function findNearbyCheckpoints(
  currentLat: number,
  currentLon: number,
  checkpoints: Checkpoint[],
  maxRadius: number = 10000
): CheckpointWithDistance[] {
  return checkpoints
    .map(checkpoint => ({
      ...checkpoint,
      distance: calculateDistance(
        currentLat,
        currentLon,
        checkpoint.latitude,
        checkpoint.longitude
      ),
    }))
    .filter(checkpoint => checkpoint.distance <= maxRadius)
    .sort((a, b) => a.distance - b.distance);
}

// Check which checkpoints have been triggered (entered for first time)
export function checkGeofences(
  currentLat: number,
  currentLon: number,
  checkpoints: Checkpoint[],
  triggeredIds: Set<string> = new Set()
): Checkpoint[] {
  const newlyTriggered: Checkpoint[] = [];

  for (const checkpoint of checkpoints) {
    if (triggeredIds.has(checkpoint.id)) {
      continue;
    }

    if (isWithinGeofence(currentLat, currentLon, checkpoint)) {
      newlyTriggered.push(checkpoint);
    }
  }

  return newlyTriggered;
}

// Calculate bearing between two points (for direction display)
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const bearing = Math.atan2(y, x);
  return (toDegrees(bearing) + 360) % 360;
}

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

// Convert bearing to compass direction
export function bearingToCompass(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

// Interpolate position along a route (for estimating ETA to checkpoints)
export function interpolatePosition(
  routePoints: Coordinate[],
  progress: number
): Coordinate {
  if (progress <= 0) return routePoints[0];
  if (progress >= 1) return routePoints[routePoints.length - 1];

  const totalDistance = calculateRouteDistance(routePoints);
  const targetDistance = totalDistance * progress;

  let accumulatedDistance = 0;

  for (let i = 0; i < routePoints.length - 1; i++) {
    const segmentDistance = calculateDistance(
      routePoints[i].latitude,
      routePoints[i].longitude,
      routePoints[i + 1].latitude,
      routePoints[i + 1].longitude
    );

    if (accumulatedDistance + segmentDistance >= targetDistance) {
      const segmentProgress =
        (targetDistance - accumulatedDistance) / segmentDistance;

      return {
        latitude:
          routePoints[i].latitude +
          (routePoints[i + 1].latitude - routePoints[i].latitude) * segmentProgress,
        longitude:
          routePoints[i].longitude +
          (routePoints[i + 1].longitude - routePoints[i].longitude) * segmentProgress,
      };
    }

    accumulatedDistance += segmentDistance;
  }

  return routePoints[routePoints.length - 1];
}

// Calculate total distance of a route
export function calculateRouteDistance(routePoints: Coordinate[]): number {
  let totalDistance = 0;

  for (let i = 0; i < routePoints.length - 1; i++) {
    totalDistance += calculateDistance(
      routePoints[i].latitude,
      routePoints[i].longitude,
      routePoints[i + 1].latitude,
      routePoints[i + 1].longitude
    );
  }

  return totalDistance;
}

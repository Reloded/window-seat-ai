import { calculateDistance, calculateRouteDistance } from './geofence';

// Convert a flight route to narration checkpoints
export function routeToCheckpoints(route, options = {}) {
  const {
    numCheckpoints = 20,
    minSpacing = 50000, // Minimum 50km between checkpoints
    geofenceRadius = 10000, // 10km trigger radius
  } = options;

  if (!route || route.length < 2) {
    return [];
  }

  const totalDistance = calculateRouteDistance(route);
  const idealSpacing = totalDistance / (numCheckpoints + 1);
  const spacing = Math.max(idealSpacing, minSpacing);

  const checkpoints = [];
  let accumulatedDistance = 0;
  let lastCheckpointDistance = 0;
  let checkpointIndex = 0;

  // Always add departure as first checkpoint
  checkpoints.push(createCheckpoint(route[0], checkpointIndex++, 'departure', geofenceRadius));

  // Add intermediate checkpoints based on distance
  for (let i = 1; i < route.length - 1; i++) {
    const segmentDistance = calculateDistance(
      route[i - 1].latitude,
      route[i - 1].longitude,
      route[i].latitude,
      route[i].longitude
    );

    accumulatedDistance += segmentDistance;

    // Check if we should add a checkpoint here
    if (accumulatedDistance - lastCheckpointDistance >= spacing) {
      checkpoints.push(
        createCheckpoint(route[i], checkpointIndex++, 'waypoint', geofenceRadius)
      );
      lastCheckpointDistance = accumulatedDistance;

      if (checkpoints.length >= numCheckpoints - 1) {
        break;
      }
    }
  }

  // Always add arrival as last checkpoint
  const lastPoint = route[route.length - 1];
  checkpoints.push(createCheckpoint(lastPoint, checkpointIndex, 'arrival', geofenceRadius));

  return checkpoints;
}

function createCheckpoint(point, index, type, radius) {
  return {
    id: `checkpoint_${index}`,
    index,
    name: point.name || getCheckpointName(type, index),
    latitude: point.latitude,
    longitude: point.longitude,
    altitude: point.altitude || 10668, // Default cruise altitude ~35,000 ft
    radius,
    type,
    triggered: false,
  };
}

function getCheckpointName(type, index) {
  switch (type) {
    case 'departure':
      return 'Departure';
    case 'arrival':
      return 'Arrival';
    default:
      return `Waypoint ${index}`;
  }
}

// Estimate flight duration based on route distance
export function estimateFlightDuration(route, averageSpeedKnots = 450) {
  if (!route || route.length < 2) return null;

  const distanceMeters = calculateRouteDistance(route);
  const distanceNauticalMiles = distanceMeters / 1852;
  const hours = distanceNauticalMiles / averageSpeedKnots;

  return {
    hours: Math.floor(hours),
    minutes: Math.round((hours % 1) * 60),
    totalMinutes: Math.round(hours * 60),
  };
}

// Format duration for display
export function formatDuration(duration) {
  if (!duration) return 'Unknown';
  return `${duration.hours}h ${duration.minutes}m`;
}

// Get progress along route based on current position
export function getRouteProgress(currentLat, currentLng, route) {
  if (!route || route.length < 2) return 0;

  const totalDistance = calculateRouteDistance(route);
  let minDistanceToRoute = Infinity;
  let closestSegmentProgress = 0;
  let accumulatedDistance = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const segmentStart = route[i];
    const segmentEnd = route[i + 1];

    const distToStart = calculateDistance(
      currentLat, currentLng,
      segmentStart.latitude, segmentStart.longitude
    );

    const distToEnd = calculateDistance(
      currentLat, currentLng,
      segmentEnd.latitude, segmentEnd.longitude
    );

    const segmentLength = calculateDistance(
      segmentStart.latitude, segmentStart.longitude,
      segmentEnd.latitude, segmentEnd.longitude
    );

    // Approximate progress along this segment
    const segmentProgress = distToStart / (distToStart + distToEnd);
    const distToSegment = Math.min(distToStart, distToEnd);

    if (distToSegment < minDistanceToRoute) {
      minDistanceToRoute = distToSegment;
      closestSegmentProgress = (accumulatedDistance + segmentProgress * segmentLength) / totalDistance;
    }

    accumulatedDistance += segmentLength;
  }

  return Math.max(0, Math.min(1, closestSegmentProgress));
}

// Get next upcoming checkpoint
export function getNextCheckpoint(currentLat, currentLng, checkpoints) {
  let closestUpcoming = null;
  let closestDistance = Infinity;

  for (const checkpoint of checkpoints) {
    if (checkpoint.triggered) continue;

    const distance = calculateDistance(
      currentLat, currentLng,
      checkpoint.latitude, checkpoint.longitude
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestUpcoming = { ...checkpoint, distance };
    }
  }

  return closestUpcoming;
}

// Get ETA to next checkpoint
export function getETAToCheckpoint(distanceMeters, speedMps) {
  if (!speedMps || speedMps <= 0) return null;

  const seconds = distanceMeters / speedMps;
  const minutes = Math.round(seconds / 60);

  if (minutes < 1) return 'Less than 1 min';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

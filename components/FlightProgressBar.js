import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { calculateDistance } from '../utils/geofence';

export function FlightProgressBar({
  location,
  route = [],
  origin,
  destination,
  style,
}) {
  const progress = useMemo(() => {
    if (!location?.coords || route.length < 2) return 0;

    const { latitude, longitude } = location.coords;

    // Calculate total route distance
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += calculateDistance(
        route[i].latitude,
        route[i].longitude,
        route[i + 1].latitude,
        route[i + 1].longitude
      );
    }

    if (totalDistance === 0) return 0;

    // Find the closest point on the route and calculate distance traveled
    let minDistanceToRoute = Infinity;
    let distanceAlongRoute = 0;
    let bestDistanceAlong = 0;

    let accumulatedDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const segmentStart = route[i];
      const segmentEnd = route[i + 1];

      // Calculate distance from current position to this segment
      const distToStart = calculateDistance(
        latitude, longitude,
        segmentStart.latitude, segmentStart.longitude
      );
      const distToEnd = calculateDistance(
        latitude, longitude,
        segmentEnd.latitude, segmentEnd.longitude
      );
      const segmentLength = calculateDistance(
        segmentStart.latitude, segmentStart.longitude,
        segmentEnd.latitude, segmentEnd.longitude
      );

      // Project point onto segment
      const t = Math.max(0, Math.min(1,
        ((latitude - segmentStart.latitude) * (segmentEnd.latitude - segmentStart.latitude) +
         (longitude - segmentStart.longitude) * (segmentEnd.longitude - segmentStart.longitude)) /
        (Math.pow(segmentEnd.latitude - segmentStart.latitude, 2) +
         Math.pow(segmentEnd.longitude - segmentStart.longitude, 2) || 1)
      ));

      const projectedLat = segmentStart.latitude + t * (segmentEnd.latitude - segmentStart.latitude);
      const projectedLng = segmentStart.longitude + t * (segmentEnd.longitude - segmentStart.longitude);

      const distToProjected = calculateDistance(latitude, longitude, projectedLat, projectedLng);

      if (distToProjected < minDistanceToRoute) {
        minDistanceToRoute = distToProjected;
        bestDistanceAlong = accumulatedDistance + t * segmentLength;
      }

      accumulatedDistance += segmentLength;
    }

    return Math.max(0, Math.min(100, (bestDistanceAlong / totalDistance) * 100));
  }, [location, route]);

  const progressPercent = Math.round(progress);

  // Calculate ETA based on remaining distance and speed
  const etaText = useMemo(() => {
    if (!location?.coords?.speed || progress >= 100) return null;

    const speed = location.coords.speed; // m/s
    if (speed < 50) return null; // Too slow (< 180 km/h)

    // Estimate total route distance
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += calculateDistance(
        route[i].latitude, route[i].longitude,
        route[i + 1].latitude, route[i + 1].longitude
      );
    }

    const remainingDistance = totalDistance * (1 - progress / 100);
    const secondsRemaining = remainingDistance / speed;

    if (secondsRemaining < 60) {
      return 'Arriving';
    } else if (secondsRemaining < 3600) {
      return `${Math.round(secondsRemaining / 60)}m`;
    } else {
      const hours = Math.floor(secondsRemaining / 3600);
      const mins = Math.round((secondsRemaining % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
  }, [location, route, progress]);

  if (route.length < 2) return null;

  const originCode = origin?.code || 'DEP';
  const destCode = destination?.code || 'ARR';

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <Text style={styles.airportCode}>{originCode}</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            <View style={[styles.planeIndicator, { left: `${progressPercent}%` }]}>
              <Text style={styles.planeIcon}>✈</Text>
            </View>
          </View>
        </View>
        <Text style={styles.airportCode}>{destCode}</Text>
      </View>
      <View style={styles.statsRow}>
        <Text style={styles.progressText}>{progressPercent}% complete</Text>
        {etaText && <Text style={styles.etaText}>ETA: {etaText}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  airportCode: {
    color: '#00d4ff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    width: 36,
    textAlign: 'center',
  },
  progressContainer: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00d4ff',
    borderRadius: 2,
  },
  planeIndicator: {
    position: 'absolute',
    top: -10,
    marginLeft: -12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planeIcon: {
    fontSize: 16,
    color: '#ffffff',
    transform: [{ rotate: '90deg' }],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
  etaText: {
    color: '#00d4ff',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default FlightProgressBar;

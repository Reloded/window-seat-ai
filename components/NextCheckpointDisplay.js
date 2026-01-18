import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { calculateDistance } from '../utils/geofence';

export function NextCheckpointDisplay({
  location,
  checkpoints = [],
  triggeredCheckpoints = new Set(),
  style,
}) {
  const nextCheckpoint = useMemo(() => {
    if (!location?.coords || checkpoints.length === 0) return null;

    const { latitude, longitude } = location.coords;

    // Find the first untriggered checkpoint
    for (const checkpoint of checkpoints) {
      const isTriggered = triggeredCheckpoints.has(checkpoint.id) ||
                          triggeredCheckpoints.has(checkpoints.indexOf(checkpoint));
      if (!isTriggered) {
        const distance = calculateDistance(
          latitude,
          longitude,
          checkpoint.latitude,
          checkpoint.longitude
        );
        return { ...checkpoint, distance };
      }
    }

    return null;
  }, [location, checkpoints, triggeredCheckpoints]);

  // Calculate ETA based on current speed
  const eta = useMemo(() => {
    if (!nextCheckpoint || !location?.coords?.speed) return null;

    const speed = location.coords.speed; // m/s
    if (speed < 10) return null; // Too slow to estimate (< 36 km/h)

    const seconds = nextCheckpoint.distance / speed;

    if (seconds < 60) {
      return 'Less than 1 min';
    } else if (seconds < 3600) {
      const mins = Math.round(seconds / 60);
      return `${mins} min`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.round((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
  }, [nextCheckpoint, location?.coords?.speed]);

  if (!nextCheckpoint) {
    return null;
  }

  const distanceText = formatDistance(nextCheckpoint.distance);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>NEXT</Text>
        <Text style={styles.checkpointName} numberOfLines={1}>
          {nextCheckpoint.name}
        </Text>
      </View>
      <View style={styles.dataRow}>
        <View style={styles.dataItem}>
          <Text style={styles.dataValue}>{distanceText}</Text>
          <Text style={styles.dataLabel}>DISTANCE</Text>
        </View>
        {eta && (
          <View style={styles.dataItem}>
            <Text style={styles.dataValue}>{eta}</Text>
            <Text style={styles.dataLabel}>ETA</Text>
          </View>
        )}
        {nextCheckpoint.landmark?.type && (
          <View style={styles.dataItem}>
            <Text style={styles.dataValue}>
              {formatType(nextCheckpoint.landmark.type)}
            </Text>
            <Text style={styles.dataLabel}>TYPE</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else if (meters < 10000) {
    return `${(meters / 1000).toFixed(1)} km`;
  } else {
    return `${Math.round(meters / 1000)} km`;
  }
}

function formatType(type) {
  return type
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#00d4ff',
    fontSize: 10,
    fontWeight: '700',
    marginRight: 8,
  },
  checkpointName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dataItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  dataValue: {
    color: '#00d4ff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  dataLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default NextCheckpointDisplay;

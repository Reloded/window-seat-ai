import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { calculateBearing } from '../utils/geofence';

export function WindowSideAdvisor({
  route = [],
  checkpoints = [],
  style,
}) {
  const [showDetails, setShowDetails] = useState(false);

  const analysis = useMemo(() => {
    if (route.length < 2 || checkpoints.length === 0) {
      return null;
    }

    const leftSide = [];
    const rightSide = [];

    // For each checkpoint, determine which side of the plane it's on
    checkpoints.forEach((checkpoint) => {
      // Find the closest route segment to this checkpoint
      let closestSegmentIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < route.length - 1; i++) {
        const midLat = (route[i].latitude + route[i + 1].latitude) / 2;
        const midLng = (route[i].longitude + route[i + 1].longitude) / 2;
        const dist = Math.sqrt(
          Math.pow(checkpoint.latitude - midLat, 2) +
          Math.pow(checkpoint.longitude - midLng, 2)
        );
        if (dist < minDistance) {
          minDistance = dist;
          closestSegmentIndex = i;
        }
      }

      // Calculate bearing of the flight path at this segment
      const segmentStart = route[closestSegmentIndex];
      const segmentEnd = route[Math.min(closestSegmentIndex + 1, route.length - 1)];
      const flightBearing = calculateBearing(
        segmentStart.latitude,
        segmentStart.longitude,
        segmentEnd.latitude,
        segmentEnd.longitude
      );

      // Calculate bearing from flight path to checkpoint
      const checkpointBearing = calculateBearing(
        segmentStart.latitude,
        segmentStart.longitude,
        checkpoint.latitude,
        checkpoint.longitude
      );

      // Determine relative angle (positive = right, negative = left)
      let relativeAngle = checkpointBearing - flightBearing;
      if (relativeAngle > 180) relativeAngle -= 360;
      if (relativeAngle < -180) relativeAngle += 360;

      const side = relativeAngle > 0 ? 'right' : 'left';
      const importance = getImportance(checkpoint);

      const entry = {
        name: checkpoint.name,
        type: checkpoint.landmark?.type || 'waypoint',
        importance,
      };

      if (side === 'left') {
        leftSide.push(entry);
      } else {
        rightSide.push(entry);
      }
    });

    // Calculate scores
    const leftScore = leftSide.reduce((sum, c) => sum + c.importance, 0);
    const rightScore = rightSide.reduce((sum, c) => sum + c.importance, 0);

    // Filter to notable landmarks only
    const leftNotable = leftSide.filter(c => c.importance >= 2);
    const rightNotable = rightSide.filter(c => c.importance >= 2);

    const recommendation = leftScore > rightScore ? 'LEFT' :
                          rightScore > leftScore ? 'RIGHT' : 'EITHER';

    return {
      recommendation,
      leftScore,
      rightScore,
      leftSide,
      rightSide,
      leftNotable,
      rightNotable,
      confidence: Math.abs(leftScore - rightScore) / Math.max(leftScore + rightScore, 1),
    };
  }, [route, checkpoints]);

  if (!analysis) return null;

  const { recommendation, leftNotable, rightNotable, confidence } = analysis;

  // Don't show if no clear recommendation
  if (recommendation === 'EITHER' && confidence < 0.1) return null;

  return (
    <View style={[styles.container, style]}>
      <Pressable
        style={styles.headerTouchable}
        onPress={() => setShowDetails(!showDetails)}
      >
        <View style={styles.header}>
          <Text style={styles.label}>WINDOW SEAT</Text>
          <View style={styles.headerRight}>
            <View style={[
              styles.recommendationBadge,
              recommendation === 'LEFT' && styles.badgeLeft,
              recommendation === 'RIGHT' && styles.badgeRight,
            ]}>
              <Text style={styles.recommendationText}>
                {recommendation === 'EITHER' ? 'EITHER SIDE' : `SIT ${recommendation}`}
              </Text>
            </View>
            <Text style={styles.expandIcon}>{showDetails ? '▼' : '▶'}</Text>
          </View>
        </View>

        <Text style={styles.reason}>
          {getRecommendationReason(recommendation, leftNotable, rightNotable)}
        </Text>
      </Pressable>

      {showDetails && (
        <View style={styles.detailsContainer}>
          <View style={styles.sideSection}>
            <View style={styles.sideHeader}>
              <Text style={styles.sideTitle}>← Left</Text>
              <Text style={styles.sideCount}>{analysis.leftSide.length}</Text>
            </View>
            {analysis.leftSide.length === 0 ? (
              <Text style={styles.noLandmarks}>None</Text>
            ) : (
              analysis.leftSide.map((landmark, i) => (
                <View key={i} style={styles.landmarkItem}>
                  <View style={[styles.importanceDot, getImportanceStyle(landmark.importance)]} />
                  <Text style={styles.landmarkName} numberOfLines={1}>{landmark.name}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.sideSection}>
            <View style={styles.sideHeader}>
              <Text style={styles.sideTitle}>Right →</Text>
              <Text style={styles.sideCount}>{analysis.rightSide.length}</Text>
            </View>
            {analysis.rightSide.length === 0 ? (
              <Text style={styles.noLandmarks}>None</Text>
            ) : (
              analysis.rightSide.map((landmark, i) => (
                <View key={i} style={styles.landmarkItem}>
                  <View style={[styles.importanceDot, getImportanceStyle(landmark.importance)]} />
                  <Text style={styles.landmarkName} numberOfLines={1}>{landmark.name}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function getImportance(checkpoint) {
  const type = checkpoint.landmark?.type || '';

  // High importance
  if (type.includes('national_park')) return 5;
  if (type.includes('mountain') || type.includes('peak')) return 4;
  if (type.includes('volcano')) return 5;
  if (type.includes('glacier')) return 4;
  if (type.includes('canyon')) return 5;

  // Medium importance
  if (type.includes('lake')) return 3;
  if (type.includes('river')) return 2;
  if (type.includes('coastline') || type.includes('bay')) return 3;
  if (type.includes('protected')) return 3;

  // Check name for notable features
  const name = (checkpoint.name || '').toLowerCase();
  if (name.includes('canyon')) return 5;
  if (name.includes('mountain') || name.includes('peak') || name.includes('mt.')) return 4;
  if (name.includes('lake')) return 3;
  if (name.includes('national')) return 4;
  if (name.includes('river')) return 2;

  // Low importance (cities, generic waypoints)
  if (type === 'settlement' || type === 'waypoint') return 1;

  return 1;
}

function getImportanceStyle(importance) {
  if (importance >= 4) return { backgroundColor: '#ff6b6b' }; // Must see
  if (importance >= 3) return { backgroundColor: '#ffd93d' }; // Notable
  if (importance >= 2) return { backgroundColor: '#6bcb77' }; // Interesting
  return { backgroundColor: 'rgba(255,255,255,0.3)' }; // Normal
}

function getRecommendationReason(recommendation, leftNotable, rightNotable) {
  if (recommendation === 'EITHER') {
    return 'Both sides have similar views';
  }

  const notable = recommendation === 'LEFT' ? leftNotable : rightNotable;
  if (notable.length === 0) {
    return 'Slightly better views on this side';
  }

  const topLandmarks = notable.slice(0, 2).map(l => l.name);
  return `Best for ${topLandmarks.join(', ')}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerTouchable: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  expandIcon: {
    color: '#00d4ff',
    fontSize: 12,
  },
  recommendationBadge: {
    backgroundColor: '#00d4ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeLeft: {
    backgroundColor: '#ff6b6b',
  },
  badgeRight: {
    backgroundColor: '#6bcb77',
  },
  recommendationText: {
    color: '#0a1628',
    fontSize: 12,
    fontWeight: '800',
  },
  reason: {
    color: '#ffffff',
    fontSize: 14,
  },

  // Expanded details
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    flexDirection: 'row',
  },
  sideSection: {
    flex: 1,
    paddingHorizontal: 4,
  },
  sideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sideTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  sideCount: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
  },
  noLandmarks: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  landmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  importanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  landmarkName: {
    color: '#ffffff',
    fontSize: 12,
    flex: 1,
  },
});

export default WindowSideAdvisor;

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
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
    <>
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={() => setShowDetails(true)}
      >
        <View style={styles.header}>
          <Text style={styles.label}>WINDOW SEAT</Text>
          <View style={[
            styles.recommendationBadge,
            recommendation === 'LEFT' && styles.badgeLeft,
            recommendation === 'RIGHT' && styles.badgeRight,
          ]}>
            <Text style={styles.recommendationText}>
              {recommendation === 'EITHER' ? 'EITHER SIDE' : `SIT ${recommendation}`}
            </Text>
          </View>
        </View>

        <Text style={styles.reason}>
          {getRecommendationReason(recommendation, leftNotable, rightNotable)}
        </Text>

        <Text style={styles.hint}>Tap for details</Text>
      </TouchableOpacity>

      <Modal
        visible={showDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Window Seat Guide</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDetails(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recommendationLarge}>
              <Text style={styles.recommendationLargeLabel}>Recommended</Text>
              <Text style={[
                styles.recommendationLargeText,
                recommendation === 'LEFT' && styles.textLeft,
                recommendation === 'RIGHT' && styles.textRight,
              ]}>
                {recommendation === 'EITHER' ? 'Either Side' : `${recommendation} Window`}
              </Text>
            </View>

            <ScrollView style={styles.sideComparison}>
              <View style={styles.sideSection}>
                <View style={styles.sideHeader}>
                  <Text style={styles.sideIcon}>👈</Text>
                  <Text style={styles.sideTitle}>Left Side</Text>
                  <Text style={styles.sideCount}>{analysis.leftSide.length} landmarks</Text>
                </View>
                {analysis.leftSide.length === 0 ? (
                  <Text style={styles.noLandmarks}>No notable landmarks</Text>
                ) : (
                  analysis.leftSide.map((landmark, i) => (
                    <View key={i} style={styles.landmarkItem}>
                      <View style={[styles.importanceDot, getImportanceStyle(landmark.importance)]} />
                      <Text style={styles.landmarkName}>{landmark.name}</Text>
                    </View>
                  ))
                )}
              </View>

              <View style={styles.sideSection}>
                <View style={styles.sideHeader}>
                  <Text style={styles.sideIcon}>👉</Text>
                  <Text style={styles.sideTitle}>Right Side</Text>
                  <Text style={styles.sideCount}>{analysis.rightSide.length} landmarks</Text>
                </View>
                {analysis.rightSide.length === 0 ? (
                  <Text style={styles.noLandmarks}>No notable landmarks</Text>
                ) : (
                  analysis.rightSide.map((landmark, i) => (
                    <View key={i} style={styles.landmarkItem}>
                      <View style={[styles.importanceDot, getImportanceStyle(landmark.importance)]} />
                      <Text style={styles.landmarkName}>{landmark.name}</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButtonLarge}
              onPress={() => setShowDetails(false)}
            >
              <Text style={styles.closeButtonLargeText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  recommendationBadge: {
    backgroundColor: '#00d4ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    marginBottom: 4,
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0d1e33',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 20,
  },
  recommendationLarge: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 12,
  },
  recommendationLargeLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 4,
  },
  recommendationLargeText: {
    color: '#00d4ff',
    fontSize: 28,
    fontWeight: '800',
  },
  textLeft: {
    color: '#ff6b6b',
  },
  textRight: {
    color: '#6bcb77',
  },
  sideComparison: {
    flex: 1,
  },
  sideSection: {
    marginBottom: 20,
  },
  sideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sideIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sideTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  sideCount: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  noLandmarks: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    fontStyle: 'italic',
    paddingLeft: 26,
  },
  landmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 26,
  },
  importanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  landmarkName: {
    color: '#ffffff',
    fontSize: 14,
  },
  closeButtonLarge: {
    backgroundColor: '#00d4ff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonLargeText: {
    color: '#0a1628',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default WindowSideAdvisor;

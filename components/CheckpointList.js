import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { calculateDistance } from '../utils/geofence';

export function CheckpointList({
  checkpoints = [],
  triggeredCheckpoints = new Set(),
  location,
  style,
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);

  // Calculate distances and find next checkpoint
  const checkpointData = useMemo(() => {
    if (!checkpoints.length) return [];

    return checkpoints.map((checkpoint, index) => {
      const isTriggered = triggeredCheckpoints.has(checkpoint.id) ||
                          triggeredCheckpoints.has(index);

      let distance = null;
      if (location?.coords) {
        distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          checkpoint.latitude,
          checkpoint.longitude
        );
      }

      return {
        ...checkpoint,
        index,
        isTriggered,
        distance,
      };
    });
  }, [checkpoints, triggeredCheckpoints, location]);

  // Find next (first untriggered) checkpoint
  const nextIndex = checkpointData.findIndex(c => !c.isTriggered);

  const triggeredCount = checkpointData.filter(c => c.isTriggered).length;

  if (checkpoints.length === 0) return null;

  return (
    <>
      {/* Collapsed view - just shows summary */}
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={() => setExpanded(true)}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Checkpoints</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {triggeredCount}/{checkpoints.length}
            </Text>
          </View>
        </View>
        <View style={styles.progressDots}>
          {checkpointData.map((cp, i) => (
            <View
              key={cp.id || i}
              style={[
                styles.dot,
                cp.isTriggered && styles.dotTriggered,
                i === nextIndex && styles.dotNext,
              ]}
            />
          ))}
        </View>
        <Text style={styles.hint}>Tap to view all</Text>
      </TouchableOpacity>

      {/* Expanded modal with full list */}
      <Modal
        visible={expanded}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setExpanded(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>All Checkpoints</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setExpanded(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {triggeredCount} of {checkpoints.length} visited
            </Text>

            <ScrollView style={styles.list}>
              {checkpointData.map((checkpoint, index) => (
                <TouchableOpacity
                  key={checkpoint.id || index}
                  style={[
                    styles.listItem,
                    checkpoint.isTriggered && styles.listItemTriggered,
                    index === nextIndex && styles.listItemNext,
                  ]}
                  onPress={() => setSelectedCheckpoint(checkpoint)}
                >
                  <View style={styles.listItemLeft}>
                    <View style={[
                      styles.listItemDot,
                      checkpoint.isTriggered && styles.listItemDotTriggered,
                      index === nextIndex && styles.listItemDotNext,
                    ]}>
                      {checkpoint.isTriggered && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <View style={styles.listItemInfo}>
                      <Text style={[
                        styles.listItemName,
                        checkpoint.isTriggered && styles.listItemNameTriggered,
                      ]}>
                        {checkpoint.name}
                      </Text>
                      {checkpoint.landmark?.type && (
                        <Text style={styles.listItemType}>
                          {checkpoint.landmark.type.replace(/_/g, ' ')}
                        </Text>
                      )}
                    </View>
                  </View>
                  {checkpoint.distance && (
                    <Text style={styles.listItemDistance}>
                      {formatDistance(checkpoint.distance)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Checkpoint detail modal */}
      <Modal
        visible={!!selectedCheckpoint}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedCheckpoint(null)}
      >
        <TouchableOpacity
          style={styles.detailOverlay}
          activeOpacity={1}
          onPress={() => setSelectedCheckpoint(null)}
        >
          <View style={styles.detailContent}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{selectedCheckpoint?.name}</Text>
              {selectedCheckpoint?.landmark?.type && (
                <Text style={styles.detailType}>
                  {selectedCheckpoint.landmark.type.replace(/_/g, ' ')}
                </Text>
              )}
            </View>

            {selectedCheckpoint?.landmark?.region && (
              <Text style={styles.detailRegion}>
                {selectedCheckpoint.landmark.region}
                {selectedCheckpoint.landmark.country && `, ${selectedCheckpoint.landmark.country}`}
              </Text>
            )}

            {selectedCheckpoint?.narration && (
              <ScrollView style={styles.detailNarration}>
                <Text style={styles.detailNarrationText}>
                  {selectedCheckpoint.narration}
                </Text>
              </ScrollView>
            )}

            {!selectedCheckpoint?.narration && (
              <Text style={styles.detailNoNarration}>
                No narration available (add Claude API key for AI narrations)
              </Text>
            )}

            <TouchableOpacity
              style={styles.detailClose}
              onPress={() => setSelectedCheckpoint(null)}
            >
              <Text style={styles.detailCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#00d4ff',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#0a1628',
    fontSize: 12,
    fontWeight: '700',
  },
  progressDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotTriggered: {
    backgroundColor: '#00ff88',
  },
  dotNext: {
    backgroundColor: '#00d4ff',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    textAlign: 'center',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0d1e33',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  modalSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginBottom: 16,
  },
  list: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  listItemTriggered: {
    opacity: 0.6,
  },
  listItemNext: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemDotTriggered: {
    backgroundColor: '#00ff88',
  },
  listItemDotNext: {
    backgroundColor: '#00d4ff',
  },
  checkmark: {
    color: '#0a1628',
    fontSize: 14,
    fontWeight: '700',
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  listItemNameTriggered: {
    textDecorationLine: 'line-through',
  },
  listItemType: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  listItemDistance: {
    color: '#00d4ff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Detail modal
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  detailContent: {
    backgroundColor: '#0d1e33',
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  detailHeader: {
    marginBottom: 8,
  },
  detailTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  detailType: {
    color: '#00d4ff',
    fontSize: 14,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  detailRegion: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginBottom: 16,
  },
  detailNarration: {
    maxHeight: 200,
    marginBottom: 16,
  },
  detailNarrationText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  detailNoNarration: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  detailClose: {
    backgroundColor: '#00d4ff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  detailCloseText: {
    color: '#0a1628',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CheckpointList;

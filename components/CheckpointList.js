import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Pressable } from 'react-native';
import { calculateDistance } from '../utils/geofence';

export function CheckpointList({
  checkpoints = [],
  triggeredCheckpoints = new Set(),
  location,
  style,
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);

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

  const selectedCheckpoint = selectedIndex !== null ? checkpointData[selectedIndex] : null;

  return (
    <View style={[styles.container, style]}>
      {/* Header - always visible */}
      <Pressable
        style={styles.headerTouchable}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Checkpoints</Text>
          <View style={styles.headerRight}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {triggeredCount}/{checkpoints.length}
              </Text>
            </View>
            <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
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
      </Pressable>

      {/* Expanded list - inline */}
      {expanded && (
        <View style={styles.expandedList}>
          <ScrollView style={styles.listScroll} nestedScrollEnabled={true}>
            {checkpointData.map((checkpoint, index) => (
              <Pressable
                key={checkpoint.id || index}
                style={[
                  styles.listItem,
                  checkpoint.isTriggered && styles.listItemTriggered,
                  index === nextIndex && styles.listItemNext,
                  selectedIndex === index && styles.listItemSelected,
                ]}
                onPress={() => setSelectedIndex(selectedIndex === index ? null : index)}
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
                    ]} numberOfLines={1}>
                      {checkpoint.name}
                    </Text>
                    {checkpoint.landmark?.type && (
                      <Text style={styles.listItemType} numberOfLines={1}>
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
              </Pressable>
            ))}
          </ScrollView>

          {/* Selected checkpoint detail - inside expanded area */}
          {selectedCheckpoint && (
            <View style={styles.detailInline}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>{selectedCheckpoint.name}</Text>
                <Pressable onPress={() => setSelectedIndex(null)} style={styles.detailClose}>
                  <Text style={styles.detailCloseText}>✕</Text>
                </Pressable>
              </View>
              {selectedCheckpoint.landmark?.type && (
                <Text style={styles.detailType}>
                  {selectedCheckpoint.landmark.type.replace(/_/g, ' ')}
                </Text>
              )}
              {selectedCheckpoint.narration ? (
                <Text style={styles.detailNarrationText} numberOfLines={4}>
                  {selectedCheckpoint.narration}
                </Text>
              ) : (
                <Text style={styles.detailNoNarration}>
                  No narration available
                </Text>
              )}
            </View>
          )}
        </View>
      )}
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
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: 8,
  },
  badgeText: {
    color: '#0a1628',
    fontSize: 12,
    fontWeight: '700',
  },
  expandIcon: {
    color: '#00d4ff',
    fontSize: 12,
  },
  progressDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 4,
    marginBottom: 4,
  },
  dotTriggered: {
    backgroundColor: '#00ff88',
  },
  dotNext: {
    backgroundColor: '#00d4ff',
  },

  // Expanded list
  expandedList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  listScroll: {
    maxHeight: 180,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginBottom: 2,
  },
  listItemTriggered: {
    opacity: 0.5,
  },
  listItemNext: {
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
  },
  listItemSelected: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 10,
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
    fontSize: 12,
    fontWeight: '700',
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  listItemNameTriggered: {
    textDecorationLine: 'line-through',
  },
  listItemType: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  listItemDistance: {
    color: '#00d4ff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Inline detail
  detailInline: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 212, 255, 0.3)',
    margin: 8,
    marginTop: 0,
    borderRadius: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  detailClose: {
    padding: 4,
    marginLeft: 8,
  },
  detailCloseText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  detailType: {
    color: '#00d4ff',
    fontSize: 11,
    textTransform: 'capitalize',
    marginTop: 2,
    marginBottom: 6,
  },
  detailNarrationText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    lineHeight: 18,
  },
  detailNoNarration: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default CheckpointList;

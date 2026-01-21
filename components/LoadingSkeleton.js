import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

/**
 * LoadingSkeleton - Animated placeholder for loading content
 *
 * @param {Object} props
 * @param {number} [props.width] - Width of skeleton (default: 100%)
 * @param {number} [props.height] - Height of skeleton (default: 20)
 * @param {number} [props.borderRadius] - Border radius (default: 4)
 * @param {Object} [props.style] - Additional styles
 */
export function LoadingSkeleton({ width, height = 20, borderRadius = 4, style }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width || '100%',
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * TextSkeleton - Multiple lines of skeleton text
 *
 * @param {Object} props
 * @param {number} [props.lines] - Number of lines (default: 3)
 * @param {number} [props.lineHeight] - Height of each line (default: 16)
 * @param {number} [props.spacing] - Space between lines (default: 8)
 * @param {Object} [props.style] - Additional styles
 */
export function TextSkeleton({ lines = 3, lineHeight = 16, spacing = 8, style }) {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <LoadingSkeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? '70%' : '100%'}
          style={index < lines - 1 ? { marginBottom: spacing } : undefined}
        />
      ))}
    </View>
  );
}

/**
 * NarrationSkeleton - Skeleton for the narration display area
 */
export function NarrationSkeleton({ style }) {
  return (
    <View style={[styles.narrationSkeleton, style]}>
      <LoadingSkeleton width={120} height={14} style={styles.labelSkeleton} />
      <TextSkeleton lines={4} lineHeight={18} spacing={10} />
    </View>
  );
}

/**
 * CheckpointSkeleton - Skeleton for a checkpoint item
 */
export function CheckpointSkeleton({ style }) {
  return (
    <View style={[styles.checkpointSkeleton, style]}>
      <LoadingSkeleton width={40} height={40} borderRadius={20} />
      <View style={styles.checkpointContent}>
        <LoadingSkeleton width="60%" height={14} style={{ marginBottom: 6 }} />
        <LoadingSkeleton width="40%" height={12} />
      </View>
    </View>
  );
}

/**
 * CheckpointListSkeleton - Multiple checkpoint skeletons
 */
export function CheckpointListSkeleton({ count = 3, style }) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <CheckpointSkeleton key={index} style={index < count - 1 ? { marginBottom: 12 } : undefined} />
      ))}
    </View>
  );
}

/**
 * FlightPackSkeleton - Skeleton for the entire flight pack loading state
 */
export function FlightPackSkeleton({ style }) {
  return (
    <View style={[styles.flightPackSkeleton, style]}>
      {/* Header */}
      <View style={styles.flightPackHeader}>
        <LoadingSkeleton width={100} height={24} style={{ marginBottom: 8 }} />
        <LoadingSkeleton width={200} height={14} />
      </View>

      {/* Progress bar skeleton */}
      <LoadingSkeleton height={8} borderRadius={4} style={styles.progressSkeleton} />

      {/* Checkpoint list skeleton */}
      <CheckpointListSkeleton count={4} style={styles.checkpointListSkeleton} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  narrationSkeleton: {
    padding: 16,
  },
  labelSkeleton: {
    marginBottom: 12,
  },
  checkpointSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  checkpointContent: {
    flex: 1,
    marginLeft: 12,
  },
  flightPackSkeleton: {
    padding: 16,
  },
  flightPackHeader: {
    marginBottom: 20,
  },
  progressSkeleton: {
    marginBottom: 20,
  },
  checkpointListSkeleton: {
    marginTop: 8,
  },
});

export default LoadingSkeleton;

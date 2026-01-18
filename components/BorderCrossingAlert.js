import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { borderCrossingService } from '../services/BorderCrossingService';

export function BorderCrossingAlert({
  location,
  isTracking,
  style,
}) {
  const [currentCrossing, setCurrentCrossing] = useState(null);
  const [currentRegion, setCurrentRegion] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const dismissTimeout = useRef(null);

  // Subscribe to border crossing events
  useEffect(() => {
    const unsubscribe = borderCrossingService.onBorderCrossing((crossing) => {
      showCrossing(crossing);
    });

    return () => {
      unsubscribe();
      if (dismissTimeout.current) {
        clearTimeout(dismissTimeout.current);
      }
    };
  }, []);

  // Update position when location changes
  useEffect(() => {
    if (!isTracking || !location?.coords) return;

    const { latitude, longitude } = location.coords;
    borderCrossingService.updatePosition(latitude, longitude).then(() => {
      setCurrentRegion(borderCrossingService.getCurrentRegion());
    });
  }, [location, isTracking]);

  // Reset when tracking stops
  useEffect(() => {
    if (!isTracking) {
      borderCrossingService.reset();
      setCurrentRegion(null);
    }
  }, [isTracking]);

  const showCrossing = (crossing) => {
    setCurrentCrossing(crossing);

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 8 seconds
    if (dismissTimeout.current) {
      clearTimeout(dismissTimeout.current);
    }
    dismissTimeout.current = setTimeout(() => {
      dismissCrossing();
    }, 8000);
  };

  const dismissCrossing = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentCrossing(null);
    });
  };

  // Show current region indicator when not showing a crossing alert
  if (!currentCrossing && currentRegion) {
    return (
      <View style={[styles.regionIndicator, style]}>
        <Text style={styles.regionFlag}>
          {borderCrossingService.getFlagEmoji(currentRegion.countryCode)}
        </Text>
        <Text style={styles.regionText}>
          {currentRegion.state ? `${currentRegion.state}, ` : ''}
          {currentRegion.country}
        </Text>
      </View>
    );
  }

  if (!currentCrossing) return null;

  const isCountryCrossing = currentCrossing.type === 'country';
  const flag = isCountryCrossing
    ? borderCrossingService.getFlagEmoji(currentCrossing.to.code)
    : borderCrossingService.getFlagEmoji(currentRegion?.countryCode);

  return (
    <Animated.View
      style={[
        styles.container,
        isCountryCrossing ? styles.containerCountry : styles.containerState,
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.flag}>{flag}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.label}>
            {isCountryCrossing ? 'ENTERING COUNTRY' : 'ENTERING STATE'}
          </Text>
          <Text style={styles.name}>{currentCrossing.to.name}</Text>
          {currentCrossing.from && (
            <Text style={styles.from}>
              From {currentCrossing.from.name}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.decoration}>
        <View style={[styles.stripe, styles.stripe1]} />
        <View style={[styles.stripe, styles.stripe2]} />
        <View style={[styles.stripe, styles.stripe3]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    overflow: 'hidden',
  },
  containerCountry: {
    backgroundColor: 'rgba(107, 203, 119, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(107, 203, 119, 0.4)',
  },
  containerState: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  flag: {
    fontSize: 40,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  name: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  from: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  decoration: {
    position: 'absolute',
    right: -20,
    top: -20,
    bottom: -20,
    width: 100,
    opacity: 0.1,
  },
  stripe: {
    position: 'absolute',
    width: 20,
    height: '150%',
    backgroundColor: '#ffffff',
    transform: [{ rotate: '15deg' }],
  },
  stripe1: {
    right: 0,
  },
  stripe2: {
    right: 30,
  },
  stripe3: {
    right: 60,
  },

  // Current region indicator (minimal)
  regionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  regionFlag: {
    fontSize: 18,
  },
  regionText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
  },
});

export default BorderCrossingAlert;

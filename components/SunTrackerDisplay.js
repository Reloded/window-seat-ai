import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { sunPositionService } from '../services/SunPositionService';
import { calculateBearing } from '../utils/geofence';

export function SunTrackerDisplay({
  location,
  route = [],
  style,
}) {
  const sunInfo = useMemo(() => {
    if (!location?.coords) return null;

    const { latitude, longitude } = location.coords;

    // Calculate flight heading from route or location
    let heading = location.coords.heading;

    // If no heading from GPS, estimate from route
    if ((heading === null || heading === undefined || heading < 0) && route.length >= 2) {
      // Find closest point on route and get heading to next point
      let closestIndex = 0;
      let minDist = Infinity;

      for (let i = 0; i < route.length; i++) {
        const dist = Math.sqrt(
          Math.pow(latitude - route[i].latitude, 2) +
          Math.pow(longitude - route[i].longitude, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          closestIndex = i;
        }
      }

      if (closestIndex < route.length - 1) {
        heading = calculateBearing(
          route[closestIndex].latitude,
          route[closestIndex].longitude,
          route[closestIndex + 1].latitude,
          route[closestIndex + 1].longitude
        );
      }
    }

    return sunPositionService.getSunInfo(latitude, longitude, heading);
  }, [location, route]);

  if (!sunInfo) return null;

  const { phase, sunSide, nextEvent, timeToNextEvent, viewingAdvice, elevation } = sunInfo;

  // Get phase icon and color
  const getPhaseStyle = () => {
    switch (phase.phase) {
      case 'golden_hour':
        return { icon: '🌅', color: '#ffd700', bgColor: 'rgba(255, 215, 0, 0.15)' };
      case 'dawn':
        return { icon: '🌄', color: '#ff9966', bgColor: 'rgba(255, 153, 102, 0.15)' };
      case 'dusk':
        return { icon: '🌆', color: '#ff6b6b', bgColor: 'rgba(255, 107, 107, 0.15)' };
      case 'day':
        return { icon: '☀️', color: '#ffd93d', bgColor: 'rgba(255, 217, 61, 0.1)' };
      case 'night':
        return { icon: '🌙', color: '#a0a0ff', bgColor: 'rgba(160, 160, 255, 0.1)' };
      case 'polar_day':
        return { icon: '☀️', color: '#ffd93d', bgColor: 'rgba(255, 217, 61, 0.1)' };
      case 'polar_night':
        return { icon: '🌑', color: '#666', bgColor: 'rgba(100, 100, 100, 0.1)' };
      default:
        return { icon: '☀️', color: '#ffd93d', bgColor: 'rgba(255, 217, 61, 0.1)' };
    }
  };

  const getSunSideIcon = () => {
    switch (sunSide) {
      case 'left': return '👈';
      case 'right': return '👉';
      case 'ahead': return '⬆️';
      case 'behind': return '⬇️';
      default: return '•';
    }
  };

  const phaseStyle = getPhaseStyle();
  const timeStr = timeToNextEvent ? sunPositionService.formatTimeRemaining(timeToNextEvent) : null;

  // Don't show if it's regular daytime with no interesting events soon
  const isInteresting = phase.phase === 'golden_hour' ||
                        phase.phase === 'dawn' ||
                        phase.phase === 'dusk' ||
                        (timeToNextEvent && timeToNextEvent < 60 * 60 * 1000); // Within 1 hour

  if (!isInteresting && phase.phase === 'day') {
    // Show minimal daytime display
    return (
      <View style={[styles.containerMinimal, style]}>
        <Text style={styles.minimalIcon}>{phaseStyle.icon}</Text>
        <Text style={styles.minimalText}>
          {sunSide ? `Sun on ${sunSide}` : 'Daytime'}
        </Text>
        {nextEvent && timeStr && (
          <Text style={styles.minimalTime}>
            {nextEvent === 'sunset' ? '🌅' : '🌄'} {timeStr}
          </Text>
        )}
      </View>
    );
  }

  if (phase.phase === 'night') {
    return (
      <View style={[styles.containerMinimal, style]}>
        <Text style={styles.minimalIcon}>{phaseStyle.icon}</Text>
        <Text style={styles.minimalText}>Night</Text>
        {nextEvent === 'sunrise' && timeStr && (
          <Text style={styles.minimalTime}>🌄 {timeStr}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: phaseStyle.bgColor }, style]}>
      <View style={styles.header}>
        <View style={styles.phaseInfo}>
          <Text style={styles.phaseIcon}>{phaseStyle.icon}</Text>
          <View>
            <Text style={[styles.phaseLabel, { color: phaseStyle.color }]}>
              {phase.label.toUpperCase()}
            </Text>
            {phase.period && (
              <Text style={styles.phasePeriod}>
                {phase.period === 'morning' ? 'Morning' : 'Evening'}
              </Text>
            )}
          </View>
        </View>

        {sunSide && (
          <View style={styles.sunSide}>
            <Text style={styles.sunSideIcon}>{getSunSideIcon()}</Text>
            <Text style={styles.sunSideText}>
              {sunSide === 'ahead' ? 'Ahead' :
               sunSide === 'behind' ? 'Behind' :
               sunSide.charAt(0).toUpperCase() + sunSide.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {viewingAdvice && (
        <Text style={styles.advice}>{viewingAdvice}</Text>
      )}

      {nextEvent && timeStr && (
        <View style={styles.nextEvent}>
          <Text style={styles.nextEventIcon}>
            {nextEvent === 'sunset' ? '🌅' : '🌄'}
          </Text>
          <Text style={styles.nextEventText}>
            {nextEvent === 'sunset' ? 'Sunset' : 'Sunrise'} in {timeStr}
          </Text>
        </View>
      )}

      {elevation !== undefined && (
        <View style={styles.elevationBar}>
          <View style={styles.elevationTrack}>
            <View
              style={[
                styles.elevationIndicator,
                { left: `${Math.max(0, Math.min(100, (elevation + 10) / 100 * 100))}%` }
              ]}
            />
          </View>
          <Text style={styles.elevationText}>{Math.round(elevation)}°</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
  },
  containerMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  minimalIcon: {
    fontSize: 16,
  },
  minimalText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    flex: 1,
  },
  minimalTime: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  phaseIcon: {
    fontSize: 28,
  },
  phaseLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  phasePeriod: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    marginTop: 1,
  },
  sunSide: {
    alignItems: 'center',
  },
  sunSideIcon: {
    fontSize: 18,
  },
  sunSideText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    marginTop: 2,
  },
  advice: {
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 8,
  },
  nextEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  nextEventIcon: {
    fontSize: 14,
  },
  nextEventText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  elevationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  elevationTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    position: 'relative',
  },
  elevationIndicator: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffd93d',
    top: -2,
    marginLeft: -4,
  },
  elevationText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    width: 30,
    textAlign: 'right',
  },
});

export default SunTrackerDisplay;

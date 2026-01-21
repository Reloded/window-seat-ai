import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatAltitude, formatSpeed, formatCoordinateDecimal } from '../utils/conversions';

export function TelemetryDisplay({ location, style }) {
  const coords = location?.coords;

  const accessibilityLabel = coords
    ? `Current position: Latitude ${formatCoordinateDecimal(coords.latitude)}, Longitude ${formatCoordinateDecimal(coords.longitude)}, Altitude ${formatAltitude(coords.altitude)} feet, Speed ${formatSpeed(coords.speed)} knots`
    : 'Waiting for GPS location';

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <TelemetryItem
        label="LAT"
        fullLabel="Latitude"
        value={formatCoordinateDecimal(coords?.latitude)}
      />
      <TelemetryItem
        label="LNG"
        fullLabel="Longitude"
        value={formatCoordinateDecimal(coords?.longitude)}
      />
      <TelemetryItem
        label="ALT"
        fullLabel="Altitude"
        value={formatAltitude(coords?.altitude)}
        unit="FT"
      />
      <TelemetryItem
        label="SPD"
        fullLabel="Speed"
        value={formatSpeed(coords?.speed)}
        unit="KTS"
      />
    </View>
  );
}

function TelemetryItem({ label, fullLabel, value, unit }) {
  return (
    <View style={styles.item} accessibilityElementsHidden>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {value}{unit ? ` ${unit}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
  },
  item: {
    alignItems: 'center',
  },
  label: {
    color: '#00d4ff',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'monospace',
  },
});

export default TelemetryDisplay;

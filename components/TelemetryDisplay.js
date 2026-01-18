import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatAltitude, formatSpeed, formatCoordinateDecimal } from '../utils/conversions';

export function TelemetryDisplay({ location, style }) {
  const coords = location?.coords;

  return (
    <View style={[styles.container, style]}>
      <TelemetryItem
        label="LAT"
        value={formatCoordinateDecimal(coords?.latitude)}
      />
      <TelemetryItem
        label="LNG"
        value={formatCoordinateDecimal(coords?.longitude)}
      />
      <TelemetryItem
        label="ALT"
        value={formatAltitude(coords?.altitude)}
        unit="FT"
      />
      <TelemetryItem
        label="SPD"
        value={formatSpeed(coords?.speed)}
        unit="KTS"
      />
    </View>
  );
}

function TelemetryItem({ label, value, unit }) {
  return (
    <View style={styles.item}>
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

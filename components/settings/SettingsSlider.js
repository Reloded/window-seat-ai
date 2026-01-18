import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Slider from '@react-native-community/slider';

export function SettingsSlider({
  label,
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.01,
  formatValue,
  isLast,
}) {
  const displayValue = formatValue ? formatValue(value) : value.toFixed(2);

  return (
    <View style={[styles.container, !isLast && styles.border]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{displayValue}</Text>
      </View>
      <Slider
        style={styles.slider}
        value={value}
        onValueChange={onValueChange}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        minimumTrackTintColor="#00d4ff"
        maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
        thumbTintColor={Platform.OS === 'android' ? '#00d4ff' : '#ffffff'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
  },
  value: {
    color: '#00d4ff',
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function StatusIndicator({ isActive, activeText = 'ACTIVE', inactiveText = 'STANDBY' }) {
  const statusText = isActive ? activeText : inactiveText;

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${statusText}`}
      accessibilityLiveRegion="polite"
    >
      <View
        style={[styles.dot, isActive && styles.dotActive]}
        accessibilityElementsHidden
      />
      <Text
        style={[styles.text, isActive && styles.textActive]}
        accessibilityElementsHidden
      >
        {statusText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginRight: 8,
  },
  dotActive: {
    backgroundColor: '#00ff88',
  },
  text: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
  },
  textActive: {
    color: '#00ff88',
  },
});

export default StatusIndicator;

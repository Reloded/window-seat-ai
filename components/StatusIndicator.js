import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function StatusIndicator({ isActive, activeText = 'ACTIVE', inactiveText = 'STANDBY' }) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, isActive && styles.dotActive]} />
      <Text style={[styles.text, isActive && styles.textActive]}>
        {isActive ? activeText : inactiveText}
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

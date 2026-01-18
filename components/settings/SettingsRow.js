import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function SettingsRow({ label, description, children, isLast }) {
  return (
    <View style={[styles.container, !isLast && styles.border]}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {description && (
          <Text style={styles.description}>{description}</Text>
        )}
      </View>
      <View style={styles.control}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  labelContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  control: {
    flexShrink: 0,
  },
});

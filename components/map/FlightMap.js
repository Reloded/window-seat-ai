import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from './mapStyles';

// Native placeholder - react-leaflet only works on web
export function FlightMap({
  isExpanded = false,
  style = {},
}) {
  return (
    <View style={[styles.placeholderContainer, isExpanded ? styles.expanded : styles.collapsed, style]}>
      <Text style={styles.placeholderText}>Map view is available on web only</Text>
      <Text style={styles.placeholderSubtext}>GPS tracking works - map display coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholderContainer: {
    backgroundColor: 'rgba(10, 22, 40, 0.5)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  collapsed: {
    height: SIZES.collapsedHeight,
  },
  expanded: {
    flex: 1,
    minHeight: SIZES.expandedMinHeight,
  },
  placeholderText: {
    color: COLORS.white,
    fontSize: 16,
    opacity: 0.6,
  },
  placeholderSubtext: {
    color: COLORS.white,
    fontSize: 12,
    opacity: 0.4,
    marginTop: 4,
  },
});

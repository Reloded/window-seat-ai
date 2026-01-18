import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export function FlightHistoryTabs({
  activeTab,
  onTabChange,
  allCount,
  favoritesCount,
}) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'all' && styles.activeTab]}
        onPress={() => onTabChange('all')}
      >
        <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
          All ({allCount})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
        onPress={() => onTabChange('favorites')}
      >
        <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>
          Favorites ({favoritesCount})
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#00d4ff',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#0a1628',
  },
});

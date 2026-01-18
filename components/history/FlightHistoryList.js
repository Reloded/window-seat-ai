import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { FlightHistoryItem } from './FlightHistoryItem';

export function FlightHistoryList({
  flights,
  onToggleFavorite,
  onSelectFlight,
  onDeleteFlight,
  emptyMessage,
}) {
  const renderItem = ({ item }) => (
    <FlightHistoryItem
      flight={item}
      onToggleFavorite={() => onToggleFavorite(item.id)}
      onSelect={() => onSelectFlight(item)}
      onDelete={() => onDeleteFlight(item.id)}
    />
  );

  if (flights.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>✈</Text>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={flights}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.3,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

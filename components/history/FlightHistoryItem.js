import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export function FlightHistoryItem({
  flight,
  onToggleFavorite,
  onSelect,
  onDelete,
}) {
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRouteText = () => {
    if (flight.origin?.code && flight.destination?.code) {
      return `${flight.origin.code} → ${flight.destination.code}`;
    }
    if (flight.origin?.name && flight.destination?.name) {
      return `${flight.origin.name} → ${flight.destination.name}`;
    }
    return 'Route unavailable';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.mainContent}>
        {/* Flight number and favorite */}
        <View style={styles.headerRow}>
          <Text style={styles.flightNumber}>{flight.flightNumber}</Text>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.favoriteIcon}>
              {flight.isFavorite ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Route */}
        <Text style={styles.route}>{getRouteText()}</Text>

        {/* Metadata row */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {flight.checkpointCount} checkpoints
          </Text>
          {flight.hasAudio && (
            <Text style={styles.metaText}> • Audio</Text>
          )}
          <Text style={styles.dateText}>
            {formatDate(flight.downloadedAt)}
          </Text>
        </View>

        {/* Cache status */}
        {!flight.packCached && (
          <Text style={styles.uncachedText}>Tap to re-download</Text>
        )}
      </View>

      {/* Delete button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.deleteIcon}>×</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  mainContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  flightNumber: {
    color: '#00d4ff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  favoriteButton: {
    padding: 4,
  },
  favoriteIcon: {
    fontSize: 24,
    color: '#ffd700',
  },
  route: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginLeft: 'auto',
  },
  uncachedText: {
    color: '#ff9500',
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  deleteButton: {
    justifyContent: 'center',
    paddingLeft: 12,
  },
  deleteIcon: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '300',
  },
});

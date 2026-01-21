import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { flightDataService, narrationService } from '../services';

/**
 * RoutePreview - Shows route preview before downloading full flight pack
 */
export function RoutePreview({ flightNumber, visible, onClose, onDownload }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [routeData, setRouteData] = useState(null);

  useEffect(() => {
    if (visible && flightNumber) {
      loadRoutePreview();
    }
  }, [visible, flightNumber]);

  const loadRoutePreview = async () => {
    setLoading(true);
    setError(null);
    setRouteData(null);

    try {
      // Fetch route data without generating narrations or audio
      const flightData = await flightDataService.getFlightRoute(flightNumber);

      if (!flightData || !flightData.route || flightData.route.length === 0) {
        throw new Error('Could not find route data for this flight');
      }

      // Generate checkpoint locations (without full narrations)
      const checkpointLocations = await narrationService.getCheckpointLocationsOnly(
        flightData.route,
        flightNumber
      );

      setRouteData({
        flightNumber,
        origin: flightData.origin,
        destination: flightData.destination,
        route: flightData.route,
        estimatedDuration: flightData.estimatedDuration,
        checkpoints: checkpointLocations,
      });
    } catch (err) {
      setError(err.message || 'Failed to load route preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    onClose();
    onDownload();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close preview"
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Route Preview</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00d4ff" />
              <Text style={styles.loadingText}>Loading route preview...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadRoutePreview}
                accessibilityLabel="Retry loading preview"
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {routeData && (
            <>
              {/* Flight Info Card */}
              <View style={styles.flightCard}>
                <Text style={styles.flightNumber}>{routeData.flightNumber}</Text>
                <View style={styles.routeRow}>
                  <View style={styles.airportInfo}>
                    <Text style={styles.airportCode}>{routeData.origin?.code || '???'}</Text>
                    <Text style={styles.airportName} numberOfLines={1}>
                      {routeData.origin?.name || 'Origin'}
                    </Text>
                  </View>
                  <View style={styles.routeArrow}>
                    <Text style={styles.routeArrowText}>✈️ →</Text>
                  </View>
                  <View style={styles.airportInfo}>
                    <Text style={styles.airportCode}>{routeData.destination?.code || '???'}</Text>
                    <Text style={styles.airportName} numberOfLines={1}>
                      {routeData.destination?.name || 'Destination'}
                    </Text>
                  </View>
                </View>
                {routeData.estimatedDuration && (
                  <Text style={styles.duration}>
                    Est. flight time: {routeData.estimatedDuration}
                  </Text>
                )}
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{routeData.checkpoints?.length || 0}</Text>
                  <Text style={styles.statLabel}>Checkpoints</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{routeData.route?.length || 0}</Text>
                  <Text style={styles.statLabel}>Route Points</Text>
                </View>
              </View>

              {/* Checkpoint Preview List */}
              <View style={styles.checkpointSection}>
                <Text style={styles.sectionTitle}>Points of Interest</Text>
                {routeData.checkpoints && routeData.checkpoints.length > 0 ? (
                  routeData.checkpoints.map((checkpoint, index) => (
                    <View key={index} style={styles.checkpointItem}>
                      <View style={styles.checkpointNumber}>
                        <Text style={styles.checkpointNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.checkpointInfo}>
                        <Text style={styles.checkpointName}>{checkpoint.name}</Text>
                        {checkpoint.type && (
                          <Text style={styles.checkpointType}>{checkpoint.type}</Text>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noCheckpoints}>
                    Checkpoints will be generated during download
                  </Text>
                )}
              </View>

              {/* What's Included */}
              <View style={styles.includedSection}>
                <Text style={styles.sectionTitle}>Flight Pack Includes</Text>
                <View style={styles.includedItem}>
                  <Text style={styles.includedIcon}>📍</Text>
                  <Text style={styles.includedText}>GPS-triggered narrations</Text>
                </View>
                <View style={styles.includedItem}>
                  <Text style={styles.includedIcon}>🎙️</Text>
                  <Text style={styles.includedText}>AI-generated descriptions</Text>
                </View>
                <View style={styles.includedItem}>
                  <Text style={styles.includedIcon}>✈️</Text>
                  <Text style={styles.includedText}>Works offline in airplane mode</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Download Button */}
        {routeData && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={handleDownload}
              accessibilityLabel={`Download flight pack for ${flightNumber}`}
              accessibilityRole="button"
            >
              <Text style={styles.downloadButtonText}>Download Flight Pack</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#00d4ff',
    fontWeight: '600',
  },
  flightCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  flightNumber: {
    color: '#00d4ff',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  airportInfo: {
    flex: 1,
    alignItems: 'center',
  },
  airportCode: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  airportName: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  routeArrow: {
    paddingHorizontal: 16,
  },
  routeArrowText: {
    fontSize: 20,
  },
  duration: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#00d4ff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  checkpointSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  checkpointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  checkpointNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00d4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkpointNumberText: {
    color: '#0a1628',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkpointInfo: {
    flex: 1,
  },
  checkpointName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  checkpointType: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  noCheckpoints: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  includedSection: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  includedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  includedIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  includedText: {
    color: '#ffffff',
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  downloadButton: {
    backgroundColor: '#00d4ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#0a1628',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RoutePreview;

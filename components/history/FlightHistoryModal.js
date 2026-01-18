import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { FlightHistoryTabs } from './FlightHistoryTabs';
import { FlightHistoryList } from './FlightHistoryList';
import { useFlightHistory } from '../../contexts';
import { narrationService, shareService } from '../../services';

export function FlightHistoryModal({ visible, onClose, onSelectFlight }) {
  const [activeTab, setActiveTab] = useState('all');
  const {
    history,
    toggleFavorite,
    removeFromHistory,
  } = useFlightHistory();

  const favorites = useMemo(
    () => history.filter(entry => entry.isFavorite),
    [history]
  );

  const displayedFlights = activeTab === 'all' ? history : favorites;

  const handleDeleteFlight = (flightId) => {
    const confirmDelete = () => {
      removeFromHistory(flightId);
    };

    if (Platform.OS === 'web') {
      if (confirm('Remove this flight from history?')) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Remove Flight',
        'Remove this flight from history?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const handleSelectFlight = (flight) => {
    onSelectFlight(flight);
    onClose();
  };

  const handleShareFlight = async (flight) => {
    try {
      // Load the full pack from cache
      const pack = await narrationService.loadFlightPack(flight.flightNumber);

      if (!pack) {
        const message = 'Flight pack not cached. Please download it first.';
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('Cannot Share', message);
        }
        return;
      }

      const result = await shareService.shareFlight(pack);
      if (!result.success && result.error) {
        const message = `Share failed: ${result.error}`;
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('Share Error', message);
        }
      }
    } catch (error) {
      console.error('Share failed:', error);
      const message = 'An error occurred while sharing.';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Share Error', message);
      }
    }
  };

  const emptyMessage = activeTab === 'all'
    ? 'No flights yet.\nDownload a flight pack to get started.'
    : 'No favorite flights.\nTap the star on any flight to add it here.';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Flight History</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <FlightHistoryTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            allCount={history.length}
            favoritesCount={favorites.length}
          />
          <FlightHistoryList
            flights={displayedFlights}
            onToggleFavorite={toggleFavorite}
            onSelectFlight={handleSelectFlight}
            onDeleteFlight={handleDeleteFlight}
            onShareFlight={handleShareFlight}
            emptyMessage={emptyMessage}
          />
        </View>
      </SafeAreaView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeButtonText: {
    color: '#00d4ff',
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { SettingsSection } from '../SettingsSection';
import { SettingsRow } from '../SettingsRow';
import { SettingsButton } from '../SettingsButton';
import { elevenLabsService, narrationService } from '../../../services';
import { formatBytes } from '../../../utils/formatBytes';
import { useFlightHistory } from '../../../contexts';

export function StorageSection() {
  const [cacheSize, setCacheSize] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { markAllUncached } = useFlightHistory();

  const loadCacheSize = useCallback(async () => {
    try {
      const [audioSize, narrationSize] = await Promise.all([
        elevenLabsService.getCacheSize(),
        narrationService.getCacheSize(),
      ]);
      setCacheSize(audioSize + narrationSize);
    } catch (error) {
      console.error('Failed to get cache size:', error);
    }
  }, []);

  useEffect(() => {
    loadCacheSize();
  }, [loadCacheSize, refreshKey]);

  const handleClearCache = async () => {
    const confirmClear = () => {
      setIsClearing(true);
      elevenLabsService.clearAudioCache()
        .then(() => narrationService.clearAllFlightPacks())
        .then(() => {
          markAllUncached();
          setRefreshKey(k => k + 1);
        })
        .catch((error) => {
          console.error('Failed to clear cache:', error);
        })
        .finally(() => {
          setIsClearing(false);
        });
    };

    if (Platform.OS === 'web') {
      if (confirm('Clear all cached data? You will need to re-download flight packs for offline use.')) {
        confirmClear();
      }
    } else {
      Alert.alert(
        'Clear Cache',
        'This will delete all cached data including flight packs and audio. You will need to re-download them for offline use.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear', style: 'destructive', onPress: confirmClear },
        ]
      );
    }
  };

  return (
    <SettingsSection title="Storage">
      <SettingsRow label="Total Cache" isLast>
        <Text style={styles.cacheSize}>{formatBytes(cacheSize)}</Text>
      </SettingsRow>
      <View style={styles.buttonContainer}>
        <SettingsButton
          label="Clear All Cache"
          onPress={handleClearCache}
          variant="danger"
          loading={isClearing}
          disabled={cacheSize === 0}
        />
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  cacheSize: {
    color: '#00d4ff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    padding: 16,
    paddingTop: 8,
  },
});

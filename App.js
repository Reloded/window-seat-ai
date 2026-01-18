import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { TelemetryDisplay, StatusIndicator, AudioPlayerControls, FlightMap } from './components';
import { useLocationTracking } from './hooks';
import { narrationService } from './services';
import { isApiKeyConfigured } from './config';

export default function App() {
  const [narration, setNarration] = useState(
    "Enter your flight number and press 'Download Flight Pack' before takeoff, or press 'Scan Horizon' to identify your current location."
  );
  const [flightNumber, setFlightNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [flightPackReady, setFlightPackReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [checkpoints, setCheckpoints] = useState([]);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [flightRoute, setFlightRoute] = useState([]);

  // Handle checkpoint triggers from geofenced locations
  const handleCheckpointEntered = useCallback(async (checkpoint) => {
    setNarration(checkpoint.narration || `Approaching: ${checkpoint.name}`);

    // Play audio if available and enabled
    if (audioEnabled && checkpoint.audioPath) {
      await narrationService.playCheckpointAudio(checkpoint);
    }
  }, [audioEnabled]);

  const {
    location,
    isTracking,
    error,
    triggeredCheckpoints,
    getCurrentPosition,
    startTracking,
    stopTracking,
    resetTriggeredCheckpoints,
  } = useLocationTracking({
    distanceInterval: 1000, // Update every 1km
    onCheckpointEntered: handleCheckpointEntered,
    checkpoints,
  });

  const scanHorizon = async () => {
    setNarration("Scanning horizon...");
    setIsLoading(true);

    try {
      const loc = await getCurrentPosition();
      const { latitude, longitude, altitude } = loc.coords;

      // Use Claude API if configured, otherwise fall back to mock
      const narrationText = await narrationService.generateLiveNarration(
        latitude,
        longitude,
        altitude
      );

      setNarration(narrationText);

      // Generate and play audio if ElevenLabs is configured
      if (audioEnabled && narrationService.hasAudioSupport()) {
        setNarration(narrationText + "\n\nGenerating audio...");
        await narrationService.playCurrentNarration(narrationText);
      }
    } catch (err) {
      setNarration("Could not get location. Make sure GPS is enabled.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFlightPack = async () => {
    if (!flightNumber.trim()) {
      setNarration("Please enter a flight number first (e.g., BA115, UA100)");
      return;
    }

    const flightId = flightNumber.toUpperCase();
    setIsLoading(true);
    setDownloadProgress(null);
    setNarration(`Preparing flight pack for ${flightId}...`);

    try {
      // Check if we have a cached pack first
      let pack = await narrationService.loadFlightPack(flightId);

      if (!pack) {
        // Download new pack with progress updates
        pack = await narrationService.downloadFlightPack(flightId, (status) => {
          setNarration(`${flightId}: ${status}`);
        });
      }

      // Generate audio for checkpoints if ElevenLabs is configured
      if (narrationService.hasAudioSupport()) {
        setNarration(`Generating voice narrations for ${flightId}...`);

        pack = await narrationService.generateFlightPackAudio(pack, (completed, total) => {
          setDownloadProgress({ completed, total });
          setNarration(
            `Generating voice narrations...\n\nProgress: ${completed}/${total} checkpoints`
          );
        });
      }

      narrationService.setCurrentFlightPack(pack);
      setCheckpoints(pack.checkpoints || []);
      setFlightRoute(pack.route || []);
      resetTriggeredCheckpoints(); // Clear any previously triggered checkpoints
      setFlightPackReady(true);
      setDownloadProgress(null);

      // Build flight info summary
      const flightInfo = narrationService.getCurrentFlightInfo();
      const routeText = flightInfo?.origin?.name && flightInfo?.destination?.name
        ? `${flightInfo.origin.name} → ${flightInfo.destination.name}`
        : 'Route loaded';

      const durationText = flightInfo?.estimatedDuration
        ? `Est. duration: ${flightInfo.estimatedDuration}`
        : '';

      const hasAudio = pack.checkpoints.some(c => c.audioPath);
      const features = [];
      if (isApiKeyConfigured('claude')) features.push('AI narrations');
      if (hasAudio) features.push('Voice audio');
      if (isApiKeyConfigured('flightData')) features.push('Live route');

      const featureText = features.length > 0
        ? features.join(' • ')
        : 'Demo mode (add API keys for full features)';

      setNarration(
        `Flight pack ready!\n\n` +
        `${routeText}\n` +
        `${durationText ? durationText + '\n' : ''}` +
        `${pack.checkpoints.length} checkpoints\n\n` +
        `${featureText}\n\n` +
        `You can now enable Airplane Mode. GPS tracking will trigger narrations as you fly.`
      );
    } catch (err) {
      setNarration(`Failed to download flight pack: ${err.message}`);
      setDownloadProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTracking = async () => {
    if (isTracking) {
      stopTracking();
      setNarration("Live tracking paused. Press 'Start Tracking' to resume.");
    } else {
      try {
        await startTracking();
        setNarration("Live tracking enabled. Narrations will play automatically as you cross landmarks.");
      } catch (err) {
        setNarration("Could not start tracking. Check location permissions.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>WINDOW SEAT</Text>
        <Text style={styles.subtitle}>AI Flight Narrator</Text>
      </View>

      {/* Telemetry Bar */}
      <TelemetryDisplay location={location} style={styles.telemetry} />

      {/* Flight Number Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter Flight Number (e.g., BA284)"
          placeholderTextColor="#666"
          value={flightNumber}
          onChangeText={setFlightNumber}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.downloadBtn} onPress={downloadFlightPack}>
          <Text style={styles.downloadBtnText}>Download</Text>
        </TouchableOpacity>
      </View>

      {/* Map View */}
      {flightPackReady && (
        <FlightMap
          route={flightRoute}
          checkpoints={checkpoints}
          location={location}
          triggeredCheckpoints={triggeredCheckpoints}
          isExpanded={mapExpanded}
          onToggleExpand={() => setMapExpanded(!mapExpanded)}
        />
      )}

      {/* Narration Display */}
      <ScrollView
        style={[styles.narrationContainer, mapExpanded && styles.narrationCollapsed]}
        contentContainerStyle={styles.narrationContent}
      >
        {isLoading && (
          <ActivityIndicator size="large" color="#00d4ff" style={styles.loader} />
        )}
        <Text style={styles.narrationText}>
          {error || narration}
        </Text>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={toggleTracking}
        >
          <Text style={styles.buttonTextSecondary}>
            {isTracking ? "Stop Tracking" : "Start Tracking"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={scanHorizon}>
          <Text style={styles.buttonText}>Scan Horizon</Text>
        </TouchableOpacity>
      </View>

      {/* Audio Player Controls */}
      <AudioPlayerControls style={styles.audioControls} />

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <StatusIndicator
          isActive={isTracking}
          activeText="LIVE TRACKING"
          inactiveText="STANDBY"
        />
        <TouchableOpacity
          style={styles.audioToggle}
          onPress={() => setAudioEnabled(!audioEnabled)}
        >
          <Text style={styles.audioToggleText}>
            {audioEnabled ? '🔊' : '🔇'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    color: '#00d4ff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  subtitle: {
    color: '#ffffff',
    opacity: 0.6,
    fontSize: 14,
    marginTop: 4,
  },
  telemetry: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#ffffff',
    fontSize: 16,
  },
  downloadBtn: {
    backgroundColor: '#00d4ff',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  downloadBtnText: {
    color: '#0a1628',
    fontWeight: 'bold',
  },
  narrationContainer: {
    flex: 1,
    backgroundColor: '#0d1e33',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  narrationCollapsed: {
    maxHeight: 100,
    flex: 0,
  },
  narrationContent: {
    flexGrow: 1,
  },
  loader: {
    marginBottom: 15,
  },
  narrationText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 28,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 15,
  },
  button: {
    flex: 1,
    backgroundColor: '#00d4ff',
    padding: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#00d4ff',
  },
  buttonText: {
    color: '#0a1628',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonTextSecondary: {
    color: '#00d4ff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  audioControls: {
    marginTop: 15,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    gap: 20,
  },
  audioToggle: {
    padding: 8,
  },
  audioToggleText: {
    fontSize: 20,
  },
});

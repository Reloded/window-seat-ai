import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { TelemetryDisplay, StatusIndicator, AudioPlayerControls, NextCheckpointDisplay, FlightProgressBar, CheckpointList, WindowSideAdvisor, SunTrackerDisplay, BorderCrossingAlert, ErrorBanner, NarrationSkeleton, CheckpointListSkeleton, FlightSearch, RoutePreview, FlightMap, SettingsModal, FlightHistoryModal } from './components';
import { useLocationTracking, useSettingsSync, useTheme } from './hooks';
import { narrationService } from './services';
import { isApiKeyConfigured } from './config';
import { SettingsProvider, useSettings, FlightHistoryProvider, useFlightHistory } from './contexts';

function AppContent() {
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
  const [flightOrigin, setFlightOrigin] = useState(null);
  const [flightDestination, setFlightDestination] = useState(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Sync settings to services
  useSettingsSync();

  // Get theme colors
  const { colors, isDark } = useTheme();

  // Flight history
  const { addFlightToHistory } = useFlightHistory();

  // Get geofence radius from settings
  const { settings } = useSettings();

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
    clearError,
  } = useLocationTracking({
    distanceInterval: settings.gps.distanceInterval,
    onCheckpointEntered: handleCheckpointEntered,
    checkpoints,
  });

  const scanHorizon = async () => {
    setNarration("Scanning horizon...");
    setIsLoading(true);

    const loc = await getCurrentPosition();
    if (!loc) {
      // Error is shown via ErrorBanner
      setNarration("Unable to scan. Please check your location settings.");
      setIsLoading(false);
      return;
    }

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

    setIsLoading(false);
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
      let fromCache = false;

      if (pack) {
        fromCache = true;
        setNarration(`Loading cached flight pack for ${flightId}...`);
      } else {
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
      setFlightOrigin(pack.origin || null);
      setFlightDestination(pack.destination || null);
      resetTriggeredCheckpoints(); // Clear any previously triggered checkpoints
      setFlightPackReady(true);
      setDownloadProgress(null);

      // Build flight info summary
      const flightInfo = narrationService.getCurrentFlightInfo();

      // Add to flight history
      const hasAudio = pack.checkpoints.some(c => c.audioPath);
      addFlightToHistory({
        flightNumber: flightId,
        airline: flightInfo?.airline || null,
        origin: flightInfo?.origin || null,
        destination: flightInfo?.destination || null,
        checkpointCount: pack.checkpoints.length,
        hasAudio,
      });
      const routeText = flightInfo?.origin?.name && flightInfo?.destination?.name
        ? `${flightInfo.origin.name} → ${flightInfo.destination.name}`
        : 'Route loaded';

      const durationText = flightInfo?.estimatedDuration
        ? `Est. duration: ${flightInfo.estimatedDuration}`
        : '';

      const features = [];
      if (isApiKeyConfigured('claude')) features.push('AI narrations');
      if (hasAudio) features.push('Voice audio');
      if (isApiKeyConfigured('flightData')) features.push('Live route');

      const featureText = features.length > 0
        ? features.join(' • ')
        : 'Demo mode (add API keys for full features)';

      const cacheText = fromCache ? ' (cached)' : '';

      setNarration(
        `Flight pack ready!${cacheText}\n\n` +
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
      const result = await startTracking();
      if (result.success) {
        setNarration("Live tracking enabled. Narrations will play automatically as you cross landmarks.");
      }
      // Error is shown via ErrorBanner if tracking failed
    }
  };

  // Dynamic styles based on theme
  const themedStyles = {
    container: { ...styles.container, backgroundColor: colors.background },
    title: { ...styles.title, color: colors.primary },
    subtitle: { ...styles.subtitle, color: colors.textSecondary },
    headerButtonIcon: { ...styles.headerButtonIcon, color: colors.textSecondary },
    input: { ...styles.input, backgroundColor: colors.inputBackground, color: colors.text },
    browseBtn: { ...styles.browseBtn, backgroundColor: colors.buttonBackground },
    browseBtnText: { ...styles.browseBtnText, color: colors.primary },
    previewBtn: { ...styles.previewBtn, backgroundColor: colors.buttonBackground },
    previewBtnText: { ...styles.previewBtnText, color: colors.primary },
    downloadBtn: { ...styles.downloadBtn, backgroundColor: colors.primary },
    downloadBtnText: { ...styles.downloadBtnText, color: colors.primaryDark },
    narrationContainer: { ...styles.narrationContainer, backgroundColor: colors.backgroundSecondary },
    narrationText: { ...styles.narrationText, color: colors.text },
    button: { ...styles.button, backgroundColor: colors.primary },
    buttonText: { ...styles.buttonText, color: colors.primaryDark },
    buttonSecondary: { ...styles.buttonSecondary, backgroundColor: 'transparent', borderColor: colors.primary },
    buttonTextSecondary: { ...styles.buttonTextSecondary, color: colors.primary },
  };

  return (
    <SafeAreaView style={themedStyles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header} accessibilityRole="header">
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setHistoryVisible(true)}
          accessibilityLabel="Flight history"
          accessibilityHint="Opens your flight history and favorites"
          accessibilityRole="button"
        >
          <Text style={themedStyles.headerButtonIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={themedStyles.title} accessibilityRole="header">WINDOW SEAT</Text>
          <Text style={themedStyles.subtitle}>AI Flight Narrator</Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setSettingsVisible(true)}
          accessibilityLabel="Settings"
          accessibilityHint="Opens app settings"
          accessibilityRole="button"
        >
          <Text style={themedStyles.headerButtonIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Telemetry Bar */}
        <TelemetryDisplay location={location} style={styles.telemetry} />

        {/* Error Banner */}
        {error && (
          <ErrorBanner
            message={error}
            type="warning"
            onDismiss={clearError}
            style={styles.errorBanner}
          />
        )}

        {/* Sun Tracker */}
        {location && (
          <SunTrackerDisplay
            location={location}
            route={flightRoute}
            style={styles.sunTracker}
          />
        )}

        {/* Border Crossing Alert */}
        <BorderCrossingAlert
          location={location}
          isTracking={isTracking}
          style={styles.borderCrossing}
        />

        {/* Next Checkpoint Display */}
        {flightPackReady && checkpoints.length > 0 && (
          <NextCheckpointDisplay
            location={location}
            checkpoints={checkpoints}
            triggeredCheckpoints={triggeredCheckpoints}
            style={styles.nextCheckpoint}
          />
        )}

        {/* Flight Number Input */}
        <View style={styles.inputSection}>
          <View style={styles.inputContainer} accessibilityRole="search">
            <TextInput
              style={themedStyles.input}
              placeholder="Enter Flight Number (e.g., BA284)"
              placeholderTextColor={colors.textMuted}
              value={flightNumber}
              onChangeText={(text) => {
                setFlightNumber(text);
                if (searchVisible) setSearchVisible(false);
              }}
              autoCapitalize="characters"
              accessibilityLabel="Flight number"
              accessibilityHint="Enter your flight number to download narration pack"
            />
            <TouchableOpacity
              style={themedStyles.browseBtn}
              onPress={() => setSearchVisible(!searchVisible)}
              accessibilityLabel={searchVisible ? "Hide flight browser" : "Browse flights"}
              accessibilityHint="Shows demo flights and popular routes"
              accessibilityRole="button"
              accessibilityState={{ expanded: searchVisible }}
            >
              <Text style={themedStyles.browseBtnText}>{searchVisible ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={themedStyles.previewBtn}
              onPress={() => flightNumber.trim() && setPreviewVisible(true)}
              accessibilityLabel="Preview route"
              accessibilityHint={flightNumber ? `Preview route for flight ${flightNumber}` : "Enter a flight number first"}
              accessibilityRole="button"
              accessibilityState={{ disabled: !flightNumber.trim() }}
            >
              <Text style={themedStyles.previewBtnText}>Preview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={themedStyles.downloadBtn}
              onPress={downloadFlightPack}
              accessibilityLabel="Download flight pack"
              accessibilityHint={flightNumber ? `Downloads narration pack for flight ${flightNumber}` : "Enter a flight number first"}
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading }}
            >
              <Text style={themedStyles.downloadBtnText}>Download</Text>
            </TouchableOpacity>
          </View>

          {/* Flight Search Browser */}
          {searchVisible && (
            <View style={styles.searchContainer}>
              <FlightSearch
                onSelectFlight={(flight) => {
                  setFlightNumber(flight);
                  setSearchVisible(false);
                  // Add to recent searches
                  setRecentSearches(prev => {
                    const filtered = prev.filter(s => s !== flight);
                    return [flight, ...filtered].slice(0, 5);
                  });
                }}
                recentSearches={recentSearches}
              />
            </View>
          )}
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

        {/* Flight Progress Bar */}
        {flightPackReady && flightRoute.length > 0 && (
          <FlightProgressBar
            location={location}
            route={flightRoute}
            origin={flightOrigin}
            destination={flightDestination}
            style={styles.progressBar}
          />
        )}

        {/* Checkpoint List */}
        {flightPackReady && checkpoints.length > 0 ? (
          <CheckpointList
            checkpoints={checkpoints}
            triggeredCheckpoints={triggeredCheckpoints}
            location={location}
            style={styles.checkpointList}
          />
        ) : isLoading && flightNumber.trim() ? (
          <View style={styles.checkpointListSkeleton}>
            <CheckpointListSkeleton count={4} />
          </View>
        ) : null}

        {/* Window Side Advisor */}
        {flightPackReady && flightRoute.length > 1 && checkpoints.length > 0 && (
          <WindowSideAdvisor
            route={flightRoute}
            checkpoints={checkpoints}
            style={styles.windowSideAdvisor}
          />
        )}

        {/* Narration Display */}
        <View
          style={[themedStyles.narrationContainer, mapExpanded && styles.narrationCollapsed]}
          accessibilityRole="text"
          accessibilityLabel={isLoading ? "Loading narration" : "Flight narration"}
          accessibilityLiveRegion="polite"
        >
          {isLoading ? (
            <NarrationSkeleton />
          ) : (
            <Text style={themedStyles.narrationText} accessibilityRole="text">
              {narration}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow} accessibilityRole="toolbar">
          <TouchableOpacity
            style={[themedStyles.button, themedStyles.buttonSecondary]}
            onPress={toggleTracking}
            accessibilityLabel={isTracking ? "Stop tracking" : "Start tracking"}
            accessibilityHint={isTracking ? "Stops GPS location tracking" : "Starts GPS tracking to trigger narrations automatically"}
            accessibilityRole="button"
            accessibilityState={{ checked: isTracking }}
          >
            <Text style={themedStyles.buttonTextSecondary}>
              {isTracking ? "Stop Tracking" : "Start Tracking"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={themedStyles.button}
            onPress={scanHorizon}
            accessibilityLabel="Scan horizon"
            accessibilityHint="Gets your current location and generates a narration"
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoading }}
          >
            <Text style={themedStyles.buttonText}>Scan Horizon</Text>
          </TouchableOpacity>
        </View>

        {/* Audio Player Controls */}
        <AudioPlayerControls style={styles.audioControls} />

        {/* Status Bar */}
        <View style={styles.statusBar} accessibilityRole="toolbar">
          <StatusIndicator
            isActive={isTracking}
            activeText="LIVE TRACKING"
            inactiveText="STANDBY"
          />
          <TouchableOpacity
            style={styles.audioToggle}
            onPress={() => setAudioEnabled(!audioEnabled)}
            accessibilityLabel={audioEnabled ? "Mute audio" : "Unmute audio"}
            accessibilityHint={audioEnabled ? "Disables voice narrations" : "Enables voice narrations"}
            accessibilityRole="switch"
            accessibilityState={{ checked: audioEnabled }}
          >
            <Text style={styles.audioToggleText} accessibilityElementsHidden>
              {audioEnabled ? '🔊' : '🔇'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      {/* Flight History Modal */}
      <FlightHistoryModal
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        onSelectFlight={(flight) => {
          setFlightNumber(flight.flightNumber);
          setHistoryVisible(false);
          // Trigger download after modal closes
          setTimeout(() => {
            downloadFlightPack();
          }, 100);
        }}
      />

      {/* Route Preview Modal */}
      <RoutePreview
        flightNumber={flightNumber.toUpperCase()}
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        onDownload={downloadFlightPack}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <FlightHistoryProvider>
          <AppContent />
        </FlightHistoryProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonIcon: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.7)',
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
    marginBottom: 10,
  },
  errorBanner: {
    marginBottom: 10,
  },
  sunTracker: {
    marginBottom: 10,
  },
  borderCrossing: {
    marginBottom: 10,
  },
  nextCheckpoint: {
    marginBottom: 10,
  },
  progressBar: {
    marginBottom: 10,
  },
  checkpointList: {
    marginBottom: 10,
  },
  checkpointListSkeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  windowSideAdvisor: {
    marginBottom: 10,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#ffffff',
    fontSize: 16,
    marginRight: 8,
  },
  browseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    marginRight: 8,
  },
  browseBtnText: {
    color: '#00d4ff',
    fontSize: 14,
  },
  previewBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    marginRight: 8,
  },
  previewBtnText: {
    color: '#00d4ff',
    fontWeight: '600',
    fontSize: 13,
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
  searchContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    maxHeight: 350,
  },
  narrationContainer: {
    backgroundColor: '#0d1e33',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    minHeight: 120,
  },
  narrationCollapsed: {
    maxHeight: 100,
  },
  narrationText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 28,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  button: {
    flex: 1,
    backgroundColor: '#00d4ff',
    padding: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginHorizontal: 5,
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
  },
  audioToggle: {
    padding: 8,
    marginLeft: 20,
  },
  audioToggleText: {
    fontSize: 20,
  },
});

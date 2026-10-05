import React, { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, BackHandler, Alert, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ErrorBoundary, OnboardingWalkthrough, PlanScreen, FlightScreen, SettingsModal } from './components';
import { useTheme } from './hooks/useTheme';
import { useFlightSession } from './hooks/useFlightSession';
import { buildFlightPack } from './services/FlightPlanner';
import { SettingsProvider, useSettings, FlightHistoryProvider, useFlightHistory } from './contexts';

function AppContent() {
  const { colors, isDark } = useTheme();
  const { settings, updateVoiceSettings } = useSettings();
  const { history, addFlightToHistory, removeFromHistory } = useFlightHistory();
  const [pack, setPack] = useState(null);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const session = useFlightSession(pack, {
    voiceEnabled: settings.voice.enabled,
    keepAwake: settings.flight.keepAwake,
    speechRate: settings.voice.rate,
  });

  const handlePrepare = useCallback(({ origin, destination, flightNumber, airline }) => {
    try {
      const built = buildFlightPack({ origin, destination, flightNumber, airline });
      setPack(built);
      addFlightToHistory({
        flightNumber: flightNumber || `${origin.code}-${destination.code}`,
        airline,
        origin,
        destination,
        checkpointCount: built.checkpoints.length,
        hasAudio: false,
      });
    } catch (error) {
      Alert.alert('Could not prepare this flight', error?.message || 'Please check your airports and try again.');
    }
  }, [addFlightToHistory]);

  const leaveFlight = useCallback(() => {
    session.stop();
    setPack(null);
  }, [session]);

  const handleChangeFlight = useCallback(() => {
    if (session.status === 'running') {
      Alert.alert('Stop this flight?', 'Narration will stop and you will go back to choosing a flight.', [
        { text: 'Keep flying', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: leaveFlight },
      ]);
    } else {
      leaveFlight();
    }
  }, [session.status, leaveFlight]);

  // Android back button: leave the flight screen instead of closing the app.
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (settingsVisible) return false; // the modal handles it
      if (pack) {
        handleChangeFlight();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [pack, settingsVisible, handleChangeFlight]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header} accessibilityRole="header">
        <View style={styles.headerSide} />
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.primary }]}>WINDOW SEAT</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your flight companion</Text>
        </View>
        <TouchableOpacity
          style={styles.headerSide}
          onPress={() => setSettingsVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Text style={[styles.gear, { color: colors.textSecondary }]}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ErrorBoundary>
        {pack ? (
          <FlightScreen
            pack={pack}
            session={session}
            voiceEnabled={settings.voice.enabled}
            onToggleVoice={() => updateVoiceSettings({ enabled: !settings.voice.enabled })}
            onChangeFlight={handleChangeFlight}
          />
        ) : (
          <PlanScreen onPrepare={handlePrepare} recent={history} onRemoveRecent={removeFromHistory} />
        )}
      </ErrorBoundary>

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </SafeAreaView>
  );
}

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_complete')
      .then(value => setShowOnboarding(value !== 'true'))
      .catch(() => setShowOnboarding(false));
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem('onboarding_complete', 'true');
    } catch (e) {
      // ignore
    }
    setShowOnboarding(false);
  }, []);

  if (showOnboarding === null) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <SettingsProvider>
          <FlightHistoryProvider>
            {showOnboarding ? (
              <OnboardingWalkthrough onComplete={handleOnboardingComplete} />
            ) : (
              <AppContent />
            )}
          </FlightHistoryProvider>
        </SettingsProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerSide: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerContent: { flex: 1, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: 4 },
  subtitle: { fontSize: 13, marginTop: 2 },
  gear: { fontSize: 26 },
});

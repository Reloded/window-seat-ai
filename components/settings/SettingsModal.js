import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import { useSettings } from '../../contexts';
import { useFlightHistory } from '../../contexts';
import { useTheme } from '../../hooks/useTheme';
import { freeTTSService } from '../../services/FreeTTSService';

const PRIVACY_URL = 'https://reloded.github.io/window-seat-ai/privacy-policy.html';
const TERMS_URL = 'https://reloded.github.io/window-seat-ai/terms-of-service.html';

const THEMES = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'Auto' },
];

export function SettingsModal({ visible, onClose }) {
  const { colors, isDark } = useTheme();
  const { settings, updateVoiceSettings, updateDisplaySettings, updateFlightSettings } = useSettings();
  const { clearHistory, history } = useFlightHistory();
  const cardBg = isDark ? 'rgba(255,255,255,0.07)' : '#ffffff';
  const version = Constants?.expoConfig?.version || '';

  const testVoice = async () => {
    const ok = await freeTTSService.speak(
      'This is how Window Seat will sound. Look out the left-hand window: the Alps stretch across the horizon.',
      { rate: settings.voice.rate, language: 'en-US' }
    );
    if (ok === false && !freeTTSService.isConfigured()) {
      Alert.alert('No voice available', 'This device has no text-to-speech engine installed. Install one in your phone settings (Text-to-speech output).');
    }
  };

  const confirmClear = () => {
    Alert.alert('Clear recent flights?', 'This only removes the list of recent routes on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearHistory() },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.done} accessibilityRole="button" accessibilityLabel="Close settings">
            <Text style={[styles.doneText, { color: colors.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.section, { color: colors.textSecondary }]}>APPEARANCE</Text>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
            <View style={styles.segment}>
              {THEMES.map(t => {
                const selected = (settings.display.theme || 'dark') === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.segmentItem,
                      { borderColor: colors.border },
                      selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => updateDisplaySettings({ theme: t.value })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${t.label} theme`}
                  >
                    <Text style={[styles.segmentText, { color: selected ? colors.onPrimary : colors.text }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={[styles.section, { color: colors.textSecondary }]}>VOICE</Text>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
            <Row
              label="Speak narrations aloud"
              description="Uses your phone's built-in voice. Works offline."
              colors={colors}
            >
              <Switch
                value={settings.voice.enabled}
                onValueChange={(enabled) => updateVoiceSettings({ enabled })}
                trackColor={{ false: 'rgba(128,128,128,0.4)', true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
                accessibilityLabel="Speak narrations aloud"
              />
            </Row>
            <View style={[styles.rowBlock, { borderTopColor: colors.border }]}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.label, { color: colors.text }]}>Speaking speed</Text>
                <Text style={[styles.value, { color: colors.primary }]}>{Math.round(settings.voice.rate * 100)}%</Text>
              </View>
              <Slider
                style={styles.slider}
                value={settings.voice.rate}
                onSlidingComplete={(rate) => updateVoiceSettings({ rate: Math.round(rate * 20) / 20 })}
                minimumValue={0.6}
                maximumValue={1.4}
                step={0.05}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(10,22,40,0.2)'}
                thumbTintColor={colors.primary}
                accessibilityLabel="Speaking speed"
              />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.buttonBackground, borderColor: colors.border }]}
                onPress={testVoice}
                accessibilityRole="button"
                accessibilityLabel="Test the voice"
              >
                <Text style={[styles.buttonText, { color: colors.primary }]}>▶ Test voice</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.section, { color: colors.textSecondary }]}>DURING A FLIGHT</Text>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
            <Row
              label="Keep the screen on"
              description="Stops the phone from sleeping while a flight is running, so narration and tracking are not interrupted."
              colors={colors}
            >
              <Switch
                value={settings.flight.keepAwake}
                onValueChange={(keepAwake) => updateFlightSettings({ keepAwake })}
                trackColor={{ false: 'rgba(128,128,128,0.4)', true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
                accessibilityLabel="Keep the screen on during a flight"
              />
            </Row>
          </View>

          <Text style={[styles.section, { color: colors.textSecondary }]}>YOUR DATA</Text>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Window Seat has no account and no ads. Your location is used only on this phone to work out what you are flying over, and is never sent anywhere.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.buttonBackground, borderColor: colors.border, opacity: history.length ? 1 : 0.5 }]}
              onPress={confirmClear}
              disabled={!history.length}
              accessibilityRole="button"
              accessibilityLabel="Clear recent flights"
            >
              <Text style={[styles.buttonText, { color: colors.error }]}>Clear recent flights</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.section, { color: colors.textSecondary }]}>ABOUT</Text>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link" accessibilityLabel="Privacy policy">
              <Text style={[styles.linkText, { color: colors.primary }]}>Privacy policy</Text>
            </TouchableOpacity>
            <View style={[styles.hr, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.link} onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link" accessibilityLabel="Terms of service">
              <Text style={[styles.linkText, { color: colors.primary }]}>Terms of service</Text>
            </TouchableOpacity>
            <View style={[styles.hr, { backgroundColor: colors.border }]} />
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Window Seat {version}. Sights are chosen from a built-in atlas of about 480 places. Optional flight-number lookup uses the free adsbdb.com route database.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Row({ label, description, children, colors }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {!!description && <Text style={[styles.desc, { color: colors.textSecondary }]}>{description}</Text>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontWeight: '800' },
  done: { minHeight: 44, minWidth: 64, justifyContent: 'center', alignItems: 'flex-end' },
  doneText: { fontSize: 17, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 48 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginTop: 20, marginBottom: 8 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  segment: { flexDirection: 'row' },
  segmentItem: { flex: 1, borderWidth: 1, paddingVertical: 12, alignItems: 'center', marginRight: 8, borderRadius: 12, minHeight: 48, justifyContent: 'center' },
  segmentText: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowText: { flex: 1, paddingRight: 12 },
  rowBlock: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 14 },
  label: { fontSize: 16, fontWeight: '600' },
  desc: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  value: { fontSize: 14, fontWeight: '700' },
  slider: { width: '100%', height: 40 },
  button: { borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center', marginTop: 10, minHeight: 48, justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 21 },
  link: { minHeight: 48, justifyContent: 'center' },
  linkText: { fontSize: 16, fontWeight: '600' },
  hr: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
});

export default SettingsModal;

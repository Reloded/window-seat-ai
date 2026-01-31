import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VoiceAudioSection } from './sections/VoiceAudioSection';
import { NarrationSection } from './sections/NarrationSection';
import { GPSSection } from './sections/GPSSection';
import { DisplaySection } from './sections/DisplaySection';
import { StorageSection } from './sections/StorageSection';
import { APISection } from './sections/APISection';
import { SettingsSection } from './SettingsSection';
import { SettingsButton } from './SettingsButton';
import { DebugLogsModal } from './DebugLogsModal';

export function SettingsModal({ visible, onClose }) {
  const [debugLogsVisible, setDebugLogsVisible] = useState(false);
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
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <DisplaySection />
          <VoiceAudioSection />
          <NarrationSection />
          <GPSSection />
          <StorageSection />
          <APISection />

          {/* Debug Section */}
          <SettingsSection title="Developer">
            <View style={styles.debugButtonContainer}>
              <SettingsButton
                label="View Debug Logs"
                onPress={() => setDebugLogsVisible(true)}
              />
            </View>
          </SettingsSection>

          {/* Bottom padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Debug Logs Modal */}
        <DebugLogsModal
          visible={debugLogsVisible}
          onClose={() => setDebugLogsVisible(false)}
        />
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
  },
  contentContainer: {
    padding: 20,
  },
  bottomPadding: {
    height: 40,
  },
  debugButtonContainer: {
    padding: 16,
  },
});

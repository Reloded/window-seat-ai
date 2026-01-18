import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSettings } from '../../../contexts';
import { SettingsSection } from '../SettingsSection';
import { SettingsInput } from '../SettingsInput';

export function APISection() {
  const { settings, updateApiSettings } = useSettings();
  const { api } = settings;

  return (
    <SettingsSection title="API Keys (Optional)">
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          The app works without API keys using demo data. Add keys for full functionality.
        </Text>
      </View>
      <SettingsInput
        label="Claude API Key"
        description="For AI-generated narrations"
        value={api.claudeApiKey}
        onValueChange={(claudeApiKey) => updateApiSettings({ claudeApiKey })}
        placeholder="sk-ant-..."
      />
      <SettingsInput
        label="ElevenLabs API Key"
        description="For voice synthesis"
        value={api.elevenLabsApiKey}
        onValueChange={(elevenLabsApiKey) => updateApiSettings({ elevenLabsApiKey })}
        placeholder="Enter your API key"
      />
      <SettingsInput
        label="FlightAware API Key"
        description="For real flight routes"
        value={api.flightApiKey}
        onValueChange={(flightApiKey) => updateApiSettings({ flightApiKey })}
        placeholder="Enter your API key"
        isLast
      />
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  infoContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    lineHeight: 18,
  },
});

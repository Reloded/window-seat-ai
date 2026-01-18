import React from 'react';
import { useSettings } from '../../../contexts';
import { SettingsSection } from '../SettingsSection';
import { SettingsSlider } from '../SettingsSlider';
import { SettingsToggle } from '../SettingsToggle';
import { SettingsPicker } from '../SettingsPicker';

const VOICE_OPTIONS = [
  { value: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah (Default)' },
  { value: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel' },
  { value: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi' },
  { value: 'ErXwobaYiN019PkySvjV', label: 'Antoni' },
  { value: 'MF3mGyEYCl7XYWbV9V6O', label: 'Elli' },
  { value: 'TxGEqnHWrfWFTfGW9XjX', label: 'Josh' },
  { value: 'VR6AewLTigWG4xSOukaG', label: 'Arnold' },
  { value: 'pNInz6obpgDQGcFmaJgB', label: 'Adam' },
  { value: 'yoZ06aMxZJJ28mfd3POQ', label: 'Sam' },
];

export function VoiceAudioSection() {
  const { settings, updateVoiceSettings } = useSettings();
  const { voice } = settings;

  return (
    <SettingsSection title="Voice & Audio">
      <SettingsPicker
        label="Voice"
        value={voice.voiceId}
        onValueChange={(voiceId) => updateVoiceSettings({ voiceId })}
        options={VOICE_OPTIONS}
      />
      <SettingsSlider
        label="Stability"
        value={voice.stability}
        onValueChange={(stability) => updateVoiceSettings({ stability })}
        minimumValue={0}
        maximumValue={1}
        step={0.05}
        formatValue={(v) => `${Math.round(v * 100)}%`}
      />
      <SettingsSlider
        label="Similarity Boost"
        value={voice.similarityBoost}
        onValueChange={(similarityBoost) => updateVoiceSettings({ similarityBoost })}
        minimumValue={0}
        maximumValue={1}
        step={0.05}
        formatValue={(v) => `${Math.round(v * 100)}%`}
      />
      <SettingsToggle
        label="Speaker Boost"
        description="Enhances voice clarity"
        value={voice.useSpeakerBoost}
        onValueChange={(useSpeakerBoost) => updateVoiceSettings({ useSpeakerBoost })}
      />
      <SettingsSlider
        label="Volume"
        value={voice.volume}
        onValueChange={(volume) => updateVoiceSettings({ volume })}
        minimumValue={0}
        maximumValue={1}
        step={0.05}
        formatValue={(v) => `${Math.round(v * 100)}%`}
        isLast
      />
    </SettingsSection>
  );
}

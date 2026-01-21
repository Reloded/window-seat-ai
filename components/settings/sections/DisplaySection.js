import React from 'react';
import { useSettings } from '../../../contexts';
import { SettingsSection } from '../SettingsSection';
import { SettingsPicker } from '../SettingsPicker';

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System Default' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish (Espanol)' },
  { value: 'fr', label: 'French (Francais)' },
  { value: 'de', label: 'German (Deutsch)' },
  { value: 'it', label: 'Italian (Italiano)' },
  { value: 'pt', label: 'Portuguese (Portugues)' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese (Simplified)' },
  { value: 'ko', label: 'Korean' },
];

export function DisplaySection() {
  const { settings, updateDisplaySettings } = useSettings();
  const { display } = settings;

  return (
    <SettingsSection title="Display & Language">
      <SettingsPicker
        label="Theme"
        value={display?.theme || 'dark'}
        onValueChange={(theme) => updateDisplaySettings({ theme })}
        options={THEME_OPTIONS}
      />
      <SettingsPicker
        label="Narration Language"
        value={display?.language || 'en'}
        onValueChange={(language) => updateDisplaySettings({ language })}
        options={LANGUAGE_OPTIONS}
        isLast
      />
    </SettingsSection>
  );
}

import React from 'react';
import { Switch, Platform } from 'react-native';
import { SettingsRow } from './SettingsRow';

export function SettingsToggle({ label, description, value, onValueChange, isLast }) {
  return (
    <SettingsRow label={label} description={description} isLast={isLast}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: 'rgba(255, 255, 255, 0.2)',
          true: '#00d4ff'
        }}
        thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
        ios_backgroundColor="rgba(255, 255, 255, 0.2)"
      />
    </SettingsRow>
  );
}

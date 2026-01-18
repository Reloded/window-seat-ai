import React from 'react';
import { useSettings } from '../../../contexts';
import { SettingsSection } from '../SettingsSection';
import { SettingsSlider } from '../SettingsSlider';
import { SettingsPicker } from '../SettingsPicker';

const ACCURACY_OPTIONS = [
  { value: 'high', label: 'High (Best accuracy)' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'low', label: 'Low (Battery saver)' },
];

export function GPSSection() {
  const { settings, updateGpsSettings } = useSettings();
  const { gps } = settings;

  return (
    <SettingsSection title="GPS & Tracking">
      <SettingsPicker
        label="Accuracy"
        value={gps.accuracy}
        onValueChange={(accuracy) => updateGpsSettings({ accuracy })}
        options={ACCURACY_OPTIONS}
      />
      <SettingsSlider
        label="Distance Interval"
        value={gps.distanceInterval}
        onValueChange={(distanceInterval) =>
          updateGpsSettings({ distanceInterval: Math.round(distanceInterval) })
        }
        minimumValue={100}
        maximumValue={5000}
        step={100}
        formatValue={(v) => `${(v / 1000).toFixed(1)} km`}
      />
      <SettingsSlider
        label="Time Interval"
        value={gps.timeInterval}
        onValueChange={(timeInterval) =>
          updateGpsSettings({ timeInterval: Math.round(timeInterval) })
        }
        minimumValue={1000}
        maximumValue={30000}
        step={1000}
        formatValue={(v) => `${(v / 1000).toFixed(0)} sec`}
        isLast
      />
    </SettingsSection>
  );
}

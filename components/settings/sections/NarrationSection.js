import React from 'react';
import { useSettings } from '../../../contexts';
import { SettingsSection } from '../SettingsSection';
import { SettingsSlider } from '../SettingsSlider';
import { SettingsPicker } from '../SettingsPicker';

const CONTENT_FOCUS_OPTIONS = [
  { value: 'mixed', label: 'Mixed (Recommended)' },
  { value: 'geological', label: 'Geological' },
  { value: 'historical', label: 'Historical' },
  { value: 'cultural', label: 'Cultural' },
];

const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short (~10 sec)' },
  { value: 'medium', label: 'Medium (~20 sec)' },
  { value: 'long', label: 'Long (~30 sec)' },
];

export function NarrationSection() {
  const { settings, updateNarrationSettings } = useSettings();
  const { narration } = settings;

  return (
    <SettingsSection title="Narration">
      <SettingsPicker
        label="Content Focus"
        value={narration.contentFocus}
        onValueChange={(contentFocus) => updateNarrationSettings({ contentFocus })}
        options={CONTENT_FOCUS_OPTIONS}
      />
      <SettingsPicker
        label="Narration Length"
        value={narration.length}
        onValueChange={(length) => updateNarrationSettings({ length })}
        options={LENGTH_OPTIONS}
      />
      <SettingsSlider
        label="Checkpoints per Flight"
        value={narration.checkpointsPerFlight}
        onValueChange={(checkpointsPerFlight) =>
          updateNarrationSettings({ checkpointsPerFlight: Math.round(checkpointsPerFlight) })
        }
        minimumValue={5}
        maximumValue={50}
        step={1}
        formatValue={(v) => `${Math.round(v)}`}
      />
      <SettingsSlider
        label="Geofence Radius"
        value={narration.geofenceRadius}
        onValueChange={(geofenceRadius) =>
          updateNarrationSettings({ geofenceRadius: Math.round(geofenceRadius) })
        }
        minimumValue={5000}
        maximumValue={50000}
        step={1000}
        formatValue={(v) => `${(v / 1000).toFixed(0)} km`}
        isLast
      />
    </SettingsSection>
  );
}

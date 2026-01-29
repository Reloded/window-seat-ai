import { useEffect } from 'react';
import { useSettings } from '../contexts';
import {
  elevenLabsService,
  audioService,
  locationService,
  claudeService,
} from '../services';

/**
 * Hook that syncs settings from context to services whenever they change.
 * Should be called once at the app root level.
 */
export function useSettingsSync() {
  const { settings, isLoaded } = useSettings();

  // Sync voice settings to ElevenLabs service
  useEffect(() => {
    if (!isLoaded) return;

    elevenLabsService.updateVoiceSettings({
      voiceId: settings.voice.voiceId,
      stability: settings.voice.stability,
      similarityBoost: settings.voice.similarityBoost,
      useSpeakerBoost: settings.voice.useSpeakerBoost,
    });
  }, [isLoaded, settings.voice]);

  // Sync volume to audio service
  useEffect(() => {
    if (!isLoaded) return;

    audioService.setDefaultVolume(settings.voice.volume);
  }, [isLoaded, settings.voice.volume]);

  // Sync GPS settings to location service
  useEffect(() => {
    if (!isLoaded) return;

    locationService.updateTrackingOptions({
      accuracy: settings.gps.accuracy,
      distanceInterval: settings.gps.distanceInterval,
      timeInterval: settings.gps.timeInterval,
    });
  }, [isLoaded, settings.gps]);

  // Sync narration preferences to Claude service
  useEffect(() => {
    if (!isLoaded) return;

    claudeService.updateNarrationPreferences({
      contentFocus: settings.narration.contentFocus,
      length: settings.narration.length,
    });
  }, [isLoaded, settings.narration.contentFocus, settings.narration.length]);

  // Sync language to Claude service
  useEffect(() => {
    if (!isLoaded) return;

    claudeService.updateNarrationPreferences({
      language: settings.display?.language || 'en',
    });
  }, [isLoaded, settings.display?.language]);

  // Sync API keys to services
  useEffect(() => {
    if (!isLoaded) return;

    if (settings.api?.claudeApiKey) {
      claudeService.updateApiKey(settings.api.claudeApiKey);
    }
    if (settings.api?.elevenLabsApiKey) {
      elevenLabsService.updateApiKey(settings.api.elevenLabsApiKey);
    }
  }, [isLoaded, settings.api?.claudeApiKey, settings.api?.elevenLabsApiKey]);
}

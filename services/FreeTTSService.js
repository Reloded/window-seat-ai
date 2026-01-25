import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/**
 * Free TTS Service using device's built-in text-to-speech
 * No API key required - works offline!
 */
class FreeTTSService {
  constructor() {
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.voiceSettings = {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9, // Slightly slower for narration
      voice: null, // Will use default voice
    };
    this.listeners = [];
  }

  /**
   * Check if TTS is available on this device
   */
  async isAvailable() {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices && voices.length > 0;
    } catch (error) {
      console.warn('TTS availability check failed:', error);
      return false;
    }
  }

  /**
   * Always returns true - device TTS is free!
   */
  isConfigured() {
    return true;
  }

  /**
   * Get available voices on this device
   */
  async getVoices() {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      // Filter to English voices and sort by quality
      return voices
        .filter(v => v.language.startsWith('en'))
        .sort((a, b) => {
          // Prefer higher quality voices
          if (a.quality !== b.quality) {
            return (b.quality || 0) - (a.quality || 0);
          }
          return a.name.localeCompare(b.name);
        });
    } catch (error) {
      console.error('Failed to get voices:', error);
      return [];
    }
  }

  /**
   * Update voice settings
   */
  updateVoiceSettings(settings) {
    this.voiceSettings = {
      ...this.voiceSettings,
      ...settings,
    };
  }

  /**
   * Get current voice settings
   */
  getVoiceSettings() {
    return { ...this.voiceSettings };
  }

  /**
   * Speak text using device TTS
   */
  async speak(text, options = {}) {
    if (!text || text.trim().length === 0) {
      return false;
    }

    // Stop any current speech
    await this.stop();

    const mergedOptions = {
      ...this.voiceSettings,
      ...options,
    };

    return new Promise((resolve) => {
      this.isSpeaking = true;
      this.notifyListeners('started');

      Speech.speak(text, {
        language: mergedOptions.language,
        pitch: mergedOptions.pitch,
        rate: mergedOptions.rate,
        voice: mergedOptions.voice,
        onStart: () => {
          this.isSpeaking = true;
          this.notifyListeners('started');
        },
        onDone: () => {
          this.isSpeaking = false;
          this.notifyListeners('finished');
          resolve(true);
        },
        onError: (error) => {
          console.error('TTS error:', error);
          this.isSpeaking = false;
          this.notifyListeners('error');
          resolve(false);
        },
        onStopped: () => {
          this.isSpeaking = false;
          this.notifyListeners('stopped');
          resolve(false);
        },
      });
    });
  }

  /**
   * Stop current speech
   */
  async stop() {
    if (this.isSpeaking) {
      await Speech.stop();
      this.isSpeaking = false;
      this.notifyListeners('stopped');
    }
  }

  /**
   * Pause speech (note: not supported on all platforms)
   */
  async pause() {
    if (Platform.OS === 'ios') {
      await Speech.pause();
      this.notifyListeners('paused');
    } else {
      // Android doesn't support pause, so stop instead
      await this.stop();
    }
  }

  /**
   * Resume speech (note: not supported on all platforms)
   */
  async resume() {
    if (Platform.OS === 'ios') {
      await Speech.resume();
      this.notifyListeners('resumed');
    }
  }

  /**
   * Check if currently speaking
   */
  async isSpeakingAsync() {
    return await Speech.isSpeakingAsync();
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isSpeaking: this.isSpeaking,
      isConfigured: true,
      provider: 'device',
    };
  }

  /**
   * Subscribe to TTS events
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners of an event
   */
  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('TTS listener error:', error);
      }
    });
  }

  /**
   * Speak a checkpoint narration
   */
  async speakCheckpoint(checkpoint) {
    if (!checkpoint?.narration) {
      return false;
    }

    // Add a brief intro for context
    const intro = checkpoint.name ? `Now approaching: ${checkpoint.name}. ` : '';
    const text = intro + checkpoint.narration;

    return await this.speak(text);
  }

  /**
   * Generate speech for a flight pack (queues all narrations)
   * Note: Unlike ElevenLabs, this doesn't pre-generate audio files
   * It just marks checkpoints as ready for TTS playback
   */
  async prepareFlightPackAudio(checkpoints, onProgress) {
    // With device TTS, we don't need to pre-generate anything
    // Just validate that narrations exist
    let prepared = 0;
    const results = [];

    for (const checkpoint of checkpoints) {
      if (checkpoint.narration) {
        results.push({
          checkpointId: checkpoint.id,
          ready: true,
          provider: 'device-tts',
        });
        prepared++;
      }

      if (onProgress) {
        onProgress(prepared, checkpoints.length);
      }
    }

    return results;
  }
}

export const freeTTSService = new FreeTTSService();
export { FreeTTSService };

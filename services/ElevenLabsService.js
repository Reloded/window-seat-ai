import { Platform } from 'react-native';
import { File, Directory, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system';
import { API_CONFIG, isApiKeyConfigured } from '../config/api';
import { withRetry, isRetryableStatus } from '../utils/retry';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Audio cache directory using new expo-file-system API
let audioCacheDir = null;

class ElevenLabsService {
  constructor() {
    this.config = API_CONFIG.elevenLabs;
    this.voiceSettings = {
      voiceId: this.config.voiceId,
      stability: 0.5,
      similarityBoost: 0.75,
      useSpeakerBoost: true,
    };
    this.ensureCacheDir();
  }

  updateVoiceSettings(settings) {
    this.voiceSettings = {
      ...this.voiceSettings,
      ...settings,
    };
  }

  updateApiKey(apiKey) {
    this.config = {
      ...this.config,
      apiKey: apiKey || API_CONFIG.elevenLabs.apiKey,
    };
    console.log('[ElevenLabs] API key updated:', apiKey ? 'set' : 'cleared');
  }

  getVoiceSettings() {
    return { ...this.voiceSettings };
  }

  async ensureCacheDir() {
    if (Platform.OS === 'web') return null;
    if (!audioCacheDir) {
      audioCacheDir = new Directory(Paths.cache, 'audio');
      if (!audioCacheDir.exists) {
        audioCacheDir.create();
      }
    }
    return audioCacheDir;
  }

  isConfigured() {
    // Check runtime config first (set via settings), then static config
    const key = this.config?.apiKey;
    return key && key.length > 10 && !key.startsWith('YOUR_');
  }

  async getVoices() {
    if (!this.isConfigured()) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json();
    return data.voices;
  }

  async generateSpeech(text, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Merge stored settings with provided options
    const mergedOptions = { ...this.voiceSettings, ...options };
    const voiceId = mergedOptions.voiceId || this.config.voiceId;

    return withRetry(
      async (attempt) => {
        if (attempt > 0) {
          console.log(`ElevenLabsService: Retry attempt ${attempt} for speech generation`);
        }

        const response = await fetch(
          `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': this.config.apiKey,
            },
            body: JSON.stringify({
              text,
              model_id: mergedOptions.modelId || 'eleven_monolingual_v1',
              voice_settings: {
                stability: mergedOptions.stability ?? 0.5,
                similarity_boost: mergedOptions.similarityBoost ?? 0.75,
                style: mergedOptions.style || 0.0,
                use_speaker_boost: mergedOptions.useSpeakerBoost ?? true,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.detail?.message || 'Failed to generate speech');
          error.status = response.status;
          // Don't retry auth errors
          if (response.status === 401) {
            error.noRetry = true;
          }
          throw error;
        }

        return response.blob();
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        shouldRetry: (error) => {
          if (error.noRetry) return false;
          if (error.status && isRetryableStatus(error.status)) return true;
          if (error.name === 'TypeError') return true;
          return false;
        },
        onRetry: ({ attempt, delay, error }) => {
          console.log(`ElevenLabsService: Will retry in ${delay}ms (attempt ${attempt}, error: ${error.message})`);
        },
      }
    );
  }

  async generateAndSaveAudio(text, filename, options = {}) {
    // Audio file saving not supported on web
    if (Platform.OS === 'web') {
      console.log('Audio file saving not supported on web');
      return null;
    }

    const cacheDir = await this.ensureCacheDir();
    if (!cacheDir) {
      console.error('[ElevenLabs] Cache dir not available');
      return null;
    }

    try {
      // Generate speech using fetch (returns blob)
      const audioBlob = await this.generateSpeech(text, options);
      
      if (!audioBlob) {
        console.error('[ElevenLabs] No audio blob returned');
        return null;
      }

      // Convert blob to base64 using arrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 manually (works on native)
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64Data = btoa(binary);

      // Build file path directly (don't mix new File API with legacy write)
      const filePath = `${cacheDir.uri}/${filename}.mp3`;
      
      // Write to file using legacy API
      await FileSystem.writeAsStringAsync(filePath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log(`[ElevenLabs] Audio saved: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('[ElevenLabs] Failed to generate/save audio:', error?.message || error);
      return null;
    }
  }

  async generateFlightPackAudio(checkpoints, onProgress) {
    const audioFiles = [];
    let completed = 0;

    for (const checkpoint of checkpoints) {
      if (!checkpoint.narration) continue;

      try {
        const filename = `checkpoint_${checkpoint.id}`;
        const filePath = await this.generateAndSaveAudio(
          checkpoint.narration,
          filename
        );

        audioFiles.push({
          checkpointId: checkpoint.id,
          filePath,
        });

        completed++;
        if (onProgress) {
          onProgress(completed, checkpoints.length);
        }
      } catch (error) {
        console.error(`Failed to generate audio for ${checkpoint.id}:`, error);
        audioFiles.push({
          checkpointId: checkpoint.id,
          filePath: null,
          error: error.message,
        });
      }
    }

    return audioFiles;
  }

  async getAudioFilePath(checkpointId) {
    if (Platform.OS === 'web') return null;
    const cacheDir = await this.ensureCacheDir();
    if (!cacheDir) return null;
    
    const filePath = `${cacheDir.uri}/checkpoint_${checkpointId}.mp3`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists ? filePath : null;
  }

  async clearAudioCache() {
    if (Platform.OS === 'web') return;
    if (audioCacheDir && audioCacheDir.exists) {
      audioCacheDir.delete();
      audioCacheDir = null;
      await this.ensureCacheDir();
    }
  }

  async getCacheSize() {
    if (Platform.OS === 'web') return 0;
    const cacheDir = await this.ensureCacheDir();
    if (!cacheDir || !cacheDir.exists) return 0;

    return cacheDir.size || 0;
  }
}

export const elevenLabsService = new ElevenLabsService();
export { ElevenLabsService };

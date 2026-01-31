import { Platform } from 'react-native';
import { File, Directory, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system';
import { API_CONFIG, isApiKeyConfigured } from '../config/api';
import { withRetry, isRetryableStatus } from '../utils/retry';
import { createLogger } from '../utils/logger';

const log = createLogger('ElevenLabsService');
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
    log.info('generateSpeech called', { textLength: text?.length, hasOptions: !!Object.keys(options).length });
    
    if (!this.isConfigured()) {
      log.error('API key not configured');
      throw new Error('ElevenLabs API key not configured');
    }

    // Merge stored settings with provided options
    const mergedOptions = { ...this.voiceSettings, ...options };
    const voiceId = mergedOptions.voiceId || this.config.voiceId;
    log.debug('Using voice', { voiceId });

    return withRetry(
      async (attempt) => {
        if (attempt > 0) {
          log.warn(`Retry attempt ${attempt} for speech generation`);
        }

        log.debug('Making TTS API request...');
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
              model_id: mergedOptions.modelId || 'eleven_turbo_v2_5',
              voice_settings: {
                stability: mergedOptions.stability ?? 0.5,
                similarity_boost: mergedOptions.similarityBoost ?? 0.75,
                style: mergedOptions.style || 0.0,
                use_speaker_boost: mergedOptions.useSpeakerBoost ?? true,
              },
            }),
          }
        );

        log.debug('API response received', { status: response.status, ok: response.ok });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.detail?.message || 'Failed to generate speech');
          error.status = response.status;
          log.error('API error', { status: response.status, detail: errorData.detail });
          // Don't retry auth errors
          if (response.status === 401) {
            error.noRetry = true;
          }
          throw error;
        }

        const blob = await response.blob();
        log.info('Speech generated successfully', { blobSize: blob.size, blobType: blob.type });
        return blob;
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
    log.info('generateAndSaveAudio called', { filename, textLength: text?.length });
    
    // Audio file saving not supported on web
    if (Platform.OS === 'web') {
      log.warn('Audio file saving not supported on web');
      return null;
    }

    const cacheDir = await this.ensureCacheDir();
    if (!cacheDir) {
      log.error('Cache dir not available');
      return null;
    }
    log.debug('Cache dir ready', { uri: cacheDir.uri });

    try {
      // Generate speech using fetch (returns blob)
      log.debug('Calling generateSpeech...');
      const audioBlob = await this.generateSpeech(text, options);
      
      if (!audioBlob) {
        log.error('No audio blob returned from generateSpeech');
        return null;
      }
      log.debug('Got audio blob', { size: audioBlob.size, type: audioBlob.type });

      // Convert blob to base64 using FileReader (React Native compatible)
      log.debug('Converting blob to base64...');
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // FileReader returns data:audio/mpeg;base64,XXXX - strip the prefix
          const base64 = reader.result?.split(',')[1];
          if (base64) {
            resolve(base64);
          } else {
            reject(new Error('Failed to convert blob to base64'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(audioBlob);
      });
      log.debug('Base64 conversion complete', { base64Length: base64Data.length });

      // Use new File API to write base64 data
      const filePath = `${cacheDir.uri}/${filename}.mp3`;
      log.debug('Writing to file', { filePath });
      
      // Create File instance and write base64 data
      const audioFile = new File(cacheDir, `${filename}.mp3`);
      await audioFile.write(base64Data, { encoding: 'base64' });

      log.info('Audio saved successfully', { filePath: audioFile.uri });
      return audioFile.uri;
    } catch (error) {
      log.error('Failed to generate/save audio', { error: error?.message, stack: error?.stack });
      return null;
    }
  }

  async generateFlightPackAudio(checkpoints, onProgress) {
    log.info('generateFlightPackAudio started', { checkpointCount: checkpoints?.length });
    const audioFiles = [];
    let completed = 0;

    for (const checkpoint of checkpoints) {
      if (!checkpoint.narration) {
        log.debug('Skipping checkpoint without narration', { id: checkpoint.id });
        continue;
      }

      try {
        const filename = `checkpoint_${checkpoint.id}`;
        log.debug('Processing checkpoint', { id: checkpoint.id, narrationLength: checkpoint.narration.length });
        
        const filePath = await this.generateAndSaveAudio(
          checkpoint.narration,
          filename
        );

        audioFiles.push({
          checkpointId: checkpoint.id,
          filePath,
        });
        log.debug('Checkpoint audio complete', { id: checkpoint.id, filePath });

        completed++;
        if (onProgress) {
          onProgress(completed, checkpoints.length);
        }
      } catch (error) {
        log.error('Failed to generate audio for checkpoint', { id: checkpoint.id, error: error.message });
        audioFiles.push({
          checkpointId: checkpoint.id,
          filePath: null,
          error: error.message,
        });
      }
    }

    log.info('generateFlightPackAudio complete', { 
      total: checkpoints.length, 
      succeeded: audioFiles.filter(a => a.filePath).length,
      failed: audioFiles.filter(a => !a.filePath).length 
    });
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

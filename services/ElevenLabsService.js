import { Platform } from 'react-native';
import { API_CONFIG, isApiKeyConfigured } from '../config/api';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Only import FileSystem on native platforms
let FileSystem = null;
let AUDIO_CACHE_DIR = '';
if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system/legacy');
  AUDIO_CACHE_DIR = `${FileSystem.documentDirectory}audio/`;
}

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

  getVoiceSettings() {
    return { ...this.voiceSettings };
  }

  async ensureCacheDir() {
    if (Platform.OS === 'web' || !FileSystem) return;
    const dirInfo = await FileSystem.getInfoAsync(AUDIO_CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(AUDIO_CACHE_DIR, { intermediates: true });
    }
  }

  isConfigured() {
    return isApiKeyConfigured('elevenLabs');
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
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail?.message || 'Failed to generate speech');
    }

    // Return the audio blob
    return await response.blob();
  }

  async generateAndSaveAudio(text, filename, options = {}) {
    // Audio file saving not supported on web
    if (Platform.OS === 'web' || !FileSystem) {
      console.log('Audio file saving not supported on web');
      return null;
    }

    await this.ensureCacheDir();

    const audioBlob = await this.generateSpeech(text, options);
    const filePath = `${AUDIO_CACHE_DIR}${filename}.mp3`;

    // Convert blob to base64 and save
    const reader = new FileReader();
    const base64Promise = new Promise((resolve, reject) => {
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
    reader.readAsDataURL(audioBlob);

    const base64Data = await base64Promise;
    await FileSystem.writeAsStringAsync(filePath, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return filePath;
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
    if (Platform.OS === 'web' || !FileSystem) return null;
    const filePath = `${AUDIO_CACHE_DIR}checkpoint_${checkpointId}.mp3`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists ? filePath : null;
  }

  async clearAudioCache() {
    if (Platform.OS === 'web' || !FileSystem) return;
    const dirInfo = await FileSystem.getInfoAsync(AUDIO_CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(AUDIO_CACHE_DIR, { idempotent: true });
      await this.ensureCacheDir();
    }
  }

  async getCacheSize() {
    if (Platform.OS === 'web' || !FileSystem) return 0;
    const dirInfo = await FileSystem.getInfoAsync(AUDIO_CACHE_DIR);
    if (!dirInfo.exists) return 0;

    const files = await FileSystem.readDirectoryAsync(AUDIO_CACHE_DIR);
    let totalSize = 0;

    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${AUDIO_CACHE_DIR}${file}`);
      if (fileInfo.size) {
        totalSize += fileInfo.size;
      }
    }

    return totalSize;
  }
}

export const elevenLabsService = new ElevenLabsService();
export { ElevenLabsService };

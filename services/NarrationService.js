import { Platform } from 'react-native';
import { claudeService } from './ClaudeService';
import { elevenLabsService } from './ElevenLabsService';
import { audioService } from './AudioService';
import { flightDataService } from './FlightDataService';
import { isApiKeyConfigured } from '../config/api';
import { routeToCheckpoints, estimateFlightDuration, formatDuration } from '../utils/routeUtils';

// Only import FileSystem on native platforms
let FileSystem = null;
let NARRATION_CACHE_DIR = '';
if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system/legacy');
  NARRATION_CACHE_DIR = `${FileSystem.documentDirectory}narrations/`;
}

class NarrationService {
  constructor() {
    this.flightPacks = new Map();
    this.currentFlightPack = null;
    this.currentCheckpointIndex = 0;
    this.ensureCacheDir();
    this.initAudio();
  }

  async initAudio() {
    await audioService.initialize();
  }

  async ensureCacheDir() {
    if (Platform.OS === 'web' || !FileSystem) return;
    const dirInfo = await FileSystem.getInfoAsync(NARRATION_CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(NARRATION_CACHE_DIR, { intermediates: true });
    }
  }

  // Generate narration for current position (live mode)
  async generateLiveNarration(latitude, longitude, altitude) {
    if (!claudeService.isConfigured()) {
      return this.getMockNarration();
    }

    try {
      return await claudeService.generateNarration(latitude, longitude, altitude);
    } catch (error) {
      console.error('Live narration failed:', error);
      return this.getMockNarration();
    }
  }

  // Download and cache a complete flight pack
  async downloadFlightPack(flightNumber, onProgress) {
    const packId = flightNumber.toUpperCase().replace(/\s/g, '');

    // Fetch flight route data
    if (onProgress) onProgress('Fetching flight route...');
    const flightData = await flightDataService.getFlightRoute(flightNumber);

    const pack = {
      id: packId,
      flightNumber: packId,
      downloadedAt: new Date().toISOString(),
      airline: flightData.airline,
      origin: flightData.origin,
      destination: flightData.destination,
      departureTime: flightData.departureTime,
      arrivalTime: flightData.arrivalTime,
      aircraft: flightData.aircraft,
      route: flightData.route,
      checkpoints: [],
      estimatedDuration: null,
    };

    // Calculate estimated flight duration
    if (flightData.route?.length >= 2) {
      pack.estimatedDuration = estimateFlightDuration(flightData.route);
    }

    // Convert route to checkpoints
    if (onProgress) onProgress('Creating checkpoints...');
    const checkpoints = routeToCheckpoints(flightData.route, {
      numCheckpoints: 20,
      minSpacing: 80000, // 80km minimum between checkpoints
      geofenceRadius: 15000, // 15km trigger radius
    });

    // Generate narrations for each checkpoint
    if (claudeService.isConfigured()) {
      if (onProgress) onProgress('Generating AI narrations...');

      for (let i = 0; i < checkpoints.length; i++) {
        const checkpoint = checkpoints[i];
        try {
          if (onProgress) {
            onProgress(`Generating narration ${i + 1}/${checkpoints.length}...`);
          }

          checkpoint.narration = await claudeService.generateNarration(
            checkpoint.latitude,
            checkpoint.longitude,
            checkpoint.altitude,
            {
              flightInfo: `${pack.airline || ''} flight ${packId}`,
              checkpoint: {
                name: checkpoint.name,
                type: checkpoint.type,
              },
              origin: pack.origin?.name,
              destination: pack.destination?.name,
            }
          );
        } catch (error) {
          console.error(`Failed to generate narration for checkpoint ${i}:`, error);
          checkpoint.narration = this.getDefaultNarration(checkpoint);
        }
      }
    } else {
      // Use default narrations
      checkpoints.forEach(checkpoint => {
        checkpoint.narration = this.getDefaultNarration(checkpoint);
      });
    }

    pack.checkpoints = checkpoints;

    // Save to cache
    await this.saveFlightPack(pack);
    this.flightPacks.set(packId, pack);

    return pack;
  }

  getDefaultNarration(checkpoint) {
    switch (checkpoint.type) {
      case 'departure':
        return "We've just departed and are climbing to cruise altitude. Below you can see the landscape transitioning as we gain height.";
      case 'arrival':
        return "We're beginning our descent towards our destination. You may notice the landscape becoming more detailed as we descend.";
      default:
        return "We're cruising at altitude. The landscape below tells a story of geological and human history spanning millions of years.";
    }
  }

  async saveFlightPack(pack) {
    // On web, only use memory storage
    if (Platform.OS === 'web' || !FileSystem) return;
    const filePath = `${NARRATION_CACHE_DIR}${pack.id}.json`;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(pack));
  }

  async loadFlightPack(flightNumber) {
    const packId = flightNumber.toUpperCase().replace(/\s/g, '');

    // Check memory cache
    if (this.flightPacks.has(packId)) {
      return this.flightPacks.get(packId);
    }

    // On web, only use memory cache
    if (Platform.OS === 'web' || !FileSystem) return null;

    // Check file cache
    const filePath = `${NARRATION_CACHE_DIR}${packId}.json`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);

    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(filePath);
      const pack = JSON.parse(content);
      this.flightPacks.set(packId, pack);
      return pack;
    }

    return null;
  }

  async listCachedFlightPacks() {
    // On web, return memory-cached packs only
    if (Platform.OS === 'web' || !FileSystem) {
      return Array.from(this.flightPacks.values()).map(pack => ({
        id: pack.id,
        flightNumber: pack.flightNumber,
        downloadedAt: pack.downloadedAt,
        checkpointCount: pack.checkpoints.length,
      }));
    }

    const files = await FileSystem.readDirectoryAsync(NARRATION_CACHE_DIR);
    const packs = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await FileSystem.readAsStringAsync(`${NARRATION_CACHE_DIR}${file}`);
        const pack = JSON.parse(content);
        packs.push({
          id: pack.id,
          flightNumber: pack.flightNumber,
          downloadedAt: pack.downloadedAt,
          checkpointCount: pack.checkpoints.length,
        });
      }
    }

    return packs;
  }

  async deleteFlightPack(flightNumber) {
    const packId = flightNumber.toUpperCase().replace(/\s/g, '');
    this.flightPacks.delete(packId);

    // On web, only clear memory
    if (Platform.OS === 'web' || !FileSystem) return;

    const filePath = `${NARRATION_CACHE_DIR}${packId}.json`;
    await FileSystem.deleteAsync(filePath, { idempotent: true });
  }

  async clearAllFlightPacks() {
    this.flightPacks.clear();
    this.currentFlightPack = null;

    // On web, only clear memory
    if (Platform.OS === 'web' || !FileSystem) return;

    const dirInfo = await FileSystem.getInfoAsync(NARRATION_CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(NARRATION_CACHE_DIR, { idempotent: true });
      await this.ensureCacheDir();
    }
  }

  async getCacheSize() {
    // On web, we can't measure file system cache
    if (Platform.OS === 'web' || !FileSystem) return 0;

    try {
      const dirInfo = await FileSystem.getInfoAsync(NARRATION_CACHE_DIR);
      if (!dirInfo.exists) return 0;

      const files = await FileSystem.readDirectoryAsync(NARRATION_CACHE_DIR);
      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${NARRATION_CACHE_DIR}${file}`);
        if (fileInfo.exists && fileInfo.size) {
          totalSize += fileInfo.size;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Failed to get narration cache size:', error);
      return 0;
    }
  }

  setCurrentFlightPack(pack) {
    this.currentFlightPack = pack;
  }

  getCurrentCheckpoints() {
    return this.currentFlightPack?.checkpoints || [];
  }

  getCurrentFlightInfo() {
    if (!this.currentFlightPack) return null;

    const pack = this.currentFlightPack;
    return {
      flightNumber: pack.flightNumber,
      airline: pack.airline,
      origin: pack.origin,
      destination: pack.destination,
      estimatedDuration: pack.estimatedDuration
        ? formatDuration(pack.estimatedDuration)
        : null,
      checkpointCount: pack.checkpoints?.length || 0,
    };
  }

  hasFlightDataSupport() {
    return flightDataService.isConfigured();
  }

  // Mock data for demo/offline mode
  getMockNarration() {
    const mockNarrations = [
      "You are currently over terrain shaped by ancient glaciers. The U-shaped valleys and scattered lakes below are remnants of the last Ice Age, approximately 10,000 years ago. The rivers you see carved their paths as the ice retreated northward.",
      "Below you lies a patchwork of agricultural fields that tell the story of thousands of years of human cultivation. Those geometric patterns are a testament to farming practices dating back to the Neolithic period.",
      "The coastline visible on the horizon marks a boundary that has shifted dramatically over millennia. During the last glacial maximum, much of this area was dry land, connecting regions now separated by water.",
      "You're passing over a major river system that has served as a lifeline for civilizations throughout history. These waterways were the highways of the ancient world, carrying trade, ideas, and people across vast distances.",
      "The mountain range below was formed by tectonic forces over millions of years. These peaks once stood even taller, but erosion has sculpted them into their current form, creating the dramatic landscape you see today.",
    ];

    return mockNarrations[Math.floor(Math.random() * mockNarrations.length)];
  }

  generateMockCheckpoints(flightNumber) {
    // Generate demo checkpoints with pre-written narrations
    return [
      {
        id: 'demo_1',
        name: 'Departure Region',
        latitude: 51.5074,
        longitude: -0.1278,
        radius: 10000,
        narration: "We've just departed and are climbing to cruise altitude. Below you can see the urban sprawl giving way to countryside. The patchwork of fields represents centuries of agricultural development.",
      },
      {
        id: 'demo_2',
        name: 'Coastal Waters',
        latitude: 50.8,
        longitude: 0.5,
        radius: 15000,
        narration: "We're now crossing the coastline. The English Channel below has been one of the world's busiest shipping lanes for centuries. On a clear day, you might spot container ships making their way between major ports.",
      },
      {
        id: 'demo_3',
        name: 'Mid-Flight',
        latitude: 49.5,
        longitude: 2.0,
        radius: 20000,
        narration: "We're cruising at altitude over northern France. The landscape below shows the transition from coastal plains to the interior. Those winding rivers have shaped trade routes since Roman times.",
      },
    ];
  }

  // Audio generation methods
  async generateFlightPackAudio(pack, onProgress) {
    if (!isApiKeyConfigured('elevenLabs')) {
      console.log('ElevenLabs not configured, skipping audio generation');
      return pack;
    }

    const audioFiles = await elevenLabsService.generateFlightPackAudio(
      pack.checkpoints,
      onProgress
    );

    // Update checkpoints with audio file paths
    for (const audioFile of audioFiles) {
      const checkpoint = pack.checkpoints.find(c => c.id === audioFile.checkpointId);
      if (checkpoint) {
        checkpoint.audioPath = audioFile.filePath;
      }
    }

    // Save updated pack
    await this.saveFlightPack(pack);
    return pack;
  }

  async playCheckpointAudio(checkpoint) {
    if (checkpoint.audioPath) {
      return await audioService.playUri(checkpoint.audioPath);
    }
    return false;
  }

  async playCurrentNarration(narrationText) {
    // For live narrations, generate and play audio on the fly
    if (!isApiKeyConfigured('elevenLabs')) {
      return false;
    }

    try {
      const filePath = await elevenLabsService.generateAndSaveAudio(
        narrationText,
        `live_${Date.now()}`
      );
      return await audioService.playUri(filePath);
    } catch (error) {
      console.error('Failed to play live narration:', error);
      return false;
    }
  }

  pauseAudio() {
    return audioService.pause();
  }

  resumeAudio() {
    return audioService.play();
  }

  stopAudio() {
    return audioService.stop();
  }

  getAudioStatus() {
    return audioService.getStatus();
  }

  subscribeToAudio(callback) {
    return audioService.subscribe(callback);
  }

  hasAudioSupport() {
    return isApiKeyConfigured('elevenLabs');
  }
}

export const narrationService = new NarrationService();
export { NarrationService };

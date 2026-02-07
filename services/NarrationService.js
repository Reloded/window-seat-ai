import { Platform } from 'react-native';
import { File, Directory, Paths } from 'expo-file-system';
import { claudeService } from './ClaudeService';
import { elevenLabsService } from './ElevenLabsService';
import { audioService } from './AudioService';
import { flightDataService } from './FlightDataService';
import { landmarkService } from './LandmarkService';
import { mapTileService } from './MapTileService';
import { isApiKeyConfigured } from '../config/api';
import { routeToCheckpoints, estimateFlightDuration, formatDuration } from '../utils/routeUtils';
import { createLogger } from '../utils/logger';

const log = createLogger('NarrationService');

// Narration cache directory using new expo-file-system API
let narrationCacheDir = null;

class NarrationService {
  constructor() {
    this.flightPacks = new Map();
    this.currentFlightPack = null;
    this.currentCheckpointIndex = 0;
    this.ensureCacheDir();
    this.initAudio();

    // Queue state
    this.queueActive = false;
    this.queueIndex = 0;
    this.queueListeners = [];
  }

  async initAudio() {
    await audioService.initialize();

    // Listen for audio completion to advance queue
    audioService.subscribe((event) => {
      if (event === 'finished' && this.queueActive) {
        this.playNextInQueue();
      }
    });
  }

  async ensureCacheDir() {
    if (Platform.OS === 'web') return null;
    if (!narrationCacheDir) {
      narrationCacheDir = new Directory(Paths.cache, 'narrations');
      if (!narrationCacheDir.exists) {
        narrationCacheDir.create();
      }
    }
    return narrationCacheDir;
  }

  // Generate narration for current position (live mode)
  async generateLiveNarration(latitude, longitude, altitude) {
    if (!claudeService.isConfigured()) {
      return this.getMockNarration();
    }

    try {
      return await claudeService.generateNarration(latitude, longitude, altitude);
    } catch (error) {
      log.error('Live narration failed', error);
      return this.getMockNarration();
    }
  }

  // Download and cache a complete flight pack
  async downloadFlightPack(flightNumber, onProgress) {
    const packId = flightNumber.toUpperCase().replace(/\s/g, '');
    const timer = log.time(`downloadFlightPack(${packId})`);
    log.info('Starting flight pack download', { flightNumber, packId });

    // Fetch flight route data
    if (onProgress) onProgress('Fetching flight route...');
    let flightData;
    try {
      flightData = await flightDataService.getFlightRoute(flightNumber);
      log.info('Flight route fetched', { packId, routeLength: flightData?.route?.length, usingMock: flightData?.usingMockData });
    } catch (error) {
      log.error('Failed to fetch flight route', { packId, error: error.message });
      throw new Error(`Could not fetch flight data for ${flightNumber}: ${error.message}`);
    }

    if (!flightData || !flightData.route || flightData.route.length < 2) {
      log.error('Invalid flight data received', { packId, hasData: !!flightData, routeLength: flightData?.route?.length });
      throw new Error(`No valid route data found for ${flightNumber}. Try a different flight number.`);
    }

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
    let checkpoints;
    try {
      checkpoints = routeToCheckpoints(flightData.route, {
        numCheckpoints: 20,
        minSpacing: 80000, // 80km minimum between checkpoints
        geofenceRadius: 15000, // 15km trigger radius
      });
      log.info('Checkpoints created', { packId, count: checkpoints?.length });
    } catch (error) {
      log.error('Failed to create checkpoints', { packId, error: error.message });
      throw new Error(`Failed to process route for ${flightNumber}: ${error.message}`);
    }

    // Enrich checkpoints with landmark data (skip in demo mode - no point hitting APIs for mock routes)
    if (flightData.usingMockData) {
      log.info('Skipping landmark enrichment (demo mode)', { packId });
    } else {
      if (onProgress) onProgress('Identifying landmarks...');
      try {
        checkpoints = await landmarkService.enrichCheckpoints(checkpoints, {
          onProgress: (done, total) => {
            if (onProgress) onProgress(`Identifying landmarks (${done}/${total})...`);
          },
        });
      } catch (error) {
        log.warn('Landmark enrichment failed, using default names', error);
      }
    }

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
                landmark: checkpoint.landmark,
              },
              origin: pack.origin?.name,
              destination: pack.destination?.name,
              checkpointIndex: i,
              totalCheckpoints: checkpoints.length,
            }
          );
        } catch (error) {
          log.error(`Failed to generate narration for checkpoint ${i}`, error);
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
    log.info('Checkpoints assigned to pack', { packId, count: checkpoints.length });

    // Download offline map tiles (optional - don't fail if this doesn't work)
    if (onProgress) onProgress('Downloading offline maps...');
    log.info('Starting map tile download', { routeLength: flightData.route?.length, packId });
    try {
      if (flightData.route && flightData.route.length >= 2) {
        const mapResult = await mapTileService.preCacheTilesForRoute(
          flightData.route,
          packId,
          (mapProgress) => {
            if (onProgress && mapProgress && mapProgress.status === 'downloading') {
              const pct = Math.round((mapProgress.current / mapProgress.total) * 100);
              onProgress(`Downloading maps (${pct}%)...`);
            }
          },
          { includeHighDetail: false }
        );
        pack.hasOfflineMaps = mapResult?.success || false;
        pack.mapTilesDownloaded = mapResult?.tilesDownloaded || mapResult?.mapsDownloaded || 0;
      } else {
        log.warn('Skipping map download - invalid route');
        pack.hasOfflineMaps = false;
      }
    } catch (error) {
      log.warn('Map tile download failed, continuing without offline maps', error);
      pack.hasOfflineMaps = false;
      pack.mapTilesDownloaded = 0;
    }

    // Generate audio for narrations if ElevenLabs is configured
    // Use elevenLabsService.isConfigured() to check runtime config (set via Settings)
    const elevenLabsConfigured = elevenLabsService.isConfigured();
    log.info('ElevenLabs configured check', { configured: elevenLabsConfigured });
    
    if (elevenLabsConfigured) {
      if (onProgress) onProgress('Generating voice narrations...');
      log.info('Starting audio generation', { checkpointCount: pack.checkpoints?.length });
      try {
        const audioResult = await this.generateFlightPackAudio(pack, (done, total) => {
          if (onProgress) onProgress(`Generating voice ${done}/${total}...`);
        });
        pack.hasAudio = audioResult?.checkpoints?.some(c => c.audioPath) || false;
        log.info('Audio generation complete', { hasAudio: pack.hasAudio });
      } catch (error) {
        log.warn('Audio generation failed, continuing without voice', error);
        pack.hasAudio = false;
      }
    } else {
      log.debug('ElevenLabs not configured, skipping audio generation');
      pack.hasAudio = false;
    }

    // Save to cache
    log.info('Saving flight pack to cache', { packId, checkpointCount: pack.checkpoints?.length });
    await this.saveFlightPack(pack);
    this.flightPacks.set(packId, pack);

    timer.end({ success: true, hasOfflineMaps: pack.hasOfflineMaps, hasAudio: pack.hasAudio });
    return pack;
  }

  getDefaultNarration(checkpoint) {
    // Simple inline narrations (no external dependencies)
    const type = checkpoint?.type?.toLowerCase();
    if (type === 'departure') {
      return "We've just departed and are climbing to cruise altitude. Below you can see the landscape transitioning as we gain height.";
    }
    if (type === 'arrival') {
      return "We're beginning our descent towards our destination. You may notice the landscape becoming more detailed as we descend.";
    }
    return "We're cruising at altitude. The landscape below tells a story of geological and human history spanning millions of years.";
  }

  async saveFlightPack(pack) {
    // On web, use localStorage
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(`flightPack_${pack.id}`, JSON.stringify(pack));
      } catch (e) {
        log.warn('Failed to save to localStorage', e);
      }
      return;
    }

    const cacheDir = await this.ensureCacheDir();
    if (!cacheDir) return;
    
    const file = new File(cacheDir, `${pack.id}.json`);
    file.write(JSON.stringify(pack));
  }

  async loadFlightPack(flightNumber) {
    const packId = flightNumber.toUpperCase().replace(/\s/g, '');

    // Check memory cache first
    if (this.flightPacks.has(packId)) {
      return this.flightPacks.get(packId);
    }

    // On web, check localStorage
    if (Platform.OS === 'web') {
      try {
        const stored = localStorage.getItem(`flightPack_${packId}`);
        if (stored) {
          const pack = JSON.parse(stored);
          this.flightPacks.set(packId, pack);
          return pack;
        }
      } catch (e) {
        log.warn('Failed to load from localStorage', e);
      }
      return null;
    }

    const cacheDir = await this.ensureCacheDir();
    if (!cacheDir) return null;

    // Check file cache
    const file = new File(cacheDir, `${packId}.json`);

    if (file.exists) {
      const content = await file.text();
      const pack = JSON.parse(content);
      this.flightPacks.set(packId, pack);
      return pack;
    }

    return null;
  }

  async listCachedFlightPacks() {
    // On web, return memory-cached packs only
    if (Platform.OS === 'web') {
      return Array.from(this.flightPacks.values()).map(pack => ({
        id: pack.id,
        flightNumber: pack.flightNumber,
        downloadedAt: pack.downloadedAt,
        checkpointCount: pack.checkpoints.length,
      }));
    }

    const cacheDir = await this.ensureCacheDir();
    if (!cacheDir || !cacheDir.exists) {
      return Array.from(this.flightPacks.values()).map(pack => ({
        id: pack.id,
        flightNumber: pack.flightNumber,
        downloadedAt: pack.downloadedAt,
        checkpointCount: pack.checkpoints.length,
      }));
    }

    const items = cacheDir.list();
    const packs = [];

    for (const item of items) {
      if (item instanceof File && item.uri.endsWith('.json')) {
        const content = await item.text();
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

    // Clean up map tile cache for this flight
    try {
      await mapTileService.clearTileCache(packId);
    } catch (e) {
      log.warn('Failed to clear map tile cache for flight', e);
    }

    // On web, clear localStorage
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(`flightPack_${packId}`);
      } catch (e) {
        log.warn('Failed to remove from localStorage', e);
      }
      return;
    }

    const cacheDir = await this.ensureCacheDir();
    if (!cacheDir) return;
    
    const file = new File(cacheDir, `${packId}.json`);
    if (file.exists) {
      file.delete();
    }
  }

  async clearAllFlightPacks() {
    this.flightPacks.clear();
    this.currentFlightPack = null;

    // Clear all map tile cache
    try {
      await mapTileService.clearAllTileCache();
    } catch (e) {
      log.warn('Failed to clear all map tile cache', e);
    }

    // On web, clear localStorage
    if (Platform.OS === 'web') {
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('flightPack_'));
        keys.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        log.warn('Failed to clear all localStorage', e);
      }
      return;
    }

    if (narrationCacheDir && narrationCacheDir.exists) {
      narrationCacheDir.delete();
      narrationCacheDir = null;
      await this.ensureCacheDir();
    }
  }

  async getCacheSize() {
    // On web, estimate localStorage size
    if (Platform.OS === 'web') {
      try {
        let size = 0;
        Object.keys(localStorage)
          .filter(k => k.startsWith('flightPack_'))
          .forEach(k => {
            size += localStorage.getItem(k)?.length || 0;
          });
        return size * 2; // UTF-16 = 2 bytes per char
      } catch (e) {
        return 0;
      }
    }

    try {
      const cacheDir = await this.ensureCacheDir();
      if (!cacheDir || !cacheDir.exists) return 0;

      return cacheDir.size || 0;
    } catch (error) {
      log.error('Failed to get narration cache size', error);
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

  // Get checkpoint locations only (for preview, without generating narrations)
  async getCheckpointLocationsOnly(route, flightNumber) {
    if (!route || route.length < 2) {
      return [];
    }

    // Convert route to checkpoints
    let checkpoints = routeToCheckpoints(route, {
      numCheckpoints: 20,
      minSpacing: 80000,
      geofenceRadius: 15000,
    });

    // Enrich with landmark data (this is relatively fast)
    try {
      checkpoints = await landmarkService.enrichCheckpoints(checkpoints, {
        timeout: 5000, // Limit timeout for preview
      });
    } catch (error) {
      log.warn('Landmark enrichment failed for preview', error);
    }

    // Return just name and type for preview (no narrations)
    return checkpoints.map(cp => ({
      name: cp.name,
      type: cp.type,
      latitude: cp.latitude,
      longitude: cp.longitude,
    }));
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
    if (!elevenLabsService.isConfigured()) {
      log.debug('ElevenLabs not configured in generateFlightPackAudio');
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
    // Try pre-generated audio first (ElevenLabs)
    if (checkpoint.audioPath) {
      return await audioService.playUri(checkpoint.audioPath);
    }
    return false;
  }

  async playCurrentNarration(narrationText) {
    // Try ElevenLabs if configured
    if (elevenLabsService.isConfigured()) {
      try {
        const filePath = await elevenLabsService.generateAndSaveAudio(
          narrationText,
          `live_${Date.now()}`
        );
        return await audioService.playUri(filePath);
      } catch (error) {
        log.error('ElevenLabs live narration failed', error);
      }
    }
    return false;
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
    return elevenLabsService.isConfigured();
  }

  // Queue playback methods
  getQueueCheckpoints() {
    if (!this.currentFlightPack?.checkpoints) return [];
    return this.currentFlightPack.checkpoints.filter(c => c.audioPath || c.narration);
  }

  async startQueue(startIndex = 0) {
    const checkpoints = this.getQueueCheckpoints();
    if (checkpoints.length === 0) return false;

    this.queueActive = true;
    this.queueIndex = Math.max(0, Math.min(startIndex, checkpoints.length - 1));
    this.notifyQueueListeners();

    return await this.playCurrentQueueItem();
  }

  async playCurrentQueueItem() {
    const checkpoints = this.getQueueCheckpoints();
    if (!this.queueActive || this.queueIndex >= checkpoints.length) {
      this.stopQueue();
      return false;
    }

    const checkpoint = checkpoints[this.queueIndex];
    this.notifyQueueListeners();

    if (checkpoint.audioPath) {
      return await audioService.playUri(checkpoint.audioPath);
    }
    return false;
  }

  async playNextInQueue() {
    const checkpoints = this.getQueueCheckpoints();
    if (this.queueIndex < checkpoints.length - 1) {
      this.queueIndex++;
      return await this.playCurrentQueueItem();
    } else {
      // End of queue
      this.stopQueue();
      return false;
    }
  }

  async playPreviousInQueue() {
    if (this.queueIndex > 0) {
      this.queueIndex--;
      return await this.playCurrentQueueItem();
    }
    return false;
  }

  async skipNext() {
    await audioService.stop();
    return await this.playNextInQueue();
  }

  async skipPrevious() {
    await audioService.stop();
    return await this.playPreviousInQueue();
  }

  stopQueue() {
    this.queueActive = false;
    audioService.stop();
    this.notifyQueueListeners();
  }

  getQueueStatus() {
    const checkpoints = this.getQueueCheckpoints();
    const currentCheckpoint = checkpoints[this.queueIndex] || null;

    return {
      isActive: this.queueActive,
      currentIndex: this.queueIndex,
      totalCount: checkpoints.length,
      currentCheckpoint,
    };
  }

  subscribeToQueue(callback) {
    this.queueListeners.push(callback);
    return () => {
      this.queueListeners = this.queueListeners.filter(cb => cb !== callback);
    };
  }

  notifyQueueListeners() {
    const status = this.getQueueStatus();
    this.queueListeners.forEach(cb => cb(status));
  }
}

export const narrationService = new NarrationService();
export { NarrationService };

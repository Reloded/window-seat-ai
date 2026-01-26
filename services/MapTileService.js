import { Platform } from 'react-native';
import {
  getTilesForRoute,
  getTileUrl,
  getTileKey,
  estimateDownloadSize,
  getRouteCenter,
  calculateFitZoom,
  getRouteBounds,
} from '../utils/tileCalculations';
import { MAP_TILES } from '../components/map/mapStyles';

// FileSystem caching temporarily disabled due to expo-file-system API changes
// TODO: Migrate to new expo-file-system File/Directory API
let FileSystem = null;
let MAP_CACHE_DIR = '';

// IndexedDB database name and store for web
const IDB_NAME = 'WindowSeatMapTiles';
const IDB_VERSION = 1;
const IDB_STORE_NAME = 'tiles';

// Default tile URL template
const DEFAULT_TILE_URL = MAP_TILES.dark.url;
const TILE_SUBDOMAINS = ['a', 'b', 'c'];

// Default zoom levels for offline caching
const DEFAULT_ZOOM_LEVELS = [4, 5, 6, 7];
const HIGH_DETAIL_ZOOM_LEVELS = [4, 5, 6, 7, 8];

// Static map generation settings for native
const STATIC_MAP_SIZES = {
  overview: { width: 800, height: 600, zoom: 4 },
  regional: { width: 800, height: 600, zoom: 6 },
  detail: { width: 800, height: 600, zoom: 8 },
};

class MapTileService {
  constructor() {
    this.db = null;
    this.initPromise = null;
    this.ensureCacheDir();
  }

  async ensureCacheDir() {
    if (Platform.OS === 'web' || !FileSystem) return;
    try {
      const dirInfo = await FileSystem.getInfoAsync(MAP_CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(MAP_CACHE_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('Failed to create map cache directory:', error);
    }
  }

  // ============================================
  // IndexedDB Operations (Web)
  // ============================================

  async initIndexedDB() {
    if (Platform.OS !== 'web') return null;
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }

      const request = indexedDB.open(IDB_NAME, IDB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        resolve(null);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          const store = db.createObjectStore(IDB_STORE_NAME, { keyPath: 'key' });
          store.createIndex('flightId', 'flightId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async storeTileInDB(key, flightId, blob) {
    const db = await this.initIndexedDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([IDB_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(IDB_STORE_NAME);

        const record = {
          key,
          flightId,
          blob,
          timestamp: Date.now(),
          size: blob.size,
        };

        const request = store.put(record);
        request.onsuccess = () => resolve(true);
        request.onerror = () => {
          console.error('Failed to store tile:', request.error);
          resolve(false);
        };
      } catch (error) {
        console.error('IndexedDB store error:', error);
        resolve(false);
      }
    });
  }

  async getTileFromDB(key) {
    const db = await this.initIndexedDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([IDB_STORE_NAME], 'readonly');
        const store = transaction.objectStore(IDB_STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.blob : null);
        };
        request.onerror = () => {
          console.error('Failed to get tile:', request.error);
          resolve(null);
        };
      } catch (error) {
        console.error('IndexedDB get error:', error);
        resolve(null);
      }
    });
  }

  async deleteTilesForFlight(flightId) {
    const db = await this.initIndexedDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([IDB_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(IDB_STORE_NAME);
        const index = store.index('flightId');
        const request = index.openCursor(IDBKeyRange.only(flightId));

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          }
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
          console.error('Failed to delete tiles:', transaction.error);
          resolve();
        };
      } catch (error) {
        console.error('IndexedDB delete error:', error);
        resolve();
      }
    });
  }

  async clearAllTilesFromDB() {
    const db = await this.initIndexedDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([IDB_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(IDB_STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('Failed to clear tiles:', request.error);
          resolve();
        };
      } catch (error) {
        console.error('IndexedDB clear error:', error);
        resolve();
      }
    });
  }

  async getDBCacheSize() {
    const db = await this.initIndexedDB();
    if (!db) return 0;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([IDB_STORE_NAME], 'readonly');
        const store = transaction.objectStore(IDB_STORE_NAME);
        const request = store.openCursor();
        let totalSize = 0;

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            totalSize += cursor.value.size || 0;
            cursor.continue();
          } else {
            resolve(totalSize);
          }
        };
        request.onerror = () => resolve(0);
      } catch (error) {
        resolve(0);
      }
    });
  }

  // ============================================
  // Web Tile Caching (IndexedDB)
  // ============================================

  async preCacheTilesForRoute(route, flightId, onProgress, options = {}) {
    if (Platform.OS !== 'web') {
      return this.downloadStaticMaps(route, flightId, onProgress, options);
    }

    const {
      includeHighDetail = false,
      bufferMeters = 100000,
    } = options;

    const zoomLevels = includeHighDetail ? HIGH_DETAIL_ZOOM_LEVELS : DEFAULT_ZOOM_LEVELS;
    const tiles = getTilesForRoute(route, bufferMeters, zoomLevels);

    if (tiles.length === 0) {
      return { success: true, tilesDownloaded: 0, bytesDownloaded: 0 };
    }

    const estimatedSize = estimateDownloadSize(tiles);
    if (onProgress) {
      onProgress({
        status: 'preparing',
        total: tiles.length,
        current: 0,
        estimatedBytes: estimatedSize,
      });
    }

    let downloaded = 0;
    let bytesDownloaded = 0;
    let failed = 0;

    // Download tiles in batches to avoid overwhelming the network
    const BATCH_SIZE = 10;
    for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
      const batch = tiles.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (tile) => {
          const url = getTileUrl(DEFAULT_TILE_URL, tile.x, tile.y, tile.z, TILE_SUBDOMAINS);
          const key = getTileKey(tile.z, tile.x, tile.y);

          // Check if already cached
          const existing = await this.getTileFromDB(key);
          if (existing) {
            return { cached: true, size: existing.size };
          }

          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();
            await this.storeTileInDB(key, flightId, blob);
            return { cached: false, size: blob.size };
          } catch (error) {
            console.warn(`Failed to download tile ${key}:`, error.message);
            throw error;
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          downloaded++;
          bytesDownloaded += result.value.size || 0;
        } else {
          failed++;
        }
      }

      if (onProgress) {
        onProgress({
          status: 'downloading',
          total: tiles.length,
          current: downloaded + failed,
          downloaded,
          failed,
          bytesDownloaded,
        });
      }
    }

    return {
      success: failed === 0,
      tilesDownloaded: downloaded,
      tilesFailed: failed,
      bytesDownloaded,
    };
  }

  async getCachedTileUrl(z, x, y) {
    if (Platform.OS !== 'web') return null;

    const key = getTileKey(z, x, y);
    const blob = await this.getTileFromDB(key);

    if (blob) {
      return URL.createObjectURL(blob);
    }

    return null;
  }

  async hasCachedTile(z, x, y) {
    if (Platform.OS !== 'web') return false;

    const key = getTileKey(z, x, y);
    const blob = await this.getTileFromDB(key);
    return blob !== null;
  }

  // ============================================
  // Native Static Map Caching
  // ============================================

  async downloadStaticMaps(route, flightId, onProgress, options = {}) {
    if (Platform.OS === 'web' || !FileSystem) {
      return { success: false, error: 'Not supported on web' };
    }

    // Validate route before proceeding
    if (!route || !Array.isArray(route) || route.length < 2) {
      console.warn('MapTileService: Invalid route for static maps');
      return { success: false, error: 'Invalid route', mapsDownloaded: 0 };
    }

    const flightCacheDir = `${MAP_CACHE_DIR}${flightId}/`;

    try {
      // Ensure flight-specific directory exists
      const dirInfo = await FileSystem.getInfoAsync(flightCacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(flightCacheDir, { intermediates: true });
      }

      const center = getRouteCenter(route);
      const bounds = getRouteBounds(route, 0);

      // Validate center coordinates
      if (!center || typeof center.latitude !== 'number' || typeof center.longitude !== 'number') {
        console.warn('MapTileService: Invalid route center');
        return { success: false, error: 'Invalid route center', mapsDownloaded: 0 };
      }
      const results = [];

      const mapConfigs = [
        { name: 'overview', ...STATIC_MAP_SIZES.overview },
        { name: 'regional', ...STATIC_MAP_SIZES.regional },
        { name: 'detail', ...STATIC_MAP_SIZES.detail },
      ];

      let downloaded = 0;

      for (const config of mapConfigs) {
        if (onProgress) {
          onProgress({
            status: `Downloading ${config.name} map...`,
            total: mapConfigs.length,
            current: downloaded,
          });
        }

        try {
          const filePath = `${flightCacheDir}${config.name}.png`;
          const url = this.buildStaticMapUrl(route, center, config);

          // Set a timeout for the download
          const downloadPromise = FileSystem.downloadAsync(url, filePath);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Download timeout')), 30000)
          );

          const downloadResult = await Promise.race([downloadPromise, timeoutPromise]);

          if (downloadResult && downloadResult.status === 200) {
            results.push({
              name: config.name,
              filePath,
              success: true,
            });
            downloaded++;
          } else {
            // If download fails, continue without crashing
            results.push({
              name: config.name,
              filePath: null,
              success: false,
              error: downloadResult ? `HTTP ${downloadResult.status}` : 'No response',
            });
          }
        } catch (error) {
          console.warn(`Failed to download ${config.name} map:`, error?.message || error);
          results.push({
            name: config.name,
            filePath: null,
            success: false,
            error: error?.message || 'Download failed',
          });
        }
      }

      // Save metadata
      const metadata = {
        flightId,
        downloadedAt: new Date().toISOString(),
        route: route.slice(0, 2).concat(route.slice(-2)), // Store just endpoints
        bounds,
        center,
        maps: results,
      };

      await FileSystem.writeAsStringAsync(
        `${flightCacheDir}metadata.json`,
        JSON.stringify(metadata)
      );

      if (onProgress) {
        onProgress({
          status: 'complete',
          total: mapConfigs.length,
          current: downloaded,
        });
      }

      return {
        success: downloaded > 0,
        mapsDownloaded: downloaded,
        mapsFailed: mapConfigs.length - downloaded,
        results,
      };
    } catch (error) {
      console.error('Failed to download static maps:', error);
      return { success: false, error: error.message };
    }
  }

  buildStaticMapUrl(route, center, config) {
    // Use OpenStreetMap Static Maps API (no key required)
    // Alternative: use custom tile stitching approach
    const { width, height, zoom } = config;

    // Build path parameter from route points (sampled for URL length limits)
    const maxPoints = 100;
    const sampleRate = Math.max(1, Math.floor(route.length / maxPoints));
    const sampledPoints = route.filter((_, i) => i % sampleRate === 0);

    // Encode path as polyline-like format
    const pathCoords = sampledPoints
      .map((p) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`)
      .join('|');

    // OpenStreetMap static map API
    const baseUrl = 'https://staticmap.openstreetmap.de/staticmap.php';
    const params = new URLSearchParams({
      center: `${center.latitude.toFixed(5)},${center.longitude.toFixed(5)}`,
      zoom: String(zoom),
      size: `${width}x${height}`,
      maptype: 'mapnik',
    });

    // Add markers for origin and destination
    if (route.length >= 2) {
      const origin = route[0];
      const dest = route[route.length - 1];
      params.append(
        'markers',
        `${origin.latitude.toFixed(5)},${origin.longitude.toFixed(5)},lightblue`
      );
      params.append(
        'markers',
        `${dest.latitude.toFixed(5)},${dest.longitude.toFixed(5)},lightblue`
      );
    }

    return `${baseUrl}?${params.toString()}`;
  }

  async getStaticMapPath(flightId, mapName = 'overview') {
    if (Platform.OS === 'web' || !FileSystem) return null;

    const filePath = `${MAP_CACHE_DIR}${flightId}/${mapName}.png`;

    try {
      const info = await FileSystem.getInfoAsync(filePath);
      if (info.exists) {
        return filePath;
      }
    } catch (error) {
      console.warn('Error checking static map path:', error);
    }

    return null;
  }

  async getStaticMapMetadata(flightId) {
    if (Platform.OS === 'web' || !FileSystem) return null;

    const metadataPath = `${MAP_CACHE_DIR}${flightId}/metadata.json`;

    try {
      const info = await FileSystem.getInfoAsync(metadataPath);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(metadataPath);
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Error reading static map metadata:', error);
    }

    return null;
  }

  // ============================================
  // Shared Methods
  // ============================================

  async getCacheSize(flightId = null) {
    if (Platform.OS === 'web') {
      return this.getDBCacheSize();
    }

    if (!FileSystem) return 0;

    try {
      const baseDir = flightId ? `${MAP_CACHE_DIR}${flightId}/` : MAP_CACHE_DIR;
      const dirInfo = await FileSystem.getInfoAsync(baseDir);
      if (!dirInfo.exists) return 0;

      // Calculate size recursively
      return this.calculateDirSize(baseDir);
    } catch (error) {
      console.error('Failed to get map cache size:', error);
      return 0;
    }
  }

  async calculateDirSize(dirPath) {
    if (!FileSystem) return 0;

    try {
      const items = await FileSystem.readDirectoryAsync(dirPath);
      let totalSize = 0;

      for (const item of items) {
        const itemPath = `${dirPath}${item}`;
        const info = await FileSystem.getInfoAsync(itemPath);

        if (info.exists) {
          if (info.isDirectory) {
            totalSize += await this.calculateDirSize(`${itemPath}/`);
          } else if (info.size) {
            totalSize += info.size;
          }
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Error calculating directory size:', error);
      return 0;
    }
  }

  async clearTileCache(flightId) {
    if (Platform.OS === 'web') {
      return this.deleteTilesForFlight(flightId);
    }

    if (!FileSystem) return;

    const flightCacheDir = `${MAP_CACHE_DIR}${flightId}/`;

    try {
      await FileSystem.deleteAsync(flightCacheDir, { idempotent: true });
    } catch (error) {
      console.error('Failed to clear tile cache for flight:', error);
    }
  }

  async clearAllTileCache() {
    if (Platform.OS === 'web') {
      return this.clearAllTilesFromDB();
    }

    if (!FileSystem) return;

    try {
      await FileSystem.deleteAsync(MAP_CACHE_DIR, { idempotent: true });
      await this.ensureCacheDir();
    } catch (error) {
      console.error('Failed to clear all tile cache:', error);
    }
  }

  async hasOfflineMaps(flightId) {
    if (Platform.OS === 'web') {
      // Check if we have any tiles cached for this flight
      const db = await this.initIndexedDB();
      if (!db) return false;

      return new Promise((resolve) => {
        try {
          const transaction = db.transaction([IDB_STORE_NAME], 'readonly');
          const store = transaction.objectStore(IDB_STORE_NAME);
          const index = store.index('flightId');
          const request = index.count(IDBKeyRange.only(flightId));

          request.onsuccess = () => resolve(request.result > 0);
          request.onerror = () => resolve(false);
        } catch (error) {
          resolve(false);
        }
      });
    }

    // Native: check for static map files
    const metadata = await this.getStaticMapMetadata(flightId);
    return metadata !== null && metadata.maps?.some((m) => m.success);
  }

  // Estimate tiles for a route (for UI display)
  estimateTilesForRoute(route, options = {}) {
    const {
      includeHighDetail = false,
      bufferMeters = 100000,
    } = options;

    const zoomLevels = includeHighDetail ? HIGH_DETAIL_ZOOM_LEVELS : DEFAULT_ZOOM_LEVELS;
    const tiles = getTilesForRoute(route, bufferMeters, zoomLevels);

    return {
      tileCount: tiles.length,
      estimatedBytes: estimateDownloadSize(tiles),
      zoomLevels,
    };
  }
}

export const mapTileService = new MapTileService();
export { MapTileService };

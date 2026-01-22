import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { mapTileService } from '../../services/MapTileService';
import { getTileKey } from '../../utils/tileCalculations';
import { MAP_TILES } from './mapStyles';

// Custom Leaflet TileLayer that checks IndexedDB cache first
const createCachedTileLayerClass = () => {
  return L.TileLayer.extend({
    options: {
      flightId: null,
      cacheEnabled: true,
      cacheOnFetch: true, // Cache tiles as they're fetched
    },

    initialize: function (url, options) {
      L.TileLayer.prototype.initialize.call(this, url, options);
      this._pendingTiles = new Map();
      this._blobUrls = new Map();
    },

    createTile: function (coords, done) {
      const tile = document.createElement('img');
      const key = getTileKey(coords.z, coords.x, coords.y);

      tile.alt = '';
      tile.setAttribute('role', 'presentation');

      // Add error handling
      L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));

      if (this.options.crossOrigin || this.options.crossOrigin === '') {
        tile.crossOrigin =
          this.options.crossOrigin === true ? '' : this.options.crossOrigin;
      }

      // Try to load from cache first
      if (this.options.cacheEnabled) {
        this._loadTileWithCache(tile, coords, key, done);
      } else {
        // Load directly from network
        tile.src = this.getTileUrl(coords);
        L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
      }

      return tile;
    },

    _loadTileWithCache: async function (tile, coords, key, done) {
      try {
        // Check cache first
        const cachedUrl = await mapTileService.getCachedTileUrl(coords.z, coords.x, coords.y);

        if (cachedUrl) {
          // Use cached tile
          tile.src = cachedUrl;
          this._blobUrls.set(key, cachedUrl);
          L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
          return;
        }

        // Not in cache, fetch from network
        const url = this.getTileUrl(coords);

        if (this.options.cacheOnFetch && this.options.flightId) {
          // Fetch and cache the tile
          try {
            const response = await fetch(url);
            if (response.ok) {
              const blob = await response.blob();

              // Store in cache
              await mapTileService.storeTileInDB(key, this.options.flightId, blob);

              // Create blob URL for this tile
              const blobUrl = URL.createObjectURL(blob);
              this._blobUrls.set(key, blobUrl);
              tile.src = blobUrl;
            } else {
              // Fallback to direct URL
              tile.src = url;
            }
          } catch (fetchError) {
            console.warn(`Failed to fetch/cache tile ${key}:`, fetchError);
            tile.src = url;
          }
        } else {
          // Just load directly
          tile.src = url;
        }

        L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
      } catch (error) {
        console.warn(`Error loading tile ${key}:`, error);
        // Fallback to network
        tile.src = this.getTileUrl(coords);
        L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
      }
    },

    _removeTile: function (key) {
      // Clean up blob URLs when tiles are removed
      const blobUrl = this._blobUrls.get(key);
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
        this._blobUrls.delete(key);
      }

      L.TileLayer.prototype._removeTile.call(this, key);
    },

    onRemove: function (map) {
      // Clean up all blob URLs when layer is removed
      for (const [key, url] of this._blobUrls) {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }
      this._blobUrls.clear();

      L.TileLayer.prototype.onRemove.call(this, map);
    },
  });
};

// Create the class once
let CachedTileLayerClass = null;

const getCachedTileLayerClass = () => {
  if (!CachedTileLayerClass) {
    CachedTileLayerClass = createCachedTileLayerClass();
  }
  return CachedTileLayerClass;
};

// React component that creates and manages the cached tile layer
export function CachedTileLayer({
  url = MAP_TILES.dark.url,
  attribution = MAP_TILES.dark.attribution,
  flightId = null,
  cacheEnabled = true,
  cacheOnFetch = false,
  ...otherOptions
}) {
  const map = useMap();
  const layerRef = useRef(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Create and add the tile layer
  useEffect(() => {
    const TileLayerClass = getCachedTileLayerClass();

    const layer = new TileLayerClass(url, {
      attribution,
      flightId,
      cacheEnabled,
      cacheOnFetch: cacheOnFetch && flightId,
      ...otherOptions,
    });

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, url, attribution, flightId, cacheEnabled, cacheOnFetch]);

  // Update options when they change
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.options.flightId = flightId;
      layerRef.current.options.cacheEnabled = cacheEnabled;
      layerRef.current.options.cacheOnFetch = cacheOnFetch && flightId;
    }
  }, [flightId, cacheEnabled, cacheOnFetch]);

  return null;
}

// Hook to check offline map availability
export function useOfflineMapStatus(flightId) {
  const [hasOfflineMaps, setHasOfflineMaps] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      if (!flightId) {
        setHasOfflineMaps(false);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      try {
        const has = await mapTileService.hasOfflineMaps(flightId);
        if (!cancelled) {
          setHasOfflineMaps(has);
        }
      } catch (error) {
        console.warn('Error checking offline map status:', error);
        if (!cancelled) {
          setHasOfflineMaps(false);
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    checkStatus();

    return () => {
      cancelled = true;
    };
  }, [flightId]);

  return { hasOfflineMaps, isChecking };
}

// Export the class factory for advanced usage
export { getCachedTileLayerClass };

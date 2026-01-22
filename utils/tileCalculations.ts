// XYZ Tile calculation utilities for map tile caching
import { Coordinate, calculateDistance } from './geofence';

export interface TileCoord {
  x: number;
  y: number;
  z: number;
}

// Convert lat/lng to XYZ tile coordinates
export function latLngToTile(lat: number, lng: number, zoom: number): TileCoord {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );

  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
    z: zoom,
  };
}

// Convert XYZ tile coordinates back to lat/lng (top-left corner of tile)
export function tileToLatLng(x: number, y: number, z: number): Coordinate {
  const n = Math.pow(2, z);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;

  return { latitude: lat, longitude: lng };
}

// Get the bounding box of a tile
export function getTileBounds(
  x: number,
  y: number,
  z: number
): { north: number; south: number; east: number; west: number } {
  const nw = tileToLatLng(x, y, z);
  const se = tileToLatLng(x + 1, y + 1, z);

  return {
    north: nw.latitude,
    south: se.latitude,
    east: se.longitude,
    west: nw.longitude,
  };
}

// Get all tiles covering a bounding box at a given zoom level
export function getTilesForBounds(
  north: number,
  south: number,
  east: number,
  west: number,
  zoom: number
): TileCoord[] {
  const tiles: TileCoord[] = [];

  // Handle date line crossing
  const normalizedWest = west;
  const normalizedEast = east < west ? east + 360 : east;

  const nwTile = latLngToTile(north, normalizedWest, zoom);
  const seTile = latLngToTile(south, normalizedEast, zoom);

  const n = Math.pow(2, zoom);

  for (let x = nwTile.x; x <= seTile.x; x++) {
    for (let y = nwTile.y; y <= seTile.y; y++) {
      tiles.push({
        x: ((x % n) + n) % n, // Handle wrap-around
        y: Math.max(0, Math.min(n - 1, y)),
        z: zoom,
      });
    }
  }

  return tiles;
}

// Get bounding box for a route with a buffer distance
export function getRouteBounds(
  route: Coordinate[],
  bufferMeters: number
): { north: number; south: number; east: number; west: number } {
  if (route.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const point of route) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  // Add buffer (approximate degrees from meters)
  // 1 degree latitude = ~111km
  // 1 degree longitude varies with latitude
  const latBuffer = bufferMeters / 111000;
  const avgLat = (minLat + maxLat) / 2;
  const lngBuffer = bufferMeters / (111000 * Math.cos((avgLat * Math.PI) / 180));

  return {
    north: Math.min(85, maxLat + latBuffer),
    south: Math.max(-85, minLat - latBuffer),
    east: Math.min(180, maxLng + lngBuffer),
    west: Math.max(-180, minLng - lngBuffer),
  };
}

// Get all tiles covering a route with buffer at multiple zoom levels
export function getTilesForRoute(
  route: Coordinate[],
  bufferMeters: number = 100000, // Default 100km buffer
  zoomLevels: number[] = [4, 5, 6, 7]
): TileCoord[] {
  if (route.length === 0) {
    return [];
  }

  const bounds = getRouteBounds(route, bufferMeters);
  const allTiles: TileCoord[] = [];
  const seenTiles = new Set<string>();

  for (const zoom of zoomLevels) {
    const tiles = getTilesForBounds(
      bounds.north,
      bounds.south,
      bounds.east,
      bounds.west,
      zoom
    );

    for (const tile of tiles) {
      const key = `${tile.z}/${tile.x}/${tile.y}`;
      if (!seenTiles.has(key)) {
        seenTiles.add(key);
        allTiles.push(tile);
      }
    }
  }

  return allTiles;
}

// Estimate download size for tiles (rough approximation)
// Average tile size varies by zoom level and content
const AVERAGE_TILE_SIZES: Record<number, number> = {
  4: 15000,  // ~15KB average at zoom 4
  5: 18000,  // ~18KB average at zoom 5
  6: 20000,  // ~20KB average at zoom 6
  7: 22000,  // ~22KB average at zoom 7
  8: 25000,  // ~25KB average at zoom 8
};

export function estimateTileSize(zoom: number): number {
  return AVERAGE_TILE_SIZES[zoom] || 20000;
}

export function estimateDownloadSize(tiles: TileCoord[]): number {
  return tiles.reduce((sum, tile) => sum + estimateTileSize(tile.z), 0);
}

export function estimateTileCount(
  route: Coordinate[],
  bufferMeters: number = 100000,
  zoomLevels: number[] = [4, 5, 6, 7]
): { count: number; estimatedBytes: number } {
  const tiles = getTilesForRoute(route, bufferMeters, zoomLevels);
  return {
    count: tiles.length,
    estimatedBytes: estimateDownloadSize(tiles),
  };
}

// Get tile URL from template
export function getTileUrl(
  urlTemplate: string,
  x: number,
  y: number,
  z: number,
  subdomains: string[] = ['a', 'b', 'c']
): string {
  const subdomain = subdomains[Math.abs(x + y) % subdomains.length];
  return urlTemplate
    .replace('{s}', subdomain)
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{z}', String(z));
}

// Generate a unique key for a tile
export function getTileKey(z: number, x: number, y: number): string {
  return `${z}/${x}/${y}`;
}

// Parse a tile key back to coordinates
export function parseTileKey(key: string): TileCoord | null {
  const parts = key.split('/');
  if (parts.length !== 3) return null;

  const z = parseInt(parts[0], 10);
  const x = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);

  if (isNaN(z) || isNaN(x) || isNaN(y)) return null;

  return { z, x, y };
}

// Calculate distance along route for progress tracking
export function getRouteDistance(route: Coordinate[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += calculateDistance(
      route[i - 1].latitude,
      route[i - 1].longitude,
      route[i].latitude,
      route[i].longitude
    );
  }
  return total;
}

// Get center point of route for static map generation
export function getRouteCenter(route: Coordinate[]): Coordinate {
  if (route.length === 0) {
    return { latitude: 0, longitude: 0 };
  }

  const latSum = route.reduce((sum, p) => sum + p.latitude, 0);
  const lngSum = route.reduce((sum, p) => sum + p.longitude, 0);

  return {
    latitude: latSum / route.length,
    longitude: lngSum / route.length,
  };
}

// Calculate appropriate zoom level for a route to fit in given dimensions
export function calculateFitZoom(
  route: Coordinate[],
  mapWidth: number = 800,
  mapHeight: number = 600,
  padding: number = 50
): number {
  if (route.length === 0) return 4;

  const bounds = getRouteBounds(route, 0);
  const latRange = bounds.north - bounds.south;
  const lngRange = bounds.east - bounds.west;

  const effectiveWidth = mapWidth - 2 * padding;
  const effectiveHeight = mapHeight - 2 * padding;

  // Calculate zoom for latitude
  const latZoom = Math.log2(effectiveHeight / (latRange * 256 / 180));

  // Calculate zoom for longitude (considering latitude)
  const centerLat = (bounds.north + bounds.south) / 2;
  const lngZoom = Math.log2(
    effectiveWidth / (lngRange * 256 / 360 * Math.cos((centerLat * Math.PI) / 180))
  );

  // Use the smaller zoom to ensure both dimensions fit
  const zoom = Math.floor(Math.min(latZoom, lngZoom));

  // Clamp to reasonable range
  return Math.max(1, Math.min(18, zoom));
}

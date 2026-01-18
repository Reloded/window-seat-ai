/**
 * LandmarkService - Reverse geocoding and POI lookup using OpenStreetMap APIs
 *
 * Uses:
 * - Nominatim for reverse geocoding (city/region names)
 * - Overpass API for nearby POIs (parks, mountains, rivers, etc.)
 */

import { API_CONFIG } from '../config/api';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

class LandmarkService {
  constructor() {
    this.config = API_CONFIG.landmark || {
      nominatimUserAgent: 'WindowSeatAI/1.0',
      requestDelayMs: 1100,
      searchRadius: 50000,
    };
    this.lastRequestTime = 0;
  }

  /**
   * Rate limiter to comply with Nominatim usage policy (1 req/sec)
   */
  async rateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const delay = this.config.requestDelayMs;

    if (elapsed < delay) {
      await new Promise(resolve => setTimeout(resolve, delay - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Main method: Enrich all checkpoints with landmark data
   */
  async enrichCheckpoints(checkpoints, options = {}) {
    const { onProgress } = options;
    const enriched = [];

    console.log(`[LandmarkService] Enriching ${checkpoints.length} checkpoints...`);

    for (let i = 0; i < checkpoints.length; i++) {
      const checkpoint = checkpoints[i];

      try {
        if (onProgress) {
          onProgress(i + 1, checkpoints.length);
        }

        const landmark = await this.lookupLandmark(
          checkpoint.latitude,
          checkpoint.longitude
        );

        if (landmark) {
          console.log(`[LandmarkService] Checkpoint ${i}: "${checkpoint.name}" -> "${landmark.name}"`);
          enriched.push({
            ...checkpoint,
            name: landmark.name || checkpoint.name,
            landmark: landmark,
          });
        } else {
          console.log(`[LandmarkService] Checkpoint ${i}: No landmark found, keeping "${checkpoint.name}"`);
          enriched.push(checkpoint);
        }
      } catch (error) {
        console.warn(`[LandmarkService] Checkpoint ${i} lookup failed:`, error.message);
        enriched.push(checkpoint);
      }
    }

    console.log(`[LandmarkService] Enrichment complete`);
    return enriched;
  }

  /**
   * Look up landmark data for a single coordinate
   */
  async lookupLandmark(latitude, longitude) {
    // Get place name via reverse geocoding
    const geocodeResult = await this.reverseGeocode(latitude, longitude);

    // Query nearby POIs (skip if over ocean to avoid unnecessary API calls)
    const isOverOcean = this.isOverOcean(geocodeResult);
    const pois = isOverOcean ? [] : await this.queryNearbyPOIs(latitude, longitude, this.config.searchRadius);

    // Build landmark object
    const name = this.extractBestName(geocodeResult, pois);

    // If we couldn't find a good name, return null to keep original checkpoint name
    if (!name) {
      return null;
    }

    const landmark = {
      name: name,
      type: this.determineLocationType(geocodeResult, pois),
      category: this.determineCategory(geocodeResult, pois),
      region: geocodeResult?.address?.state || geocodeResult?.address?.region || null,
      country: geocodeResult?.address?.country || null,
      nearbyFeatures: pois.slice(0, 5).map(poi => ({
        name: poi.tags?.name || poi.tags?.natural || poi.tags?.tourism || 'Unknown',
        type: this.getPoiType(poi),
      })),
    };

    return landmark;
  }

  /**
   * Check if coordinates are over ocean based on geocode result
   */
  isOverOcean(geocodeResult) {
    if (!geocodeResult) return true;

    const address = geocodeResult.address || {};
    // If there's no country and no recognizable land features, it's likely ocean
    if (!address.country && !address.state && !address.county && !address.city) {
      return true;
    }

    // Check if the result type indicates water
    const waterTypes = ['ocean', 'sea', 'water', 'bay'];
    if (waterTypes.includes(geocodeResult.type)) {
      return true;
    }

    return false;
  }

  /**
   * Reverse geocode coordinates using Nominatim
   */
  async reverseGeocode(latitude, longitude) {
    await this.rateLimit();

    try {
      const url = `${NOMINATIM_URL}?lat=${latitude}&lon=${longitude}&format=json&zoom=10&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.nominatimUserAgent,
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.warn('Reverse geocoding failed:', error.message);
      return null;
    }
  }

  /**
   * Query nearby POIs using Overpass API
   */
  async queryNearbyPOIs(latitude, longitude, radius) {
    try {
      // Query for natural features, tourism attractions, and notable places
      const query = `
        [out:json][timeout:10];
        (
          node["natural"~"peak|mountain_range|volcano|cliff|ridge|valley|glacier|bay|beach|coastline"](around:${radius},${latitude},${longitude});
          node["tourism"~"attraction|viewpoint"](around:${radius},${latitude},${longitude});
          node["boundary"="national_park"](around:${radius},${latitude},${longitude});
          way["natural"~"water|river|lake|sea"](around:${radius},${latitude},${longitude});
          way["waterway"="river"](around:${radius},${latitude},${longitude});
          way["boundary"="national_park"](around:${radius},${latitude},${longitude});
          relation["boundary"="national_park"](around:${radius},${latitude},${longitude});
          relation["natural"="mountain_range"](around:${radius},${latitude},${longitude});
        );
        out tags center 10;
      `;

      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();

      // Filter and sort by relevance (prefer named features)
      const elements = (data.elements || [])
        .filter(el => el.tags?.name)
        .sort((a, b) => {
          // Prioritize national parks and major features
          const aScore = this.getRelevanceScore(a);
          const bScore = this.getRelevanceScore(b);
          return bScore - aScore;
        });

      return elements;
    } catch (error) {
      console.warn('POI query failed:', error.message);
      return [];
    }
  }

  /**
   * Score POI relevance for sorting
   */
  getRelevanceScore(poi) {
    const tags = poi.tags || {};
    let score = 0;

    if (tags.boundary === 'national_park') score += 100;
    if (tags.natural === 'peak') score += 80;
    if (tags.natural === 'mountain_range') score += 90;
    if (tags.natural === 'volcano') score += 85;
    if (tags.tourism === 'attraction') score += 70;
    if (tags.waterway === 'river' && tags.name) score += 60;
    if (tags.natural === 'lake' || tags.natural === 'water') score += 50;
    if (tags.name) score += 20;

    return score;
  }

  /**
   * Extract the best name from geocode result and POIs
   */
  extractBestName(geocodeResult, pois) {
    // Check for notable POI first (national park, major peak, etc.)
    const notablePoi = pois.find(poi =>
      poi.tags?.boundary === 'national_park' ||
      poi.tags?.natural === 'peak' ||
      poi.tags?.natural === 'mountain_range' ||
      poi.tags?.natural === 'volcano'
    );

    if (notablePoi?.tags?.name) {
      return notablePoi.tags.name;
    }

    // Fall back to geocoded city/county/region
    const address = geocodeResult?.address;
    if (address) {
      return address.city ||
             address.town ||
             address.village ||
             address.county ||
             address.state ||
             address.country ||
             null;
    }

    // Use first named POI
    if (pois.length > 0 && pois[0].tags?.name) {
      return pois[0].tags.name;
    }

    return null;
  }

  /**
   * Determine the primary location type
   */
  determineLocationType(geocodeResult, pois) {
    // Check POIs for specific types
    for (const poi of pois) {
      const tags = poi.tags || {};
      if (tags.boundary === 'national_park') return 'national_park';
      if (tags.natural === 'peak') return 'mountain_peak';
      if (tags.natural === 'mountain_range') return 'mountain_range';
      if (tags.natural === 'volcano') return 'volcano';
      if (tags.natural === 'glacier') return 'glacier';
      if (tags.waterway === 'river') return 'river';
      if (tags.natural === 'lake') return 'lake';
      if (tags.natural === 'bay') return 'bay';
      if (tags.natural === 'coastline') return 'coastline';
    }

    // Fall back to geocode category
    const category = geocodeResult?.category;
    if (category === 'natural') return geocodeResult?.type || 'natural_feature';
    if (category === 'boundary') return 'administrative';
    if (category === 'place') return geocodeResult?.type || 'settlement';

    return 'waypoint';
  }

  /**
   * Determine the broad category for the location
   */
  determineCategory(geocodeResult, pois) {
    for (const poi of pois) {
      const tags = poi.tags || {};
      if (tags.boundary === 'national_park' || tags.leisure === 'nature_reserve') {
        return 'protected_area';
      }
      if (tags.natural) return 'natural_feature';
      if (tags.waterway || tags.natural === 'water') return 'water_feature';
    }

    const category = geocodeResult?.category;
    if (category === 'natural') return 'natural_feature';
    if (category === 'place') return 'settlement';

    return 'general';
  }

  /**
   * Get the type string for a POI
   */
  getPoiType(poi) {
    const tags = poi.tags || {};

    if (tags.boundary === 'national_park') return 'national_park';
    if (tags.natural) return tags.natural;
    if (tags.waterway) return tags.waterway;
    if (tags.tourism) return tags.tourism;

    return 'feature';
  }
}

export const landmarkService = new LandmarkService();
export { LandmarkService };

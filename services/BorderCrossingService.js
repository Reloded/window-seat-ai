/**
 * BorderCrossingService - Detects when crossing country/state borders
 * Uses Nominatim reverse geocoding to determine current administrative region
 */

import { apiConfig } from '../config';

class BorderCrossingService {
  constructor() {
    this.currentRegion = null;
    this.lastCheckTime = 0;
    this.lastCheckPosition = null;
    this.checkIntervalMs = 30000; // Check every 30 seconds
    this.minDistanceKm = 5; // Or when moved 5km
    this.listeners = [];
    this.isChecking = false;
  }

  /**
   * Subscribe to border crossing events
   */
  onBorderCrossing(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify listeners of border crossing
   */
  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.warn('Border crossing listener error:', error);
      }
    });
  }

  /**
   * Check if enough time/distance has passed to warrant a new check
   */
  shouldCheck(latitude, longitude) {
    const now = Date.now();

    // Check if enough time has passed
    if (now - this.lastCheckTime < this.checkIntervalMs) {
      // But also check if we've moved significantly
      if (this.lastCheckPosition) {
        const dist = this.calculateDistance(
          this.lastCheckPosition.latitude,
          this.lastCheckPosition.longitude,
          latitude,
          longitude
        );
        if (dist < this.minDistanceKm) {
          return false;
        }
      } else {
        return false;
      }
    }

    return true;
  }

  /**
   * Update position and check for border crossings
   */
  async updatePosition(latitude, longitude) {
    if (!this.shouldCheck(latitude, longitude)) {
      return null;
    }

    if (this.isChecking) {
      return null;
    }

    this.isChecking = true;
    this.lastCheckTime = Date.now();
    this.lastCheckPosition = { latitude, longitude };

    try {
      const region = await this.reverseGeocode(latitude, longitude);

      if (!region) {
        this.isChecking = false;
        return null;
      }

      const crossing = this.detectCrossing(region);

      if (crossing) {
        this.notifyListeners(crossing);
      }

      this.currentRegion = region;
      this.isChecking = false;
      return crossing;
    } catch (error) {
      console.warn('Border check failed:', error.message);
      this.isChecking = false;
      return null;
    }
  }

  /**
   * Detect if we've crossed a border
   */
  detectCrossing(newRegion) {
    if (!this.currentRegion) {
      // First check - set initial region but don't alert
      return null;
    }

    const crossings = [];

    // Check country change
    if (newRegion.country &&
        this.currentRegion.country &&
        newRegion.countryCode !== this.currentRegion.countryCode) {
      crossings.push({
        type: 'country',
        from: {
          name: this.currentRegion.country,
          code: this.currentRegion.countryCode,
        },
        to: {
          name: newRegion.country,
          code: newRegion.countryCode,
        },
      });
    }

    // Check state/province change (only if same country or no country change)
    if (newRegion.state &&
        this.currentRegion.state &&
        newRegion.state !== this.currentRegion.state &&
        newRegion.countryCode === this.currentRegion.countryCode) {
      crossings.push({
        type: 'state',
        from: {
          name: this.currentRegion.state,
        },
        to: {
          name: newRegion.state,
        },
        country: newRegion.country,
      });
    }

    if (crossings.length === 0) {
      return null;
    }

    // Return most significant crossing (country > state)
    return crossings[0];
  }

  /**
   * Reverse geocode to get administrative regions
   */
  async reverseGeocode(latitude, longitude) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=5&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': apiConfig.landmark?.nominatimUserAgent || 'WindowSeatAI/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.address) {
      return null;
    }

    const address = data.address;

    return {
      country: address.country || null,
      countryCode: address.country_code?.toUpperCase() || null,
      state: address.state || address.province || address.region || null,
      county: address.county || null,
    };
  }

  /**
   * Get current region info
   */
  getCurrentRegion() {
    return this.currentRegion;
  }

  /**
   * Reset tracking (e.g., for new flight)
   */
  reset() {
    this.currentRegion = null;
    this.lastCheckTime = 0;
    this.lastCheckPosition = null;
  }

  /**
   * Calculate distance between two points in km
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Get flag emoji for country code
   */
  getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🌍';

    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));

    return String.fromCodePoint(...codePoints);
  }
}

export const borderCrossingService = new BorderCrossingService();
export { BorderCrossingService };

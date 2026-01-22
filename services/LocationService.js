import * as Location from 'expo-location';
import { EventEmitter } from './base';

// User-friendly error messages
const ERROR_MESSAGES = {
  PERMISSION_DENIED: 'Location access denied. Please enable location permissions in your device settings to track your flight.',
  PERMISSION_REQUEST_FAILED: 'Unable to request location permissions. Please check your device settings.',
  LOCATION_UNAVAILABLE: 'Unable to get your current location. Make sure GPS is enabled.',
  TRACKING_START_FAILED: 'Failed to start location tracking. Please try again.',
  TRACKING_ALREADY_ACTIVE: 'Location tracking is already active.',
  UNKNOWN: 'An unexpected location error occurred. Please try again.',
};

class LocationService extends EventEmitter {
  constructor() {
    super();
    this.watchSubscription = null;
    this.currentLocation = null;
    this.isTracking = false;
    this.permissionGranted = false;
    this.lastError = null;
    this._errorListeners = [];
    this.trackingOptions = {
      accuracy: 'high',
      distanceInterval: 1000,
      timeInterval: 5000,
    };
  }

  /**
   * Subscribe to error events
   * @param {Function} callback - Function to call with error object { code, message, details }
   * @returns {Function} Unsubscribe function
   */
  onError(callback) {
    if (typeof callback !== 'function') {
      throw new Error('onError requires a function');
    }
    this._errorListeners.push(callback);
    return () => {
      this._errorListeners = this._errorListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Emit error to all error listeners
   * @param {string} code - Error code
   * @param {Error} [originalError] - Original error object
   */
  _emitError(code, originalError = null) {
    const error = {
      code,
      message: ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN,
      details: originalError?.message || null,
      timestamp: new Date().toISOString(),
    };
    this.lastError = error;
    console.warn(`LocationService error [${code}]:`, error.message, originalError || '');
    this._errorListeners.forEach(callback => {
      try {
        callback(error);
      } catch (e) {
        console.warn('LocationService error listener threw:', e);
      }
    });
  }

  /**
   * Get the last error that occurred
   */
  getLastError() {
    return this.lastError;
  }

  /**
   * Clear the last error
   */
  clearError() {
    this.lastError = null;
  }

  updateTrackingOptions(options) {
    this.trackingOptions = {
      ...this.trackingOptions,
      ...options,
    };
  }

  getTrackingOptions() {
    return { ...this.trackingOptions };
  }

  getLocationAccuracy(accuracy) {
    switch (accuracy) {
      case 'high':
        return Location.Accuracy.High;
      case 'balanced':
        return Location.Accuracy.Balanced;
      case 'low':
        return Location.Accuracy.Low;
      default:
        return Location.Accuracy.High;
    }
  }

  async requestPermissions() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.permissionGranted = status === 'granted';
      if (!this.permissionGranted) {
        this._emitError('PERMISSION_DENIED');
      }
      return this.permissionGranted;
    } catch (error) {
      this._emitError('PERMISSION_REQUEST_FAILED', error);
      return false;
    }
  }

  async getCurrentPosition() {
    try {
      if (!this.permissionGranted) {
        const granted = await this.requestPermissions();
        if (!granted) {
          return null;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      this.currentLocation = location;
      this.clearError();
      return location;
    } catch (error) {
      this._emitError('LOCATION_UNAVAILABLE', error);
      return null;
    }
  }

  async startTracking(options = {}) {
    if (this.isTracking) {
      console.log('LocationService: Tracking already active');
      return { success: true, alreadyActive: true };
    }

    try {
      if (!this.permissionGranted) {
        const granted = await this.requestPermissions();
        if (!granted) {
          return { success: false, error: this.lastError };
        }
      }

      // Merge stored settings with provided options
      const mergedOptions = { ...this.trackingOptions, ...options };

      const trackingOptions = {
        accuracy: this.getLocationAccuracy(mergedOptions.accuracy),
        distanceInterval: mergedOptions.distanceInterval || 500, // meters
        timeInterval: mergedOptions.timeInterval || 5000, // ms
      };

      this.watchSubscription = await Location.watchPositionAsync(
        trackingOptions,
        (location) => {
          this.currentLocation = location;
          this.clearError();
          this.emit(location);
        }
      );

      this.isTracking = true;
      console.log('LocationService: Tracking started successfully');
      return { success: true };
    } catch (error) {
      this._emitError('TRACKING_START_FAILED', error);
      return { success: false, error: this.lastError };
    }
  }

  stopTracking() {
    try {
      if (this.watchSubscription) {
        // expo-location subscriptions have a remove() method
        if (typeof this.watchSubscription.remove === 'function') {
          this.watchSubscription.remove();
        } else if (typeof this.watchSubscription === 'function') {
          // Some platforms return an unsubscribe function directly
          this.watchSubscription();
        }
        this.watchSubscription = null;
      }
      this.isTracking = false;
      console.log('LocationService: Tracking stopped');
      return { success: true };
    } catch (error) {
      // Silently handle - expo-location web has internal cleanup issues
      this.isTracking = false;
      this.watchSubscription = null;
      return { success: true }; // Still consider it stopped
    }
  }

  getLocation() {
    return this.currentLocation;
  }

  isActive() {
    return this.isTracking;
  }
}

// Export singleton instance
export const locationService = new LocationService();

// Export class for testing
export { LocationService };

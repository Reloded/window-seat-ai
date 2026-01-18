import * as Location from 'expo-location';
import { EventEmitter } from './base';

class LocationService extends EventEmitter {
  constructor() {
    super();
    this.watchSubscription = null;
    this.currentLocation = null;
    this.isTracking = false;
    this.permissionGranted = false;
    this.trackingOptions = {
      accuracy: 'high',
      distanceInterval: 1000,
      timeInterval: 5000,
    };
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
    const { status } = await Location.requestForegroundPermissionsAsync();
    this.permissionGranted = status === 'granted';
    return this.permissionGranted;
  }

  async getCurrentPosition() {
    if (!this.permissionGranted) {
      const granted = await this.requestPermissions();
      if (!granted) {
        throw new Error('Location permission denied');
      }
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    this.currentLocation = location;
    return location;
  }

  async startTracking(options = {}) {
    if (this.isTracking) {
      return;
    }

    if (!this.permissionGranted) {
      const granted = await this.requestPermissions();
      if (!granted) {
        throw new Error('Location permission denied');
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
        this.emit(location);
      }
    );

    this.isTracking = true;
  }

  stopTracking() {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
    this.isTracking = false;
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

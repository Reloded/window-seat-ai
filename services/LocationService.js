import * as Location from 'expo-location';

class LocationService {
  constructor() {
    this.watchSubscription = null;
    this.listeners = [];
    this.currentLocation = null;
    this.isTracking = false;
    this.permissionGranted = false;
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

    const trackingOptions = {
      accuracy: Location.Accuracy.High,
      distanceInterval: options.distanceInterval || 500, // meters
      timeInterval: options.timeInterval || 5000, // ms
    };

    this.watchSubscription = await Location.watchPositionAsync(
      trackingOptions,
      (location) => {
        this.currentLocation = location;
        this.notifyListeners(location);
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

  subscribe(callback) {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(location) {
    this.listeners.forEach(callback => callback(location));
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

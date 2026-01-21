import { useState, useEffect, useCallback, useRef } from 'react';
import { locationService } from '../services/LocationService';
import { checkGeofences } from '../utils/geofence';

export function useLocationTracking(options = {}) {
  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [triggeredCheckpoints, setTriggeredCheckpoints] = useState(new Set());

  const triggeredCheckpointsRef = useRef(new Set());
  const checkpointsRef = useRef(options.checkpoints || []);

  // Update checkpoints ref when they change
  useEffect(() => {
    checkpointsRef.current = options.checkpoints || [];
  }, [options.checkpoints]);

  // Subscribe to error events from LocationService
  useEffect(() => {
    const unsubscribeError = locationService.onError((err) => {
      setError(err.message);
    });
    return unsubscribeError;
  }, []);

  // Request permissions on mount
  useEffect(() => {
    async function initPermissions() {
      const granted = await locationService.requestPermissions();
      setPermissionGranted(granted);
      // Error is now set via onError subscription
    }
    initPermissions();
  }, []);

  // Subscribe to location updates
  useEffect(() => {
    const unsubscribe = locationService.subscribe((newLocation) => {
      setLocation(newLocation);

      // Check geofences if we have checkpoints
      if (checkpointsRef.current.length > 0 && options.onCheckpointEntered) {
        const newlyTriggered = checkGeofences(
          newLocation.coords.latitude,
          newLocation.coords.longitude,
          checkpointsRef.current,
          triggeredCheckpointsRef.current
        );

        newlyTriggered.forEach(checkpoint => {
          triggeredCheckpointsRef.current.add(checkpoint.id);
          setTriggeredCheckpoints(new Set(triggeredCheckpointsRef.current));
          options.onCheckpointEntered(checkpoint);
        });
      }
    });

    return unsubscribe;
  }, [options.onCheckpointEntered]);

  const getCurrentPosition = useCallback(async () => {
    setError(null);
    locationService.clearError();
    const loc = await locationService.getCurrentPosition();
    if (loc) {
      setLocation(loc);
    }
    // Error is set via onError subscription if location is null
    return loc;
  }, []);

  const startTracking = useCallback(async (trackingOptions = {}) => {
    setError(null);
    locationService.clearError();
    const result = await locationService.startTracking({
      distanceInterval: trackingOptions.distanceInterval || options.distanceInterval || 500,
      timeInterval: trackingOptions.timeInterval || options.timeInterval || 5000,
    });
    if (result.success) {
      setIsTracking(true);
    }
    // Error is set via onError subscription if failed
    return result;
  }, [options.distanceInterval, options.timeInterval]);

  const stopTracking = useCallback(() => {
    locationService.stopTracking();
    setIsTracking(false);
  }, []);

  const resetTriggeredCheckpoints = useCallback(() => {
    triggeredCheckpointsRef.current.clear();
    setTriggeredCheckpoints(new Set());
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    locationService.clearError();
  }, []);

  return {
    location,
    isTracking,
    error,
    permissionGranted,
    triggeredCheckpoints,
    getCurrentPosition,
    startTracking,
    stopTracking,
    resetTriggeredCheckpoints,
    clearError,
  };
}

export default useLocationTracking;

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

  // Request permissions on mount
  useEffect(() => {
    async function initPermissions() {
      try {
        const granted = await locationService.requestPermissions();
        setPermissionGranted(granted);
        if (!granted) {
          setError('Location permission denied. Enable it in settings.');
        }
      } catch (err) {
        setError(err.message);
      }
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
    try {
      setError(null);
      const loc = await locationService.getCurrentPosition();
      setLocation(loc);
      return loc;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const startTracking = useCallback(async (trackingOptions = {}) => {
    try {
      setError(null);
      await locationService.startTracking({
        distanceInterval: trackingOptions.distanceInterval || options.distanceInterval || 500,
        timeInterval: trackingOptions.timeInterval || options.timeInterval || 5000,
      });
      setIsTracking(true);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [options.distanceInterval, options.timeInterval]);

  const stopTracking = useCallback(() => {
    locationService.stopTracking();
    setIsTracking(false);
  }, []);

  const resetTriggeredCheckpoints = useCallback(() => {
    triggeredCheckpointsRef.current.clear();
    setTriggeredCheckpoints(new Set());
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
  };
}

export default useLocationTracking;

import React, { useMemo, useRef, useEffect, useState, Component } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Polyline, Circle, Marker } from 'react-native-maps';
import NetInfo from '@react-native-community/netinfo';
import { COLORS, SIZES } from './mapStyles';
import { StaticFlightMap } from './StaticFlightMap';
import { mapTileService } from '../../services/MapTileService';

// Error boundary for map component
class MapErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Map error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ height: 200, backgroundColor: '#1a2a3a', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
          <Text style={{ color: '#00d4ff', fontSize: 16 }}>Map unavailable</Text>
          <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>Route loaded - map will show when online</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export function FlightMap({
  route = [],
  checkpoints = [],
  location = null,
  triggeredCheckpoints = new Set(),
  isExpanded = false,
  onToggleExpand = () => {},
  flightId = null,
  offlineMapsEnabled = true,
  style = {},
}) {
  const mapRef = useRef(null);
  const [isOffline, setIsOffline] = useState(false);
  const [hasOfflineMaps, setHasOfflineMaps] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Monitor network connectivity - with error handling
  useEffect(() => {
    let unsubscribe = null;

    try {
      unsubscribe = NetInfo.addEventListener((state) => {
        try {
          setIsOffline(!state?.isConnected);
        } catch (e) {
          console.warn('NetInfo state error:', e);
        }
      });

      // Initial check
      NetInfo.fetch().then((state) => {
        try {
          setIsOffline(!state?.isConnected);
        } catch (e) {
          console.warn('NetInfo fetch error:', e);
        }
      }).catch((e) => {
        console.warn('NetInfo fetch failed:', e);
      });
    } catch (e) {
      console.warn('NetInfo setup failed:', e);
    }

    return () => {
      try {
        if (unsubscribe) unsubscribe();
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, []);

  // Check for offline maps availability
  useEffect(() => {
    let mounted = true;

    const checkOfflineMaps = async () => {
      if (!flightId) {
        setHasOfflineMaps(false);
        return;
      }

      try {
        const has = await mapTileService.hasOfflineMaps(flightId);
        if (mounted) {
          setHasOfflineMaps(has);
        }
      } catch (error) {
        console.warn('Error checking offline maps:', error);
        if (mounted) {
          setHasOfflineMaps(false);
        }
      }
    };

    checkOfflineMaps();

    return () => {
      mounted = false;
    };
  }, [flightId]);

  // Use static map when offline and offline maps are available
  const useStaticMap = isOffline && hasOfflineMaps && offlineMapsEnabled;

  // Convert route to react-native-maps format
  const routeCoordinates = useMemo(() => {
    return route.map(point => ({
      latitude: point.latitude,
      longitude: point.longitude,
    }));
  }, [route]);

  // Calculate initial region
  const initialRegion = useMemo(() => {
    if (route.length === 0) {
      return {
        latitude: 40,
        longitude: -40,
        latitudeDelta: 60,
        longitudeDelta: 60,
      };
    }

    const lats = route.map(p => p.latitude);
    const lngs = route.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = (maxLat - minLat) * 1.3 || 10;
    const lngDelta = (maxLng - minLng) * 1.3 || 10;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(latDelta, 1),
      longitudeDelta: Math.max(lngDelta, 1),
    };
  }, [route]);

  // User position
  const userPosition = useMemo(() => {
    if (!location?.coords) return null;
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  }, [location]);

  // Fit map to route when it changes
  useEffect(() => {
    if (mapRef.current && route.length > 1 && !useStaticMap) {
      const coordinates = route.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }));
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [route, useStaticMap]);

  // On Android, Google Maps requires an API key - but let's try rendering anyway
  // The map component will handle errors gracefully via the error boundary
  const googleMapsKeyMissing = false; // Let it try - error boundary will catch failures

  // Show fallback if map errored or Google Maps key missing on Android
  if (mapError || googleMapsKeyMissing) {
    return (
      <View style={[styles.container, styles.collapsed, style]}>
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackText}>
            {googleMapsKeyMissing ? 'Map requires setup' : 'Map unavailable'}
          </Text>
          <Text style={styles.fallbackSubtext}>
            {route.length > 0 ? `${route.length} route points loaded` : 'Route will show on web'}
          </Text>
          {googleMapsKeyMissing && (
            <Text style={styles.fallbackHint}>Add Google Maps API key for native maps</Text>
          )}
        </View>
      </View>
    );
  }

  // Render static map when offline
  if (useStaticMap) {
    try {
      return (
        <StaticFlightMap
          flightId={flightId}
          route={route}
          location={location}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          style={style}
        />
      );
    } catch (e) {
      console.error('StaticFlightMap error:', e);
      setMapError(true);
      return null;
    }
  }

  return (
    <MapErrorBoundary>
    <View style={[
      styles.container,
      isExpanded ? styles.expanded : styles.collapsed,
      style
    ]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        mapType="standard"
        showsUserLocation={false}
        showsCompass={true}
        showsScale={true}
        rotateEnabled={true}
        pitchEnabled={false}
      >
        {/* Route polyline */}
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={COLORS.routeLine}
            strokeWidth={SIZES.routeLineWeight}
          />
        )}

        {/* Checkpoint markers with geofence circles */}
        {checkpoints.filter(Boolean).map((checkpoint, index) => {
          if (!checkpoint?.latitude || !checkpoint?.longitude) return null;
          const coordinate = {
            latitude: checkpoint.latitude,
            longitude: checkpoint.longitude,
          };
          const isTriggered = triggeredCheckpoints.has(checkpoint.id) ||
                              triggeredCheckpoints.has(index);
          const geofenceRadius = checkpoint.radius || 10000;

          return (
            <React.Fragment key={checkpoint.id || index}>
              {/* Geofence circle */}
              <Circle
                center={coordinate}
                radius={geofenceRadius}
                fillColor="rgba(0, 212, 255, 0.15)"
                strokeColor="rgba(0, 212, 255, 0.5)"
                strokeWidth={SIZES.geofenceStrokeWeight}
              />
              {/* Checkpoint marker */}
              <Marker
                coordinate={coordinate}
                title={checkpoint.name}
                description={checkpoint.landmark?.type?.replace(/_/g, ' ') || ''}
                pinColor={isTriggered ? COLORS.checkpointTriggered : COLORS.checkpointUntriggered}
              />
            </React.Fragment>
          );
        })}

        {/* User location marker */}
        {userPosition && (
          <Marker
            coordinate={userPosition}
            title="Your Location"
          >
            <View style={styles.userMarker}>
              <View style={styles.userMarkerInner} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Expand/Collapse button */}
      <TouchableOpacity
        style={styles.expandButton}
        onPress={onToggleExpand}
      >
        <Text style={styles.expandButtonText}>
          {isExpanded ? '✕' : '⤢'}
        </Text>
      </TouchableOpacity>
    </View>
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
    position: 'relative',
  },
  collapsed: {
    height: SIZES.collapsedHeight,
  },
  expanded: {
    flex: 1,
    minHeight: SIZES.expandedMinHeight,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  expandButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(10, 22, 40, 0.85)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: COLORS.cyan,
  },
  expandButtonText: {
    color: COLORS.cyan,
    fontSize: 16,
    fontWeight: 'bold',
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 212, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.cyan,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a2a3a',
  },
  fallbackText: {
    color: '#00d4ff',
    fontSize: 16,
    fontWeight: '600',
  },
  fallbackSubtext: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  fallbackHint: {
    color: '#555',
    fontSize: 10,
    marginTop: 8,
    fontStyle: 'italic',
  },
});

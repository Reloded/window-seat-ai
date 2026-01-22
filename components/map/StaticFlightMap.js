import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import { mapTileService } from '../../services/MapTileService';
import { COLORS, SIZES } from './mapStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Map zoom levels to static map names
const ZOOM_TO_MAP = {
  overview: { minZoom: 0, maxZoom: 4 },
  regional: { minZoom: 4, maxZoom: 7 },
  detail: { minZoom: 7, maxZoom: 10 },
};

export function StaticFlightMap({
  flightId,
  route = [],
  location = null,
  isExpanded = false,
  onToggleExpand = () => {},
  style = {},
}) {
  const [mapPaths, setMapPaths] = useState({});
  const [metadata, setMetadata] = useState(null);
  const [currentZoom, setCurrentZoom] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Animation values for pan/zoom
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const lastScale = useRef(1);
  const lastPan = useRef({ x: 0, y: 0 });

  // Load static map paths
  useEffect(() => {
    let mounted = true;

    const loadMaps = async () => {
      if (!flightId) {
        setError('No flight ID provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const meta = await mapTileService.getStaticMapMetadata(flightId);

        if (!mounted) return;

        if (!meta) {
          setError('No offline maps available');
          setIsLoading(false);
          return;
        }

        setMetadata(meta);

        // Load paths for each available map
        const paths = {};
        for (const mapName of ['overview', 'regional', 'detail']) {
          const path = await mapTileService.getStaticMapPath(flightId, mapName);
          if (path) {
            paths[mapName] = path;
          }
        }

        if (mounted) {
          setMapPaths(paths);
          // Start with overview if available, otherwise first available
          const firstAvailable = paths.overview
            ? 'overview'
            : Object.keys(paths)[0] || 'overview';
          setCurrentZoom(firstAvailable);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load static maps:', err);
        if (mounted) {
          setError('Failed to load offline maps');
          setIsLoading(false);
        }
      }
    };

    loadMaps();

    return () => {
      mounted = false;
    };
  }, [flightId]);

  // Pan responder for gestures
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: () => {
          // Store current values
          lastPan.current = {
            x: pan.x._value,
            y: pan.y._value,
          };
        },

        onPanResponderMove: (event, gestureState) => {
          // Handle pan
          pan.setValue({
            x: lastPan.current.x + gestureState.dx,
            y: lastPan.current.y + gestureState.dy,
          });
        },

        onPanResponderRelease: () => {
          // Snap back if out of bounds
          // For simplicity, just keep current position
        },
      }),
    []
  );

  // Cycle through zoom levels on double tap
  const handleDoubleTap = () => {
    const zoomOrder = ['overview', 'regional', 'detail'];
    const currentIndex = zoomOrder.indexOf(currentZoom);
    const nextIndex = (currentIndex + 1) % zoomOrder.length;
    const nextZoom = zoomOrder[nextIndex];

    if (mapPaths[nextZoom]) {
      setCurrentZoom(nextZoom);
      // Reset pan and scale on zoom change
      pan.setValue({ x: 0, y: 0 });
      scale.setValue(1);
      lastScale.current = 1;
      lastPan.current = { x: 0, y: 0 };
    }
  };

  // Calculate user position on the static map
  const userPositionStyle = useMemo(() => {
    if (!location?.coords || !metadata?.bounds) return null;

    const { latitude, longitude } = location.coords;
    const { north, south, east, west } = metadata.bounds;

    // Check if user is within bounds
    if (
      latitude < south ||
      latitude > north ||
      longitude < west ||
      longitude > east
    ) {
      return null;
    }

    // Calculate relative position (0-1)
    const relX = (longitude - west) / (east - west);
    const relY = (north - latitude) / (north - south);

    return {
      left: `${relX * 100}%`,
      top: `${relY * 100}%`,
    };
  }, [location, metadata]);

  // Render loading state
  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          isExpanded ? styles.expanded : styles.collapsed,
          styles.centerContent,
          style,
        ]}
      >
        <Text style={styles.loadingText}>Loading offline maps...</Text>
      </View>
    );
  }

  // Render error state
  if (error || Object.keys(mapPaths).length === 0) {
    return (
      <View
        style={[
          styles.container,
          isExpanded ? styles.expanded : styles.collapsed,
          styles.centerContent,
          style,
        ]}
      >
        <Text style={styles.errorText}>{error || 'No offline maps available'}</Text>
        <Text style={styles.hintText}>Download a flight pack for offline maps</Text>
      </View>
    );
  }

  const currentMapPath = mapPaths[currentZoom];

  return (
    <View
      style={[
        styles.container,
        isExpanded ? styles.expanded : styles.collapsed,
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.mapWrapper,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scale },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleDoubleTap}
          style={styles.touchableMap}
        >
          {currentMapPath && (
            <Image
              source={{ uri: currentMapPath }}
              style={styles.mapImage}
              resizeMode="contain"
            />
          )}

          {/* User location marker */}
          {userPositionStyle && (
            <View style={[styles.userMarkerContainer, userPositionStyle]}>
              <View style={styles.userMarker}>
                <View style={styles.userMarkerInner} />
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Zoom level indicator */}
      <View style={styles.zoomIndicator}>
        {['overview', 'regional', 'detail'].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.zoomButton,
              currentZoom === level && styles.zoomButtonActive,
              !mapPaths[level] && styles.zoomButtonDisabled,
            ]}
            onPress={() => mapPaths[level] && setCurrentZoom(level)}
            disabled={!mapPaths[level]}
          >
            <Text
              style={[
                styles.zoomButtonText,
                currentZoom === level && styles.zoomButtonTextActive,
                !mapPaths[level] && styles.zoomButtonTextDisabled,
              ]}
            >
              {level.charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Offline indicator */}
      <View style={styles.offlineIndicator}>
        <Text style={styles.offlineText}>OFFLINE</Text>
      </View>

      {/* Expand/Collapse button */}
      <TouchableOpacity style={styles.expandButton} onPress={onToggleExpand}>
        <Text style={styles.expandButtonText}>{isExpanded ? '✕' : '⤢'}</Text>
      </TouchableOpacity>
    </View>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  touchableMap: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  mapImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  userMarkerContainer: {
    position: 'absolute',
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.userLocationHalo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.userLocationFill,
    borderWidth: 2,
    borderColor: COLORS.userLocationStroke,
  },
  zoomIndicator: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 22, 40, 0.85)',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  zoomButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  zoomButtonActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.3)',
  },
  zoomButtonDisabled: {
    opacity: 0.3,
  },
  zoomButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  zoomButtonTextActive: {
    color: COLORS.cyan,
  },
  zoomButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  offlineIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 60,
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.5)',
  },
  offlineText: {
    color: '#FFA500',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
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
  loadingText: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.6,
  },
  errorText: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.6,
  },
  hintText: {
    color: COLORS.white,
    fontSize: 12,
    opacity: 0.4,
    marginTop: 8,
  },
});

export default StaticFlightMap;

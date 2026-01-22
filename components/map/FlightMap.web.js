import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { MapContainer, TileLayer, Polyline, Circle, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { COLORS, SIZES, MAP_TILES, containerStyles } from './mapStyles';
import { getCheckpointIcon, getUserLocationIcon, markerStyles } from './CheckpointMarker';
import { CachedTileLayer, useOfflineMapStatus } from './CachedTileLayer.web';

// Inject marker styles into document head
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = markerStyles;
  document.head.appendChild(styleElement);
}

// Component to handle map view updates when props change
function MapUpdater({ route, location }) {
  const map = useMap();

  useEffect(() => {
    if (route && route.length > 0) {
      const bounds = route.map(point => [point.latitude, point.longitude]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [map, route]);

  useEffect(() => {
    // Optionally pan to user location when tracking starts
    if (location?.coords) {
      // Don't auto-pan to avoid disrupting user view
      // map.panTo([location.coords.latitude, location.coords.longitude]);
    }
  }, [map, location]);

  return null;
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
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  const { hasOfflineMaps } = useOfflineMapStatus(flightId);

  // Monitor online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Convert route to Leaflet format [lat, lng]
  const routePositions = useMemo(() => {
    return route.map(point => [point.latitude, point.longitude]);
  }, [route]);

  // Calculate initial center and zoom
  const initialView = useMemo(() => {
    if (route.length === 0) {
      return { center: [40, -40], zoom: 3 };
    }

    // Center on the midpoint of the route
    const latSum = route.reduce((sum, p) => sum + p.latitude, 0);
    const lngSum = route.reduce((sum, p) => sum + p.longitude, 0);
    const center = [latSum / route.length, lngSum / route.length];

    return { center, zoom: 4 };
  }, [route]);

  // User position for marker
  const userPosition = useMemo(() => {
    if (!location?.coords) return null;
    return [location.coords.latitude, location.coords.longitude];
  }, [location]);

  // Don't render on non-web platforms for now
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.placeholderContainer, isExpanded ? styles.expanded : styles.collapsed, style]}>
        <Text style={styles.placeholderText}>Map view is available on web only</Text>
        <Text style={styles.placeholderSubtext}>For native maps, use react-native-maps</Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      isExpanded ? styles.expanded : styles.collapsed,
      style
    ]}>
      <MapContainer
        ref={mapRef}
        center={initialView.center}
        zoom={initialView.zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        {offlineMapsEnabled && flightId ? (
          <CachedTileLayer
            url={MAP_TILES.dark.url}
            attribution={MAP_TILES.dark.attribution}
            flightId={flightId}
            cacheEnabled={true}
            cacheOnFetch={false}
          />
        ) : (
          <TileLayer
            url={MAP_TILES.dark.url}
            attribution={MAP_TILES.dark.attribution}
          />
        )}

        <MapUpdater route={route} location={location} />

        {/* Route polyline */}
        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            color={COLORS.routeLine}
            weight={SIZES.routeLineWeight}
            opacity={0.8}
          />
        )}

        {/* Checkpoint markers with geofence circles */}
        {checkpoints.map((checkpoint, index) => {
          const position = [checkpoint.latitude, checkpoint.longitude];
          const isTriggered = triggeredCheckpoints.has(checkpoint.id) ||
                              triggeredCheckpoints.has(index);
          const geofenceRadius = checkpoint.radius || 10000; // Default 10km

          return (
            <React.Fragment key={checkpoint.id || index}>
              {/* Geofence circle */}
              <Circle
                center={position}
                radius={geofenceRadius}
                fillColor={COLORS.geofenceFill}
                fillOpacity={0.3}
                color={COLORS.geofenceStroke}
                weight={SIZES.geofenceStrokeWeight}
              />
              {/* Checkpoint marker */}
              <Marker
                position={position}
                icon={getCheckpointIcon(checkpoint, isTriggered)}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                  <div style={{ fontFamily: 'system-ui', fontSize: '13px' }}>
                    <strong>{checkpoint.name}</strong>
                    {checkpoint.landmark?.type && (
                      <div style={{ color: '#666', fontSize: '11px' }}>
                        {checkpoint.landmark.type.replace(/_/g, ' ')}
                      </div>
                    )}
                    {checkpoint.landmark?.region && (
                      <div style={{ color: '#888', fontSize: '11px' }}>
                        {checkpoint.landmark.region}
                        {checkpoint.landmark.country && `, ${checkpoint.landmark.country}`}
                      </div>
                    )}
                  </div>
                </Tooltip>
                {checkpoint.narration && (
                  <Popup>
                    <div style={{ maxWidth: '250px', fontFamily: 'system-ui' }}>
                      <strong style={{ fontSize: '14px' }}>{checkpoint.name}</strong>
                      {checkpoint.landmark?.type && (
                        <div style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
                          {checkpoint.landmark.type.replace(/_/g, ' ')}
                          {checkpoint.landmark?.region && ` • ${checkpoint.landmark.region}`}
                        </div>
                      )}
                      <p style={{ fontSize: '13px', lineHeight: '1.4', margin: 0 }}>
                        {checkpoint.narration}
                      </p>
                    </div>
                  </Popup>
                )}
              </Marker>
            </React.Fragment>
          );
        })}

        {/* User location marker */}
        {userPosition && (
          <Marker
            position={userPosition}
            icon={getUserLocationIcon()}
            zIndexOffset={1000}
          />
        )}
      </MapContainer>

      {/* Offline indicator */}
      {isOffline && hasOfflineMaps && (
        <View style={styles.offlineIndicator}>
          <Text style={styles.offlineText}>OFFLINE</Text>
        </View>
      )}

      {/* Expand/Collapse button */}
      <TouchableOpacity
        style={styles.expandButton}
        onPress={onToggleExpand}
      >
        <Text style={styles.expandButtonText}>
          {isExpanded ? '\u2715' : '\u2922'}
        </Text>
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
  placeholderContainer: {
    backgroundColor: 'rgba(10, 22, 40, 0.5)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  placeholderText: {
    color: COLORS.white,
    fontSize: 16,
    opacity: 0.6,
  },
  placeholderSubtext: {
    color: COLORS.white,
    fontSize: 12,
    opacity: 0.4,
    marginTop: 4,
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
});

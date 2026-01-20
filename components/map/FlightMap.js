import React, { useMemo, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import MapView, { Polyline, Circle, Marker } from 'react-native-maps';
import { COLORS, SIZES } from './mapStyles';

export function FlightMap({
  route = [],
  checkpoints = [],
  location = null,
  triggeredCheckpoints = new Set(),
  isExpanded = false,
  onToggleExpand = () => {},
  style = {},
}) {
  const mapRef = useRef(null);

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
    if (mapRef.current && route.length > 1) {
      const coordinates = route.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }));
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [route]);

  return (
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
        {checkpoints.map((checkpoint, index) => {
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
});

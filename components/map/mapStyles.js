// Map styling constants matching app theme

export const COLORS = {
  // Primary colors
  cyan: '#00d4ff',
  green: '#00ff88',
  white: '#ffffff',
  background: '#0a1628',

  // Route line
  routeLine: '#00d4ff',

  // Checkpoint states
  checkpointUntriggered: '#00d4ff',
  checkpointTriggered: '#00ff88',
  departure: '#00ff88',
  arrival: '#00ff88',

  // Geofence
  geofenceFill: 'rgba(0, 212, 255, 0.2)',
  geofenceStroke: 'rgba(0, 212, 255, 0.6)',

  // User location
  userLocationFill: '#ffffff',
  userLocationStroke: '#00d4ff',
  userLocationHalo: 'rgba(0, 212, 255, 0.3)',
};

export const SIZES = {
  // Route line
  routeLineWeight: 3,

  // Markers
  checkpointRadius: 8,
  departureArrivalRadius: 12,
  userLocationRadius: 10,
  userLocationHaloRadius: 20,

  // Geofence
  geofenceStrokeWeight: 2,

  // Map dimensions
  collapsedHeight: 200,
  expandedMinHeight: 400,
};

export const MAP_TILES = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};

export const containerStyles = {
  mapContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
  },
  mapContainerCollapsed: {
    height: SIZES.collapsedHeight,
  },
  mapContainerExpanded: {
    flex: 1,
    minHeight: SIZES.expandedMinHeight,
  },
  expandButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(10, 22, 40, 0.8)',
    borderRadius: 8,
    padding: 8,
    zIndex: 1000,
  },
  expandButtonText: {
    color: COLORS.cyan,
    fontSize: 18,
  },
};

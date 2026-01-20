import {
  calculateDistance,
  isWithinGeofence,
  findNearbyCheckpoints,
  checkGeofences,
  calculateBearing,
  bearingToCompass,
  calculateRouteDistance,
  interpolatePosition,
  Checkpoint,
  Coordinate,
} from '../utils/geofence';

describe('calculateDistance', () => {
  it('should return 0 for same coordinates', () => {
    const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
    expect(distance).toBe(0);
  });

  it('should calculate distance between NYC and LA (approx 3940 km)', () => {
    // New York City
    const nycLat = 40.7128;
    const nycLon = -74.006;
    // Los Angeles
    const laLat = 34.0522;
    const laLon = -118.2437;

    const distance = calculateDistance(nycLat, nycLon, laLat, laLon);
    // Distance should be approximately 3940 km (3,940,000 meters)
    expect(distance).toBeGreaterThan(3900000);
    expect(distance).toBeLessThan(4000000);
  });

  it('should calculate distance between London and Paris (approx 344 km)', () => {
    // London
    const londonLat = 51.5074;
    const londonLon = -0.1278;
    // Paris
    const parisLat = 48.8566;
    const parisLon = 2.3522;

    const distance = calculateDistance(londonLat, londonLon, parisLat, parisLon);
    // Distance should be approximately 344 km
    expect(distance).toBeGreaterThan(340000);
    expect(distance).toBeLessThan(350000);
  });
});

describe('isWithinGeofence', () => {
  const checkpoint: Checkpoint = {
    id: 'test-1',
    name: 'Test Checkpoint',
    latitude: 40.7128,
    longitude: -74.006,
    radius: 1000, // 1km radius
  };

  it('should return true when exactly at checkpoint', () => {
    expect(isWithinGeofence(40.7128, -74.006, checkpoint)).toBe(true);
  });

  it('should return true when within radius', () => {
    // About 500m north of checkpoint
    expect(isWithinGeofence(40.7173, -74.006, checkpoint)).toBe(true);
  });

  it('should return false when outside radius', () => {
    // About 2km north of checkpoint
    expect(isWithinGeofence(40.7308, -74.006, checkpoint)).toBe(false);
  });
});

describe('findNearbyCheckpoints', () => {
  const checkpoints: Checkpoint[] = [
    { id: '1', name: 'Near', latitude: 40.713, longitude: -74.006, radius: 500 },
    { id: '2', name: 'Medium', latitude: 40.72, longitude: -74.006, radius: 500 },
    { id: '3', name: 'Far', latitude: 40.8, longitude: -74.006, radius: 500 },
  ];

  it('should return checkpoints sorted by distance', () => {
    const nearby = findNearbyCheckpoints(40.7128, -74.006, checkpoints, 5000);
    expect(nearby.length).toBe(2); // 'Far' is ~10km away, outside 5km radius
    expect(nearby[0].name).toBe('Near');
    expect(nearby[1].name).toBe('Medium');
  });

  it('should include distance property', () => {
    const nearby = findNearbyCheckpoints(40.7128, -74.006, checkpoints, 50000);
    nearby.forEach(cp => {
      expect(cp.distance).toBeDefined();
      expect(typeof cp.distance).toBe('number');
    });
  });

  it('should filter by maxRadius', () => {
    const nearby = findNearbyCheckpoints(40.7128, -74.006, checkpoints, 100);
    expect(nearby.length).toBe(1); // Only 'Near' is within 100m
  });
});

describe('checkGeofences', () => {
  const checkpoints: Checkpoint[] = [
    { id: '1', name: 'Checkpoint 1', latitude: 40.7128, longitude: -74.006, radius: 1000 },
    { id: '2', name: 'Checkpoint 2', latitude: 40.7128, longitude: -74.006, radius: 1000 },
    { id: '3', name: 'Checkpoint 3', latitude: 50.0, longitude: -74.006, radius: 1000 },
  ];

  it('should return newly triggered checkpoints', () => {
    const triggered = checkGeofences(40.7128, -74.006, checkpoints);
    expect(triggered.length).toBe(2);
    expect(triggered.map(c => c.id)).toContain('1');
    expect(triggered.map(c => c.id)).toContain('2');
  });

  it('should not return already triggered checkpoints', () => {
    const alreadyTriggered = new Set(['1']);
    const triggered = checkGeofences(40.7128, -74.006, checkpoints, alreadyTriggered);
    expect(triggered.length).toBe(1);
    expect(triggered[0].id).toBe('2');
  });

  it('should return empty array when not near any checkpoints', () => {
    const triggered = checkGeofences(0, 0, checkpoints);
    expect(triggered.length).toBe(0);
  });
});

describe('calculateBearing', () => {
  it('should return 0 for due north', () => {
    const bearing = calculateBearing(40.0, -74.0, 41.0, -74.0);
    expect(bearing).toBeCloseTo(0, 0);
  });

  it('should return 90 for due east', () => {
    const bearing = calculateBearing(40.0, -74.0, 40.0, -73.0);
    expect(bearing).toBeCloseTo(90, 0);
  });

  it('should return 180 for due south', () => {
    const bearing = calculateBearing(41.0, -74.0, 40.0, -74.0);
    expect(bearing).toBeCloseTo(180, 0);
  });

  it('should return 270 for due west', () => {
    const bearing = calculateBearing(40.0, -73.0, 40.0, -74.0);
    expect(bearing).toBeCloseTo(270, 0);
  });
});

describe('bearingToCompass', () => {
  it('should return N for 0 degrees', () => {
    expect(bearingToCompass(0)).toBe('N');
  });

  it('should return E for 90 degrees', () => {
    expect(bearingToCompass(90)).toBe('E');
  });

  it('should return S for 180 degrees', () => {
    expect(bearingToCompass(180)).toBe('S');
  });

  it('should return W for 270 degrees', () => {
    expect(bearingToCompass(270)).toBe('W');
  });

  it('should return NE for 45 degrees', () => {
    expect(bearingToCompass(45)).toBe('NE');
  });

  it('should handle values near boundaries', () => {
    expect(bearingToCompass(359)).toBe('N');
    expect(bearingToCompass(22)).toBe('N');
    expect(bearingToCompass(23)).toBe('NE');
  });
});

describe('calculateRouteDistance', () => {
  it('should return 0 for single point', () => {
    const route: Coordinate[] = [{ latitude: 40.7128, longitude: -74.006 }];
    expect(calculateRouteDistance(route)).toBe(0);
  });

  it('should calculate total distance for multi-point route', () => {
    const route: Coordinate[] = [
      { latitude: 40.7128, longitude: -74.006 }, // NYC
      { latitude: 41.8781, longitude: -87.6298 }, // Chicago
      { latitude: 34.0522, longitude: -118.2437 }, // LA
    ];
    const distance = calculateRouteDistance(route);
    // NYC -> Chicago (~1150km) + Chicago -> LA (~2800km) = ~3950km
    expect(distance).toBeGreaterThan(3800000);
    expect(distance).toBeLessThan(4100000);
  });
});

describe('interpolatePosition', () => {
  const route: Coordinate[] = [
    { latitude: 0, longitude: 0 },
    { latitude: 10, longitude: 0 },
  ];

  it('should return first point for progress 0', () => {
    const pos = interpolatePosition(route, 0);
    expect(pos.latitude).toBe(0);
    expect(pos.longitude).toBe(0);
  });

  it('should return last point for progress 1', () => {
    const pos = interpolatePosition(route, 1);
    expect(pos.latitude).toBe(10);
    expect(pos.longitude).toBe(0);
  });

  it('should interpolate midpoint for progress 0.5', () => {
    const pos = interpolatePosition(route, 0.5);
    expect(pos.latitude).toBeCloseTo(5, 0);
    expect(pos.longitude).toBeCloseTo(0, 0);
  });

  it('should handle progress < 0', () => {
    const pos = interpolatePosition(route, -0.5);
    expect(pos.latitude).toBe(0);
    expect(pos.longitude).toBe(0);
  });

  it('should handle progress > 1', () => {
    const pos = interpolatePosition(route, 1.5);
    expect(pos.latitude).toBe(10);
    expect(pos.longitude).toBe(0);
  });
});

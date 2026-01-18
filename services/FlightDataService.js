import { API_CONFIG, isApiKeyConfigured } from '../config/api';

const AEROAPI_BASE_URL = 'https://aeroapi.flightaware.com/aeroapi';

class FlightDataService {
  constructor() {
    this.config = API_CONFIG.flightData;
  }

  isConfigured() {
    return isApiKeyConfigured('flightData');
  }

  // Main method to get flight route
  async getFlightRoute(flightNumber) {
    if (!this.isConfigured()) {
      console.log('Flight API not configured, using mock route');
      return this.getMockRoute(flightNumber);
    }

    try {
      // Try AeroAPI first
      return await this.fetchFromAeroAPI(flightNumber);
    } catch (error) {
      console.error('Failed to fetch flight data:', error);
      return this.getMockRoute(flightNumber);
    }
  }

  // AeroAPI (FlightAware) integration
  async fetchFromAeroAPI(flightNumber) {
    const normalizedFlight = this.normalizeFlightNumber(flightNumber);

    // Get flight info first
    const flightInfo = await this.aeroAPIRequest(`/flights/${normalizedFlight}`);

    if (!flightInfo.flights || flightInfo.flights.length === 0) {
      throw new Error('Flight not found');
    }

    const flight = flightInfo.flights[0];

    // Get the flight track if available
    let trackPoints = [];
    if (flight.fa_flight_id) {
      try {
        const track = await this.aeroAPIRequest(`/flights/${flight.fa_flight_id}/track`);
        trackPoints = track.positions || [];
      } catch (e) {
        console.log('Track not available, using route waypoints');
      }
    }

    // Build route from track or filed route
    const route = this.buildRouteFromAeroAPI(flight, trackPoints);

    return {
      flightNumber: normalizedFlight,
      airline: flight.operator || this.extractAirline(normalizedFlight),
      origin: {
        code: flight.origin?.code_iata || flight.origin?.code,
        name: flight.origin?.name,
        city: flight.origin?.city,
        latitude: flight.origin?.latitude,
        longitude: flight.origin?.longitude,
      },
      destination: {
        code: flight.destination?.code_iata || flight.destination?.code,
        name: flight.destination?.name,
        city: flight.destination?.city,
        latitude: flight.destination?.latitude,
        longitude: flight.destination?.longitude,
      },
      departureTime: flight.scheduled_out || flight.estimated_out,
      arrivalTime: flight.scheduled_in || flight.estimated_in,
      aircraft: flight.aircraft_type,
      route: route,
      status: flight.status,
    };
  }

  async aeroAPIRequest(endpoint) {
    const response = await fetch(`${AEROAPI_BASE_URL}${endpoint}`, {
      headers: {
        'x-apikey': this.config.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `AeroAPI error: ${response.status}`);
    }

    return response.json();
  }

  buildRouteFromAeroAPI(flight, trackPoints) {
    const route = [];

    // Add origin
    if (flight.origin?.latitude && flight.origin?.longitude) {
      route.push({
        latitude: flight.origin.latitude,
        longitude: flight.origin.longitude,
        altitude: 0,
        name: flight.origin.name || flight.origin.code,
        type: 'origin',
      });
    }

    // Add track points if available
    if (trackPoints.length > 0) {
      // Sample track points to avoid too many
      const step = Math.max(1, Math.floor(trackPoints.length / 50));
      for (let i = 0; i < trackPoints.length; i += step) {
        const point = trackPoints[i];
        route.push({
          latitude: point.latitude,
          longitude: point.longitude,
          altitude: point.altitude_ft ? point.altitude_ft / 3.28084 : null,
          groundspeed: point.groundspeed,
          timestamp: point.timestamp,
          type: 'track',
        });
      }
    }

    // Add destination
    if (flight.destination?.latitude && flight.destination?.longitude) {
      route.push({
        latitude: flight.destination.latitude,
        longitude: flight.destination.longitude,
        altitude: 0,
        name: flight.destination.name || flight.destination.code,
        type: 'destination',
      });
    }

    return route;
  }

  normalizeFlightNumber(flightNumber) {
    // Remove spaces and convert to uppercase
    return flightNumber.replace(/\s+/g, '').toUpperCase();
  }

  extractAirline(flightNumber) {
    // Extract airline code from flight number (e.g., BA from BA284)
    const match = flightNumber.match(/^([A-Z]{2,3})/);
    return match ? match[1] : null;
  }

  // Get airport information
  async getAirportInfo(airportCode) {
    if (!this.isConfigured()) {
      return this.getMockAirport(airportCode);
    }

    try {
      const data = await this.aeroAPIRequest(`/airports/${airportCode}`);
      return {
        code: data.code_iata || data.code_icao,
        name: data.name,
        city: data.city,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
      };
    } catch (error) {
      console.error('Failed to fetch airport info:', error);
      return this.getMockAirport(airportCode);
    }
  }

  // Search for flights
  async searchFlights(query) {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      // Search by flight number
      const data = await this.aeroAPIRequest(`/flights/${query}`);
      return data.flights || [];
    } catch (error) {
      console.error('Flight search failed:', error);
      return [];
    }
  }

  // Mock data for demo/testing
  getMockRoute(flightNumber) {
    // Common flight routes for demo
    const mockRoutes = {
      // London to New York
      'BA115': this.generateGreatCircleRoute(
        { lat: 51.4700, lng: -0.4543, name: 'London Heathrow' },
        { lat: 40.6413, lng: -73.7781, name: 'New York JFK' },
        'BA', 'British Airways'
      ),
      'BA117': this.generateGreatCircleRoute(
        { lat: 51.4700, lng: -0.4543, name: 'London Heathrow' },
        { lat: 40.6413, lng: -73.7781, name: 'New York JFK' },
        'BA', 'British Airways'
      ),
      // New York to London
      'BA178': this.generateGreatCircleRoute(
        { lat: 40.6413, lng: -73.7781, name: 'New York JFK' },
        { lat: 51.4700, lng: -0.4543, name: 'London Heathrow' },
        'BA', 'British Airways'
      ),
      // London to Dubai
      'EK002': this.generateGreatCircleRoute(
        { lat: 51.4700, lng: -0.4543, name: 'London Heathrow' },
        { lat: 25.2532, lng: 55.3657, name: 'Dubai International' },
        'EK', 'Emirates'
      ),
      // San Francisco to Tokyo
      'JL001': this.generateGreatCircleRoute(
        { lat: 37.6213, lng: -122.3790, name: 'San Francisco SFO' },
        { lat: 35.5494, lng: 139.7798, name: 'Tokyo Haneda' },
        'JL', 'Japan Airlines'
      ),
      // Los Angeles to Sydney
      'QF12': this.generateGreatCircleRoute(
        { lat: 33.9425, lng: -118.4081, name: 'Los Angeles LAX' },
        { lat: -33.9399, lng: 151.1753, name: 'Sydney SYD' },
        'QF', 'Qantas'
      ),
    };

    // Check if we have a specific mock route
    const normalized = this.normalizeFlightNumber(flightNumber);
    if (mockRoutes[normalized]) {
      return mockRoutes[normalized];
    }

    // Generate a default transatlantic route
    return this.generateGreatCircleRoute(
      { lat: 51.4700, lng: -0.4543, name: 'London Heathrow' },
      { lat: 40.6413, lng: -73.7781, name: 'New York JFK' },
      this.extractAirline(flightNumber) || 'XX',
      'Demo Airline'
    );
  }

  generateGreatCircleRoute(origin, destination, airlineCode, airlineName) {
    const route = [];
    const numPoints = 25;

    // Add origin
    route.push({
      latitude: origin.lat,
      longitude: origin.lng,
      altitude: 0,
      name: origin.name,
      type: 'origin',
    });

    // Generate great circle path points
    for (let i = 1; i < numPoints - 1; i++) {
      const fraction = i / (numPoints - 1);
      const point = this.interpolateGreatCircle(
        origin.lat, origin.lng,
        destination.lat, destination.lng,
        fraction
      );

      // Simulate cruise altitude (varies slightly)
      const cruiseAltitude = 10668 + Math.sin(fraction * Math.PI) * 500; // ~35,000 ft in meters

      route.push({
        latitude: point.lat,
        longitude: point.lng,
        altitude: cruiseAltitude,
        type: 'waypoint',
      });
    }

    // Add destination
    route.push({
      latitude: destination.lat,
      longitude: destination.lng,
      altitude: 0,
      name: destination.name,
      type: 'destination',
    });

    return {
      flightNumber: `${airlineCode}XXX`,
      airline: airlineName,
      origin: {
        code: 'XXX',
        name: origin.name,
        latitude: origin.lat,
        longitude: origin.lng,
      },
      destination: {
        code: 'YYY',
        name: destination.name,
        latitude: destination.lat,
        longitude: destination.lng,
      },
      route: route,
      status: 'demo',
    };
  }

  interpolateGreatCircle(lat1, lng1, lat2, lng2, fraction) {
    const toRad = deg => deg * Math.PI / 180;
    const toDeg = rad => rad * 180 / Math.PI;

    const phi1 = toRad(lat1);
    const lambda1 = toRad(lng1);
    const phi2 = toRad(lat2);
    const lambda2 = toRad(lng2);

    const deltaPhi = phi2 - phi1;
    const deltaLambda = lambda2 - lambda1;

    const a = Math.sin(deltaPhi / 2) ** 2 +
              Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    const delta = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const A = Math.sin((1 - fraction) * delta) / Math.sin(delta);
    const B = Math.sin(fraction * delta) / Math.sin(delta);

    const x = A * Math.cos(phi1) * Math.cos(lambda1) + B * Math.cos(phi2) * Math.cos(lambda2);
    const y = A * Math.cos(phi1) * Math.sin(lambda1) + B * Math.cos(phi2) * Math.sin(lambda2);
    const z = A * Math.sin(phi1) + B * Math.sin(phi2);

    const phi = Math.atan2(z, Math.sqrt(x ** 2 + y ** 2));
    const lambda = Math.atan2(y, x);

    return {
      lat: toDeg(phi),
      lng: toDeg(lambda),
    };
  }

  getMockAirport(code) {
    const airports = {
      'LHR': { code: 'LHR', name: 'London Heathrow', city: 'London', latitude: 51.4700, longitude: -0.4543 },
      'JFK': { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', latitude: 40.6413, longitude: -73.7781 },
      'LAX': { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', latitude: 33.9425, longitude: -118.4081 },
      'DXB': { code: 'DXB', name: 'Dubai International', city: 'Dubai', latitude: 25.2532, longitude: 55.3657 },
      'SYD': { code: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', latitude: -33.9399, longitude: 151.1753 },
      'HND': { code: 'HND', name: 'Tokyo Haneda', city: 'Tokyo', latitude: 35.5494, longitude: 139.7798 },
      'CDG': { code: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', latitude: 49.0097, longitude: 2.5479 },
      'SFO': { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', latitude: 37.6213, longitude: -122.3790 },
    };

    return airports[code.toUpperCase()] || { code, name: 'Unknown Airport' };
  }
}

export const flightDataService = new FlightDataService();
export { FlightDataService };

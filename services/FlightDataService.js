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

    // Check if it's an airport pair format (e.g., LAX-SFO, JFK-LAX)
    const airportPairMatch = normalized.match(/^([A-Z]{3})-([A-Z]{3})$/);
    if (airportPairMatch) {
      const originCode = airportPairMatch[1];
      const destCode = airportPairMatch[2];
      const originAirport = this.getMockAirport(originCode);
      const destAirport = this.getMockAirport(destCode);

      if (originAirport.latitude && destAirport.latitude) {
        return this.generateGreatCircleRoute(
          { lat: originAirport.latitude, lng: originAirport.longitude, name: originAirport.name, code: originCode },
          { lat: destAirport.latitude, lng: destAirport.longitude, name: destAirport.name, code: destCode },
          'XX',
          'Demo Route'
        );
      }
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
        code: origin.code || 'XXX',
        name: origin.name,
        latitude: origin.lat,
        longitude: origin.lng,
      },
      destination: {
        code: destination.code || 'YYY',
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
      // North America - USA
      'JFK': { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', latitude: 40.6413, longitude: -73.7781 },
      'LAX': { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', latitude: 33.9425, longitude: -118.4081 },
      'SFO': { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', latitude: 37.6213, longitude: -122.3790 },
      'ORD': { code: 'ORD', name: "Chicago O'Hare International", city: 'Chicago', latitude: 41.9742, longitude: -87.9073 },
      'ATL': { code: 'ATL', name: 'Hartsfield-Jackson Atlanta', city: 'Atlanta', latitude: 33.6407, longitude: -84.4277 },
      'DFW': { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', latitude: 32.8998, longitude: -97.0403 },
      'DEN': { code: 'DEN', name: 'Denver International', city: 'Denver', latitude: 39.8561, longitude: -104.6737 },
      'SEA': { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', latitude: 47.4502, longitude: -122.3088 },
      'MIA': { code: 'MIA', name: 'Miami International', city: 'Miami', latitude: 25.7959, longitude: -80.2870 },
      'BOS': { code: 'BOS', name: 'Boston Logan International', city: 'Boston', latitude: 42.3656, longitude: -71.0096 },
      'EWR': { code: 'EWR', name: 'Newark Liberty International', city: 'Newark', latitude: 40.6895, longitude: -74.1745 },
      'PHX': { code: 'PHX', name: 'Phoenix Sky Harbor', city: 'Phoenix', latitude: 33.4373, longitude: -112.0078 },
      'LAS': { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', latitude: 36.0840, longitude: -115.1537 },
      'MSP': { code: 'MSP', name: 'Minneapolis-Saint Paul', city: 'Minneapolis', latitude: 44.8848, longitude: -93.2223 },
      'DTW': { code: 'DTW', name: 'Detroit Metropolitan', city: 'Detroit', latitude: 42.2124, longitude: -83.3534 },
      'PHL': { code: 'PHL', name: 'Philadelphia International', city: 'Philadelphia', latitude: 39.8729, longitude: -75.2437 },
      'IAH': { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', latitude: 29.9902, longitude: -95.3368 },
      'SAN': { code: 'SAN', name: 'San Diego International', city: 'San Diego', latitude: 32.7338, longitude: -117.1933 },
      'PDX': { code: 'PDX', name: 'Portland International', city: 'Portland', latitude: 45.5898, longitude: -122.5951 },
      'SLC': { code: 'SLC', name: 'Salt Lake City International', city: 'Salt Lake City', latitude: 40.7899, longitude: -111.9791 },
      'IAD': { code: 'IAD', name: 'Washington Dulles International', city: 'Washington D.C.', latitude: 38.9531, longitude: -77.4565 },
      'DCA': { code: 'DCA', name: 'Ronald Reagan Washington', city: 'Washington D.C.', latitude: 38.8512, longitude: -77.0402 },
      'MCO': { code: 'MCO', name: 'Orlando International', city: 'Orlando', latitude: 28.4312, longitude: -81.3081 },
      'HNL': { code: 'HNL', name: 'Daniel K. Inouye International', city: 'Honolulu', latitude: 21.3187, longitude: -157.9225 },
      'ANC': { code: 'ANC', name: 'Ted Stevens Anchorage', city: 'Anchorage', latitude: 61.1743, longitude: -149.9962 },

      // North America - Canada
      'YYZ': { code: 'YYZ', name: 'Toronto Pearson', city: 'Toronto', latitude: 43.6777, longitude: -79.6248 },
      'YVR': { code: 'YVR', name: 'Vancouver International', city: 'Vancouver', latitude: 49.1947, longitude: -123.1790 },
      'YUL': { code: 'YUL', name: 'Montréal-Trudeau', city: 'Montreal', latitude: 45.4657, longitude: -73.7455 },
      'YYC': { code: 'YYC', name: 'Calgary International', city: 'Calgary', latitude: 51.1215, longitude: -114.0076 },

      // North America - Mexico
      'MEX': { code: 'MEX', name: 'Mexico City International', city: 'Mexico City', latitude: 19.4363, longitude: -99.0721 },
      'CUN': { code: 'CUN', name: 'Cancún International', city: 'Cancún', latitude: 21.0365, longitude: -86.8771 },

      // Europe - UK & Ireland
      'LHR': { code: 'LHR', name: 'London Heathrow', city: 'London', latitude: 51.4700, longitude: -0.4543 },
      'LGW': { code: 'LGW', name: 'London Gatwick', city: 'London', latitude: 51.1537, longitude: -0.1821 },
      'MAN': { code: 'MAN', name: 'Manchester Airport', city: 'Manchester', latitude: 53.3537, longitude: -2.2750 },
      'EDI': { code: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', latitude: 55.9508, longitude: -3.3615 },
      'DUB': { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', latitude: 53.4264, longitude: -6.2499 },

      // Europe - Western
      'CDG': { code: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', latitude: 49.0097, longitude: 2.5479 },
      'AMS': { code: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', latitude: 52.3105, longitude: 4.7683 },
      'FRA': { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', latitude: 50.0379, longitude: 8.5622 },
      'MUC': { code: 'MUC', name: 'Munich Airport', city: 'Munich', latitude: 48.3537, longitude: 11.7750 },
      'ZRH': { code: 'ZRH', name: 'Zurich Airport', city: 'Zurich', latitude: 47.4647, longitude: 8.5492 },
      'VIE': { code: 'VIE', name: 'Vienna International', city: 'Vienna', latitude: 48.1103, longitude: 16.5697 },
      'BRU': { code: 'BRU', name: 'Brussels Airport', city: 'Brussels', latitude: 50.9010, longitude: 4.4856 },

      // Europe - Southern
      'MAD': { code: 'MAD', name: 'Madrid-Barajas', city: 'Madrid', latitude: 40.4983, longitude: -3.5676 },
      'BCN': { code: 'BCN', name: 'Barcelona-El Prat', city: 'Barcelona', latitude: 41.2971, longitude: 2.0785 },
      'FCO': { code: 'FCO', name: 'Rome Fiumicino', city: 'Rome', latitude: 41.8003, longitude: 12.2389 },
      'MXP': { code: 'MXP', name: 'Milan Malpensa', city: 'Milan', latitude: 45.6301, longitude: 8.7231 },
      'LIS': { code: 'LIS', name: 'Lisbon Portela', city: 'Lisbon', latitude: 38.7813, longitude: -9.1359 },
      'ATH': { code: 'ATH', name: 'Athens International', city: 'Athens', latitude: 37.9364, longitude: 23.9445 },

      // Europe - Nordic
      'CPH': { code: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', latitude: 55.6180, longitude: 12.6508 },
      'OSL': { code: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', latitude: 60.1939, longitude: 11.1004 },
      'ARN': { code: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', latitude: 59.6498, longitude: 17.9238 },
      'HEL': { code: 'HEL', name: 'Helsinki-Vantaa', city: 'Helsinki', latitude: 60.3172, longitude: 24.9633 },

      // Europe - Eastern
      'IST': { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', latitude: 41.2753, longitude: 28.7519 },
      'WAW': { code: 'WAW', name: 'Warsaw Chopin', city: 'Warsaw', latitude: 52.1657, longitude: 20.9671 },
      'PRG': { code: 'PRG', name: 'Prague Václav Havel', city: 'Prague', latitude: 50.1008, longitude: 14.2600 },
      'BUD': { code: 'BUD', name: 'Budapest Ferenc Liszt', city: 'Budapest', latitude: 47.4298, longitude: 19.2611 },

      // Asia - East
      'HND': { code: 'HND', name: 'Tokyo Haneda', city: 'Tokyo', latitude: 35.5494, longitude: 139.7798 },
      'NRT': { code: 'NRT', name: 'Tokyo Narita', city: 'Tokyo', latitude: 35.7720, longitude: 140.3929 },
      'PEK': { code: 'PEK', name: 'Beijing Capital', city: 'Beijing', latitude: 40.0799, longitude: 116.6031 },
      'PVG': { code: 'PVG', name: 'Shanghai Pudong', city: 'Shanghai', latitude: 31.1443, longitude: 121.8083 },
      'HKG': { code: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', latitude: 22.3080, longitude: 113.9185 },
      'ICN': { code: 'ICN', name: 'Seoul Incheon', city: 'Seoul', latitude: 37.4602, longitude: 126.4407 },
      'TPE': { code: 'TPE', name: 'Taiwan Taoyuan', city: 'Taipei', latitude: 25.0797, longitude: 121.2342 },

      // Asia - Southeast
      'SIN': { code: 'SIN', name: 'Singapore Changi', city: 'Singapore', latitude: 1.3644, longitude: 103.9915 },
      'BKK': { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', latitude: 13.6900, longitude: 100.7501 },
      'KUL': { code: 'KUL', name: 'Kuala Lumpur International', city: 'Kuala Lumpur', latitude: 2.7456, longitude: 101.7099 },
      'CGK': { code: 'CGK', name: 'Soekarno-Hatta International', city: 'Jakarta', latitude: -6.1256, longitude: 106.6559 },
      'MNL': { code: 'MNL', name: 'Ninoy Aquino International', city: 'Manila', latitude: 14.5086, longitude: 121.0198 },
      'SGN': { code: 'SGN', name: 'Tan Son Nhat', city: 'Ho Chi Minh City', latitude: 10.8188, longitude: 106.6520 },

      // Asia - South
      'DEL': { code: 'DEL', name: 'Indira Gandhi International', city: 'Delhi', latitude: 28.5562, longitude: 77.1000 },
      'BOM': { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj', city: 'Mumbai', latitude: 19.0896, longitude: 72.8656 },
      'BLR': { code: 'BLR', name: 'Kempegowda International', city: 'Bangalore', latitude: 13.1979, longitude: 77.7063 },

      // Middle East
      'DXB': { code: 'DXB', name: 'Dubai International', city: 'Dubai', latitude: 25.2532, longitude: 55.3657 },
      'DOH': { code: 'DOH', name: 'Hamad International', city: 'Doha', latitude: 25.2609, longitude: 51.6138 },
      'AUH': { code: 'AUH', name: 'Abu Dhabi International', city: 'Abu Dhabi', latitude: 24.4330, longitude: 54.6511 },
      'TLV': { code: 'TLV', name: 'Ben Gurion International', city: 'Tel Aviv', latitude: 32.0055, longitude: 34.8854 },
      'JED': { code: 'JED', name: 'King Abdulaziz International', city: 'Jeddah', latitude: 21.6796, longitude: 39.1565 },

      // Africa
      'JNB': { code: 'JNB', name: 'O.R. Tambo International', city: 'Johannesburg', latitude: -26.1392, longitude: 28.2460 },
      'CPT': { code: 'CPT', name: 'Cape Town International', city: 'Cape Town', latitude: -33.9715, longitude: 18.6021 },
      'CAI': { code: 'CAI', name: 'Cairo International', city: 'Cairo', latitude: 30.1219, longitude: 31.4056 },
      'CMN': { code: 'CMN', name: 'Mohammed V International', city: 'Casablanca', latitude: 33.3675, longitude: -7.5898 },
      'ADD': { code: 'ADD', name: 'Bole International', city: 'Addis Ababa', latitude: 8.9779, longitude: 38.7993 },
      'NBO': { code: 'NBO', name: 'Jomo Kenyatta International', city: 'Nairobi', latitude: -1.3192, longitude: 36.9278 },

      // Oceania
      'SYD': { code: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', latitude: -33.9399, longitude: 151.1753 },
      'MEL': { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', latitude: -37.6690, longitude: 144.8410 },
      'BNE': { code: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', latitude: -27.3942, longitude: 153.1218 },
      'PER': { code: 'PER', name: 'Perth Airport', city: 'Perth', latitude: -31.9385, longitude: 115.9672 },
      'AKL': { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', latitude: -37.0082, longitude: 174.7850 },

      // South America
      'GRU': { code: 'GRU', name: 'São Paulo-Guarulhos', city: 'São Paulo', latitude: -23.4356, longitude: -46.4731 },
      'EZE': { code: 'EZE', name: 'Buenos Aires Ezeiza', city: 'Buenos Aires', latitude: -34.8222, longitude: -58.5358 },
      'SCL': { code: 'SCL', name: 'Santiago International', city: 'Santiago', latitude: -33.3930, longitude: -70.7858 },
      'BOG': { code: 'BOG', name: 'El Dorado International', city: 'Bogotá', latitude: 4.7016, longitude: -74.1469 },
      'LIM': { code: 'LIM', name: 'Jorge Chávez International', city: 'Lima', latitude: -12.0219, longitude: -77.1143 },
      'GIG': { code: 'GIG', name: 'Rio de Janeiro-Galeão', city: 'Rio de Janeiro', latitude: -22.8099, longitude: -43.2506 },
    };

    return airports[code.toUpperCase()] || { code, name: 'Unknown Airport' };
  }
}

export const flightDataService = new FlightDataService();
export { FlightDataService };

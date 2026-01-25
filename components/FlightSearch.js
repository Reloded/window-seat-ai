import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SectionList,
} from 'react-native';

// Demo flights that work without API keys - organized by region
const DEMO_FLIGHTS = {
  transatlantic: [
    { id: 'BA115', route: 'LHR → JFK', name: 'London to New York', airline: 'British Airways', duration: '8h' },
    { id: 'BA117', route: 'LHR → JFK', name: 'London to New York', airline: 'British Airways', duration: '8h' },
    { id: 'BA178', route: 'JFK → LHR', name: 'New York to London', airline: 'British Airways', duration: '7h' },
    { id: 'BA284', route: 'SFO → LHR', name: 'San Francisco to London', airline: 'British Airways', duration: '10h' },
    { id: 'VS3', route: 'LHR → JFK', name: 'London to New York', airline: 'Virgin Atlantic', duration: '8h' },
    { id: 'AA100', route: 'JFK → LHR', name: 'New York to London', airline: 'American Airlines', duration: '7h' },
  ],
  europe: [
    { id: 'BA304', route: 'LHR → MAD', name: 'London to Madrid', airline: 'British Airways', duration: '2h 30m' },
    { id: 'AF1080', route: 'CDG → FCO', name: 'Paris to Rome', airline: 'Air France', duration: '2h' },
    { id: 'LH100', route: 'FRA → LHR', name: 'Frankfurt to London', airline: 'Lufthansa', duration: '1h 30m' },
    { id: 'IB3170', route: 'MAD → BCN', name: 'Madrid to Barcelona', airline: 'Iberia', duration: '1h 15m' },
    { id: 'SK1469', route: 'CPH → OSL', name: 'Copenhagen to Oslo', airline: 'SAS', duration: '1h 10m' },
    { id: 'AZ610', route: 'FCO → MXP', name: 'Rome to Milan', airline: 'ITA Airways', duration: '1h 10m' },
  ],
  middleEast: [
    { id: 'EK002', route: 'LHR → DXB', name: 'London to Dubai', airline: 'Emirates', duration: '7h' },
    { id: 'QR001', route: 'DOH → LHR', name: 'Doha to London', airline: 'Qatar Airways', duration: '7h' },
    { id: 'EY19', route: 'AUH → LHR', name: 'Abu Dhabi to London', airline: 'Etihad', duration: '7h 30m' },
    { id: 'TK1', route: 'IST → JFK', name: 'Istanbul to New York', airline: 'Turkish Airlines', duration: '11h' },
  ],
  asiaPacific: [
    { id: 'JL001', route: 'SFO → HND', name: 'San Francisco to Tokyo', airline: 'Japan Airlines', duration: '11h' },
    { id: 'QF12', route: 'LAX → SYD', name: 'Los Angeles to Sydney', airline: 'Qantas', duration: '15h' },
    { id: 'SQ25', route: 'SIN → FRA', name: 'Singapore to Frankfurt', airline: 'Singapore Airlines', duration: '13h' },
    { id: 'CX100', route: 'HKG → LHR', name: 'Hong Kong to London', airline: 'Cathay Pacific', duration: '13h' },
    { id: 'NH105', route: 'NRT → LAX', name: 'Tokyo to Los Angeles', airline: 'ANA', duration: '10h' },
    { id: 'KE17', route: 'ICN → LAX', name: 'Seoul to Los Angeles', airline: 'Korean Air', duration: '11h' },
  ],
  americas: [
    { id: 'AA1', route: 'JFK → LAX', name: 'New York to Los Angeles', airline: 'American Airlines', duration: '6h' },
    { id: 'UA1', route: 'SFO → EWR', name: 'San Francisco to Newark', airline: 'United', duration: '5h 30m' },
    { id: 'DL1', route: 'ATL → LAX', name: 'Atlanta to Los Angeles', airline: 'Delta', duration: '4h 30m' },
    { id: 'WN1', route: 'LAS → PHX', name: 'Las Vegas to Phoenix', airline: 'Southwest', duration: '1h 10m' },
    { id: 'AC1', route: 'YYZ → YVR', name: 'Toronto to Vancouver', airline: 'Air Canada', duration: '5h' },
    { id: 'LA601', route: 'SCL → GRU', name: 'Santiago to São Paulo', airline: 'LATAM', duration: '4h' },
  ],
  scenic: [
    { id: 'AS121', route: 'SEA → ANC', name: 'Seattle to Anchorage', airline: 'Alaska Airlines', duration: '3h 30m', highlight: '🏔️ Glaciers & Mountains' },
    { id: 'HA11', route: 'LAX → HNL', name: 'Los Angeles to Honolulu', airline: 'Hawaiian Airlines', duration: '5h 30m', highlight: '🌊 Pacific Ocean' },
    { id: 'QF9', route: 'PER → LHR', name: 'Perth to London', airline: 'Qantas', duration: '17h', highlight: '🌍 Longest Route' },
    { id: 'SA203', route: 'JNB → CPT', name: 'Johannesburg to Cape Town', airline: 'South African', duration: '2h', highlight: '🦁 African Landscape' },
    { id: 'FJ910', route: 'SYD → NAN', name: 'Sydney to Fiji', airline: 'Fiji Airways', duration: '4h', highlight: '🏝️ South Pacific Islands' },
    { id: 'EI105', route: 'DUB → JFK', name: 'Dublin to New York', airline: 'Aer Lingus', duration: '7h 30m', highlight: '🍀 Atlantic Crossing' },
  ],
};

// Flatten all flights for search
const ALL_FLIGHTS = Object.values(DEMO_FLIGHTS).flat();

// Popular airport pairs for custom routes - organized by region
const POPULAR_ROUTES = {
  northAmerica: [
    { origin: 'JFK', destination: 'LAX', name: 'New York to Los Angeles', country: '🇺🇸' },
    { origin: 'LAX', destination: 'SFO', name: 'Los Angeles to San Francisco', country: '🇺🇸' },
    { origin: 'ORD', destination: 'MIA', name: 'Chicago to Miami', country: '🇺🇸' },
    { origin: 'DFW', destination: 'DEN', name: 'Dallas to Denver', country: '🇺🇸' },
    { origin: 'SEA', destination: 'ANC', name: 'Seattle to Anchorage', country: '🇺🇸' },
    { origin: 'BOS', destination: 'DCA', name: 'Boston to Washington DC', country: '🇺🇸' },
    { origin: 'YYZ', destination: 'YVR', name: 'Toronto to Vancouver', country: '🇨🇦' },
    { origin: 'YUL', destination: 'YYC', name: 'Montreal to Calgary', country: '🇨🇦' },
  ],
  europe: [
    { origin: 'LHR', destination: 'CDG', name: 'London to Paris', country: '🇬🇧→🇫🇷' },
    { origin: 'AMS', destination: 'BCN', name: 'Amsterdam to Barcelona', country: '🇳🇱→🇪🇸' },
    { origin: 'FRA', destination: 'FCO', name: 'Frankfurt to Rome', country: '🇩🇪→🇮🇹' },
    { origin: 'MUC', destination: 'VIE', name: 'Munich to Vienna', country: '🇩🇪→🇦🇹' },
    { origin: 'ZRH', destination: 'LIS', name: 'Zurich to Lisbon', country: '🇨🇭→🇵🇹' },
    { origin: 'CPH', destination: 'ARN', name: 'Copenhagen to Stockholm', country: '🇩🇰→🇸🇪' },
    { origin: 'DUB', destination: 'EDI', name: 'Dublin to Edinburgh', country: '🇮🇪→🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    { origin: 'WAW', destination: 'PRG', name: 'Warsaw to Prague', country: '🇵🇱→🇨🇿' },
  ],
  asiaPacific: [
    { origin: 'NRT', destination: 'ICN', name: 'Tokyo to Seoul', country: '🇯🇵→🇰🇷' },
    { origin: 'HKG', destination: 'SIN', name: 'Hong Kong to Singapore', country: '🇭🇰→🇸🇬' },
    { origin: 'SYD', destination: 'MEL', name: 'Sydney to Melbourne', country: '🇦🇺' },
    { origin: 'BKK', destination: 'KUL', name: 'Bangkok to Kuala Lumpur', country: '🇹🇭→🇲🇾' },
    { origin: 'PEK', destination: 'PVG', name: 'Beijing to Shanghai', country: '🇨🇳' },
    { origin: 'DEL', destination: 'BOM', name: 'Delhi to Mumbai', country: '🇮🇳' },
  ],
  other: [
    { origin: 'DXB', destination: 'JNB', name: 'Dubai to Johannesburg', country: '🇦🇪→🇿🇦' },
    { origin: 'GRU', destination: 'EZE', name: 'São Paulo to Buenos Aires', country: '🇧🇷→🇦🇷' },
    { origin: 'MEX', destination: 'CUN', name: 'Mexico City to Cancún', country: '🇲🇽' },
    { origin: 'CAI', destination: 'DXB', name: 'Cairo to Dubai', country: '🇪🇬→🇦🇪' },
  ],
};

// Flatten all routes for search
const ALL_ROUTES = Object.values(POPULAR_ROUTES).flat();

// Tab configuration
const FLIGHT_TABS = [
  { id: 'all', label: '✈️ All', region: null },
  { id: 'scenic', label: '🏔️ Scenic', region: 'scenic' },
  { id: 'transatlantic', label: '🌊 Atlantic', region: 'transatlantic' },
  { id: 'europe', label: '🇪🇺 Europe', region: 'europe' },
  { id: 'asia', label: '🌏 Asia-Pacific', region: 'asiaPacific' },
  { id: 'americas', label: '🌎 Americas', region: 'americas' },
  { id: 'middleeast', label: '🕌 Middle East', region: 'middleEast' },
];

const ROUTE_TABS = [
  { id: 'all', label: '🌍 All', region: null },
  { id: 'northAmerica', label: '🇺🇸 N. America', region: 'northAmerica' },
  { id: 'europe', label: '🇪🇺 Europe', region: 'europe' },
  { id: 'asia', label: '🌏 Asia-Pacific', region: 'asiaPacific' },
  { id: 'other', label: '🌐 Other', region: 'other' },
];

/**
 * FlightSearch - Browse and search for flights
 */
export function FlightSearch({ onSelectFlight, recentSearches = [], style }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMainTab, setActiveMainTab] = useState('flights'); // 'flights', 'routes', 'recent'
  const [activeFlightRegion, setActiveFlightRegion] = useState('all');
  const [activeRouteRegion, setActiveRouteRegion] = useState('all');

  // Filter flights based on search and region
  const filteredFlights = useMemo(() => {
    let flights = activeFlightRegion === 'all' 
      ? ALL_FLIGHTS 
      : DEMO_FLIGHTS[activeFlightRegion] || [];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      flights = flights.filter(
        flight =>
          flight.id.toLowerCase().includes(query) ||
          flight.name.toLowerCase().includes(query) ||
          flight.airline.toLowerCase().includes(query) ||
          flight.route.toLowerCase().includes(query)
      );
    }
    return flights;
  }, [searchQuery, activeFlightRegion]);

  // Filter routes based on search and region
  const filteredRoutes = useMemo(() => {
    let routes = activeRouteRegion === 'all'
      ? ALL_ROUTES
      : POPULAR_ROUTES[activeRouteRegion] || [];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      routes = routes.filter(
        route =>
          route.origin.toLowerCase().includes(query) ||
          route.destination.toLowerCase().includes(query) ||
          route.name.toLowerCase().includes(query)
      );
    }
    return routes;
  }, [searchQuery, activeRouteRegion]);

  const handleSelectDemoFlight = (flight) => {
    onSelectFlight(flight.id);
  };

  const handleSelectRoute = (route) => {
    onSelectFlight(`${route.origin}-${route.destination}`);
  };

  const renderDemoFlight = ({ item }) => (
    <TouchableOpacity
      style={styles.flightItem}
      onPress={() => handleSelectDemoFlight(item)}
      accessibilityLabel={`${item.airline} flight ${item.id}, ${item.name}`}
      accessibilityHint="Tap to select this flight"
      accessibilityRole="button"
    >
      <View style={styles.flightHeader}>
        <Text style={styles.flightId}>{item.id}</Text>
        <Text style={styles.flightDuration}>{item.duration}</Text>
      </View>
      <Text style={styles.flightRoute}>{item.route}</Text>
      <Text style={styles.flightName}>{item.name}</Text>
      <View style={styles.flightFooter}>
        <Text style={styles.flightAirline}>{item.airline}</Text>
        {item.highlight && (
          <Text style={styles.flightHighlight}>{item.highlight}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderRoute = ({ item }) => (
    <TouchableOpacity
      style={styles.flightItem}
      onPress={() => handleSelectRoute(item)}
      accessibilityLabel={`Route from ${item.origin} to ${item.destination}, ${item.name}`}
      accessibilityHint="Tap to select this route"
      accessibilityRole="button"
    >
      <View style={styles.flightHeader}>
        <Text style={styles.flightId}>{item.origin} → {item.destination}</Text>
        <Text style={styles.countryFlag}>{item.country}</Text>
      </View>
      <Text style={styles.flightName}>{item.name}</Text>
      <Text style={styles.flightAirline}>Custom Route</Text>
    </TouchableOpacity>
  );

  const renderRecentSearch = ({ item }) => (
    <TouchableOpacity
      style={styles.flightItem}
      onPress={() => onSelectFlight(item)}
      accessibilityLabel={`Recent search: ${item}`}
      accessibilityHint="Tap to search again"
      accessibilityRole="button"
    >
      <View style={styles.flightHeader}>
        <Text style={styles.flightId}>{item}</Text>
        <Text style={styles.recentBadge}>Recent</Text>
      </View>
    </TouchableOpacity>
  );

  // Main tabs
  const mainTabs = [
    { id: 'flights', label: '✈️ Flights', count: filteredFlights.length },
    { id: 'routes', label: '🗺️ Routes', count: filteredRoutes.length },
  ];
  
  if (recentSearches.length > 0) {
    mainTabs.push({ id: 'recent', label: '🕐 Recent', count: recentSearches.length });
  }

  // Get current region tabs based on main tab
  const regionTabs = activeMainTab === 'flights' ? FLIGHT_TABS : ROUTE_TABS;
  const activeRegion = activeMainTab === 'flights' ? activeFlightRegion : activeRouteRegion;
  const setActiveRegion = activeMainTab === 'flights' ? setActiveFlightRegion : setActiveRouteRegion;

  return (
    <View style={[styles.container, style]}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search flights, airlines, or airports..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="characters"
          accessibilityLabel="Search flights"
          accessibilityHint="Enter flight number, airline, or city to search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
          >
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Tabs (Flights / Routes / Recent) */}
      <View style={styles.mainTabContainer} accessibilityRole="tablist">
        {mainTabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.mainTab, activeMainTab === tab.id && styles.mainTabActive]}
            onPress={() => setActiveMainTab(tab.id)}
            accessibilityLabel={`${tab.label} tab, ${tab.count} items`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeMainTab === tab.id }}
          >
            <Text style={[styles.mainTabText, activeMainTab === tab.id && styles.mainTabTextActive]}>
              {tab.label}
            </Text>
            <View style={[styles.mainTabBadge, activeMainTab === tab.id && styles.mainTabBadgeActive]}>
              <Text style={[styles.mainTabBadgeText, activeMainTab === tab.id && styles.mainTabBadgeTextActive]}>
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Region Filter Tabs (only for flights and routes) */}
      {activeMainTab !== 'recent' && (
        <View style={styles.regionTabScroll}>
          <FlatList
            horizontal
            data={regionTabs}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.regionTabContainer}
            renderItem={({ item: tab }) => (
              <TouchableOpacity
                style={[styles.regionTab, activeRegion === tab.id && styles.regionTabActive]}
                onPress={() => setActiveRegion(tab.id)}
              >
                <Text style={[styles.regionTabText, activeRegion === tab.id && styles.regionTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Flight/Route List */}
      <FlatList
        data={
          activeMainTab === 'flights' ? filteredFlights :
          activeMainTab === 'routes' ? filteredRoutes :
          recentSearches
        }
        renderItem={
          activeMainTab === 'flights' ? renderDemoFlight :
          activeMainTab === 'routes' ? renderRoute :
          renderRecentSearch
        }
        keyExtractor={(item, index) => 
          activeMainTab === 'recent' ? `recent-${index}` : 
          item.id || `${item.origin}-${item.destination}`
        }
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔎</Text>
            <Text style={styles.emptyText}>No flights found</Text>
            <Text style={styles.emptyHint}>Try a different search or region</Text>
          </View>
        }
      />

      {/* Tip */}
      <View style={styles.tipContainer}>
        <Text style={styles.tipText}>
          💡 Tip: Enter airport codes like "LAX-SFO" for any custom route
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 12,
    paddingLeft: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 14,
    paddingLeft: 0,
    color: '#ffffff',
    fontSize: 16,
  },
  clearButton: {
    padding: 14,
  },
  clearButtonText: {
    color: '#666',
    fontSize: 20,
    fontWeight: 'bold',
  },
  mainTabContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  mainTabActive: {
    backgroundColor: '#00d4ff',
  },
  mainTabText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  mainTabTextActive: {
    color: '#0a1628',
  },
  mainTabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  mainTabBadgeActive: {
    backgroundColor: 'rgba(10, 22, 40, 0.2)',
  },
  mainTabBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  mainTabBadgeTextActive: {
    color: '#0a1628',
  },
  regionTabScroll: {
    marginBottom: 12,
  },
  regionTabContainer: {
    gap: 6,
    paddingRight: 8,
  },
  regionTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  regionTabActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderColor: '#00d4ff',
  },
  regionTabText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  regionTabTextActive: {
    color: '#00d4ff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  flightItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#00d4ff',
  },
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  flightId: {
    color: '#00d4ff',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  flightDuration: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  flightRoute: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  flightName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    marginBottom: 6,
  },
  flightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flightAirline: {
    color: '#666',
    fontSize: 12,
  },
  flightHighlight: {
    color: '#ffc107',
    fontSize: 11,
    fontWeight: '600',
  },
  countryFlag: {
    fontSize: 14,
  },
  recentBadge: {
    color: '#ffc107',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 4,
  },
  emptyHint: {
    color: '#666',
    fontSize: 14,
  },
  tipContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 8,
  },
  tipText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default FlightSearch;

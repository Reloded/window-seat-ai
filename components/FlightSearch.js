import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';

// Demo flights that work without API keys
const DEMO_FLIGHTS = [
  { id: 'BA115', route: 'LHR → JFK', name: 'London to New York', airline: 'British Airways' },
  { id: 'BA117', route: 'LHR → JFK', name: 'London to New York', airline: 'British Airways' },
  { id: 'BA178', route: 'JFK → LHR', name: 'New York to London', airline: 'British Airways' },
  { id: 'BA284', route: 'SFO → LHR', name: 'San Francisco to London', airline: 'British Airways' },
  { id: 'EK002', route: 'LHR → DXB', name: 'London to Dubai', airline: 'Emirates' },
  { id: 'JL001', route: 'SFO → HND', name: 'San Francisco to Tokyo', airline: 'Japan Airlines' },
  { id: 'QF12', route: 'LAX → SYD', name: 'Los Angeles to Sydney', airline: 'Qantas' },
];

// Popular airport pairs for custom routes
const POPULAR_ROUTES = [
  { origin: 'JFK', destination: 'LAX', name: 'New York to Los Angeles' },
  { origin: 'LAX', destination: 'SFO', name: 'Los Angeles to San Francisco' },
  { origin: 'ORD', destination: 'MIA', name: 'Chicago to Miami' },
  { origin: 'DFW', destination: 'DEN', name: 'Dallas to Denver' },
  { origin: 'SEA', destination: 'ANC', name: 'Seattle to Anchorage' },
  { origin: 'BOS', destination: 'DCA', name: 'Boston to Washington DC' },
];

/**
 * FlightSearch - Browse and search for flights
 */
export function FlightSearch({ onSelectFlight, recentSearches = [], style }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('demo'); // 'demo', 'routes', 'recent'

  const filteredDemoFlights = useMemo(() => {
    if (!searchQuery.trim()) return DEMO_FLIGHTS;
    const query = searchQuery.toLowerCase();
    return DEMO_FLIGHTS.filter(
      flight =>
        flight.id.toLowerCase().includes(query) ||
        flight.name.toLowerCase().includes(query) ||
        flight.airline.toLowerCase().includes(query) ||
        flight.route.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return POPULAR_ROUTES;
    const query = searchQuery.toLowerCase();
    return POPULAR_ROUTES.filter(
      route =>
        route.origin.toLowerCase().includes(query) ||
        route.destination.toLowerCase().includes(query) ||
        route.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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
        <Text style={styles.flightRoute}>{item.route}</Text>
      </View>
      <Text style={styles.flightName}>{item.name}</Text>
      <Text style={styles.flightAirline}>{item.airline}</Text>
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
        <Text style={styles.flightId}>{item.origin}-{item.destination}</Text>
        <Text style={styles.flightRoute}>{item.origin} → {item.destination}</Text>
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

  const tabs = [
    { id: 'demo', label: 'Demo Flights', count: filteredDemoFlights.length },
    { id: 'routes', label: 'Routes', count: filteredRoutes.length },
  ];

  if (recentSearches.length > 0) {
    tabs.push({ id: 'recent', label: 'Recent', count: recentSearches.length });
  }

  return (
    <View style={[styles.container, style]}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search flights or routes..."
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

      {/* Tabs */}
      <View style={styles.tabContainer} accessibilityRole="tablist">
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
            accessibilityLabel={`${tab.label} tab, ${tab.count} items`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.id }}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
            <View style={[styles.tabBadge, activeTab === tab.id && styles.tabBadgeActive]}>
              <Text style={styles.tabBadgeText}>{tab.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Flight List */}
      <FlatList
        data={
          activeTab === 'demo' ? filteredDemoFlights :
          activeTab === 'routes' ? filteredRoutes :
          recentSearches
        }
        renderItem={
          activeTab === 'demo' ? renderDemoFlight :
          activeTab === 'routes' ? renderRoute :
          renderRecentSearch
        }
        keyExtractor={(item, index) => activeTab === 'recent' ? `recent-${index}` : item.id || `${item.origin}-${item.destination}`}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No flights found</Text>
            <Text style={styles.emptyHint}>Try a different search term</Text>
          </View>
        }
      />

      {/* Tip */}
      <View style={styles.tipContainer}>
        <Text style={styles.tipText}>
          Tip: Enter airport codes like "LAX-SFO" for custom routes
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
  },
  searchInput: {
    flex: 1,
    padding: 14,
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
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#00d4ff',
  },
  tabText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#0a1628',
  },
  tabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(10, 22, 40, 0.2)',
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 8,
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
    marginBottom: 6,
  },
  flightId: {
    color: '#00d4ff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  flightRoute: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.8,
  },
  flightName: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 4,
  },
  flightAirline: {
    color: '#666',
    fontSize: 12,
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
    marginTop: 12,
  },
  tipText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default FlightSearch;

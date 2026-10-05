import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { AirportPicker } from './AirportPicker';
import { getAirport } from '../data/airports';
import { lookupFlight, looksLikeFlightNumber, FlightLookupError } from '../services/FlightLookupService';
import { distanceKm } from '../utils/narrator';
import { useTheme } from '../hooks/useTheme';

const QUICK_ROUTES = [
  ['VNO', 'LHR'], ['VNO', 'FRA'], ['VNO', 'IST'], ['VNO', 'BCN'],
  ['RIX', 'LHR'], ['LHR', 'JFK'], ['JFK', 'LAX'], ['SFO', 'HND'],
  ['DXB', 'SIN'], ['FRA', 'JNB'], ['SYD', 'LAX'], ['CDG', 'GRU'],
];

export function PlanScreen({ onPrepare, recent = [], onRemoveRecent, headerRight }) {
  const { colors, isDark } = useTheme();
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [picker, setPicker] = useState(null); // 'origin' | 'destination' | null
  const [flightQuery, setFlightQuery] = useState('');
  const [lookup, setLookup] = useState({ state: 'idle', message: null, found: null });
  const [error, setError] = useState(null);

  const swap = useCallback(() => {
    setOrigin(destination);
    setDestination(origin);
    setLookup({ state: 'idle', message: null, found: null });
  }, [origin, destination]);

  const chooseAirport = useCallback((airport) => {
    if (picker === 'origin') setOrigin(airport);
    else setDestination(airport);
    setPicker(null);
    setError(null);
    setLookup({ state: 'idle', message: null, found: null });
  }, [picker]);

  const findFlight = useCallback(async () => {
    Keyboard.dismiss();
    setError(null);
    setLookup({ state: 'loading', message: null, found: null });
    try {
      const found = await lookupFlight(flightQuery);
      setOrigin(found.origin);
      setDestination(found.destination);
      setLookup({ state: 'ok', message: null, found });
    } catch (e) {
      const message = e instanceof FlightLookupError ? e.message : 'Something went wrong. Please choose your airports instead.';
      setLookup({ state: 'error', message, found: null });
    }
  }, [flightQuery]);

  const prepare = useCallback(() => {
    setError(null);
    if (!origin || !destination) {
      setError('Choose where you are flying from and to.');
      return;
    }
    if (origin.code === destination.code) {
      setError('Departure and arrival are the same airport.');
      return;
    }
    const found = lookup.found;
    onPrepare({
      origin,
      destination,
      flightNumber: found ? found.flightNumber : null,
      airline: found ? found.airline : null,
    });
  }, [origin, destination, lookup.found, onPrepare]);

  const applyQuick = (from, to) => {
    setOrigin(getAirport(from));
    setDestination(getAirport(to));
    setError(null);
    setLookup({ state: 'idle', message: null, found: null });
  };

  const ready = !!origin && !!destination;
  const km = ready ? distanceKm(origin, destination) : null;
  const cardBg = isDark ? 'rgba(255,255,255,0.07)' : '#ffffff';

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.h1, { color: colors.text }]} accessibilityRole="header">Where are you flying?</Text>
      <Text style={[styles.lead, { color: colors.textSecondary }]}>
        Pick your airports. Window Seat plans what you will see from the window and narrates it as you fly, with no internet needed on board.
      </Text>

      {/* Airports */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <AirportField
          label="From"
          airport={origin}
          onPress={() => setPicker('origin')}
          colors={colors}
        />
        <View style={styles.swapRow}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            onPress={swap}
            style={[styles.swapButton, { backgroundColor: colors.buttonBackground, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Swap departure and arrival"
          >
            <Text style={[styles.swapText, { color: colors.primary }]}>⇅</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        </View>
        <AirportField
          label="To"
          airport={destination}
          onPress={() => setPicker('destination')}
          colors={colors}
        />
        {ready && (
          <Text style={[styles.distance, { color: colors.textSecondary }]}>
            {Math.round(km).toLocaleString('en-US')} km · {Math.round(km * 0.621371).toLocaleString('en-US')} mi
          </Text>
        )}
      </View>

      {!!error && <Text style={[styles.error, { color: colors.error }]} accessibilityLiveRegion="polite">{error}</Text>}

      <TouchableOpacity
        style={[styles.primary, { backgroundColor: colors.primary, opacity: ready ? 1 : 0.45 }]}
        onPress={prepare}
        accessibilityRole="button"
        accessibilityLabel="Prepare my flight"
        accessibilityState={{ disabled: !ready }}
      >
        <Text style={[styles.primaryText, { color: colors.onPrimary }]}>Prepare my flight</Text>
      </TouchableOpacity>

      {/* Flight number */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>OR FIND BY FLIGHT NUMBER</Text>
      <View style={styles.flightRow}>
        <TextInput
          style={[styles.flightInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="e.g. BA115 or LO281"
          placeholderTextColor={colors.textMuted}
          value={flightQuery}
          onChangeText={(t) => {
            setFlightQuery(t);
            if (lookup.state !== 'idle') setLookup({ state: 'idle', message: null, found: null });
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={findFlight}
          accessibilityLabel="Flight number"
        />
        <TouchableOpacity
          style={[styles.findButton, { backgroundColor: colors.buttonBackground, borderColor: colors.border, opacity: looksLikeFlightNumber(flightQuery) ? 1 : 0.5 }]}
          onPress={findFlight}
          disabled={lookup.state === 'loading' || !looksLikeFlightNumber(flightQuery)}
          accessibilityRole="button"
          accessibilityLabel="Find flight"
        >
          {lookup.state === 'loading' ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.findText, { color: colors.primary }]}>Find</Text>
          )}
        </TouchableOpacity>
      </View>
      {lookup.state === 'ok' && lookup.found && (
        <Text style={[styles.ok, { color: colors.success }]} accessibilityLiveRegion="polite">
          {lookup.found.flightNumber}
          {lookup.found.airline ? ` · ${lookup.found.airline}` : ''}: {lookup.found.origin.code} → {lookup.found.destination.code}. Check that this matches your ticket, or change the airports above.
        </Text>
      )}
      {lookup.state === 'error' && (
        <Text style={[styles.warn, { color: colors.warning }]} accessibilityLiveRegion="polite">{lookup.message}</Text>
      )}
      <Text style={[styles.tiny, { color: colors.textMuted }]}>
        Flight lookup needs internet and uses a free public route database. Choosing airports works fully offline.
      </Text>

      {/* Quick routes */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>POPULAR ROUTES</Text>
      <View style={styles.chips}>
        {QUICK_ROUTES.map(([from, to]) => (
          <TouchableOpacity
            key={`${from}-${to}`}
            style={[styles.chip, { backgroundColor: colors.buttonBackground, borderColor: colors.border }]}
            onPress={() => applyQuick(from, to)}
            accessibilityRole="button"
            accessibilityLabel={`${getAirport(from)?.city} to ${getAirport(to)?.city}`}
          >
            <Text style={[styles.chipText, { color: colors.text }]}>{from} → {to}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent */}
      {recent.length > 0 && (
        <>
          <Text style={[styles.section, { color: colors.textSecondary }]}>RECENT FLIGHTS</Text>
          {recent.map((entry) => (
            <View key={entry.id} style={[styles.recent, { backgroundColor: cardBg, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.recentMain}
                onPress={() => {
                  setOrigin(getAirport(entry.origin?.code) || entry.origin);
                  setDestination(getAirport(entry.destination?.code) || entry.destination);
                  setError(null);
                  setLookup({ state: 'idle', message: null, found: null });
                }}
                accessibilityRole="button"
                accessibilityLabel={`Use ${entry.origin?.city} to ${entry.destination?.city}`}
              >
                <Text style={[styles.recentRoute, { color: colors.text }]}>
                  {entry.origin?.code} → {entry.destination?.code}
                </Text>
                <Text style={[styles.recentSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {entry.origin?.city} to {entry.destination?.city}{entry.airline ? ` · ${entry.flightNumber || ''}` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onRemoveRecent && onRemoveRecent(entry.id)}
                style={styles.recentRemove}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Remove from recent flights"
              >
                <Text style={[styles.recentRemoveText, { color: colors.textMuted }]}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <AirportPicker
        visible={!!picker}
        title={picker === 'origin' ? 'Flying from' : 'Flying to'}
        onClose={() => setPicker(null)}
        onSelect={chooseAirport}
      />
    </ScrollView>
  );
}

function AirportField({ label, airport, onPress, colors }) {
  return (
    <TouchableOpacity
      style={styles.field}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={airport ? `${label}: ${airport.city}, ${airport.code}. Tap to change` : `Choose ${label.toLowerCase()} airport`}
    >
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      {airport ? (
        <View style={styles.fieldValueRow}>
          <Text style={[styles.fieldCode, { color: colors.primary }]}>{airport.code}</Text>
          <View style={styles.fieldNames}>
            <Text style={[styles.fieldCity, { color: colors.text }]} numberOfLines={1}>{airport.city}</Text>
            <Text style={[styles.fieldName, { color: colors.textSecondary }]} numberOfLines={1}>{airport.name}</Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.fieldPlaceholder, { color: colors.textMuted }]}>Tap to choose an airport</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  h1: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  lead: { fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 18 },
  card: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 6 },
  field: { paddingVertical: 12, minHeight: 64, justifyContent: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  fieldValueRow: { flexDirection: 'row', alignItems: 'center' },
  fieldCode: { fontSize: 28, fontWeight: '800', letterSpacing: 1, width: 84 },
  fieldNames: { flex: 1 },
  fieldCity: { fontSize: 18, fontWeight: '600' },
  fieldName: { fontSize: 13, marginTop: 1 },
  fieldPlaceholder: { fontSize: 17, paddingVertical: 4 },
  swapRow: { flexDirection: 'row', alignItems: 'center' },
  divider: { flex: 1, height: 1 },
  swapButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 10 },
  swapText: { fontSize: 20, fontWeight: '700' },
  distance: { fontSize: 13, textAlign: 'center', paddingBottom: 10 },
  error: { fontSize: 14, marginTop: 10 },
  primary: { marginTop: 16, borderRadius: 30, paddingVertical: 18, alignItems: 'center', minHeight: 56 },
  primaryText: { fontSize: 17, fontWeight: '800' },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginTop: 28, marginBottom: 10 },
  flightRow: { flexDirection: 'row' },
  flightInput: { flex: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginRight: 10 },
  findButton: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', minWidth: 76 },
  findText: { fontSize: 16, fontWeight: '700' },
  ok: { fontSize: 14, lineHeight: 20, marginTop: 10 },
  warn: { fontSize: 14, lineHeight: 20, marginTop: 10 },
  tiny: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, marginBottom: 8, minHeight: 40, justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  recent: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  recentMain: { flex: 1, paddingVertical: 12, paddingHorizontal: 16 },
  recentRoute: { fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  recentSub: { fontSize: 13, marginTop: 2 },
  recentRemove: { paddingHorizontal: 16, paddingVertical: 12 },
  recentRemoveText: { fontSize: 24 },
});

export default PlanScreen;

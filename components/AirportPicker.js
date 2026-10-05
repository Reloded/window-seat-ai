import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchAirports, getAirport } from '../data/airports';
import { useTheme } from '../hooks/useTheme';

const POPULAR = [
  'VNO', 'RIX', 'TLL', 'KUN', 'WAW', 'LHR', 'CDG', 'AMS', 'FRA', 'MAD', 'BCN', 'FCO', 'IST', 'ARN', 'CPH', 'HEL',
  'DXB', 'DOH', 'JFK', 'LAX', 'ORD', 'SFO', 'MIA', 'YYZ', 'GRU', 'SIN', 'HKG', 'HND', 'ICN', 'DEL', 'BKK', 'SYD',
]
  .map(getAirport)
  .filter(Boolean);

export function AirportPicker({ visible, title, onClose, onSelect }) {
  const { colors, isDark } = useTheme();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const results = useMemo(() => (query.trim() ? searchAirports(query, 40) : POPULAR), [query]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Close airport search"
            >
              <Text style={[styles.headerButtonText, { color: colors.primary }]}>Close</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
              {title}
            </Text>
            <View style={styles.headerButton} />
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="City, airport or code (e.g. Vilnius, VNO)"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search airports"
          />

          {!query.trim() && (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>Popular airports</Text>
          )}

          <FlatList
            data={results}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                No airport found for "{query}". Try the city name or the 3-letter code.
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, { borderBottomColor: colors.border }]}
                onPress={() => onSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.city}, ${item.name}, ${item.code}`}
              >
                <View style={[styles.codeBadge, { backgroundColor: isDark ? 'rgba(0,212,255,0.14)' : 'rgba(0,120,160,0.12)' }]}>
                  <Text style={[styles.code, { color: colors.primary }]}>{item.code}</Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.city, { color: colors.text }]} numberOfLines={1}>
                    {item.city}
                  </Text>
                  <Text style={[styles.airportName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.name} · {item.country}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerButton: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  headerButtonText: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700' },
  input: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  hint: { marginHorizontal: 20, marginBottom: 4, fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', marginTop: 32, paddingHorizontal: 24, fontSize: 15, lineHeight: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  codeBadge: {
    width: 56,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 14,
  },
  code: { fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  rowText: { flex: 1 },
  city: { fontSize: 17, fontWeight: '600' },
  airportName: { fontSize: 13, marginTop: 2 },
});

export default AirportPicker;

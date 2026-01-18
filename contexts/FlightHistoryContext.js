import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_STORAGE_KEY = '@window_seat_flight_history';

const FlightHistoryContext = createContext(null);

export function FlightHistoryProvider({ children }) {
  const [history, setHistory] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load history from AsyncStorage on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load flight history:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveHistory = async (newHistory) => {
    try {
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save flight history:', error);
    }
  };

  const addFlightToHistory = useCallback((flightData) => {
    setHistory(prev => {
      // Check if this flight already exists (by flight number)
      const existingIndex = prev.findIndex(
        entry => entry.flightNumber === flightData.flightNumber
      );

      const newEntry = {
        id: `${flightData.flightNumber}_${Date.now()}`,
        flightNumber: flightData.flightNumber,
        airline: flightData.airline || null,
        origin: flightData.origin || null,
        destination: flightData.destination || null,
        downloadedAt: new Date().toISOString(),
        lastFlown: null,
        isFavorite: existingIndex >= 0 ? prev[existingIndex].isFavorite : false,
        checkpointCount: flightData.checkpointCount || 0,
        hasAudio: flightData.hasAudio || false,
        packCached: true,
      };

      let newHistory;
      if (existingIndex >= 0) {
        // Update existing entry, move to top
        newHistory = [
          newEntry,
          ...prev.filter((_, i) => i !== existingIndex),
        ];
      } else {
        // Add new entry at top
        newHistory = [newEntry, ...prev];
      }

      saveHistory(newHistory);
      return newHistory;
    });
  }, []);

  const toggleFavorite = useCallback((flightId) => {
    setHistory(prev => {
      const newHistory = prev.map(entry =>
        entry.id === flightId
          ? { ...entry, isFavorite: !entry.isFavorite }
          : entry
      );
      saveHistory(newHistory);
      return newHistory;
    });
  }, []);

  const markAsFlown = useCallback((flightId) => {
    setHistory(prev => {
      const newHistory = prev.map(entry =>
        entry.id === flightId
          ? { ...entry, lastFlown: new Date().toISOString() }
          : entry
      );
      saveHistory(newHistory);
      return newHistory;
    });
  }, []);

  const updatePackCached = useCallback((flightNumber, cached) => {
    setHistory(prev => {
      const newHistory = prev.map(entry =>
        entry.flightNumber === flightNumber
          ? { ...entry, packCached: cached }
          : entry
      );
      saveHistory(newHistory);
      return newHistory;
    });
  }, []);

  const markAllUncached = useCallback(() => {
    setHistory(prev => {
      const newHistory = prev.map(entry => ({
        ...entry,
        packCached: false,
      }));
      saveHistory(newHistory);
      return newHistory;
    });
  }, []);

  const removeFromHistory = useCallback((flightId) => {
    setHistory(prev => {
      const newHistory = prev.filter(entry => entry.id !== flightId);
      saveHistory(newHistory);
      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await saveHistory([]);
  }, []);

  // Getters
  const getFavorites = useCallback(() => {
    return history.filter(entry => entry.isFavorite);
  }, [history]);

  const getRecentFlights = useCallback((limit = 10) => {
    return history.slice(0, limit);
  }, [history]);

  const value = {
    history,
    isLoaded,
    addFlightToHistory,
    toggleFavorite,
    markAsFlown,
    updatePackCached,
    markAllUncached,
    removeFromHistory,
    clearHistory,
    getFavorites,
    getRecentFlights,
  };

  return (
    <FlightHistoryContext.Provider value={value}>
      {children}
    </FlightHistoryContext.Provider>
  );
}

export function useFlightHistory() {
  const context = useContext(FlightHistoryContext);
  if (!context) {
    throw new Error('useFlightHistory must be used within a FlightHistoryProvider');
  }
  return context;
}

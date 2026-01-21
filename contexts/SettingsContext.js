import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@window_seat_settings';

const DEFAULT_SETTINGS = {
  voice: {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    stability: 0.5,
    similarityBoost: 0.75,
    useSpeakerBoost: true,
    volume: 0.8,
  },
  narration: {
    contentFocus: 'mixed', // geological, historical, cultural, mixed
    length: 'medium',      // short, medium, long
    checkpointsPerFlight: 20,
    geofenceRadius: 15000, // meters
  },
  gps: {
    accuracy: 'high',       // high, balanced, low
    distanceInterval: 1000, // meters
    timeInterval: 5000,     // ms
  },
  display: {
    theme: 'dark',          // dark, light, system
    language: 'en',         // en, es, fr, de, it, pt, ja, zh, ko
  },
  api: {
    claudeApiKey: '',
    elevenLabsApiKey: '',
    flightApiKey: '',
  },
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Deep merge with defaults to handle new settings fields
        setSettings(deepMerge(DEFAULT_SETTINGS, parsed));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const updateSettings = useCallback((category, updates) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        [category]: {
          ...prev[category],
          ...updates,
        },
      };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const updateVoiceSettings = useCallback((updates) => {
    updateSettings('voice', updates);
  }, [updateSettings]);

  const updateNarrationSettings = useCallback((updates) => {
    updateSettings('narration', updates);
  }, [updateSettings]);

  const updateGpsSettings = useCallback((updates) => {
    updateSettings('gps', updates);
  }, [updateSettings]);

  const updateDisplaySettings = useCallback((updates) => {
    updateSettings('display', updates);
  }, [updateSettings]);

  const updateApiSettings = useCallback((updates) => {
    updateSettings('api', updates);
  }, [updateSettings]);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    await saveSettings(DEFAULT_SETTINGS);
  }, []);

  const value = {
    settings,
    isLoaded,
    updateVoiceSettings,
    updateNarrationSettings,
    updateGpsSettings,
    updateDisplaySettings,
    updateApiSettings,
    resetSettings,
    DEFAULT_SETTINGS,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// Deep merge helper
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

export { DEFAULT_SETTINGS };

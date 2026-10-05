import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@window_seat_settings_v2';

const DEFAULT_SETTINGS = {
  voice: {
    enabled: true,
    rate: 0.95, // speaking speed for the device voice
  },
  display: {
    theme: 'dark', // dark | light | system
  },
  flight: {
    keepAwake: true, // keep the screen on while a flight is running
  },
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored && !cancelled) {
          setSettings(deepMerge(DEFAULT_SETTINGS, JSON.parse(stored)));
        }
      } catch (error) {
        console.warn('Failed to load settings:', error);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback((category, updates) => {
    setSettings(prev => {
      const next = { ...prev, [category]: { ...prev[category], ...updates } };
      AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next)).catch(error =>
        console.warn('Failed to save settings:', error)
      );
      return next;
    });
  }, []);

  const updateVoiceSettings = useCallback(updates => updateSettings('voice', updates), [updateSettings]);
  const updateDisplaySettings = useCallback(updates => updateSettings('display', updates), [updateSettings]);
  const updateFlightSettings = useCallback(updates => updateSettings('flight', updates), [updateSettings]);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (error) {
      console.warn('Failed to reset settings:', error);
    }
  }, []);

  const value = {
    settings,
    isLoaded,
    updateVoiceSettings,
    updateDisplaySettings,
    updateFlightSettings,
    resetSettings,
    DEFAULT_SETTINGS,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

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

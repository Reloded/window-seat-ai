import { Appearance } from 'react-native';

/**
 * Theme color definitions for dark and light modes
 */
export const themes = {
  dark: {
    name: 'dark',
    colors: {
      // Backgrounds
      background: '#0a1628',
      backgroundSecondary: '#0d1e33',
      backgroundTertiary: 'rgba(255, 255, 255, 0.08)',
      backgroundOverlay: 'rgba(0, 0, 0, 0.3)',

      // Text
      text: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.6)',
      textMuted: '#666666',

      // Accent colors
      primary: '#00d4ff',
      primaryDark: '#0a1628',
      success: '#4caf50',
      warning: '#ffc107',
      error: '#ff6b6b',

      // UI Elements
      border: 'rgba(255, 255, 255, 0.1)',
      inputBackground: 'rgba(255, 255, 255, 0.1)',
      buttonBackground: 'rgba(255, 255, 255, 0.1)',
      cardBackground: 'rgba(255, 255, 255, 0.08)',

      // Status bar
      statusBar: 'light-content',
    },
  },
  light: {
    name: 'light',
    colors: {
      // Backgrounds
      background: '#f5f7fa',
      backgroundSecondary: '#ffffff',
      backgroundTertiary: 'rgba(0, 0, 0, 0.05)',
      backgroundOverlay: 'rgba(0, 0, 0, 0.1)',

      // Text
      text: '#1a1a2e',
      textSecondary: 'rgba(26, 26, 46, 0.7)',
      textMuted: '#888888',

      // Accent colors
      primary: '#0099cc',
      primaryDark: '#006688',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#e53935',

      // UI Elements
      border: 'rgba(0, 0, 0, 0.1)',
      inputBackground: 'rgba(0, 0, 0, 0.05)',
      buttonBackground: 'rgba(0, 0, 0, 0.08)',
      cardBackground: '#ffffff',

      // Status bar
      statusBar: 'dark-content',
    },
  },
};

/**
 * Get theme based on setting (dark, light, or system)
 */
export function getTheme(themeSetting) {
  if (themeSetting === 'system') {
    const colorScheme = Appearance.getColorScheme();
    return themes[colorScheme === 'light' ? 'light' : 'dark'];
  }
  return themes[themeSetting] || themes.dark;
}

/**
 * Get just the colors for a theme setting
 */
export function getThemeColors(themeSetting) {
  return getTheme(themeSetting).colors;
}

export default themes;

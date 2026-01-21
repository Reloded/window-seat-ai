import { useMemo } from 'react';
import { Appearance } from 'react-native';
import { useSettings } from '../contexts';
import { getTheme, getThemeColors } from '../config';

/**
 * Hook to get current theme based on user settings
 * Returns theme colors and helper utilities
 */
export function useTheme() {
  const { settings } = useSettings();
  const themeSetting = settings.display?.theme || 'dark';

  const theme = useMemo(() => {
    return getTheme(themeSetting);
  }, [themeSetting]);

  const colors = useMemo(() => {
    return getThemeColors(themeSetting);
  }, [themeSetting]);

  const isDark = useMemo(() => {
    if (themeSetting === 'system') {
      return Appearance.getColorScheme() !== 'light';
    }
    return themeSetting === 'dark';
  }, [themeSetting]);

  return {
    theme,
    colors,
    isDark,
    themeSetting,
  };
}

export default useTheme;

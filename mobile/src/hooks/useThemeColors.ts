import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { darkColors, lightColors, type ThemeColors } from '../constants/theme';

export function useThemeColors(): ThemeColors {
  const themeMode = useAppStore((s) => s.settings.themeMode);
  const systemScheme = useColorScheme();

  const resolvedMode = themeMode === 'system' ? (systemScheme ?? 'light') : themeMode;
  return resolvedMode === 'dark' ? darkColors : lightColors;
}

export function useIsDarkMode(): boolean {
  const themeMode = useAppStore((s) => s.settings.themeMode);
  const systemScheme = useColorScheme();
  const resolvedMode = themeMode === 'system' ? (systemScheme ?? 'light') : themeMode;
  return resolvedMode === 'dark';
}

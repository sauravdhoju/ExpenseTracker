import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useThemeColors, useIsDarkMode } from '../../hooks/useThemeColors';

export default function SafeScreen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const isDarkMode = useIsDarkMode();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return (
    <View style={{ paddingTop: insets.top, flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {children}
    </View>
  );
}

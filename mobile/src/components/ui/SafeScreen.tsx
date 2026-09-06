import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';

export default function SafeScreen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  return (
    <View style={{ paddingTop: insets.top, flex: 1, backgroundColor: colors.background }}>
      {children}
    </View>
  );
}

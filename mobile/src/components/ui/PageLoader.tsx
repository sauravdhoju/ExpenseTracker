import { ActivityIndicator, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

export default function PageLoader() {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

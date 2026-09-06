import { View, type ViewProps } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius, spacing } from '../../constants/theme';

export default function Card({ style, ...rest }: ViewProps) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          padding: spacing.lg,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
          elevation: 2,
        },
        style,
      ]}
      {...rest}
    />
  );
}

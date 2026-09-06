import { ActivityIndicator, Text, TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius, spacing } from '../../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export default function Button({ label, variant = 'primary', loading, disabled, style, ...rest }: ButtonProps) {
  const colors = useThemeColors();

  const backgroundColor =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.expense : 'transparent';
  const textColor = variant === 'secondary' ? colors.primary : colors.white;
  const borderColor = variant === 'secondary' ? colors.primary : 'transparent';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled || loading}
      style={[
        {
          backgroundColor,
          borderColor,
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          borderRadius: radius.full,
          paddingVertical: spacing.md,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={{ color: textColor, fontSize: 16, fontWeight: '600' }}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

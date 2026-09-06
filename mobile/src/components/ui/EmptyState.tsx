import { Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius, spacing } from '../../constants/theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

/** Bare empty-state content (no card background) - wrap in <Card> when used on its own. */
export default function EmptyState({ icon, title, message, actionLabel, onAction, style }: EmptyStateProps) {
  const colors = useThemeColors();
  return (
    <View style={[{ alignItems: 'center', paddingVertical: spacing.xxl }, style]}>
      <Ionicons name={icon} size={44} color={colors.textLight} style={{ marginBottom: spacing.md }} />
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
        {title}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.textLight,
          textAlign: 'center',
          marginBottom: onAction ? spacing.lg : 0,
          lineHeight: 20,
        }}
      >
        {message}
      </Text>
      {onAction && actionLabel && (
        <TouchableOpacity
          onPress={onAction}
          accessibilityRole="button"
          style={{
            backgroundColor: colors.primary,
            paddingVertical: spacing.sm + 2,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.full,
          }}
        >
          <Text style={{ color: colors.white, fontWeight: '600' }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

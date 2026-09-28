import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius, spacing } from '../../constants/theme';

/** Small uppercase label that introduces a block, with an optional text link on the right. */
export function SectionTitle({
  title,
  linkLabel,
  onLinkPress,
  first,
}: {
  title: string;
  linkLabel?: string;
  onLinkPress?: () => void;
  /** Drops the top margin when the title is the first thing on a screen. */
  first?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: first ? 0 : 28,
        marginBottom: spacing.md,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: colors.textLight, textTransform: 'uppercase' }}>
        {title}
      </Text>
      {onLinkPress && linkLabel && (
        <TouchableOpacity onPress={onLinkPress} hitSlop={10}>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.primaryDeep }}>{linkLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Flat white sheet: hairline border, no shadow. */
export function Sheet({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Row inside a Sheet, separated from the next by a hairline. */
export function SheetRow({
  children,
  last,
  onPress,
  onLongPress,
}: {
  children: ReactNode;
  last?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      disabled={!onPress && !onLongPress}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      {children}
    </TouchableOpacity>
  );
}

/** Label + figure pair used in summary strips (e.g. "Spent / NPR 1,250"). */
export function Stat({
  label,
  value,
  color,
  onPress,
  align = 'flex-start',
}: {
  label: string;
  value: string;
  color?: string;
  onPress?: () => void;
  align?: 'flex-start' | 'center' | 'flex-end';
}) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity activeOpacity={0.6} disabled={!onPress} onPress={onPress} style={{ flex: 1, alignItems: align }}>
      <Text style={{ fontSize: 11.5, color: colors.textLight }}>{label}</Text>
      <Text
        style={{ fontSize: 16, fontWeight: '800', color: color ?? colors.text, marginTop: 3, fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </TouchableOpacity>
  );
}

/** Colour dot used instead of icon badges. */
export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

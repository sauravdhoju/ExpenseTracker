import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing } from '../../constants/theme';

export function SectionTitle({ title, linkLabel, onLinkPress }: { title: string; linkLabel?: string; onLinkPress?: () => void }) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 30,
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
          borderRadius: 12,
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
export function SheetRow({ children, last, onPress }: { children: ReactNode; last?: boolean; onPress?: () => void }) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      disabled={!onPress}
      onPress={onPress}
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

interface Props {
  title: string;
  linkLabel?: string;
  onLinkPress?: () => void;
  children: ReactNode;
}

export default function SectionCard({ title, linkLabel = 'See all', onLinkPress, children }: Props) {
  return (
    <View>
      <SectionTitle title={title} linkLabel={linkLabel} onLinkPress={onLinkPress} />
      <Sheet style={{ paddingVertical: spacing.md }}>{children}</Sheet>
    </View>
  );
}

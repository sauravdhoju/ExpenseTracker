import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCurrency } from '../../hooks/useCurrency';
import { useAppStore } from '../../store/useAppStore';
import { radius, spacing } from '../../constants/theme';
import ShortcutConfirmSheet from '../ShortcutConfirmSheet';
import { SectionTitle } from './SectionCard';
import { formatPlain } from './money';
import type { Shortcut } from '../../types';

export default function QuickAddRow() {
  const colors = useThemeColors();
  const { currency } = useCurrency();
  const router = useRouter();
  const shortcuts = useAppStore((s) => s.shortcuts);
  const [activeShortcut, setActiveShortcut] = useState<Shortcut | null>(null);

  const pill = {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  };

  return (
    <View>
      <SectionTitle title="Quick add" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.xl }}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.xl }}
      >
        {shortcuts.map((shortcut) => (
          <TouchableOpacity
            key={shortcut.id}
            onPress={() => setActiveShortcut(shortcut)}
            onLongPress={() => router.push({ pathname: '/shortcuts/[id]', params: { id: shortcut.id } })}
            style={pill}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
              {shortcut.label}
              <Text style={{ fontWeight: '500', color: colors.textLight }}>  {formatPlain(shortcut.amount, currency)}</Text>
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => router.push('/shortcuts/new')}
          style={[pill, { backgroundColor: 'transparent', borderStyle: 'dashed' }]}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primaryDeep }}>+ New</Text>
        </TouchableOpacity>
      </ScrollView>

      <ShortcutConfirmSheet shortcut={activeShortcut} onClose={() => setActiveShortcut(null)} />
    </View>
  );
}

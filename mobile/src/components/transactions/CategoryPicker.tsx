import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store/useAppStore';
import { addDays, todayISO } from '../../utils/date';
import { radius, spacing } from '../../constants/theme';
import { Dot, Sheet } from '../ui/Sheet';
import type { Category, CategoryKind } from '../../types';

const QUICK_COUNT = 4;
const USAGE_WINDOW_DAYS = 90;

interface Props {
  kind: CategoryKind;
  value: string | null;
  onChange: (id: string) => void;
  onManage: () => void;
}

/**
 * One compact field: the chosen category (tap to open a searchable picker) plus a single
 * line of the few most-used categories for one-tap entry. Only enabled categories are offered.
 */
export default function CategoryPicker({ kind, value, onChange, onManage }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const categories = useAppStore((s) => s.categories);
  const transactions = useAppStore((s) => s.transactions);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const ordered = useMemo(() => {
    const since = addDays(todayISO(), -USAGE_WINDOW_DAYS);
    const usage = new Map<string, number>();
    for (const t of transactions) {
      if (t.categoryId && t.date >= since) usage.set(t.categoryId, (usage.get(t.categoryId) ?? 0) + 1);
    }
    return categories
      .filter((c) => c.kind === kind && (c.isEnabled || c.id === value))
      .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.name.localeCompare(b.name));
  }, [categories, transactions, kind, value]);

  const selected = ordered.find((c) => c.id === value) ?? null;
  const quick = ordered.filter((c) => c.id !== value).slice(0, QUICK_COUNT);
  const q = query.trim().toLowerCase();
  const matches = q ? ordered.filter((c) => c.name.toLowerCase().includes(q)) : ordered;

  const pick = (c: Category) => {
    onChange(c.id);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <Sheet>
        <TouchableOpacity
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={selected ? `Category: ${selected.name}. Change` : 'Choose category'}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
        >
          {selected ? (
            <Ionicons name={selected.icon as keyof typeof Ionicons.glyphMap} size={20} color={selected.color} />
          ) : (
            <Ionicons name="pricetag-outline" size={19} color={colors.textLight} />
          )}
          <Text
            style={{
              flex: 1,
              marginLeft: spacing.md,
              fontSize: 15,
              fontWeight: selected ? '700' : '500',
              color: selected ? colors.text : colors.textLight,
            }}
            numberOfLines={1}
          >
            {selected?.name ?? 'Choose category'}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primaryDeep, marginRight: 4 }}>
            {selected ? 'Change' : 'All'}
          </Text>
          <Ionicons name="chevron-forward" size={15} color={colors.primaryDeep} />
        </TouchableOpacity>

        {quick.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ borderTopWidth: 1, borderTopColor: colors.border }}
            contentContainerStyle={{ gap: spacing.sm, paddingVertical: 10 }}
          >
            {quick.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => onChange(c.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 11,
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Dot color={c.color} size={7} />
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.text }}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </Sheet>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.lg,
              paddingBottom: insets.bottom + spacing.md,
              maxHeight: '80%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                {kind === 'income' ? 'Income category' : 'Expense category'}
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {ordered.length > 8 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  marginBottom: spacing.md,
                }}
              >
                <Ionicons name="search" size={16} color={colors.textLight} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search categories"
                  placeholderTextColor={colors.textLight}
                  style={{ flex: 1, paddingVertical: 10, paddingHorizontal: spacing.sm, color: colors.text, fontSize: 14 }}
                />
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Sheet>
                {matches.map((c, i) => {
                  const active = c.id === value;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => pick(c)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 13,
                        borderBottomWidth: i === matches.length - 1 ? 0 : 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={19} color={c.color} />
                      <Text
                        style={{ flex: 1, marginLeft: spacing.md, fontSize: 15, fontWeight: active ? '700' : '500', color: colors.text }}
                        numberOfLines={1}
                      >
                        {c.name}
                      </Text>
                      {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
                {matches.length === 0 && (
                  <Text style={{ fontSize: 14, color: colors.textLight, paddingVertical: spacing.lg, textAlign: 'center' }}>
                    No category called “{query.trim()}”.
                  </Text>
                )}
              </Sheet>
            </ScrollView>

            <TouchableOpacity
              onPress={() => {
                setOpen(false);
                onManage();
              }}
              style={{ alignSelf: 'center', paddingVertical: spacing.md }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.primaryDeep }}>Add or manage categories</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

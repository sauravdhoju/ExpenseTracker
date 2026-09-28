import { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCurrency } from '../../hooks/useCurrency';
import { useAppStore } from '../../store/useAppStore';
import { filterByDay } from '../../services/calculations';
import { spacing } from '../../constants/theme';
import { SectionTitle } from './SectionCard';
import { MASK, formatPlain } from './money';
import { activityHref, ranges } from '../../utils/links';

const MAX_ROWS = 5;

interface Slice {
  categoryId: string | null;
  amount: number;
}

// Sits directly on the page (no card): a proportion bar and a legend with aligned figures.
export default function WhereItWent({ now }: { now: Date }) {
  const colors = useThemeColors();
  const { currency, hideBalances } = useCurrency();
  const router = useRouter();
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);

  const { slices, total } = useMemo(() => {
    const byCategory = new Map<string | null, Slice>();
    let total = 0;
    for (const t of filterByDay(transactions, now)) {
      if (t.type !== 'expense') continue;
      const slice = byCategory.get(t.categoryId) ?? { categoryId: t.categoryId, amount: 0 };
      slice.amount += t.amount;
      byCategory.set(t.categoryId, slice);
      total += t.amount;
    }
    return { slices: [...byCategory.values()].sort((a, b) => b.amount - a.amount), total };
  }, [transactions, now]);

  const resolve = (id: string | null) => {
    const category = categories.find((c) => c.id === id);
    return { name: category?.name ?? 'Uncategorized', color: category?.color ?? colors.textLight };
  };

  // Anything past MAX_ROWS is folded into a single "Other" line so the list stays short.
  const rows = slices.slice(0, MAX_ROWS);
  const rest = slices.slice(MAX_ROWS).reduce((sum, s) => sum + s.amount, 0);

  return (
    <View>
      <SectionTitle title="Where it went" />

      {slices.length === 0 ? (
        <Text style={{ fontSize: 14, color: colors.textLight, lineHeight: 20 }}>
          No spending yet today. Your categories will show up here as you add expenses.
        </Text>
      ) : (
        <>
          <View style={{ flexDirection: 'row', height: 8, gap: 2, borderRadius: 4, overflow: 'hidden', marginBottom: spacing.xs }}>
            {slices.map((s) => (
              <View
                key={s.categoryId ?? 'none'}
                style={{ flex: Math.max(s.amount / total, 0.02), backgroundColor: resolve(s.categoryId).color }}
              />
            ))}
          </View>

          {rows.map((s, i) => {
            const c = resolve(s.categoryId);
            const isLast = i === rows.length - 1 && rest === 0;
            return (
              <TouchableOpacity
                key={s.categoryId ?? 'none'}
                activeOpacity={0.6}
                onPress={() => router.push(activityHref({ range: ranges.today(now), type: 'expense', categoryId: s.categoryId }))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color, marginRight: spacing.md }} />
                <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '500', color: colors.text }} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={{ width: 44, textAlign: 'right', fontSize: 13, color: colors.textLight }}>
                  {Math.round((s.amount / total) * 100)}%
                </Text>
                <Text
                  style={{
                    width: 96,
                    textAlign: 'right',
                    fontSize: 14.5,
                    fontWeight: '700',
                    color: colors.text,
                    fontVariant: ['tabular-nums'],
                  }}
                  numberOfLines={1}
                >
                  {hideBalances ? MASK : formatPlain(s.amount, currency)}
                </Text>
              </TouchableOpacity>
            );
          })}

          {rest > 0 && (
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => router.push(activityHref({ range: ranges.today(now), type: 'expense' }))}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border, marginRight: spacing.md }} />
              <Text style={{ flex: 1, fontSize: 14.5, color: colors.textLight }}>
                {slices.length - MAX_ROWS} other {slices.length - MAX_ROWS === 1 ? 'category' : 'categories'}
              </Text>
              <Text style={{ width: 44, textAlign: 'right', fontSize: 13, color: colors.textLight }}>
                {Math.round((rest / total) * 100)}%
              </Text>
              <Text style={{ width: 96, textAlign: 'right', fontSize: 14.5, fontWeight: '700', color: colors.text }}>
                {hideBalances ? MASK : formatPlain(rest, currency)}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

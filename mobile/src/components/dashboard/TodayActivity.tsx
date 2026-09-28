import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCurrency } from '../../hooks/useCurrency';
import { useAppStore } from '../../store/useAppStore';
import { filterByDay } from '../../services/calculations';
import { spacing } from '../../constants/theme';
import { Sheet, SheetRow, SectionTitle } from './SectionCard';
import { MASK, formatPlain } from './money';
import type { Transaction } from '../../types';

const MAX_ITEMS = 6;

const TYPE_LABELS: Record<Transaction['type'], string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  lent: 'Lent',
  repayment: 'Repayment',
  forgotten: 'Forgotten money',
};

function to12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export default function TodayActivity({ now }: { now: Date }) {
  const colors = useThemeColors();
  const { currency, hideBalances } = useCurrency();
  const router = useRouter();
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const accounts = useAppStore((s) => s.accounts);

  const today = useMemo(
    () => [...filterByDay(transactions, now)].sort((a, b) => b.time.localeCompare(a.time)),
    [transactions, now]
  );
  const shown = today.slice(0, MAX_ITEMS);

  return (
    <View>
      <SectionTitle
        title={today.length === 0 ? 'Today' : `Today · ${today.length} ${today.length === 1 ? 'entry' : 'entries'}`}
        linkLabel="All activity"
        onLinkPress={() => router.push('/(root)/(tabs)/transactions')}
      />
      <Sheet>
        {shown.length === 0 ? (
          <Text style={{ fontSize: 14, color: colors.textLight, paddingVertical: spacing.lg, textAlign: 'center' }}>
            Nothing logged yet today.
          </Text>
        ) : (
          shown.map((t, i) => {
            const category = categories.find((c) => c.id === t.categoryId);
            const account = accounts.find((a) => a.id === t.accountId);
            const isOut = t.type === 'expense' || t.type === 'lent';
            const isIn = t.type === 'income' || t.type === 'repayment';
            const dot = category?.color ?? (isIn ? colors.income : colors.textLight);
            return (
              <SheetRow
                key={t.id}
                last={i === shown.length - 1}
                onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot, marginRight: spacing.md }} />
                <View style={{ flex: 1, marginRight: spacing.md }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                    {t.title || category?.name || TYPE_LABELS[t.type]}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }} numberOfLines={1}>
                    {to12h(t.time)}
                    {account ? ` · ${account.name}` : ''}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 14.5,
                    fontWeight: '700',
                    color: isIn ? colors.income : colors.text,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {hideBalances ? MASK : `${isOut ? '−' : isIn ? '+' : ''}${formatPlain(t.amount, currency)}`}
                </Text>
              </SheetRow>
            );
          })
        )}
      </Sheet>
      {today.length > MAX_ITEMS && (
        <Text style={{ fontSize: 12.5, color: colors.textLight, textAlign: 'center', marginTop: spacing.sm }}>
          +{today.length - MAX_ITEMS} earlier today
        </Text>
      )}
    </View>
  );
}

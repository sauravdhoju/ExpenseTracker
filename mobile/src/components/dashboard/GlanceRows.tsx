import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCurrency } from '../../hooks/useCurrency';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useAppStore } from '../../store/useAppStore';
import {
  filterByMonth,
  getBudgetEngineSummary,
  getCurrentStreak,
  getLoanSummary,
  getLongestStreak,
  getMonthlyComparison,
  getTotalBalance,
  getTotalExpenses,
  getUpcomingBills,
  trackedDatesSet,
} from '../../services/calculations';
import { shiftMonth } from '../../utils/bsDate';
import { addDays, daysBetween, toISODate } from '../../utils/date';
import { spacing } from '../../constants/theme';
import { SheetRow } from './SectionCard';
import { MASK, formatPlain } from './money';

interface GlanceRowProps {
  title: string;
  subtitle: string;
  value: string;
  valueColor?: string;
  last?: boolean;
  onPress?: () => void;
  accessory?: ReactNode;
}

function GlanceRow({ title, subtitle, value, valueColor, last, onPress, accessory }: GlanceRowProps) {
  const colors = useThemeColors();
  return (
    <SheetRow last={last} onPress={onPress}>
      <View style={{ flex: 1, marginRight: spacing.md }}>
        <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.text }} numberOfLines={1}>
          {title}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: valueColor ?? colors.text, fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
        {accessory}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={14} color={colors.border} style={{ marginLeft: spacing.sm }} />}
    </SheetRow>
  );
}

function Meter({ percent, color }: { percent: number; color: string }) {
  const colors = useThemeColors();
  return (
    <View style={{ width: 64, height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 6, overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(Math.max(percent, 0), 100)}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

function useMoney() {
  const { hideBalances, currency } = useCurrency();
  return (n: number) => (hideBalances ? MASK : formatPlain(Math.round(n), currency));
}

type RowProps = { now: Date; last?: boolean };

export function BudgetRow({ now, last }: RowProps) {
  const colors = useThemeColors();
  const money = useMoney();
  const { dateSystem } = useDateFormat();
  const router = useRouter();
  const budgets = useAppStore((s) => s.budgets);
  const transactions = useAppStore((s) => s.transactions);
  const overall = budgets.find((b) => b.categoryId === null);
  const onPress = () => router.push('/(root)/(tabs)/budgets');

  if (!overall) {
    return <GlanceRow title="Monthly budget" subtitle="Set one to get a daily limit" value="Not set" valueColor={colors.textLight} last={last} onPress={onPress} />;
  }
  const s = getBudgetEngineSummary(overall.amount, transactions, now, dateSystem);
  const percent = overall.amount > 0 ? (s.spentThisMonth / overall.amount) * 100 : 0;
  const over = s.remainingThisMonth < 0;
  return (
    <GlanceRow
      title="Monthly budget"
      subtitle={`${s.daysRemainingInMonth} day${s.daysRemainingInMonth === 1 ? '' : 's'} to go`}
      value={over ? `${money(-s.remainingThisMonth)} over` : `${money(s.remainingThisMonth)} left`}
      valueColor={over ? colors.expense : undefined}
      last={last}
      onPress={onPress}
      accessory={<Meter percent={percent} color={over ? colors.expense : colors.primaryDeep} />}
    />
  );
}

export function WeekRow({ now, last }: RowProps) {
  const colors = useThemeColors();
  const money = useMoney();
  const router = useRouter();
  const transactions = useAppStore((s) => s.transactions);

  const { days, previous } = useMemo(() => {
    const today = toISODate(now);
    const byDate = new Map<string, number>();
    for (const t of transactions) {
      if (t.type === 'expense') byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.amount);
    }
    let previous = 0;
    for (let i = 7; i < 14; i++) previous += byDate.get(addDays(today, -i)) ?? 0;
    return { days: Array.from({ length: 7 }, (_, i) => byDate.get(addDays(today, i - 6)) ?? 0), previous };
  }, [transactions, now]);
  const total = days.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...days);
  const change = previous > 0 ? ((total - previous) / previous) * 100 : null;

  return (
    <GlanceRow
      title="Last 7 days"
      subtitle={
        change === null || Math.round(change) === 0
          ? 'Daily spending this week'
          : `${Math.abs(change).toFixed(0)}% ${change < 0 ? 'less' : 'more'} than the week before`
      }
      value={money(total)}
      last={last}
      onPress={() => router.push('/(root)/(tabs)/reports')}
      accessory={
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 18, marginTop: 5 }}>
          {days.map((d, i) => (
            <View
              key={i}
              style={{
                width: 5,
                height: Math.max(2, (d / max) * 18),
                borderRadius: 2,
                backgroundColor: i === 6 ? colors.primaryDeep : colors.border,
              }}
            />
          ))}
        </View>
      }
    />
  );
}

export function MonthRow({ now, last }: RowProps) {
  const money = useMoney();
  const { dateSystem, formatMonthYear } = useDateFormat();
  const router = useRouter();
  const transactions = useAppStore((s) => s.transactions);
  const spent = useMemo(() => getTotalExpenses(filterByMonth(transactions, now, dateSystem)), [transactions, now, dateSystem]);
  const previous = useMemo(
    () => getTotalExpenses(filterByMonth(transactions, shiftMonth(now, -1, dateSystem), dateSystem)),
    [transactions, now, dateSystem]
  );
  const { percentChange } = getMonthlyComparison(spent, previous);

  return (
    <GlanceRow
      title={formatMonthYear(now)}
      subtitle={
        previous > 0 && Math.round(percentChange) !== 0
          ? `${Math.abs(percentChange).toFixed(0)}% ${percentChange < 0 ? 'less' : 'more'} than last month so far`
          : 'Spent this month so far'
      }
      value={money(spent)}
      last={last}
      onPress={() => router.push('/(root)/(tabs)/reports')}
    />
  );
}

export function BillRow({ last }: RowProps) {
  const colors = useThemeColors();
  const money = useMoney();
  const router = useRouter();
  const bills = useAppStore((s) => s.bills);
  const next = getUpcomingBills(bills, 30)[0];
  const onPress = () => router.push('/bills');

  if (!next) {
    return <GlanceRow title="Bills" subtitle="Nothing due in the next 30 days" value="All clear" valueColor={colors.textLight} last={last} onPress={onPress} />;
  }
  const days = daysBetween(toISODate(new Date()), next.dueDate);
  return (
    <GlanceRow
      title={next.title}
      subtitle={days <= 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`}
      value={money(next.amount)}
      valueColor={days <= 1 ? colors.expense : undefined}
      last={last}
      onPress={onPress}
    />
  );
}

export function StreakRow({ now, last }: RowProps) {
  const router = useRouter();
  const dailyTracking = useAppStore((s) => s.dailyTracking);
  const streak = useMemo(() => {
    const tracked = trackedDatesSet(dailyTracking);
    return { current: getCurrentStreak(tracked, toISODate(now)), longest: getLongestStreak(tracked) };
  }, [dailyTracking, now]);

  return (
    <GlanceRow
      title="Tracking streak"
      subtitle={streak.current > 0 ? `Best ${streak.longest} day${streak.longest === 1 ? '' : 's'}` : 'Track today to start one'}
      value={`${streak.current} day${streak.current === 1 ? '' : 's'}`}
      last={last}
      onPress={() => router.push('/streaks')}
    />
  );
}

export function OwedRow({ last }: RowProps) {
  const money = useMoney();
  const router = useRouter();
  const loans = useAppStore((s) => s.loans);
  const repayments = useAppStore((s) => s.repayments);
  const summary = useMemo(() => getLoanSummary(loans, repayments), [loans, repayments]);

  return (
    <GlanceRow
      title="Owed to you"
      subtitle={summary.peopleOwing === 0 ? 'Nobody owes you right now' : `${summary.peopleOwing} ${summary.peopleOwing === 1 ? 'person' : 'people'}`}
      value={money(summary.outstanding)}
      last={last}
      onPress={() => router.push('/loans')}
    />
  );
}

const REVEAL_MS = 8000;

// Always starts masked (independent of the global hide setting) and re-masks
// itself shortly after being revealed, so it can't be read over a shoulder.
export function BalanceRow({ last }: RowProps) {
  const accounts = useAppStore((s) => s.accounts);
  const currency = useAppStore((s) => s.settings.currency);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(false), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [revealed]);

  return (
    <GlanceRow
      title="Total balance"
      subtitle={revealed ? 'Hides again in a few seconds' : 'Tap to reveal'}
      value={revealed ? formatPlain(Math.round(getTotalBalance(accounts)), currency) : MASK}
      last={last}
      onPress={() => setRevealed((r) => !r)}
    />
  );
}

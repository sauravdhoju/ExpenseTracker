import { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useDateFormat } from '../../../src/hooks/useDateFormat';
import { useAppStore } from '../../../src/store/useAppStore';
import {
  filterByRange,
  getCategorySpending,
  getForgottenLoans,
  getIdleAccounts,
  getIdleGoals,
  getNetWorth,
  getPeriodBuckets,
  getPeriodRange,
  getPreviousPeriodRange,
  getSameRangeLastYear,
  getTotalExpenses,
  getTotalIncome,
  getTotalLent,
  getTotalRepaid,
  type DateRange,
  type ReportPeriod,
} from '../../../src/services/calculations';
import { addMonths, MONTH_NAMES, todayISO } from '../../../src/utils/date';
import { formatBsDate, formatBsMonthYear, getMonthGrid, shiftMonth, type MonthGridCell } from '../../../src/utils/bsDate';
import type { DateSystem } from '../../../src/types';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import PageHeader from '../../../src/components/ui/PageHeader';
import EmptyState from '../../../src/components/ui/EmptyState';
import DateField from '../../../src/components/ui/DateField';
import DonutChart from '../../../src/components/charts/DonutChart';
import BarChart from '../../../src/components/charts/BarChart';
import LineChart from '../../../src/components/charts/LineChart';
import TransactionListItem from '../../../src/components/transactions/TransactionListItem';

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' },
];

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatRangeLabel(period: ReportPeriod, range: DateRange, dateSystem: DateSystem): string {
  const start = new Date(range.start + 'T00:00:00');
  const end = new Date(range.end + 'T00:00:00');
  if (period === 'year') return String(start.getFullYear());
  if (period === 'quarter') return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
  if (period === 'month') {
    return dateSystem === 'BS'
      ? formatBsMonthYear(start)
      : `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
  }
  if (dateSystem === 'BS') {
    return `${formatBsDate(range.start)} – ${formatBsDate(range.end)}`;
  }
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()}`;
  const endLabel = sameMonth ? `${end.getDate()}` : `${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getDate()}`;
  return `${startLabel} – ${endLabel}, ${end.getFullYear()}`;
}

function bucketLabel(period: ReportPeriod, bucket: DateRange, index: number): string {
  const start = new Date(bucket.start + 'T00:00:00');
  if (period === 'week') return String(start.getDate());
  if (period === 'quarter' || period === 'year') return MONTH_NAMES[start.getMonth()].slice(0, 3);
  return `Wk${index + 1}`;
}

function computeDelta(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return current > 0 ? 100 : -100;
  return ((current - previous) / previous) * 100;
}

function DeltaChip({ current, previous, favorableWhenUp }: { current: number; previous: number; favorableWhenUp: boolean }) {
  const colors = useThemeColors();
  const percentChange = computeDelta(current, previous);
  if (percentChange === null || percentChange === 0) return null;
  const isUp = percentChange > 0;
  const isFavorable = isUp === favorableWhenUp;
  const color = isFavorable ? colors.income : colors.expense;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: radius.full,
        backgroundColor: `${color}1A`,
      }}
    >
      <Ionicons name={isUp ? 'arrow-up' : 'arrow-down'} size={10} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '700', color }}>{Math.abs(percentChange).toFixed(0)}%</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const { format: formatDate, dateSystem } = useDateFormat();
  const router = useRouter();

  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const accounts = useAppStore((s) => s.accounts);
  const bills = useAppStore((s) => s.bills);
  const loans = useAppStore((s) => s.loans);
  const repayments = useAppStore((s) => s.repayments);
  const goals = useAppStore((s) => s.goals);
  const removeTransaction = useAppStore((s) => s.removeTransaction);

  const [view, setView] = useState<'overview' | 'calendar'>('overview');
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [periodAnchor, setPeriodAnchor] = useState(new Date());
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customStart, setCustomStart] = useState(todayISO());
  const [customEnd, setCustomEnd] = useState(todayISO());

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Other';
  const categoryColor = (id: string) => categories.find((c) => c.id === id)?.color ?? colors.textLight;

  const range = useMemo(
    () => getPeriodRange(period, periodAnchor, customRange ?? undefined),
    [period, periodAnchor, customRange]
  );
  const prevRange = useMemo(() => getPreviousPeriodRange(period, range), [period, range]);
  const lastYearRange = useMemo(() => getSameRangeLastYear(range), [range]);

  const rangeTx = useMemo(() => filterByRange(transactions, range), [transactions, range]);
  const prevRangeTx = useMemo(() => filterByRange(transactions, prevRange), [transactions, prevRange]);
  const lastYearTx = useMemo(() => filterByRange(transactions, lastYearRange), [transactions, lastYearRange]);

  const flow = useMemo(() => {
    const income = getTotalIncome(rangeTx);
    const expenses = getTotalExpenses(rangeTx);
    const lent = getTotalLent(rangeTx);
    const repaid = getTotalRepaid(rangeTx);
    return { income, expenses, lent, repaid, net: income - expenses };
  }, [rangeTx]);

  const prevFlow = useMemo(() => {
    const income = getTotalIncome(prevRangeTx);
    const expenses = getTotalExpenses(prevRangeTx);
    const lent = getTotalLent(prevRangeTx);
    const repaid = getTotalRepaid(prevRangeTx);
    return { income, expenses, lent, repaid, net: income - expenses };
  }, [prevRangeTx]);

  const lastYearExpenses = useMemo(() => getTotalExpenses(lastYearTx), [lastYearTx]);

  const categorySpending = useMemo(() => getCategorySpending(rangeTx), [rangeTx]);

  const buckets = useMemo(() => getPeriodBuckets(period, range), [period, range]);
  const bucketTotals = useMemo(
    () =>
      buckets.map((b, i) => {
        const tx = filterByRange(transactions, b);
        return { label: bucketLabel(period, b, i), income: getTotalIncome(tx), expenses: getTotalExpenses(tx) };
      }),
    [buckets, transactions, period]
  );
  const cashFlowSeries = bucketTotals.map((b) => b.income - b.expenses);
  const chartWidth = Math.max(300, bucketTotals.length * 44);

  const topExpenses = useMemo(
    () => [...rangeTx].filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5),
    [rangeTx]
  );

  const netWorth = getNetWorth(accounts);

  const forgottenLoans = useMemo(() => getForgottenLoans(loans, repayments), [loans, repayments]);
  const idleGoalsList = useMemo(() => getIdleGoals(goals), [goals]);
  const idleAccountsList = useMemo(() => getIdleAccounts(accounts, transactions), [accounts, transactions]);
  const hasForgottenItems = forgottenLoans.length + idleGoalsList.length + idleAccountsList.length > 0;

  const stepPeriod = (dir: 1 | -1) => {
    setPeriodAnchor((prev) => {
      if (period === 'week') {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7 * dir);
        return d;
      }
      if (period === 'quarter') return addMonths(prev, 3 * dir);
      if (period === 'year') return new Date(prev.getFullYear() + dir, prev.getMonth(), 1);
      return addMonths(prev, dir);
    });
  };

  const openCustomModal = () => {
    setCustomStart(customRange?.start ?? range.start);
    setCustomEnd(customRange?.end ?? range.end);
    setCustomModalOpen(true);
  };

  const applyCustomRange = () => {
    setCustomRange({ start: customStart, end: customEnd });
    setPeriod('custom');
    setCustomModalOpen(false);
  };

  // --- Calendar view data ---
  // The grid itself follows the selected calendar system (true BS month lengths/weekdays in BS mode),
  // not just a relabeled Gregorian grid — only the underlying AD ISO dates used to look up data stay fixed.
  const monthGrid = useMemo(() => getMonthGrid(calendarMonth, dateSystem), [calendarMonth, dateSystem]);
  const gridDates = useMemo(
    () => new Set(monthGrid.cells.filter((c): c is MonthGridCell => c !== null).map((c) => c.adIso)),
    [monthGrid]
  );

  const dailyExpense = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type !== 'expense' || !gridDates.has(t.date)) continue;
      map[t.date] = (map[t.date] ?? 0) + t.amount;
    }
    return map;
  }, [transactions, gridDates]);
  const maxDailyExpense = Math.max(1, ...Object.values(dailyExpense));

  const dailyIncomeDates = useMemo(
    () => new Set(transactions.filter((t) => t.type === 'income' && gridDates.has(t.date)).map((t) => t.date)),
    [transactions, gridDates]
  );
  const billsByDate = useMemo(() => {
    const map: Record<string, typeof bills> = {};
    for (const b of bills) {
      if (!gridDates.has(b.dueDate)) continue;
      (map[b.dueDate] ??= []).push(b);
    }
    return map;
  }, [bills, gridDates]);
  const loansByDate = useMemo(() => {
    const map: Record<string, typeof loans> = {};
    for (const l of loans) {
      if (!l.expectedReturnDate || !gridDates.has(l.expectedReturnDate)) continue;
      (map[l.expectedReturnDate] ??= []).push(l);
    }
    return map;
  }, [loans, gridDates]);

  const selectedDayTransactions = useMemo(
    () => (selectedDay ? transactions.filter((t) => t.date === selectedDay) : []),
    [transactions, selectedDay]
  );
  const selectedDayBills = selectedDay ? billsByDate[selectedDay] ?? [] : [];
  const selectedDayLoans = selectedDay ? loansByDate[selectedDay] ?? [] : [];

  const rowStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 130 }}>
      <PageHeader title="Reports" subtitle="Understand where your money goes" />

      {/* Overview / Calendar segmented toggle */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, padding: 4, marginBottom: spacing.lg }}>
        {(['overview', 'calendar'] as const).map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => setView(v)}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: radius.md,
              alignItems: 'center',
              backgroundColor: view === v ? colors.primary : 'transparent',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: view === v ? colors.white : colors.textLight, textTransform: 'capitalize' }}>
              {v}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {view === 'overview' ? (
        <>
          {/* Period switcher */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, marginBottom: spacing.md }}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.value}
                onPress={() => (p.value === 'custom' ? openCustomModal() : setPeriod(p.value))}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 14,
                  borderRadius: radius.full,
                  backgroundColor: period === p.value ? colors.primary : colors.card,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: period === p.value ? colors.white : colors.text }}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {period !== 'custom' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.lg }}>
              <TouchableOpacity onPress={() => stepPeriod(-1)} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{formatRangeLabel(period, range, dateSystem)}</Text>
              <TouchableOpacity onPress={() => stepPeriod(1)} hitSlop={8}>
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}
          {period === 'custom' && (
            <TouchableOpacity onPress={openCustomModal} style={{ alignSelf: 'center', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{formatRangeLabel(period, range, dateSystem)} ✎</Text>
            </TouchableOpacity>
          )}

          {/* Net worth */}
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: 4 }}>Net Worth</Text>
            <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>{format(netWorth)}</Text>
            <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>Assets minus liabilities across all accounts</Text>
          </Card>

          {/* Money Flow */}
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>Money Flow</Text>
            <View style={{ gap: spacing.sm }}>
              {[
                { label: 'Income', value: flow.income, prev: prevFlow.income, favorableWhenUp: true, color: colors.income },
                { label: 'Expenses', value: flow.expenses, prev: prevFlow.expenses, favorableWhenUp: false, color: colors.expense },
                { label: 'Lent to others', value: flow.lent, prev: prevFlow.lent, favorableWhenUp: false, color: colors.expense },
                { label: 'Repaid to me', value: flow.repaid, prev: prevFlow.repaid, favorableWhenUp: true, color: colors.income },
                { label: 'Net', value: flow.net, prev: prevFlow.net, favorableWhenUp: true, color: colors.text },
              ].map((row) => (
                <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13.5, color: colors.textLight }}>{row.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: row.color }}>{format(row.value)}</Text>
                    <DeltaChip current={row.value} previous={row.prev} favorableWhenUp={row.favorableWhenUp} />
                  </View>
                </View>
              ))}
            </View>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
            <Text style={{ fontSize: 11.5, color: colors.textLight }}>
              Same period last year: {format(lastYearExpenses)} spent
            </Text>
          </Card>

          {/* Expense breakdown */}
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>Expense Breakdown</Text>
            {categorySpending.length === 0 ? (
              <EmptyState icon="pie-chart-outline" title="No expenses yet" message="Add expenses to see your breakdown." />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                <DonutChart data={categorySpending.map((c) => ({ value: c.amount, color: categoryColor(c.categoryId) }))}>
                  <Text style={{ fontSize: 12, color: colors.textLight }}>Total</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{format(flow.expenses)}</Text>
                </DonutChart>
                <View style={{ flex: 1, gap: 8 }}>
                  {categorySpending.slice(0, 5).map((c) => (
                    <View key={c.categoryId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: categoryColor(c.categoryId) }} />
                      <Text style={{ flex: 1, fontSize: 12.5, color: colors.text }} numberOfLines={1}>
                        {categoryName(c.categoryId)}
                      </Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.text }}>{c.percent.toFixed(0)}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Card>

          {/* Trend */}
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>Income vs Expense</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ width: chartWidth }}>
                <BarChart
                  data={bucketTotals.map((b) => ({
                    label: b.label,
                    bars: [
                      { value: b.income, color: colors.income },
                      { value: b.expenses, color: colors.expense },
                    ],
                  }))}
                />
              </View>
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.income }} />
                <Text style={{ fontSize: 12, color: colors.textLight }}>Income</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.expense }} />
                <Text style={{ fontSize: 12, color: colors.textLight }}>Expense</Text>
              </View>
            </View>
          </Card>

          {/* Cash flow */}
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>Cash Flow</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart values={cashFlowSeries} color={colors.primary} width={chartWidth} height={90} />
            </ScrollView>
          </Card>

          {/* Forgotten Money */}
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>Forgotten Money</Text>
            {!hasForgottenItems ? (
              <EmptyState
                icon="checkmark-circle-outline"
                title="Nothing forgotten"
                message="No stale loans, idle goals, or idle accounts right now."
              />
            ) : (
              <View style={{ gap: spacing.md }}>
                {forgottenLoans.map(({ loan, outstanding, reason }) => (
                  <TouchableOpacity
                    key={loan.id}
                    onPress={() => router.push({ pathname: '/loans/[id]', params: { id: loan.id } })}
                    style={rowStyle}
                  >
                    <Ionicons name="people-outline" size={16} color={colors.expense} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, color: colors.text, fontWeight: '600' }}>{loan.personName}</Text>
                      <Text style={{ fontSize: 11.5, color: colors.textLight }}>
                        {reason === 'overdue' ? 'Repayment is overdue' : 'No return date — lent a while ago'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.expense }}>{format(outstanding)}</Text>
                  </TouchableOpacity>
                ))}
                {idleGoalsList.map(({ goal, daysSinceUpdate }) => (
                  <TouchableOpacity key={goal.id} onPress={() => router.push('/goals')} style={rowStyle}>
                    <Ionicons name="flag-outline" size={16} color={colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, color: colors.text, fontWeight: '600' }}>{goal.name}</Text>
                      <Text style={{ fontSize: 11.5, color: colors.textLight }}>No contribution in {daysSinceUpdate} days</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {idleAccountsList.map(({ account, daysSinceActivity }) => (
                  <TouchableOpacity
                    key={account.id}
                    onPress={() => router.push({ pathname: '/accounts/[id]', params: { id: account.id } })}
                    style={rowStyle}
                  >
                    <Ionicons name="wallet-outline" size={16} color={colors.textLight} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, color: colors.text, fontWeight: '600' }}>{account.name}</Text>
                      <Text style={{ fontSize: 11.5, color: colors.textLight }}>
                        {daysSinceActivity !== null ? `No activity in ${daysSinceActivity} days` : 'No activity since it was created'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{format(account.balance)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>

          {/* Top expenses */}
          <Card>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>Top Expenses</Text>
            {topExpenses.length === 0 ? (
              <EmptyState icon="trending-up-outline" title="No expenses yet" message="Your largest transactions will appear here." />
            ) : (
              topExpenses.map((t) => (
                <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                  <Text style={{ fontSize: 13.5, color: colors.text, flex: 1 }} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.expense }}>{format(t.amount)}</Text>
                </View>
              ))
            )}
          </Card>
        </>
      ) : (
        <>
          {/* Calendar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.lg }}>
            <TouchableOpacity onPress={() => setCalendarMonth((d) => shiftMonth(d, -1, dateSystem))} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{monthGrid.label}</Text>
            <TouchableOpacity onPress={() => setCalendarMonth((d) => shiftMonth(d, 1, dateSystem))} hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Card style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {WEEKDAY_HEADERS.map((d) => (
                <Text
                  key={d}
                  style={{ width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textLight, marginBottom: spacing.sm }}
                >
                  {d}
                </Text>
              ))}
              {monthGrid.cells.map((cell, i) => {
                if (!cell) return <View key={`blank-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
                const iso = cell.adIso;
                const expense = dailyExpense[iso] ?? 0;
                const intensity = Math.min(1, expense / maxDailyExpense);
                const hasBill = !!billsByDate[iso];
                const hasLoan = !!loansByDate[iso];
                const hasIncome = dailyIncomeDates.has(iso);
                const isToday = iso === todayISO();
                const alpha = expense > 0 ? Math.round(30 + intensity * 170) : 0;
                return (
                  <TouchableOpacity key={iso} onPress={() => setSelectedDay(iso)} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: radius.sm,
                        backgroundColor: expense > 0 ? `${colors.expense}${alpha.toString(16).padStart(2, '0')}` : 'transparent',
                        borderWidth: isToday ? 1.5 : 0,
                        borderColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: isToday ? '800' : '500', color: colors.text }}>{cell.dayNumber}</Text>
                      <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                        {hasBill && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.warning }} />}
                        {hasLoan && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary }} />}
                        {hasIncome && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.income }} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          <View style={{ flexDirection: 'row', gap: spacing.lg, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { color: colors.expense, label: 'Spending' },
              { color: colors.warning, label: 'Bill due' },
              { color: colors.primary, label: 'Loan due' },
              { color: colors.income, label: 'Income' },
            ].map((l) => (
              <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.color }} />
                <Text style={{ fontSize: 12, color: colors.textLight }}>{l.label}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Custom range modal */}
      <Modal visible={customModalOpen} transparent animationType="slide" onRequestClose={() => setCustomModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.lg }}>Custom Range</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.textLight, marginBottom: 4 }}>From</Text>
                <DateField value={customStart} onChange={setCustomStart} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.textLight, marginBottom: 4 }}>To</Text>
                <DateField value={customEnd} onChange={setCustomEnd} />
              </View>
            </View>
            <TouchableOpacity
              onPress={applyCustomRange}
              style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' }}
            >
              <Text style={{ color: colors.white, fontWeight: '700', fontSize: 15 }}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Day detail modal */}
      <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={() => setSelectedDay(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, maxHeight: '78%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                {selectedDay ? formatDate(selectedDay) : ''}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const day = selectedDay;
                  setSelectedDay(null);
                  router.push({ pathname: '/transaction/new', params: day ? { date: day } : {} });
                }}
                hitSlop={8}
              >
                <Ionicons name="add-circle" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedDayBills.map((b) => (
                <View key={b.id} style={{ ...rowStyle, marginBottom: spacing.sm }}>
                  <Ionicons name="receipt-outline" size={16} color={colors.warning} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>{b.title} due</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{format(b.amount)}</Text>
                </View>
              ))}
              {selectedDayLoans.map((l) => (
                <View key={l.id} style={{ ...rowStyle, marginBottom: spacing.sm }}>
                  <Ionicons name="people-outline" size={16} color={colors.primary} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>{l.personName}&apos;s repayment due</Text>
                </View>
              ))}
              {selectedDayTransactions.length === 0 ? (
                <EmptyState icon="receipt-outline" title="No transactions" message="Nothing recorded on this day." />
              ) : (
                selectedDayTransactions.map((t) => (
                  <TransactionListItem key={t.id} transaction={t} onDelete={removeTransaction} />
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

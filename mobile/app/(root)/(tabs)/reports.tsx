import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { adIsoToBs, formatBsDate, formatBsMonthYear, getMonthGrid, shiftMonth, shiftYear, type MonthGridCell } from '../../../src/utils/bsDate';
import { activityHref } from '../../../src/utils/links';
import type { DateSystem, TransactionType } from '../../../src/types';
import { spacing, radius } from '../../../src/constants/theme';
import PageHeader from '../../../src/components/ui/PageHeader';
import DateField from '../../../src/components/ui/DateField';
import Segmented from '../../../src/components/ui/Segmented';
import { Dot, SectionTitle, Sheet, SheetRow, Stat } from '../../../src/components/ui/Sheet';
import BarChart from '../../../src/components/charts/BarChart';
import TransactionListItem from '../../../src/components/transactions/TransactionListItem';
import { MASK } from '../../../src/components/dashboard/money';

const PERIODS: { value: Exclude<ReportPeriod, 'custom'>; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

const WEEKDAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const REVEAL_MS = 8000;

function formatRangeLabel(period: ReportPeriod, range: DateRange, dateSystem: DateSystem): string {
  const start = new Date(range.start + 'T00:00:00');
  const end = new Date(range.end + 'T00:00:00');
  if (period === 'year') return dateSystem === 'BS' ? String(adIsoToBs(range.start).year) : String(start.getFullYear());
  if (period === 'quarter') return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
  if (period === 'month') {
    return dateSystem === 'BS' ? formatBsMonthYear(start) : `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
  }
  if (dateSystem === 'BS') return `${formatBsDate(range.start)} – ${formatBsDate(range.end)}`;
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

function Delta({ current, previous, favorableWhenUp }: { current: number; previous: number; favorableWhenUp: boolean }) {
  const colors = useThemeColors();
  const change = computeDelta(current, previous);
  if (change === null || Math.round(change) === 0) return null;
  const isUp = change > 0;
  const color = isUp === favorableWhenUp ? colors.income : colors.expense;
  return (
    <Text style={{ fontSize: 11.5, fontWeight: '700', color }}>
      {isUp ? '↑' : '↓'} {Math.abs(change).toFixed(0)}%
    </Text>
  );
}

export default function ReportsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { format, hideBalances } = useCurrency();
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
  const [netWorthRevealed, setNetWorthRevealed] = useState(false);

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!netWorthRevealed) return;
    const timer = setTimeout(() => setNetWorthRevealed(false), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [netWorthRevealed]);

  const category = (id: string | null) => categories.find((c) => c.id === id);

  const range = useMemo(
    () => getPeriodRange(period, periodAnchor, customRange ?? undefined, dateSystem),
    [period, periodAnchor, customRange, dateSystem]
  );
  const prevRange = useMemo(() => getPreviousPeriodRange(period, range, dateSystem), [period, range, dateSystem]);
  const lastYearRange = useMemo(() => getSameRangeLastYear(range), [range]);

  const rangeTx = useMemo(() => filterByRange(transactions, range), [transactions, range]);
  const prevRangeTx = useMemo(() => filterByRange(transactions, prevRange), [transactions, prevRange]);
  const lastYearExpenses = useMemo(() => getTotalExpenses(filterByRange(transactions, lastYearRange)), [transactions, lastYearRange]);

  const flow = useMemo(
    () => ({
      income: getTotalIncome(rangeTx),
      expenses: getTotalExpenses(rangeTx),
      lent: getTotalLent(rangeTx),
      repaid: getTotalRepaid(rangeTx),
    }),
    [rangeTx]
  );
  const prevFlow = useMemo(
    () => ({
      income: getTotalIncome(prevRangeTx),
      expenses: getTotalExpenses(prevRangeTx),
      lent: getTotalLent(prevRangeTx),
      repaid: getTotalRepaid(prevRangeTx),
    }),
    [prevRangeTx]
  );
  const net = flow.income - flow.expenses;

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
  const chartWidth = Math.max(300, bucketTotals.length * 44);

  const topExpenses = useMemo(
    () => rangeTx.filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5),
    [rangeTx]
  );

  const netWorth = getNetWorth(accounts);
  const forgottenLoans = useMemo(() => getForgottenLoans(loans, repayments), [loans, repayments]);
  const idleGoalsList = useMemo(() => getIdleGoals(goals), [goals]);
  const idleAccountsList = useMemo(() => getIdleAccounts(accounts, transactions), [accounts, transactions]);
  const attentionCount = forgottenLoans.length + idleGoalsList.length + idleAccountsList.length;

  // Every figure below links to Activity with this exact range, so the list total matches.
  const openActivity = (type?: TransactionType, categoryId?: string | null) =>
    router.push(activityHref({ range, type, categoryId }));

  const stepPeriod = (dir: 1 | -1) => {
    setPeriodAnchor((prev) => {
      if (period === 'week') {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7 * dir);
        return d;
      }
      // Quarters have no BS equivalent in this product, so they stay Gregorian in both modes.
      if (period === 'quarter') return addMonths(prev, 3 * dir);
      if (period === 'year') return shiftYear(prev, dir, dateSystem);
      return shiftMonth(prev, dir, dateSystem);
    });
  };

  const openCustomModal = () => {
    setCustomStart(customRange?.start ?? range.start);
    setCustomEnd(customRange?.end ?? range.end);
    setCustomModalOpen(true);
  };

  const applyCustomRange = () => {
    setCustomRange(customStart <= customEnd ? { start: customStart, end: customEnd } : { start: customEnd, end: customStart });
    setPeriod('custom');
    setCustomModalOpen(false);
  };

  // --- Calendar view data ---
  // The grid follows the selected calendar system (true BS month lengths/weekdays in BS mode);
  // only the underlying AD ISO dates used to look up data stay fixed.
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
  const calendarMonthTotal = Object.values(dailyExpense).reduce((a, b) => a + b, 0);
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

  const flowRows: { label: string; value: number; prev: number; up: boolean; type: TransactionType; color?: string }[] = [
    { label: 'Income', value: flow.income, prev: prevFlow.income, up: true, type: 'income', color: colors.income },
    { label: 'Spent', value: flow.expenses, prev: prevFlow.expenses, up: false, type: 'expense' },
    { label: 'Lent to others', value: flow.lent, prev: prevFlow.lent, up: false, type: 'lent' },
    { label: 'Repaid to you', value: flow.repaid, prev: prevFlow.repaid, up: true, type: 'repayment', color: colors.income },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader title="Reports" subtitle={view === 'overview' ? formatRangeLabel(period, range, dateSystem) : monthGrid.label} />

      <Segmented
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'calendar', label: 'Calendar' },
        ]}
        value={view}
        onChange={setView}
      />

      {view === 'overview' ? (
        <>
          <View style={{ marginTop: spacing.md }}>
            <Segmented options={PERIODS} value={period === 'custom' ? null : period} onChange={(p) => setPeriod(p)} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg }}>
            {period !== 'custom' ? (
              <TouchableOpacity onPress={() => stepPeriod(-1)} hitSlop={10}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 20 }} />
            )}
            <TouchableOpacity onPress={openCustomModal} hitSlop={6}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                {formatRangeLabel(period, range, dateSystem)}
                <Text style={{ color: colors.primaryDeep, fontWeight: '600', fontSize: 12.5 }}>  Custom</Text>
              </Text>
            </TouchableOpacity>
            {period !== 'custom' ? (
              <TouchableOpacity onPress={() => stepPeriod(1)} hitSlop={10}>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 20 }} />
            )}
          </View>

          {/* Headline */}
          <Sheet style={{ marginTop: spacing.lg, paddingVertical: spacing.lg }}>
            <TouchableOpacity activeOpacity={0.6} onPress={() => openActivity('expense')}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: colors.textLight }}>Spent</Text>
                <Delta current={flow.expenses} previous={prevFlow.expenses} favorableWhenUp={false} />
              </View>
              <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                {format(flow.expenses)}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                vs {format(prevFlow.expenses)} the period before · {format(lastYearExpenses)} a year ago
              </Text>
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />
            <View style={{ flexDirection: 'row' }}>
              <Stat label="Income" value={format(flow.income)} color={colors.income} onPress={() => openActivity('income')} />
              <Stat label="Net" value={format(net)} color={net < 0 ? colors.expense : colors.text} align="flex-end" onPress={() => openActivity()} />
            </View>
          </Sheet>

          {/* Where it went */}
          <SectionTitle title="Where it went" />
          {categorySpending.length === 0 ? (
            <Text style={{ fontSize: 14, color: colors.textLight }}>No spending in this period.</Text>
          ) : (
            <>
              <View style={{ flexDirection: 'row', height: 8, gap: 2, borderRadius: 4, overflow: 'hidden', marginBottom: spacing.xs }}>
                {categorySpending.map((c) => (
                  <View key={c.categoryId} style={{ flex: Math.max(c.percent, 2), backgroundColor: category(c.categoryId)?.color ?? colors.textLight }} />
                ))}
              </View>
              {categorySpending.slice(0, 8).map((c, i, arr) => (
                <TouchableOpacity
                  key={c.categoryId}
                  activeOpacity={0.6}
                  onPress={() => openActivity('expense', c.categoryId)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: i === arr.length - 1 ? 0 : 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ marginRight: spacing.md }}>
                    <Dot color={category(c.categoryId)?.color ?? colors.textLight} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '500', color: colors.text }} numberOfLines={1}>
                    {category(c.categoryId)?.name ?? 'Other'}
                  </Text>
                  <Text style={{ width: 44, textAlign: 'right', fontSize: 13, color: colors.textLight }}>{c.percent.toFixed(0)}%</Text>
                  <Text style={{ minWidth: 104, textAlign: 'right', fontSize: 14.5, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>
                    {format(c.amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Money flow */}
          <SectionTitle title="Money flow" />
          <Sheet>
            {flowRows.map((row, i) => (
              <SheetRow key={row.label} last={i === flowRows.length - 1} onPress={() => openActivity(row.type)}>
                <Text style={{ flex: 1, fontSize: 14.5, color: colors.text }}>{row.label}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: row.color ?? colors.text, fontVariant: ['tabular-nums'] }}>
                    {format(row.value)}
                  </Text>
                  <Delta current={row.value} previous={row.prev} favorableWhenUp={row.up} />
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.border} style={{ marginLeft: spacing.sm }} />
              </SheetRow>
            ))}
          </Sheet>

          {/* Trend */}
          <SectionTitle title="Income vs spending" />
          <Sheet style={{ paddingVertical: spacing.lg }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ width: chartWidth }}>
                <BarChart
                  height={120}
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
            <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
              {[
                { color: colors.income, label: 'Income' },
                { color: colors.expense, label: 'Spending' },
              ].map((l) => (
                <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Dot color={l.color} />
                  <Text style={{ fontSize: 12, color: colors.textLight }}>{l.label}</Text>
                </View>
              ))}
            </View>
          </Sheet>

          {/* Largest expenses */}
          {topExpenses.length > 0 && (
            <>
              <SectionTitle title="Largest expenses" linkLabel="See all" onLinkPress={() => openActivity('expense')} />
              <Sheet>
                {topExpenses.map((t, i) => (
                  <TransactionListItem key={t.id} transaction={t} last={i === topExpenses.length - 1} />
                ))}
              </Sheet>
            </>
          )}

          {/* Needs attention */}
          {attentionCount > 0 && (
            <>
              <SectionTitle title="Needs attention" />
              <Sheet>
                {forgottenLoans.map(({ loan, outstanding, reason }, i) => (
                  <SheetRow
                    key={loan.id}
                    last={i === attentionCount - 1}
                    onPress={() => router.push({ pathname: '/loans/[id]', params: { id: loan.id } })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.text }}>{loan.personName}</Text>
                      <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                        {reason === 'overdue' ? 'Repayment is overdue' : 'Lent a while ago, no return date'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', color: colors.expense }}>{format(outstanding)}</Text>
                  </SheetRow>
                ))}
                {idleGoalsList.map(({ goal, daysSinceUpdate }, i) => (
                  <SheetRow key={goal.id} last={forgottenLoans.length + i === attentionCount - 1} onPress={() => router.push('/goals')}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.text }}>{goal.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>No contribution in {daysSinceUpdate} days</Text>
                    </View>
                  </SheetRow>
                ))}
                {idleAccountsList.map(({ account, daysSinceActivity }, i) => (
                  <SheetRow
                    key={account.id}
                    last={forgottenLoans.length + idleGoalsList.length + i === attentionCount - 1}
                    onPress={() => router.push({ pathname: '/accounts/[id]', params: { id: account.id } })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.text }}>{account.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                        {daysSinceActivity !== null ? `No activity in ${daysSinceActivity} days` : 'No activity since it was created'}
                      </Text>
                    </View>
                  </SheetRow>
                ))}
              </Sheet>
            </>
          )}

          {/* Net worth — private by default, like the home balance */}
          <SectionTitle title="Net worth" />
          <Sheet>
            <SheetRow last onPress={() => setNetWorthRevealed((r) => !r)} onLongPress={() => router.push('/accounts')}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.text }}>All accounts</Text>
                <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                  {netWorthRevealed ? 'Hides again in a few seconds' : 'Tap to reveal · long-press for accounts'}
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] }}>
                {netWorthRevealed && !hideBalances ? format(netWorth) : MASK}
              </Text>
            </SheetRow>
          </Sheet>
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg }}>
            <TouchableOpacity onPress={() => setCalendarMonth((d) => shiftMonth(d, -1, dateSystem))} hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{monthGrid.label}</Text>
            <TouchableOpacity onPress={() => setCalendarMonth((d) => shiftMonth(d, 1, dateSystem))} hitSlop={10}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Sheet style={{ marginTop: spacing.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.sm }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {WEEKDAY_HEADERS.map((d, i) => (
                <Text
                  key={i}
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
                        borderColor: colors.text,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: isToday ? '800' : '500', color: colors.text }}>{cell.dayNumber}</Text>
                      <View style={{ flexDirection: 'row', gap: 2, marginTop: 2, height: 4 }}>
                        {!!billsByDate[iso] && <Dot color={colors.warning} size={4} />}
                        {!!loansByDate[iso] && <Dot color={colors.primary} size={4} />}
                        {dailyIncomeDates.has(iso) && <Dot color={colors.income} size={4} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Sheet>

          <View style={{ flexDirection: 'row', gap: spacing.lg, justifyContent: 'center', flexWrap: 'wrap', marginTop: spacing.md }}>
            {[
              { color: colors.expense, label: 'Spending' },
              { color: colors.warning, label: 'Bill due' },
              { color: colors.primary, label: 'Loan due' },
              { color: colors.income, label: 'Income' },
            ].map((l) => (
              <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Dot color={l.color} />
                <Text style={{ fontSize: 12, color: colors.textLight }}>{l.label}</Text>
              </View>
            ))}
          </View>

          <Sheet style={{ marginTop: spacing.lg }}>
            <SheetRow
              last
              onPress={() => {
                const cells = monthGrid.cells.filter((c): c is MonthGridCell => c !== null);
                router.push(activityHref({ range: { start: cells[0].adIso, end: cells[cells.length - 1].adIso }, type: 'expense' }));
              }}
            >
              <Text style={{ flex: 1, fontSize: 14.5, color: colors.text }}>Spent in {monthGrid.label}</Text>
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>
                {format(calendarMonthTotal)}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.border} style={{ marginLeft: spacing.sm }} />
            </SheetRow>
          </Sheet>
        </>
      )}

      {/* Custom range */}
      <Modal visible={customModalOpen} transparent animationType="slide" onRequestClose={() => setCustomModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setCustomModalOpen(false)}>
          <Pressable
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.lg }}>Custom range</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: colors.textLight, marginBottom: 6 }}>FROM</Text>
                <DateField value={customStart} onChange={setCustomStart} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: colors.textLight, marginBottom: 6 }}>TO</Text>
                <DateField value={customEnd} onChange={setCustomEnd} />
              </View>
            </View>
            <TouchableOpacity
              onPress={applyCustomRange}
              style={{ backgroundColor: colors.text, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: colors.card, fontWeight: '700', fontSize: 15 }}>Apply</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Day detail */}
      <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={() => setSelectedDay(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setSelectedDay(null)}>
          <Pressable
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              maxHeight: '78%',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{selectedDay ? formatDate(selectedDay) : ''}</Text>
                {selectedDay && (dailyExpense[selectedDay] ?? 0) > 0 && (
                  <Text style={{ fontSize: 12.5, color: colors.textLight, marginTop: 2 }}>
                    {format(dailyExpense[selectedDay])} spent
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  const day = selectedDay;
                  setSelectedDay(null);
                  router.push({ pathname: '/transaction/new', params: day ? { date: day } : {} });
                }}
                hitSlop={8}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primaryDeep }}>+ Add</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(selectedDayBills.length > 0 || selectedDayLoans.length > 0) && (
                <Sheet style={{ marginBottom: spacing.md }}>
                  {selectedDayBills.map((b, i) => (
                    <SheetRow key={b.id} last={i === selectedDayBills.length - 1 && selectedDayLoans.length === 0}>
                      <View style={{ marginRight: spacing.md }}>
                        <Dot color={colors.warning} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>{b.title} due</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{format(b.amount)}</Text>
                    </SheetRow>
                  ))}
                  {selectedDayLoans.map((l, i) => (
                    <SheetRow key={l.id} last={i === selectedDayLoans.length - 1}>
                      <View style={{ marginRight: spacing.md }}>
                        <Dot color={colors.primary} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>{l.personName}&apos;s repayment due</Text>
                    </SheetRow>
                  ))}
                </Sheet>
              )}
              {selectedDayTransactions.length === 0 ? (
                <Text style={{ fontSize: 14, color: colors.textLight, textAlign: 'center', paddingVertical: spacing.xl }}>
                  Nothing recorded on this day.
                </Text>
              ) : (
                <Sheet>
                  {selectedDayTransactions.map((t, i) => (
                    <TransactionListItem
                      key={t.id}
                      transaction={t}
                      onDelete={removeTransaction}
                      last={i === selectedDayTransactions.length - 1}
                    />
                  ))}
                </Sheet>
              )}
              {selectedDayTransactions.length > 0 && selectedDay && (
                <TouchableOpacity
                  onPress={() => {
                    const day = selectedDay;
                    setSelectedDay(null);
                    router.push(activityHref({ range: { start: day, end: day } }));
                  }}
                  style={{ alignSelf: 'center', marginTop: spacing.md, padding: spacing.sm }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primaryDeep }}>Open this day in Activity</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

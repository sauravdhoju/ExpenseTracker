import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useAppStore } from '../../../src/store/useAppStore';
import {
  filterByMonth,
  getCategorySpending,
  getNetWorth,
  getTotalExpenses,
  getTotalIncome,
} from '../../../src/services/calculations';
import { addMonths, MONTH_NAMES, toISODate } from '../../../src/utils/date';
import { spacing } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import EmptyState from '../../../src/components/ui/EmptyState';
import DonutChart from '../../../src/components/charts/DonutChart';
import BarChart from '../../../src/components/charts/BarChart';
import LineChart from '../../../src/components/charts/LineChart';

export default function ReportsScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const accounts = useAppStore((s) => s.accounts);

  const now = useMemo(() => new Date(), []);
  const monthTransactions = useMemo(() => filterByMonth(transactions, now), [transactions, now]);
  const categorySpending = useMemo(() => getCategorySpending(monthTransactions), [monthTransactions]);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Other';
  const categoryColor = (id: string) => categories.find((c) => c.id === id)?.color ?? colors.textLight;

  const last6Months = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => addMonths(now, i - 5));
  }, [now]);

  const monthlyTotals = useMemo(
    () =>
      last6Months.map((date) => {
        const monthTx = filterByMonth(transactions, date);
        return {
          label: MONTH_NAMES[date.getMonth()].slice(0, 3),
          income: getTotalIncome(monthTx),
          expenses: getTotalExpenses(monthTx),
        };
      }),
    [last6Months, transactions]
  );

  const cashFlowSeries = monthlyTotals.map((m) => m.income - m.expenses);

  const topExpenses = useMemo(
    () =>
      [...transactions]
        .filter((t) => t.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    [transactions]
  );

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const iso = toISODate(d);
      const dayTotal = transactions
        .filter((t) => t.type === 'expense' && t.date === iso)
        .reduce((sum, t) => sum + t.amount, 0);
      return { label: MONTH_NAMES[d.getMonth()].slice(0, 3) + ' ' + d.getDate(), value: dayTotal };
    });
  }, [transactions]);

  const netWorth = getNetWorth(accounts);

  const currentMonthExpenses = getTotalExpenses(monthTransactions);
  const previousMonthExpenses = getTotalExpenses(filterByMonth(transactions, addMonths(now, -1)));
  const sameMonthLastYearExpenses = getTotalExpenses(
    filterByMonth(transactions, new Date(now.getFullYear() - 1, now.getMonth(), 1))
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 130 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.lg }}>Reports</Text>

      {/* Net worth */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: 4 }}>Net Worth</Text>
        <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>{format(netWorth)}</Text>
        <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>Assets minus liabilities across all accounts</Text>
      </Card>

      {/* Expense breakdown */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>
          Expense Breakdown
        </Text>
        {categorySpending.length === 0 ? (
          <EmptyState icon="pie-chart-outline" title="No expenses yet" message="Add expenses to see your breakdown." />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <DonutChart
              data={categorySpending.map((c) => ({ value: c.amount, color: categoryColor(c.categoryId) }))}
            >
              <Text style={{ fontSize: 12, color: colors.textLight }}>Total</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                {format(currentMonthExpenses)}
              </Text>
            </DonutChart>
            <View style={{ flex: 1, gap: 8 }}>
              {categorySpending.slice(0, 5).map((c) => (
                <View key={c.categoryId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: categoryColor(c.categoryId) }} />
                  <Text style={{ flex: 1, fontSize: 12.5, color: colors.text }} numberOfLines={1}>
                    {categoryName(c.categoryId)}
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.text }}>
                    {c.percent.toFixed(0)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Card>

      {/* Income vs Expense */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>
          Income vs Expense (6 months)
        </Text>
        <BarChart
          data={monthlyTotals.map((m) => ({
            label: m.label,
            bars: [
              { value: m.income, color: colors.income },
              { value: m.expenses, color: colors.expense },
            ],
          }))}
        />
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
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>
          Cash Flow (6 months)
        </Text>
        <LineChart values={cashFlowSeries} color={colors.primary} width={280} height={90} />
      </Card>

      {/* Monthly comparison */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>
          Monthly Comparison
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 13, color: colors.textLight }}>This month</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{format(currentMonthExpenses)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 13, color: colors.textLight }}>Previous month</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{format(previousMonthExpenses)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: colors.textLight }}>Same month last year</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{format(sameMonthLastYearExpenses)}</Text>
        </View>
      </Card>

      {/* Daily spending */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>
          Daily Spending (7 days)
        </Text>
        <BarChart data={last7Days.map((d) => ({ label: d.label.split(' ')[1], bars: [{ value: d.value, color: colors.primary }] }))} height={100} />
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
    </ScrollView>
  );
}

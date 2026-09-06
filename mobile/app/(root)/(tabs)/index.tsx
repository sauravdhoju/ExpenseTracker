import { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useAppStore } from '../../../src/store/useAppStore';
import {
  filterByMonth,
  getDailyAverage,
  getMonthlyComparison,
  getTotalBalance,
  getTotalExpenses,
  getTotalIncome,
} from '../../../src/services/calculations';
import { generateInsights } from '../../../src/services/insightService';
import { addMonths, MONTH_NAMES } from '../../../src/utils/date';
import { spacing } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import IconCircle from '../../../src/components/ui/IconCircle';
import EmptyState from '../../../src/components/ui/EmptyState';
import BalanceSummary from '../../../src/components/dashboard/BalanceSummary';
import BudgetOverview from '../../../src/components/dashboard/BudgetOverview';
import GoalsPreview from '../../../src/components/dashboard/GoalsPreview';
import UpcomingBillsPreview from '../../../src/components/dashboard/UpcomingBillsPreview';
import InsightCard from '../../../src/components/dashboard/InsightCard';
import TransactionListItem from '../../../src/components/transactions/TransactionListItem';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const router = useRouter();

  const accounts = useAppStore((s) => s.accounts);
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const budgets = useAppStore((s) => s.budgets);
  const removeTransaction = useAppStore((s) => s.removeTransaction);

  const now = useMemo(() => new Date(), []);
  const monthTransactions = useMemo(() => filterByMonth(transactions, now), [transactions, now]);
  const previousMonthTransactions = useMemo(
    () => filterByMonth(transactions, addMonths(now, -1)),
    [transactions, now]
  );

  const balance = getTotalBalance(accounts);
  const income = getTotalIncome(monthTransactions);
  const expenses = getTotalExpenses(monthTransactions);
  const previousExpenses = getTotalExpenses(previousMonthTransactions);
  const comparison = getMonthlyComparison(expenses, previousExpenses);
  const dayOfMonth = now.getDate();
  const dailyAverage = getDailyAverage(monthTransactions, dayOfMonth);

  const insights = useMemo(
    () => generateInsights(monthTransactions, previousMonthTransactions, categories, budgets),
    [monthTransactions, previousMonthTransactions, categories, budgets]
  );

  const recentTransactions = transactions.slice(0, 5);

  const frequentCategories = categories.filter((c) => c.kind === 'expense').slice(0, 4);

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
            {getGreeting()} 👋
          </Text>
          <Text style={{ fontSize: 13, color: colors.textLight, marginTop: 2 }}>
            {MONTH_NAMES[now.getMonth()]} {now.getDate()}, {now.getFullYear()}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity onPress={() => router.push('/bills')} hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(root)/(tabs)/more')} hitSlop={8}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <BalanceSummary balance={balance} income={income} expenses={expenses} />

      {/* Quick add shortcuts */}
      {frequentCategories.length > 0 && (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          {frequentCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() =>
                router.push({
                  pathname: '/transaction/new',
                  params: { type: 'expense', categoryId: cat.id },
                })
              }
              style={{ flex: 1, alignItems: 'center' }}
            >
              <IconCircle name={cat.icon as any} color={cat.color} size={48} iconSize={20} />
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 4 }} numberOfLines={1}>
                {cat.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Spending overview */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.sm }}>
          Spending Overview
        </Text>
        <Text style={{ fontSize: 14, color: colors.text, marginBottom: 4 }}>
          This month you spent {format(expenses)}
        </Text>
        <Text style={{ fontSize: 13, color: comparison.percentChange <= 0 ? colors.income : colors.expense }}>
          {comparison.percentChange === 0
            ? 'Same as last month'
            : `${Math.abs(comparison.percentChange).toFixed(0)}% ${comparison.percentChange < 0 ? 'less' : 'more'} than last month`}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textLight, marginTop: 4 }}>
          Daily average: {format(dailyAverage)}
        </Text>
      </Card>

      <BudgetOverview monthTransactions={monthTransactions} />

      {/* Recent transactions */}
      <Card style={{ marginBottom: spacing.lg }}>
        <TouchableOpacity
          onPress={() => router.push('/(root)/(tabs)/transactions')}
          style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Recent Transactions</Text>
          <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>View all</Text>
        </TouchableOpacity>
        {recentTransactions.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No transactions yet"
            message="Start by adding your first expense."
          />
        ) : (
          recentTransactions.map((t) => (
            <TransactionListItem key={t.id} transaction={t} onDelete={removeTransaction} />
          ))
        )}
      </Card>

      <UpcomingBillsPreview />
      <GoalsPreview />
      <InsightCard insights={insights} />
    </ScrollView>
  );
}

import { useMemo, useState } from 'react';
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
import PageHeader from '../../../src/components/ui/PageHeader';
import IconCircle from '../../../src/components/ui/IconCircle';
import EmptyState from '../../../src/components/ui/EmptyState';
import BalanceSummary from '../../../src/components/dashboard/BalanceSummary';
import BudgetSummaryCard from '../../../src/components/dashboard/BudgetSummaryCard';
import GoalsPreview from '../../../src/components/dashboard/GoalsPreview';
import UpcomingBillsPreview from '../../../src/components/dashboard/UpcomingBillsPreview';
import InsightCard from '../../../src/components/dashboard/InsightCard';
import TransactionListItem from '../../../src/components/transactions/TransactionListItem';
import ShortcutConfirmSheet from '../../../src/components/ShortcutConfirmSheet';
import type { Shortcut } from '../../../src/types';

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
  const shortcuts = useAppStore((s) => s.shortcuts);
  const removeTransaction = useAppStore((s) => s.removeTransaction);

  const [activeShortcut, setActiveShortcut] = useState<Shortcut | null>(null);

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 130 }}
    >
      <PageHeader
        title={`${getGreeting()} 👋`}
        subtitle={`${MONTH_NAMES[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`}
        actions={[
          { icon: 'notifications-outline', onPress: () => router.push('/bills') },
          { icon: 'settings-outline', onPress: () => router.push('/more') },
        ]}
      />

      <BalanceSummary balance={balance} income={income} expenses={expenses} />

      {/* Quick add shortcuts */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.sm, marginBottom: spacing.lg }}
      >
        {shortcuts.map((shortcut) => {
          const category = categories.find((c) => c.id === shortcut.categoryId);
          const accentColor = shortcut.type === 'income' ? colors.income : colors.expense;
          return (
            <TouchableOpacity
              key={shortcut.id}
              onPress={() => setActiveShortcut(shortcut)}
              onLongPress={() => router.push({ pathname: '/shortcuts/[id]', params: { id: shortcut.id } })}
              style={{ alignItems: 'center', width: 60 }}
            >
              {category ? (
                <IconCircle name={category.icon as any} color={category.color} size={48} iconSize={20} />
              ) : (
                <IconCircle name="pricetag-outline" color={accentColor} size={48} iconSize={20} />
              )}
              <Text
                style={{ fontSize: 11, color: colors.textLight, marginTop: 4, textAlign: 'center' }}
                numberOfLines={1}
              >
                {shortcut.label.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => router.push('/shortcuts/new')}
          style={{ alignItems: 'center', width: 60 }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              borderWidth: 1.5,
              borderColor: colors.border,
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={20} color={colors.textLight} />
          </View>
          <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 4 }} numberOfLines={1}>
            Add
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ShortcutConfirmSheet shortcut={activeShortcut} onClose={() => setActiveShortcut(null)} />

      {/* Spending overview */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>
          Spending Overview
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 12.5, color: colors.textLight, marginBottom: 2 }}>This month</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>{format(expenses)}</Text>
          </View>
          {comparison.percentChange !== 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: (comparison.percentChange < 0 ? colors.income : colors.expense) + '1A',
              }}
            >
              <Ionicons
                name={comparison.percentChange < 0 ? 'arrow-down' : 'arrow-up'}
                size={12}
                color={comparison.percentChange < 0 ? colors.income : colors.expense}
              />
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: '700',
                  color: comparison.percentChange < 0 ? colors.income : colors.expense,
                }}
              >
                {Math.abs(comparison.percentChange).toFixed(0)}%
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 12.5, color: colors.textLight, marginTop: spacing.sm }}>
          {comparison.percentChange === 0
            ? 'Same as last month'
            : `${Math.abs(comparison.percentChange).toFixed(0)}% ${comparison.percentChange < 0 ? 'less' : 'more'} than last month`}
          {'  ·  '}Daily average {format(dailyAverage)}
        </Text>
      </Card>

      <BudgetSummaryCard transactions={transactions} />

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

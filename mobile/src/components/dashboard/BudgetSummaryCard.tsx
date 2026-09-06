import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCurrency } from '../../hooks/useCurrency';
import { useAppStore } from '../../store/useAppStore';
import { filterByMonth, getBudgetEngineSummary, getBudgetUsage } from '../../services/calculations';
import { spacing } from '../../constants/theme';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
import EmptyState from '../ui/EmptyState';
import type { Transaction } from '../../types';

interface Props {
  transactions: Transaction[];
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const colors = useThemeColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
      <Text style={{ fontSize: 13.5, color: colors.textLight }}>{label}</Text>
      <Text style={{ fontSize: 13.5, fontWeight: '700', color: valueColor ?? colors.text }}>{value}</Text>
    </View>
  );
}

export default function BudgetSummaryCard({ transactions }: Props) {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const router = useRouter();
  const budgets = useAppStore((s) => s.budgets);
  const categories = useAppStore((s) => s.categories);

  const overall = budgets.find((b) => b.categoryId === null);
  const categoryBudgets = budgets.filter((b) => b.categoryId !== null).slice(0, 6);

  if (!overall) {
    return (
      <Card style={{ marginBottom: spacing.lg }}>
        <EmptyState
          icon="wallet-outline"
          title="No monthly budget set"
          message="Set a monthly budget to see your safe-to-spend amount and spending breakdown."
          actionLabel="Set Monthly Budget"
          onAction={() => router.push('/(root)/(tabs)/budgets')}
        />
      </Card>
    );
  }

  const now = new Date();
  const summary = getBudgetEngineSummary(overall.amount, transactions, now);
  const monthTransactions = filterByMonth(transactions, now);
  const weekPercent =
    summary.weeklyAllowance > 0 ? (summary.spentThisWeek / summary.weeklyAllowance) * 100 : 0;

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <TouchableOpacity
        onPress={() => router.push('/(root)/(tabs)/budgets')}
        style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Monthly Budget</Text>
        <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>View all</Text>
      </TouchableOpacity>

      <Row label="Monthly Budget" value={format(summary.monthlyBudget)} />
      <Row label="Spent" value={format(summary.spentThisMonth)} />
      <Row
        label="Remaining"
        value={format(summary.remainingThisMonth)}
        valueColor={summary.remainingThisMonth < 0 ? colors.expense : colors.income}
      />

      <View
        style={{
          marginTop: spacing.sm,
          marginBottom: spacing.md,
          padding: spacing.md,
          borderRadius: 14,
          backgroundColor: colors.background,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>Safe to Spend Today</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>
          {format(summary.safeToSpendToday)}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 4 }}>
          Spent today {format(summary.spentToday)} · Remaining{' '}
          <Text style={{ color: summary.remainingToday < 0 ? colors.expense : colors.income, fontWeight: '600' }}>
            {format(summary.remainingToday)}
          </Text>
        </Text>
      </View>

      <View style={{ marginBottom: categoryBudgets.length > 0 ? spacing.md : 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 13, color: colors.textLight }}>This Week</Text>
          <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>
            {format(summary.spentThisWeek)} / {format(summary.weeklyAllowance)}
          </Text>
        </View>
        <ProgressBar percent={weekPercent} />
      </View>

      {categoryBudgets.length > 0 && (
        <View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: colors.textLight,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              marginBottom: spacing.sm,
            }}
          >
            Category Spending
          </Text>
          {categoryBudgets.map((budget) => {
            const category = categories.find((c) => c.id === budget.categoryId);
            const usage = getBudgetUsage(budget, monthTransactions);
            return (
              <View key={budget.id} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, color: colors.textLight }}>{category?.name ?? 'Category'}</Text>
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>
                    {format(usage.spent)} / {format(budget.amount)}
                  </Text>
                </View>
                <ProgressBar percent={usage.percentUsed} />
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

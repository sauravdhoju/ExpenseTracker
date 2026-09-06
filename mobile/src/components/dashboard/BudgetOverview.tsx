import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCurrency } from '../../hooks/useCurrency';
import { useAppStore } from '../../store/useAppStore';
import { getBudgetUsage } from '../../services/calculations';
import { spacing } from '../../constants/theme';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
import type { Transaction } from '../../types';

interface Props {
  monthTransactions: Transaction[];
}

export default function BudgetOverview({ monthTransactions }: Props) {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const router = useRouter();
  const budgets = useAppStore((s) => s.budgets);
  const categories = useAppStore((s) => s.categories);

  if (budgets.length === 0) return null;

  const overall = budgets.find((b) => b.categoryId === null);
  const categoryBudgets = budgets.filter((b) => b.categoryId !== null).slice(0, 4);

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <TouchableOpacity
        onPress={() => router.push('/(root)/(tabs)/budgets')}
        style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Budget Progress</Text>
        <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>View all</Text>
      </TouchableOpacity>

      {overall && (() => {
        const usage = getBudgetUsage(overall, monthTransactions);
        return (
          <View style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 13, color: colors.textLight }}>Overall</Text>
              <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>
                {format(usage.spent)} / {format(overall.amount)}
              </Text>
            </View>
            <ProgressBar percent={usage.percentUsed} />
          </View>
        );
      })()}

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
    </Card>
  );
}

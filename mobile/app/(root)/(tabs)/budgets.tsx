import { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useAppStore } from '../../../src/store/useAppStore';
import { filterByMonth, getBudgetUsage } from '../../../src/services/calculations';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import ProgressBar from '../../../src/components/ui/ProgressBar';
import EmptyState from '../../../src/components/ui/EmptyState';
import Button from '../../../src/components/ui/Button';
import type { BudgetPeriod } from '../../../src/types';

export default function BudgetsScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const budgets = useAppStore((s) => s.budgets);
  const categories = useAppStore((s) => s.categories);
  const transactions = useAppStore((s) => s.transactions);
  const upsertBudget = useAppStore((s) => s.upsertBudget);
  const removeBudget = useAppStore((s) => s.removeBudget);

  const [modalVisible, setModalVisible] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');

  const monthTransactions = useMemo(() => filterByMonth(transactions, new Date()), [transactions]);
  const expenseCategories = categories.filter((c) => c.kind === 'expense');
  const usedCategoryIds = new Set(budgets.filter((b) => b.categoryId).map((b) => b.categoryId));

  const openNew = () => {
    setCategoryId(null);
    setAmount('');
    setPeriod('monthly');
    setModalVisible(true);
  };

  const openEdit = (id: string | null, existingAmount: number, existingPeriod: BudgetPeriod) => {
    setCategoryId(id);
    setAmount(String(existingAmount));
    setPeriod(existingPeriod);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid amount', 'Enter a budget amount greater than 0.');
      return;
    }
    await upsertBudget({ categoryId, amount: parsed, period });
    setModalVisible(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>Budgets</Text>
        <TouchableOpacity
          onPress={openNew}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.full }}
        >
          <Ionicons name="add" size={16} color={colors.white} />
          <Text style={{ color: colors.white, fontWeight: '600', fontSize: 13 }}>Add</Text>
        </TouchableOpacity>
      </View>

      {budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon="pie-chart-outline"
            title="No budgets created"
            message="Create a budget to control your spending."
            actionLabel="Create Budget"
            onAction={openNew}
          />
        </Card>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
          {budgets.map((budget) => {
            const category = categories.find((c) => c.id === budget.categoryId);
            const usage = getBudgetUsage(budget, monthTransactions);
            return (
              <Card key={budget.id} style={{ marginBottom: spacing.md }}>
                <TouchableOpacity
                  onLongPress={() =>
                    Alert.alert('Delete budget', 'Remove this budget?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => removeBudget(budget.id) },
                    ])
                  }
                  onPress={() => openEdit(budget.categoryId, budget.amount, budget.period)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                      {category?.name ?? 'Overall Budget'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textLight, textTransform: 'capitalize' }}>
                      {budget.period}
                    </Text>
                  </View>
                  <ProgressBar percent={usage.percentUsed} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
                    <Text style={{ fontSize: 13, color: colors.textLight }}>
                      {format(usage.spent)} of {format(budget.amount)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: usage.isExceeded ? colors.expense : colors.text,
                      }}
                    >
                      {usage.isExceeded
                        ? `${format(Math.abs(usage.remaining))} over`
                        : `${format(usage.remaining)} left`}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Card>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.lg }}>
              {categoryId ? 'Category Budget' : 'Overall Budget'}
            </Text>

            <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
              <TouchableOpacity
                onPress={() => setCategoryId(null)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: radius.full,
                  backgroundColor: categoryId === null ? colors.primary : colors.background,
                  marginRight: spacing.sm,
                }}
              >
                <Text style={{ color: categoryId === null ? colors.white : colors.text, fontWeight: '600', fontSize: 13 }}>
                  Overall
                </Text>
              </TouchableOpacity>
              {expenseCategories
                .filter((c) => !usedCategoryIds.has(c.id) || c.id === categoryId)
                .map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategoryId(cat.id)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: radius.full,
                      backgroundColor: categoryId === cat.id ? colors.primary : colors.background,
                      marginRight: spacing.sm,
                    }}
                  >
                    <Text style={{ color: categoryId === cat.id ? colors.white : colors.text, fontWeight: '600', fontSize: 13 }}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Amount</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textLight}
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.text,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                paddingBottom: spacing.sm,
                marginBottom: spacing.lg,
              }}
            />

            <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Period</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
              {(['monthly', 'weekly'] as BudgetPeriod[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm + 2,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    backgroundColor: period === p ? colors.primary : colors.background,
                  }}
                >
                  <Text style={{ color: period === p ? colors.white : colors.text, fontWeight: '600', textTransform: 'capitalize' }}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
              <Button label="Save" style={{ flex: 1 }} onPress={handleSave} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

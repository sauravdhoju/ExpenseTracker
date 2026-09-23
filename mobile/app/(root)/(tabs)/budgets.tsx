import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useDateFormat } from '../../../src/hooks/useDateFormat';
import { useAppStore } from '../../../src/store/useAppStore';
import { filterByMonth, getBudgetEngineSummary, getBudgetUsage } from '../../../src/services/calculations';
import { CURRENCIES } from '../../../src/constants/currencies';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import PageHeader from '../../../src/components/ui/PageHeader';
import ProgressBar from '../../../src/components/ui/ProgressBar';
import EmptyState from '../../../src/components/ui/EmptyState';
import IconCircle from '../../../src/components/ui/IconCircle';
import Button from '../../../src/components/ui/Button';
import DonutChart from '../../../src/components/charts/DonutChart';

export default function BudgetsScreen() {
  const colors = useThemeColors();
  const { format, currency } = useCurrency();
  const { dateSystem, formatMonthYear } = useDateFormat();
  const insets = useSafeAreaInsets();
  const budgets = useAppStore((s) => s.budgets);
  const categories = useAppStore((s) => s.categories);
  const transactions = useAppStore((s) => s.transactions);
  const upsertBudget = useAppStore((s) => s.upsertBudget);
  const removeBudget = useAppStore((s) => s.removeBudget);

  const [modalVisible, setModalVisible] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');

  const now = useMemo(() => new Date(), []);
  const periodLabel = formatMonthYear(now);
  const monthTransactions = useMemo(
    () => filterByMonth(transactions, now, dateSystem),
    [transactions, now, dateSystem]
  );
  const expenseCategories = categories.filter((c) => c.kind === 'expense');
  const usedCategoryIds = new Set(budgets.filter((b) => b.categoryId).map((b) => b.categoryId));

  const overall = budgets.find((b) => b.categoryId === null) ?? null;
  const categoryBudgets = budgets.filter((b) => b.categoryId !== null);

  const overallSummary = overall
    ? getBudgetEngineSummary(overall.amount, transactions, now, dateSystem)
    : null;
  const overallPercent = overallSummary && overall && overall.amount > 0
    ? (overallSummary.spentThisMonth / overall.amount) * 100
    : 0;
  const overallExceeded = !!overallSummary && overallSummary.spentThisMonth > (overall?.amount ?? 0);

  const openNew = () => {
    setCategoryId(null);
    setAmount('');
    setModalVisible(true);
  };

  const openEdit = (id: string | null, existingAmount: number) => {
    setCategoryId(id);
    setAmount(String(existingAmount));
    setModalVisible(true);
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete budget', 'Remove this budget?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeBudget(id) },
    ]);
  };

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid amount', 'Enter a budget amount greater than 0.');
      return;
    }
    await upsertBudget({ categoryId, amount: parsed, period: 'monthly' });
    setModalVisible(false);
  };

  const pickableCategories = expenseCategories.filter((c) => !usedCategoryIds.has(c.id) || c.id === categoryId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <PageHeader
          title="Budgets"
          subtitle={periodLabel}
          rightContent={
            <TouchableOpacity
              onPress={openNew}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: colors.primary,
                paddingVertical: 9,
                paddingHorizontal: 14,
                borderRadius: radius.full,
              }}
            >
              <Ionicons name="add" size={16} color={colors.white} />
              <Text style={{ color: colors.white, fontWeight: '700', fontSize: 13 }}>Add</Text>
            </TouchableOpacity>
          }
        />
      </View>

      {budgets.length === 0 ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Card>
            <EmptyState
              icon="pie-chart-outline"
              title="No budgets created"
              message="Set a monthly limit to see how much you can safely spend, by category or overall."
              actionLabel="Create Budget"
              onAction={openNew}
            />
          </Card>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.md, paddingBottom: 130 }}
        >
          {/* Overall budget hero card */}
          {overall && overallSummary ? (
            <Card style={{ marginBottom: spacing.xl }}>
              <TouchableOpacity
                onLongPress={() => confirmDelete(overall.id)}
                onPress={() => openEdit(null, overall.amount)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <IconCircle name="wallet-outline" color={colors.primary} size={30} iconSize={15} />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Overall Budget</Text>
                  </View>
                  <Ionicons name="create-outline" size={18} color={colors.textLight} />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xl }}>
                  <DonutChart
                    size={112}
                    strokeWidth={12}
                    data={
                      overallExceeded
                        ? [{ value: 1, color: colors.expense }]
                        : [
                            { value: overallSummary.spentThisMonth, color: colors.primary },
                            { value: Math.max(overall.amount - overallSummary.spentThisMonth, 0), color: colors.border },
                          ]
                    }
                  >
                    <Text style={{ fontSize: 19, fontWeight: '800', color: overallExceeded ? colors.expense : colors.text }}>
                      {Math.round(overallPercent)}%
                    </Text>
                    <Text style={{ fontSize: 10.5, color: colors.textLight }}>used</Text>
                  </DonutChart>

                  <View style={{ flex: 1, gap: 9 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12.5, color: colors.textLight }}>Spent</Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.text }}>
                        {format(overallSummary.spentThisMonth)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12.5, color: colors.textLight }}>Budget</Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.text }}>{format(overall.amount)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12.5, color: colors.textLight }}>
                        {overallExceeded ? 'Over by' : 'Remaining'}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13.5,
                          fontWeight: '700',
                          color: overallExceeded ? colors.expense : colors.income,
                        }}
                      >
                        {format(Math.abs(overallSummary.remainingThisMonth))}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 11.5, color: colors.textLight }}>Safe to spend today</Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary, marginTop: 1 }}>
                      {format(overallSummary.safeToSpendToday)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11.5, color: colors.textLight }}>
                    {Math.max(overallSummary.daysRemainingInMonth, 0)} {overallSummary.daysRemainingInMonth === 1 ? 'day' : 'days'} left
                  </Text>
                </View>
              </TouchableOpacity>
            </Card>
          ) : (
            <TouchableOpacity onPress={openNew} activeOpacity={0.8} style={{ marginBottom: spacing.xl }}>
              <View
                style={{
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                }}
              >
                <IconCircle name="wallet-outline" color={colors.primary} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Set an overall budget</Text>
                  <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 1 }}>
                    Track total monthly spending and your safe-to-spend amount.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
              </View>
            </TouchableOpacity>
          )}

          {/* Category budgets */}
          {categoryBudgets.length > 0 && (
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '700',
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: spacing.md,
              }}
            >
              Category Budgets
            </Text>
          )}
          {categoryBudgets.map((budget) => {
            const category = categories.find((c) => c.id === budget.categoryId);
            const usage = getBudgetUsage(budget, monthTransactions);
            const barColor = usage.isExceeded ? colors.expense : (category?.color ?? colors.primary);
            return (
              <Card key={budget.id} style={{ marginBottom: spacing.md }}>
                <TouchableOpacity
                  onLongPress={() => confirmDelete(budget.id)}
                  onPress={() => openEdit(budget.categoryId, budget.amount)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
                    <IconCircle
                      name={(category?.icon as any) ?? 'pricetag'}
                      color={category?.color ?? colors.textLight}
                      size={38}
                      iconSize={17}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                        {category?.name ?? 'Category'}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 1 }}>
                        {format(usage.spent)} of {format(budget.amount)}
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: radius.full,
                        backgroundColor: `${barColor}1F`,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: barColor }}>
                        {Math.round(usage.percentUsed)}%
                      </Text>
                    </View>
                  </View>
                  <ProgressBar percent={usage.percentUsed} color={barColor} />
                  {usage.isExceeded && (
                    <Text style={{ fontSize: 11.5, color: colors.expense, marginTop: spacing.sm, fontWeight: '600' }}>
                      {format(Math.abs(usage.remaining))} over budget
                    </Text>
                  )}
                </TouchableOpacity>
              </Card>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.sm,
              paddingBottom: insets.bottom + spacing.lg,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
                alignSelf: 'center',
                marginBottom: spacing.lg,
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                {categoryId ? 'Category Budget' : 'Overall Budget'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={10}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={16} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12.5, color: colors.textLight, marginBottom: spacing.sm, fontWeight: '600' }}>
              CATEGORY
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
              <TouchableOpacity
                onPress={() => setCategoryId(null)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 7,
                  paddingLeft: 7,
                  paddingRight: 12,
                  borderRadius: radius.full,
                  backgroundColor: categoryId === null ? colors.primary : colors.background,
                }}
              >
                <IconCircle
                  name="wallet-outline"
                  color={categoryId === null ? colors.white : colors.primary}
                  size={24}
                  iconSize={12}
                />
                <Text style={{ color: categoryId === null ? colors.white : colors.text, fontWeight: '600', fontSize: 13 }}>
                  Overall
                </Text>
              </TouchableOpacity>
              {pickableCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 7,
                    paddingLeft: 7,
                    paddingRight: 12,
                    borderRadius: radius.full,
                    backgroundColor: categoryId === cat.id ? cat.color : colors.background,
                  }}
                >
                  <IconCircle
                    name={cat.icon as any}
                    color={categoryId === cat.id ? colors.white : cat.color}
                    size={24}
                    iconSize={12}
                  />
                  <Text style={{ color: categoryId === cat.id ? colors.white : colors.text, fontWeight: '600', fontSize: 13 }}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 12.5, color: colors.textLight, marginBottom: spacing.sm, fontWeight: '600' }}>
              MONTHLY AMOUNT
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.background,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                marginBottom: spacing.xl,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textLight, marginRight: 6 }}>
                {CURRENCIES[currency].symbol}
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textLight}
                autoFocus
                style={{
                  flex: 1,
                  fontSize: 22,
                  fontWeight: '700',
                  color: colors.text,
                  paddingVertical: spacing.md,
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
              <Button label="Save" style={{ flex: 1 }} onPress={handleSave} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

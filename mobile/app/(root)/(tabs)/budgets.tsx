import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useDateFormat } from '../../../src/hooks/useDateFormat';
import { useAppStore } from '../../../src/store/useAppStore';
import { filterByMonth, getBudgetEngineSummary, getBudgetUsage } from '../../../src/services/calculations';
import { activityHref, ranges } from '../../../src/utils/links';
import { CURRENCIES } from '../../../src/constants/currencies';
import { spacing, radius } from '../../../src/constants/theme';
import PageHeader from '../../../src/components/ui/PageHeader';
import ProgressBar from '../../../src/components/ui/ProgressBar';
import Button from '../../../src/components/ui/Button';
import { Dot, SectionTitle, Sheet, SheetRow, Stat } from '../../../src/components/ui/Sheet';

export default function BudgetsScreen() {
  const colors = useThemeColors();
  const { format, currency } = useCurrency();
  const { dateSystem, formatMonthYear } = useDateFormat();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const budgets = useAppStore((s) => s.budgets);
  const categories = useAppStore((s) => s.categories);
  const transactions = useAppStore((s) => s.transactions);
  const upsertBudget = useAppStore((s) => s.upsertBudget);
  const removeBudget = useAppStore((s) => s.removeBudget);

  const [modalVisible, setModalVisible] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');

  const now = useMemo(() => new Date(), []);
  const monthRange = ranges.month(now, dateSystem);
  const monthTransactions = useMemo(
    () => filterByMonth(transactions, now, dateSystem),
    [transactions, now, dateSystem]
  );
  const expenseCategories = categories.filter((c) => c.kind === 'expense');
  const usedCategoryIds = new Set(budgets.filter((b) => b.categoryId).map((b) => b.categoryId));

  const overall = budgets.find((b) => b.categoryId === null) ?? null;
  const categoryBudgets = budgets
    .filter((b) => b.categoryId !== null)
    .map((b) => ({ budget: b, usage: getBudgetUsage(b, monthTransactions) }))
    .sort((a, b) => b.usage.percentUsed - a.usage.percentUsed);

  const summary = overall ? getBudgetEngineSummary(overall.amount, transactions, now, dateSystem) : null;
  const overallPercent = summary && overall && overall.amount > 0 ? (summary.spentThisMonth / overall.amount) * 100 : 0;
  const overallExceeded = !!summary && summary.remainingThisMonth < 0;

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

  const manage = (id: string, catId: string | null, existingAmount: number, name: string) => {
    Alert.alert(name, undefined, [
      { text: 'Edit amount', onPress: () => openEdit(catId, existingAmount) },
      { text: 'Delete budget', style: 'destructive', onPress: () => removeBudget(id) },
      { text: 'Cancel', style: 'cancel' },
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
  const monthSpending = activityHref({ range: monthRange, type: 'expense' });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg }}>
        <PageHeader
          title="Budgets"
          subtitle={formatMonthYear(now)}
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
              <Ionicons name="add" size={16} color={colors.card} />
              <Text style={{ color: colors.white, fontWeight: '700', fontSize: 13 }}>New</Text>
            </TouchableOpacity>
          }
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 130 }}
      >
        {/* Overall */}
        <SectionTitle
          first
          title="This month"
          linkLabel={overall ? 'Edit' : undefined}
          onLinkPress={overall ? () => openEdit(null, overall.amount) : undefined}
        />
        {overall && summary ? (
          <Sheet style={{ paddingVertical: spacing.lg }}>
            <TouchableOpacity activeOpacity={0.6} onPress={() => router.push(monthSpending)}>
              <Text style={{ fontSize: 12, color: colors.textLight }}>Spent</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
                <Text style={{ fontSize: 26, fontWeight: '800', color: overallExceeded ? colors.expense : colors.text, fontVariant: ['tabular-nums'] }}>
                  {format(summary.spentThisMonth)}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: overallExceeded ? colors.expense : colors.textLight }}>
                  {Math.round(overallPercent)}%
                </Text>
              </View>
              <Text style={{ fontSize: 12.5, color: colors.textLight, marginTop: 2, marginBottom: spacing.md }}>
                of {format(overall.amount)} budget
              </Text>
              <ProgressBar percent={overallPercent} height={6} />
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />

            <View style={{ flexDirection: 'row' }}>
              <Stat
                label={overallExceeded ? 'Over by' : 'Left'}
                value={format(Math.abs(summary.remainingThisMonth))}
                color={overallExceeded ? colors.expense : colors.income}
              />
              <Stat
                label="Safe per day"
                value={format(summary.safeToSpendToday)}
                align="center"
              />
              <Stat
                label="Days left"
                value={String(Math.max(summary.daysRemainingInMonth, 0))}
                align="flex-end"
              />
            </View>
          </Sheet>
        ) : (
          <Sheet style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>No monthly budget yet</Text>
            <Text style={{ fontSize: 13, color: colors.textLight, marginTop: 4, textAlign: 'center', marginBottom: spacing.lg }}>
              Set one to get a safe amount to spend each day.
            </Text>
            <Button label="Set monthly budget" onPress={openNew} style={{ paddingHorizontal: spacing.xl }} />
          </Sheet>
        )}

        {/* By category */}
        {categoryBudgets.length > 0 && (
          <>
            <SectionTitle title="By category" />
            <Sheet>
              {categoryBudgets.map(({ budget, usage }, i) => {
                const category = categories.find((c) => c.id === budget.categoryId);
                const name = category?.name ?? 'Category';
                const barColor = usage.isExceeded ? colors.expense : (category?.color ?? colors.primary);
                return (
                  <SheetRow
                    key={budget.id}
                    last={i === categoryBudgets.length - 1}
                    onPress={() => router.push(activityHref({ range: monthRange, type: 'expense', categoryId: budget.categoryId }))}
                    onLongPress={() => manage(budget.id, budget.categoryId, budget.amount, name)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ marginRight: spacing.md }}>
                          <Dot color={category?.color ?? colors.textLight} />
                        </View>
                        <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 14.5,
                            fontWeight: '700',
                            color: usage.isExceeded ? colors.expense : colors.text,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {format(usage.spent)}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 20, marginTop: 8 }}>
                        <ProgressBar percent={usage.percentUsed} color={barColor} height={4} />
                        <Text style={{ fontSize: 12, color: usage.isExceeded ? colors.expense : colors.textLight, marginTop: 6 }}>
                          {usage.isExceeded
                            ? `${format(-usage.remaining)} over ${format(budget.amount)}`
                            : `${format(usage.remaining)} left of ${format(budget.amount)}`}
                        </Text>
                      </View>
                    </View>
                  </SheetRow>
                );
              })}
            </Sheet>
            <Text style={{ fontSize: 12, color: colors.textLight, textAlign: 'center', marginTop: spacing.md }}>
              Tap to see the spending · long-press to edit or delete
            </Text>
          </>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setModalVisible(false)}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                {categoryId ? 'Category budget' : 'Monthly budget'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: colors.textLight, marginBottom: spacing.sm }}>
              APPLIES TO
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl }}>
              {[{ id: null as string | null, name: 'Everything', color: colors.primary }, ...pickableCategories].map((c) => {
                const active = categoryId === c.id;
                return (
                  <TouchableOpacity
                    key={c.id ?? 'overall'}
                    onPress={() => setCategoryId(c.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 7,
                      paddingHorizontal: 13,
                      borderRadius: radius.full,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary : colors.card,
                    }}
                  >
                    <Dot color={c.color} size={7} />
                    <Text style={{ color: active ? colors.white : colors.text, fontWeight: '600', fontSize: 12.5 }}>{c.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: colors.textLight, marginBottom: spacing.sm }}>
              MONTHLY AMOUNT
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                marginBottom: spacing.xl,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textLight, marginRight: 6 }}>
                {CURRENCIES[currency].symbol}
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textLight}
                autoFocus
                style={{ flex: 1, fontSize: 22, fontWeight: '700', color: colors.text, paddingVertical: spacing.md }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSave}
              style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: colors.white, fontWeight: '700', fontSize: 15 }}>Save budget</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

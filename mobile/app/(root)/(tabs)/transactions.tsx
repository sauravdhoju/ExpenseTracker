import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useAppStore } from '../../../src/store/useAppStore';
import {
  filterByDay,
  filterByMonth,
  filterByWeek,
  getMonthlyStatement,
} from '../../../src/services/calculations';
import { exportStatementAsCSV } from '../../../src/services/exportService';
import { addMonths, groupLabel, MONTH_NAMES, todayISO } from '../../../src/utils/date';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import PageHeader from '../../../src/components/ui/PageHeader';
import EmptyState from '../../../src/components/ui/EmptyState';
import DateField from '../../../src/components/ui/DateField';
import TransactionListItem from '../../../src/components/transactions/TransactionListItem';
import type { Transaction, TransactionType } from '../../../src/types';

type SortMode = 'newest' | 'oldest' | 'highest';
type TypeFilter = 'all' | TransactionType;
type DateRange = 'all' | 'today' | 'week' | 'month' | 'custom';

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Earlier'] as const;
const TYPE_FILTERS: TypeFilter[] = ['all', 'expense', 'income', 'lent', 'repayment', 'transfer'];
const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
];

export default function TransactionsScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const params = useLocalSearchParams<{ type?: string; categoryId?: string; accountId?: string }>();

  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const accounts = useAppStore((s) => s.accounts);
  const removeTransaction = useAppStore((s) => s.removeTransaction);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>((params.type as TypeFilter) ?? 'all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(params.categoryId ?? null);
  const [accountFilter, setAccountFilter] = useState<string | null>(params.accountId ?? null);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customStart, setCustomStart] = useState(todayISO());
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [statementMonth, setStatementMonth] = useState(new Date());
  const [isExporting, setIsExporting] = useState(false);

  const dateFiltered = useMemo(() => {
    const now = new Date();
    if (dateRange === 'today') return filterByDay(transactions, now);
    if (dateRange === 'week') return filterByWeek(transactions, now);
    if (dateRange === 'month') return filterByMonth(transactions, now);
    if (dateRange === 'custom') {
      return transactions.filter((t) => t.date >= customStart && t.date <= customEnd);
    }
    return transactions;
  }, [transactions, dateRange, customStart, customEnd]);

  const filtered = useMemo(() => {
    let result: Transaction[] = dateFiltered;

    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }
    if (categoryFilter) {
      result = result.filter((t) => t.categoryId === categoryFilter);
    }
    if (accountFilter) {
      result = result.filter((t) => t.accountId === accountFilter || t.toAccountId === accountFilter);
    }

    if (query.trim().length > 0) {
      const q = query.trim().toLowerCase();
      result = result.filter((t) => {
        const category = categories.find((c) => c.id === t.categoryId)?.name ?? '';
        const account = accounts.find((a) => a.id === t.accountId)?.name ?? '';
        return (
          t.title.toLowerCase().includes(q) ||
          (t.notes ?? '').toLowerCase().includes(q) ||
          category.toLowerCase().includes(q) ||
          account.toLowerCase().includes(q) ||
          String(t.amount).includes(q)
        );
      });
    }

    const sorted = [...result].sort((a, b) => {
      if (sortMode === 'highest') return b.amount - a.amount;
      const cmp = a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
      return sortMode === 'oldest' ? cmp : -cmp;
    });

    return sorted;
  }, [dateFiltered, typeFilter, categoryFilter, accountFilter, query, sortMode, categories, accounts]);

  const sections = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    for (const t of filtered) {
      const label = groupLabel(t.date);
      if (!groups[label]) groups[label] = [];
      groups[label].push(t);
    }
    return GROUP_ORDER.filter((g) => groups[g]?.length).map((g) => ({
      title: g,
      data: groups[g],
    }));
  }, [filtered]);

  const flatData = useMemo(
    () => sections.flatMap((s) => [{ header: s.title }, ...s.data]),
    [sections]
  );

  const statement = useMemo(
    () => getMonthlyStatement(transactions, accounts, statementMonth),
    [transactions, accounts, statementMonth]
  );

  const activeFilterCount =
    (categoryFilter ? 1 : 0) + (accountFilter ? 1 : 0) + (dateRange !== 'all' ? 1 : 0);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportStatementAsCSV(filtered);
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
      <PageHeader
        title="Transactions"
        subtitle={`${filtered.length} ${filtered.length === 1 ? 'transaction' : 'transactions'}`}
        actions={[
          { icon: 'calendar-outline', onPress: () => setStatementOpen((v) => !v) },
          { icon: 'options-outline', onPress: () => setFiltersOpen(true) },
          { icon: isExporting ? 'hourglass-outline' : 'share-outline', onPress: handleExport },
        ]}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <Ionicons name="search" size={18} color={colors.textLight} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search title, category, account, amount..."
          placeholderTextColor={colors.textLight}
          style={{ flex: 1, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm, color: colors.text }}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {statementOpen && (
        <Card style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <TouchableOpacity onPress={() => setStatementMonth((d) => addMonths(d, -1))} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
              {MONTH_NAMES[statementMonth.getMonth()]} {statementMonth.getFullYear()}
            </Text>
            <TouchableOpacity onPress={() => setStatementMonth((d) => addMonths(d, 1))} hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          {[
            { label: 'Opening Balance', value: statement.openingBalance, color: colors.text },
            { label: 'Income', value: statement.income, color: colors.income, sign: '+' },
            { label: 'Expenses', value: statement.expenses, color: colors.expense, sign: '-' },
            { label: 'Money Lent', value: statement.lent, color: colors.expense, sign: '-' },
            { label: 'Money Repaid', value: statement.repaid, color: colors.income, sign: '+' },
          ].map((row) => (
            <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
              <Text style={{ fontSize: 13, color: colors.textLight }}>{row.label}</Text>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: row.color }}>
                {row.sign ?? ''}
                {format(row.value)}
              </Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Closing Balance</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{format(statement.closingBalance)}</Text>
          </View>
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TYPE_FILTERS}
          keyExtractor={(t) => t}
          contentContainerStyle={{ gap: spacing.sm }}
          renderItem={({ item: type }) => (
            <TouchableOpacity
              onPress={() => setTypeFilter(type)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: spacing.md,
                borderRadius: radius.full,
                backgroundColor: typeFilter === type ? colors.primary : colors.card,
              }}
            >
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: '600',
                  color: typeFilter === type ? colors.white : colors.text,
                  textTransform: 'capitalize',
                }}
              >
                {type}
              </Text>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity
          onPress={() =>
            setSortMode((m) => (m === 'newest' ? 'oldest' : m === 'oldest' ? 'highest' : 'newest'))
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 6,
            paddingHorizontal: spacing.md,
            borderRadius: radius.full,
            backgroundColor: colors.card,
          }}
        >
          <Ionicons name="swap-vertical" size={14} color={colors.text} />
        </TouchableOpacity>
      </View>

      {activeFilterCount > 0 && (
        <TouchableOpacity
          onPress={() => {
            setCategoryFilter(null);
            setAccountFilter(null);
            setDateRange('all');
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md, alignSelf: 'flex-start' }}
        >
          <Ionicons name="close-circle" size={14} color={colors.primary} />
          <Text style={{ fontSize: 12.5, color: colors.primary, fontWeight: '600' }}>
            Clear {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'}
          </Text>
        </TouchableOpacity>
      )}

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="receipt-outline"
            title="No transactions found"
            message={query ? 'Try a different search term.' : 'No transactions match these filters.'}
          />
        </Card>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item, index) => ('header' in item ? `h-${item.header}` : item.id) + index}
          renderItem={({ item }) =>
            'header' in item ? (
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textLight, marginTop: spacing.md, marginBottom: 4 }}>
                {item.header}
              </Text>
            ) : (
              <Card style={{ marginBottom: spacing.sm, paddingVertical: spacing.xs }}>
                <TransactionListItem transaction={item} onDelete={removeTransaction} />
              </Card>
            )
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 130 }}
        />
      )}

      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, maxHeight: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.lg }}>Filters</Text>

            <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: spacing.sm }}>Date range</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
              {DATE_RANGES.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  onPress={() => setDateRange(r.value)}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: radius.full,
                    backgroundColor: dateRange === r.value ? colors.primary : colors.background,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: dateRange === r.value ? colors.white : colors.text }}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {dateRange === 'custom' && (
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.textLight, marginBottom: 4 }}>From</Text>
                  <DateField value={customStart} onChange={setCustomStart} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.textLight, marginBottom: 4 }}>To</Text>
                  <DateField value={customEnd} onChange={setCustomEnd} />
                </View>
              </View>
            )}

            <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: spacing.sm }}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
              <TouchableOpacity
                onPress={() => setCategoryFilter(null)}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  borderRadius: radius.full,
                  backgroundColor: categoryFilter === null ? colors.primary : colors.background,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: categoryFilter === null ? colors.white : colors.text }}>
                  Any
                </Text>
              </TouchableOpacity>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCategoryFilter(c.id)}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: radius.full,
                    backgroundColor: categoryFilter === c.id ? c.color : colors.background,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: categoryFilter === c.id ? colors.white : colors.text }}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: spacing.sm }}>Payment method</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl }}>
              <TouchableOpacity
                onPress={() => setAccountFilter(null)}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  borderRadius: radius.full,
                  backgroundColor: accountFilter === null ? colors.primary : colors.background,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: accountFilter === null ? colors.white : colors.text }}>
                  Any
                </Text>
              </TouchableOpacity>
              {accounts.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setAccountFilter(a.id)}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: radius.full,
                    backgroundColor: accountFilter === a.id ? colors.primary : colors.background,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: accountFilter === a.id ? colors.white : colors.text }}>
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setFiltersOpen(false)}
              style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' }}
            >
              <Text style={{ color: colors.white, fontWeight: '700', fontSize: 15 }}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

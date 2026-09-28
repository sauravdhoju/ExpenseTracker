import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useDateFormat } from '../../../src/hooks/useDateFormat';
import { useAppStore } from '../../../src/store/useAppStore';
import { filterByRange, getMonthlyStatement, type DateRange } from '../../../src/services/calculations';
import { exportStatementAsCSV } from '../../../src/services/exportService';
import { todayISO } from '../../../src/utils/date';
import { shiftMonth } from '../../../src/utils/bsDate';
import { ranges } from '../../../src/utils/links';
import { spacing, radius } from '../../../src/constants/theme';
import PageHeader from '../../../src/components/ui/PageHeader';
import DateField from '../../../src/components/ui/DateField';
import Segmented from '../../../src/components/ui/Segmented';
import { Dot, Sheet, Stat } from '../../../src/components/ui/Sheet';
import TransactionListItem from '../../../src/components/transactions/TransactionListItem';
import type { Transaction, TransactionType } from '../../../src/types';

type SortMode = 'newest' | 'oldest' | 'highest';
type TypeFilter = 'all' | TransactionType;
type Preset = 'today' | 'week' | 'month' | 'all';

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Spent' },
  { value: 'income', label: 'Income' },
  { value: 'lent', label: 'Lent' },
  { value: 'repayment', label: 'Repaid' },
  { value: 'transfer', label: 'Transfers' },
];

const TYPE_TOTAL_LABEL: Partial<Record<TransactionType, string>> = {
  expense: 'Spent',
  income: 'Received',
  lent: 'Lent',
  repayment: 'Repaid to you',
  transfer: 'Transferred',
};

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All' },
];

interface Filters {
  range: DateRange | null; // null = all time
  type: TypeFilter;
  categoryId: string | null;
  accountId: string | null;
}

interface RouteParams {
  k?: string;
  from?: string;
  to?: string;
  type?: string;
  categoryId?: string;
  accountId?: string;
}

function filtersFromParams(p: RouteParams): Filters {
  return {
    range: p.from && p.to ? { start: p.from, end: p.to } : null,
    type: (TYPE_FILTERS.some((t) => t.value === p.type) ? p.type : 'all') as TypeFilter,
    categoryId: p.categoryId ?? null,
    accountId: p.accountId ?? null,
  };
}

const sameRange = (a: DateRange | null, b: DateRange | null) => a?.start === b?.start && a?.end === b?.end;

function Pill({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color?: string }) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onPress}
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
      {color && <Dot color={color} size={7} />}
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: active ? colors.white : colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilterTag({ label, color, onClear }: { label: string; color?: string; onClear: () => void }) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onClear}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 5,
        paddingLeft: 10,
        paddingRight: 8,
        borderRadius: radius.full,
        backgroundColor: colors.primary + '14',
      }}
    >
      {color && <Dot color={color} size={7} />}
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primaryDeep }}>{label}</Text>
      <Ionicons name="close" size={13} color={colors.primaryDeep} />
    </TouchableOpacity>
  );
}

export default function TransactionsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { format } = useCurrency();
  const { dateSystem, format: formatDate, formatMonthYear } = useDateFormat();
  const params = useLocalSearchParams() as RouteParams;

  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const accounts = useAppStore((s) => s.accounts);
  const removeTransaction = useAppStore((s) => s.removeTransaction);

  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(params));
  const [appliedKey, setAppliedKey] = useState(params.k);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [statementMonth, setStatementMonth] = useState(new Date());
  const [draftStart, setDraftStart] = useState(todayISO());
  const [draftEnd, setDraftEnd] = useState(todayISO());
  const [isExporting, setIsExporting] = useState(false);

  // A link from another screen carries a fresh `k`: re-apply its filter even though
  // this tab stays mounted. (Adjusting state during render is React's recommended
  // way to reset state from a changed prop, and avoids an extra effect pass.)
  if (params.k !== appliedKey) {
    setAppliedKey(params.k);
    setFilters(filtersFromParams(params));
    setQuery('');
    setSortMode('newest');
  }

  const now = new Date();
  const presetRanges: Record<Exclude<Preset, 'all'>, DateRange> = {
    today: ranges.today(now),
    week: ranges.week(now),
    month: ranges.month(now, dateSystem),
  };
  const activePreset: Preset | null =
    filters.range === null
      ? 'all'
      : ((['today', 'week', 'month'] as const).find((p) => sameRange(filters.range, presetRanges[p])) ?? null);

  const setPreset = (p: Preset) => setFilters((f) => ({ ...f, range: p === 'all' ? null : presetRanges[p] }));
  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  const filtered = useMemo(() => {
    let result: Transaction[] = filters.range ? filterByRange(transactions, filters.range) : transactions;
    if (filters.type !== 'all') result = result.filter((t) => t.type === filters.type);
    if (filters.categoryId) result = result.filter((t) => t.categoryId === filters.categoryId);
    if (filters.accountId) {
      result = result.filter((t) => t.accountId === filters.accountId || t.toAccountId === filters.accountId);
    }
    const q = query.trim().toLowerCase();
    if (q) {
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
    return [...result].sort((a, b) => {
      if (sortMode === 'highest') return b.amount - a.amount;
      const cmp = a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt);
      return sortMode === 'oldest' ? cmp : -cmp;
    });
  }, [transactions, filters, query, sortMode, categories, accounts]);

  const totals = useMemo(() => {
    const sum = (type: TransactionType) => filtered.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
    return { spent: sum('expense'), income: sum('income'), single: filters.type !== 'all' ? sum(filters.type) : 0 };
  }, [filtered, filters.type]);

  // Group by day (newest/oldest) so each day reads as one sheet with its own spend total.
  const groups = useMemo(() => {
    if (sortMode === 'highest') return [{ key: 'highest', title: 'Largest first', spent: 0, items: filtered }];
    const out: { key: string; title: string; spent: number; items: Transaction[] }[] = [];
    for (const t of filtered) {
      let g = out[out.length - 1];
      if (!g || g.key !== t.date) {
        g = { key: t.date, title: formatDate(t.date), spent: 0, items: [] };
        out.push(g);
      }
      g.items.push(t);
      if (t.type === 'expense') g.spent += t.amount;
    }
    return out;
  }, [filtered, sortMode, formatDate]);

  const statement = useMemo(
    () => getMonthlyStatement(transactions, accounts, statementMonth, dateSystem),
    [transactions, accounts, statementMonth, dateSystem]
  );

  const category = categories.find((c) => c.id === filters.categoryId);
  const account = accounts.find((a) => a.id === filters.accountId);
  const isCustomRange = filters.range !== null && activePreset === null;
  const rangeLabel =
    filters.range === null
      ? 'All time'
      : filters.range.start === filters.range.end
        ? formatDate(filters.range.start)
        : `${formatDate(filters.range.start)} – ${formatDate(filters.range.end)}`;

  const openFilters = () => {
    setDraftStart(filters.range?.start ?? todayISO());
    setDraftEnd(filters.range?.end ?? todayISO());
    setFiltersOpen(true);
  };

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

  const header = (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <Ionicons name="search" size={17} color={colors.textLight} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search title, category, account, amount"
          placeholderTextColor={colors.textLight}
          style={{ flex: 1, paddingVertical: 11, paddingHorizontal: spacing.sm, color: colors.text, fontSize: 14 }}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <Segmented options={PRESETS} value={activePreset} onChange={setPreset} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.xl, marginTop: spacing.md }}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.xl }}
      >
        {TYPE_FILTERS.map((t) => (
          <Pill key={t.value} label={t.label} active={filters.type === t.value} onPress={() => update({ type: t.value })} />
        ))}
      </ScrollView>

      {(isCustomRange || category || account) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
          {isCustomRange && <FilterTag label={rangeLabel} onClear={() => update({ range: null })} />}
          {category && <FilterTag label={category.name} color={category.color} onClear={() => update({ categoryId: null })} />}
          {account && <FilterTag label={account.name} onClear={() => update({ accountId: null })} />}
        </View>
      )}

      {/* Totals for exactly what's listed below — these match the figure that linked here. */}
      <Sheet style={{ marginTop: spacing.lg, paddingVertical: spacing.md }}>
        {filters.type !== 'all' ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Stat label={`${TYPE_TOTAL_LABEL[filters.type] ?? 'Total'} · ${rangeLabel}`} value={format(totals.single)} />
            <Text style={{ fontSize: 12.5, color: colors.textLight }}>
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row' }}>
            <Stat label="Spent" value={format(totals.spent)} />
            <Stat label="Income" value={format(totals.income)} color={colors.income} align="center" />
            <Stat label="Entries" value={String(filtered.length)} align="flex-end" />
          </View>
        )}
      </Sheet>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl, paddingTop: spacing.lg }}>
      <PageHeader
        title="Activity"
        subtitle={rangeLabel}
        actions={[
          { icon: 'options-outline', onPress: openFilters },
          { icon: 'document-text-outline', onPress: () => setStatementOpen(true) },
          { icon: isExporting ? 'hourglass-outline' : 'share-outline', onPress: handleExport },
        ]}
      />

      <FlatList
        data={groups}
        keyExtractor={(g) => g.key}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={{ fontSize: 14, color: colors.textLight, textAlign: 'center', marginTop: spacing.xxl }}>
            {query ? 'Nothing matches that search.' : 'No transactions for this filter.'}
          </Text>
        }
        renderItem={({ item: g }) => (
          <View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: spacing.xl,
                marginBottom: spacing.sm,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: colors.textLight, textTransform: 'uppercase' }}>
                {g.title}
              </Text>
              {g.spent > 0 && (
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textLight, fontVariant: ['tabular-nums'] }}>
                  {format(g.spent)} spent
                </Text>
              )}
            </View>
            <Sheet>
              {g.items.map((t, i) => (
                <TransactionListItem
                  key={t.id}
                  transaction={t}
                  onDelete={removeTransaction}
                  last={i === g.items.length - 1}
                  showCategory={!filters.categoryId}
                />
              ))}
            </Sheet>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      />

      {/* Filters */}
      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setFiltersOpen(false)}>
          <Pressable
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              maxHeight: '85%',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Filters</Text>
              <TouchableOpacity
                onPress={() => {
                  setFilters({ range: null, type: 'all', categoryId: null, accountId: null });
                  setSortMode('newest');
                }}
                hitSlop={8}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primaryDeep }}>Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: colors.textLight, marginBottom: spacing.sm }}>
                SORT
              </Text>
              <Segmented
                options={[
                  { value: 'newest', label: 'Newest' },
                  { value: 'oldest', label: 'Oldest' },
                  { value: 'highest', label: 'Largest' },
                ]}
                value={sortMode}
                onChange={setSortMode}
              />

              <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: colors.textLight, marginTop: spacing.xl, marginBottom: spacing.sm }}>
                CUSTOM DATES
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <DateField value={draftStart} onChange={setDraftStart} />
                </View>
                <View style={{ flex: 1 }}>
                  <DateField value={draftEnd} onChange={setDraftEnd} />
                </View>
              </View>
              <TouchableOpacity
                onPress={() =>
                  update({ range: draftStart <= draftEnd ? { start: draftStart, end: draftEnd } : { start: draftEnd, end: draftStart } })
                }
                style={{ alignSelf: 'flex-start', marginTop: spacing.sm }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primaryDeep }}>Apply these dates</Text>
              </TouchableOpacity>

              <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: colors.textLight, marginTop: spacing.xl, marginBottom: spacing.sm }}>
                CATEGORY
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <Pill label="Any" active={filters.categoryId === null} onPress={() => update({ categoryId: null })} />
                {categories.map((c) => (
                  <Pill key={c.id} label={c.name} color={c.color} active={filters.categoryId === c.id} onPress={() => update({ categoryId: c.id })} />
                ))}
              </View>

              <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: colors.textLight, marginTop: spacing.xl, marginBottom: spacing.sm }}>
                ACCOUNT
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl }}>
                <Pill label="Any" active={filters.accountId === null} onPress={() => update({ accountId: null })} />
                {accounts.map((a) => (
                  <Pill key={a.id} label={a.name} active={filters.accountId === a.id} onPress={() => update({ accountId: a.id })} />
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setFiltersOpen(false)}
              style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: colors.white, fontWeight: '700', fontSize: 15 }}>
                Show {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Monthly statement */}
      <Modal visible={statementOpen} transparent animationType="slide" onRequestClose={() => setStatementOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setStatementOpen(false)}>
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
              <TouchableOpacity onPress={() => setStatementMonth((d) => shiftMonth(d, -1, dateSystem))} hitSlop={10}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{formatMonthYear(statementMonth)} statement</Text>
              <TouchableOpacity onPress={() => setStatementMonth((d) => shiftMonth(d, 1, dateSystem))} hitSlop={10}>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Sheet>
              {[
                { label: 'Opening balance', value: format(statement.openingBalance), color: colors.text },
                { label: 'Income', value: `+${format(statement.income)}`, color: colors.income },
                { label: 'Expenses', value: `−${format(statement.expenses)}`, color: colors.text },
                { label: 'Money lent', value: `−${format(statement.lent)}`, color: colors.text },
                { label: 'Money repaid', value: `+${format(statement.repaid)}`, color: colors.income },
              ].map((row) => (
                <View
                  key={row.label}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Text style={{ fontSize: 14, color: colors.textLight }}>{row.label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: row.color, fontVariant: ['tabular-nums'] }}>{row.value}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.text }}>Closing balance</Text>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] }}>
                  {format(statement.closingBalance)}
                </Text>
              </View>
            </Sheet>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

import { useMemo, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { groupLabel } from '../../../src/utils/date';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import EmptyState from '../../../src/components/ui/EmptyState';
import TransactionListItem from '../../../src/components/transactions/TransactionListItem';
import type { Transaction, TransactionType } from '../../../src/types';

type SortMode = 'newest' | 'oldest' | 'highest';
type TypeFilter = 'all' | TransactionType;

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Earlier'] as const;

export default function TransactionsScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ type?: string }>();

  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const accounts = useAppStore((s) => s.accounts);
  const removeTransaction = useAppStore((s) => s.removeTransaction);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(
    (params.type as TypeFilter) ?? 'all'
  );
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const filtered = useMemo(() => {
    let result: Transaction[] = transactions;

    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
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
  }, [transactions, typeFilter, query, sortMode, categories, accounts]);

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md }}>
        Transactions
      </Text>

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
          placeholder="Search title, category, notes, amount..."
          placeholderTextColor={colors.textLight}
          style={{ flex: 1, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm, color: colors.text }}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        {(['all', 'expense', 'income', 'transfer'] as TypeFilter[]).map((type) => (
          <TouchableOpacity
            key={type}
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
        ))}
        <TouchableOpacity
          onPress={() =>
            setSortMode((m) => (m === 'newest' ? 'oldest' : m === 'oldest' ? 'highest' : 'newest'))
          }
          style={{
            marginLeft: 'auto',
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
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.text, textTransform: 'capitalize' }}>
            {sortMode}
          </Text>
        </TouchableOpacity>
      </View>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="receipt-outline"
            title="No transactions found"
            message={query ? 'Try a different search term.' : 'No transactions yet. Start by adding one.'}
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
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}

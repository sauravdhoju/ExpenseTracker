import { useMemo, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useCurrency } from '../../src/hooks/useCurrency';
import { useAppStore } from '../../src/store/useAppStore';
import { getLoanOutstanding } from '../../src/services/calculations';
import { spacing, radius } from '../../src/constants/theme';
import EmptyState from '../../src/components/ui/EmptyState';

const RESULT_CAP = 8;

type ResultKind = 'transaction' | 'loan' | 'bill' | 'goal' | 'account';

interface SearchResult {
  kind: ResultKind;
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  amountLabel?: string;
  onPress: () => void;
}

export default function SearchScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const router = useRouter();

  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const accounts = useAppStore((s) => s.accounts);
  const loans = useAppStore((s) => s.loans);
  const repayments = useAppStore((s) => s.repayments);
  const bills = useAppStore((s) => s.bills);
  const goals = useAppStore((s) => s.goals);

  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];

    const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '';
    const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '';

    const transactionResults: SearchResult[] = transactions
      .filter((t) => {
        const category = categoryName(t.categoryId);
        const account = accountName(t.accountId);
        return (
          t.title.toLowerCase().includes(q) ||
          (t.notes ?? '').toLowerCase().includes(q) ||
          category.toLowerCase().includes(q) ||
          account.toLowerCase().includes(q) ||
          String(t.amount).includes(q)
        );
      })
      .slice(0, RESULT_CAP)
      .map((t) => ({
        kind: 'transaction' as const,
        id: t.id,
        icon: 'receipt-outline' as const,
        iconColor: colors.primary,
        title: t.title,
        subtitle: `${t.date} · ${categoryName(t.categoryId) || accountName(t.accountId)}`,
        amountLabel: format(t.amount),
        onPress: () => router.push({ pathname: '/transaction/[id]', params: { id: t.id } }),
      }));

    const loanResults: SearchResult[] = loans
      .filter(
        (l) =>
          l.personName.toLowerCase().includes(q) ||
          (l.reason ?? '').toLowerCase().includes(q) ||
          (l.note ?? '').toLowerCase().includes(q)
      )
      .slice(0, RESULT_CAP)
      .map((l) => ({
        kind: 'loan' as const,
        id: l.id,
        icon: 'people-outline' as const,
        iconColor: colors.expense,
        title: l.personName,
        subtitle: l.reason ?? 'Lent money',
        amountLabel: format(getLoanOutstanding(l, repayments)),
        onPress: () => router.push({ pathname: '/loans/[id]', params: { id: l.id } }),
      }));

    const billResults: SearchResult[] = bills
      .filter((b) => b.title.toLowerCase().includes(q))
      .slice(0, RESULT_CAP)
      .map((b) => ({
        kind: 'bill' as const,
        id: b.id,
        icon: 'calendar-outline' as const,
        iconColor: colors.warning,
        title: b.title,
        subtitle: b.isPaid ? 'Paid' : `Due ${b.dueDate}`,
        amountLabel: format(b.amount),
        onPress: () => router.push('/bills'),
      }));

    const goalResults: SearchResult[] = goals
      .filter((g) => g.name.toLowerCase().includes(q))
      .slice(0, RESULT_CAP)
      .map((g) => ({
        kind: 'goal' as const,
        id: g.id,
        icon: 'flag-outline' as const,
        iconColor: colors.income,
        title: g.name,
        subtitle: `${format(g.currentAmount)} of ${format(g.targetAmount)}`,
        onPress: () => router.push('/goals'),
      }));

    const accountResults: SearchResult[] = accounts
      .filter((a) => a.name.toLowerCase().includes(q))
      .slice(0, RESULT_CAP)
      .map((a) => ({
        kind: 'account' as const,
        id: a.id,
        icon: 'wallet-outline' as const,
        iconColor: colors.textLight,
        title: a.name,
        subtitle: a.type,
        amountLabel: format(a.balance),
        onPress: () => router.push({ pathname: '/accounts/[id]', params: { id: a.id } }),
      }));

    return [
      { title: 'Transactions', data: transactionResults },
      { title: 'People', data: loanResults },
      { title: 'Bills', data: billResults },
      { title: 'Goals', data: goalResults },
      { title: 'Accounts', data: accountResults },
    ].filter((s) => s.data.length > 0);
  }, [query, transactions, categories, accounts, loans, repayments, bills, goals, colors, format, router]);

  const flatData = useMemo(
    () => sections.flatMap((s) => [{ header: s.title }, ...s.data]),
    [sections]
  );

  const hasQuery = query.trim().length > 0;
  const hasResults = flatData.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.sm }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          }}
        >
          <Ionicons name="search" size={18} color={colors.textLight} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search transactions, people, bills, goals, accounts..."
            placeholderTextColor={colors.textLight}
            autoFocus
            style={{ flex: 1, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm, color: colors.text }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 15, color: colors.primary, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {!hasQuery ? (
        <EmptyState
          icon="search-outline"
          title="Search everything"
          message="Find a transaction, a person you lent money to, a bill, a goal, or an account."
          style={{ marginTop: spacing.xxl }}
        />
      ) : !hasResults ? (
        <EmptyState icon="search-outline" title="No results" message={`Nothing matches "${query.trim()}".`} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item, index) => ('header' in item ? `h-${item.header}` : `${item.kind}-${item.id}`) + index}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
          renderItem={({ item }) =>
            'header' in item ? (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.textLight,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginTop: spacing.md,
                  marginBottom: spacing.sm,
                }}
              >
                {item.header}
              </Text>
            ) : (
              <TouchableOpacity
                onPress={item.onPress}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.card,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                }}
              >
                <Ionicons name={item.icon} size={18} color={item.iconColor} style={{ marginRight: spacing.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                {item.amountLabel && (
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.text }}>{item.amountLabel}</Text>
                )}
              </TouchableOpacity>
            )
          }
        />
      )}
    </View>
  );
}

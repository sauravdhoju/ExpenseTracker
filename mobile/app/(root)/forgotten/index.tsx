import { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useDateFormat } from '../../../src/hooks/useDateFormat';
import { useAppStore } from '../../../src/store/useAppStore';
import {
  getForgottenOutstanding,
  getForgottenResolvedAmount,
  getForgottenStatus,
  getForgottenSummary,
} from '../../../src/services/calculations';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import EmptyState from '../../../src/components/ui/EmptyState';
import type { ForgottenStatus } from '../../../src/types';

type FilterOption = 'all' | ForgottenStatus;

const FILTERS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'partial', label: 'Partial' },
  { value: 'resolved', label: 'Resolved' },
];

const STATUS_DOT: Record<ForgottenStatus, string> = {
  unresolved: '🔴',
  partial: '🟡',
  resolved: '✅',
};

export default function ForgottenMoneyScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const { format: formatDate } = useDateFormat();
  const router = useRouter();
  const entries = useAppStore((s) => s.forgottenEntries);
  const transactions = useAppStore((s) => s.transactions);

  const [filter, setFilter] = useState<FilterOption>('all');

  const summary = useMemo(() => getForgottenSummary(entries, transactions), [entries, transactions]);

  const filtered = useMemo(
    () => entries.filter((e) => filter === 'all' || getForgottenStatus(e, transactions) === filter),
    [entries, transactions, filter]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Forgotten Money</Text>
        <TouchableOpacity onPress={() => router.push('/forgotten/new')}>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 130 }}>
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.xs }}>Total Forgotten</Text>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: spacing.md }}>
            {format(summary.totalForgotten)}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 12, color: colors.textLight }}>Outstanding</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.expense }}>
                {format(summary.outstanding)}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: colors.textLight }}>Resolved</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.income }}>
                {format(summary.resolved)}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: colors.textLight }}>Open</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{summary.unresolvedCount}</Text>
            </View>
          </View>
        </Card>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 14,
                borderRadius: radius.full,
                backgroundColor: filter === f.value ? colors.primary : colors.card,
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: filter === f.value ? colors.white : colors.text }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon="help-circle-outline"
              title="Nothing here"
              message={
                filter === 'all'
                  ? "Record money you can't place yet, and resolve it once you remember."
                  : `No ${filter} entries.`
              }
              actionLabel={filter === 'all' ? 'Add Forgotten Money' : undefined}
              onAction={filter === 'all' ? () => router.push('/forgotten/new') : undefined}
            />
          </Card>
        ) : (
          filtered.map((entry) => {
            const status = getForgottenStatus(entry, transactions);
            const outstanding = getForgottenOutstanding(entry, transactions);
            const resolvedAmount = getForgottenResolvedAmount(entry, transactions);
            return (
              <TouchableOpacity
                key={entry.id}
                onPress={() => router.push({ pathname: '/forgotten/[id]', params: { id: entry.id } })}
              >
                <Card style={{ marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                    <Text style={{ fontSize: 16 }}>{STATUS_DOT[status]}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginLeft: spacing.sm }}>
                      {format(entry.amount)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>{formatDate(entry.date)}</Text>
                  {status === 'unresolved' && (
                    <Text style={{ fontSize: 12.5, color: colors.textLight }}>Unknown — where did this money go?</Text>
                  )}
                  {status === 'partial' && (
                    <Text style={{ fontSize: 12.5, color: colors.textLight }}>
                      {format(resolvedAmount)} resolved · {format(outstanding)} remaining
                    </Text>
                  )}
                  {status === 'resolved' && <Text style={{ fontSize: 12.5, color: colors.income }}>Resolved</Text>}
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

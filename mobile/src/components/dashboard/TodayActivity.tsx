import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store/useAppStore';
import { filterByDay } from '../../services/calculations';
import { activityHref, ranges } from '../../utils/links';
import { spacing } from '../../constants/theme';
import { Sheet, SectionTitle } from '../ui/Sheet';
import TransactionListItem from '../transactions/TransactionListItem';

const MAX_ITEMS = 6;

export default function TodayActivity({ now }: { now: Date }) {
  const colors = useThemeColors();
  const router = useRouter();
  const transactions = useAppStore((s) => s.transactions);
  const removeTransaction = useAppStore((s) => s.removeTransaction);

  const today = useMemo(
    () => [...filterByDay(transactions, now)].sort((a, b) => b.time.localeCompare(a.time)),
    [transactions, now]
  );
  const shown = today.slice(0, MAX_ITEMS);
  const openAll = () => router.push(activityHref({ range: ranges.today(now) }));

  return (
    <View>
      <SectionTitle
        title={today.length === 0 ? 'Today' : `Today · ${today.length} ${today.length === 1 ? 'entry' : 'entries'}`}
        linkLabel="All activity"
        onLinkPress={openAll}
      />
      <Sheet>
        {shown.length === 0 ? (
          <Text style={{ fontSize: 14, color: colors.textLight, paddingVertical: spacing.lg, textAlign: 'center' }}>
            Nothing logged yet today.
          </Text>
        ) : (
          shown.map((t, i) => (
            <TransactionListItem key={t.id} transaction={t} onDelete={removeTransaction} last={i === shown.length - 1} />
          ))
        )}
      </Sheet>
      {today.length > MAX_ITEMS && (
        <Text
          onPress={openAll}
          style={{ fontSize: 12.5, fontWeight: '600', color: colors.primaryDeep, textAlign: 'center', marginTop: spacing.sm }}
        >
          +{today.length - MAX_ITEMS} earlier today
        </Text>
      )}
    </View>
  );
}

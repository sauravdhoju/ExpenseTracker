import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useAppStore } from '../../../src/store/useAppStore';
import { formatFriendlyDate } from '../../../src/utils/date';
import { spacing } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import EmptyState from '../../../src/components/ui/EmptyState';
import IconCircle from '../../../src/components/ui/IconCircle';

export default function RecurringScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const router = useRouter();
  const recurring = useAppStore((s) => s.recurring);
  const categories = useAppStore((s) => s.categories);
  const setRecurringActive = useAppStore((s) => s.setRecurringActive);
  const removeRecurring = useAppStore((s) => s.removeRecurring);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Recurring Transactions</Text>
        <TouchableOpacity onPress={() => router.push('/recurring/new')}>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 100 }}>
        {recurring.length === 0 ? (
          <Card>
            <EmptyState
              icon="repeat-outline"
              title="No recurring transactions"
              message="Add salary, rent, subscriptions and other repeating payments."
              actionLabel="Add Recurring"
              onAction={() => router.push('/recurring/new')}
            />
          </Card>
        ) : (
          recurring.map((r) => {
            const category = categories.find((c) => c.id === r.categoryId);
            return (
              <TouchableOpacity
                key={r.id}
                onLongPress={() =>
                  Alert.alert('Delete recurring transaction', `Delete "${r.title}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => removeRecurring(r.id) },
                  ])
                }
              >
                <Card style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
                  <IconCircle name={(category?.icon as any) ?? 'repeat'} color={category?.color ?? colors.primary} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{r.title}</Text>
                    <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2, textTransform: 'capitalize' }}>
                      {r.frequency} · Next {formatFriendlyDate(r.nextOccurrence)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: r.type === 'income' ? colors.income : colors.expense }}>
                      {r.type === 'income' ? '+' : '-'}
                      {format(r.amount)}
                    </Text>
                    <TouchableOpacity onPress={() => setRecurringActive(r.id, !r.isActive)} hitSlop={8} style={{ marginTop: 4 }}>
                      <Ionicons name={r.isActive ? 'toggle' : 'toggle-outline'} size={26} color={r.isActive ? colors.primary : colors.textLight} />
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

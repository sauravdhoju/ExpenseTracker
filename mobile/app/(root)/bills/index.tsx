import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useAppStore } from '../../../src/store/useAppStore';
import { daysBetween, formatFriendlyDate, todayISO } from '../../../src/utils/date';
import { spacing } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import EmptyState from '../../../src/components/ui/EmptyState';
import IconCircle from '../../../src/components/ui/IconCircle';

export default function BillsScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const router = useRouter();
  const bills = useAppStore((s) => s.bills);
  const setBillPaid = useAppStore((s) => s.setBillPaid);
  const removeBill = useAppStore((s) => s.removeBill);

  const unpaid = bills.filter((b) => !b.isPaid);
  const paid = bills.filter((b) => b.isPaid);

  const renderBill = (bill: (typeof bills)[number]) => {
    const days = daysBetween(todayISO(), bill.dueDate);
    const overdue = !bill.isPaid && days < 0;
    return (
      <TouchableOpacity
        key={bill.id}
        onLongPress={() =>
          Alert.alert('Delete bill', `Delete "${bill.title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => removeBill(bill.id) },
          ])
        }
      >
        <Card style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
          <IconCircle
            name="receipt-outline"
            color={bill.isPaid ? colors.income : overdue ? colors.expense : colors.warning}
          />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{bill.title}</Text>
            <Text style={{ fontSize: 12, color: overdue ? colors.expense : colors.textLight, marginTop: 2 }}>
              {bill.isPaid ? 'Paid' : overdue ? `Overdue · was due ${formatFriendlyDate(bill.dueDate)}` : `Due ${formatFriendlyDate(bill.dueDate)} · ${days} day${days === 1 ? '' : 's'}`}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{format(bill.amount)}</Text>
            <TouchableOpacity onPress={() => setBillPaid(bill.id, !bill.isPaid)} hitSlop={8} style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>
                {bill.isPaid ? 'Mark unpaid' : 'Mark paid'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Bills & Reminders</Text>
        <TouchableOpacity onPress={() => router.push('/bills/new')}>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 100 }}>
        {bills.length === 0 ? (
          <Card>
            <EmptyState
              icon="calendar-outline"
              title="No bills yet"
              message="Add upcoming bills so you never miss a payment."
              actionLabel="Add Bill"
              onAction={() => router.push('/bills/new')}
            />
          </Card>
        ) : (
          <>
            {unpaid.length > 0 && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textLight, marginBottom: spacing.sm, textTransform: 'uppercase' }}>
                  Upcoming
                </Text>
                {unpaid.map(renderBill)}
              </>
            )}
            {paid.length > 0 && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textLight, marginBottom: spacing.sm, marginTop: spacing.sm, textTransform: 'uppercase' }}>
                  Paid
                </Text>
                {paid.map(renderBill)}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCurrency } from '../../hooks/useCurrency';
import { useAppStore } from '../../store/useAppStore';
import { getUpcomingBills } from '../../services/calculations';
import { daysBetween, formatFriendlyDate, todayISO } from '../../utils/date';
import { spacing } from '../../constants/theme';
import Card from '../ui/Card';
import IconCircle from '../ui/IconCircle';

export default function UpcomingBillsPreview() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const router = useRouter();
  const bills = useAppStore((s) => s.bills);

  const upcoming = getUpcomingBills(bills, 14).slice(0, 4);
  if (upcoming.length === 0) return null;

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <TouchableOpacity
        onPress={() => router.push('/bills')}
        style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Upcoming Payments</Text>
        <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>View all</Text>
      </TouchableOpacity>

      {upcoming.map((bill) => {
        const days = daysBetween(todayISO(), bill.dueDate);
        return (
          <View key={bill.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <IconCircle name="receipt-outline" color={colors.warning} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{bill.title}</Text>
              <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                Due {formatFriendlyDate(bill.dueDate)} {days === 0 ? '· Today' : days === 1 ? '· Tomorrow' : `· ${days} days`}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{format(bill.amount)}</Text>
          </View>
        );
      })}
    </Card>
  );
}

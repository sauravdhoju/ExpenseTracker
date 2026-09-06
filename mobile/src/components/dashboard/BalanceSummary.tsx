import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCurrency } from '../../hooks/useCurrency';
import { useAppStore } from '../../store/useAppStore';
import { radius, spacing } from '../../constants/theme';
import Card from '../ui/Card';
import IconCircle from '../ui/IconCircle';

interface Props {
  balance: number;
  income: number;
  expenses: number;
}

export default function BalanceSummary({ balance, income, expenses }: Props) {
  const colors = useThemeColors();
  const { format, hideBalances } = useCurrency();
  const updateSettings = useAppStore((s) => s.updateSettings);
  const router = useRouter();

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <IconCircle name="wallet" color={colors.primary} size={36} iconSize={16} />
          <Text style={{ color: colors.textLight, fontSize: 13.5, fontWeight: '500' }}>Total Balance</Text>
        </View>
        <TouchableOpacity
          hitSlop={8}
          onPress={() => updateSettings({ hideBalances: !hideBalances })}
          accessibilityRole="button"
          accessibilityLabel={hideBalances ? 'Show balances' : 'Hide balances'}
        >
          <Ionicons name={hideBalances ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textLight} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push('/accounts')}>
        <Text style={{ color: colors.text, fontSize: 34, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.lg }}>
          {format(balance)}
        </Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.income + '14',
            borderRadius: radius.md,
            padding: spacing.md,
          }}
          onPress={() => router.push({ pathname: '/(root)/(tabs)/transactions', params: { type: 'income' } })}
        >
          <IconCircle name="arrow-up" color={colors.income} size={32} iconSize={15} />
          <View>
            <Text style={{ color: colors.textLight, fontSize: 11.5 }}>Income</Text>
            <Text style={{ color: colors.income, fontSize: 15, fontWeight: '700' }}>{format(income)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.expense + '14',
            borderRadius: radius.md,
            padding: spacing.md,
          }}
          onPress={() => router.push({ pathname: '/(root)/(tabs)/transactions', params: { type: 'expense' } })}
        >
          <IconCircle name="arrow-down" color={colors.expense} size={32} iconSize={15} />
          <View>
            <Text style={{ color: colors.textLight, fontSize: 11.5 }}>Expenses</Text>
            <Text style={{ color: colors.expense, fontSize: 15, fontWeight: '700' }}>{format(expenses)}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

import { Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCurrency } from '../../hooks/useCurrency';
import { useAppStore } from '../../store/useAppStore';
import { radius, spacing } from '../../constants/theme';

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
    <LinearGradient
      colors={[colors.primary, colors.income]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.lg }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>Total Balance</Text>
        <TouchableOpacity
          hitSlop={8}
          onPress={() => updateSettings({ hideBalances: !hideBalances })}
          accessibilityRole="button"
          accessibilityLabel={hideBalances ? 'Show balances' : 'Hide balances'}
        >
          <Ionicons name={hideBalances ? 'eye-off' : 'eye'} size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => router.push('/accounts')}>
        <Text style={{ color: colors.white, fontSize: 32, fontWeight: '700', marginTop: 6, marginBottom: spacing.lg }}>
          {format(balance)}
        </Text>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/(root)/(tabs)/transactions', params: { type: 'income' } })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-up-circle" size={14} color="#FFF" />
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Income</Text>
          </View>
          <Text style={{ color: colors.white, fontSize: 17, fontWeight: '600', marginTop: 4 }}>
            {format(income)}
          </Text>
        </TouchableOpacity>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: spacing.md }} />
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/(root)/(tabs)/transactions', params: { type: 'expense' } })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-down-circle" size={14} color="#FFF" />
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Expenses</Text>
          </View>
          <Text style={{ color: colors.white, fontSize: 17, fontWeight: '600', marginTop: 4 }}>
            {format(expenses)}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

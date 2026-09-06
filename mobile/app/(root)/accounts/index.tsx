import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useAppStore } from '../../../src/store/useAppStore';
import { getTotalBalance } from '../../../src/services/calculations';
import { spacing } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import IconCircle from '../../../src/components/ui/IconCircle';
import EmptyState from '../../../src/components/ui/EmptyState';

const ACCOUNT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  cash: 'cash-outline',
  bank: 'business-outline',
  savings: 'wallet-outline',
  wallet: 'phone-portrait-outline',
  credit_card: 'card-outline',
  investment: 'trending-up-outline',
  other: 'ellipse-outline',
};

export default function AccountsScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const router = useRouter();
  const accounts = useAppStore((s) => s.accounts);

  const activeAccounts = accounts.filter((a) => a.isActive);
  const totalBalance = getTotalBalance(accounts);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: spacing.lg,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Accounts</Text>
        <TouchableOpacity onPress={() => router.push('/accounts/new')}>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
        <Card style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: 4 }}>Total Balance</Text>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>{format(totalBalance)}</Text>
        </Card>

        {activeAccounts.length === 0 ? (
          <Card>
            <EmptyState
              icon="wallet-outline"
              title="No accounts yet"
              message="Add your first account to start tracking money."
              actionLabel="Add Account"
              onAction={() => router.push('/accounts/new')}
            />
          </Card>
        ) : (
          activeAccounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              onPress={() => router.push({ pathname: '/accounts/[id]', params: { id: account.id } })}
            >
              <Card style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
                <IconCircle name={ACCOUNT_ICONS[account.type]} color={account.color} size={44} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{account.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2, textTransform: 'capitalize' }}>
                    {account.type.replace('_', ' ')}
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{format(account.balance)}</Text>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

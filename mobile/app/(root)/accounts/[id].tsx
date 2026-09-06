import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useAppStore } from '../../../src/store/useAppStore';
import { getTotalExpenses, getTotalIncome } from '../../../src/services/calculations';
import { spacing } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import Button from '../../../src/components/ui/Button';
import EmptyState from '../../../src/components/ui/EmptyState';
import TransactionListItem from '../../../src/components/transactions/TransactionListItem';
import PageLoader from '../../../src/components/ui/PageLoader';

export default function AccountDetailScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const accounts = useAppStore((s) => s.accounts);
  const transactions = useAppStore((s) => s.transactions);
  const removeTransaction = useAppStore((s) => s.removeTransaction);
  const archiveAccount = useAppStore((s) => s.archiveAccount);
  const removeAccount = useAppStore((s) => s.removeAccount);
  const addTransaction = useAppStore((s) => s.addTransaction);

  const [adjustMode, setAdjustMode] = useState(false);
  const [adjustValue, setAdjustValue] = useState('');

  const account = accounts.find((a) => a.id === id);

  const accountTransactions = useMemo(
    () => transactions.filter((t) => t.accountId === id || t.toAccountId === id),
    [transactions, id]
  );

  if (!account) return <PageLoader />;

  const income = getTotalIncome(accountTransactions.filter((t) => t.accountId === id));
  const expenses = getTotalExpenses(accountTransactions.filter((t) => t.accountId === id));
  const transfersOut = accountTransactions.filter((t) => t.type === 'transfer' && t.accountId === id).length;
  const transfersIn = accountTransactions.filter((t) => t.type === 'transfer' && t.toAccountId === id).length;

  const handleAdjust = async () => {
    const target = parseFloat(adjustValue);
    if (Number.isNaN(target)) {
      Alert.alert('Invalid amount', 'Enter a valid balance.');
      return;
    }
    const delta = target - account.balance;
    if (delta === 0) {
      setAdjustMode(false);
      return;
    }
    await addTransaction({
      type: delta > 0 ? 'income' : 'expense',
      amount: Math.abs(delta),
      accountId: account.id,
      categoryId: null,
      title: 'Balance adjustment',
      notes: `Manual adjustment from ${format(account.balance)} to ${format(target)}`,
      date: new Date().toISOString().slice(0, 10),
    });
    setAdjustMode(false);
    setAdjustValue('');
  };

  const handleArchive = () => {
    Alert.alert(
      account.isActive ? 'Deactivate account' : 'Reactivate account',
      account.isActive
        ? 'This account will be hidden from totals but its history is kept.'
        : 'This account will be included in totals again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: account.isActive ? 'Deactivate' : 'Reactivate', onPress: () => archiveAccount(account.id, !account.isActive) },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert('Delete account', 'This permanently removes the account. Transactions referencing it will remain but show no account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeAccount(account.id);
          router.back();
        },
      },
    ]);
  };

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
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{account.name}</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={colors.expense} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 100 }}>
        <Card style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: 4 }}>Current Balance</Text>
          {adjustMode ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm }}>
              <TextInput
                value={adjustValue}
                onChangeText={setAdjustValue}
                keyboardType="decimal-pad"
                autoFocus
                style={{ fontSize: 22, fontWeight: '700', color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border, minWidth: 120, textAlign: 'center' }}
              />
              <TouchableOpacity onPress={handleAdjust}>
                <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAdjustMode(false)}>
                <Ionicons name="close-circle" size={28} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setAdjustValue(String(account.balance));
                setAdjustMode(true);
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>{format(account.balance)}</Text>
              <Text style={{ fontSize: 11, color: colors.primary, textAlign: 'center', marginTop: 4 }}>Tap to adjust</Text>
            </TouchableOpacity>
          )}
        </Card>

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.textLight }}>Income</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.income, marginTop: 4 }}>{format(income)}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.textLight }}>Expenses</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.expense, marginTop: 4 }}>{format(expenses)}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.textLight }}>Transfers</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 }}>
              {transfersIn + transfersOut}
            </Text>
          </Card>
        </View>

        <Button
          label={account.isActive ? 'Deactivate Account' : 'Reactivate Account'}
          variant="secondary"
          onPress={handleArchive}
          style={{ marginBottom: spacing.lg }}
        />

        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>
          Transaction History
        </Text>
        {accountTransactions.length === 0 ? (
          <Card>
            <EmptyState icon="receipt-outline" title="No transactions" message="This account has no activity yet." />
          </Card>
        ) : (
          <Card>
            {accountTransactions.map((t) => (
              <TransactionListItem key={t.id} transaction={t} onDelete={removeTransaction} />
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

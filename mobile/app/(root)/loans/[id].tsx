import { useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useDateFormat } from '../../../src/hooks/useDateFormat';
import { useAppStore } from '../../../src/store/useAppStore';
import { getLoanOutstanding, getLoanStatus } from '../../../src/services/calculations';
import { todayISO } from '../../../src/utils/date';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import Button from '../../../src/components/ui/Button';
import DateField from '../../../src/components/ui/DateField';
import EmptyState from '../../../src/components/ui/EmptyState';

export default function LoanDetailScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const { format: formatDate } = useDateFormat();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const loan = useAppStore((s) => s.loans.find((l) => l.id === id));
  const repayments = useAppStore((s) => s.repayments.filter((r) => r.loanId === id));
  const accounts = useAppStore((s) => s.accounts);
  const addRepayment = useAppStore((s) => s.addRepayment);
  const removeRepayment = useAppStore((s) => s.removeRepayment);
  const removeLoan = useAppStore((s) => s.removeLoan);

  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [accountId, setAccountId] = useState<string | null>(loan?.accountId ?? accounts[0]?.id ?? null);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!loan) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: spacing.lg }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <Card style={{ margin: spacing.lg }}>
          <EmptyState icon="person-outline" title="Loan not found" message="This loan may have been deleted." />
        </Card>
      </View>
    );
  }

  const outstanding = getLoanOutstanding(loan, repayments);
  const status = getLoanStatus(loan, repayments);
  const paid = loan.originalAmount - outstanding;

  const openRepaymentModal = () => {
    setAmount('');
    setDate(todayISO());
    setAccountId(loan.accountId);
    setNote('');
    setModalVisible(true);
  };

  const handleRecordRepayment = async () => {
    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }
    if (parsed > outstanding) {
      Alert.alert('Amount too high', `Only ${format(outstanding)} is outstanding.`);
      return;
    }
    if (!accountId) {
      Alert.alert('Missing account', 'Select where the repayment landed.');
      return;
    }
    setIsSaving(true);
    try {
      await addRepayment({ loanId: loan.id, amount: parsed, date, accountId, note: note.trim() || null });
      setModalVisible(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLoan = () => {
    Alert.alert('Delete loan', `Delete this loan to ${loan.personName}? This also removes its repayments.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeLoan(loan.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{loan.personName}</Text>
        <TouchableOpacity onPress={handleDeleteLoan}>
          <Ionicons name="trash-outline" size={20} color={colors.expense} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 130 }}>
        <Card style={{ marginBottom: spacing.lg }}>
          {status === 'repaid' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md }}>
              <Ionicons name="checkmark-circle" size={18} color={colors.income} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.income }}>✓ Fully Repaid</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ fontSize: 13, color: colors.textLight }}>Original Amount</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{format(loan.originalAmount)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ fontSize: 13, color: colors.textLight }}>Paid</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.income }}>{format(paid)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: colors.textLight }}>Remaining</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.expense }}>{format(outstanding)}</Text>
          </View>

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

          <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>
            Lent on {formatDate(loan.lentDate)}
            {loan.expectedReturnDate ? ` · Due ${formatDate(loan.expectedReturnDate)}` : ''}
          </Text>
          {loan.reason ? <Text style={{ fontSize: 12, color: colors.textLight }}>Reason: {loan.reason}</Text> : null}
          {loan.note ? <Text style={{ fontSize: 12, color: colors.textLight }}>Note: {loan.note}</Text> : null}

          {status !== 'repaid' && (
            <View style={{ marginTop: spacing.md }}>
              <Button label="Record Repayment" onPress={openRepaymentModal} />
            </View>
          )}
        </Card>

        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
          Repayment History
        </Text>
        {repayments.length === 0 ? (
          <Card>
            <EmptyState icon="cash-outline" title="No repayments yet" message="Repayments will show up here." />
          </Card>
        ) : (
          repayments.map((r) => {
            const account = accounts.find((a) => a.id === r.accountId);
            return (
              <Card key={r.id} style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                    {formatDate(r.date)}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                    {account?.name ?? 'Account'}
                    {r.note ? ` · ${r.note}` : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.income, marginRight: spacing.sm }}>
                  + {format(r.amount)}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Delete repayment', 'Remove this repayment?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => removeRepayment(r.id) },
                    ])
                  }
                  hitSlop={8}
                >
                  <Ionicons name="close-circle-outline" size={18} color={colors.textLight} />
                </TouchableOpacity>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing.xl,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.lg }}>
              Record Repayment
            </Text>

            <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Repayment Amount</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textLight}
              autoFocus
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.text,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                paddingBottom: spacing.sm,
                marginBottom: spacing.lg,
              }}
            />

            <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Date</Text>
            <View style={{ marginBottom: spacing.lg }}>
              <DateField value={date} onChange={setDate} />
            </View>

            <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Payment Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  onPress={() => setAccountId(account.id)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: radius.full,
                    backgroundColor: accountId === account.id ? colors.primary : colors.background,
                    marginRight: spacing.sm,
                  }}
                >
                  <Text
                    style={{
                      color: accountId === account.id ? colors.white : colors.text,
                      fontWeight: '600',
                      fontSize: 13,
                    }}
                  >
                    {account.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Note (optional)"
              placeholderTextColor={colors.textLight}
              style={{
                backgroundColor: colors.background,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: 14,
                color: colors.text,
                marginBottom: spacing.xl,
              }}
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
              <Button label="Save" style={{ flex: 1 }} onPress={handleRecordRepayment} loading={isSaving} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { spacing, radius } from '../../../src/constants/theme';
import Button from '../../../src/components/ui/Button';
import DateField from '../../../src/components/ui/DateField';
import { todayISO } from '../../../src/utils/date';

export default function NewLoanScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const accounts = useAppStore((s) => s.accounts);
  const addLoan = useAppStore((s) => s.addLoan);

  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [lentDate, setLentDate] = useState(todayISO());
  const [hasReturnDate, setHasReturnDate] = useState(false);
  const [expectedReturnDate, setExpectedReturnDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (!personName.trim() || Number.isNaN(parsed) || parsed <= 0) {
      Alert.alert('Missing info', 'Enter a person and an amount greater than 0.');
      return;
    }
    if (!accountId) {
      Alert.alert('Missing account', 'Select where the money is coming from.');
      return;
    }
    setIsSaving(true);
    try {
      await addLoan({
        personName: personName.trim(),
        originalAmount: parsed,
        lentDate,
        expectedReturnDate: hasReturnDate ? expectedReturnDate : null,
        reason: reason.trim() || null,
        note: note.trim() || null,
        accountId,
      });
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Add Lent Money</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Person</Text>
        <TextInput
          value={personName}
          onChangeText={setPersonName}
          placeholder="e.g. Ram"
          placeholderTextColor={colors.textLight}
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: spacing.md,
            fontSize: 15,
            color: colors.text,
            marginBottom: spacing.lg,
          }}
        />

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Amount</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textLight}
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: spacing.md,
            fontSize: 15,
            color: colors.text,
            marginBottom: spacing.lg,
          }}
        />

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Date</Text>
        <View style={{ marginBottom: spacing.lg }}>
          <DateField value={lentDate} onChange={setLentDate} />
        </View>

        <TouchableOpacity
          onPress={() => setHasReturnDate((v) => !v)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: hasReturnDate ? spacing.md : spacing.lg,
          }}
        >
          <Text style={{ fontSize: 14, color: colors.text }}>Set expected return date</Text>
          <Ionicons
            name={hasReturnDate ? 'checkbox' : 'square-outline'}
            size={20}
            color={hasReturnDate ? colors.primary : colors.textLight}
          />
        </TouchableOpacity>
        {hasReturnDate && (
          <View style={{ marginBottom: spacing.lg }}>
            <DateField value={expectedReturnDate} onChange={setExpectedReturnDate} />
          </View>
        )}

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Reason (optional)</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Personal, Emergency"
          placeholderTextColor={colors.textLight}
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: spacing.md,
            fontSize: 15,
            color: colors.text,
            marginBottom: spacing.lg,
          }}
        />

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Source account</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
          {accounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              onPress={() => setAccountId(account.id)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: radius.full,
                backgroundColor: accountId === account.id ? colors.primary : colors.card,
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

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Gave cash"
          placeholderTextColor={colors.textLight}
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: spacing.md,
            fontSize: 15,
            color: colors.text,
            marginBottom: spacing.xl,
          }}
        />

        <Button label="Save" onPress={handleSave} loading={isSaving} />
      </ScrollView>
    </View>
  );
}

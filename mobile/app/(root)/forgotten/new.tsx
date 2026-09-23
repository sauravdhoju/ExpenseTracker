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

export default function NewForgottenEntryScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const accounts = useAppStore((s) => s.accounts);
  const addForgottenEntry = useAppStore((s) => s.addForgottenEntry);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }
    if (!accountId) {
      Alert.alert('Missing account', 'Select a payment method.');
      return;
    }
    setIsSaving(true);
    try {
      await addForgottenEntry({ amount: parsed, date, accountId, note: note.trim() || null });
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
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Forgotten Money</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={{ fontSize: 12.5, color: colors.textLight, marginBottom: spacing.lg, lineHeight: 18 }}>
          Money you know is gone but can&apos;t place yet. Record it here and resolve it later once you remember
          what it was spent on.
        </Text>

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Amount</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textLight}
          autoFocus
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: spacing.md,
            fontSize: 15,
            color: colors.text,
            marginBottom: spacing.lg,
          }}
        />

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Actual Date</Text>
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
          placeholder="I don't remember where I spent this."
          placeholderTextColor={colors.textLight}
          multiline
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: spacing.md,
            fontSize: 15,
            color: colors.text,
            marginBottom: spacing.xl,
            minHeight: 60,
            textAlignVertical: 'top',
          }}
        />

        <Button label="Save" onPress={handleSave} loading={isSaving} />
      </ScrollView>
    </View>
  );
}

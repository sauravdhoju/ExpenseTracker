import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { spacing, radius } from '../../../src/constants/theme';
import Button from '../../../src/components/ui/Button';
import DateField from '../../../src/components/ui/DateField';
import PageLoader from '../../../src/components/ui/PageLoader';
import { CURRENCIES } from '../../../src/constants/currencies';
import type { TransactionType } from '../../../src/types';

export default function EditTransactionScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const transactions = useAppStore((s) => s.transactions);
  const accounts = useAppStore((s) => s.accounts);
  const categories = useAppStore((s) => s.categories);
  const editTransaction = useAppStore((s) => s.editTransaction);
  const removeTransaction = useAppStore((s) => s.removeTransaction);
  const currency = useAppStore((s) => s.settings.currency);
  const currencySymbol = CURRENCIES[currency].symbol;

  const existing = transactions.find((t) => t.id === id);

  const type: TransactionType = existing?.type ?? 'expense';
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [accountId, setAccountId] = useState<string | null>(existing?.accountId ?? null);
  const [toAccountId, setToAccountId] = useState<string | null>(existing?.toAccountId ?? null);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [date, setDate] = useState(existing?.date ?? '');
  const [isSaving, setIsSaving] = useState(false);

  if (!existing) return <PageLoader />;

  const relevantCategories = categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense'));

  const canSave =
    parseFloat(amount) > 0 &&
    accountId &&
    (type === 'transfer' ? toAccountId && toAccountId !== accountId : categoryId && title.trim().length > 0);

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0 || !accountId) return;
    setIsSaving(true);
    try {
      await editTransaction(existing.id, {
        type,
        amount: parsedAmount,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : null,
        categoryId: type === 'transfer' ? null : categoryId,
        title: title.trim(),
        notes: notes.trim() || null,
        date,
      });
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete transaction', 'This will reverse its effect on your account balance.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeTransaction(existing.id);
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
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Edit Transaction</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={colors.expense} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            paddingBottom: spacing.md,
            marginBottom: spacing.xl,
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, marginRight: spacing.sm }}>{currencySymbol}</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={{ flex: 1, fontSize: 32, fontWeight: '700', color: colors.text }}
          />
        </View>

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: spacing.md,
            fontSize: 15,
            color: colors.text,
            marginBottom: spacing.lg,
          }}
        />

        {type !== 'transfer' && (
          <>
            <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
              {relevantCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: radius.full,
                    backgroundColor: categoryId === cat.id ? cat.color : colors.card,
                  }}
                >
                  <Ionicons name={cat.icon as any} size={14} color={categoryId === cat.id ? '#FFF' : cat.color} />
                  <Text style={{ color: categoryId === cat.id ? '#FFF' : colors.text, fontWeight: '500', fontSize: 12.5 }}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>
          {type === 'transfer' ? 'From Account' : 'Account'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              onPress={() => setAccountId(acc.id)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: radius.full,
                backgroundColor: accountId === acc.id ? colors.primary : colors.card,
                marginRight: spacing.sm,
              }}
            >
              <Text style={{ color: accountId === acc.id ? colors.white : colors.text, fontWeight: '600', fontSize: 13 }}>
                {acc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {type === 'transfer' && (
          <>
            <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>To Account</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
              {accounts
                .filter((a) => a.id !== accountId)
                .map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    onPress={() => setToAccountId(acc.id)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: radius.full,
                      backgroundColor: toAccountId === acc.id ? colors.primary : colors.card,
                      marginRight: spacing.sm,
                    }}
                  >
                    <Text style={{ color: toAccountId === acc.id ? colors.white : colors.text, fontWeight: '600', fontSize: 13 }}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </>
        )}

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Date</Text>
        <View style={{ marginBottom: spacing.lg }}>
          <DateField value={date} onChange={setDate} />
        </View>

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: spacing.md,
            fontSize: 14,
            color: colors.text,
            marginBottom: spacing.xl,
            minHeight: 60,
            textAlignVertical: 'top',
          }}
        />

        <Button label="Save Changes" onPress={handleSave} disabled={!canSave} loading={isSaving} />
      </ScrollView>
    </View>
  );
}

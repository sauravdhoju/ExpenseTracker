import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { spacing, radius } from '../../../src/constants/theme';
import { todayISO } from '../../../src/utils/date';
import { CURRENCIES } from '../../../src/constants/currencies';
import Button from '../../../src/components/ui/Button';
import DateField from '../../../src/components/ui/DateField';
import type { RecurringFrequency, TransactionType } from '../../../src/types';

const FREQUENCIES: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

export default function NewTransactionScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; categoryId?: string }>();
  const initialType = (params.type as TransactionType) ?? 'expense';

  const accounts = useAppStore((s) => s.accounts);
  const categories = useAppStore((s) => s.categories);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const addRecurring = useAppStore((s) => s.addRecurring);
  const currency = useAppStore((s) => s.settings.currency);
  const currencySymbol = CURRENCIES[currency].symbol;

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId ?? null);
  const [accountId, setAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  const [toAccountId, setToAccountId] = useState<string | null>(accounts[1]?.id ?? accounts[0]?.id ?? null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayISO());
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [isSaving, setIsSaving] = useState(false);

  const relevantCategories = categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense'));

  const canSave =
    parseFloat(amount) > 0 &&
    accountId &&
    (type === 'transfer' ? toAccountId && toAccountId !== accountId : categoryId && title.trim().length > 0);

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }
    if (!accountId) {
      Alert.alert('Missing account', 'Select an account.');
      return;
    }

    setIsSaving(true);
    try {
      if (type === 'transfer') {
        if (!toAccountId || toAccountId === accountId) {
          Alert.alert('Invalid transfer', 'Choose two different accounts.');
          setIsSaving(false);
          return;
        }
        await addTransaction({
          type: 'transfer',
          amount: parsedAmount,
          accountId,
          toAccountId,
          title: title.trim() || 'Transfer',
          notes: notes.trim() || null,
          date,
        });
      } else {
        if (!categoryId) {
          Alert.alert('Missing category', 'Select a category.');
          setIsSaving(false);
          return;
        }
        if (!title.trim()) {
          Alert.alert('Missing title', 'Enter a title.');
          setIsSaving(false);
          return;
        }

        if (isRecurring) {
          await addRecurring({
            type,
            title: title.trim(),
            amount: parsedAmount,
            accountId,
            categoryId,
            frequency,
            startDate: date,
          });
        } else {
          await addTransaction({
            type,
            amount: parsedAmount,
            accountId,
            categoryId,
            title: title.trim(),
            notes: notes.trim() || null,
            date,
          });
        }
      }
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
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
          Add {type === 'transfer' ? 'Transfer' : type === 'income' ? 'Income' : 'Expense'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={!canSave || isSaving}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary, opacity: canSave && !isSaving ? 1 : 0.4 }}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {/* Type selector */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
          {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setType(t)}
              style={{
                flex: 1,
                paddingVertical: spacing.sm + 2,
                borderRadius: radius.full,
                alignItems: 'center',
                backgroundColor: type === t ? colors.primary : colors.card,
              }}
            >
              <Text style={{ color: type === t ? colors.white : colors.text, fontWeight: '600', fontSize: 13, textTransform: 'capitalize' }}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
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
            placeholder="0.00"
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
            style={{ flex: 1, fontSize: 32, fontWeight: '700', color: colors.text }}
            autoFocus
          />
        </View>

        {/* Title */}
        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>
          {type === 'transfer' ? 'Note' : 'Title / Merchant'}
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={type === 'transfer' ? 'e.g. Move to savings' : 'e.g. Lunch at cafe'}
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

        {/* Accounts */}
        {type === 'transfer' ? (
          <>
            <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>From Account</Text>
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
        ) : (
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

            <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Account</Text>
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
          </>
        )}

        {/* Date */}
        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Date</Text>
        <View style={{ marginBottom: spacing.lg }}>
          <DateField value={date} onChange={setDate} />
        </View>

        {/* Notes (expense/income only, transfer uses title as note) */}
        {type !== 'transfer' && (
          <>
            <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes"
              placeholderTextColor={colors.textLight}
              multiline
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: 14,
                color: colors.text,
                marginBottom: spacing.lg,
                minHeight: 60,
                textAlignVertical: 'top',
              }}
            />

            {/* Recurring */}
            <TouchableOpacity
              onPress={() => setIsRecurring((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.card,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: isRecurring ? spacing.md : spacing.lg,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="repeat" size={18} color={colors.primary} />
                <Text style={{ fontSize: 14, color: colors.text }}>Make this recurring</Text>
              </View>
              <Ionicons
                name={isRecurring ? 'checkbox' : 'square-outline'}
                size={20}
                color={isRecurring ? colors.primary : colors.textLight}
              />
            </TouchableOpacity>

            {isRecurring && (
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
                {FREQUENCIES.map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFrequency(f)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: radius.full,
                      backgroundColor: frequency === f ? colors.primary : colors.card,
                    }}
                  >
                    <Text style={{ color: frequency === f ? colors.white : colors.text, fontWeight: '600', fontSize: 12.5, textTransform: 'capitalize' }}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        <Button label="Save" onPress={handleSave} disabled={!canSave} loading={isSaving} />
      </ScrollView>
    </View>
  );
}

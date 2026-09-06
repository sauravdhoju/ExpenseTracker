import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
const TRANSACTION_TYPES: TransactionType[] = ['expense', 'income', 'transfer'];

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
  const [notesOpen, setNotesOpen] = useState(false);

  const relevantCategories = useMemo(
    () => categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense')),
    [categories, type]
  );

  const accentColor =
    type === 'income' ? colors.income : type === 'expense' ? colors.expense : colors.primary;

  const canSave =
    parseFloat(amount) > 0 &&
    !!accountId &&
    (type === 'transfer'
      ? !!toAccountId && toAccountId !== accountId
      : !!categoryId && title.trim().length > 0);

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
          return;
        }
        if (!title.trim()) {
          Alert.alert('Missing title', 'Enter a title.');
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

  const selectedCategory = relevantCategories.find((c) => c.id === categoryId);

  const sectionLabelStyle = {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.textLight,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  };

  const chip = (
    key: string,
    active: boolean,
    onPress: () => void,
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    activeColor: string = colors.primary
  ) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: radius.full,
        backgroundColor: active ? activeColor : colors.background,
        borderWidth: active ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons name={icon} size={13} color={active ? '#FFF' : activeColor} />
      <Text
        numberOfLines={1}
        style={{ fontSize: 12.5, fontWeight: '600', color: active ? '#FFF' : colors.text }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>

        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>New Transaction</Text>

        <TouchableOpacity onPress={handleSave} disabled={!canSave || isSaving} hitSlop={10}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.primary,
              opacity: canSave && !isSaving ? 1 : 0.35,
            }}
          >
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}
      >
        {/* Type selector */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            padding: 4,
            marginBottom: spacing.md,
          }}
        >
          {TRANSACTION_TYPES.map((item) => {
            const active = type === item;
            const itemColor =
              item === 'income' ? colors.income : item === 'expense' ? colors.expense : colors.primary;

            return (
              <TouchableOpacity
                key={item}
                onPress={() => {
                  setType(item);
                  if (item === 'transfer') setCategoryId(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  backgroundColor: active ? itemColor : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    textTransform: 'capitalize',
                    color: active ? colors.white : colors.textLight,
                  }}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Amount + Title card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.xl,
            paddingVertical: spacing.lg,
            paddingHorizontal: spacing.lg,
            marginBottom: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 26, fontWeight: '700', color: accentColor, marginRight: 4 }}>
              {currencySymbol}
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textLight}
              keyboardType="decimal-pad"
              autoFocus
              style={{
                minWidth: 120,
                fontSize: 38,
                fontWeight: '800',
                color: colors.text,
                textAlign: 'center',
                padding: 0,
              }}
            />
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginVertical: spacing.md,
            }}
          />

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={type === 'transfer' ? 'Transfer note (optional)' : 'What was this for?'}
            placeholderTextColor={colors.textLight}
            style={{ fontSize: 15, fontWeight: '500', color: colors.text, padding: 0 }}
          />
        </View>

        {/* Details card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.xl,
            paddingHorizontal: spacing.lg,
            marginBottom: spacing.md,
          }}
        >
          {type !== 'transfer' && (
            <View
              style={{
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: spacing.sm,
                }}
              >
                <Text style={sectionLabelStyle}>Category</Text>
                {selectedCategory && (
                  <Text style={{ fontSize: 11, color: colors.textLight }}>{selectedCategory.name}</Text>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {relevantCategories.map((cat) =>
                  chip(
                    cat.id,
                    categoryId === cat.id,
                    () => setCategoryId(cat.id),
                    cat.icon as keyof typeof Ionicons.glyphMap,
                    cat.name,
                    cat.color
                  )
                )}
              </ScrollView>
            </View>
          )}

          <View
            style={{
              paddingVertical: spacing.md,
              borderBottomWidth: type === 'transfer' ? 1 : 0,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={[sectionLabelStyle, { marginBottom: spacing.sm }]}>
              {type === 'transfer' ? 'From account' : 'Account'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {accounts.map((account) =>
                chip(
                  account.id,
                  account.id === accountId,
                  () => setAccountId(account.id),
                  'wallet-outline',
                  account.name
                )
              )}
            </ScrollView>
          </View>

          {type === 'transfer' && (
            <View
              style={{
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={[sectionLabelStyle, { marginBottom: spacing.sm }]}>To account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((account) =>
                    chip(
                      account.id,
                      account.id === toAccountId,
                      () => setToAccountId(account.id),
                      'arrow-down-outline',
                      account.name
                    )
                  )}
              </ScrollView>
            </View>
          )}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: spacing.md,
            }}
          >
            <Text style={sectionLabelStyle}>Date</Text>
            <DateField value={date} onChange={setDate} />
          </View>
        </View>

        {/* Notes + Recurring (collapsed by default to avoid empty space) */}
        {type !== 'transfer' && (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.xl,
              paddingHorizontal: spacing.lg,
            }}
          >
            <TouchableOpacity
              onPress={() => setNotesOpen((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: spacing.md,
                borderBottomWidth: notesOpen ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={sectionLabelStyle}>Notes</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {!notesOpen && notes.trim().length > 0 && (
                  <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textLight, maxWidth: 140 }}>
                    {notes.trim()}
                  </Text>
                )}
                <Ionicons
                  name={notesOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textLight}
                />
              </View>
            </TouchableOpacity>

            {notesOpen && (
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add a note..."
                placeholderTextColor={colors.textLight}
                multiline
                textAlignVertical="top"
                style={{
                  minHeight: 60,
                  fontSize: 14,
                  color: colors.text,
                  paddingVertical: spacing.md,
                }}
              />
            )}

            <TouchableOpacity
              onPress={() => setIsRecurring((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="repeat" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.text }}>Repeat</Text>
              </View>
              <Ionicons
                name={isRecurring ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={isRecurring ? colors.primary : colors.textLight}
              />
            </TouchableOpacity>

            {isRecurring && (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                  paddingBottom: spacing.md,
                }}
              >
                {FREQUENCIES.map((f) =>
                  chip(f, frequency === f, () => setFrequency(f), 'time-outline', f)
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button
          label={isRecurring ? 'Create Recurring Transaction' : 'Save Transaction'}
          onPress={handleSave}
          disabled={!canSave}
          loading={isSaving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

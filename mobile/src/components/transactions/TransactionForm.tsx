import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store/useAppStore';
import { CURRENCIES, formatCurrency } from '../../constants/currencies';
import { addDays, todayISO } from '../../utils/date';
import { radius, spacing } from '../../constants/theme';
import DateField from '../ui/DateField';
import Segmented from '../ui/Segmented';
import { SectionTitle, Sheet } from '../ui/Sheet';
import CategoryPicker from './CategoryPicker';
import type { RecurringFrequency, TransactionType } from '../../types';

export interface TransactionFormValues {
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  title: string;
  notes: string | null;
  date: string;
  repeat: RecurringFrequency | null;
}

interface Props {
  mode: 'new' | 'edit';
  initial: {
    type: TransactionType;
    amount?: number;
    accountId?: string | null;
    toAccountId?: string | null;
    categoryId?: string | null;
    title?: string;
    notes?: string | null;
    date?: string;
  };
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  onDelete?: () => void;
}

// Only these three are created here; lent/repayment/forgotten have their own flows
// so their linked records stay in sync. They can still be edited through this form.
const CREATABLE: { value: 'expense' | 'income' | 'transfer'; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

const TYPE_NOUN: Record<TransactionType, string> = {
  expense: 'expense',
  income: 'income',
  transfer: 'transfer',
  lent: 'loan',
  repayment: 'repayment',
  forgotten: 'entry',
};

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

/** Keeps only digits and one decimal point, with at most two decimals. */
function sanitizeAmount(text: string): string {
  const cleaned = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, 2)}`;
}

function FieldLabel({ children }: { children: string }) {
  const colors = useThemeColors();
  return (
    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textLight, width: 64 }}>{children}</Text>
  );
}

function AccountPills({
  value,
  onChange,
  exclude,
}: {
  value: string | null;
  onChange: (id: string) => void;
  exclude?: string | null;
}) {
  const colors = useThemeColors();
  const accounts = useAppStore((s) => s.accounts);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {accounts
        .filter((a) => (a.isActive || a.id === value) && a.id !== exclude)
        .map((a) => {
          const active = a.id === value;
          return (
            <TouchableOpacity
              key={a.id}
              onPress={() => onChange(a.id)}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 13,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primary : colors.card,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: active ? colors.white : colors.text }}>{a.name}</Text>
            </TouchableOpacity>
          );
        })}
    </ScrollView>
  );
}

export default function TransactionForm({ mode, initial, onSubmit, onDelete }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const accounts = useAppStore((s) => s.accounts);
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const currency = useAppStore((s) => s.settings.currency);

  const activeAccounts = accounts.filter((a) => a.isActive);
  const [type, setType] = useState<TransactionType>(initial.type);
  const [amount, setAmount] = useState(initial.amount ? String(initial.amount) : '');
  const [categoryId, setCategoryId] = useState<string | null>(initial.categoryId ?? null);
  const [accountId, setAccountId] = useState<string | null>(initial.accountId ?? activeAccounts[0]?.id ?? null);
  const [toAccountId, setToAccountId] = useState<string | null>(
    initial.toAccountId ?? activeAccounts.find((a) => a.id !== (initial.accountId ?? activeAccounts[0]?.id))?.id ?? null
  );
  const [title, setTitle] = useState(initial.title ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [date, setDate] = useState(initial.date ?? todayISO());
  const [repeat, setRepeat] = useState<RecurringFrequency | null>(null);
  const [titleFocused, setTitleFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isTransfer = type === 'transfer';
  const hasCategory = type === 'expense' || type === 'income';
  const parsedAmount = parseFloat(amount);
  const accent = type === 'income' || type === 'repayment' ? colors.income : type === 'transfer' ? colors.primary : colors.expense;

  const today = todayISO();
  const yesterday = addDays(today, -1);

  // Past entries of this type whose title matches what's being typed (or, with nothing typed,
  // the most recent ones in the chosen category). Tapping one fills in title, category and amount.
  const suggestions = useMemo(() => {
    if (!hasCategory || !titleFocused) return [];
    const q = title.trim().toLowerCase();
    const seen = new Set<string>();
    const out: { title: string; categoryId: string | null; amount: number }[] = [];
    for (const t of transactions) {
      if (t.type !== type || !t.title) continue;
      const key = t.title.trim().toLowerCase();
      if (seen.has(key) || key === q) continue;
      if (q ? !key.includes(q) : categoryId ? t.categoryId !== categoryId : false) continue;
      seen.add(key);
      out.push({ title: t.title.trim(), categoryId: t.categoryId, amount: t.amount });
      if (out.length === 5) break;
    }
    return out;
  }, [transactions, type, title, categoryId, hasCategory, titleFocused]);

  const missing: string | null =
    !(parsedAmount > 0)
      ? 'Enter an amount'
      : !accountId
        ? 'Choose an account'
        : isTransfer && (!toAccountId || toAccountId === accountId)
          ? 'Choose where the money goes'
          : hasCategory && !categoryId
            ? 'Choose a category'
            : null;

  const changeType = (next: TransactionType) => {
    setType(next);
    setCategoryId(null);
    setRepeat(null);
  };

  const swapAccounts = () => {
    setAccountId(toAccountId);
    setToAccountId(accountId);
  };

  const handleSave = async () => {
    if (missing || !accountId) {
      Alert.alert('Almost there', missing ?? 'Choose an account');
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit({
        type,
        amount: parsedAmount,
        accountId,
        toAccountId: isTransfer ? toAccountId : null,
        categoryId: hasCategory ? categoryId : null,
        // A title is optional: fall back to something readable rather than blocking the save.
        title: title.trim() || (isTransfer ? 'Transfer' : (categories.find((c) => c.id === categoryId)?.name ?? TYPE_NOUN[type])),
        notes: notes.trim() || null,
        date,
        repeat,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const heading = mode === 'new' ? 'New transaction' : `Edit ${TYPE_NOUN[type]}`;
  const saveLabel =
    parsedAmount > 0
      ? `${mode === 'new' ? 'Save' : 'Update'} ${TYPE_NOUN[type]} · ${formatCurrency(parsedAmount, currency)}`
      : `${mode === 'new' ? 'Save' : 'Update'} ${TYPE_NOUN[type]}`;

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
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: spacing.md,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityLabel="Close"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={19} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{heading}</Text>
        {onDelete ? (
          <TouchableOpacity onPress={onDelete} hitSlop={10} accessibilityLabel="Delete">
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.expense }}>Delete</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }}
      >
        {mode === 'new' && <Segmented options={CREATABLE} value={type as 'expense' | 'income' | 'transfer'} onChange={changeType} />}

        {/* Amount */}
        <View style={{ alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textLight, marginRight: 6 }}>
              {CURRENCIES[currency].symbol}
            </Text>
            <TextInput
              value={amount}
              onChangeText={(t) => setAmount(sanitizeAmount(t))}
              placeholder="0"
              placeholderTextColor={colors.border}
              keyboardType="decimal-pad"
              autoFocus={mode === 'new'}
              style={{
                minWidth: 80,
                fontSize: 44,
                fontWeight: '800',
                letterSpacing: -1,
                color: parsedAmount > 0 ? colors.text : colors.textLight,
                padding: 0,
                fontVariant: ['tabular-nums'],
              }}
            />
          </View>
          <View style={{ width: 40, height: 3, borderRadius: 2, backgroundColor: accent, marginTop: spacing.sm }} />
        </View>

        {/* Title */}
        <Sheet>
          <TextInput
            value={title}
            onChangeText={setTitle}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            placeholder={isTransfer ? 'Note (optional)' : type === 'income' ? 'Where is it from?' : 'What was it for?'}
            placeholderTextColor={colors.textLight}
            returnKeyType="done"
            style={{ fontSize: 15.5, fontWeight: '600', color: colors.text, paddingVertical: 14 }}
          />
        </Sheet>
        {suggestions.length > 0 && (
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="always"
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: spacing.sm }}
            contentContainerStyle={{ gap: spacing.sm }}
          >
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s.title}
                onPress={() => {
                  setTitle(s.title);
                  if (s.categoryId) setCategoryId(s.categoryId);
                  if (!(parsedAmount > 0)) setAmount(String(s.amount));
                }}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: radius.full,
                  backgroundColor: colors.primary + '14',
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.primaryDeep }}>
                  {s.title} · {s.amount}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Category */}
        {hasCategory && (
          <>
            <SectionTitle title="Category" />
            <CategoryPicker
              kind={type === 'income' ? 'income' : 'expense'}
              value={categoryId}
              onChange={setCategoryId}
              onManage={() => router.push('/categories')}
            />
          </>
        )}

        {/* Accounts */}
        <SectionTitle title={isTransfer ? 'Move money' : 'Paid with'} />
        <Sheet>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
            <FieldLabel>{isTransfer ? 'From' : type === 'income' ? 'Into' : 'Account'}</FieldLabel>
            <View style={{ flex: 1 }}>
              <AccountPills value={accountId} onChange={setAccountId} />
            </View>
          </View>
          {isTransfer && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                <TouchableOpacity
                  onPress={swapAccounts}
                  accessibilityLabel="Swap accounts"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginHorizontal: spacing.sm,
                  }}
                >
                  <Ionicons name="swap-vertical" size={15} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
                <FieldLabel>To</FieldLabel>
                <View style={{ flex: 1 }}>
                  <AccountPills value={toAccountId} onChange={setToAccountId} exclude={accountId} />
                </View>
              </View>
            </>
          )}
        </Sheet>

        {/* Details */}
        <SectionTitle title="Details" />
        <Sheet>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              {[
                { iso: today, label: 'Today' },
                { iso: yesterday, label: 'Yesterday' },
              ].map((d) => {
                const active = date === d.iso;
                return (
                  <TouchableOpacity
                    key={d.label}
                    onPress={() => setDate(d.iso)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 11,
                      borderRadius: radius.full,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary : colors.card,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: active ? colors.white : colors.text }}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <View style={{ flex: 1 }}>
                <DateField value={date} onChange={setDate} />
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 }}>
            <View style={{ paddingTop: 12 }}>
              <FieldLabel>Note</FieldLabel>
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional"
              placeholderTextColor={colors.textLight}
              multiline
              style={{ flex: 1, fontSize: 14.5, color: colors.text, paddingVertical: 10, minHeight: 40, textAlignVertical: 'top' }}
            />
          </View>

          {mode === 'new' && hasCategory && (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.text }}>Repeat</Text>
                  <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 1 }}>
                    {repeat ? `Adds this ${TYPE_NOUN[type]} automatically` : 'Off'}
                  </Text>
                </View>
                <Switch
                  value={repeat !== null}
                  onValueChange={(on) => setRepeat(on ? 'monthly' : null)}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.white}
                />
              </View>
              {repeat && (
                <View style={{ paddingBottom: spacing.md }}>
                  <Segmented options={FREQUENCIES} value={repeat} onChange={setRepeat} />
                </View>
              )}
            </>
          )}
        </Sheet>
      </ScrollView>

      {/* Save */}
      <View
        style={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xs,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        {missing && parsedAmount > 0 && (
          <Text style={{ fontSize: 12, color: colors.textLight, textAlign: 'center', marginBottom: spacing.sm }}>{missing}</Text>
        )}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          accessibilityRole="button"
          style={{
            backgroundColor: missing ? colors.border : colors.primary,
            borderRadius: radius.md,
            paddingVertical: 15,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: missing ? colors.textLight : colors.white, fontWeight: '700', fontSize: 15 }}>
            {isSaving ? 'Saving…' : saveLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

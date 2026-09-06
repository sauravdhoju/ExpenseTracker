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
import type { RecurringFrequency } from '../../../src/types';

const FREQUENCIES: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

export default function NewRecurringScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const accounts = useAppStore((s) => s.accounts);
  const categories = useAppStore((s) => s.categories);
  const addRecurring = useAppStore((s) => s.addRecurring);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(todayISO());
  const [isSaving, setIsSaving] = useState(false);

  const relevantCategories = categories.filter((c) => c.kind === type);

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (!title.trim() || Number.isNaN(parsed) || parsed <= 0 || !categoryId || !accountId) {
      Alert.alert('Missing info', 'Fill in title, amount, category and account.');
      return;
    }
    setIsSaving(true);
    try {
      await addRecurring({
        type,
        title: title.trim(),
        amount: parsed,
        accountId,
        categoryId,
        frequency,
        startDate,
      });
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>New Recurring</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          {(['expense', 'income'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => {
                setType(t);
                setCategoryId(null);
              }}
              style={{ flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.full, alignItems: 'center', backgroundColor: type === t ? colors.primary : colors.card }}
            >
              <Text style={{ color: type === t ? colors.white : colors.text, fontWeight: '600', fontSize: 13, textTransform: 'capitalize' }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Netflix, Salary, Rent"
          placeholderTextColor={colors.textLight}
          style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text, marginBottom: spacing.lg }}
        />

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Amount</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textLight}
          style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text, marginBottom: spacing.lg }}
        />

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
          {relevantCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setCategoryId(cat.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: categoryId === cat.id ? cat.color : colors.card }}
            >
              <Ionicons name={cat.icon as any} size={14} color={categoryId === cat.id ? '#FFF' : cat.color} />
              <Text style={{ color: categoryId === cat.id ? '#FFF' : colors.text, fontWeight: '500', fontSize: 12.5 }}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Account</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              onPress={() => setAccountId(acc.id)}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: accountId === acc.id ? colors.primary : colors.card, marginRight: spacing.sm }}
            >
              <Text style={{ color: accountId === acc.id ? colors.white : colors.text, fontWeight: '600', fontSize: 13 }}>{acc.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Frequency</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
          {FREQUENCIES.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFrequency(f)}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: frequency === f ? colors.primary : colors.card }}
            >
              <Text style={{ color: frequency === f ? colors.white : colors.text, fontWeight: '600', fontSize: 12.5, textTransform: 'capitalize' }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Start Date</Text>
        <View style={{ marginBottom: spacing.xl }}>
          <DateField value={startDate} onChange={setStartDate} />
        </View>

        <Button label="Create Recurring Transaction" onPress={handleSave} loading={isSaving} />
      </ScrollView>
    </View>
  );
}

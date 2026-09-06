import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { CURRENCIES } from '../constants/currencies';
import { spacing, radius } from '../constants/theme';
import Button from './ui/Button';
import type { TransactionType } from '../types';

const SHORTCUT_TYPES: Extract<TransactionType, 'expense' | 'income'>[] = ['expense', 'income'];

export default function ShortcutFormScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const shortcuts = useAppStore((s) => s.shortcuts);
  const categories = useAppStore((s) => s.categories);
  const accounts = useAppStore((s) => s.accounts);
  const addShortcut = useAppStore((s) => s.addShortcut);
  const editShortcut = useAppStore((s) => s.editShortcut);
  const removeShortcut = useAppStore((s) => s.removeShortcut);
  const currency = useAppStore((s) => s.settings.currency);
  const currencySymbol = CURRENCIES[currency].symbol;

  const existing = params.id ? shortcuts.find((s) => s.id === params.id) : undefined;
  const isEditing = !!existing;

  const [type, setType] = useState<'expense' | 'income'>(existing?.type ?? 'expense');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [label, setLabel] = useState(existing?.label ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [accountId, setAccountId] = useState<string | null>(existing?.accountId ?? accounts[0]?.id ?? null);
  const [isSaving, setIsSaving] = useState(false);

  const relevantCategories = useMemo(
    () => categories.filter((c) => c.kind === type),
    [categories, type]
  );

  const selectedCategory = relevantCategories.find((c) => c.id === categoryId);

  const canSave = parseFloat(amount) > 0 && !!accountId && !!categoryId;

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }
    if (!categoryId) {
      Alert.alert('Missing category', 'Select a category.');
      return;
    }
    if (!accountId) {
      Alert.alert('Missing account', 'Select an account.');
      return;
    }

    const resolvedCategory = categories.find((c) => c.id === categoryId);
    const input = {
      label: label.trim() || resolvedCategory?.name || 'Shortcut',
      type,
      amount: parsedAmount,
      categoryId,
      accountId,
    };

    setIsSaving(true);
    try {
      if (isEditing && existing) {
        await editShortcut(existing.id, input);
      } else {
        await addShortcut(input);
      }
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert('Delete shortcut', 'Remove this shortcut?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeShortcut(existing.id);
          router.back();
        },
      },
    ]);
  };

  const sectionLabelStyle = {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: spacing.sm,
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
          {isEditing ? 'Edit Shortcut' : 'New Shortcut'}
        </Text>
        {isEditing ? (
          <TouchableOpacity onPress={handleDelete} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color={colors.expense} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={sectionLabelStyle}>Type</Text>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            padding: 4,
            marginBottom: spacing.lg,
          }}
        >
          {SHORTCUT_TYPES.map((item) => {
            const active = type === item;
            const itemColor = item === 'income' ? colors.income : colors.expense;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => {
                  setType(item);
                  setCategoryId(null);
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

        <Text style={sectionLabelStyle}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
          style={{ marginBottom: spacing.lg }}
        >
          {relevantCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setCategoryId(cat.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: radius.full,
                backgroundColor: categoryId === cat.id ? cat.color : colors.card,
              }}
            >
              <Ionicons
                name={cat.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={categoryId === cat.id ? colors.white : cat.color}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: categoryId === cat.id ? colors.white : colors.text,
                }}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={sectionLabelStyle}>Label (optional)</Text>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder={selectedCategory?.name ?? 'e.g. Morning Coffee'}
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

        <Text style={sectionLabelStyle}>Amount</Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginRight: 4 }}>
            {currencySymbol}
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textLight}
            style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: spacing.md }}
          />
        </View>

        <Text style={sectionLabelStyle}>Account</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
          style={{ marginBottom: spacing.xl }}
        >
          {accounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              onPress={() => setAccountId(account.id)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: radius.full,
                backgroundColor: account.id === accountId ? colors.primary : colors.card,
              }}
            >
              <Text
                style={{
                  color: account.id === accountId ? colors.white : colors.text,
                  fontWeight: '600',
                  fontSize: 13,
                }}
              >
                {account.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Button
          label={isEditing ? 'Save Changes' : 'Create Shortcut'}
          onPress={handleSave}
          disabled={!canSave}
          loading={isSaving}
        />
      </ScrollView>
    </View>
  );
}

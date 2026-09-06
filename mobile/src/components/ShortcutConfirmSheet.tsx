import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../hooks/useThemeColors';
import { useCurrency } from '../hooks/useCurrency';
import { useAppStore } from '../store/useAppStore';
import { CURRENCIES } from '../constants/currencies';
import { todayISO } from '../utils/date';
import { spacing, radius } from '../constants/theme';
import { showToast } from './ui/Toast';
import IconCircle from './ui/IconCircle';
import Button from './ui/Button';
import type { Shortcut } from '../types';

interface ShortcutConfirmSheetProps {
  shortcut: Shortcut | null;
  onClose: () => void;
}

export default function ShortcutConfirmSheet({ shortcut, onClose }: ShortcutConfirmSheetProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { format } = useCurrency();
  const accounts = useAppStore((s) => s.accounts);
  const categories = useAppStore((s) => s.categories);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const currency = useAppStore((s) => s.settings.currency);
  const currencySymbol = CURRENCIES[currency].symbol;

  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (shortcut) {
      setAmount(String(shortcut.amount));
      setAccountId(shortcut.accountId);
    }
  }, [shortcut]);

  if (!shortcut) return null;

  const category = categories.find((c) => c.id === shortcut.categoryId);
  const accentColor = shortcut.type === 'income' ? colors.income : colors.expense;

  const handleConfirm = async () => {
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
      await addTransaction({
        type: shortcut.type,
        amount: parsedAmount,
        accountId,
        categoryId: shortcut.categoryId,
        title: shortcut.label,
        date: todayISO(),
      });
      onClose();
      showToast(`Recorded ${format(parsedAmount)} · ${shortcut.label}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + spacing.lg,
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: 'center',
              marginBottom: spacing.lg,
            }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
            {category ? (
              <IconCircle name={category.icon as any} color={category.color} size={44} iconSize={20} />
            ) : (
              <IconCircle name="pricetag-outline" color={accentColor} size={44} iconSize={20} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{shortcut.label}</Text>
              <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 1 }}>
                {category?.name ?? (shortcut.type === 'income' ? 'Income' : 'Expense')}
              </Text>
            </View>
          </View>

          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: colors.textLight,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              marginBottom: spacing.sm,
            }}
          >
            Amount
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.background,
              borderRadius: radius.lg,
              paddingHorizontal: spacing.md,
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: accentColor, marginRight: 4 }}>
              {currencySymbol}
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textLight}
              style={{
                flex: 1,
                fontSize: 22,
                fontWeight: '700',
                color: colors.text,
                paddingVertical: spacing.md,
              }}
            />
          </View>

          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: colors.textLight,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              marginBottom: spacing.sm,
            }}
          >
            Account
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm }}
            style={{ marginBottom: spacing.xl }}
          >
            {accounts.map((account) => {
              const active = account.id === accountId;
              return (
                <TouchableOpacity
                  key={account.id}
                  onPress={() => setAccountId(account.id)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: radius.full,
                    backgroundColor: active ? colors.primary : colors.background,
                  }}
                >
                  <Text style={{ color: active ? colors.white : colors.text, fontWeight: '600', fontSize: 13 }}>
                    {account.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={onClose} />
            <Button label="Confirm" style={{ flex: 1 }} onPress={handleConfirm} loading={isSaving} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

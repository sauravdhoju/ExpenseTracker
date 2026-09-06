import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { spacing, radius } from '../../../src/constants/theme';
import Button from '../../../src/components/ui/Button';
import type { AccountType } from '../../../src/types';

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { type: 'cash', label: 'Cash', icon: 'cash-outline', color: '#66BB6A' },
  { type: 'bank', label: 'Bank Account', icon: 'business-outline', color: '#42A5F5' },
  { type: 'savings', label: 'Savings', icon: 'wallet-outline', color: '#26A69A' },
  { type: 'wallet', label: 'Digital Wallet', icon: 'phone-portrait-outline', color: '#AB47BC' },
  { type: 'credit_card', label: 'Credit Card', icon: 'card-outline', color: '#EF5350' },
  { type: 'investment', label: 'Investment', icon: 'trending-up-outline', color: '#FFA726' },
  { type: 'other', label: 'Other', icon: 'ellipse-outline', color: '#78909C' },
];

export default function NewAccountScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const addAccount = useAppStore((s) => s.addAccount);
  const currency = useAppStore((s) => s.settings.currency);

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [initialBalance, setInitialBalance] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter an account name.');
      return;
    }
    const parsed = initialBalance.trim() === '' ? 0 : parseFloat(initialBalance);
    if (Number.isNaN(parsed)) {
      Alert.alert('Invalid balance', 'Enter a valid opening balance.');
      return;
    }
    const meta = ACCOUNT_TYPES.find((t) => t.type === type)!;
    setIsSaving(true);
    try {
      await addAccount({
        name: name.trim(),
        type,
        initialBalance: parsed,
        currency,
        color: meta.color,
        icon: meta.icon,
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
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>New Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Account Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Main Wallet"
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

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Account Type</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
          {ACCOUNT_TYPES.map((t) => (
            <TouchableOpacity
              key={t.type}
              onPress={() => setType(t.type)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: radius.full,
                backgroundColor: type === t.type ? t.color : colors.card,
              }}
            >
              <Ionicons name={t.icon} size={14} color={type === t.type ? '#FFF' : t.color} />
              <Text style={{ color: type === t.type ? '#FFF' : colors.text, fontWeight: '500', fontSize: 12.5 }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Opening Balance</Text>
        <TextInput
          value={initialBalance}
          onChangeText={setInitialBalance}
          placeholder="0.00"
          keyboardType="decimal-pad"
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

        <Button label="Create Account" onPress={handleSave} loading={isSaving} />
      </ScrollView>
    </View>
  );
}

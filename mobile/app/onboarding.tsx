import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useAppStore } from '../src/store/useAppStore';
import { CURRENCIES } from '../src/constants/currencies';
import { spacing, radius } from '../src/constants/theme';
import Button from '../src/components/ui/Button';
import type { CurrencyCode } from '../src/types';

const STEPS = ['welcome', 'currency', 'account', 'done'] as const;

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const updateSettings = useAppStore((s) => s.updateSettings);
  const addAccount = useAppStore((s) => s.addAccount);

  const [stepIndex, setStepIndex] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>('NPR');
  const [accountName, setAccountName] = useState('Cash');
  const [openingBalance, setOpeningBalance] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  const step = STEPS[stepIndex];
  const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));

  const finish = async (skipAccount = false) => {
    setIsFinishing(true);
    try {
      await updateSettings({ currency });
      if (!skipAccount || accountName.trim()) {
        const parsed = parseFloat(openingBalance);
        await addAccount({
          name: accountName.trim() || 'Cash',
          type: 'cash',
          initialBalance: Number.isNaN(parsed) ? 0 : parsed,
          currency,
          color: '#66BB6A',
          icon: 'cash-outline',
        });
      }
      await updateSettings({ onboardingComplete: true });
      router.replace('/(root)/(tabs)');
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: 'center' }}>
      {step === 'welcome' && (
        <View style={{ alignItems: 'center' }}>
          <Ionicons name="wallet" size={64} color={colors.primary} style={{ marginBottom: spacing.lg }} />
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, textAlign: 'center' }}>
            Welcome to Expense Tracker
          </Text>
          <Text style={{ fontSize: 14, color: colors.textLight, textAlign: 'center', marginBottom: spacing.xxl, lineHeight: 20 }}>
            A fast, simple, fully offline way to track your money. No account, no internet required.
          </Text>
          <Button label="Get Started" onPress={next} style={{ width: '100%' }} />
        </View>
      )}

      {step === 'currency' && (
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
            Choose your currency
          </Text>
          <Text style={{ fontSize: 14, color: colors.textLight, marginBottom: spacing.xl }}>
            You can change this later in Settings.
          </Text>
          <ScrollView style={{ maxHeight: 280, marginBottom: spacing.xl }}>
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
              <TouchableOpacity
                key={code}
                onPress={() => setCurrency(code)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: currency === code ? colors.primary : colors.card,
                  marginBottom: spacing.sm,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: currency === code ? colors.white : colors.text, width: 60 }}>
                  {CURRENCIES[code].symbol}
                </Text>
                <Text style={{ fontSize: 15, color: currency === code ? colors.white : colors.text }}>
                  {code} · {CURRENCIES[code].name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Button label="Continue" onPress={next} />
        </View>
      )}

      {step === 'account' && (
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
            Create your first account
          </Text>
          <Text style={{ fontSize: 14, color: colors.textLight, marginBottom: spacing.xl }}>
            E.g. Cash, Bank Account. You can add more later.
          </Text>
          <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Account name</Text>
          <TextInput
            value={accountName}
            onChangeText={setAccountName}
            placeholder="Cash"
            placeholderTextColor={colors.textLight}
            style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text, marginBottom: spacing.lg }}
          />
          <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Opening balance</Text>
          <TextInput
            value={openingBalance}
            onChangeText={setOpeningBalance}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textLight}
            style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text, marginBottom: spacing.xxl }}
          />
          <Button label="Continue" onPress={next} loading={isFinishing} />
        </View>
      )}

      {step === 'done' && (
        <View style={{ alignItems: 'center' }}>
          <Ionicons name="checkmark-circle" size={64} color={colors.income} style={{ marginBottom: spacing.lg }} />
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, textAlign: 'center' }}>
            You&apos;re all set!
          </Text>
          <Text style={{ fontSize: 14, color: colors.textLight, textAlign: 'center', marginBottom: spacing.xxl }}>
            Start tracking your expenses right away.
          </Text>
          <Button label="Open Dashboard" onPress={() => finish(false)} loading={isFinishing} style={{ width: '100%' }} />
        </View>
      )}
    </View>
  );
}

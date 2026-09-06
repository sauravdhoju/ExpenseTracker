import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { CURRENCIES } from '../../../src/constants/currencies';
import { spacing } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import type { CurrencyCode } from '../../../src/types';

export default function CurrencyScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const currency = useAppStore((s) => s.settings.currency);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Currency</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
        <Card style={{ padding: 0 }}>
          {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code, i, arr) => (
            <TouchableOpacity
              key={code}
              onPress={async () => {
                await updateSettings({ currency: code });
                router.back();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.lg,
                borderBottomWidth: i === arr.length - 1 ? 0 : 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, width: 60 }}>{CURRENCIES[code].symbol}</Text>
              <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>
                {code} · {CURRENCIES[code].name}
              </Text>
              {currency === code && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

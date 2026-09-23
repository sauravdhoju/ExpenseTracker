import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { spacing } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import type { DateSystem, ThemeMode } from '../../../src/types';

const OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
  { mode: 'system', label: 'System Default', icon: 'phone-portrait-outline' },
];

const DATE_SYSTEMS: { value: DateSystem; label: string; description: string }[] = [
  { value: 'AD', label: 'AD — Gregorian', description: 'e.g. 23 September 2026' },
  { value: 'BS', label: 'BS — Bikram Sambat', description: 'e.g. 7 Ashwin 2083' },
];

export default function AppearanceScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const themeMode = useAppStore((s) => s.settings.themeMode);
  const dateSystem = useAppStore((s) => s.settings.dateSystem);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Appearance</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={{ padding: spacing.lg, paddingTop: 0 }}>
        <Card style={{ padding: 0 }}>
          {OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.mode}
              onPress={() => updateSettings({ themeMode: opt.mode })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.lg,
                borderBottomWidth: i === OPTIONS.length - 1 ? 0 : 1,
                borderBottomColor: colors.border,
              }}
            >
              <Ionicons name={opt.icon} size={19} color={colors.text} style={{ width: 26 }} />
              <Text style={{ flex: 1, fontSize: 15, color: colors.text, marginLeft: spacing.sm }}>{opt.label}</Text>
              {themeMode === opt.mode && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </Card>

        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: colors.textLight,
            marginTop: spacing.xl,
            marginBottom: spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          Date System
        </Text>
        <Card style={{ padding: 0 }}>
          {DATE_SYSTEMS.map((opt, i) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => updateSettings({ dateSystem: opt.value })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.lg,
                borderBottomWidth: i === DATE_SYSTEMS.length - 1 ? 0 : 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: colors.text }}>{opt.label}</Text>
                <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>{opt.description}</Text>
              </View>
              {dateSystem === opt.value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </Card>
      </View>
    </View>
  );
}

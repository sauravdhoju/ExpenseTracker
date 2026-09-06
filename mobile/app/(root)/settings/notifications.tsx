import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { spacing } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const notificationsEnabled = useAppStore((s) => s.settings.notificationsEnabled);
  const hideBalances = useAppStore((s) => s.settings.hideBalances);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Notifications</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ padding: spacing.lg, paddingTop: 0 }}>
        <Card style={{ padding: 0 }}>
          <TouchableOpacity
            onPress={() => updateSettings({ notificationsEnabled: !notificationsEnabled })}
            style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}
          >
            <Ionicons name="notifications-outline" size={19} color={colors.text} style={{ width: 26 }} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={{ fontSize: 15, color: colors.text }}>Bill & budget reminders</Text>
              <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                Local notifications for upcoming bills and budget warnings
              </Text>
            </View>
            <Ionicons
              name={notificationsEnabled ? 'toggle' : 'toggle-outline'}
              size={30}
              color={notificationsEnabled ? colors.primary : colors.textLight}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => updateSettings({ hideBalances: !hideBalances })}
            style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg }}
          >
            <Ionicons name="eye-off-outline" size={19} color={colors.text} style={{ width: 26 }} />
            <Text style={{ flex: 1, fontSize: 15, color: colors.text, marginLeft: spacing.sm }}>Hide balances</Text>
            <Ionicons
              name={hideBalances ? 'toggle' : 'toggle-outline'}
              size={30}
              color={hideBalances ? colors.primary : colors.textLight}
            />
          </TouchableOpacity>
        </Card>
      </View>
    </View>
  );
}

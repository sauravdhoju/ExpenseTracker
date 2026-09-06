import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { spacing } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';

interface Row {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  future?: boolean;
}

function SectionRows({ rows }: { rows: Row[] }) {
  const colors = useThemeColors();
  return (
    <Card style={{ marginBottom: spacing.lg, padding: 0 }}>
      {rows.map((row, i) => (
        <TouchableOpacity
          key={row.label}
          onPress={row.onPress}
          disabled={!row.onPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.lg,
            borderBottomWidth: i === rows.length - 1 ? 0 : 1,
            borderBottomColor: colors.border,
            opacity: row.future ? 0.55 : 1,
          }}
        >
          <Ionicons name={row.icon} size={19} color={colors.text} style={{ width: 26 }} />
          <Text style={{ flex: 1, fontSize: 15, color: colors.text, marginLeft: spacing.sm }}>{row.label}</Text>
          {row.future ? (
            <Text style={{ fontSize: 11, color: colors.textLight, fontStyle: 'italic' }}>Coming soon</Text>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          )}
        </TouchableOpacity>
      ))}
    </Card>
  );
}

export default function MoreScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.lg }}>More</Text>

      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textLight, marginBottom: spacing.sm, textTransform: 'uppercase' }}>
        Manage
      </Text>
      <SectionRows
        rows={[
          { icon: 'wallet-outline', label: 'Accounts', onPress: () => router.push('/accounts') },
          { icon: 'pricetags-outline', label: 'Categories', onPress: () => router.push('/categories') },
          { icon: 'repeat-outline', label: 'Recurring Transactions', onPress: () => router.push('/recurring') },
          { icon: 'receipt-outline', label: 'Bills & Reminders', onPress: () => router.push('/bills') },
          { icon: 'flag-outline', label: 'Financial Goals', onPress: () => router.push('/goals') },
        ]}
      />

      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textLight, marginBottom: spacing.sm, textTransform: 'uppercase' }}>
        Preferences
      </Text>
      <SectionRows
        rows={[
          { icon: 'cash-outline', label: 'Currency', onPress: () => router.push('/settings/currency') },
          { icon: 'color-palette-outline', label: 'Appearance', onPress: () => router.push('/settings/appearance') },
          { icon: 'notifications-outline', label: 'Notifications', onPress: () => router.push('/settings/notifications') },
        ]}
      />

      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textLight, marginBottom: spacing.sm, textTransform: 'uppercase' }}>
        Data & Security
      </Text>
      <SectionRows
        rows={[
          { icon: 'download-outline', label: 'Export / Import Data', onPress: () => router.push('/settings/data') },
          { icon: 'lock-closed-outline', label: 'PIN & Biometric Lock', future: true },
          { icon: 'cloud-upload-outline', label: 'Cloud Backup & Sync', future: true },
        ]}
      />

      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textLight, marginBottom: spacing.sm, textTransform: 'uppercase' }}>
        About
      </Text>
      <SectionRows
        rows={[
          { icon: 'information-circle-outline', label: 'Expense Tracker · v1.0.0' },
        ]}
      />
    </ScrollView>
  );
}

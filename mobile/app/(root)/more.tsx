import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { brand, spacing } from '../../src/constants/theme';
import { SectionTitle, Sheet, SheetRow } from '../../src/components/ui/Sheet';
import PageHeader from '../../src/components/ui/PageHeader';
import { useAppStore } from '../../src/store/useAppStore';
import { APP_INFO } from '../../src/constants/appInfo';

interface Row {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  onPress?: () => void;
  future?: boolean;
  tint?: string;
}

function Section({
  title,
  tint,
  rows,
}: {
  title: string;
  tint: string;
  rows: Row[];
}) {
  const colors = useThemeColors();

  return (
    <View>
      <SectionTitle title={title} />
      <Sheet>
        {rows.map((row, i) => (
          <SheetRow key={row.label} last={i === rows.length - 1} onPress={row.future ? undefined : row.onPress}>
            <View style={{ width: 24, alignItems: 'center', marginRight: spacing.md, opacity: row.future ? 0.5 : 1 }}>
              <Ionicons name={row.icon} size={20} color={row.tint ?? tint} />
            </View>
            <View style={{ flex: 1, opacity: row.future ? 0.6 : 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{row.label}</Text>
              {row.description ? (
                <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 1 }}>{row.description}</Text>
              ) : null}
            </View>
            {row.future ? (
              <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, color: colors.textLight }}>SOON</Text>
            ) : row.onPress ? (
              <Ionicons name="chevron-forward" size={16} color={colors.border} />
            ) : null}
          </SheetRow>
        ))}
      </Sheet>
    </View>
  );
}

export default function MoreScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const automationEnabled = useAppStore((s) => s.settings.automationEnabled);
  const pendingCount = useAppStore((s) => s.pendingDetections.length);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader
        title="Settings"
        subtitle="Manage your account and preferences"
      />

      <Section
        title="Manage"
        tint={colors.primary}
        rows={[
          {
            icon: 'wallet-outline',
            label: 'Accounts',
            onPress: () => router.push('/accounts'),
          },
          {
            icon: 'pricetags-outline',
            label: 'Categories',
            onPress: () => router.push('/categories'),
          },
          {
            icon: 'repeat-outline',
            label: 'Recurring Transactions',
            onPress: () => router.push('/recurring'),
          },
          {
            icon: 'receipt-outline',
            label: 'Bills & Reminders',
            onPress: () => router.push('/bills'),
          },
          {
            icon: 'flag-outline',
            label: 'Financial Goals',
            onPress: () => router.push('/goals'),
          },
          {
            icon: 'people-outline',
            label: 'Lent Money',
            onPress: () => router.push('/loans'),
          },
          {
            icon: 'help-circle-outline',
            label: 'Forgotten Money',
            onPress: () => router.push('/forgotten'),
          },
          {
            icon: 'flame-outline',
            label: 'Streaks',
            onPress: () => router.push('/streaks'),
          },
        ]}
      />

      <Section
        title="Automation"
        tint={brand.skySoft}
        rows={[
          {
            icon: 'flash-outline',
            label: 'Automation',
            description: automationEnabled
              ? 'Detecting transactions from SMS & apps'
              : 'Off — add expenses automatically',
            onPress: () => router.push('/settings/automation'),
          },
          {
            icon: 'file-tray-outline',
            label: 'Review Inbox',
            description:
              pendingCount > 0
                ? `${pendingCount} waiting for review`
                : 'Nothing to review',
            onPress: () => router.push('/automation/review'),
          },
        ]}
      />

      <Section
        title="Preferences"
        tint={colors.primaryDeep}
        rows={[
          {
            icon: 'cash-outline',
            label: 'Currency',
            onPress: () => router.push('/settings/currency'),
          },
          {
            icon: 'color-palette-outline',
            label: 'Appearance',
            onPress: () => router.push('/settings/appearance'),
          },
          {
            icon: 'notifications-outline',
            label: 'Notifications',
            onPress: () => router.push('/settings/notifications'),
          },
        ]}
      />

      <Section
        title="Data & Security"
        tint={colors.expense}
        rows={[
          {
            icon: 'shield-checkmark-outline',
            label: 'Privacy',
            description: 'Your data stays on this device',
            onPress: () => router.push('/settings/privacy'),
          },
          {
            icon: 'download-outline',
            label: 'Export / Import Data',
            onPress: () => router.push('/settings/data'),
          },
          {
            icon: 'lock-closed-outline',
            label: 'PIN & Biometric Lock',
            onPress: () => router.push('/settings/security'),
          },
          {
            icon: 'cloud-upload-outline',
            label: 'Cloud Backup & Sync',
            onPress: () => router.push('/settings/backup'),
          },
        ]}
      />

      <Section
        title="About"
        tint={colors.textLight}
        rows={[
          {
            icon: 'information-circle-outline',
            label: `About ${APP_INFO.name}`,
            description: `Version ${APP_INFO.version} · Developer, help & FAQ`,
            onPress: () => router.push('/about'),
          },
        ]}
      />
    </ScrollView>
  );
}

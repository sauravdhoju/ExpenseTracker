import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { spacing, radius } from '../../src/constants/theme';
import Card from '../../src/components/ui/Card';
import PageHeader from '../../src/components/ui/PageHeader';

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
    <View style={{ marginBottom: spacing.xl }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: colors.textLight,
          marginBottom: spacing.sm,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
      >
        {title}
      </Text>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <TouchableOpacity
            key={row.label}
            onPress={row.onPress}
            disabled={!row.onPress}
            activeOpacity={0.65}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              borderBottomWidth: i === rows.length - 1 ? 0 : 1,
              borderBottomColor: colors.border,
              opacity: row.future ? 0.6 : 1,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${row.tint ?? tint}1C`,
                marginRight: spacing.md,
              }}
            >
              <Ionicons name={row.icon} size={17} color={row.tint ?? tint} />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 15, fontWeight: '600', color: colors.text }}
              >
                {row.label}
              </Text>
              {row.description ? (
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textLight,
                    marginTop: 1,
                  }}
                >
                  {row.description}
                </Text>
              ) : null}
            </View>

            {row.future ? (
              <View
                style={{
                  paddingVertical: 3,
                  paddingHorizontal: 8,
                  borderRadius: radius.full,
                  backgroundColor: colors.background,
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '700',
                    color: colors.textLight,
                  }}
                >
                  SOON
                </Text>
              </View>
            ) : row.onPress ? (
              <Ionicons
                name="chevron-forward"
                size={17}
                color={colors.textLight}
              />
            ) : null}
          </TouchableOpacity>
        ))}
      </Card>
    </View>
  );
}

export default function MoreScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 130 }}
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
        ]}
      />

      <Section
        title="Preferences"
        tint={colors.income}
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
        tint={colors.warning}
        rows={[
          {
            icon: 'download-outline',
            label: 'Export / Import Data',
            onPress: () => router.push('/settings/data'),
          },
          {
            icon: 'lock-closed-outline',
            label: 'PIN & Biometric Lock',
            future: true,
          },
          {
            icon: 'cloud-upload-outline',
            label: 'Cloud Backup & Sync',
            future: true,
          },
        ]}
      />

      <Section
        title="About"
        tint={colors.textLight}
        rows={[
          {
            icon: 'information-circle-outline',
            label: 'Expense Tracker',
            description: 'Version 1.0.0',
          },
        ]}
      />
    </ScrollView>
  );
}

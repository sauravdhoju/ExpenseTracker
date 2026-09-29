import type { ReactNode } from 'react';
import { Image, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIsDarkMode, useThemeColors } from '../../src/hooks/useThemeColors';
import { useDateFormat } from '../../src/hooks/useDateFormat';
import { brand, radius, spacing } from '../../src/constants/theme';
import { SectionTitle, Sheet, SheetRow } from '../../src/components/ui/Sheet';
import Segmented from '../../src/components/ui/Segmented';
import { to12h } from '../../src/components/transactions/TransactionListItem';
import { useAppStore } from '../../src/store/useAppStore';
import { APP_INFO } from '../../src/constants/appInfo';
import { MONTH_NAMES } from '../../src/utils/date';

const APP_ICON = require('../../assets/images/icon.png');

interface Row {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  /** Current setting shown on the right, e.g. "NPR" or "On". */
  value?: string;
  /** Red count bubble, e.g. items waiting for review. */
  badge?: number;
  onPress?: () => void;
  tint?: string;
}

function Section({ title, tint, rows }: { title: string; tint: string; rows: Row[] }) {
  const colors = useThemeColors();
  return (
    <View>
      <SectionTitle title={title} />
      <Sheet>
        {rows.map((row, i) => (
          <SheetRow key={row.label} last={i === rows.length - 1} onPress={row.onPress}>
            <View style={{ width: 24, alignItems: 'center', marginRight: spacing.md }}>
              <Ionicons name={row.icon} size={20} color={row.tint ?? tint} />
            </View>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{row.label}</Text>
              {row.description ? (
                <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 1 }} numberOfLines={1}>
                  {row.description}
                </Text>
              ) : null}
            </View>
            {row.badge ? (
              <View
                style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  paddingHorizontal: 6,
                  backgroundColor: colors.expense,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 6,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.white }}>{row.badge}</Text>
              </View>
            ) : row.value ? (
              <Text style={{ fontSize: 13, color: colors.textLight, marginRight: 6, maxWidth: 140 }} numberOfLines={1}>
                {row.value}
              </Text>
            ) : null}
            {row.onPress && <Ionicons name="chevron-forward" size={16} color={colors.border} />}
          </SheetRow>
        ))}
      </Sheet>
    </View>
  );
}

function ToggleRow({
  icon,
  tint,
  label,
  description,
  last,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  label: string;
  description?: string;
  last?: boolean;
  children: ReactNode;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        minHeight: 56,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ width: 24, alignItems: 'center', marginRight: spacing.md }}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={{ flex: 1, marginRight: spacing.sm }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{label}</Text>
        {description ? <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 1 }}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export default function MoreScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const isDark = useIsDarkMode();
  const { format: formatDate } = useDateFormat();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const pendingCount = useAppStore((s) => s.pendingDetections.length);
  const transactions = useAppStore((s) => s.transactions);
  const accounts = useAppStore((s) => s.accounts);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // A short, non-financial summary of what's tracked — no amounts, so it's safe to show.
  const firstDate = transactions.reduce<string | null>((min, t) => (!min || t.date < min ? t.date : min), null);
  const since = firstDate
    ? `since ${MONTH_NAMES[Number(firstDate.slice(5, 7)) - 1].slice(0, 3)} ${firstDate.slice(0, 4)}`
    : 'no entries yet';
  const activeAccounts = accounts.filter((a) => a.isActive).length;

  const switchProps = {
    trackColor: { true: colors.primary, false: colors.border },
    thumbColor: colors.white,
  };

  const themeLabel = settings.themeMode === 'system' ? 'System' : settings.themeMode === 'dark' ? 'Dark' : 'Light';
  const reminderLabel = settings.expenseReminderEnabled
    ? `${settings.expenseReminderFrequency[0].toUpperCase()}${settings.expenseReminderFrequency.slice(1)} at ${to12h(settings.expenseReminderTime)}`
    : 'Off';
  const backupLabel = !settings.cloudBackupEnabled
    ? 'Off'
    : settings.lastCloudBackupAt
      ? `Last ${formatDate(settings.lastCloudBackupAt.slice(0, 10))}`
      : 'Not backed up yet';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
        <TouchableOpacity
          onPress={goBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.md,
          }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.6 }}>Settings</Text>
      </View>

      {/* App card */}
      <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/about')}>
        <Sheet style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: brand.red }} />
          <View style={{ position: 'absolute', left: 0, top: '50%', bottom: 0, width: 4, backgroundColor: brand.sky }} />
          <Image source={APP_ICON} style={{ width: 52, height: 52, borderRadius: 14 }} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{APP_INFO.name}</Text>
            <Text style={{ fontSize: 12.5, color: colors.textLight, marginTop: 2 }}>
              {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'} · {activeAccounts}{' '}
              {activeAccounts === 1 ? 'account' : 'accounts'} · {since}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Ionicons name="lock-closed" size={11} color={colors.income} />
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.income }}>Stored only on this phone</Text>
              <Text style={{ fontSize: 11.5, color: colors.textLight }}> · v{APP_INFO.version}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.border} />
        </Sheet>
      </TouchableOpacity>

      {/* Quick settings — change in place without opening another screen */}
      <SectionTitle title="Quick settings" />
      <Sheet>
        <ToggleRow icon="eye-off-outline" tint={colors.primary} label="Hide amounts" description="Mask money across the app">
          <Switch value={settings.hideBalances} onValueChange={(v) => updateSettings({ hideBalances: v })} {...switchProps} />
        </ToggleRow>
        <ToggleRow icon="moon-outline" tint={colors.primary} label="Dark mode">
          <Switch value={isDark} onValueChange={(v) => updateSettings({ themeMode: v ? 'dark' : 'light' })} {...switchProps} />
        </ToggleRow>
        <ToggleRow icon="calendar-outline" tint={colors.primary} label="Calendar" last>
          <View style={{ width: 120 }}>
            <Segmented
              options={[
                { value: 'AD', label: 'AD' },
                { value: 'BS', label: 'BS' },
              ]}
              value={settings.dateSystem}
              onChange={(v) => updateSettings({ dateSystem: v })}
            />
          </View>
        </ToggleRow>
      </Sheet>

      <Section
        title="Manage"
        tint={colors.primary}
        rows={[
          { icon: 'wallet-outline', label: 'Accounts', value: String(activeAccounts), onPress: () => router.push('/accounts') },
          { icon: 'pricetags-outline', label: 'Categories', onPress: () => router.push('/categories') },
          { icon: 'repeat-outline', label: 'Recurring transactions', onPress: () => router.push('/recurring') },
          { icon: 'receipt-outline', label: 'Bills & reminders', onPress: () => router.push('/bills') },
          { icon: 'flag-outline', label: 'Financial goals', onPress: () => router.push('/goals') },
          { icon: 'people-outline', label: 'Lent money', onPress: () => router.push('/loans') },
          { icon: 'help-circle-outline', label: 'Forgotten money', onPress: () => router.push('/forgotten') },
          { icon: 'flame-outline', label: 'Streaks', onPress: () => router.push('/streaks') },
        ]}
      />

      <Section
        title="Automation"
        tint={brand.skySoft}
        rows={[
          {
            icon: 'flash-outline',
            label: 'Automation',
            description: settings.automationEnabled ? 'Detecting from SMS & apps' : 'Add expenses automatically',
            value: settings.automationEnabled ? 'On' : 'Off',
            onPress: () => router.push('/settings/automation'),
          },
          {
            icon: 'file-tray-outline',
            label: 'Review inbox',
            description: pendingCount > 0 ? 'Detected transactions to confirm' : 'Nothing to review',
            badge: pendingCount,
            onPress: () => router.push('/automation/review'),
          },
        ]}
      />

      <Section
        title="Preferences"
        tint={colors.primaryDeep}
        rows={[
          { icon: 'cash-outline', label: 'Currency', value: settings.currency, onPress: () => router.push('/settings/currency') },
          { icon: 'color-palette-outline', label: 'Appearance', value: themeLabel, onPress: () => router.push('/settings/appearance') },
          { icon: 'notifications-outline', label: 'Notifications', value: reminderLabel, onPress: () => router.push('/settings/notifications') },
        ]}
      />

      <Section
        title="Data & security"
        tint={colors.expense}
        rows={[
          {
            icon: 'lock-closed-outline',
            label: 'PIN & biometric lock',
            value: settings.appLockEnabled ? 'On' : 'Off',
            onPress: () => router.push('/settings/security'),
          },
          { icon: 'cloud-upload-outline', label: 'Cloud backup', value: backupLabel, onPress: () => router.push('/settings/backup') },
          { icon: 'download-outline', label: 'Export / import data', onPress: () => router.push('/settings/data') },
          { icon: 'shield-checkmark-outline', label: 'Privacy', onPress: () => router.push('/settings/privacy') },
        ]}
      />

      <Text style={{ fontSize: 12, color: colors.textLight, textAlign: 'center', marginTop: spacing.xxl }}>
        {APP_INFO.name} v{APP_INFO.version} · {APP_INFO.tagline}
      </Text>
      <View style={{ height: radius.sm }} />
    </ScrollView>
  );
}

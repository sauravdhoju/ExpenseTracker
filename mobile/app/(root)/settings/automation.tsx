import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, PermissionsAndroid, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { requestNotificationPermission } from '../../../src/services/notificationService';
import * as native from '../../../src/automation/native';
import * as automationRepo from '../../../src/database/automationRepo';
import { KNOWN_PAYMENT_APPS } from '../../../src/automation/sources';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import type { AccountMapping, MerchantRule } from '../../../src/automation/types';
import type { AppSettings } from '../../../src/types';

function SectionTitle({ children }: { children: string }) {
  const colors = useThemeColors();
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '700',
        color: colors.textLight,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
      }}
    >
      {children}
    </Text>
  );
}

function ToggleRow({
  icon,
  title,
  description,
  enabled,
  onToggle,
  disabled,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  last?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={disabled}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Ionicons name={icon} size={19} color={colors.text} style={{ width: 26 }} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text style={{ fontSize: 15, color: colors.text, fontWeight: '600' }}>{title}</Text>
        {description ? <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>{description}</Text> : null}
      </View>
      <Ionicons
        name={enabled && !disabled ? 'toggle' : 'toggle-outline'}
        size={30}
        color={enabled && !disabled ? colors.primary : colors.textLight}
      />
    </TouchableOpacity>
  );
}

async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const permission = PermissionsAndroid.PERMISSIONS.RECEIVE_SMS;
  if (await PermissionsAndroid.check(permission)) return true;
  const result = await PermissionsAndroid.request(permission, {
    title: 'Detect bank SMS',
    message:
      'ETracko reads incoming bank and payment SMS on this device to add transactions for you. Messages are never uploaded anywhere.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function loadAutomationState() {
  const [smsGranted, mappings, rules] = await Promise.all([
    Platform.OS === 'android' ? PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS) : false,
    automationRepo.getAllAccountMappings(),
    automationRepo.getAllMerchantRules(),
  ]);
  return {
    smsGranted,
    mappings,
    rules,
    notificationAccess: native.isNotificationAccessGranted(),
    seenApps: native.getSeenApps(),
  };
}

export default function AutomationScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const accounts = useAppStore((s) => s.accounts);
  const categories = useAppStore((s) => s.categories);
  const pendingCount = useAppStore((s) => s.pendingDetections.length);
  const supported = native.isAutomationSupported();

  const [notificationAccess, setNotificationAccess] = useState(native.isNotificationAccessGranted());
  const [smsGranted, setSmsGranted] = useState(false);
  const [seenApps, setSeenApps] = useState(native.getSeenApps());
  const [mappings, setMappings] = useState<AccountMapping[]>([]);
  const [rules, setRules] = useState<MerchantRule[]>([]);
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newAccountId, setNewAccountId] = useState<string | null>(null);

  const reload = useCallback(() => {
    loadAutomationState().then((state) => {
      setSmsGranted(state.smsGranted);
      setMappings(state.mappings);
      setRules(state.rules);
      setNotificationAccess(state.notificationAccess);
      setSeenApps(state.seenApps);
    });
  }, []);

  useEffect(() => {
    reload();
    // Re-check permissions when returning from Android's settings screens.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reload();
    });
    return () => sub.remove();
  }, [reload]);

  const set = (partial: Partial<AppSettings>) => updateSettings(partial);
  const master = settings.automationEnabled && supported;

  const toggleMaster = async () => {
    if (settings.automationEnabled) return set({ automationEnabled: false });
    await requestNotificationPermission().catch(() => false);
    if (settings.automationSmsEnabled && !(await requestSmsPermission())) {
      Alert.alert('SMS permission needed', 'Without it ETracko can still detect payment-app notifications.');
      await set({ automationSmsEnabled: false });
    }
    await set({ automationEnabled: true });
    reload();
  };

  const toggleSms = async () => {
    if (settings.automationSmsEnabled) return set({ automationSmsEnabled: false });
    if (!(await requestSmsPermission())) {
      Alert.alert('SMS permission denied', 'You can allow it later from Android Settings → Apps → ETracko → Permissions.');
      return;
    }
    await set({ automationSmsEnabled: true });
    reload();
  };

  const toggleNotifications = async () => {
    if (settings.automationNotificationsEnabled) return set({ automationNotificationsEnabled: false });
    await set({ automationNotificationsEnabled: true });
    if (!native.isNotificationAccessGranted()) {
      Alert.alert(
        'Allow notification access',
        'On the next screen, turn on ETracko. Only notifications from the apps you select below are ever processed, and only on this device.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open settings', onPress: () => native.openNotificationAccessSettings() },
        ]
      );
    }
  };

  const toggleApp = (packageName: string) => {
    const allowed = settings.automationAllowedApps;
    set({
      automationAllowedApps: allowed.includes(packageName)
        ? allowed.filter((p) => p !== packageName)
        : [...allowed, packageName],
    });
  };

  const appList = [
    ...KNOWN_PAYMENT_APPS,
    ...seenApps.filter((s) => !KNOWN_PAYMENT_APPS.some((k) => k.packageName === s.packageName)),
    ...settings.automationAllowedApps
      .filter((p) => !KNOWN_PAYMENT_APPS.some((k) => k.packageName === p) && !seenApps.some((s) => s.packageName === p))
      .map((p) => ({ packageName: p, appName: p })),
  ];

  const addMapping = async () => {
    const digits = newIdentifier.replace(/\D/g, '');
    if (digits.length < 3 || !newAccountId) return;
    await automationRepo.upsertAccountMapping(automationRepo.accountIdentifier(digits.slice(-4)), newAccountId);
    setNewIdentifier('');
    setNewAccountId(null);
    reload();
  };

  const describeIdentifier = (identifier: string) => {
    const [type, value] = [identifier.slice(0, identifier.indexOf(':')), identifier.slice(identifier.indexOf(':') + 1)];
    if (type === 'acct') return `Account ••••${value}`;
    if (type === 'sender') return `SMS from ${value.toUpperCase()}`;
    return appList.find((a) => a.packageName === value)?.appName ?? value;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Automation</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 130 }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.income}14` }}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.income} />
          <Text style={{ flex: 1, marginLeft: spacing.md, fontSize: 13, color: colors.text, lineHeight: 19 }}>
            Detection runs entirely on this phone. Messages are parsed offline and never sent to any server.
          </Text>
        </Card>

        {!supported && (
          <Text style={{ fontSize: 12.5, color: colors.warning, lineHeight: 18, marginTop: spacing.md }}>
            Automatic detection needs the Android app build (it isn&apos;t available on iOS, web or in Expo Go).
          </Text>
        )}

        {pendingCount > 0 && (
          <TouchableOpacity onPress={() => router.push('/automation/review')} style={{ marginTop: spacing.md }}>
            <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="file-tray-full-outline" size={20} color={colors.warning} />
              <Text style={{ flex: 1, marginLeft: spacing.md, fontSize: 14, fontWeight: '600', color: colors.text }}>
                {pendingCount} transaction{pendingCount === 1 ? '' : 's'} need review
              </Text>
              <Ionicons name="chevron-forward" size={17} color={colors.textLight} />
            </Card>
          </TouchableOpacity>
        )}

        <SectionTitle>Transaction Detection</SectionTitle>
        <Card style={{ padding: 0 }}>
          <ToggleRow
            icon="flash-outline"
            title="Detect transactions automatically"
            description="From bank SMS and the payment apps you choose"
            enabled={master}
            onToggle={toggleMaster}
            disabled={!supported}
            last
          />
        </Card>

        <SectionTitle>Sources</SectionTitle>
        <Card style={{ padding: 0 }}>
          <ToggleRow
            icon="chatbox-ellipses-outline"
            title="Bank SMS"
            description={
              settings.automationSmsEnabled && !smsGranted ? 'SMS permission not granted' : 'Debit, credit, ATM and transfer alerts'
            }
            enabled={settings.automationSmsEnabled}
            onToggle={toggleSms}
            disabled={!master}
          />
          <ToggleRow
            icon="notifications-outline"
            title="App notifications"
            description={
              settings.automationNotificationsEnabled && !notificationAccess
                ? 'Notification access not granted — tap “Grant access” below'
                : 'Payment confirmations from selected apps'
            }
            enabled={settings.automationNotificationsEnabled}
            onToggle={toggleNotifications}
            disabled={!master}
            last
          />
        </Card>

        {master && settings.automationNotificationsEnabled && (
          <>
            <SectionTitle>Supported Apps</SectionTitle>
            <Card style={{ padding: 0 }}>
              {!notificationAccess && (
                <TouchableOpacity
                  onPress={() => native.openNotificationAccessSettings()}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Ionicons name="key-outline" size={19} color={colors.warning} style={{ width: 26 }} />
                  <Text style={{ flex: 1, marginLeft: spacing.sm, fontSize: 14, fontWeight: '600', color: colors.warning }}>
                    Grant access
                  </Text>
                  <Ionicons name="open-outline" size={17} color={colors.warning} />
                </TouchableOpacity>
              )}
              {appList.map((app, i) => {
                const on = settings.automationAllowedApps.includes(app.packageName);
                return (
                  <TouchableOpacity
                    key={app.packageName}
                    onPress={() => toggleApp(app.packageName)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: spacing.lg,
                      borderBottomWidth: i === appList.length - 1 ? 0 : 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={on ? colors.primary : colors.textLight} />
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={{ fontSize: 15, color: colors.text }}>{app.appName}</Text>
                      <Text style={{ fontSize: 11, color: colors.textLight }}>{app.packageName}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Card>
            <Text style={{ fontSize: 11.5, color: colors.textLight, marginTop: spacing.sm, lineHeight: 16 }}>
              Bank and FonePay apps appear here automatically after they show a payment notification on this phone.
            </Text>
          </>
        )}

        <SectionTitle>Behaviour</SectionTitle>
        <Card style={{ padding: 0 }}>
          <ToggleRow
            icon="pricetags-outline"
            title="Automatic categorization"
            description="Using built-in merchant rules and your corrections"
            enabled={settings.automationAutoCategorize}
            onToggle={() => set({ automationAutoCategorize: !settings.automationAutoCategorize })}
          />
          <ToggleRow
            icon="add-circle-outline"
            title="Automatic transaction creation"
            description="Add clear, high-confidence transactions without asking"
            enabled={settings.automationAutoCreate}
            onToggle={() => set({ automationAutoCreate: !settings.automationAutoCreate })}
          />
          <ToggleRow
            icon="file-tray-outline"
            title="Review uncertain transactions"
            description="Send unclear ones to the Review Inbox instead of dropping them"
            enabled={settings.automationReviewUncertain}
            onToggle={() => set({ automationReviewUncertain: !settings.automationReviewUncertain })}
            last
          />
        </Card>

        <SectionTitle>Account Mapping</SectionTitle>
        <Card>
          <Text style={{ fontSize: 12.5, color: colors.textLight, marginBottom: spacing.md, lineHeight: 18 }}>
            Link the account digits in your SMS (e.g. ##6334) to an ETracko account. Set once — future messages use it
            automatically.
          </Text>
          {mappings.map((m) => (
            <View
              key={m.id}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>
                {describeIdentifier(m.identifier)} → {accounts.find((a) => a.id === m.accountId)?.name ?? 'Deleted account'}
              </Text>
              <TouchableOpacity
                hitSlop={8}
                onPress={async () => {
                  await automationRepo.deleteAccountMapping(m.id);
                  reload();
                }}
              >
                <Ionicons name="close-circle-outline" size={19} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          ))}

          <TextInput
            value={newIdentifier}
            onChangeText={setNewIdentifier}
            placeholder="Last digits, e.g. 6334"
            placeholderTextColor={colors.textLight}
            keyboardType="number-pad"
            maxLength={8}
            style={{
              backgroundColor: colors.background,
              borderRadius: radius.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              fontSize: 14,
              color: colors.text,
              marginTop: spacing.md,
              marginBottom: spacing.sm,
            }}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
            {accounts
              .filter((a) => a.isActive)
              .map((a) => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setNewAccountId(a.id)}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: radius.full,
                    backgroundColor: newAccountId === a.id ? colors.primary : colors.background,
                    marginRight: spacing.sm,
                  }}
                >
                  <Text style={{ color: newAccountId === a.id ? colors.white : colors.text, fontWeight: '600', fontSize: 12.5 }}>
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
          <TouchableOpacity
            onPress={addMapping}
            disabled={newIdentifier.replace(/\D/g, '').length < 3 || !newAccountId}
            style={{ alignSelf: 'flex-start', opacity: newIdentifier.replace(/\D/g, '').length < 3 || !newAccountId ? 0.4 : 1 }}
          >
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>+ Add mapping</Text>
          </TouchableOpacity>
        </Card>

        <SectionTitle>Learned Categories</SectionTitle>
        <Card>
          {rules.length === 0 ? (
            <Text style={{ fontSize: 12.5, color: colors.textLight, lineHeight: 18 }}>
              When you change the category of a detected transaction, ETracko remembers it for that merchant.
            </Text>
          ) : (
            rules.map((r, i) => (
              <View
                key={r.merchantKey}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.sm,
                  borderBottomWidth: i === rules.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>
                  {r.merchant} → {categories.find((c) => c.id === r.categoryId)?.name ?? 'Unknown'}
                </Text>
                <TouchableOpacity
                  hitSlop={8}
                  onPress={async () => {
                    await automationRepo.deleteMerchantRule(r.merchantKey);
                    reload();
                  }}
                >
                  <Ionicons name="close-circle-outline" size={19} color={colors.textLight} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

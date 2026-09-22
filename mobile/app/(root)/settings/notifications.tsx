import { useState } from 'react';
import { Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { isNotificationsSupported } from '../../../src/services/notificationService';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import type { ReminderFrequency } from '../../../src/types';

const FREQUENCIES: { value: ReminderFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const THRESHOLDS = [50, 60, 70, 80, 90, 100];

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function Row({
  icon,
  title,
  description,
  enabled,
  onToggle,
  disabled,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const colors = useThemeColors();
  return (
    <Card style={{ marginBottom: spacing.md, opacity: disabled ? 0.5 : 1 }}>
      <TouchableOpacity
        onPress={onToggle}
        disabled={disabled}
        style={{ flexDirection: 'row', alignItems: 'center' }}
      >
        <Ionicons name={icon} size={19} color={colors.text} style={{ width: 26 }} />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={{ fontSize: 15, color: colors.text, fontWeight: '600' }}>{title}</Text>
          <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>{description}</Text>
        </View>
        <Ionicons
          name={enabled ? 'toggle' : 'toggle-outline'}
          size={30}
          color={enabled ? colors.primary : colors.textLight}
        />
      </TouchableOpacity>
      {enabled && !disabled && children ? <View style={{ marginTop: spacing.md }}>{children}</View> : null}
    </Card>
  );
}

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const notificationsSupported = isNotificationsSupported();
  const [showTimePicker, setShowTimePicker] = useState(false);

  const controlsEnabled = settings.notificationsEnabled && notificationsSupported;

  const [hh, mm] = settings.expenseReminderTime.split(':').map(Number);
  const timeValue = new Date();
  timeValue.setHours(hh, mm, 0, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Notifications</Text>
        <View style={{ width: 22 }} />
      </View>

      {!notificationsSupported && (
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
          <Text style={{ fontSize: 12.5, color: colors.warning, lineHeight: 18 }}>
            Notifications require a development build — they&apos;re disabled while running in Expo Go.
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 130 }}>
        <Card style={{ padding: 0, marginBottom: spacing.lg }}>
          <TouchableOpacity
            onPress={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
            disabled={!notificationsSupported}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.lg,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              opacity: notificationsSupported ? 1 : 0.5,
            }}
          >
            <Ionicons name="notifications-outline" size={19} color={colors.text} style={{ width: 26 }} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={{ fontSize: 15, color: colors.text }}>Allow notifications</Text>
              <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                Master switch for all reminders below
              </Text>
            </View>
            <Ionicons
              name={settings.notificationsEnabled && notificationsSupported ? 'toggle' : 'toggle-outline'}
              size={30}
              color={settings.notificationsEnabled && notificationsSupported ? colors.primary : colors.textLight}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => updateSettings({ hideBalances: !settings.hideBalances })}
            style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg }}
          >
            <Ionicons name="eye-off-outline" size={19} color={colors.text} style={{ width: 26 }} />
            <Text style={{ flex: 1, fontSize: 15, color: colors.text, marginLeft: spacing.sm }}>Hide balances</Text>
            <Ionicons
              name={settings.hideBalances ? 'toggle' : 'toggle-outline'}
              size={30}
              color={settings.hideBalances ? colors.primary : colors.textLight}
            />
          </TouchableOpacity>
        </Card>

        <Row
          icon="time-outline"
          title="Expense Reminder"
          description={`Remind me to log expenses — ${formatTime(settings.expenseReminderTime)}, ${settings.expenseReminderFrequency}`}
          enabled={settings.expenseReminderEnabled}
          onToggle={() => updateSettings({ expenseReminderEnabled: !settings.expenseReminderEnabled })}
          disabled={!controlsEnabled}
        >
          <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: spacing.xs }}>Remind me at</Text>
          <TouchableOpacity
            onPress={() => setShowTimePicker(true)}
            style={{
              backgroundColor: colors.background,
              borderRadius: radius.md,
              paddingVertical: spacing.sm + 2,
              paddingHorizontal: spacing.md,
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
              {formatTime(settings.expenseReminderTime)}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={timeValue}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selected) {
                  const time = `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`;
                  updateSettings({ expenseReminderTime: time });
                }
              }}
            />
          )}

          <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: spacing.xs }}>Repeat</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {FREQUENCIES.map((f) => (
              <TouchableOpacity
                key={f.value}
                onPress={() => updateSettings({ expenseReminderFrequency: f.value })}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: radius.full,
                  alignItems: 'center',
                  backgroundColor: settings.expenseReminderFrequency === f.value ? colors.primary : colors.background,
                }}
              >
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: '600',
                    color: settings.expenseReminderFrequency === f.value ? colors.white : colors.text,
                  }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Row>

        <Row
          icon="alert-circle-outline"
          title="Budget Alert"
          description={`When ${settings.budgetAlertThreshold}% of a budget is used`}
          enabled={settings.budgetAlertEnabled}
          onToggle={() => updateSettings({ budgetAlertEnabled: !settings.budgetAlertEnabled })}
          disabled={!controlsEnabled}
        >
          <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: spacing.xs }}>Alert threshold</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {THRESHOLDS.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => updateSettings({ budgetAlertThreshold: t })}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: radius.full,
                  backgroundColor: settings.budgetAlertThreshold === t ? colors.primary : colors.background,
                }}
              >
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: '600',
                    color: settings.budgetAlertThreshold === t ? colors.white : colors.text,
                  }}
                >
                  {t}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Row>

        <Row
          icon="repeat-outline"
          title="Recurring Expense Reminder"
          description="Uses each recurring item's own lead time"
          enabled={settings.recurringReminderEnabled}
          onToggle={() => updateSettings({ recurringReminderEnabled: !settings.recurringReminderEnabled })}
          disabled={!controlsEnabled}
        />

        <Row
          icon="people-outline"
          title="Lent Money Reminder"
          description="On each person's expected repayment date"
          enabled={settings.lentReminderEnabled}
          onToggle={() => updateSettings({ lentReminderEnabled: !settings.lentReminderEnabled })}
          disabled={!controlsEnabled}
        />
      </ScrollView>
    </View>
  );
}

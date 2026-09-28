import { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { exportAsJSON, pickBackupFile, restoreBackup } from '../../../src/services/exportService';
import { clearAutomationRules, clearDetectionHistory } from '../../../src/database/automationRepo';
import * as native from '../../../src/automation/native';
import { spacing } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import { showToast } from '../../../src/components/ui/Toast';

export default function PrivacyScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const refreshAll = useAppStore((s) => s.refreshAll);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (error) {
      Alert.alert('Something went wrong', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const confirm = (title: string, message: string, action: string, key: string, fn: () => Promise<void>) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: action, style: 'destructive', onPress: () => run(key, fn) },
    ]);

  const handleImport = () =>
    run('import', async () => {
      const backup = await pickBackupFile();
      if (!backup) return;
      confirm(
        'Restore backup',
        `This will replace all current data with the backup from ${new Date(backup.exportedAt).toLocaleDateString()}.`,
        'Restore',
        'import',
        async () => {
          await restoreBackup(backup);
          await refreshAll();
          showToast('Backup restored');
        }
      );
    });

  const handleDeleteAll = () =>
    confirm(
      'Delete all data',
      'Permanently deletes every account, transaction, budget, goal and automation rule on this device. This cannot be undone.',
      'Delete everything',
      'delete',
      async () => {
        const { resetDatabase } = await import('../../../src/database/db');
        const { seedDefaultCategories } = await import('../../../src/database/categoryRepo');
        native.clearQueue();
        native.clearSeenApps();
        await resetDatabase();
        await seedDefaultCategories();
        await refreshAll();
        router.replace('/onboarding');
      }
    );

  const handleClearRules = () =>
    confirm(
      'Clear automation rules',
      'Forgets all account mappings and learned merchant categories. Your transactions are not affected.',
      'Clear',
      'rules',
      async () => {
        await clearAutomationRules();
        native.clearSeenApps();
        showToast('Automation rules cleared');
      }
    );

  const handleClearHistory = () =>
    confirm(
      'Clear detection history',
      'Deletes the stored copies of processed SMS/notification text. Transactions and items waiting for review are kept.',
      'Clear',
      'history',
      async () => {
        await clearDetectionHistory();
        showToast('Detection history cleared');
      }
    );

  const rows: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string; description: string; onPress: () => void; danger?: boolean }[] = [
    { key: 'export', icon: 'download-outline', label: 'Export Data', description: 'Full JSON backup you keep yourself', onPress: () => run('export', () => exportAsJSON().then(() => {})) },
    { key: 'import', icon: 'cloud-upload-outline', label: 'Import Backup', description: 'Restore from a JSON backup file', onPress: handleImport },
    { key: 'history', icon: 'document-text-outline', label: 'Clear Detection History', description: 'Remove stored message text', onPress: handleClearHistory },
    { key: 'rules', icon: 'git-branch-outline', label: 'Clear Automation Rules', description: 'Account mappings and learned categories', onPress: handleClearRules },
    { key: 'delete', icon: 'trash-outline', label: 'Delete All Data', description: 'Erase everything on this device', onPress: handleDeleteAll, danger: true },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Privacy</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 130 }}>
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.lg }}>
          <Ionicons name="phone-portrait-outline" size={36} color={colors.income} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.md, textAlign: 'center' }}>
            Your financial data stays on this device.
          </Text>
          <Text style={{ fontSize: 13, color: colors.textLight, marginTop: spacing.sm, textAlign: 'center', lineHeight: 19 }}>
            ETracko does not require an account or an ETracko cloud server for transaction tracking. SMS and notification
            detection, categorization and duplicate checks all run offline on your phone.
          </Text>
          <Text style={{ fontSize: 12, color: colors.textLight, marginTop: spacing.sm, textAlign: 'center', lineHeight: 17 }}>
            Optional Google Drive backup only runs if you turn it on, and uploads to your own Drive.
          </Text>
        </Card>

        <Card style={{ padding: 0 }}>
          {rows.map((row, i) => (
            <TouchableOpacity
              key={row.key}
              onPress={row.onPress}
              disabled={busy !== null}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.lg,
                borderBottomWidth: i === rows.length - 1 ? 0 : 1,
                borderBottomColor: colors.border,
                opacity: busy && busy !== row.key ? 0.5 : 1,
              }}
            >
              <Ionicons name={row.icon} size={19} color={row.danger ? colors.expense : colors.text} style={{ width: 26 }} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={{ fontSize: 15, color: row.danger ? colors.expense : colors.text }}>{row.label}</Text>
                <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>{row.description}</Text>
              </View>
              {busy === row.key && <Ionicons name="hourglass-outline" size={16} color={colors.textLight} />}
            </TouchableOpacity>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

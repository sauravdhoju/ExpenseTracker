import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { exportAsJSON, exportTransactionsAsCSV, pickBackupFile, restoreBackup } from '../../../src/services/exportService';
import { spacing } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';

export default function DataScreen() {
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

  const handleImport = () =>
    run('import', async () => {
      const backup = await pickBackupFile();
      if (!backup) return;
      Alert.alert(
        'Restore backup',
        `This will replace all current data with the backup from ${new Date(backup.exportedAt).toLocaleDateString()}. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () =>
              run('import', async () => {
                await restoreBackup(backup);
                await refreshAll();
                Alert.alert('Restored', 'Your data has been restored from the backup.');
              }),
          },
        ]
      );
    });

  const handleReset = () =>
    Alert.alert('Reset all data', 'This permanently deletes all accounts, transactions, budgets and goals. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () =>
          run('reset', async () => {
            const { resetDatabase } = await import('../../../src/database/db');
            const { seedDefaultCategories } = await import('../../../src/database/categoryRepo');
            await resetDatabase();
            await seedDefaultCategories();
            await refreshAll();
            router.replace('/onboarding');
          }),
      },
    ]);

  const rows: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }[] = [
    { key: 'json', icon: 'document-text-outline', label: 'Export as JSON (full backup)', onPress: () => run('json', () => exportAsJSON().then(() => {})) },
    { key: 'csv', icon: 'grid-outline', label: 'Export transactions as CSV', onPress: () => run('csv', () => exportTransactionsAsCSV().then(() => {})) },
    { key: 'import', icon: 'cloud-upload-outline', label: 'Import / Restore backup', onPress: handleImport },
    { key: 'reset', icon: 'trash-outline', label: 'Reset all data', onPress: handleReset, danger: true },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Export / Import Data</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: spacing.lg, paddingTop: 0 }}>
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
              <Text style={{ flex: 1, fontSize: 15, color: row.danger ? colors.expense : colors.text, marginLeft: spacing.sm }}>
                {row.label}
              </Text>
              {busy === row.key && <Ionicons name="hourglass-outline" size={16} color={colors.textLight} />}
            </TouchableOpacity>
          ))}
        </Card>
      </View>
    </View>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { useGoogleDriveAuth } from '../../../src/hooks/useGoogleDriveAuth';
import * as cloudBackupService from '../../../src/services/cloudBackupService';
import { BACKUP_INTERVAL_OPTIONS } from '../../../src/constants/googleAuthConfig';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';

function formatTimestamp(iso: string | null): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CloudBackupScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { signIn, isSigningIn, isConfigured } = useGoogleDriveAuth();

  const cloudBackupEnabled = useAppStore((s) => s.settings.cloudBackupEnabled);
  const cloudBackupIntervalDays = useAppStore((s) => s.settings.cloudBackupIntervalDays);
  const lastCloudBackupAt = useAppStore((s) => s.settings.lastCloudBackupAt);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [isConnected, setIsConnected] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const refreshConnection = useCallback(() => {
    cloudBackupService.isCloudBackupConnected().then(setIsConnected);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshConnection();
    }, [refreshConnection])
  );

  useEffect(() => {
    refreshConnection();
  }, [refreshConnection]);

  const handleConnect = async () => {
    if (!isConfigured) {
      Alert.alert(
        'Not configured',
        'Google Drive backup needs an OAuth Client ID from Google Cloud Console before it can be used. See src/constants/googleAuthConfig.ts for setup steps.'
      );
      return;
    }
    try {
      const success = await signIn();
      if (success) {
        setIsConnected(true);
        await updateSettings({ cloudBackupEnabled: true });
        Alert.alert('Connected', 'Your Google Drive account is now connected.');
      }
    } catch (err) {
      Alert.alert('Connection failed', err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect Google Drive', 'Automatic backups will stop until you reconnect.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await cloudBackupService.disconnectCloudBackup();
          setIsConnected(false);
        },
      },
    ]);
  };

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    try {
      await cloudBackupService.backupNow();
      Alert.alert('Backup complete', 'Your data was uploaded to Google Drive.');
    } catch (err) {
      Alert.alert('Backup failed', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: spacing.lg,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Cloud Backup</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
        {!isConfigured && (
          <View
            style={{
              backgroundColor: `${colors.warning}1A`,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ fontSize: 12.5, color: colors.warning, lineHeight: 18 }}>
              Google Drive isn&apos;t configured for this build yet. Add an OAuth Client ID in
              src/constants/googleAuthConfig.ts to enable this feature.
            </Text>
          </View>
        )}

        {/* Connection status */}
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isConnected ? `${colors.income}1F` : colors.background,
                marginRight: spacing.md,
              }}
            >
              <Ionicons
                name="logo-google"
                size={20}
                color={isConnected ? colors.income : colors.textLight}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                {isConnected ? 'Connected to Google Drive' : 'Not connected'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 1 }}>
                {isConnected
                  ? 'Backups go to the "ExpenseTracker Backups" folder'
                  : 'Connect an account to enable cloud backup'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={isConnected ? handleDisconnect : handleConnect}
            disabled={isSigningIn}
            style={{
              marginTop: spacing.md,
              paddingVertical: spacing.sm + 2,
              borderRadius: radius.md,
              alignItems: 'center',
              backgroundColor: isConnected ? colors.background : colors.primary,
              opacity: isSigningIn ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: isConnected ? colors.expense : colors.white,
              }}
            >
              {isSigningIn ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect Google Drive'}
            </Text>
          </TouchableOpacity>
        </Card>

        {isConnected && (
          <>
            {/* Auto backup toggle */}
            <Card style={{ padding: 0, marginBottom: spacing.lg }}>
              <TouchableOpacity
                onPress={() => updateSettings({ cloudBackupEnabled: !cloudBackupEnabled })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.lg,
                }}
              >
                <Ionicons name="sync-outline" size={19} color={colors.text} style={{ width: 26 }} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={{ fontSize: 15, color: colors.text }}>Automatic backup</Text>
                  <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                    Runs automatically when the app is opened
                  </Text>
                </View>
                <Ionicons
                  name={cloudBackupEnabled ? 'toggle' : 'toggle-outline'}
                  size={30}
                  color={cloudBackupEnabled ? colors.primary : colors.textLight}
                />
              </TouchableOpacity>
            </Card>

            {/* Interval picker */}
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
              Backup frequency
            </Text>
            <Card style={{ padding: 0, marginBottom: spacing.lg }}>
              {BACKUP_INTERVAL_OPTIONS.map((opt, i) => (
                <TouchableOpacity
                  key={opt.days}
                  onPress={() => updateSettings({ cloudBackupIntervalDays: opt.days })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing.lg,
                    borderBottomWidth: i === BACKUP_INTERVAL_OPTIONS.length - 1 ? 0 : 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{opt.label}</Text>
                  {cloudBackupIntervalDays === opt.days && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </Card>

            {/* Last backup + manual trigger */}
            <Card>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing.md,
                }}
              >
                <Text style={{ fontSize: 13, color: colors.textLight }}>Last backup</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                  {formatTimestamp(lastCloudBackupAt)}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleBackupNow}
                disabled={isBackingUp}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.sm + 2,
                  borderRadius: radius.md,
                  backgroundColor: colors.primary,
                  opacity: isBackingUp ? 0.6 : 1,
                }}
              >
                <Ionicons name="cloud-upload-outline" size={16} color={colors.white} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.white }}>
                  {isBackingUp ? 'Backing up...' : 'Back up now'}
                </Text>
              </TouchableOpacity>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

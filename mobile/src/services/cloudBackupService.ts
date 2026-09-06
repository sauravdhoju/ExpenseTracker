import { buildBackup } from './exportService';
import * as googleAuthService from './googleAuthService';
import * as googleDriveService from './googleDriveService';
import { getGoogleClientId } from '../hooks/useGoogleDriveAuth';
import { useAppStore } from '../store/useAppStore';

export async function isCloudBackupConnected(): Promise<boolean> {
  return googleAuthService.isConnected();
}

export async function disconnectCloudBackup(): Promise<void> {
  await googleAuthService.clearTokens();
  await useAppStore.getState().updateSettings({ cloudBackupEnabled: false });
}

/** Builds a fresh backup and uploads it to the app's Drive folder right now. */
export async function backupNow(): Promise<void> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Google OAuth client ID is not configured yet.');
  }

  const accessToken = await googleAuthService.getValidAccessToken(clientId);
  const folderId = await googleDriveService.ensureBackupFolder(accessToken);
  const backup = await buildBackup();
  const filename = `expense-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;

  await googleDriveService.uploadBackupFile(accessToken, folderId, filename, JSON.stringify(backup, null, 2));
  await useAppStore.getState().updateSettings({ lastCloudBackupAt: new Date().toISOString() });
}

/**
 * Called once per app launch. Silently backs up if auto-backup is on, Drive is
 * connected, and the configured interval has elapsed since the last backup.
 */
export async function maybeRunAutoBackup(): Promise<void> {
  const { settings } = useAppStore.getState();
  if (!settings.cloudBackupEnabled) return;

  const connected = await isCloudBackupConnected();
  if (!connected) return;

  const intervalMs = settings.cloudBackupIntervalDays * 24 * 60 * 60 * 1000;
  const lastBackupMs = settings.lastCloudBackupAt ? new Date(settings.lastCloudBackupAt).getTime() : 0;
  if (Date.now() - lastBackupMs < intervalMs) return;

  try {
    await backupNow();
  } catch {
    // Auto-backup fails silently; the user can retry manually from Settings > Cloud Backup.
  }
}

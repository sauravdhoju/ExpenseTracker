/**
 * Google Drive backup requires an OAuth Client ID from a Google Cloud project.
 * Steps to get one:
 *  1. Go to console.cloud.google.com -> create (or pick) a project.
 *  2. APIs & Services -> Library -> enable "Google Drive API".
 *  3. APIs & Services -> Credentials -> Create Credentials -> OAuth client ID.
 *     - Type "Android": package name `com.sauravdhoju.expensetracker` (see app.json),
 *       SHA-1 from your debug/release signing certificate.
 *     - Type "iOS": bundle identifier (add `ios.bundleIdentifier` to app.json first if missing).
 *  4. Paste the client ID(s) below. No client secret is needed for these client types.
 *
 * Until a client ID is set, Cloud Backup shows as "not configured" in the app.
 */
export const GOOGLE_OAUTH_CLIENT_ID_ANDROID =
  '467404006802-rvn3sqo145gheh4oi7m528burpf8aemu.apps.googleusercontent.com';
export const GOOGLE_OAUTH_CLIENT_ID_IOS = '';

export const GOOGLE_DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];
export const GOOGLE_DRIVE_BACKUP_FOLDER_NAME = 'ExpenseTracker Backups';

export const BACKUP_INTERVAL_OPTIONS = [
  { label: 'Weekly', days: 7 },
  { label: 'Every 2 weeks', days: 14 },
  { label: 'Monthly', days: 30 },
  { label: 'Every 3 months', days: 90 },
] as const;

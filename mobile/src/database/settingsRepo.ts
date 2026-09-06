import { getDb } from './db';
import type { AppSettings } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'NPR',
  themeMode: 'system',
  onboardingComplete: false,
  notificationsEnabled: true,
  hideBalances: false,
};

export async function getSetting<K extends keyof AppSettings>(
  key: K
): Promise<AppSettings[K] | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );
  if (!row) return null;
  return JSON.parse(row.value) as AppSettings[K];
}

export async function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value)
  );
}

export async function getAllSettings(): Promise<AppSettings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  const result: AppSettings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    (result as any)[row.key] = JSON.parse(row.value);
  }
  return result;
}

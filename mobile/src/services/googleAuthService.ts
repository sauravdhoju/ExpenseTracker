import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'google_drive_refresh_token';
const ACCESS_TOKEN_KEY = 'google_drive_access_token';
const ACCESS_TOKEN_EXPIRY_KEY = 'google_drive_access_token_expiry';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

interface SaveTokensInput {
  refreshToken?: string | null;
  accessToken: string;
  expiresInSec: number;
}

export async function saveTokens({ refreshToken, accessToken, expiresInSec }: SaveTokensInput) {
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(ACCESS_TOKEN_EXPIRY_KEY, String(Date.now() + expiresInSec * 1000));
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(ACCESS_TOKEN_EXPIRY_KEY),
  ]);
}

export async function isConnected(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  return !!token;
}

async function refreshAccessToken(clientId: string): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error('Google Drive is not connected.');
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to refresh Google access token (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in?: number };
  await saveTokens({ accessToken: json.access_token, expiresInSec: json.expires_in ?? 3600 });
  return json.access_token;
}

export async function getValidAccessToken(clientId: string): Promise<string> {
  const [accessToken, expiryRaw] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(ACCESS_TOKEN_EXPIRY_KEY),
  ]);

  const expiry = expiryRaw ? Number(expiryRaw) : 0;
  if (accessToken && expiry - Date.now() > 60_000) {
    return accessToken;
  }

  return refreshAccessToken(clientId);
}

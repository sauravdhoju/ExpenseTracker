import { GOOGLE_DRIVE_BACKUP_FOLDER_NAME } from '../constants/googleAuthConfig';

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

async function driveFetch(url: string, accessToken: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google Drive request failed (${res.status}): ${text}`);
  }
  return res.json();
}

/** Finds the app's backup folder in the user's Drive, creating it if it doesn't exist yet. */
export async function ensureBackupFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(
    `name='${GOOGLE_DRIVE_BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const listResult = await driveFetch(
    `${DRIVE_FILES_URL}?q=${query}&fields=files(id,name)&spaces=drive`,
    accessToken
  );
  if (listResult.files?.length) {
    return listResult.files[0].id as string;
  }

  const created = await driveFetch(DRIVE_FILES_URL, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: GOOGLE_DRIVE_BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  return created.id as string;
}

/** Uploads a JSON backup into the given Drive folder and returns the new file's id. */
export async function uploadBackupFile(
  accessToken: string,
  folderId: string,
  filename: string,
  jsonContent: string
): Promise<string> {
  const boundary = 'etracko-backup-boundary';
  const metadata = { name: filename, parents: [folderId], mimeType: 'application/json' };
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${jsonContent}\r\n` +
    `--${boundary}--`;

  const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to upload backup to Google Drive (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { id: string };
  return json.id;
}

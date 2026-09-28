import { getDb } from './db';
import { generateId } from '../utils/id';
import type {
  AccountMapping,
  AutomationSource,
  Confidence,
  DetectedTransaction,
  DetectionStatus,
  MerchantRule,
} from '../automation/types';

interface DetectedRow {
  id: string;
  event_id: string;
  source: AutomationSource;
  sender: string;
  raw_text: string;
  kind: DetectedTransaction['kind'];
  amount: number;
  currency: string | null;
  account_hint: string | null;
  account_id: string | null;
  channel: string | null;
  merchant: string | null;
  reference: string | null;
  date: string;
  time: string;
  received_at: number;
  confidence: Confidence;
  category_id: string | null;
  status: DetectionStatus;
  transaction_id: string | null;
  duplicate_of: string | null;
  created_at: string;
  updated_at: string;
}

function mapDetected(row: DetectedRow): DetectedTransaction {
  return {
    id: row.id,
    eventId: row.event_id,
    source: row.source,
    sender: row.sender,
    rawText: row.raw_text,
    kind: row.kind,
    amount: row.amount,
    currency: row.currency,
    accountHint: row.account_hint,
    accountId: row.account_id,
    channel: row.channel,
    merchant: row.merchant,
    reference: row.reference,
    date: row.date,
    time: row.time,
    receivedAt: row.received_at,
    confidence: row.confidence,
    categoryId: row.category_id,
    status: row.status,
    transactionId: row.transaction_id,
    duplicateOf: row.duplicate_of,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateDetectedInput = Omit<DetectedTransaction, 'id' | 'createdAt' | 'updatedAt'>;

export async function insertDetected(input: CreateDetectedInput): Promise<DetectedTransaction> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO detected_transactions
       (id, event_id, source, sender, raw_text, kind, amount, currency, account_hint, account_id, channel, merchant,
        reference, date, time, received_at, confidence, category_id, status, transaction_id, duplicate_of, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.eventId,
    input.source,
    input.sender,
    input.rawText,
    input.kind,
    input.amount,
    input.currency,
    input.accountHint,
    input.accountId,
    input.channel,
    input.merchant,
    input.reference,
    input.date,
    input.time,
    input.receivedAt,
    input.confidence,
    input.categoryId,
    input.status,
    input.transactionId,
    input.duplicateOf,
    now,
    now
  );
  return { ...input, id, createdAt: now, updatedAt: now };
}

export async function eventExists(eventId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM detected_transactions WHERE event_id = ?',
    eventId
  );
  return !!row;
}

export async function getDetectedById(id: string): Promise<DetectedTransaction | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DetectedRow>('SELECT * FROM detected_transactions WHERE id = ?', id);
  return row ? mapDetected(row) : null;
}

export async function getDetectedByTransactionId(transactionId: string): Promise<DetectedTransaction | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DetectedRow>(
    'SELECT * FROM detected_transactions WHERE transaction_id = ?',
    transactionId
  );
  return row ? mapDetected(row) : null;
}

/** Records that could be the "other half" of a new event: everything except ignored/undone ones. */
export async function getDedupeCandidates(fromMs: number, toMs: number, amount: number): Promise<DetectedTransaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DetectedRow>(
    `SELECT * FROM detected_transactions
     WHERE status IN ('confirmed', 'pending')
       AND ABS(amount - ?) < 0.01
       AND ((received_at BETWEEN ? AND ?) OR reference IS NOT NULL)
     ORDER BY received_at DESC
     LIMIT 50`,
    amount,
    fromMs,
    toMs
  );
  return rows.map(mapDetected);
}

export async function getPendingDetections(): Promise<DetectedTransaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DetectedRow>(
    "SELECT * FROM detected_transactions WHERE status = 'pending' ORDER BY received_at DESC"
  );
  return rows.map(mapDetected);
}

export async function updateDetected(
  id: string,
  patch: Partial<
    Pick<DetectedTransaction, 'status' | 'transactionId' | 'accountId' | 'categoryId' | 'merchant' | 'channel' | 'reference'>
  >
): Promise<void> {
  const columns: Record<string, string> = {
    status: 'status',
    transactionId: 'transaction_id',
    accountId: 'account_id',
    categoryId: 'category_id',
    merchant: 'merchant',
    channel: 'channel',
    reference: 'reference',
  };
  // `undefined` means "leave unchanged"; pass `null` to clear a column.
  const entries = Object.entries(patch).filter(([key, value]) => key in columns && value !== undefined);
  if (entries.length === 0) return;
  const db = await getDb();
  await db.runAsync(
    `UPDATE detected_transactions SET ${entries.map(([key]) => `${columns[key]} = ?`).join(', ')}, updated_at = ? WHERE id = ?`,
    ...entries.map(([, value]) => (value ?? null) as string | null),
    new Date().toISOString(),
    id
  );
}

/** Clears finished detection history (confirmed/ignored/duplicate/undone); pending review items are kept. */
export async function clearDetectionHistory(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM detected_transactions WHERE status != 'pending'");
}

// ---- Account mappings -------------------------------------------------------------------------

export function accountIdentifier(accountHint: string): string {
  return `acct:${accountHint}`;
}

export function sourceIdentifier(source: AutomationSource, sender: string): string {
  return `${source === 'sms' ? 'sender' : 'app'}:${sender.trim().toLowerCase()}`;
}

export async function getAllAccountMappings(): Promise<AccountMapping[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; identifier: string; account_id: string; created_at: string }>(
    'SELECT * FROM automation_account_mappings ORDER BY created_at ASC'
  );
  return rows.map((r) => ({ id: r.id, identifier: r.identifier, accountId: r.account_id, createdAt: r.created_at }));
}

export async function findMappedAccountId(identifiers: string[]): Promise<string | null> {
  if (identifiers.length === 0) return null;
  const db = await getDb();
  for (const identifier of identifiers) {
    const row = await db.getFirstAsync<{ account_id: string }>(
      `SELECT m.account_id FROM automation_account_mappings m
       JOIN accounts a ON a.id = m.account_id
       WHERE m.identifier = ? AND a.is_active = 1`,
      identifier
    );
    if (row) return row.account_id;
  }
  return null;
}

export async function upsertAccountMapping(identifier: string, accountId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO automation_account_mappings (id, identifier, account_id, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(identifier) DO UPDATE SET account_id = excluded.account_id`,
    generateId(),
    identifier,
    accountId,
    new Date().toISOString()
  );
}

export async function deleteAccountMapping(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM automation_account_mappings WHERE id = ?', id);
}

// ---- Merchant -> category rules (learned from user corrections) ------------------------------

export async function getAllMerchantRules(): Promise<MerchantRule[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ merchant_key: string; merchant: string; category_id: string; updated_at: string }>(
    'SELECT * FROM automation_merchant_rules ORDER BY merchant ASC'
  );
  return rows.map((r) => ({
    merchantKey: r.merchant_key,
    merchant: r.merchant,
    categoryId: r.category_id,
    updatedAt: r.updated_at,
  }));
}

export async function getMerchantRuleCategory(merchantKey: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ category_id: string }>(
    'SELECT category_id FROM automation_merchant_rules WHERE merchant_key = ?',
    merchantKey
  );
  return row?.category_id ?? null;
}

export async function upsertMerchantRule(merchantKey: string, merchant: string, categoryId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO automation_merchant_rules (merchant_key, merchant, category_id, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(merchant_key) DO UPDATE SET merchant = excluded.merchant, category_id = excluded.category_id,
       updated_at = excluded.updated_at`,
    merchantKey,
    merchant,
    categoryId,
    new Date().toISOString()
  );
}

export async function deleteMerchantRule(merchantKey: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM automation_merchant_rules WHERE merchant_key = ?', merchantKey);
}

/** "Clear Automation Rules": forgets every account mapping and learned merchant category. */
export async function clearAutomationRules(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM automation_account_mappings; DELETE FROM automation_merchant_rules;');
}

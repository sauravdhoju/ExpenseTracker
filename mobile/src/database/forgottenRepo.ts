import { getDb } from './db';
import { generateId } from '../utils/id';
import type { ForgottenEntry } from '../types';

interface ForgottenEntryRow {
  id: string;
  amount: number;
  date: string;
  account_id: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ForgottenEntryRow): ForgottenEntry {
  return {
    id: row.id,
    amount: row.amount,
    date: row.date,
    accountId: row.account_id,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllForgottenEntries(): Promise<ForgottenEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ForgottenEntryRow>(
    'SELECT * FROM forgotten_entries ORDER BY date DESC, created_at DESC'
  );
  return rows.map(mapRow);
}

export interface CreateForgottenEntryInput {
  amount: number;
  date: string;
  accountId: string;
  note?: string | null;
}

export async function createForgottenEntry(input: CreateForgottenEntryInput): Promise<ForgottenEntry> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO forgotten_entries (id, amount, date, account_id, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.amount,
    input.date,
    input.accountId,
    input.note ?? null,
    now,
    now
  );
  return {
    id,
    amount: input.amount,
    date: input.date,
    accountId: input.accountId,
    note: input.note ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function deleteForgottenEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM forgotten_entries WHERE id = ?', id);
}

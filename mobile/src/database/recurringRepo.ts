import { getDb } from './db';
import { generateId } from '../utils/id';
import type { RecurringFrequency, RecurringTransaction } from '../types';

interface RecurringRow {
  id: string;
  type: 'expense' | 'income';
  title: string;
  amount: number;
  account_id: string;
  category_id: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_occurrence: string;
  reminder_days: number;
  is_active: number;
  created_at: string;
}

function mapRow(row: RecurringRow): RecurringTransaction {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    amount: row.amount,
    accountId: row.account_id,
    categoryId: row.category_id,
    frequency: row.frequency,
    startDate: row.start_date,
    endDate: row.end_date,
    nextOccurrence: row.next_occurrence,
    reminderDays: row.reminder_days,
    isActive: !!row.is_active,
    createdAt: row.created_at,
  };
}

export async function getAllRecurring(): Promise<RecurringTransaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RecurringRow>(
    'SELECT * FROM recurring_transactions ORDER BY next_occurrence ASC'
  );
  return rows.map(mapRow);
}

export interface CreateRecurringInput {
  type: 'expense' | 'income';
  title: string;
  amount: number;
  accountId: string;
  categoryId: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string | null;
  reminderDays?: number;
}

export async function createRecurring(
  input: CreateRecurringInput
): Promise<RecurringTransaction> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO recurring_transactions
       (id, type, title, amount, account_id, category_id, frequency, start_date, end_date, next_occurrence, reminder_days, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    id,
    input.type,
    input.title,
    input.amount,
    input.accountId,
    input.categoryId,
    input.frequency,
    input.startDate,
    input.endDate ?? null,
    input.startDate,
    input.reminderDays ?? 1,
    now
  );
  return {
    id,
    type: input.type,
    title: input.title,
    amount: input.amount,
    accountId: input.accountId,
    categoryId: input.categoryId,
    frequency: input.frequency,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    nextOccurrence: input.startDate,
    reminderDays: input.reminderDays ?? 1,
    isActive: true,
    createdAt: now,
  };
}

export async function updateNextOccurrence(id: string, nextOccurrence: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE recurring_transactions SET next_occurrence = ? WHERE id = ?',
    nextOccurrence,
    id
  );
}

export async function setRecurringActive(id: string, isActive: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE recurring_transactions SET is_active = ? WHERE id = ?',
    isActive ? 1 : 0,
    id
  );
}

export async function deleteRecurring(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM recurring_transactions WHERE id = ?', id);
}

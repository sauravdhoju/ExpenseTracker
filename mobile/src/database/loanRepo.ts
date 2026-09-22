import { getDb } from './db';
import { generateId } from '../utils/id';
import type { Loan } from '../types';

interface LoanRow {
  id: string;
  person_name: string;
  original_amount: number;
  lent_date: string;
  expected_return_date: string | null;
  reason: string | null;
  note: string | null;
  account_id: string;
  reminder_enabled: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: LoanRow): Loan {
  return {
    id: row.id,
    personName: row.person_name,
    originalAmount: row.original_amount,
    lentDate: row.lent_date,
    expectedReturnDate: row.expected_return_date,
    reason: row.reason,
    note: row.note,
    accountId: row.account_id,
    reminderEnabled: !!row.reminder_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllLoans(): Promise<Loan[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LoanRow>('SELECT * FROM loans ORDER BY lent_date DESC, created_at DESC');
  return rows.map(mapRow);
}

export async function getLoanById(id: string): Promise<Loan | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<LoanRow>('SELECT * FROM loans WHERE id = ?', id);
  return row ? mapRow(row) : null;
}

export interface CreateLoanInput {
  personName: string;
  originalAmount: number;
  lentDate: string;
  expectedReturnDate?: string | null;
  reason?: string | null;
  note?: string | null;
  accountId: string;
  reminderEnabled?: boolean;
}

export async function createLoan(input: CreateLoanInput): Promise<Loan> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  const reminderEnabled = input.reminderEnabled ?? true;
  await db.runAsync(
    `INSERT INTO loans
       (id, person_name, original_amount, lent_date, expected_return_date, reason, note, account_id, reminder_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.personName,
    input.originalAmount,
    input.lentDate,
    input.expectedReturnDate ?? null,
    input.reason ?? null,
    input.note ?? null,
    input.accountId,
    reminderEnabled ? 1 : 0,
    now,
    now
  );
  return {
    id,
    personName: input.personName,
    originalAmount: input.originalAmount,
    lentDate: input.lentDate,
    expectedReturnDate: input.expectedReturnDate ?? null,
    reason: input.reason ?? null,
    note: input.note ?? null,
    accountId: input.accountId,
    reminderEnabled,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateLoan(id: string, input: CreateLoanInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE loans SET
       person_name = ?, original_amount = ?, lent_date = ?, expected_return_date = ?,
       reason = ?, note = ?, account_id = ?, reminder_enabled = ?, updated_at = ?
     WHERE id = ?`,
    input.personName,
    input.originalAmount,
    input.lentDate,
    input.expectedReturnDate ?? null,
    input.reason ?? null,
    input.note ?? null,
    input.accountId,
    (input.reminderEnabled ?? true) ? 1 : 0,
    new Date().toISOString(),
    id
  );
}

export async function deleteLoan(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM loans WHERE id = ?', id);
}

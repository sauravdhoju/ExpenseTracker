import { getDb } from './db';
import { generateId } from '../utils/id';
import { adjustAccountBalance } from './accountRepo';
import type { Transaction, TransactionType } from '../types';

interface TransactionRow {
  id: string;
  type: TransactionType;
  amount: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  title: string;
  notes: string | null;
  date: string;
  time: string;
  recurring_id: string | null;
  loan_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    accountId: row.account_id,
    toAccountId: row.to_account_id,
    categoryId: row.category_id,
    title: row.title,
    notes: row.notes,
    date: row.date,
    time: row.time,
    recurringId: row.recurring_id,
    loanId: row.loan_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TransactionRow>(
    'SELECT * FROM transactions ORDER BY date DESC, created_at DESC'
  );
  return rows.map(mapRow);
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TransactionRow>(
    'SELECT * FROM transactions WHERE id = ?',
    id
  );
  return row ? mapRow(row) : null;
}

export interface CreateTransactionInput {
  id?: string; // allows a caller to link this transaction's id to another entity (e.g. a loan/repayment row)
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  title: string;
  notes?: string | null;
  date: string;
  time?: string;
  recurringId?: string | null;
  loanId?: string | null;
}

function currentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

async function applyBalanceEffect(t: {
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId: string | null;
}) {
  if (t.type === 'expense' || t.type === 'lent') {
    await adjustAccountBalance(t.accountId, -t.amount);
  } else if (t.type === 'income' || t.type === 'repayment') {
    await adjustAccountBalance(t.accountId, t.amount);
  } else if (t.type === 'transfer' && t.toAccountId) {
    await adjustAccountBalance(t.accountId, -t.amount);
    await adjustAccountBalance(t.toAccountId, t.amount);
  }
}

async function reverseBalanceEffect(t: {
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId: string | null;
}) {
  if (t.type === 'expense' || t.type === 'lent') {
    await adjustAccountBalance(t.accountId, t.amount);
  } else if (t.type === 'income' || t.type === 'repayment') {
    await adjustAccountBalance(t.accountId, -t.amount);
  } else if (t.type === 'transfer' && t.toAccountId) {
    await adjustAccountBalance(t.accountId, t.amount);
    await adjustAccountBalance(t.toAccountId, -t.amount);
  }
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<Transaction> {
  const db = await getDb();
  const id = input.id ?? generateId();
  const now = new Date().toISOString();
  const time = input.time ?? currentTime();

  await db.runAsync(
    `INSERT INTO transactions
       (id, type, amount, account_id, to_account_id, category_id, title, notes, date, time, recurring_id, loan_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.type,
    input.amount,
    input.accountId,
    input.toAccountId ?? null,
    input.categoryId ?? null,
    input.title,
    input.notes ?? null,
    input.date,
    time,
    input.recurringId ?? null,
    input.loanId ?? null,
    now,
    now
  );

  await applyBalanceEffect({
    type: input.type,
    amount: input.amount,
    accountId: input.accountId,
    toAccountId: input.toAccountId ?? null,
  });

  return {
    id,
    type: input.type,
    amount: input.amount,
    accountId: input.accountId,
    toAccountId: input.toAccountId ?? null,
    categoryId: input.categoryId ?? null,
    title: input.title,
    notes: input.notes ?? null,
    date: input.date,
    time,
    recurringId: input.recurringId ?? null,
    loanId: input.loanId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateTransaction(
  id: string,
  input: CreateTransactionInput
): Promise<void> {
  const existing = await getTransactionById(id);
  if (!existing) throw new Error('Transaction not found');

  const db = await getDb();

  await reverseBalanceEffect(existing);

  await db.runAsync(
    `UPDATE transactions SET
       type = ?, amount = ?, account_id = ?, to_account_id = ?, category_id = ?,
       title = ?, notes = ?, date = ?, updated_at = ?
     WHERE id = ?`,
    input.type,
    input.amount,
    input.accountId,
    input.toAccountId ?? null,
    input.categoryId ?? null,
    input.title,
    input.notes ?? null,
    input.date,
    new Date().toISOString(),
    id
  );

  await applyBalanceEffect({
    type: input.type,
    amount: input.amount,
    accountId: input.accountId,
    toAccountId: input.toAccountId ?? null,
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  const existing = await getTransactionById(id);
  if (!existing) return;
  const db = await getDb();
  await reverseBalanceEffect(existing);
  await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
}

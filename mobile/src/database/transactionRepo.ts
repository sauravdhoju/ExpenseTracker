import { getDb } from './db';
import { generateId } from '../utils/id';
import { adjustAccountBalance } from './accountRepo';
import { FEES_CATEGORY_NAME } from '../constants/categories';
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
  forgotten_id: string | null;
  affects_balance: number;
  parent_id: string | null;
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
    forgottenId: row.forgotten_id,
    affectsBalance: !!row.affects_balance,
    parentId: row.parent_id ?? null,
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
  forgottenId?: string | null;
  /** false skips the balance effect entirely — used for a forgotten-money resolution, where the
   *  balance was already debited by the original `forgotten` transaction. Defaults to true. */
  affectsBalance?: boolean;
  /** Transfers only: the service charge the sending account paid on top of `amount`. It is saved as a
   *  separate expense (category "Fees & Charges") linked back to the transfer. On update, leaving it
   *  undefined keeps the current charge. */
  fee?: number;
  parentId?: string | null;
}

function currentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

async function applyBalanceEffect(t: {
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  affectsBalance: boolean;
}) {
  if (!t.affectsBalance) return;
  if (t.type === 'expense' || t.type === 'lent' || t.type === 'forgotten') {
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
  affectsBalance: boolean;
}) {
  if (!t.affectsBalance) return;
  if (t.type === 'expense' || t.type === 'lent' || t.type === 'forgotten') {
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
  const affectsBalance = input.affectsBalance ?? true;

  await db.runAsync(
    `INSERT INTO transactions
       (id, type, amount, account_id, to_account_id, category_id, title, notes, date, time, recurring_id, loan_id, forgotten_id, affects_balance, parent_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    input.forgottenId ?? null,
    affectsBalance ? 1 : 0,
    input.parentId ?? null,
    now,
    now
  );

  await applyBalanceEffect({
    type: input.type,
    amount: input.amount,
    accountId: input.accountId,
    toAccountId: input.toAccountId ?? null,
    affectsBalance,
  });

  if (input.type === 'transfer' && input.fee && input.fee > 0) {
    await syncTransferFee(id, { accountId: input.accountId, date: input.date, time, fee: input.fee });
  }

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
    forgottenId: input.forgottenId ?? null,
    affectsBalance,
    parentId: input.parentId ?? null,
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

  const affectsBalance = input.affectsBalance ?? existing.affectsBalance;

  await db.runAsync(
    `UPDATE transactions SET
       type = ?, amount = ?, account_id = ?, to_account_id = ?, category_id = ?,
       title = ?, notes = ?, date = ?, affects_balance = ?, updated_at = ?
     WHERE id = ?`,
    input.type,
    input.amount,
    input.accountId,
    input.toAccountId ?? null,
    input.categoryId ?? null,
    input.title,
    input.notes ?? null,
    input.date,
    affectsBalance ? 1 : 0,
    new Date().toISOString(),
    id
  );

  await applyBalanceEffect({
    type: input.type,
    amount: input.amount,
    accountId: input.accountId,
    toAccountId: input.toAccountId ?? null,
    affectsBalance,
  });

  if (input.type !== 'transfer') {
    await syncTransferFee(id, null);
  } else if (input.fee !== undefined) {
    await syncTransferFee(id, { accountId: input.accountId, date: input.date, time: existing.time, fee: input.fee });
  } else {
    // Charge unchanged, but keep it on the same account and date as the transfer.
    const fee = await getFeeTransaction(id);
    if (fee) await syncTransferFee(id, { accountId: input.accountId, date: input.date, time: existing.time, fee: fee.amount });
  }
}

async function getFeeTransaction(parentId: string): Promise<Transaction | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TransactionRow>('SELECT * FROM transactions WHERE parent_id = ?', parentId);
  return row ? mapRow(row) : null;
}

async function getFeesCategoryId(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM categories WHERE name = ? AND kind = 'expense'",
    FEES_CATEGORY_NAME
  );
  return row?.id ?? null;
}

/** Creates, updates or removes the service-charge expense that belongs to a transfer. */
async function syncTransferFee(
  parentId: string,
  fee: { accountId: string; date: string; time: string; fee: number } | null
): Promise<void> {
  const existing = await getFeeTransaction(parentId);
  if (!fee || !(fee.fee > 0)) {
    if (existing) await deleteTransaction(existing.id);
    return;
  }
  if (existing) {
    await updateTransaction(existing.id, {
      type: 'expense',
      amount: fee.fee,
      accountId: fee.accountId,
      categoryId: existing.categoryId,
      title: existing.title,
      notes: existing.notes,
      date: fee.date,
    });
    return;
  }
  await createTransaction({
    type: 'expense',
    amount: fee.fee,
    accountId: fee.accountId,
    categoryId: await getFeesCategoryId(),
    title: 'Transfer service charge',
    date: fee.date,
    time: fee.time,
    parentId,
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  const existing = await getTransactionById(id);
  if (!existing) return;
  const db = await getDb();
  const fee = await getFeeTransaction(id);
  if (fee) await deleteTransaction(fee.id);
  await reverseBalanceEffect(existing);
  await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
}

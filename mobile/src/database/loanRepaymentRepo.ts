import { getDb } from './db';
import { generateId } from '../utils/id';
import type { LoanRepayment } from '../types';

interface LoanRepaymentRow {
  id: string;
  loan_id: string;
  amount: number;
  date: string;
  account_id: string;
  note: string | null;
  created_at: string;
}

function mapRow(row: LoanRepaymentRow): LoanRepayment {
  return {
    id: row.id,
    loanId: row.loan_id,
    amount: row.amount,
    date: row.date,
    accountId: row.account_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function getAllRepayments(): Promise<LoanRepayment[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LoanRepaymentRow>(
    'SELECT * FROM loan_repayments ORDER BY date DESC, created_at DESC'
  );
  return rows.map(mapRow);
}

export async function getRepaymentsForLoan(loanId: string): Promise<LoanRepayment[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LoanRepaymentRow>(
    'SELECT * FROM loan_repayments WHERE loan_id = ? ORDER BY date DESC, created_at DESC',
    loanId
  );
  return rows.map(mapRow);
}

export interface CreateRepaymentInput {
  loanId: string;
  amount: number;
  date: string;
  accountId: string;
  note?: string | null;
}

export async function createRepayment(input: CreateRepaymentInput): Promise<LoanRepayment> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO loan_repayments (id, loan_id, amount, date, account_id, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.loanId,
    input.amount,
    input.date,
    input.accountId,
    input.note ?? null,
    now
  );
  return {
    id,
    loanId: input.loanId,
    amount: input.amount,
    date: input.date,
    accountId: input.accountId,
    note: input.note ?? null,
    createdAt: now,
  };
}

export async function deleteRepayment(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM loan_repayments WHERE id = ?', id);
}

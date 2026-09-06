import { getDb } from './db';
import { generateId } from '../utils/id';
import type { Bill } from '../types';

interface BillRow {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  is_paid: number;
  recurring_id: string | null;
  created_at: string;
}

function mapRow(row: BillRow): Bill {
  return {
    id: row.id,
    title: row.title,
    amount: row.amount,
    dueDate: row.due_date,
    isPaid: !!row.is_paid,
    recurringId: row.recurring_id,
    createdAt: row.created_at,
  };
}

export async function getAllBills(): Promise<Bill[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BillRow>(
    'SELECT * FROM bills ORDER BY due_date ASC'
  );
  return rows.map(mapRow);
}

export interface CreateBillInput {
  title: string;
  amount: number;
  dueDate: string;
  recurringId?: string | null;
}

export async function createBill(input: CreateBillInput): Promise<Bill> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO bills (id, title, amount, due_date, is_paid, recurring_id, created_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    id,
    input.title,
    input.amount,
    input.dueDate,
    input.recurringId ?? null,
    now
  );
  return {
    id,
    title: input.title,
    amount: input.amount,
    dueDate: input.dueDate,
    isPaid: false,
    recurringId: input.recurringId ?? null,
    createdAt: now,
  };
}

export async function setBillPaid(id: string, isPaid: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE bills SET is_paid = ? WHERE id = ?', isPaid ? 1 : 0, id);
}

export async function deleteBill(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM bills WHERE id = ?', id);
}

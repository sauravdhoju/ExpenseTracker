import { getDb } from './db';
import { generateId } from '../utils/id';
import type { Budget, BudgetPeriod } from '../types';

interface BudgetRow {
  id: string;
  category_id: string | null;
  amount: number;
  period: BudgetPeriod;
  created_at: string;
}

function mapRow(row: BudgetRow): Budget {
  return {
    id: row.id,
    categoryId: row.category_id,
    amount: row.amount,
    period: row.period,
    createdAt: row.created_at,
  };
}

export async function getAllBudgets(): Promise<Budget[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BudgetRow>(
    'SELECT * FROM budgets ORDER BY created_at ASC'
  );
  return rows.map(mapRow);
}

export interface CreateBudgetInput {
  categoryId: string | null;
  amount: number;
  period: BudgetPeriod;
}

export async function upsertBudget(input: CreateBudgetInput): Promise<Budget> {
  const db = await getDb();
  const existing = await db.getFirstAsync<BudgetRow>(
    input.categoryId
      ? 'SELECT * FROM budgets WHERE category_id = ?'
      : 'SELECT * FROM budgets WHERE category_id IS NULL',
    ...(input.categoryId ? [input.categoryId] : [])
  );

  if (existing) {
    await db.runAsync(
      'UPDATE budgets SET amount = ?, period = ? WHERE id = ?',
      input.amount,
      input.period,
      existing.id
    );
    return { ...mapRow(existing), amount: input.amount, period: input.period };
  }

  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO budgets (id, category_id, amount, period, created_at) VALUES (?, ?, ?, ?, ?)',
    id,
    input.categoryId,
    input.amount,
    input.period,
    now
  );
  return { id, categoryId: input.categoryId, amount: input.amount, period: input.period, createdAt: now };
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM budgets WHERE id = ?', id);
}

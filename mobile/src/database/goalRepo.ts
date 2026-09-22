import { getDb } from './db';
import { generateId } from '../utils/id';
import type { Goal } from '../types';

interface GoalRow {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount,
    targetDate: row.target_date,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllGoals(): Promise<Goal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<GoalRow>(
    'SELECT * FROM goals ORDER BY created_at ASC'
  );
  return rows.map(mapRow);
}

export interface CreateGoalInput {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string | null;
  icon: string;
  color: string;
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO goals (id, name, target_amount, current_amount, target_date, icon, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    input.targetAmount,
    input.currentAmount ?? 0,
    input.targetDate ?? null,
    input.icon,
    input.color,
    now,
    now
  );
  return {
    id,
    name: input.name,
    targetAmount: input.targetAmount,
    currentAmount: input.currentAmount ?? 0,
    targetDate: input.targetDate ?? null,
    icon: input.icon,
    color: input.color,
    createdAt: now,
    updatedAt: now,
  };
}

export async function contributeToGoal(id: string, amount: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE goals SET current_amount = current_amount + ?, updated_at = ? WHERE id = ?',
    amount,
    new Date().toISOString(),
    id
  );
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM goals WHERE id = ?', id);
}

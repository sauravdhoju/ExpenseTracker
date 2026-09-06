import { getDb } from './db';
import { generateId } from '../utils/id';
import type { Shortcut } from '../types';

interface ShortcutRow {
  id: string;
  label: string;
  type: 'expense' | 'income';
  amount: number;
  category_id: string | null;
  account_id: string;
  sort_order: number;
  created_at: string;
}

function mapRow(row: ShortcutRow): Shortcut {
  return {
    id: row.id,
    label: row.label,
    type: row.type,
    amount: row.amount,
    categoryId: row.category_id,
    accountId: row.account_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function getAllShortcuts(): Promise<Shortcut[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ShortcutRow>(
    'SELECT * FROM shortcuts ORDER BY sort_order ASC, created_at ASC'
  );
  return rows.map(mapRow);
}

export interface CreateShortcutInput {
  label: string;
  type: 'expense' | 'income';
  amount: number;
  categoryId: string | null;
  accountId: string;
}

export async function createShortcut(input: CreateShortcutInput): Promise<Shortcut> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  const maxRow = await db.getFirstAsync<{ maxOrder: number | null }>(
    'SELECT MAX(sort_order) as maxOrder FROM shortcuts'
  );
  const sortOrder = (maxRow?.maxOrder ?? -1) + 1;

  await db.runAsync(
    `INSERT INTO shortcuts (id, label, type, amount, category_id, account_id, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.label,
    input.type,
    input.amount,
    input.categoryId,
    input.accountId,
    sortOrder,
    now
  );

  return {
    id,
    label: input.label,
    type: input.type,
    amount: input.amount,
    categoryId: input.categoryId,
    accountId: input.accountId,
    sortOrder,
    createdAt: now,
  };
}

export async function updateShortcut(id: string, input: CreateShortcutInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE shortcuts SET label = ?, type = ?, amount = ?, category_id = ?, account_id = ? WHERE id = ?`,
    input.label,
    input.type,
    input.amount,
    input.categoryId,
    input.accountId,
    id
  );
}

export async function deleteShortcut(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM shortcuts WHERE id = ?', id);
}

export async function reorderShortcuts(orderedIds: string[]): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.runAsync('UPDATE shortcuts SET sort_order = ? WHERE id = ?', i, orderedIds[i]);
  }
}

import { getDb } from './db';
import { generateId } from '../utils/id';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import type { Category, CategoryKind } from '../types';

interface CategoryRow {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  is_default: number;
  is_enabled: number;
  created_at: string;
}

function mapRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    icon: row.icon,
    color: row.color,
    isDefault: !!row.is_default,
    isEnabled: !!row.is_enabled,
    createdAt: row.created_at,
  };
}

/** Removes duplicate categories (same name+kind) left over by earlier double-seeding, keeping one row and re-pointing any references to it. */
export async function dedupeCategories(): Promise<void> {
  const db = await getDb();
  const groups = await db.getAllAsync<{ keepId: string; name: string; kind: CategoryKind }>(
    'SELECT MIN(id) as keepId, name, kind FROM categories GROUP BY name, kind HAVING COUNT(*) > 1'
  );
  for (const group of groups) {
    const duplicates = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM categories WHERE name = ? AND kind = ? AND id != ?',
      group.name,
      group.kind,
      group.keepId
    );
    for (const dup of duplicates) {
      await db.runAsync('UPDATE transactions SET category_id = ? WHERE category_id = ?', group.keepId, dup.id);
      await db.runAsync('UPDATE budgets SET category_id = ? WHERE category_id = ?', group.keepId, dup.id);
      await db.runAsync('UPDATE recurring_transactions SET category_id = ? WHERE category_id = ?', group.keepId, dup.id);
      await db.runAsync('DELETE FROM categories WHERE id = ?', dup.id);
    }
  }
}

export async function seedDefaultCategories(): Promise<void> {
  const db = await getDb();
  await dedupeCategories();

  const now = new Date().toISOString();
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM categories WHERE name = ? AND kind = ?',
      cat.name,
      cat.kind
    );
    if (existing) continue;

    await db.runAsync(
      `INSERT INTO categories (id, name, kind, icon, color, is_default, is_enabled, created_at)
       VALUES (?, ?, ?, ?, ?, 1, 1, ?)`,
      generateId(),
      cat.name,
      cat.kind,
      cat.icon,
      cat.color,
      now
    );
  }
}

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories ORDER BY name ASC'
  );
  return rows.map(mapRow);
}

export async function getCategoriesByKind(kind: CategoryKind): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories WHERE kind = ? AND is_enabled = 1 ORDER BY name ASC',
    kind
  );
  return rows.map(mapRow);
}

export interface CreateCategoryInput {
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO categories (id, name, kind, icon, color, is_default, is_enabled, created_at)
     VALUES (?, ?, ?, ?, ?, 0, 1, ?)`,
    id,
    input.name,
    input.kind,
    input.icon,
    input.color,
    now
  );
  return {
    id,
    name: input.name,
    kind: input.kind,
    icon: input.icon,
    color: input.color,
    isDefault: false,
    isEnabled: true,
    createdAt: now,
  };
}

export async function setCategoryEnabled(id: string, isEnabled: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE categories SET is_enabled = ? WHERE id = ?',
    isEnabled ? 1 : 0,
    id
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM categories WHERE id = ? AND is_default = 0', id);
}

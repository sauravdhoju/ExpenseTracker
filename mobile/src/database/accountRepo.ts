import { getDb } from './db';
import { generateId } from '../utils/id';
import type { Account, AccountType, CurrencyCode } from '../types';

interface AccountRow {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  initial_balance: number;
  currency: CurrencyCode;
  color: string;
  icon: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balance: row.balance,
    initialBalance: row.initial_balance,
    currency: row.currency,
    color: row.color,
    icon: row.icon,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllAccounts(): Promise<Account[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AccountRow>(
    'SELECT * FROM accounts ORDER BY created_at ASC'
  );
  return rows.map(mapRow);
}

export async function getAccountById(id: string): Promise<Account | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<AccountRow>(
    'SELECT * FROM accounts WHERE id = ?',
    id
  );
  return row ? mapRow(row) : null;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  initialBalance: number;
  currency: CurrencyCode;
  color: string;
  icon: string;
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO accounts (id, name, type, balance, initial_balance, currency, color, icon, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    id,
    input.name,
    input.type,
    input.initialBalance,
    input.initialBalance,
    input.currency,
    input.color,
    input.icon,
    now,
    now
  );
  return {
    id,
    name: input.name,
    type: input.type,
    balance: input.initialBalance,
    initialBalance: input.initialBalance,
    currency: input.currency,
    color: input.color,
    icon: input.icon,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

export async function adjustAccountBalance(id: string, delta: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?',
    delta,
    new Date().toISOString(),
    id
  );
}

export async function setAccountActive(id: string, isActive: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE accounts SET is_active = ?, updated_at = ? WHERE id = ?',
    isActive ? 1 : 0,
    new Date().toISOString(),
    id
  );
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM accounts WHERE id = ?', id);
}

export async function updateAccount(
  id: string,
  input: Partial<Pick<Account, 'name' | 'color' | 'icon' | 'type'>>
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name);
  }
  if (input.color !== undefined) {
    fields.push('color = ?');
    values.push(input.color);
  }
  if (input.icon !== undefined) {
    fields.push('icon = ?');
    values.push(input.icon);
  }
  if (input.type !== undefined) {
    fields.push('type = ?');
    values.push(input.type);
  }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);
  await db.runAsync(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`, ...values);
}

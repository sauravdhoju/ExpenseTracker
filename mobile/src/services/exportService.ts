import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getAllAccounts } from '../database/accountRepo';
import { getAllCategories } from '../database/categoryRepo';
import { getAllTransactions } from '../database/transactionRepo';
import { getAllBudgets } from '../database/budgetRepo';
import { getAllGoals } from '../database/goalRepo';
import { getAllRecurring } from '../database/recurringRepo';
import { getDb, resetDatabase } from '../database/db';

export interface BackupData {
  version: 1;
  exportedAt: string;
  accounts: Awaited<ReturnType<typeof getAllAccounts>>;
  categories: Awaited<ReturnType<typeof getAllCategories>>;
  transactions: Awaited<ReturnType<typeof getAllTransactions>>;
  budgets: Awaited<ReturnType<typeof getAllBudgets>>;
  goals: Awaited<ReturnType<typeof getAllGoals>>;
  recurringTransactions: Awaited<ReturnType<typeof getAllRecurring>>;
}

export async function buildBackup(): Promise<BackupData> {
  const [accounts, categories, transactions, budgets, goals, recurringTransactions] =
    await Promise.all([
      getAllAccounts(),
      getAllCategories(),
      getAllTransactions(),
      getAllBudgets(),
      getAllGoals(),
      getAllRecurring(),
    ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    categories,
    transactions,
    budgets,
    goals,
    recurringTransactions,
  };
}

async function writeAndShare(filename: string, content: string, mimeType: string) {
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Export data' });
  }
  return uri;
}

export async function exportAsJSON(): Promise<string> {
  const backup = await buildBackup();
  const filename = `expense-tracker-backup-${Date.now()}.json`;
  return writeAndShare(filename, JSON.stringify(backup, null, 2), 'application/json');
}

function toCsvRow(values: (string | number | null)[]): string {
  return values
    .map((v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(',');
}

export async function exportTransactionsAsCSV(): Promise<string> {
  const [transactions, categories, accounts] = await Promise.all([
    getAllTransactions(),
    getAllCategories(),
    getAllAccounts(),
  ]);
  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? '';
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '';

  const rows = [
    toCsvRow(['Date', 'Type', 'Title', 'Category', 'Account', 'Amount', 'Notes']),
    ...transactions.map((t) =>
      toCsvRow([
        t.date,
        t.type,
        t.title,
        categoryName(t.categoryId),
        accountName(t.accountId),
        t.amount,
        t.notes,
      ])
    ),
  ];

  const filename = `transactions-${Date.now()}.csv`;
  return writeAndShare(filename, rows.join('\n'), 'text/csv');
}

export async function pickBackupFile(): Promise<BackupData | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
  const parsed = JSON.parse(content) as BackupData;
  if (parsed.version !== 1 || !Array.isArray(parsed.transactions)) {
    throw new Error('This file is not a valid Expense Tracker backup.');
  }
  return parsed;
}

/** Wipes local data and restores it from a previously exported backup. */
export async function restoreBackup(backup: BackupData): Promise<void> {
  await resetDatabase();
  const db = await getDb();

  for (const a of backup.accounts) {
    await db.runAsync(
      `INSERT INTO accounts (id, name, type, balance, initial_balance, currency, color, icon, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      a.id, a.name, a.type, a.balance, a.initialBalance, a.currency, a.color, a.icon,
      a.isActive ? 1 : 0, a.createdAt, a.updatedAt
    );
  }

  for (const c of backup.categories) {
    await db.runAsync(
      `INSERT INTO categories (id, name, kind, icon, color, is_default, is_enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      c.id, c.name, c.kind, c.icon, c.color, c.isDefault ? 1 : 0, c.isEnabled ? 1 : 0, c.createdAt
    );
  }

  for (const t of backup.transactions) {
    await db.runAsync(
      `INSERT INTO transactions (id, type, amount, account_id, to_account_id, category_id, title, notes, date, recurring_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      t.id, t.type, t.amount, t.accountId, t.toAccountId, t.categoryId, t.title, t.notes,
      t.date, t.recurringId, t.createdAt, t.updatedAt
    );
  }

  for (const r of backup.recurringTransactions) {
    await db.runAsync(
      `INSERT INTO recurring_transactions (id, type, title, amount, account_id, category_id, frequency, start_date, end_date, next_occurrence, reminder_days, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      r.id, r.type, r.title, r.amount, r.accountId, r.categoryId, r.frequency, r.startDate,
      r.endDate, r.nextOccurrence, r.reminderDays, r.isActive ? 1 : 0, r.createdAt
    );
  }

  for (const b of backup.budgets) {
    await db.runAsync(
      `INSERT INTO budgets (id, category_id, amount, period, created_at) VALUES (?, ?, ?, ?, ?)`,
      b.id, b.categoryId, b.amount, b.period, b.createdAt
    );
  }

  for (const g of backup.goals) {
    await db.runAsync(
      `INSERT INTO goals (id, name, target_amount, current_amount, target_date, icon, color, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      g.id, g.name, g.targetAmount, g.currentAmount, g.targetDate, g.icon, g.color, g.createdAt
    );
  }
}

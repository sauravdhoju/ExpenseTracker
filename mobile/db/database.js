import * as SQLite from 'expo-sqlite';

let dbPromise = null;

function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync('expenses.db');
  return dbPromise;
}

export async function initDatabase() {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export async function getAllTransactions() {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT * FROM transactions ORDER BY created_at DESC, id DESC'
  );
}

export async function getSummary() {
  const db = await getDb();
  const row = await db.getFirstAsync(`
    SELECT
      COALESCE(SUM(amount), 0) AS balance,
      COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 0) AS expenses
    FROM transactions
  `);
  return row;
}

export async function insertTransaction({ title, amount, category }) {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO transactions (title, amount, category) VALUES (?, ?, ?)',
    title,
    amount,
    category
  );
  return result.lastInsertRowId;
}

export async function removeTransaction(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
}

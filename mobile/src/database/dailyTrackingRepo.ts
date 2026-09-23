import { getDb } from './db';
import { generateId } from '../utils/id';
import type { DailyTracking } from '../types';

interface DailyTrackingRow {
  id: string;
  date: string;
  completed: number;
  is_grace_day: number;
  completed_at: string;
  created_at: string;
}

function mapRow(row: DailyTrackingRow): DailyTracking {
  return {
    id: row.id,
    date: row.date,
    completed: !!row.completed,
    isGraceDay: !!row.is_grace_day,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function getAllTracking(): Promise<DailyTracking[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DailyTrackingRow>('SELECT * FROM daily_tracking ORDER BY date ASC');
  return rows.map(mapRow);
}

/** Idempotent: marks a date tracked if it isn't already. */
export async function markTracked(date: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO daily_tracking (id, date, completed, is_grace_day, completed_at, created_at)
     VALUES (?, ?, 1, 0, ?, ?)
     ON CONFLICT(date) DO NOTHING`,
    generateId(),
    date,
    now,
    now
  );
}

export async function useGraceDay(date: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO daily_tracking (id, date, completed, is_grace_day, completed_at, created_at)
     VALUES (?, ?, 1, 1, ?, ?)
     ON CONFLICT(date) DO NOTHING`,
    generateId(),
    date,
    now,
    now
  );
}

export async function hasGraceDayInMonth(monthKeyStr: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM daily_tracking WHERE is_grace_day = 1 AND date LIKE ?`,
    `${monthKeyStr}-%`
  );
  return (row?.c ?? 0) > 0;
}
